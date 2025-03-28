import puppeteer from 'puppeteer';
import axios from 'axios';

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
    const browser = await puppeteer.launch({ headless: false }); // Debug mode enabled
    const page = await browser.newPage();
    await page.goto('https://scratch.mit.edu/projects/1153505010/', { waitUntil: 'networkidle2' });

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

(async () => {
    const comments = await scrapeFilteredComments();
    console.log(comments);
})();