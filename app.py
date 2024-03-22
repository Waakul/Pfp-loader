from flask import Flask
from threading import Thread
import server

app = Flask(__name__)

@app.route("/")
def serverrun():
    return "The server is up!"

Thread(server.client.run).start()