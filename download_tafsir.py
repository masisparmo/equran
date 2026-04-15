import os
import requests
import time

def download_tafsir():
    base_url = "https://raw.githubusercontent.com/renpwn/alquran.js/v2/json/Alquran_{}.json"
    target_dir = r"d:\Data Umum\Aplikasi by Vibe Coding\EQuran\equran-data\tafsir\ibnukatsir"
    
    if not os.path.exists(target_dir):
        os.makedirs(target_dir)

    print(f"Starting download to {target_dir}...")
    
    for surah_num in range(1, 115):
        url = base_url.format(surah_num)
        filename = f"Alquran_{surah_num}.json"
        filepath = os.path.join(target_dir, filename)
        
        if os.path.exists(filepath):
            print(f"[{surah_num}/114] Already exists: {filename}")
            continue
            
        try:
            print(f"[{surah_num}/114] Downloading: {url}")
            response = requests.get(url, timeout=15)
            if response.status_code == 200:
                with open(filepath, 'wb') as f:
                    f.write(response.content)
                print(f"      - Saved: {filename}")
            else:
                print(f"      - ERROR: Status code {response.status_code} for {filename}")
            
            # Tiny sleep to be polite to GitHub
            time.sleep(0.1)
        except Exception as e:
            print(f"      - ERROR downloading Surah {surah_num}: {e}")

    print("Download process completed.")

if __name__ == "__main__":
    download_tafsir()
