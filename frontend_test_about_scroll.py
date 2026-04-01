import time
from playwright.sync_api import sync_playwright

def run_test():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 900})
        page = context.new_page()

        page.goto("http://localhost:8080/")

        try:
            page.click("#close-welcome-modal", timeout=5000)
        except:
            pass

        page.click("#about-btn")
        time.sleep(1)

        # Scroll down within the modal content
        page.evaluate("document.querySelector('#about-modal .modal-content').scrollTop = 500;")
        time.sleep(1)

        page.screenshot(path="frontend_test_about_scroll.png")

        browser.close()

if __name__ == "__main__":
    run_test()
