import scratchattach as scratch3
import os
from functions import *

session = scratch3.Session(os.getenv("SESSIONID"), username="Waakul_Test")
conn = session.connect_cloud("987765422")

client = scratch3.CloudRequests(conn)

@client.request
def LoadPfp(username):
    getimg(username)
    return "done"

@client.request
def GetPart(part, username):
    with open(f'TXT/{username}.txt', 'r') as f:
        file_content = f.read()
    n = len(file_content) // 6
    parts = [file_content[i:i+n] for i in range(0, len(file_content), n)]
    if int(part) == 5:
        os.remove(f"TXT/{username}.txt")
        os.remove(f"IMG/{username}.png")
    return parts[int(part)]

@client.event
def on_ready():
    print("Request handler is running")