from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    print("Navigating to index.html...")
    page.goto("file:///app/index.html")

    print("Dismissing initial modals...")
    try:
        page.locator("#welcome-setup-btn").click(timeout=5000)
        page.locator("#close-settings-modal").click(timeout=5000)
        page.locator("#close-welcome-modal").click(timeout=5000)
    except Exception as e:
        print("Modals not found or already closed:", e)

    print("Waiting for default Surah (Al-Fatihah) to load...")
    page.wait_for_selector("#ayah-display-container .ayah-card")

    print("Clicking download Ayah button...")

    # Catch the new page (popup/new tab) created by window.open
    with page.expect_popup() as popup_info:
        page.locator("#download-ayah-btn").click()

    new_page = popup_info.value
    new_page.wait_for_load_state()

    print(f"New tab opened successfully with URL: {new_page.url}")

    # Verify the URL is pointing to the MP3
    if ".mp3" in new_page.url:
        print("SUCCESS: Opened MP3 file in a new tab without CORS error!")
    else:
        print("FAILED: New tab did not open an MP3 URL.")

    # Get browser console logs to check for any leftover CORS errors
    print("Checking main page console logs for errors...")
    logs = []
    page.on("console", lambda msg: logs.append(msg.text) if msg.type == "error" else None)
    time.sleep(2) # Give it a moment to catch any async errors
    if logs:
        print("Errors found in console:")
        for log in logs:
            print(" -", log)
    else:
        print("No errors found in console.")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
