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
        if (welcomeModal) welcomeModal.classList.remove('show');
    });

    // Simulate current word context that would normally be set by clicking a word
    await page.evaluate(() => {
        window.currentWordContext = { wordText: "بِسْمِ" };
        window.currentDeepExplainText = "This is a mock explanation for Bismi.";
        window.openAiChatModal();
    });

    // Wait for chat modal to appear
    await page.waitForSelector('#ai-chat-modal.show', { timeout: 5000 });

    // Take a screenshot of the initial state
    await page.screenshot({ path: 'frontend_test_initial.png' });

    // Test copy and download buttons for the initial AI greeting message
    await page.evaluate(() => {
        const copyBtn = document.querySelector('.chat-message.ai .copy-msg');
        if (copyBtn) copyBtn.click();
    });
    await page.waitForTimeout(500); // give time for the copy logic (e.g., icon change) to process
    await page.screenshot({ path: 'frontend_test_copy.png' });

    // Click the New Chat button
    await page.click('#new-chat-btn');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'frontend_test_new_chat.png' });

    console.log("Screenshots saved.");
    await browser.close();
})();
