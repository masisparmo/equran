// State Variables
let currentSurah = null;
let currentAyah = null;
let apiKeys = [];
let currentApiKeyIndex = 0;

// DOM Elements
const homeBtn = document.getElementById('home-btn');
const aboutBtn = document.getElementById('about-btn');
const aboutModal = document.getElementById('about-modal');
const closeAboutModalBtn = document.getElementById('close-about-modal');
const helpBtn = document.getElementById('help-btn');
const helpModal = document.getElementById('help-modal');
const closeHelpModalBtn = document.getElementById('close-help-modal');

const themeToggleBtn = document.getElementById('theme-toggle');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsModalBtn = document.getElementById('close-settings-modal');
const newApiKeyInput = document.getElementById('new-api-key');
const addKeyBtn = document.getElementById('add-key-btn');
const keysList = document.getElementById('keys-list');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const welcomeModal = document.getElementById('welcome-modal');
const closeWelcomeModalBtn = document.getElementById('close-welcome-modal');
const welcomeApiKeyInput = document.getElementById('welcome-api-key');
const welcomeSaveKeyBtn = document.getElementById('welcome-save-key-btn');

// Intro Card UI Elements
const introCard = document.getElementById('intro-card');
const introTitle = document.getElementById('intro-title');

// Deep Detail Modal Elements
const deepDetailModal = document.getElementById('deep-detail-modal');
const closeDeepDetailModalBtn = document.getElementById('close-deep-detail-modal');
const deepDetailTitle = document.getElementById('deep-detail-title');
const deepDetailContent = document.getElementById('deep-detail-content');
const deepDetailLoading = document.getElementById('deep-detail-loading');
const deepDetailError = document.getElementById('deep-detail-error');
const copyDetailBtn = document.getElementById('copy-detail-btn');
const downloadDetailBtn = document.getElementById('download-detail-btn');
const askAiExpertContainer = document.getElementById('ask-ai-expert-container');
const askAiExpertBtn = document.getElementById('ask-ai-expert-btn');

// AI Chat Modal Elements
const aiChatModal = document.getElementById('ai-chat-modal');
const closeAiChatModalBtn = document.getElementById('close-ai-chat-modal');
const chatHistory = document.getElementById('chat-history');
const chatInput = document.getElementById('chat-input');
const sendChatBtn = document.getElementById('send-chat-btn');
const newChatBtn = document.getElementById('new-chat-btn');
const copyChatBtn = document.getElementById('copy-chat-btn');
const downloadChatBtn = document.getElementById('download-chat-btn');

let currentWordContext = {}; // Store context for detail explanation
let currentDeepExplainText = ""; // Store plain markdown text for download/copy
let chatSessionHistory = []; // Store conversational context for the chat API

// --- API Variables ---
const quranApiBaseUrl = 'https://api.alquran.cloud/v1';
const gasBackendUrl = 'https://script.google.com/macros/s/AKfycbz6LH6bOoAYpzqtS91sn-g_ZHH-WJZvg_1eK4lBg4Vqvly9iTe8SPIxMSRQ-5Ox4vt6SA/exec';
let surahsData = [];
let currentSurahData = null; // Store fetched data for current surah
let currentAyahsIndo = null; // Store translations
let currentAudioUrls = null;

// --- Migration System (localStorage to IndexedDB) ---
async function migrateLocalStorageToIndexedDB() {
    try {
        const theme = localStorage.getItem('theme');
        if (theme) {
            await localforage.setItem('theme', theme);
            localStorage.removeItem('theme');
        }

        const keys = localStorage.getItem('gemini_api_keys');
        if (keys) {
            try {
                const parsedKeys = JSON.parse(keys);
                if (Array.isArray(parsedKeys)) {
                    await localforage.setItem('gemini_api_keys', parsedKeys);
                }
            } catch (e) {
                console.warn('Migration: Failed to parse old api keys');
            }
            localStorage.removeItem('gemini_api_keys');
        }
        console.log('Migration check complete.');
    } catch(e) {
        console.error('Migration failed:', e);
    }
}

// Initialization
async function init() {
    await migrateLocalStorageToIndexedDB();
    await loadTheme();
    await loadApiKeys();
    setupEventListeners();
    fetchSurahs();

    // Check if we need to show welcome modal on first load
    if (apiKeys.length === 0 && !sessionStorage.getItem('welcome_dismissed')) {
        openModal(welcomeModal);
    }

    // Auto-collapse intro card on mobile
    if (window.innerWidth <= 768 && introCard) {
        introCard.classList.add('is-collapsed');
    }
}

// Event Listeners
function setupEventListeners() {
    // Theme
    themeToggleBtn.addEventListener('click', toggleTheme);

    // Settings Modal
    settingsBtn.addEventListener('click', () => openModal(settingsModal));
    closeSettingsModalBtn.addEventListener('click', () => closeModal(settingsModal));
    addKeyBtn.addEventListener('click', () => addApiKey(newApiKeyInput.value, newApiKeyInput));
    saveSettingsBtn.addEventListener('click', () => closeModal(settingsModal));

    // Welcome Modal
    closeWelcomeModalBtn.addEventListener('click', () => {
        sessionStorage.setItem('welcome_dismissed', 'true');
        closeModal(welcomeModal);
    });
    welcomeSaveKeyBtn.addEventListener('click', () => {
        const added = addApiKey(welcomeApiKeyInput.value, welcomeApiKeyInput);
        if (added) {
            closeModal(welcomeModal);
        }
    });

    // Navigation Logic
    homeBtn.addEventListener('click', () => {
        closeModal(settingsModal);
        closeModal(document.getElementById('word-modal'));
        closeModal(welcomeModal);
        closeModal(aboutModal);
        closeModal(helpModal);
    });

    aboutBtn.addEventListener('click', () => {
        openModal(aboutModal);
    });

    closeAboutModalBtn.addEventListener('click', () => {
        closeModal(aboutModal);
    });

    helpBtn.addEventListener('click', () => {
        openModal(helpModal);
    });

    closeHelpModalBtn.addEventListener('click', () => {
        closeModal(helpModal);
    });

    // Deep Detail Modal
    if (closeDeepDetailModalBtn) {
        closeDeepDetailModalBtn.addEventListener('click', () => {
            closeModal(deepDetailModal);
        });
    }

    if (copyDetailBtn) {
        copyDetailBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(currentDeepExplainText).then(() => {
                alert('Teks berhasil disalin ke clipboard!');
            }).catch(err => {
                console.error('Failed to copy text: ', err);
                alert('Gagal menyalin teks.');
            });
        });
    }

    if (downloadDetailBtn) {
        downloadDetailBtn.addEventListener('click', () => {
            if (!currentDeepExplainText) return;
            const blob = new Blob([currentDeepExplainText], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `penjelasan_detail_${currentWordContext.wordText || 'quran'}.txt`;
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    if (askAiExpertBtn) {
        askAiExpertBtn.addEventListener('click', () => {
            openAiChatModal();
        });
    }

    if (closeAiChatModalBtn) {
        closeAiChatModalBtn.addEventListener('click', () => {
            closeModal(aiChatModal);
        });
    }

    if (sendChatBtn) {
        sendChatBtn.addEventListener('click', sendChatMessage);
    }

    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendChatMessage();
        });
    }

    if (newChatBtn) {
        newChatBtn.addEventListener('click', startNewChat);
    }

    if (copyChatBtn) {
        copyChatBtn.addEventListener('click', () => handleChatAction('copy'));
    }

    if (downloadChatBtn) {
        downloadChatBtn.addEventListener('click', () => handleChatAction('download'));
    }

    // Detail Buttons inside Word Modal
    document.querySelectorAll('.detail-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const type = e.target.closest('.detail-btn').getAttribute('data-type');
            handleDeepExplain(type);
        });
    });

    // Close Modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target === settingsModal) closeModal(settingsModal);
        if (e.target === aboutModal) closeModal(aboutModal);
        if (e.target === helpModal) closeModal(helpModal);
        if (e.target === deepDetailModal) closeModal(deepDetailModal);
        if (e.target === aiChatModal) closeModal(aiChatModal);
        if (e.target === welcomeModal) {
            sessionStorage.setItem('welcome_dismissed', 'true');
            closeModal(welcomeModal);
        }
        if (e.target === document.getElementById('word-modal')) closeModal(document.getElementById('word-modal'));
    });

    // Close Modals with Escape key
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (welcomeModal.classList.contains('show')) {
                sessionStorage.setItem('welcome_dismissed', 'true');
                closeModal(welcomeModal);
            }
            if (settingsModal.classList.contains('show')) closeModal(settingsModal);
            if (aboutModal.classList.contains('show')) closeModal(aboutModal);
            if (helpModal.classList.contains('show')) closeModal(helpModal);
            if (aiChatModal.classList.contains('show')) {
                closeModal(aiChatModal);
            } else if (deepDetailModal.classList.contains('show')) {
                closeModal(deepDetailModal);
            } else if (document.getElementById('word-modal').classList.contains('show')) {
                closeModal(document.getElementById('word-modal'));
            }
        }
    });

    document.getElementById('close-word-modal').addEventListener('click', () => {
        closeModal(document.getElementById('word-modal'));
    });

    // Intro Card Toggle
    if (introTitle && introCard) {
        introTitle.addEventListener('click', () => {
            introCard.classList.toggle('is-collapsed');
        });
    }

    // Navigation Listeners
    document.getElementById('surah-select').addEventListener('change', handleSurahChange);
    document.getElementById('ayah-select').addEventListener('change', handleAyahChange);
    document.getElementById('prev-ayah-btn').addEventListener('click', () => changeAyah(-1));
    document.getElementById('next-ayah-btn').addEventListener('click', () => changeAyah(1));

    // Audio Player listener
    const audioPlayer = document.getElementById('ayah-audio');
    const playBtn = document.getElementById('play-audio-btn');
    playBtn.addEventListener('click', () => {
        if (audioPlayer.paused) {
            audioPlayer.play();
            playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        } else {
            audioPlayer.pause();
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
    });

    audioPlayer.addEventListener('ended', () => {
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
    });
}

// --- API Integration (Al-Qur'an Cloud) ---
async function fetchSurahs() {
    const surahSelect = document.getElementById('surah-select');
    showLoading();
    try {
        const response = await fetch(`${quranApiBaseUrl}/surah`);
        const data = await response.json();
        if (data.code === 200) {
            surahsData = data.data;
            populateSurahSelect();
        } else {
            throw new Error("Failed to load surahs");
        }
    } catch (error) {
        console.error("Error fetching surahs:", error);
        surahSelect.innerHTML = '<option value="">Gagal memuat surah.</option>';
    } finally {
        hideLoading();
    }
}

function populateSurahSelect() {
    const surahSelect = document.getElementById('surah-select');
    surahSelect.innerHTML = '<option value="">-- Pilih Surah --</option>';
    surahsData.forEach(surah => {
        const option = document.createElement('option');
        option.value = surah.number;
        option.textContent = `${surah.number}. ${surah.englishName} (${surah.name})`;
        surahSelect.appendChild(option);
    });
}

async function handleSurahChange(e) {
    const surahNumber = e.target.value;
    const ayahSelect = document.getElementById('ayah-select');

    if (!surahNumber) {
        ayahSelect.disabled = true;
        ayahSelect.innerHTML = '<option value="">Pilih Surah Dulu</option>';
        document.getElementById('quran-display').style.display = 'none';
        return;
    }

    showLoading();
    try {
        // Fetch Arabic text
        const arResponse = await fetch(`${quranApiBaseUrl}/surah/${surahNumber}`);
        const arData = await arResponse.json();
        currentSurahData = arData.data;

        // Fetch Indonesian Translation
        const idResponse = await fetch(`${quranApiBaseUrl}/surah/${surahNumber}/id.indonesian`);
        const idData = await idResponse.json();
        currentAyahsIndo = idData.data.ayahs;

        // Fetch Audio (Alafasy)
        const audioResponse = await fetch(`${quranApiBaseUrl}/surah/${surahNumber}/ar.alafasy`);
        const audioData = await audioResponse.json();
        currentAudioUrls = audioData.data.ayahs;

        populateAyahSelect(currentSurahData.ayahs.length);

        // Auto-select first ayah
        ayahSelect.disabled = false;
        ayahSelect.value = "1";
        handleAyahChange({ target: { value: "1" } });

        document.getElementById('quran-display').style.display = 'block';
    } catch (error) {
        console.error("Error fetching surah details:", error);
        alert("Gagal memuat detail surah. Coba lagi.");
    } finally {
        hideLoading();
    }
}

function populateAyahSelect(totalAyahs) {
    const ayahSelect = document.getElementById('ayah-select');
    ayahSelect.innerHTML = '';
    for (let i = 1; i <= totalAyahs; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `Ayat ${i}`;
        ayahSelect.appendChild(option);
    }
}

function handleAyahChange(e) {
    const ayahNumberInSurah = parseInt(e.target.value);
    if (!ayahNumberInSurah) return;

    displayAyah(ayahNumberInSurah);
}

function changeAyah(direction) {
    const ayahSelect = document.getElementById('ayah-select');
    const currentIndex = parseInt(ayahSelect.value);
    const totalAyahs = currentSurahData.ayahs.length;
    let newIndex = currentIndex + direction;

    if (newIndex >= 1 && newIndex <= totalAyahs) {
        ayahSelect.value = newIndex;
        displayAyah(newIndex);
    }
}

function displayAyah(ayahNumberInSurah) {
    const ayahIndex = ayahNumberInSurah - 1;
    const ayahAr = currentSurahData.ayahs[ayahIndex];
    const ayahId = currentAyahsIndo[ayahIndex];
    const ayahAudio = currentAudioUrls[ayahIndex];

    document.getElementById('current-surah-name').textContent = `${currentSurahData.englishName} - Ayat ${ayahNumberInSurah}`;

    // Process Arabic text into words
    // We remove the Bismillah if it's not Al-Fatihah Ayah 1, as the API sometimes includes it inline
    let textAr = ayahAr.text;
    let wordIndexOffset = 0;

    // Remove "Bismillah" from Surah other than Al-Fatihah (Surah 1) for Ayah 1
    if (currentSurahData.number !== 1 && ayahNumberInSurah === 1) {
        const bismillahStr = "بِسۡمِ ٱللَّهِ ٱلرَّحۡمَـٰنِ ٱلرَّحِیمِ ";
        if (textAr.startsWith(bismillahStr)) {
            textAr = textAr.substring(bismillahStr.length).trim();
            // Since we stripped Bismillah, we need to offset the word indices by the number
            // of words in the Bismillah prefix (which is 4 words in the API text: بِسۡمِ, ٱللَّهِ, ٱلرَّحۡمَـٰنِ, ٱلرَّحِیمِ)
            // so the backend can still match `w4`, `w5`, etc.
            const bismillahWordsCount = bismillahStr.trim().split(/\s+/).filter(w => w.trim() !== "").length;
            wordIndexOffset = bismillahWordsCount;
        }
    }

    // Set Translation
    document.getElementById('translation-container').textContent = ayahId.text;

    // Set Audio
    const audioPlayer = document.getElementById('ayah-audio');
    audioPlayer.src = ayahAudio.audio;
    document.getElementById('play-audio-btn').innerHTML = '<i class="fas fa-play"></i>'; // Reset icon

    // Update Nav Buttons State
    const totalAyahs = currentSurahData.ayahs.length;
    document.getElementById('prev-ayah-btn').disabled = (ayahNumberInSurah === 1);
    document.getElementById('next-ayah-btn').disabled = (ayahNumberInSurah === totalAyahs);

    renderArabicWords(textAr, currentSurahData.number, ayahNumberInSurah, wordIndexOffset);
}

function renderArabicWords(textAr, surahNum, ayahNum, wordIndexOffset = 0) {
    const container = document.getElementById('arabic-container');
    container.innerHTML = '';

    // Split text by space. Keep punctuation attached or separate based on needs.
    const words = textAr.split(/\s+/).filter(w => w.trim() !== "");

    words.forEach((wordText, loopIndex) => {
        // Apply offset so that the visual index 0 aligns with the backend's original word index
        const actualWordIndex = loopIndex + wordIndexOffset;

        const span = document.createElement('span');
        span.className = 'word role-default';
        span.textContent = wordText;
        span.dataset.surah = surahNum;
        span.dataset.ayah = ayahNum;
        span.dataset.wordIndex = actualWordIndex;

        span.addEventListener('click', () => handleWordClick(wordText, surahNum, ayahNum, actualWordIndex, span));

        container.appendChild(span);
        // Add space between words
        container.appendChild(document.createTextNode(' '));
    });
}

// UI Helpers
function showLoading() {
    document.getElementById('loading-indicator').style.display = 'block';
}

function hideLoading() {
    document.getElementById('loading-indicator').style.display = 'none';
}

function handleWordClick(wordText, surahNum, ayahNum, wordIndex, element) {
    // We do NOT block if apiKeys.length === 0 here anymore.
    // We let the logic check the database first.
    // The welcome modal will only trigger if the database misses AND there are no keys.

    // Store context for deep explanations
    const ayahIndex = ayahNum - 1;
    currentWordContext = {
        wordText: wordText,
        surahNum: surahNum,
        ayahNum: ayahNum,
        wordIndex: wordIndex,
        fullAyahAr: currentSurahData.ayahs[ayahIndex].text,
        fullAyahId: currentAyahsIndo[ayahIndex].text
    };

    // Prepare modal UI
    const wordModal = document.getElementById('word-modal');
    document.getElementById('modal-arabic-word').textContent = wordText;

    // Reset modal content
    const fields = ['modal-transliterasi', 'modal-jenis-kata', 'modal-arti-harfiah', 'modal-akar-kata', 'modal-makna-dasar', 'modal-wazan-perubahan', 'modal-kedudukan', 'modal-irab-logika', 'modal-kesimpulan-makna'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.textContent = '-';
    });

    document.getElementById('ai-error').style.display = 'none';
    document.getElementById('ai-loading').style.display = 'block';
    document.getElementById('word-analysis-narrative').style.display = 'none';

    openModal(wordModal);

    analyzeWordWithAI(wordText, surahNum, ayahNum, wordIndex, element);
}

// --- AI Logic, Backend, & Caching ---
async function analyzeWordWithAI(wordText, surahNum, ayahNum, wordIndex, element) {
    const cacheKey = `quran_ai_v3_${surahNum}_${ayahNum}_${wordIndex}`;

    // 1. Check IndexedDB First (Fastest & Largest Storage)
    try {
        const cachedData = await localforage.getItem(cacheKey);
        if (cachedData) {
            displayWordDetails(cachedData); // localforage handles JSON parsing automatically
            updateWordElementRole(element, cachedData.role);
            return;
        }
    } catch (err) {
        console.warn("Failed to read from IndexedDB:", err);
    }

    // Prepare to hit external sources
    const idKata = `s${surahNum}_a${ayahNum}_w${wordIndex}`;

    // 2. Check the Google Sheets Backend (Crowdsourced DB)
    try {
        // We use mode: 'cors' and bypass the pre-flight if possible,
        // GAS often handles GETs seamlessly but sometimes requires it.
        const response = await fetch(`${gasBackendUrl}?id=${idKata}`);
        if (response.ok) {
            const dbData = await response.json();
            if (dbData.status === 'success' && dbData.data) {
                // Save to local IndexedDB cache
                try { await localforage.setItem(cacheKey, dbData.data); } catch(e) {}

                displayWordDetails(dbData.data);
                updateWordElementRole(element, dbData.data.role);
                console.log("Data retrieved from community database!");
                return; // Stop here, no need to use API Key
            }
        }
    } catch (e) {
        console.warn("Failed to contact database, falling back to API", e);
    }

    // 3. If missing from Local and DB, we MUST use Gemini API.
    // Ensure user has keys first.
    if (apiKeys.length === 0) {
        closeModal(document.getElementById('word-modal'));
        openModal(welcomeModal);
        return;
    }

    // Prepare full Ayah context for Gemini
    const ayahIndex = ayahNum - 1;
    const fullAyahAr = currentSurahData.ayahs[ayahIndex].text;
    const fullAyahId = currentAyahsIndo[ayahIndex].text;

    const aiPrompt = generateAIPrompt(wordText, fullAyahAr, fullAyahId, currentSurahData.englishName, ayahNum);

    let success = false;
    let attempts = 0;
    const maxAttempts = apiKeys.length;

    while (!success && attempts < maxAttempts) {
        const apiKey = apiKeys[currentApiKeyIndex];
        try {
            const result = await callGeminiAPI(apiKey, aiPrompt);
            const parsedResult = JSON.parse(result); // Assumes AI returns clean JSON

            // Cache the result locally in IndexedDB
            try { await localforage.setItem(cacheKey, parsedResult); } catch(e) {}

            // Render it immediately for the user
            displayWordDetails(parsedResult);
            updateWordElementRole(element, parsedResult.role);

            success = true;

            // 4. (Asynchronous) Save this new analysis to the Google Sheet Backend!
            saveToCommunityDatabase(surahNum, ayahNum, wordIndex, wordText, parsedResult);

        } catch (error) {
            console.error(`Error with API Key ${currentApiKeyIndex}:`, error);
            // Move to next key on failure
            currentApiKeyIndex = (currentApiKeyIndex + 1) % apiKeys.length;
            attempts++;
        }
    }

    if (!success) {
        document.getElementById('ai-loading').style.display = 'none';
        document.getElementById('ai-error').style.display = 'block';
    }
}

// Function to save newly generated AI data back to Google Sheets
function saveToCommunityDatabase(surahNum, ayahNum, wordIndex, wordText, aiResult) {
    const payload = {
        surah: surahNum,
        ayah: ayahNum,
        wordIndex: wordIndex,
        kata_arab: wordText,
        analisis: aiResult
    };

    fetch(gasBackendUrl, {
        method: 'POST',
        headers: {
            // Content-Type is text/plain to avoid CORS preflight issues with GAS
            'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            console.log("Successfully contributed analysis to the community database!");
        } else {
            console.log("Database response:", data);
        }
    })
    .catch(error => console.error("Error saving to database:", error));
}

async function callGeminiAPI(apiKey, prompt) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const requestBody = {
        contents: [{
            parts: [{ text: prompt }]
        }],
        generationConfig: {
            temperature: 0.1, // Keep it deterministic for JSON output
            responseMimeType: "application/json"
        }
    };

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

async function callGeminiAPIText(apiKey, prompt) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const requestBody = {
        contents: [{
            parts: [{ text: prompt }]
        }],
        generationConfig: {
            temperature: 0.3, // Slightly higher for more natural text generation
            responseMimeType: "text/plain"
        }
    };

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

function generateAIPrompt(word, ayahAr, ayahId, surahName, ayahNum) {
    return `
    Bertindaklah sebagai Guru Bahasa Arab dan Ahli Tafsir Al-Quran yang sangat sabar, ahli, dan terbiasa mengajar murid non-Arab dari tingkat dasar (awam).

    Saya ingin belajar memahami Al-Quran. Tolong bedah dan analisis kata "${word}" secara mendetail, berdasarkan konteks ayatnya.

    Surat: ${surahName}
    Ayat ke: ${ayahNum}
    Konteks Ayat (Arab): "${ayahAr}"
    Konteks Terjemahan (Indo): "${ayahId}"

    Tolong gunakan bahasa Indonesia yang sederhana dan hindari penjelasan berbelit-belit. Untuk kata ini, jabarkan analisis DALAM BENTUK JSON SAJA dengan skema berikut:
    {
      "identitas_kata": {
        "tulisan_arab": "Tulisan Arab dari kata tersebut",
        "transliterasi": "Cara bacanya dalam huruf latin",
        "jenis_kata": "Isim (Kata Benda), Fi'il (Kata Kerja), atau Harf (Huruf)",
        "arti_harfiah": "Arti dasar/harfiah dari kata tersebut"
      },
      "analisis_sharaf": {
        "akar_kata": "Akar kata (root word) huruf Arab, misal: ك ت ب. Jika tidak ada isikan null",
        "makna_dasar": "Makna dasar dari akar kata tersebut",
        "wazan_perubahan": "Bagaimana perubahan bentuknya (wazan) dan apa makna dari perubahan tersebut. Jika tidak ada isikan null"
      },
      "analisis_nahwu": {
        "kedudukan": "Kedudukan kata ini dalam kalimat (misal: subjek, predikat, huruf jar, dll) dengan bahasa awam",
        "irab_dan_logika": "Penjelasan mengapa harakat huruf terakhirnya seperti itu (misal: mengapa kasrah, bukan fathah/dhammah). Jelaskan I'rab ini dengan logika yang mudah dipahami orang awam."
      },
      "kesimpulan_makna": "Kesimpulan makna dari kata ini pada ayat tersebut berdasarkan ilmu tata bahasa di atas. Apa hikmah luar biasa atau keunikan sastra dari penggunaan kata ini?",
      "role": "Pilih salah satu nilai untuk pewarnaan sintaks di UI: 'subject' (jika berfungsi sebagai subjek/fa'il/mubtada), 'predicate' (jika berfungsi sebagai predikat/fi'il/khabar), 'object' (jika berfungsi sebagai objek/maf'ul bih), ATAU 'none' (jika selain ketiganya)"
    }

    Pastikan JSON valid dan sesuai skema di atas tanpa awalan markdown \`\`\`json.
    `;
}

function displayWordDetails(data) {
    document.getElementById('ai-loading').style.display = 'none';

    // Helper function to safely parse markdown if marked is available and sanitize it
    const renderMarkdown = (text) => {
        if (!text || text === "null" || text === "-") return "-";
        let html = (typeof marked !== 'undefined') ? marked.parse(text) : text;
        // Sanitize the HTML to prevent Stored XSS from the crowdsourced database
        if (typeof DOMPurify !== 'undefined') {
            html = DOMPurify.sanitize(html);
        }
        return html;
    };

    // Fill the data - Section 1: Identitas Kata
    if (data.identitas_kata) {
        document.getElementById('modal-transliterasi').textContent = data.identitas_kata.transliterasi || '-';
        document.getElementById('modal-jenis-kata').textContent = data.identitas_kata.jenis_kata || '-';
        document.getElementById('modal-arti-harfiah').textContent = data.identitas_kata.arti_harfiah || '-';
    }

    // Fill the data - Section 2: Analisis Sharaf
    if (data.analisis_sharaf) {
        const akarKata = data.analisis_sharaf.akar_kata;
        document.getElementById('modal-akar-kata').textContent = (akarKata && akarKata !== "null") ? akarKata : '-';
        document.getElementById('modal-makna-dasar').innerHTML = renderMarkdown(data.analisis_sharaf.makna_dasar);

        const wazanEl = document.getElementById('modal-wazan-perubahan');
        const wazanVal = data.analisis_sharaf.wazan_perubahan;
        if (wazanVal && wazanVal !== "null" && wazanVal !== "-") {
            wazanEl.innerHTML = `<strong>Wazan & Perubahan:</strong> ${renderMarkdown(wazanVal)}`;
            wazanEl.style.display = 'block';
        } else {
            wazanEl.style.display = 'none';
        }
    }

    // Fill the data - Section 3: Analisis Nahwu
    if (data.analisis_nahwu) {
        document.getElementById('modal-kedudukan').innerHTML = renderMarkdown(data.analisis_nahwu.kedudukan);
        const irabEl = document.getElementById('modal-irab-logika');
        const irabVal = data.analisis_nahwu.irab_dan_logika;
        if (irabVal && irabVal !== "null" && irabVal !== "-") {
            irabEl.innerHTML = `<strong>Logika Tata Bahasa:</strong> ${renderMarkdown(irabVal)}`;
            irabEl.style.display = 'block';
        } else {
            irabEl.style.display = 'none';
        }
    }

    // Fill the data - Kesimpulan
    const kesimpulanEl = document.getElementById('modal-kesimpulan-makna');
    if (data.kesimpulan_makna && data.kesimpulan_makna !== "null" && data.kesimpulan_makna !== "-") {
        kesimpulanEl.innerHTML = renderMarkdown(data.kesimpulan_makna);
    } else {
        kesimpulanEl.innerHTML = "-";
    }

    // Show narrative container
    document.getElementById('word-analysis-narrative').style.display = 'block';
}

async function handleDeepExplain(type) {
    if (apiKeys.length === 0) {
        openModal(welcomeModal);
        return;
    }

    // Show Deep Detail Modal
    openModal(deepDetailModal);
    deepDetailLoading.style.display = 'flex';
    deepDetailContent.style.display = 'none';
    deepDetailError.style.display = 'none';
    askAiExpertContainer.style.display = 'none'; // Hide Ask AI button until loaded
    currentDeepExplainText = ""; // Reset current text

    const { wordText, surahNum, ayahNum, wordIndex, fullAyahAr, fullAyahId } = currentWordContext;
    const cacheKey = `deep_explain_${type}_${surahNum}_${ayahNum}_${wordIndex}`;

    // 1. Check IndexedDB Cache
    try {
        const cachedData = await localforage.getItem(cacheKey);
        if (cachedData) {
            renderDeepExplainContent(cachedData);
            return;
        }
    } catch (err) {
        console.warn("Failed to read deep explain cache:", err);
    }

    // 2. Prepare Prompt based on Type
    let prompt = "";

    // We get some existing data from the modal for context
    const artiHarfiah = document.getElementById('modal-arti-harfiah').textContent;
    const jenisKata = document.getElementById('modal-jenis-kata').textContent;

    if (type === 'identitas') {
        deepDetailTitle.innerHTML = `<i class="fas fa-info-circle"></i> Detail Identitas Kata`;
        prompt = `Kamu adalah asisten ahli bahasa Arab yang menjelaskan jenis kata untuk pengguna dari level pemula hingga menengah.
Fokus hanya pada IDENTITAS KATA, bukan analisis kalimat.

JANGAN membahas:
- i'rab (majrur, marfu', dll)
- posisi dalam kalimat
- tafsir ayat

Gunakan bahasa Indonesia yang sederhana tapi tetap ilmiah.

Struktur output WAJIB:
📘 DEFINISI SINGKAT
- Jelaskan apa itu jenis kata (isim/fi'il/harf)
🔎 KENAPA INI TERMASUK [JENIS KATA]
- Alasan logis berdasarkan sifat kata
🧩 KLASIFIKASI
- mufrad/jamak, nakirah/ma’rifah, atau jenis lain jika relevan
⚙️ CIRI-CIRI
- Ciri umum jenis kata & Ciri yang terlihat pada kata ini
🔤 BENTUK ASAL (RINGAN)
- Bentuk dasar tanpa analisis mendalam
📊 PERBANDINGAN
- 1 isim, 1 fi’il, 1 huruf (opsional/singkat saja)
✨ CATATAN
- 1 insight penting

Aturan: Maks 150–250 kata, Gunakan bullet point, Tidak boleh overlap dengan sharaf & nahwu.
Format output gunakan Markdown.

Input:
Kata: ${wordText}
Jenis: ${jenisKata}
Arti: ${artiHarfiah}`;
    } else if (type === 'sharaf') {
        deepDetailTitle.innerHTML = `<i class="fas fa-project-diagram"></i> Detail Analisis Sharaf`;
        prompt = `Kamu adalah ahli Sharaf (morfologi bahasa Arab).
Tugasmu menjelaskan bagaimana sebuah kata terbentuk dari akar dan pola katanya.

JANGAN membahas:
- i'rab (majrur, marfu', dll)
- posisi dalam kalimat
- tafsir ayat

Gunakan bahasa Indonesia yang jelas dan terstruktur.

Struktur output WAJIB:
🔤 AKAR KATA (جذر)
- Sebutkan huruf asli (3 atau 4 huruf)
- Jelaskan makna dasar akar
- Wajib sertakan "Dekonstruksi Kata": Jelaskan proses dekonstruksi kata tersebut menjadi akar katanya. (Misalnya: pada kata 'بِسْمِ' di dekonstruksi kenapa bisa jadi sin mim waw, yaitu gabungan awalan huruf Ba' dan kata Ism).
🧬 POLA / WAZAN
- Sebutkan pola jika diketahui (misal: فِعْل, فَعَلَ, dll)
- Jika tidak yakin, jelaskan bentuk umum tanpa spekulasi
📦 BENTUK KATA
- Mufrad / jamak, Isim / fi’il, Turunan atau bukan
🌱 MAKNA DASAR
- Makna dari akar kata & Hubungan dengan makna kata saat ini
🔄 PERKEMBANGAN MAKNA
- Jelaskan bagaimana makna berkembang dari akar ke penggunaan sekarang
✨ CATATAN
- Insight kecil tentang pola atau keunikan kata

Aturan: Maks 150–250 kata, Fokus morfologi saja, Jangan masuk ke nahwu/i’rab.
Format output gunakan Markdown.

Input:
Kata: ${wordText}`;
    } else if (type === 'nahwu') {
        deepDetailTitle.innerHTML = `<i class="fas fa-balance-scale"></i> Detail Analisis Nahwu & I'rab`;
        prompt = `Kamu adalah ahli Nahwu (tata bahasa Arab) dan I’rab.
Tugasmu menjelaskan posisi dan fungsi kata dalam kalimat secara logis dan mudah dipahami.
Gunakan bahasa Indonesia sederhana tapi tetap ilmiah.

Struktur output WAJIB:
📍 KEDUDUKAN DALAM KALIMAT
- Jelaskan peran kata (misal: isim majrur, mubtada, dll)
- Sebutkan penyebabnya
⚙️ HUBUNGAN ANTAR KATA
- Jelaskan hubungan dengan kata sebelum/ sesudahnya
📉 I’RAB (PERUBAHAN AKHIR KATA)
- Sebutkan status: marfu’, manshub, majrur
- Jelaskan tanda (dhammah, fathah, kasrah)
🧠 LOGIKA TATA BAHASA
- Jelaskan kenapa perubahan itu terjadi (sebab nahwu)
🔗 RANGKUMAN SEDERHANA
- Ringkasan fungsi kata dalam 1–2 kalimat

Aturan: Maks 150–250 kata, Fokus fungsi & i’rab, Jangan bahas sharaf detail, Jangan tafsir panjang.
Format output gunakan Markdown.

Input:
Kata: ${wordText}
Kalimat Ayat: ${fullAyahAr}
Terjemahan: ${fullAyahId}`;
    }

    // 3. Call AI
    let success = false;
    let attempts = 0;
    const maxAttempts = apiKeys.length;

    while (!success && attempts < maxAttempts) {
        const apiKey = apiKeys[currentApiKeyIndex];
        try {
            const result = await callGeminiAPIText(apiKey, prompt);

            // Cache the plain text result
            try { await localforage.setItem(cacheKey, result); } catch(e) {}

            renderDeepExplainContent(result);
            success = true;
        } catch (error) {
            console.error(`Error deep explain with API Key ${currentApiKeyIndex}:`, error);
            currentApiKeyIndex = (currentApiKeyIndex + 1) % apiKeys.length;
            attempts++;
        }
    }

    if (!success) {
        deepDetailLoading.style.display = 'none';
        deepDetailError.style.display = 'block';
    }
}

function renderDeepExplainContent(markdownText) {
    currentDeepExplainText = markdownText;

    let html = (typeof marked !== 'undefined') ? marked.parse(markdownText) : markdownText;
    if (typeof DOMPurify !== 'undefined') {
        html = DOMPurify.sanitize(html);
    }

    deepDetailContent.innerHTML = html;
    deepDetailLoading.style.display = 'none';
    deepDetailContent.style.display = 'block';
    askAiExpertContainer.style.display = 'block'; // Show Ask AI button
}

function openAiChatModal() {
    // Initialize Chat Context
    chatSessionHistory = [
        {
            role: "user",
            parts: [{ text: `Saya sedang membaca penjelasan detail mengenai sebuah kata dalam Al-Quran. Berikut adalah konteks penjelasannya:\n\n${currentDeepExplainText}\n\nTolong bersikap sebagai ahli tafsir dan bahasa Arab. Jawab pertanyaan saya selanjutnya hanya berdasarkan konteks ini jika relevan. Jika pertanyaan saya melenceng, Anda tetap bisa menjawabnya tapi kaitkan dengan ilmu Al-Quran.` }]
        },
        {
            role: "model",
            parts: [{ text: "Baik, saya mengerti konteksnya. Silakan ajukan pertanyaan Anda mengenai penjelasan tersebut, dan saya akan menjawabnya sebagai ahli tafsir dan bahasa Arab." }]
        }
    ];

    const greetingText = `Halo! Saya siap menjawab pertanyaan Anda seputar penjelasan detail kata **${currentWordContext.wordText}** yang baru saja Anda baca. Apa yang ingin Anda tanyakan?`;
    let htmlReply = (typeof marked !== 'undefined') ? marked.parse(greetingText) : escapeHtml(greetingText);
    if (typeof DOMPurify !== 'undefined') {
        htmlReply = DOMPurify.sanitize(htmlReply);
    }

    chatHistory.innerHTML = `
        <div class="chat-message ai" data-raw-text="${escapeHtml(greetingText)}" data-sender="Ahli AI">
            <div><strong><i class="fas fa-robot"></i> Ahli AI:</strong><br>${htmlReply}</div>
        </div>
    `;

    chatInput.value = '';
    openModal(aiChatModal);
    setTimeout(() => chatInput.focus(), 100);
}

async function sendChatMessage() {
    const userMessage = chatInput.value.trim();
    if (!userMessage) return;

    // 1. Display User Message
    const escapedUserMsg = escapeHtml(userMessage);
    const userMsgHtml = `
        <div class="chat-message user" data-raw-text="${escapedUserMsg}" data-sender="Anda">
            <div>${escapedUserMsg}</div>
        </div>
    `;
    chatHistory.insertAdjacentHTML('beforeend', userMsgHtml);
    chatInput.value = '';
    chatHistory.scrollTop = chatHistory.scrollHeight;

    // 2. Display Loading Indicator
    const loadingId = 'loading-' + Date.now();
    const loadingHtml = `
        <div id="${loadingId}" class="chat-message ai">
            <div><strong><i class="fas fa-robot fa-spin"></i> Ahli AI:</strong><br><em>Mengetik...</em></div>
        </div>
    `;
    chatHistory.insertAdjacentHTML('beforeend', loadingHtml);
    chatHistory.scrollTop = chatHistory.scrollHeight;

    // 3. Prepare AI request payload (adding new user msg)
    chatSessionHistory.push({
        role: "user",
        parts: [{ text: userMessage }]
    });

    const apiKey = apiKeys[0]; // Simple approach: use the first key
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: chatSessionHistory })
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message || 'API Error');
        }

        const aiReply = data.candidates[0].content.parts[0].text;

        // Save to history
        chatSessionHistory.push({
            role: "model",
            parts: [{ text: aiReply }]
        });

        // Parse markdown and render
        let htmlReply = (typeof marked !== 'undefined') ? marked.parse(aiReply) : escapeHtml(aiReply);
        if (typeof DOMPurify !== 'undefined') {
            htmlReply = DOMPurify.sanitize(htmlReply);
        }

        // 4. Update UI
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) {
            loadingEl.setAttribute('data-raw-text', escapeHtml(aiReply));
            loadingEl.setAttribute('data-sender', 'Ahli AI');
            loadingEl.innerHTML = `
                <div><strong><i class="fas fa-robot"></i> Ahli AI:</strong><br>${htmlReply}</div>
            `;
        }
    } catch (err) {
        console.error("Chat API Error:", err);
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) {
            loadingEl.innerHTML = `<div><span style="color: red;"><i class="fas fa-exclamation-triangle"></i> Maaf, terjadi kesalahan saat menghubungi AI. Silakan coba lagi nanti.</span></div>`;
            // Remove the failed user message from history to allow retry
            chatSessionHistory.pop();
        }
    }
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function updateWordElementRole(element, role) {
    if (!element) return;

    // Remove previous role classes
    element.classList.remove('role-subject', 'role-predicate', 'role-object', 'role-default');

    let tooltipText = "";

    switch(role) {
        case 'subject':
            element.classList.add('role-subject');
            tooltipText = "Subjek (Fa'il / Mubtada)";
            break;
        case 'predicate':
            element.classList.add('role-predicate');
            tooltipText = "Predikat (Fi'il / Khabar)";
            break;
        case 'object':
            element.classList.add('role-object');
            tooltipText = "Objek (Maf'ul bih)";
            break;
        default:
            element.classList.add('role-default');
    }

    if (tooltipText) {
        element.setAttribute('data-tooltip', tooltipText);
    }
}

// --- Theming ---
async function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', newTheme);
    try { await localforage.setItem('theme', newTheme); } catch(e) {}
    updateThemeIcon(newTheme);
}

async function loadTheme() {
    let savedTheme = 'light';
    try {
        const storedTheme = await localforage.getItem('theme');
        if (storedTheme) savedTheme = storedTheme;
    } catch(e) {}
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function updateThemeIcon(theme) {
    const icon = themeToggleBtn.querySelector('i');
    if (theme === 'dark') {
        icon.className = 'fas fa-sun';
    } else {
        icon.className = 'fas fa-moon';
    }
}

// --- Modals ---
function openModal(modal) {
    modal.classList.add('show');
}

function closeModal(modal) {
    modal.classList.remove('show');
}

// --- API Keys Management ---
async function loadApiKeys() {
    try {
        const storedKeys = await localforage.getItem('gemini_api_keys');
        if (storedKeys && Array.isArray(storedKeys)) {
            apiKeys = storedKeys;
        } else {
            apiKeys = [];
        }
    } catch(e) {
        console.error("Error loading API keys from localforage", e);
        apiKeys = [];
    }
    renderApiKeys();
}

async function saveApiKeys() {
    try {
        await localforage.setItem('gemini_api_keys', apiKeys);
    } catch(e) {
        console.error("Error saving API keys", e);
    }
}

function addApiKey(inputValue, inputElement) {
    const rawInput = inputValue.trim();
    if (!rawInput) return false;

    // Split input by comma to support multiple keys pasted at once
    const keysToAdd = rawInput.split(',').map(k => k.trim()).filter(k => k.length > 0);
    let addedCount = 0;
    let duplicateCount = 0;

    keysToAdd.forEach(key => {
        if (!apiKeys.includes(key)) {
            apiKeys.push(key);
            addedCount++;
        } else {
            duplicateCount++;
        }
    });

    if (addedCount > 0) {
        saveApiKeys();
        renderApiKeys();
        inputElement.value = '';
        if (duplicateCount > 0) {
            alert(`${addedCount} API Key berhasil ditambahkan. (${duplicateCount} key diabaikan karena sudah ada).`);
        } else {
            alert(`${addedCount} API Key berhasil ditambahkan!`);
        }
        return true;
    } else if (duplicateCount > 0) {
        alert("Semua API Key yang dimasukkan sudah ada!");
    }
    return false;
}

function removeApiKey(index) {
    apiKeys.splice(index, 1);
    saveApiKeys();
    renderApiKeys();
}

function renderApiKeys() {
    keysList.innerHTML = '';
    if (apiKeys.length === 0) {
        keysList.innerHTML = '<li>Belum ada API Key tersimpan. Masukkan setidaknya satu untuk fitur AI.</li>';
        return;
    }

    apiKeys.forEach((key, index) => {
        const li = document.createElement('li');
        // Mask the key for display
        const maskedKey = key.substring(0, 4) + '...' + key.substring(key.length - 4);
        li.innerHTML = `
            <span>${maskedKey}</span>
            <button onclick="removeApiKey(${index})" title="Hapus"><i class="fas fa-trash"></i></button>
        `;
        keysList.appendChild(li);
    });
}

// Expose functions to global scope for inline event handlers if needed
window.removeApiKey = removeApiKey;

// Initialize app
init();

function startNewChat() {
    if (!currentWordContext.wordText) return;

    // Reset session history to initial context only
    chatSessionHistory = [
        {
            role: "user",
            parts: [{ text: `Saya sedang membaca penjelasan detail mengenai sebuah kata dalam Al-Quran. Berikut adalah konteks penjelasannya:\n\n${currentDeepExplainText}\n\nTolong bersikap sebagai ahli tafsir dan bahasa Arab. Jawab pertanyaan saya selanjutnya hanya berdasarkan konteks ini jika relevan. Jika pertanyaan saya melenceng, Anda tetap bisa menjawabnya tapi kaitkan dengan ilmu Al-Quran.` }]
        },
        {
            role: "model",
            parts: [{ text: "Baik, saya mengerti konteksnya. Silakan ajukan pertanyaan Anda mengenai penjelasan tersebut, dan saya akan menjawabnya sebagai ahli tafsir dan bahasa Arab." }]
        }
    ];

    const greetingText = `Halo! Saya siap menjawab pertanyaan Anda seputar penjelasan detail kata **${currentWordContext.wordText}** yang baru saja Anda baca. Apa yang ingin Anda tanyakan?`;
    let htmlReply = (typeof marked !== 'undefined') ? marked.parse(greetingText) : escapeHtml(greetingText);
    if (typeof DOMPurify !== 'undefined') {
        htmlReply = DOMPurify.sanitize(htmlReply);
    }

    chatHistory.innerHTML = `
        <div class="chat-message ai" data-raw-text="${escapeHtml(greetingText)}" data-sender="Ahli AI">
            <div><strong><i class="fas fa-robot"></i> Ahli AI:</strong><br>${htmlReply}</div>
        </div>
    `;

    chatInput.value = '';
    setTimeout(() => chatInput.focus(), 100);
}

function handleChatAction(actionType) {
    // Compile all chat messages from chatHistory DOM
    const messages = chatHistory.querySelectorAll('.chat-message');
    if (messages.length === 0) return;

    let fullChatLog = `Riwayat Diskusi Ahli AI - Kata: ${currentWordContext.wordText || 'Tanya Jawab'}\n`;
    fullChatLog += `Tanggal: ${new Date().toLocaleString()}\n`;
    fullChatLog += `====================================================\n\n`;

    messages.forEach(msg => {
        const rawText = msg.getAttribute('data-raw-text') || '';
        const sender = msg.getAttribute('data-sender') || (msg.classList.contains('ai') ? 'Ahli AI' : 'Anda');
        const unescapedText = unescapeHtml(rawText);

        // Skip adding the initial hidden context prompt to the user view, only add actual visible texts
        if (unescapedText) {
            fullChatLog += `[${sender}]\n${unescapedText}\n\n`;
        }
    });

    if (actionType === 'copy') {
        navigator.clipboard.writeText(fullChatLog).then(() => {
            alert('Seluruh riwayat obrolan berhasil disalin!');
        }).catch(err => {
            console.error('Gagal menyalin riwayat chat:', err);
            alert('Gagal menyalin obrolan.');
        });
    } else if (actionType === 'download') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const fileName = `Riwayat_Chat_EQuran_${currentWordContext.wordText || 'AI'}_${timestamp}.txt`;
        const blob = new Blob([fullChatLog], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

function unescapeHtml(safe) {
    return safe
         .replace(/&amp;/g, "&")
         .replace(/&lt;/g, "<")
         .replace(/&gt;/g, ">")
         .replace(/&quot;/g, "\"")
         .replace(/&#039;/g, "'");
}
