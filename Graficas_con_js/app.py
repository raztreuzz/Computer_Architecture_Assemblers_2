from flask import Flask, jsonify
from flask_cors import CORS
import paho.mqtt.client as mqtt

app = Flask(__name__)
CORS(app) 

temperature_data = []

def on_message(client, userdata, message):
    temp = float(message.payload.decode("utf-8"))
    print(f"Temperatura recibida: {temp}°C")
    temperature_data.append({"temp": temp})
    if len(temperature_data) > 20:
        temperature_data.pop(0)

mqtt_client = mqtt.Client()
mqtt_client.on_message = on_message
mqtt_client.connect("BROKER_IP", 1883)
mqtt_client.subscribe("sensor/temperatura")
mqtt_client.loop_start()

@app.route('/data')
def data():
    return jsonify(temperature_data)

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000, debug=True)
