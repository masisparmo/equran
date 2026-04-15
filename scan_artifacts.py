import json
import os
import re

# Path to the JSON files
json_dir = r"d:\Data Umum\Aplikasi by Vibe Coding\EQuran\equran-data\tafsir\alazhar\json"

# Patterns to look for
# 1. Surat [Name] [PageNumber] (e.g., Surat Al-Fatihah 65)
# 2. Surat [Name] (Ayat [Number]) [PageNumber] (e.g., Surat An-Nisa’ (Ayat '1) 1057)
# 3. Surat [Name] ([AyatRange]) [PageNumber] (e.g., Surat Al-Falaq (1-4) 8153)

patterns = [
    r"Surat\s+[A-Za-z\s\-\'’]+\s+\d+",
    r"Surat\s+[A-Za-z\s\-\'’]+\s+\(Ayat\s+\'?\d+\)\s+\d+",
    r"Surat\s+[A-Za-z\s\-\'’]+\s+\(\d+\-\d+\)\s+\d+"
]

results = []

def scan_files():
    for filename in os.listdir(json_dir):
        if filename.endswith(".json"):
            file_path = os.path.join(json_dir, filename)
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    
                    # Focus on Ayat 1
                    if "ayahs" in data and len(data["ayahs"]) > 0:
                        ayat1 = data["ayahs"][0]
                        if "al_azhar" in ayat1:
                            text = ayat1["al_azhar"]
                            found = []
                            for p in patterns:
                                matches = re.findall(p, text)
                                if matches:
                                    found.extend(matches)
                            
                            if found:
                                results.append({
                                    "file": filename,
                                    "matches": found
                                    # "context": text[:100] + "..."
                                })
            except Exception as e:
                print(f"Error reading {filename}: {e}")

scan_files()

# Print results
if results:
    print(f"Found {len(results)} files with artifacts in Ayat 1:")
    for r in results:
        print(f"File: {r['file']}, Matches: {r['matches']}")
else:
    print("No artifacts found in Ayat 1 with current patterns.")
