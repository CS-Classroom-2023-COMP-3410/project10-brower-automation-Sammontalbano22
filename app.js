const puppeteer = require('puppeteer');
const fs = require('fs');

// TODO: Load the credentials from the 'credentials.json' file
// HINT: Use the 'fs' module to read and parse the file
const credentials = JSON.parse(fs.readFileSync('credentials.json', 'utf8'));

(async () => {
    // TODO: Launch a browser instance and open a new page
    const browser = await puppeteer.launch({
        headless: true,
        executablePath: '/usr/bin/chromium',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Navigate to GitHub login page
    await page.goto('https://github.com/login');

    // TODO: Login to GitHub using the provided credentials
    // HINT: Use the 'type' method to input username and password, then click on the submit button
    await page.type('#login_field', credentials.username);
    await page.type('#password', credentials.password);
    await page.click('[type="submit"]');

    // Wait for successful login
    await page.waitForSelector('.avatar.circle');

    // Extract the actual GitHub username to be used later
    const actualUsername = await page.$eval('meta[name="octolytics-actor-login"]', meta => meta.content);

    const repositories = ["cheeriojs/cheerio", "axios/axios", "puppeteer/puppeteer"];

    for (const repo of repositories) {
        await page.goto(`https://github.com/${repo}`);

        // TODO: Star the repository
        // HINT: Use selectors to identify and click on the star button
        await page.waitForSelector('form[action$="/star"]');
        await page.evaluate(() => document.querySelector('form[action$="/star"]').submit());
        await new Promise(r => setTimeout(r, 1000)); // This timeout helps ensure that the action is fully processed
    }

    // TODO: Navigate to the user's starred repositories page
    await page.goto(`https://github.com/${actualUsername}?tab=stars`);

    // TODO: Click on the "Create list" button
    await page.waitForSelector('button[data-show-dialog-id]');
    await page.evaluate(() =>
        [...document.querySelectorAll('button[data-show-dialog-id]')]
            .find(btn => btn.innerText.includes('list')).click()
    );

    // TODO: Create a list named "Node Libraries"
    // HINT: Wait for the input field and type the list name
    await page.waitForSelector('#user_list_name');
    await page.type('#user_list_name', 'Node Libraries');

    // Wait for auto-check validation to complete and button to become enabled
    await page.waitForSelector('.Button--fullWidth.Button--primary:not([disabled])');

    // Identify and click the "Create" button
    const buttons = await page.$$('.Button--primary.Button--medium.Button');
    for (const button of buttons) {
        const buttonText = await button.evaluate(node => node.textContent.trim());
        if (buttonText === 'Create') {
            await button.click();
            break;
        }
    }

    // Allow some time for the list creation process
    await new Promise(r => setTimeout(r, 2000));

    const dropdownSelector = 'details.js-user-list-menu';

    for (const repo of repositories) {
        await page.goto(`https://github.com/${repo}`);

        // TODO: Add this repository to the "Node Libraries" list
        // HINT: Open the dropdown, wait for it to load, and find the list by its name
        await page.waitForSelector(dropdownSelector);
        await page.click(dropdownSelector + ' summary');

        await new Promise(r => setTimeout(r, 3000));
        await page.waitForSelector('.js-user-list-menu-item');
        const lists = await page.$$('.js-user-list-menu-item');

        for (const list of lists) {
          const value = await list.evaluate(el => el.value);
          if (value === 'Node Libraries') {
            await list.click();
            break;
          }
        }

        // Allow some time for the action to process
        await new Promise(r => setTimeout(r, 1000));

        // Close the dropdown to finalize the addition to the list
        await page.click(dropdownSelector + ' summary');
      }

    // Close the browser
    await browser.close();
})();