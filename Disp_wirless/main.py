from flask import Flask, request, jsonify, render_template
from flask_cors import CORS


app = Flask(__name__)
CORS(app)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/connect", methods=["POST"])
def connect():
    data = request.get_json()
    ssid = data.get("ssid")
    password = data.get("password")

    if not ssid or not password:
        return jsonify({"message": "Error: SSID y contraseña son obligatorios"}), 400

    print(f"✅ Recibido -> SSID: {ssid}, Password: {password}")  # Verifica en la terminal

    return jsonify({"message": f"Intentando conectar a {ssid}..."}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
