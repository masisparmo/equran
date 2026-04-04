from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    page.on("console", lambda msg: print(f"Browser console: {msg.text}"))

    # Create a dummy page to test just the download logic
    html_content = """
    <!DOCTYPE html>
    <html>
    <body>
        <select id="surah-select"><option value="1">1</option></select>
        <select id="ayah-select"><option value="1">1</option></select>
        <button id="download-ayah-btn">Download</button>

        <script>
            let currentSurahData = { englishName: "Al Fatihah" };
            let currentAudioUrls = ["url1"];

            function getEveryAyahUrl(surahNum, ayahNum) {
                const formattedSurah = surahNum.toString().padStart(3, '0');
                const formattedAyah = ayahNum.toString().padStart(3, '0');
                return `https://everyayah.com/data/Alafasy_128kbps/${formattedSurah}${formattedAyah}.mp3`;
            }

            function downloadFile(url, filename) {
                window.open(url, '_blank');
            }

            async function downloadCurrentAyahAudio() {
                if (!currentSurahData || !currentAudioUrls) return;
                const surahSelect = document.getElementById('surah-select');
                const ayahSelect = document.getElementById('ayah-select');
                const surahNum = parseInt(surahSelect.value);
                const ayahNum = parseInt(ayahSelect.value);
                const surahName = currentSurahData.englishName.replace(/\s+/g, '_');
                const filename = `${surahName}_Ayat_${ayahNum}.mp3`;

                const audioUrl = getEveryAyahUrl(surahNum, ayahNum);

                try {
                    downloadFile(audioUrl, filename);
                } catch (error) {
                    console.error('Download failed:', error);
                }
            }

            document.getElementById('download-ayah-btn').addEventListener('click', downloadCurrentAyahAudio);
        </script>
    </body>
    </html>
    """

    with open('dummy.html', 'w') as f:
        f.write(html_content)

    page.goto("file:///app/dummy.html")

    print("Clicking download Ayah button...")

    with page.expect_popup() as popup_info:
        page.locator("#download-ayah-btn").click()

    new_page = popup_info.value
    new_page.wait_for_load_state()

    print(f"New tab opened successfully with URL: {new_page.url}")

    if "everyayah.com" in new_page.url and "001001.mp3" in new_page.url:
        print("SUCCESS: Opened MP3 file in a new tab!")
    else:
        print("FAILED: New tab did not open the correct MP3 URL.")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
