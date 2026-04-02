from playwright.sync_api import sync_playwright

def test_mushaf_bismillah():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_default_timeout(60000)

        # Navigate to the local file
        page.goto('http://localhost:8080/')

        # Dismiss welcome modal
        page.click('#close-welcome-modal')

        # Click on Mushaf mode
        page.click('text=Mushaf')

        # Select Surah 2 (Al-Baqarah) -> Page 2, to check if Bismillah is hidden
        page.select_option('#mushaf-surah-select', '2')
        page.wait_for_timeout(2000) # Give it some time to fetch

        # Take screenshot of Surah 2
        page.screenshot(path='surah2_bismillah_test.png')

        # Select Surah 3 -> Page 50, to check if Bismillah is hidden
        page.select_option('#mushaf-surah-select', '3')
        page.wait_for_timeout(2000) # Give it some time to fetch

        # Take screenshot of Surah 3
        page.screenshot(path='surah3_bismillah_test.png')

        browser.close()

if __name__ == '__main__':
    test_mushaf_bismillah()
