import http from 'http';
import 'dotenv/config'

const server = http.createServer((_, res) => {    
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello, world!');
});
server.listen(process.env.UPTIME_PORT, () => {
    console.log(`Server running on port ${process.env.UPTIME_PORT}`);
});

import * as utils from './utils.js';

(async function main() {
    while (true) {
        await utils.clearList();

        const usernames = await utils.scrapeFilteredComments();
        let listToWrite = [];
        for (const username of usernames) {
            const img = await utils.getImg(username.username);
            if (img === null) continue;
            listToWrite.push(username.sender+"|"+username.username+"|"+img);
        }
        try {
            await listToWrite.forEach(async (element) => {
                await utils.writeToList(element);
            });
        }
        catch (error) {
            console.error('Error writing to list:', error.message);
        }

        await utils.updateProjectData();
        
        await new Promise(resolve => setTimeout(resolve, 5000));
   }
})();