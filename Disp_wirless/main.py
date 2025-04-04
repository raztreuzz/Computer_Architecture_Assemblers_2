from flask import Flask, request, jsonify, render_template, url_for
from flask_socketio import SocketIO
from flask_mqtt import Mqtt
import time
from paho.mqtt import publish as mqtt_publish
from threading import Lock
from datetime import datetime

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
app.config['MQTT_BROKER_URL'] = 'test.mosquitto.org'  # Broker MQTT
app.config['MQTT_BROKER_PORT'] = 1883  # Puerto estándar MQTT
app.config['MQTT_USERNAME'] = ''  # Usuario MQTT (vacío para Mosquitto público)
app.config['MQTT_PASSWORD'] = ''  # Contraseña MQTT (vacío para Mosquitto público)
app.config['MQTT_KEEPALIVE'] = 5  # Tiempo de keepalive
app.config['MQTT_TLS_ENABLED'] = False  # Sin TLS para conexiones no seguras

socketio = SocketIO(app)
mqtt = Mqtt(app)

# ============ Configuración Global ============
TIPOS_DISPOSITIVOS = {
    "SH": "Sensor",
    "FH": "Foco",
    "TH": "Termostato"
}

TIEMPO_VIDA_PENDIENTE = 300  # 5 minutos
lock = Lock()

# ============ Estado del Sistema ============
dispositivos_pendientes = {}
dispositivos_registrados = {}
devices_state = {
    "lights": {},
    "sensors": {}
}

# ============ Callbacks MQTT ============
@mqtt.on_connect()
def handle_mqtt_connect(client, userdata, flags, rc):
    print("Conectado al broker MQTT")
    # Suscribirse a los tópicos necesarios
    mqtt.subscribe("esp8266/control") 
    mqtt.subscribe("Corvus/Light/")  
    mqtt.subscribe("dispositivos/")  

@mqtt.on_message()
@mqtt.on_message()
def handle_mqtt_message(client, userdata, message):
    topic = message.topic
    payload = message.payload.decode()
    print(f"Mensaje MQTT recibido: {topic} - {payload}")
    
    # Solo procesa mensajes de estado
    if topic == "dispositivos/status":
        socketio.emit('device_update', {
            'device': 'FH100',
            'status': payload
        })
        update_device_state("lights", device_id, payload)
        
    # Procesamiento para formato Corvus/Light/ID/command
    elif topic.startswith("Corvus/Light/"):
        parts = topic.split('/')
        device_id = parts[2]
        update_device_state("lights", device_id, payload)
        
    # Procesamiento de actualizaciones de estado
    elif topic.startswith("dispositivos/") and topic.endswith("/status"):
        device_id = topic.split('/')[1]
        update_device_state("lights", device_id, payload)

def update_device_state(device_type, device_id, state):
    """Actualiza el estado de un dispositivo y notifica via WebSocket"""
    with lock:
        devices_state[device_type][device_id] = {
            "state": state,
            "last_update": datetime.now().isoformat()
        }
    
    socketio.emit('device_update', {
        'type': device_type,
        'id': device_id,
        'value': state
    })

# ============ Rutas Fase 1 - Registro ============
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/ping", methods=["POST"])
def ping():
    data = request.get_json()
    if data and data.get("device") == "ESP8266":
        return jsonify({"status": "alive"}), 200
    return jsonify({"error": "invalid request"}), 400

@app.route("/iniciar_registro", methods=["POST"])
def iniciar_registro():
    """Endpoint para que el ESP notifique que está listo para registro"""
    data = request.get_json()
    if not data or "numero_serie" not in data:
        return jsonify({"error": "Número de serie requerido"}), 400
    
    numero_serie = data["numero_serie"].strip().upper()
    prefijo = numero_serie[:2]
    
    # Validar formato
    if prefijo not in TIPOS_DISPOSITIVOS or len(numero_serie) < 3:
        return jsonify({
            "error": "Formato inválido",
            "detail": f"Debe comenzar con {', '.join(TIPOS_DISPOSITIVOS.keys())} y tener al menos 3 caracteres"
        }), 400
    
    with lock:
        dispositivos_pendientes[numero_serie] = {
            "timestamp": time.time(),
            "estado": "pendiente"
        }
    
    return jsonify({
        "status": "esperando confirmación",
        "serial": numero_serie,
        "instrucciones": "Ingrese este número en el formulario web para completar el registro"
    }), 200

@app.route("/verificar_dispositivo", methods=["POST"])
def verificar_dispositivo():
    """Endpoint para que el ESP verifique si el usuario ya ingresó su número"""
    data = request.get_json()
    if not data or "numero_serie" not in data:
        return jsonify({"error": "Número de serie requerido"}), 400
    
    numero_serie = data["numero_serie"].strip().upper()
    
    with lock:
        for serial in list(dispositivos_pendientes.keys()):
            if time.time() - dispositivos_pendientes[serial]["timestamp"] > TIEMPO_VIDA_PENDIENTE:
                del dispositivos_pendientes[serial]
                
        if numero_serie in dispositivos_registrados:
            return jsonify({
                "status": "registrado",
                "serial": numero_serie,
                "tipo": dispositivos_registrados[numero_serie]["tipo"]
            }), 200
        
        if numero_serie in dispositivos_pendientes:
            return jsonify({
                "status": "pendiente",
                "serial": numero_serie
            }), 202
    
    return jsonify({
        "error": "dispositivo no encontrado",
        "detail": "El número no está en proceso de registro"
    }), 404

@app.route("/confirmar_registro", methods=["POST"])
def confirmar_registro():
    """Endpoint para que el formulario web confirme el registro"""
    data = request.get_json()
    if not data or "numero_serie" not in data:
        return jsonify({
            "error": "Número de serie requerido",
            "detail": "El campo numero_serie es obligatorio"
        }), 400
    
    numero_serie = data["numero_serie"].strip().upper()
    prefijo = numero_serie[:2]
    
    with lock:
        if numero_serie not in dispositivos_pendientes:
            return jsonify({
                "error": "Dispositivo no encontrado",
                "detail": "El dispositivo no inició el proceso de registro"
            }), 404
        
        if prefijo not in TIPOS_DISPOSITIVOS:
            return jsonify({
                "error": "Prefijo inválido",
                "detail": f"Debe comenzar con {', '.join(TIPOS_DISPOSITIVOS.keys())}"
            }), 400
        
        dispositivos_registrados[numero_serie] = {
            "tipo": TIPOS_DISPOSITIVOS[prefijo],
            "timestamp": time.time()
        }
        del dispositivos_pendientes[numero_serie]
    
    return jsonify({
        "status": "registrado",
        "serial": numero_serie,
        "tipo": TIPOS_DISPOSITIVOS[prefijo],
        "redirect": url_for('home')
    }), 200

# ============ Rutas Fase 2 - Control ============
@app.route("/HOME")
def home():
    """Endpoint de la fase 2 - Página principal después del registro"""
    return render_template("home.html")

@app.route("/api/devices")
def get_devices():
    return jsonify(devices_state)

@app.route('/api/control', methods=['POST'])
def control_device():
    data = request.get_json()
    device_id = data.get('id', 'FH100')  # Default a tu dispositivo
    action = data.get('action', '').upper()
    
    if action not in ['ON', 'OFF']:
        return jsonify({'status': 'error', 'message': 'Acción inválida'}), 400
    
    topic = f"Corvus/Light/{device_id}/command"
    
    try:
        # Usa la conexión MQTT existente en lugar de publish.single
        mqtt.publish(topic, action)
        return jsonify({'status': 'success', 'state': action})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500
# ============ WebSocket ============
@socketio.on('connect')
def handle_connect():
    print('Cliente conectado via WebSocket')

if __name__ == "__main__":
    socketio.run(app, host="172.20.10.6", port=5000, debug=True)
