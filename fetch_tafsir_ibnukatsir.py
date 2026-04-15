import requests
import json
import os
import time

BASE_URL = "https://raw.githubusercontent.com/renpwn/alquran.js/v2/json/Alquran_{}.json"
OUTPUT_DIR = "equran-data/tafsir/ibnukatsir"

def fetch_and_convert_tafsir():
    # Pastikan direktori output ada
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    total_berhasil = 0
    total_gagal = 0

    print("Mulai mengunduh dan mengonversi Tafsir Ibnu Katsir (1-114)...")

    for i in range(1, 115):
        url = BASE_URL.format(i)
        try:
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                data_asli = response.json()

                # Cek struktur data
                if 'ayat' not in data_asli:
                    print(f"Surah {i}: Gagal (Struktur JSON tidak sesuai - 'ayat' tidak ditemukan)")
                    total_gagal += 1
                    continue

                # Membangun struktur JSON baru
                tafsir_list = []
                for item in data_asli['ayat']:
                    tafsir_list.append({
                        "ayat": item.get('ayat'),
                        "teks_tafsir": item.get('tafsir', '')
                    })

                output_data = {
                    "surah": i,
                    "tafsir": tafsir_list
                }

                # Menyimpan file JSON
                file_path = os.path.join(OUTPUT_DIR, f"{i}.json")
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(output_data, f, ensure_ascii=False, indent=2)

                total_berhasil += 1
                if i % 10 == 0 or i == 114:
                    print(f"Progres: Berhasil mengunduh surah ke-{i}")

            else:
                print(f"Surah {i}: Gagal (Status Code {response.status_code})")
                total_gagal += 1

        except Exception as e:
            print(f"Surah {i}: Gagal (Error: {str(e)})")
            total_gagal += 1

        # Jeda sejenak agar tidak over-request ke Github raw
        time.sleep(0.1)

    print("\n--- Selesai ---")
    print(f"Berhasil: {total_berhasil} surah")
    print(f"Gagal: {total_gagal} surah")

if __name__ == "__main__":
    fetch_and_convert_tafsir()
