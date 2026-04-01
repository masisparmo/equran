const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    // Mount root directory to access index.html
    await page.goto('file:///app/index.html');

    // Wait for the UI to be ready
    await page.waitForTimeout(1000);

    // Mock API Keys for testing UI bypass
    await page.evaluate(() => {
        localStorage.setItem('gemini_api_keys', JSON.stringify(['dummy-key-for-test']));
        window.apiKeys = ['dummy-key-for-test'];
    });

    // Simulate current word context that would normally be set by clicking a word
    await page.evaluate(() => {
        window.currentWordContext = { wordText: "بِسْمِ" };
        window.currentDeepExplainText = "This is a mock explanation for Bismi.";
        window.openAiChatModal();
    });

    // Wait for chat modal to appear
    await page.waitForSelector('#ai-chat-modal.show', { timeout: 5000 });

    // Type a message
    await page.fill('#chat-input', 'Test message here');
    await page.click('#send-chat-btn');

    // Wait for message to appear in history
    await page.waitForTimeout(500);

    // Take a screenshot
    await page.screenshot({ path: 'frontend_test_screenshot.png' });

    console.log("Screenshot saved.");
    await browser.close();
})();
