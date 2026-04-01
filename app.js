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

    // Close Modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target === settingsModal) closeModal(settingsModal);
        if (e.target === aboutModal) closeModal(aboutModal);
        if (e.target === helpModal) closeModal(helpModal);
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
            if (document.getElementById('word-modal').classList.contains('show')) closeModal(document.getElementById('word-modal'));
        }
    });

    document.getElementById('close-word-modal').addEventListener('click', () => {
        closeModal(document.getElementById('word-modal'));
    });

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

    renderArabicWords(textAr, currentSurahData.number, ayahNumberInSurah);
}

function renderArabicWords(textAr, surahNum, ayahNum) {
    const container = document.getElementById('arabic-container');
    container.innerHTML = '';

    // Split text by space. Keep punctuation attached or separate based on needs.
    const words = textAr.split(/\s+/).filter(w => w.trim() !== "");

    words.forEach((wordText, index) => {
        const span = document.createElement('span');
        span.className = 'word role-default';
        span.textContent = wordText;
        span.dataset.surah = surahNum;
        span.dataset.ayah = ayahNum;
        span.dataset.wordIndex = index;

        span.addEventListener('click', () => handleWordClick(wordText, surahNum, ayahNum, index, span));

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
