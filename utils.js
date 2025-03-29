import fs from 'fs';
import axios from 'axios';
import { Jimp } from 'jimp';
import puppeteer from 'puppeteer';
import { json } from 'stream/consumers';
import { get } from 'http';

const filePathJSON = './assets/project.json';
const dirPathIMG = './assets/IMG';

// Helper function to check if a username exists (outside browser context)
async function usernameExists(username) {
    try {
        const userResp = await axios.get(`https://api.scratch.mit.edu/users/${username}/`);
        return userResp.status === 200;
    } catch (error) {
        return false; // Return false if the API call fails
    }
}

async function scrapeFilteredComments() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(`https://scratch.mit.edu/projects/${process.env.PROJECT_ID}/`, { waitUntil: 'networkidle2' });

    // Wait for comments to load
    await page.waitForSelector('.comments-list .comment-container');

    // Extract sender and username in the browser context
    const comments = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.comments-list .comment-container')).map(container => {
            const sender = container.querySelector('.comment-top-row .username')?.innerText.trim() || null;
            const username = container.querySelector('.comment-bubble .comment-content .emoji-text')?.innerText.trim() || null;
            return { sender, username };
        });
    });

    let newCommenters = [];
    let filteredComments = [];
    for (const comment of comments) {
        if (comment.username.startsWith('(') && comment.username.endsWith(')') && !newCommenters.includes(comment.sender) && !(comment.sender == null || comment.username == null) && await usernameExists(comment.username.replace(/[()]/g, ''))) {
            comment.username = comment.username.replace(/[()]/g, '');
            filteredComments.push(comment);
            newCommenters.push(comment.sender);
        }
    }

    await browser.close();
    return filteredComments;
}

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
    try {
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
    } catch (error) {
        console.error('Error fetching image:', error.message);
        return null;
    }
}

async function writeToList(data) {
    if (data === null) {
        return;
    }
    const username = await data.split("|")[0];

    let rawData = fs.readFileSync(filePathJSON, 'utf-8');
    let project = JSON.parse(rawData);

    project.targets[0].lists['%bpHi#Dg)[c*ALjF)V~b'][1].forEach((element, index) => {
        if (element.split("|")[0] === username) {
            project.targets[0].lists['%bpHi#Dg)[c*ALjF)V~b'][1].splice(index, 1);
        }
    });

    let updatedData = JSON.stringify(project);
    fs.writeFileSync(filePathJSON, updatedData, 'utf-8');

    project.targets[0].lists['%bpHi#Dg)[c*ALjF)V~b'][1].length > 10 ? clearList() : null;

    rawData = fs.readFileSync(filePathJSON, 'utf-8');
    project = JSON.parse(rawData);

    project.targets[0].lists['%bpHi#Dg)[c*ALjF)V~b'][1].push(data);

    updatedData = JSON.stringify(project);
    fs.writeFileSync(filePathJSON, updatedData, 'utf-8');
}

async function clearList() {
    let rawData = fs.readFileSync(filePathJSON, 'utf-8');
    const project = JSON.parse(rawData);

    project.targets[0].lists['%bpHi#Dg)[c*ALjF)V~b'][1] = [];

    const updatedData = JSON.stringify(project);
    fs.writeFileSync(filePathJSON, updatedData, 'utf-8');
}

async function getScratchCookies() {
    const response = await axios.post('https://scratch.mit.edu/login/',
        {
            "username": process.env.USERNAME,
            "password": process.env.PASSWORD
        },
        {
            headers: {
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.142 Safari/537.36",
                "x-csrftoken": "a",
                "x-requested-with": "XMLHttpRequest",
                "referer": "https://scratch.mit.edu",
                "Content-Type": "application/json",
                "Cookie": "scratchcsrftoken=a;scratchlanguage=en;"
            }
        }
    )
    const cookies = response.headers['set-cookie'].map(cookie => cookie.split(';')[0]).join('; ');
    return cookies;
}

async function updateProjectData() {
    const rawData = fs.readFileSync(filePathJSON, 'utf-8');
    const projectData = JSON.parse(rawData);

    try {
        const cookies = await getScratchCookies();

        const response = await axios.put(`https://projects.scratch.mit.edu/${process.env.PROJECT_ID}`, projectData, {
            headers: {
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.142 Safari/537.36",
                "x-csrftoken": "a",
                "x-requested-with": "XMLHttpRequest",
                "referer": "https://scratch.mit.edu",
                "Content-Type": "application/json",
                'Cookie': cookies,
            },
        });
        console.log('Project data updated successfully:', response.status);
    } catch (error) {
        console.error('Error updating project data:', error.message);
    }
}

export { getImg, writeToList, scrapeFilteredComments, updateProjectData, clearList };