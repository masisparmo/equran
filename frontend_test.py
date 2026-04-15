from playwright.sync_api import sync_playwright

def test_groq_fallback():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_default_timeout(10000)

        # Navigate to the local file
        page.goto('http://localhost:8080/')

        # We just want to check if there are no console errors on load
        # related to groqApiKeys initialization

        # Try to execute a script to check if groqApiKeys is defined
        groq_keys_defined = page.evaluate("typeof groqApiKeys !== 'undefined'")
        print(f"groqApiKeys defined: {groq_keys_defined}")

        browser.close()

if __name__ == '__main__':
    test_groq_fallback()
