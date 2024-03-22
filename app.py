from flask import Flask
from threading import Thread
import server

app = Flask(__name__)

@app.route("/")
def serverrun():
    Thread(server.client.run).start()
    return "The server is up!"