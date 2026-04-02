const text = "ٱلَّذِينَ يُؤْمِنُونَ بِ[h:13[ٱ]لْغَيْبِ وَيُقِيمُونَ [h:14[ٱ][l[ل]صَّلَ[s[و][n[ٲ]ةَ وَمِ[g[مّ]َا رَزَ[q:15[قْ]نَ[n[ـٰ]هُمْ يُ[f:16[نف]ِق[p[ُو]نَ";
// The format seems to be: [code[text] or [code:id[text]
// e.g. [h:13[ٱ]
// regex: /\[([a-z]+)(?::\d+)?\[(.*?)\]/g
// Wait, the string is بِ[h:13[ٱ]لْغَيْبِ . Inside `[h:13[` is `ٱ` followed by `]` .
// Let's test the regex.
const regex = /\[([a-z])(?::\d+)?\[([^\]]+)\]/g;
const parsed = text.replace(regex, '<span class="tajweed-$1">$2</span>');
console.log(parsed);
