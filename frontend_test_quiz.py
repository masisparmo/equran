from playwright.sync_api import sync_playwright

def test_quiz():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto('http://localhost:8080')

        # Dismiss welcome modal
        try:
            page.wait_for_selector('#welcome-setup-btn', timeout=5000)
            page.click('#welcome-setup-btn')
            page.wait_for_selector('#close-settings-modal', timeout=5000)
            page.click('#close-settings-modal')
        except:
            pass

        # Switch to Quiz mode
        page.click('#quiz-nav-btn')

        # Wait for Quiz setup view
        page.wait_for_selector('#quiz-setup-view')

        page.screenshot(path='frontend_test_quiz.png')

        browser.close()

test_quiz()
