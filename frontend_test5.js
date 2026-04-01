const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    // Mount root directory to access index.html
    await page.goto('file:///app/index.html');

    // Wait for the UI to be ready
    await page.waitForTimeout(1000);

    // Mock API Keys for testing UI bypass and dismiss welcome modal
    await page.evaluate(() => {
        localStorage.setItem('gemini_api_keys', JSON.stringify(['dummy-key-for-test']));
        window.apiKeys = ['dummy-key-for-test'];
        sessionStorage.setItem('welcome_dismissed', 'true');

        // Ensure welcome modal is closed if it was opened
        const welcomeModal = document.getElementById('welcome-modal');
        if (welcomeModal) welcomeModal.style.display = 'none';
    });

    // Simulate current word context that would normally be set by clicking a word
    await page.evaluate(() => {
        window.currentWordContext = { wordText: "بِسْمِ" };
        window.currentDeepExplainText = "This is a mock explanation for Bismi.";

        // We have to close welcome modal manually by class list
        document.getElementById('welcome-modal').classList.remove('show');

        window.openAiChatModal();
    });

    // Wait for chat modal to appear
    await page.waitForSelector('#ai-chat-modal.show', { timeout: 5000 });

    // Type a message
    await page.fill('#chat-input', 'Test message for download');
    await page.click('#send-chat-btn');

    // Wait for user message to appear
    await page.waitForTimeout(1000);

    // Take a screenshot showing both AI and user messages
    await page.screenshot({ path: 'frontend_test_user_msg.png' });

    console.log("Screenshots saved.");
    await browser.close();
})();
