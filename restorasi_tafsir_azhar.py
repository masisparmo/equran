import json
import os
import time
import sys
import re
from groq import Groq

# Informasi Model
MODEL_NAME = "openai/gpt-oss-120b"
KEYS_FILE = "keys_pool.txt"
CHUNK_SIZE = 4000  # Karakter (~1000 tokens) per request

class GroqRotator:
    def __init__(self, keys_file):
        self.keys = self.load_keys(keys_file)
        self.current_index = 0
        self.refresh_client()

    def load_keys(self, file_path):
        if not os.path.exists(file_path):
            print(f"Error: File {file_path} tidak ditemukan.")
            sys.exit(1)
        with open(file_path, "r") as f:
            keys = [line.strip() for line in f if line.strip()]
        if not keys:
            print("Error: Tidak ada API Key ditemukan di keys_pool.txt.")
            sys.exit(1)
        return keys

    def refresh_client(self):
        key = self.keys[self.current_index]
        self.client = Groq(api_key=key)

    def rotate(self):
        self.current_index = (self.current_index + 1) % len(self.keys)
        if self.current_index == 0:
            print("Peringatan: Seluruh kunci telah dicoba satu putaran. Menunggu 30 detik...")
            time.sleep(30)
        self.refresh_client()

def restore_chunk(rotator, chunk_text, context_info="", is_first=True, is_last=True):
    system_prompt = (
        "You are an expert Indonesian linguist and Tafsir Al-Quran scholar specializing in the works of Buya Hamka.\n"
        "Your task is to restore text from a Tafsir Al-Azhar OCR result. Fix typos (tatsir -> tafsir, Alij -> Alif), "
        "remove page numbers/headers, and fix word spacing while keeping Buya Hamka's original formal style.\n"
        "IMPORTANT: Return ONLY the cleaned/restored text. No explanations.\n\n"
        f"Context: {context_info}"
    )
    if not is_first:
        system_prompt += "\nNote: This is a continuation of previous text. Ensure flow."

    max_retries = len(rotator.keys) * 2
    for attempt in range(max_retries):
        try:
            response = rotator.client.chat.completions.create(
                model=MODEL_NAME,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Restore this chunk:\n\n{chunk_text}"}
                ],
                temperature=0.1,
                max_tokens=4096
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            err_msg = str(e).lower()
            if "rate_limit" in err_msg or "429" in err_msg:
                print(f"    [Rate Limit] Kunci #{rotator.current_index + 1} sibuk. Rotasi...")
                rotator.rotate()
            else:
                print(f"    [Error] Kunci #{rotator.current_index + 1}: {e}")
                rotator.rotate()
            time.sleep(2)
    return None

def process_surah(rotator, surah_number):
    json_path = f"d:\\Data Umum\\Aplikasi by Vibe Coding\\EQuran\\equran-data\\tafsir\\alazhar\\json\\Alquran_{surah_number}.json"
    output_path = f"d:\\Data Umum\\Aplikasi by Vibe Coding\\EQuran\\equran-data\\tafsir\\alazhar\\json\\Alquran_{surah_number}_restored.json"

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    print(f"\n--- RESTORASI SURAH {surah_number} ---")
    
    for i, ayah in enumerate(data['ayahs']):
        ayah_num = i + 1
        text = ayah.get("al_azhar", "")
        if not text or len(text) < 10: continue

        print(f"  - Ayat {ayah_num} ({len(text)} karakter):")
        
        # Chunking if text is large
        all_restored = []
        chunks = [text[i:i+CHUNK_SIZE] for i in range(0, len(text), CHUNK_SIZE)]
        
        for j, chunk in enumerate(chunks):
            print(f"    Proses bagian {j+1}/{len(chunks)}...")
            res = restore_chunk(rotator, chunk, f"Surah {surah_number} Ayat {ayah_num}", j==0, j==len(chunks)-1)
            if res:
                all_restored.append(res)
            else:
                print(f"    [!!) Bagian {j+1} gagal diproses.")
                all_restored.append(chunk) # Fallback to original
        
        # Bersihkan hasil penggabungan
        final_text = " ".join(all_restored)
        final_text = re.sub(r'\s+', ' ', final_text).strip()
        ayah["al_azhar"] = final_text
        print(f"    [OK] Selesai.")
        time.sleep(0.5)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
    print(f"\nFile tersimpan: {output_path}")

if __name__ == "__main__":
    rotator = GroqRotator(KEYS_FILE)
    process_surah(rotator, 1)
