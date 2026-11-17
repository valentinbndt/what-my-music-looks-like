from flask import Flask, jsonify

app = Flask(__name__)

@app.get("/api/hello")
def hello():
    return jsonify(message="Bonjour depuis le serveur !")