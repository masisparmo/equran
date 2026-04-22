const fs = require('fs');
const fetch = require('node-fetch');

async function download() {
    console.log("Downloading metadata...");
    const infoRes = await fetch('https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/info.json');
    const info = await infoRes.json();

    console.log("Downloading arabic text...");
    const arRes = await fetch('https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions/ara-quranuthmanihaf.json');
    const arData = await arRes.json();

    console.log("Downloading indonesian translation...");
    // Let's use Indonesian Ministry of Religious Affairs (ind-indonesianislam) or Quraish Shihab (ind-muhammadquraish)
    const idRes = await fetch('https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions/ind-indonesianislam.json');
    const idData = await idRes.json();

    // Format data similar to api.alquran.cloud to minimize refactoring
    const outData = {
        surahs: []
    };

    const chapters = info.chapters;
    let verseIndex = 0;

    for (let i = 0; i < chapters.length; i++) {
        const chap = chapters[i];
        const surah = {
            number: chap.chapter,
            name: chap.arabicname,
            englishName: chap.name,
            englishNameTranslation: chap.englishname,
            revelationType: chap.revelation === 'Mecca' ? 'Meccan' : 'Medinan',
            numberOfAyahs: chap.verses.length,
            ayahs: []
        };

        for (let j = 0; j < chap.verses.length; j++) {
            const verseMeta = chap.verses[j];
            surah.ayahs.push({
                number: verseIndex + 1,
                text: arData.quran[verseIndex].text,
                translation: idData.quran[verseIndex].text,
                numberInSurah: verseMeta.verse,
                juz: verseMeta.juz,
                manzil: verseMeta.manzil,
                page: verseMeta.page,
                ruku: verseMeta.ruku,
                hizbQuarter: verseMeta.maqra, // approx
                sajda: verseMeta.sajda
            });
            verseIndex++;
        }
        outData.surahs.push(surah);
    }

    fs.writeFileSync('equran-data/quran_offline.json', JSON.stringify(outData));
    console.log("Done");
}

download().catch(console.error);
