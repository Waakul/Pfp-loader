from PIL import Image
import requests
from io import BytesIO


def rgb_hex(rgb):
    return "%02x%02x%02x" % rgb


def encode(image):
    listData = []
    img = Image.open(f"IMG/{image}.png")
    img = img.convert("RGB")
    img = img.resize((50, 50))
    img.save(f"IMG/{image}.png")
    list1 = list(img.getdata())
    for i in range(len(list1)):
        pixel_value = rgb_hex(list1[i])
        listData.append(str(pixel_value))
    file = open(f"TXT/{image}.txt", "w")
    file.truncate(0)
    for i in range(len(listData)):
        if listData[i - 1] == listData[i] and i != 0:
            file.write("$")
        else:
            file.write(listData[i])
    file.close()


def getimg(username):
    resp = requests.get(url=f"https://api.scratch.mit.edu/users/{username}/").json()
    userid = resp["id"]
    ImgURL = f"https://uploads.scratch.mit.edu/get_image/user/{userid}_500x500.png"
    resp = requests.get(ImgURL)
    img = Image.open(BytesIO(resp.content))
    img.save(f"IMG/{username}.png")
    encode(username)