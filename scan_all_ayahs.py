import json
import os
import re

# Path to the JSON files
json_dir = r"d:\Data Umum\Aplikasi by Vibe Coding\EQuran\equran-data\tafsir\alazhar\json"

# Patterns to look for
patterns = [
    r"Surat\s+[A-Za-z\s\-\'’]+\s+\d+",
    r"Surat\s+[A-Za-z\s\-\'’]+\s+\(Ayat\s+\'?\d+\)\s+\d+",
    r"Surat\s+[A-Za-z\s\-\'’]+\s+\(\d+\-\d+\)\s+\d+"
]

def scan_all_ayahs():
    files_with_artifacts = []
    for filename in os.listdir(json_dir):
        if filename.endswith(".json"):
            file_path = os.path.join(json_dir, filename)
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    
                    found_in_ayahs = []
                    for i, ayat in enumerate(data.get("ayahs", [])):
                        text = ayat.get("al_azhar", "")
                        found = []
                        for p in patterns:
                            matches = re.finditer(p, text)
                            for m in matches:
                                match_text = m.group(0)
                                # Filter out likely legitimate sentences
                                if not ("ayat" in match_text.lower() and "ini" in match_text.lower()):
                                    found.append(match_text)
                        
                        if found:
                            found_in_ayahs.append({"number": ayat.get("number", i+1), "matches": found})
                    
                    if found_in_ayahs:
                        files_with_artifacts.append({"file": filename, "ayahs": found_in_ayahs})
            except Exception as e:
                pass
    
    return files_with_artifacts

results = scan_all_ayahs()

if results:
    print(f"Found artifacts in {len(results)} files across multiple ayahs:")
    for r in results[:10]: # Limit output
        print(f"File: {r['file']}")
        for a in r['ayahs']:
            print(f"  Ayat {a['number']}: {a['matches']}")
    if len(results) > 10:
        print(f"... and {len(results)-10} more files.")
else:
    print("No artifacts found with filtered patterns.")
