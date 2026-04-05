import json
import os
import re

# Direktori data JSON
json_dir = r"d:\Data Umum\Aplikasi by Vibe Coding\EQuran\equran-data\tafsir\alazhar\json"

# Pola yang akan dihapus dari Ayat 1 (ayahs[0])
# 1. Surat [Nama] [NomorHalaman] - kecuali diikuti kata "ayat", "ini", "yang"
# 2. Surat [Nama] (Ayat [Nomor]) [NomorHalaman]
# 3. Surat [Nama] ([AyatRange]) [NomorHalaman]
patterns = [
    r"Surat\s+[A-Za-z\s\-\'’]+?\s+\d+(?!\s+\b(ayat|ini|yang)\b)",
    r"Surat\s+[A-Za-z\s\-\'’]+?\s+\(Ayat\s+\'?\d+\)\s+\d+",
    r"Surat\s+[A-Za-z\s\-\'’]+?\s+\(\d+\-\d+\)\s+\d+"
]

def clean_ayah_1():
    count_files = 0
    count_removed = 0
    
    for filename in os.listdir(json_dir):
        if filename.endswith(".json"):
            file_path = os.path.join(json_dir, filename)
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
            except Exception as e:
                print(f"Error membaca {filename}: {e}")
                continue
            
            modified = False
            if "ayahs" in data and len(data["ayahs"]) > 0:
                ayat1 = data["ayahs"][0]
                if "al_azhar" in ayat1:
                    text = ayat1["al_azhar"]
                    
                    found_matches = []
                    for p in patterns:
                        # Gunakan finditer untuk menghindari masalah capturing groups
                        matches = re.finditer(p, text)
                        for m in matches:
                            found_matches.append(m.group(0))
                    
                    if found_matches:
                        # Urutkan dari yang terpanjang ke terpendek untuk menghindari partial replace
                        found_matches.sort(key=len, reverse=True)
                        for m in found_matches:
                            if m in text:
                                text = text.replace(m, "")
                                count_removed += 1
                                modified = True
                    
                    if modified:
                        # Bersihkan spasi ganda yang tersisa
                        text = re.sub(r'\s+', ' ', text).strip()
                        # Bersihkan tanda titik/koma yang menggantung jika ada (opsional)
                        ayat1["al_azhar"] = text
                        count_files += 1
            
            if modified:
                try:
                    with open(file_path, "w", encoding="utf-8") as f:
                        json.dump(data, f, indent=4, ensure_ascii=False)
                except Exception as e:
                    print(f"Error menulis {filename}: {e}")
    
    print(f"Pembersihan SELESAI!")
    print(f"- Total file yang dimodifikasi: {count_files}")
    print(f"- Total artefak yang dihapus: {count_removed}")

if __name__ == "__main__":
    clean_ayah_1()
