import os
import json
import re

def clean_text(text):
    # Hapus header/footer halaman OCR
    text = re.sub(r'(?i)Tafsir Al-Azhar \(Juzu\’ \d+\)', '', text)
    text = re.sub(r'(?i)Tajsir Al-Azhar \(Juzu\’ \d+\)', '', text)
    text = re.sub(r'(?i)Tafsir Al-Azhar', '', text)
    text = re.sub(r'^\d+\s*$', '', text, flags=re.MULTILINE) # Page numbers
    
    # Gabungkan baris dan bersihkan spasi
    lines = [l.strip() for l in text.split('\n')]
    text = ' '.join(lines)
    text = re.sub(r'\s+', ' ', text)
    
    # Hapus karakter aneh hasil OCR jika ada
    text = text.replace('f}', '').replace('MS SL/M fy’', '').strip()
    return text

def convert():
    source_dir = 'equran-data/tafsir/alazhar/'
    output_dir = 'equran-data/tafsir/alazhar/json/'
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    all_surahs = {} # surah_num -> {ayah_num: "text"}

    # Pattern Surat yang lebih ketat: awal baris, kata SURAT/Surat, angka, dan barisnya pendek
    surah_pattern = re.compile(r'^(?:SURAT|Surat)\s*(\d+)', re.IGNORECASE)
    
    # Ayat marker: (Ayat X) atau (ayat X) atau (pangkal ayat X)
    ayah_marker = re.compile(r'\(([Aa]yat\s+(\d+)(?:\s*hingga\s*(\d+))?|pangkal\s+ayat\s+(\d+)|ujung\s+ayat\s+(\d+)|ayat\s+(\d+))\)')

    files = [f for f in os.listdir(source_dir) if f.endswith('.txt')]
    files.sort()

    current_surah = None
    current_ayah = None
    buffer = []

    for filename in files:
        filepath = os.path.join(source_dir, filename)
        print(f"Processing {filename}...")
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            
        for line in lines:
            stripped = line.strip()
            if not stripped: continue

            # Deteksi Header Surat
            surah_match = surah_pattern.match(stripped) # match() mnemastikan di awal string
            if surah_match and len(stripped) < 40:
                num = int(surah_match.group(1))
                
                # Simpan data sebelumnya
                if current_surah and current_ayah and buffer:
                    s_data = all_surahs.setdefault(current_surah, {})
                    s_data[current_ayah] = s_data.get(current_ayah, "") + " " + " ".join(buffer)
                    buffer = []
                
                current_surah = num
                current_ayah = None
                print(f"  Switched to Surah {current_surah}")
                continue

            # Deteksi Penanda Ayat
            ayah_match = ayah_marker.search(stripped)
            if ayah_match:
                g2, g4, g5, g6 = ayah_match.group(2), ayah_match.group(4), ayah_match.group(5), ayah_match.group(6)
                ayah_num_str = g2 or g4 or g5 or g6
                
                if ayah_num_str:
                    new_ayah = int(ayah_num_str)
                    
                    # Simpan buffer jika ganti ayat
                    if current_surah and current_ayah != new_ayah:
                        if buffer:
                            s_data = all_surahs.setdefault(current_surah, {})
                            s_data[current_ayah] = s_data.get(current_ayah, "") + " " + " ".join(buffer)
                            buffer = []
                        current_ayah = new_ayah

                    # Ambil sisa teks di baris tersebut
                    content = ayah_marker.sub('', stripped).strip()
                    if content:
                        buffer.append(content)
                    continue

            # Tambahkan ke buffer jika sudah dalam konteks surat & ayat
            if current_surah and current_ayah:
                # Abaikan baris yang terindikasi header halaman
                if "Tafsir Al-Azhar" in stripped or "Juzu’" in stripped:
                    continue
                buffer.append(stripped)

    # Simpan sisa terakhir
    if current_surah and current_ayah and buffer:
        s_data = all_surahs.setdefault(current_surah, {})
        s_data[current_ayah] = s_data.get(current_ayah, "") + " " + " ".join(buffer)

    # Tulis ke JSON
    print("Saving to JSON...")
    for surah_num, ayahs in all_surahs.items():
        if surah_num > 114: continue
        output_path = os.path.join(output_dir, f"Alquran_{surah_num}.json")
        
        data = {
            "number": surah_num,
            "ayahs": []
        }
        
        if not ayahs: continue
        max_a = max(ayahs.keys())
        for i in range(1, max_a + 1):
            text = clean_text(ayahs.get(i, ""))
            data["ayahs"].append({"al_azhar": text})
            
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
    
    print("Done!")

if __name__ == "__main__":
    convert()
