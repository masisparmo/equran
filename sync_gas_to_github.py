import requests
import json
import os
from collections import defaultdict

# URL Google Apps Script Anda
GAS_URL = "https://script.google.com/macros/s/AKfycbz6LH6bOoAYpzqtS91sn-g_ZHH-WJZvg_1eK4lBg4Vqvly9iTe8SPIxMSRQ-5Ox4vt6SA/exec"

def sync():
    print("Mencoba mengambil data dari Google Sheets (GAS)...")
    try:
        # Kita memanggil GAS dengan parameter ?all=true
        response = requests.get(f"{GAS_URL}?all=true", timeout=30)
        if response.status_code != 200:
            print(f"Error: Server mengembalikan status {response.status_code}")
            return

        data = response.json()
        if data.get("status") != "success":
            print(f"GAS Error: {data.get('message')}")
            return

        rows = data.get("data", [])
        print(f"Berhasil menarik {len(rows)} data analisis kata.")

        # Mengelompokkan data berdasarkan Surah dan Ayah
        grouped = defaultdict(lambda: defaultdict(list))
        for row in rows:
            surah = str(row['surah'])
            ayah = str(row['ayah'])
            grouped[surah][ayah].append({
                "index": row['wordIndex'],
                "kata_arab": row['kata_arab'],
                "transliterasi": row['transliterasi'],
                "jenis_kata": row['jenis_kata'],
                "arti": row['arti'],
                "sharaf": row['sharaf'],
                "nahwu": row['nahwu'],
                "hikmah": row['hikmah'],
                "role": row['role']
            })

        # Membuat file JSON per ayat
        files_created = 0
        for surah, ayahs in grouped.items():
            surah_dir = f"equran-data/surah/{surah}"
            os.makedirs(surah_dir, exist_ok=True)
            for ayah, words in ayahs.items():
                # Urutkan kata berdasarkan indexnya
                words.sort(key=lambda x: x['index'])

                output = {
                    "surah": int(surah),
                    "ayah": int(ayah),
                    "words": words
                }

                file_path = f"{surah_dir}/{ayah}.json"
                with open(file_path, "w", encoding="utf-8") as f:
                    json.dump(output, f, ensure_ascii=False, indent=2)
                files_created += 1

        print(f"Selesai! {files_created} file JSON telah diperbarui di folder equran-data/.")

    except Exception as e:
        print(f"Terjadi kesalahan saat sinkronisasi: {str(e)}")

if __name__ == "__main__":
    sync()
