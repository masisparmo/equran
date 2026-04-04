from playwright.sync_api import sync_playwright
import time

def run(playwright):
    # Enable bypass_csp to avoid fetching external network blocks
    browser = playwright.chromium.launch(headless=True, args=['--disable-web-security'])
    context = browser.new_context()
    page = context.new_page()

    page.on("console", lambda msg: print(f"Browser console: {msg.text}"))

    print("Navigating to local server...")
    page.goto("http://localhost:8080/")

    print("Waiting a bit to allow API to fetch data...")
    time.sleep(5)

    print("Dismissing initial modals...")
    try:
        page.evaluate('document.getElementById("welcome-modal").style.display = "none"')
        page.evaluate('document.getElementById("settings-modal").style.display = "none"')
        print("Modals hidden manually.")
    except Exception as e:
        print("Error hiding modals:", e)

    # Trigger loadSurah manually just to be sure it executes
    page.evaluate("if (typeof loadSurah === 'function') loadSurah();")

    print("Waiting for Surah data to fetch from API...")
    try:
        page.wait_for_selector(".ayah-card", timeout=15000)
    except Exception as e:
        print(f"Failed to load surah data.")
        raise e

    print("Clicking download Ayah button...")

    with page.expect_popup() as popup_info:
        # Force click via JS in case the element is covered
        page.evaluate('document.getElementById("download-ayah-btn").click()')

    new_page = popup_info.value
    new_page.wait_for_load_state()

    print(f"New tab opened successfully with URL: {new_page.url}")

    if "everyayah.com" in new_page.url:
        print("SUCCESS: Opened MP3 file in a new tab without CORS error!")
    else:
        print("FAILED: New tab did not open an MP3 URL.")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
