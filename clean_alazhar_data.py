import os
import json
import re

def clean_alazhar():
    directory = r"d:\Data Umum\Aplikasi by Vibe Coding\EQuran\equran-data\tafsir\alazhar\json"
    pattern = re.compile(r"^Surat\s+[A-Za-z\s\-\']+\s+\d+\s+")
    
    files_processed = 0
    files_cleaned = 0
    
    for filename in os.listdir(directory):
        if filename.startswith("Alquran_") and filename.endswith(".json"):
            filepath = os.path.join(directory, filename)
            files_processed += 1
            
            with open(filepath, 'r', encoding='utf-8') as f:
                try:
                    data = json.load(f)
                except Exception as e:
                    print(f"Error loading {filename}: {e}")
                    continue
            
            if "ayahs" in data and len(data["ayahs"]) > 0:
                first_ayah = data["ayahs"][0]
                if "al_azhar" in first_ayah:
                    original_text = first_ayah["al_azhar"]
                    # Clean the prefix
                    cleaned_text = pattern.sub("", original_text)
                    
                    if original_text != cleaned_text:
                        first_ayah["al_azhar"] = cleaned_text
                        files_cleaned += 1
                        
                        # Save the file back
                        with open(filepath, 'w', encoding='utf-8') as f:
                            json.dump(data, f, indent=4, ensure_ascii=False)
                        print(f"Cleaned: {filename}")
    
    print(f"\nProcessing finished.")
    print(f"Total files checked: {files_processed}")
    print(f"Total files cleaned: {files_cleaned}")

if __name__ == "__main__":
    clean_alazhar()
