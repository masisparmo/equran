// State Variables
let currentSurah = null;
let currentAyah = null;
let apiKeys = [];
let currentApiKeyIndex = 0;

// DOM Elements
const themeToggleBtn = document.getElementById('theme-toggle');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsModalBtn = document.getElementById('close-settings-modal');
const newApiKeyInput = document.getElementById('new-api-key');
const addKeyBtn = document.getElementById('add-key-btn');
const keysList = document.getElementById('keys-list');
const saveSettingsBtn = document.getElementById('save-settings-btn');

// --- API Variables ---
const quranApiBaseUrl = 'https://api.alquran.cloud/v1';
let surahsData = [];
let currentSurahData = null; // Store fetched data for current surah
let currentAyahsIndo = null; // Store translations
let currentAudioUrls = null;

// Initialization
function init() {
    loadTheme();
    loadApiKeys();
    setupEventListeners();
    fetchSurahs();
}

// Event Listeners
function setupEventListeners() {
    // Theme
    themeToggleBtn.addEventListener('click', toggleTheme);

    // Settings Modal
    settingsBtn.addEventListener('click', () => openModal(settingsModal));
    closeSettingsModalBtn.addEventListener('click', () => closeModal(settingsModal));
    addKeyBtn.addEventListener('click', addApiKey);
    saveSettingsBtn.addEventListener('click', () => closeModal(settingsModal));

    // Close Modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target === settingsModal) closeModal(settingsModal);
        if (e.target === document.getElementById('word-modal')) closeModal(document.getElementById('word-modal'));
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
    if (apiKeys.length === 0) {
        alert("Silakan masukkan Gemini API Key di Pengaturan untuk melihat analisis kata.");
        openModal(settingsModal);
        return;
    }

    // Prepare modal UI
    const wordModal = document.getElementById('word-modal');
    document.getElementById('modal-arabic-word').textContent = wordText;

    // Reset modal content
    const fields = ['modal-meaning', 'modal-indonesian-equivalent', 'modal-root', 'modal-base-form', 'modal-type', 'modal-nahwu', 'modal-irab', 'modal-sharaf', 'modal-explanation'];
    fields.forEach(id => document.getElementById(id).textContent = '-');
    document.getElementById('ai-error').style.display = 'none';
    document.getElementById('ai-loading').style.display = 'block';
    document.getElementById('word-details-content').querySelector('.detail-grid').style.display = 'none';
    document.getElementById('word-details-content').querySelectorAll('.detail-section').forEach(el => el.style.display = 'none');

    openModal(wordModal);

    analyzeWordWithAI(wordText, surahNum, ayahNum, wordIndex, element);
}

// --- AI Logic & Caching ---
async function analyzeWordWithAI(wordText, surahNum, ayahNum, wordIndex, element) {
    const cacheKey = `quran_ai_${surahNum}_${ayahNum}_${wordIndex}`;
    const cachedData = localStorage.getItem(cacheKey);

    if (cachedData) {
        try {
            const parsedData = JSON.parse(cachedData);
            displayWordDetails(parsedData);
            updateWordElementRole(element, parsedData.role);
            return;
        } catch (e) {
            console.error("Cache parsing error", e);
        }
    }

    // Prepare full Ayah context
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

            // Cache the result
            localStorage.setItem(cacheKey, JSON.stringify(parsedResult));

            displayWordDetails(parsedResult);
            updateWordElementRole(element, parsedResult.role);
            success = true;
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
    Anda adalah seorang ahli tafsir Al-Qur'an, tata bahasa Arab (Nahwu dan Sharaf), dan linguistik.
    Saya memberikan sebuah kata bahasa Arab dari Al-Qur'an.
    Tugas Anda adalah menganalisis kata ini secara mendalam dalam bahasa Indonesia, berdasarkan konteks ayatnya.

    Kata: "${word}"
    Surat: ${surahName}
    Ayat ke: ${ayahNum}
    Konteks Ayat (Arab): "${ayahAr}"
    Konteks Terjemahan (Indo): "${ayahId}"

    Berikan hasil analisis Anda DALAM BENTUK JSON SAJA dengan skema berikut:
    {
      "meaning": "Arti kata tersebut (singkat)",
      "indonesian_equivalent": "Padanan kelas kata dalam bahasa Indonesia (contoh: 'Kata Kerja', 'Kata Benda', 'Kata Keterangan', dll)",
      "root": "Akar kata (3 atau 4 huruf, gunakan bahasa arab, misal: ع و ن). Jika tidak ada (misal huruf jar), isikan null",
      "base_form": "Bentuk dasar dari kata tersebut (misal: اِسْتَعَانَ). Jika tidak ada isikan null",
      "type": "Jenis kata dalam bahasa Arab (contoh: 'Fi\\'il Mudhari\\'', 'Isim Fa\\'il', 'Huruf Jar', dll)",
      "nahwu": "Kedudukan kata dalam kalimat (contoh: 'Mubtada', 'Khabar', 'Fa\\'il', 'Maf\\'ul bih', dll)",
      "irab": "Status I'rab (contoh: 'Marfu\\' dengan Dhammah', 'Manshub', 'Majrur', dll)",
      "sharaf": "Pola (Wazan) kata tersebut (contoh: 'استفعل', 'فعل'). Jika tidak ada isikan null",
      "explanation": "Penjelasan singkat (1-2 kalimat) yang mudah dipahami orang awam tentang kenapa kata tersebut berbentuk seperti itu atau memiliki kedudukan tersebut.",
      "role": "Pilih salah satu nilai: 'subject' (jika berfungsi sebagai subjek/fa'il/mubtada), 'predicate' (jika berfungsi sebagai predikat/fi'il/khabar), 'object' (jika berfungsi sebagai objek/maf'ul bih), ATAU 'none' (jika selain ketiganya)"
    }

    Pastikan JSON valid dan sesuai skema di atas tanpa awalan markdown \`\`\`json.
    `;
}

function displayWordDetails(data) {
    document.getElementById('ai-loading').style.display = 'none';

    // Fill the data
    document.getElementById('modal-meaning').textContent = data.meaning || '-';
    document.getElementById('modal-indonesian-equivalent').textContent = data.indonesian_equivalent || '-';
    document.getElementById('modal-root').textContent = data.root || '-';
    document.getElementById('modal-base-form').textContent = data.base_form || '-';
    document.getElementById('modal-type').textContent = data.type || '-';
    document.getElementById('modal-nahwu').textContent = data.nahwu || '-';
    document.getElementById('modal-irab').textContent = data.irab || '-';
    document.getElementById('modal-sharaf').textContent = data.sharaf || '-';
    document.getElementById('modal-explanation').textContent = data.explanation || '-';

    // Show sections
    document.getElementById('word-details-content').querySelector('.detail-grid').style.display = 'grid';
    document.getElementById('word-details-content').querySelectorAll('.detail-section').forEach(el => el.style.display = 'block');
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
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
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
function loadApiKeys() {
    const storedKeys = localStorage.getItem('gemini_api_keys');
    if (storedKeys) {
        try {
            apiKeys = JSON.parse(storedKeys);
            renderApiKeys();
        } catch (e) {
            console.error("Error parsing API keys from local storage", e);
            apiKeys = [];
        }
    }
}

function saveApiKeys() {
    localStorage.setItem('gemini_api_keys', JSON.stringify(apiKeys));
}

function addApiKey() {
    const key = newApiKeyInput.value.trim();
    if (key && !apiKeys.includes(key)) {
        apiKeys.push(key);
        saveApiKeys();
        renderApiKeys();
        newApiKeyInput.value = '';
    } else if (apiKeys.includes(key)) {
        alert("API Key sudah ada!");
    }
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
