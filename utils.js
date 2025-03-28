import fs from 'fs';
import axios from 'axios';
import { Jimp } from 'jimp';

const filePathJSON = './assets/project.json';
const dirPathIMG = './assets/IMG';

function rgbHex(rgb) {
    return rgb.map(value => value.toString(16).padStart(2, '0')).join('');
}

async function encode(image) {
    const imgPath = `${dirPathIMG}/${image}`;
    const img = await Jimp.read(imgPath);
    img.resize({ w: 50, h: 50 });
    await img.write(imgPath);

    const listData = [];
    const pixels = img.bitmap.data;

    for (let i = 0; i < pixels.length; i += 4) {
        const rgb = [pixels[i], pixels[i + 1], pixels[i + 2]];
        const pixelValue = rgbHex(rgb);
        listData.push(pixelValue);
    }

    let encodedString = '';

    for (let i = 0; i < listData.length; i++) {
        if (i > 0 && listData[i] === listData[i - 1]) {
            encodedString = `${encodedString}$`;
        } else {
            encodedString = `${encodedString}${listData[i]}`;
        }
    }

    return encodedString;
}

async function getImg(username) {
    const files = fs.readdirSync(dirPathIMG);
    const oneDayInMs = 24 * 60 * 60 * 1000;

    for (const file of files) {
        if (file.startsWith(username)) {
            const timestamp = parseInt(file.split('_')[1].split('.')[0], 10);
            if (Date.now() - timestamp < oneDayInMs) {
                return await encode(file);
            } else {
                fs.unlinkSync(`${dirPathIMG}/${file}`);
                return await fetchImg(username);
            }
        }
    }

    // the username has never been downloaded before
    return await fetchImg(username);
}

async function fetchImg(username) {
    const userResp = await axios.get(`https://api.scratch.mit.edu/users/${username}/`);
    const userId = userResp.data.id;
    const imgUrl = `https://uploads.scratch.mit.edu/get_image/user/${userId}_500x500.png`;

    const imgResp = await axios.get(imgUrl, { responseType: 'arraybuffer' });

    const buffer = imgResp.data;
    const arrayBuffer = buffer instanceof ArrayBuffer
        ? buffer // If it's already an ArrayBuffer
        : buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

    // JIMP doesnt support webp so we need to convert it to png if its webp first
    const dataView = new DataView(arrayBuffer);

    const isRIFF = dataView.getUint32(0, true) === 0x46464952; // 'RIFF' in little-endian
    const isWEBP = dataView.getUint32(8, true) === 0x50424557; // 'WEBP' in little-endian

    if (isRIFF && isWEBP) {
        const webpBuffer = Buffer.from(imgResp.data);
        const sharp = await import('sharp');
        const pngBuffer = await sharp.default(webpBuffer).png().toBuffer();
        imgResp.data = pngBuffer;
    }
    const img = await Jimp.read(imgResp.data);
    img.resize({ w: 50, h: 50 });

    const imageName = `${username}_${Date.now()}.png`;
    await img.write(`${dirPathIMG}/${imageName}`);

    return await encode(imageName);
}

async function writeToList(data) {
    let rawData = fs.readFileSync(filePathJSON, 'utf-8');
    let project = JSON.parse(rawData);

    project.targets[0].lists['%bpHi#Dg)[c*ALjF)V~b'][1].length > 10 ? clearList() : null;

    rawData = fs.readFileSync(filePathJSON, 'utf-8');
    project = JSON.parse(rawData);

    project.targets[0].lists['%bpHi#Dg)[c*ALjF)V~b'][1].push(data);

    const updatedData = JSON.stringify(project);
    fs.writeFileSync(filePath, updatedData, 'utf-8');
}

async function clearList() {
    let rawData = fs.readFileSync(filePathJSON, 'utf-8');
    const project = JSON.parse(rawData);

    project.targets[0].lists['%bpHi#Dg)[c*ALjF)V~b'][1] = [];

    const updatedData = JSON.stringify(project);
    fs.writeFileSync(filePath, updatedData, 'utf-8');
}

export { getImg, writeToList };

console.log(await getImg('Waakul'));