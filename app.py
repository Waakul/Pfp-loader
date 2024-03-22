from flask import Flask
from threading import Thread
import server

app = Flask(__name__)

@app.route("/")
def serverrun():
    server.client.run(data_from_websocket=True, thread=True)
    return "The server is up!"