const text = "بِسْمِ [h:1[ٱ]للَّهِ [h:2[ٱ][l[ل]رَّحْمَ[n[ـٰ]نِ [h:3[ٱ][l[ل]رَّح[p[ِي]مِ";
// Regex to match [code[text] or [code:id[text]
// Actually, they can be nested? No, looks like flat: [code[text] or [code:id[text]
// Let's use a regex to replace them.
// The format is always '[' followed by color code, optional ':', optional number, then '[', then the text, then ']'. Wait, is there a closing bracket?
// "بِسْمِ [h:1[ٱ]للَّهِ" -> bracket closes after ٱ ? "]"
// Wait, looking at "[h:1[ٱ]للَّهِ", where is the closing bracket? There is NO closing bracket in the string!
// Ah, the API says:
// [h:1[ٱ] -> is it just [ h : 1 [ ٱ ] ? Let's check `curl -s "https://api.alquran.cloud/v1/page/1/quran-tajweed" | jq '.data.ayahs[0].text'`
