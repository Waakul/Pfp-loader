import puppeteer from 'puppeteer';

async function scrapeFilteredComments() {
    const browser = await puppeteer.launch({ headless: false }); // Debug mode enabled
    const page = await browser.newPage();
    await page.goto('https://scratch.mit.edu/projects/1153505010/', { waitUntil: 'networkidle2' });

    // Wait for comments to load
    await page.waitForSelector('.comments-list .comment-container');

    // Extract sender and username
    const filteredComments = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.comments-list .comment-container'))
            .map(container => {
                const sender = container.querySelector('.comment-top-row .username')?.innerText.trim() || "Not Found";
                const username = container.querySelector('.comment-bubble .comment-content .emoji-text')?.innerText.trim() || "Not Found";
                return { sender, username };
            })
            .filter(comment => comment.username.startsWith('(') && comment.username.endsWith(')')); // Filter usernames
    });

    await browser.close();
    return filteredComments;
}

(async () => {
    const comments = await scrapeFilteredComments();
    console.log(comments);
})();