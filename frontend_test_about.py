import time
from playwright.sync_api import sync_playwright

def run_test():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 900})
        page = context.new_page()

        print("Navigating to app...")
        page.goto("http://localhost:8080/")

        # Dismiss welcome modal
        try:
            page.click("#close-welcome-modal", timeout=5000)
            print("Welcome modal dismissed.")
        except:
            print("No welcome modal found or failed to dismiss.")

        print("Opening About modal...")
        page.click("#about-btn")
        time.sleep(1) # Wait for modal to open completely

        # Take screenshot of the About modal
        page.screenshot(path="frontend_test_about.png")
        print("About screenshot saved.")

        browser.close()

if __name__ == "__main__":
    run_test()
