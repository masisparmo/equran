const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 }, // mobile viewport like user's screenshot
    deviceScaleFactor: 2,
    isMobile: true
  });
  const page = await context.newPage();
  await page.goto('http://localhost:8080');

  // Dismiss setup modal if it appears
  try {
    await page.waitForSelector('#welcome-setup-btn', { timeout: 2000 });
    await page.click('#welcome-setup-btn');
    await page.waitForSelector('#close-settings-modal', { timeout: 2000 });
    await page.click('#close-settings-modal');
  } catch (e) {
    console.log("No welcome modal.");
  }

  await page.click('#quiz-nav-btn');

  // Wait for it to be visible
  await page.waitForSelector('#quiz-setup-view', { state: 'visible' });

  // Take screenshot
  await page.screenshot({ path: 'quiz_button_check.png' });

  await browser.close();
})();
