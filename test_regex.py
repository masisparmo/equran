import re

text = "Diperingatkan di sini dua hal, pertama supaya takwa kepada Allah, Surat An-Nisa’ 1053 kedua supaya mengerti,"
# Pola: "Surat" + spasi + (beberapa kata berawalan huruf besar/tanda baca) + spasi + angka + (bukan diikuti "ayat/ini/yang")
p = r"Surat\s+[A-Za-z\s\-\'’]+?\s+\d+(?!\s+\b(ayat|ini|yang)\b)"

matches = re.finditer(p, text)
print("Matches found:")
for m in matches:
    print(f"Found: '{m.group(0)}'")
    text = text.replace(m.group(0), "")

print(f"Final text: {text}")
