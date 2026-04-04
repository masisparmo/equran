// State Variables
let currentSurah = null;
let currentAyah = null;
let apiKeys = [];
let currentApiKeyIndex = 0;
let groqApiKeys = [];
let currentGroqKeyIndex = 0;

// DOM Elements
const homeBtn = document.getElementById('home-btn');
const mushafBtn = document.getElementById('mushaf-btn');
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
const newGroqKeyInput = document.getElementById('new-groq-key');
const addGroqKeyBtn = document.getElementById('add-groq-key-btn');
const keysList = document.getElementById('keys-list');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const welcomeModal = document.getElementById('welcome-modal');
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

// Mushaf Elements
const mushafDisplay = document.getElementById('mushaf-display');
const mushafJuzInput = document.getElementById('mushaf-juz-input');
const mushafSurahSelect = document.getElementById('mushaf-surah-select');
const mushafSurahNumberInput = document.getElementById('mushaf-surah-number-input');
const mushafAyahInput = document.getElementById('mushaf-ayah-input');
const mushafPageInput = document.getElementById('mushaf-page-input');
const mushafContentContainer = document.getElementById('mushaf-content-container');
const prevMushafPageBtn = document.getElementById('prev-mushaf-page-btn');
const nextMushafPageBtn = document.getElementById('next-mushaf-page-btn');
const mushafPageInfo = document.getElementById('mushaf-page-info');
const mushafTranslationToggle = document.getElementById('mushaf-translation-toggle');

let currentMushafData = { ayahs: [], translations: [] }; // Store current page data
let currentWordContext = {}; // Store context for detail explanation
let currentDeepExplainText = ""; // Store plain markdown text for download/copy
let chatSessionHistory = []; // Store conversational context for the chat API

// --- API Variables ---
const quranApiBaseUrl = 'https://api.alquran.cloud/v1';
const gasBackendUrl = 'https://script.google.com/macros/s/AKfycbz6LH6bOoAYpzqtS91sn-g_ZHH-WJZvg_1eK4lBg4Vqvly9iTe8SPIxMSRQ-5Ox4vt6SA/exec';
const githubDataUrl = 'https://equran.isparmo.com/equran-data';
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
                let parsedKeys;
                try {
                    parsedKeys = JSON.parse(keys);
                } catch(e) {
                    // If not valid JSON, treat as a single key string
                    parsedKeys = [keys.trim()];
                }

                if (Array.isArray(parsedKeys) && parsedKeys.length > 0) {
                    await localforage.setItem('gemini_api_keys', parsedKeys);
                    localStorage.removeItem('gemini_api_keys');
                }
            } catch (e) {
                console.warn('Migration: Failed to migrate gemini keys', e);
            }
        }

        const groqKeys = localStorage.getItem('groq_api_keys');
        if (groqKeys) {
            try {
                let parsedGroqKeys;
                try {
                    parsedGroqKeys = JSON.parse(groqKeys);
                } catch(e) {
                    // If not valid JSON, treat as a single key string
                    parsedGroqKeys = [groqKeys.trim()];
                }

                if (Array.isArray(parsedGroqKeys) && parsedGroqKeys.length > 0) {
                    await localforage.setItem('groq_api_keys', parsedGroqKeys);
                    localStorage.removeItem('groq_api_keys');
                }
            } catch (e) {
                console.warn('Migration: Failed to migrate groq keys', e);
            }
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
    addGroqKeyBtn.addEventListener('click', () => addGroqApiKey(newGroqKeyInput.value, newGroqKeyInput));
    saveSettingsBtn.addEventListener('click', () => closeModal(settingsModal));

    // Settings Tabs Navigation
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
        });
    });

    // Welcome Modal
    const welcomeSetupBtn = document.getElementById('welcome-setup-btn');
    const welcomeSkipBtn = document.getElementById('close-welcome-btn');

    if (welcomeSkipBtn) {
        welcomeSkipBtn.addEventListener('click', () => {
            sessionStorage.setItem('welcome_dismissed', 'true');
            closeModal(welcomeModal);
        });
    }

    if (welcomeSetupBtn) {
        welcomeSetupBtn.addEventListener('click', () => {
            sessionStorage.setItem('welcome_dismissed', 'true');
            closeModal(welcomeModal);
            openModal(settingsModal);
        });
    }

    // Navigation Logic
    homeBtn.addEventListener('click', () => {
        closeModal(settingsModal);
        closeModal(document.getElementById('word-modal'));
        closeModal(welcomeModal);
        closeModal(aboutModal);
        closeModal(helpModal);
        switchMode('home');
    });

    mushafBtn.addEventListener('click', () => {
        switchMode('mushaf');
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
            const closestBtn = e.target.closest('.detail-btn');
            const type = closestBtn.getAttribute('data-type');
            // Hanya jalankan jika atribut data-type ada (untuk menghindari pemicuan dari tombol Ask AI Expert & Send Chat)
            if (type) {
                handleDeepExplain(type);
            }
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
    const surahSelect = document.getElementById('surah-select');
    const surahNumberInput = document.getElementById('surah-number-input');
    const ayahSelect = document.getElementById('ayah-select');
    const ayahNumberInput = document.getElementById('ayah-number-input');

    surahSelect.addEventListener('change', (e) => {
        surahNumberInput.value = e.target.value;
        handleSurahChange(e);
    });

    surahNumberInput.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val >= 1 && val <= 114) {
            surahSelect.value = val;
            handleSurahChange({ target: { value: val } });
        }
    });

    ayahSelect.addEventListener('change', (e) => {
        ayahNumberInput.value = e.target.value;
        handleAyahChange(e);
    });

    ayahNumberInput.addEventListener('change', (e) => {
        const val = e.target.value;
        const maxAyahs = currentSurahData ? currentSurahData.numberOfAyahs : 0;
        if (val >= 1 && (maxAyahs === 0 || val <= maxAyahs)) {
            ayahSelect.value = val;
            handleAyahChange({ target: { value: val } });
        }
    });

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

    // Download Audio Listeners
    document.getElementById('download-ayah-btn').addEventListener('click', downloadCurrentAyahAudio);
    document.getElementById('download-surah-btn').addEventListener('click', downloadCurrentSurahAudio);

    // Mushaf Listeners
    mushafJuzInput.addEventListener('change', (e) => loadMushafByJuz(e.target.value));
    mushafSurahSelect.addEventListener('change', (e) => {
        mushafSurahNumberInput.value = e.target.value;
        loadMushafBySurah(e.target.value);
    });
    mushafSurahNumberInput.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val >= 1 && val <= 114) {
            mushafSurahSelect.value = val;
            loadMushafBySurah(val);
        }
    });
    mushafAyahInput.addEventListener('change', (e) => loadMushafByAyah(mushafSurahSelect.value, e.target.value));
    mushafPageInput.addEventListener('change', (e) => fetchMushafPage(e.target.value));
    prevMushafPageBtn.addEventListener('click', () => changeMushafPage(-1));
    nextMushafPageBtn.addEventListener('click', () => changeMushafPage(1));
    mushafTranslationToggle.addEventListener('change', () => renderMushafPage());
}

// --- View Modes ---
function switchMode(mode) {
    const homeSection = document.querySelector('.navigation.card');
    const introSection = document.getElementById('intro-card');
    const quranDisplay = document.getElementById('quran-display');

    if (mode === 'home') {
        homeSection.style.display = 'flex';
        introSection.style.display = 'block';
        if (document.getElementById('surah-select').value) {
            quranDisplay.style.display = 'block';
        }
        mushafDisplay.style.display = 'none';
    } else if (mode === 'mushaf') {
        homeSection.style.display = 'none';
        introSection.style.display = 'none';
        quranDisplay.style.display = 'none';
        mushafDisplay.style.display = 'block';

        if (!mushafPageInput.value) {
            initMushafNav();
            fetchMushafPage(1); // Load default page 1
        }
    }
}

// --- Mushaf Navigation Logic ---
function initMushafNav() {
    // Populate Surah
    mushafSurahSelect.innerHTML = '<option value="">Memuat...</option>';
    if (surahsData.length > 0) {
        populateMushafSurahSelect();
    } else {
        // We will populate it once surahs are fetched
        fetchSurahs().then(() => populateMushafSurahSelect());
    }
}

function populateMushafSurahSelect() {
    mushafSurahSelect.innerHTML = '';
    surahsData.forEach(surah => {
        mushafSurahSelect.appendChild(new Option(`${surah.number}. ${surah.englishName}`, surah.number));
    });
    // Auto populate Ayah for Surah 1
    populateMushafAyahSelect(1);
}

function populateMushafAyahSelect(surahNumber) {
    const surah = surahsData.find(s => s.number == surahNumber);
    if (!surah) return;
    mushafAyahInput.max = surah.numberOfAyahs;
}

async function loadMushafByJuz(juz) {
    // We need to know which page a Juz starts on.
    // The easiest way is to hit the Juz API and get the first ayah's page.
    showLoading();
    try {
        const response = await fetch(`${quranApiBaseUrl}/juz/${juz}/en.asad`);
        const data = await response.json();
        const page = data.data.ayahs[0].page;
        mushafPageInput.value = page;
        fetchMushafPage(page);
    } catch(e) {
        console.error(e);
    } finally {
        hideLoading();
    }
}

async function loadMushafBySurah(surah) {
    populateMushafAyahSelect(surah);
    loadMushafByAyah(surah, 1);
}

async function loadMushafByAyah(surah, ayah) {
    // Get the page of this specific ayah
    showLoading();
    try {
        const response = await fetch(`${quranApiBaseUrl}/ayah/${surah}:${ayah}`);
        const data = await response.json();
        const page = data.data.page;
        mushafPageInput.value = page;

        mushafSurahSelect.value = surah;
        mushafSurahNumberInput.value = surah;
        populateMushafAyahSelect(surah);
        mushafAyahInput.value = ayah;

        fetchMushafPage(page);
    } catch(e) {
        console.error(e);
    } finally {
        hideLoading();
    }
}

function changeMushafPage(direction) {
    const currentPage = parseInt(mushafPageInput.value);
    const newPage = currentPage + direction;
    if(newPage >= 1 && newPage <= 604) {
        mushafPageInput.value = newPage;
        fetchMushafPage(newPage);
    }
}

async function fetchMushafPage(pageNumber) {
    showLoading();
    try {
        const [tajweedRes, translationRes] = await Promise.all([
            fetch(`${quranApiBaseUrl}/page/${pageNumber}/quran-uthmani`),
            fetch(`${quranApiBaseUrl}/page/${pageNumber}/id.indonesian`)
        ]);

        const tajweedData = await tajweedRes.json();
        const translationData = await translationRes.json();

        // Update info text
        mushafPageInfo.textContent = `Halaman ${pageNumber}`;

        // Save current page data for toggle re-rendering
        currentMushafData.ayahs = tajweedData.data.ayahs;
        currentMushafData.translations = translationData.data.ayahs;

        // Update input values to match current page's first ayah
        const firstAyah = tajweedData.data.ayahs[0];
        mushafJuzInput.value = firstAyah.juz;
        mushafPageInput.value = pageNumber;

        // Only update if not navigating by surah/ayah directly
        // We can check if the current surah selection is valid for this page
        // Page 604 contains Surah 112, 113, 114. We don't want to force it to 112 if user selected 114.
        const currentSelectedSurah = parseInt(mushafSurahNumberInput.value);
        let surahExistsOnPage = false;

        if (currentSelectedSurah && !isNaN(currentSelectedSurah)) {
            for (let i = 0; i < tajweedData.data.ayahs.length; i++) {
                if (tajweedData.data.ayahs[i].surah.number === currentSelectedSurah) {
                    surahExistsOnPage = true;
                    break;
                }
            }
        }

        if(mushafSurahSelect.options.length > 0) {
            if (!surahExistsOnPage) {
                mushafSurahSelect.value = firstAyah.surah.number;
                mushafSurahNumberInput.value = firstAyah.surah.number;
                populateMushafAyahSelect(firstAyah.surah.number);
                mushafAyahInput.value = firstAyah.numberInSurah;
            }
        }

        renderMushafPage();

        // Update buttons state
        prevMushafPageBtn.disabled = parseInt(pageNumber) === 1;
        nextMushafPageBtn.disabled = parseInt(pageNumber) === 604;
    } catch (error) {
        console.error("Error fetching mushaf page:", error);
        mushafContentContainer.innerHTML = '<p>Gagal memuat halaman Mushaf.</p>';
    } finally {
        hideLoading();
    }
}

function renderMushafPage() {
    mushafContentContainer.innerHTML = '';

    const showTranslation = mushafTranslationToggle.checked;

    // The format seems to be: [code[text] or [code:id[text]
    // Regex to match and extract tajweed codes and text
    const regex = /\[([a-z]+)(?::\d+)?\[([^\]]+)\]/g;

    let htmlContent = '';

    currentMushafData.ayahs.forEach((ayah, index) => {
        let text = ayah.text;

        // Convert western arabic numerals to eastern arabic numerals for the ayah number
        const ayahNumAr = ayah.numberInSurah.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);

        // Remove Hizb/Rub'u marker like in displayAyah
        text = text.replace(/۞/g, '').trim();

        // Handle Bismillah offset logic identically to Home mode
        let wordIndexOffset = 0;
        if (ayah.surah.number !== 1 && ayah.surah.number !== 9 && ayah.numberInSurah === 1) {
            // Check for various forms of Bismillah to ensure robust removal
            const bismillahForms = [
                "بِسۡمِ ٱللَّهِ ٱلرَّحۡمَـٰنِ ٱلرَّحِیمِ",
                "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ",
                "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ"
            ];

            let bismillahToRemove = "";
            for (const form of bismillahForms) {
                if (text.startsWith(form)) {
                    bismillahToRemove = form;
                    break;
                }
            }

            if (bismillahToRemove) {
                // Remove Bismillah from display text
                text = text.substring(bismillahToRemove.length).trim();
                // However, since the text in the db still includes Bismillah, we must offset the index
                // Oh wait! The backend expects index 0 for the first word AFTER bismillah.
                // So wordIndexOffset = 0 is correct, we just drop the first 4 words.
            } else if (text.startsWith("بِسْمِ")) {
                // Fallback, if there's a slight mismatch but starts with Bismillah, let's remove the first 4 words
                const bismWords = text.split(/\s+/).filter(w => w.trim() !== "");
                if (bismWords.length > 4) {
                    text = bismWords.slice(4).join(" ");
                }
            }
            wordIndexOffset = 0;
        }

        // Split text by space
        const words = text.split(/\s+/).filter(w => w.trim() !== "");

        // Create HTML for each word
        let wordsHtml = words.map((w, wIndex) => {
            let actualWordIndex = wIndex + wordIndexOffset;
            return `<span class="mushaf-word" data-surah="${ayah.surah.number}" data-ayah="${ayah.numberInSurah}" data-index="${actualWordIndex}">${w}</span>`;
        }).join(' ');

        if (showTranslation) {
            const transText = currentMushafData.translations[index].text;
            htmlContent += `
            <div class="mushaf-ayah-block">
                <span class="mushaf-ayah" style="display: inline-block; width: 100%; text-align: right;">
                    ${wordsHtml} <span class="mushaf-end-ayah-block">۝${ayahNumAr}</span>
                </span>
                <span class="mushaf-translation-text">${ayah.numberInSurah}. ${transText}</span>
            </div>`;
        } else {
            // Normal continuous rendering
            htmlContent += `<span class="mushaf-ayah">${wordsHtml} <span class="mushaf-end-ayah">۝${ayahNumAr}</span> </span>`;
        }
    });

    mushafContentContainer.innerHTML = htmlContent;

    // Attach event listeners to words
    document.querySelectorAll('.mushaf-word').forEach(span => {
        span.addEventListener('click', (e) => {
            const surahNum = parseInt(span.dataset.surah);
            const ayahNum = parseInt(span.dataset.ayah);
            const wordIndex = parseInt(span.dataset.index);
            // Reconstruct plain text to pass to handleWordClick
            const plainWord = span.textContent;
            handleWordClick(plainWord, surahNum, ayahNum, wordIndex, span);
        });
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
        // Fetch Arabic text (Using quran-uthmani to ensure consistent grammatical word spacing like Mushaf mode)
        const arResponse = await fetch(`${quranApiBaseUrl}/surah/${surahNumber}/quran-uthmani`);
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
    const ayahNumberInput = document.getElementById('ayah-number-input');
    ayahNumberInput.disabled = false;
    ayahNumberInput.max = totalAyahs;

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
    const ayahNumberInput = document.getElementById('ayah-number-input');
    const currentIndex = parseInt(ayahSelect.value);
    const totalAyahs = currentSurahData.ayahs.length;
    let newIndex = currentIndex + direction;

    if (newIndex >= 1 && newIndex <= totalAyahs) {
        ayahSelect.value = newIndex;
        ayahNumberInput.value = newIndex;
        displayAyah(newIndex);
    }
}

// --- Audio Download Logic ---

function downloadFile(url, filename) {
    // Biarkan browser yang mengambil alih proses membuka file
    // Cara ini kebal dari blokir CORS karena tidak melalui fetch di JavaScript
    window.open(url, '_blank');
}

// Helper to construct everyayah.com URL
function getEveryAyahUrl(surahNum, ayahNum) {
    const formattedSurah = surahNum.toString().padStart(3, '0');
    const formattedAyah = ayahNum.toString().padStart(3, '0');
    return `https://everyayah.com/data/Alafasy_128kbps/${formattedSurah}${formattedAyah}.mp3`;
}

async function downloadCurrentAyahAudio() {
    if (!currentSurahData || !currentAudioUrls) return;
    const surahSelect = document.getElementById('surah-select');
    const ayahSelect = document.getElementById('ayah-select');
    const surahNum = parseInt(surahSelect.value);
    const ayahNum = parseInt(ayahSelect.value);
    const surahName = currentSurahData.englishName.replace(/\s+/g, '_');
    const filename = `${surahName}_Ayat_${ayahNum}.mp3`;

    // Use everyayah.com which supports CORS, instead of cdn.islamic.network
    const audioUrl = getEveryAyahUrl(surahNum, ayahNum);

    // Tampilkan indikator loading di tombol
    const btn = document.getElementById('download-ayah-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    btn.disabled = true;

    try {
        downloadFile(audioUrl, filename);
    } catch (error) {
        console.error('Download failed:', error);
        alert('Gagal membuka tautan audio. Silakan coba lagi.');
    }

    // Kembalikan teks tombol
    btn.innerHTML = originalText;
    btn.disabled = false;
}

async function downloadCurrentSurahAudio() {
    if (!currentSurahData || !currentAudioUrls) return;

    const surahSelect = document.getElementById('surah-select');
    const surahNum = parseInt(surahSelect.value);
    const totalAyahs = currentAudioUrls.length;
    const surahName = currentSurahData.englishName.replace(/\s+/g, '_');

    const btn = document.getElementById('download-surah-btn');
    const originalText = btn.innerHTML;
    btn.disabled = true;

    if (confirm(`Anda akan mendownload ${totalAyahs} file audio ayat secara berurutan. Lanjutkan?`)) {
        for (let i = 0; i < totalAyahs; i++) {
            const ayahNum = i + 1;
            // Use everyayah.com which supports CORS
            const audioUrl = getEveryAyahUrl(surahNum, ayahNum);
            const filename = `${surahName}_Ayat_${ayahNum}.mp3`;

            btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${ayahNum}/${totalAyahs}`;

            try {
                downloadFile(audioUrl, filename);
                // Jeda agak lama antar tab baru agar popup blocker tidak agresif
                await new Promise(resolve => setTimeout(resolve, 800));
            } catch (error) {
                console.error(`Gagal membuka ayat ${ayahNum}:`, error);
                alert(`Membuka tab terhenti pada ayat ${ayahNum}. Proses dihentikan.`);
                break;
            }
        }
        // Hanya tampilkan alert sukses jika loop selesai tanpa break (berada di ayat terakhir)
        if (btn.innerHTML.includes(`${totalAyahs}/${totalAyahs}`)) {
            alert('Download surah selesai.');
        }
    }

    btn.innerHTML = originalText;
    btn.disabled = false;
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

    // Sembunyikan/hilangkan tanda Hizb/Rub'u (۞) agar tidak dihitung sebagai kata
    textAr = textAr.replace(/۞/g, '').trim();

    let wordIndexOffset = 0; // We now keep this as 0 per user instruction

    // Remove "Bismillah" from Surah other than Al-Fatihah (Surah 1) and At-Taubah (Surah 9) for Ayah 1
    if (currentSurahData.number !== 1 && currentSurahData.number !== 9 && ayahNumberInSurah === 1) {
            // Check for various forms of Bismillah to ensure robust removal across different editions
            const bismillahForms = [
                "بِسۡمِ ٱللَّهِ ٱلرَّحۡمَـٰنِ ٱلرَّحِیمِ", // Tajweed / standard
                "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ", // Simple
                "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ ۙ" // Uthmani might have pause marks
            ];

            let bismillahToRemove = "";
            for (const form of bismillahForms) {
                if (textAr.startsWith(form)) {
                    bismillahToRemove = form;
                    break;
                }
            }

            if (bismillahToRemove) {
                textAr = textAr.substring(bismillahToRemove.length).trim();
                wordIndexOffset = 0;
            } else if (textAr.startsWith("بِسْمِ") || textAr.startsWith("بِسۡمِ")) {
                // Fallback: If it starts with Bismillah but didn't match the exact string, remove first 4 words.
                const bismWords = textAr.split(/\s+/).filter(w => w.trim() !== "");
                if (bismWords.length > 4) {
                    textAr = bismWords.slice(4).join(" ");
                }
            wordIndexOffset = 0;
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

    // In Mushaf mode, currentSurahData might not be loaded if jumped directly.
    // However, we have currentMushafData which holds the ayahs and translations for the page.
    let fullAyahAr = "";
    let fullAyahId = "";
    let surahName = "Al-Qur'an";

    if (currentSurahData && currentSurahData.number === surahNum && currentAyahsIndo) {
        const ayahIndex = ayahNum - 1;
        fullAyahAr = currentSurahData.ayahs[ayahIndex].text;
        fullAyahId = currentAyahsIndo[ayahIndex].text;
        surahName = currentSurahData.englishName;
    } else if (currentMushafData && currentMushafData.ayahs) {
        const mushafAyahIndex = currentMushafData.ayahs.findIndex(a => a.surah.number === surahNum && a.numberInSurah === ayahNum);
        if (mushafAyahIndex !== -1) {
            fullAyahAr = currentMushafData.ayahs[mushafAyahIndex].text;
            // remove tajweed tags from fullAyahAr for clean passing to AI context
            fullAyahAr = fullAyahAr.replace(/\[[a-z]+(?::\d+)?\[([^\]]+)\]/g, '$1');
            fullAyahId = currentMushafData.translations[mushafAyahIndex].text;
            surahName = currentMushafData.ayahs[mushafAyahIndex].surah.englishName;
        }
    }

    // Store context for deep explanations
    currentWordContext = {
        wordText: wordText,
        surahNum: surahNum,
        ayahNum: ayahNum,
        wordIndex: wordIndex,
        fullAyahAr: fullAyahAr,
        fullAyahId: fullAyahId,
        surahName: surahName
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
    const ayahCacheKey = `quran_ayah_json_${surahNum}_${ayahNum}`;

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

    // 2. Check GitHub JSON (Static Content Delivery)
    // We try to fetch the whole ayah JSON because it contains all words
    try {
        let ayahData = await localforage.getItem(ayahCacheKey);

        if (!ayahData) {
            const githubUrl = `${githubDataUrl}/surah/${surahNum}/${ayahNum}.json`;
            const ghResponse = await fetch(githubUrl);
            if (ghResponse.ok) {
                ayahData = await ghResponse.json();
                // Cache the whole ayah for subsequent word clicks in the same ayah
                await localforage.setItem(ayahCacheKey, ayahData);
            }
        }

        if (ayahData && ayahData.words) {
            // Find the word by index. User uses 1-based index in their example,
            // but let's be flexible.
            const wordData = ayahData.words.find(w => w.index == wordIndex || w.index == (wordIndex + 1));
            if (wordData) {
                // Save this specific word to individual cache for consistency
                await localforage.setItem(cacheKey, wordData);
                displayWordDetails(wordData);
                updateWordElementRole(element, wordData.role);
                console.log("Data retrieved from GitHub Static CDN!");
                return;
            }
        }
    } catch (e) {
        console.warn("GitHub JSON not available or error:", e);
    }

    // Prepare to hit external sources
    const idKata = `s${surahNum}_a${ayahNum}_w${wordIndex}`;

    // 3. Check the Google Sheets Backend (Crowdsourced DB)
    try {
        // We use mode: 'cors' and bypass the pre-flight if possible,
        // GAS often handles GETs seamlessly but sometimes requires it.
        const response = await fetch(`${gasBackendUrl}?id=${idKata}`);
        if (response.ok) {
            const dbData = await response.json();
            if (dbData.status === 'success' && dbData.data) {
                let analysisData = dbData.data;

                // Ensure we have a valid object and it's not a generic failure string
                if (analysisData && (typeof analysisData === 'object' || (typeof analysisData === 'string' && analysisData.trim().startsWith('{')))) {
                    // If the data is returned as a string, parse it
                    if (typeof analysisData === 'string') {
                        try {
                            analysisData = JSON.parse(analysisData);
                        } catch (e) {
                            console.warn("Database returned non-JSON string for analysis", analysisData);
                            throw new Error("Invalid analysis data format");
                        }
                    }

                    // Save to local IndexedDB cache
                    try { await localforage.setItem(cacheKey, analysisData); } catch(e) {}

                    displayWordDetails(analysisData);
                    updateWordElementRole(element, analysisData.role);
                    console.log("Data retrieved from community database!");
                    return; // Stop here, no need to use API Key
                }
            }
        }
    } catch (e) {
        console.warn("Failed to contact database, falling back to API", e);
    }

    // 4. If missing from Local, GitHub, and DB, we MUST use Gemini API or Groq Fallback.
    // Ensure user has keys first.
    if (apiKeys.length === 0 && groqApiKeys.length === 0) {
        closeModal(document.getElementById('word-modal'));
        openModal(welcomeModal);
        return;
    }

    // Prepare full Ayah context for Gemini/Groq
    const ayahIndex = ayahNum - 1;
    const fullAyahAr = currentWordContext.fullAyahAr;
    const fullAyahId = currentWordContext.fullAyahId;

    const aiPrompt = generateAIPrompt(wordText, fullAyahAr, fullAyahId, currentWordContext.surahName, ayahNum);

    let success = false;
    let attempts = 0;
    const maxGeminiAttempts = apiKeys.length;

    // Try Gemini First
    while (!success && attempts < maxGeminiAttempts) {
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

            // 5. (Asynchronous) Save this new analysis to the Google Sheet Backend!
            saveToCommunityDatabase(surahNum, ayahNum, wordIndex, wordText, parsedResult);

        } catch (error) {
            console.error(`Error with API Key ${currentApiKeyIndex}:`, error);
            // Move to next key on failure
            currentApiKeyIndex = (currentApiKeyIndex + 1) % apiKeys.length;
            attempts++;
        }
    }

    // Fallback to Groq API
    let groqAttempts = 0;
    while (!success && groqAttempts < groqApiKeys.length) {
        const apiKey = groqApiKeys[currentGroqKeyIndex];
        try {
            const resultText = await callGroqAPI(apiKey, aiPrompt);
            const cleanedJsonText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsedResult = JSON.parse(cleanedJsonText);

            // Cache the result locally in IndexedDB
            try { await localforage.setItem(cacheKey, parsedResult); } catch(e) {}

            // Render it immediately for the user
            displayWordDetails(parsedResult);
            updateWordElementRole(element, parsedResult.role);

            success = true;

            // 5. (Asynchronous) Save this new analysis to the Google Sheet Backend!
            saveToCommunityDatabase(surahNum, ayahNum, wordIndex, wordText, parsedResult);
        } catch (error) {
            console.warn(`Groq API Key at index ${currentGroqKeyIndex} failed. Trying next...`);
            currentGroqKeyIndex = (currentGroqKeyIndex + 1) % groqApiKeys.length;
            groqAttempts++;
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
        surah: Number(surahNum),
        ayah: Number(ayahNum),
        wordIndex: Number(wordIndex),
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
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

async function callGroqAPI(apiKey, prompt) {
    const endpoint = `https://api.groq.com/openai/v1/chat/completions`;

    const requestBody = {
        model: "openai/gpt-oss-120b",
        messages: [{
            role: "user",
            content: prompt
        }],
        temperature: 0.1
    };

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
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
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}


async function callGroqAPIText(apiKey, prompt) {
    const endpoint = `https://api.groq.com/openai/v1/chat/completions`;

    const requestBody = {
        model: "openai/gpt-oss-120b",
        messages: [{
            role: "user",
            content: prompt
        }],
        temperature: 0.3
    };

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
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
      "kata_arab": "Tulisan Arab dari kata tersebut",
      "transliterasi": "Cara bacanya dalam huruf latin",
      "jenis_kata": "Isim (Kata Benda), Fi'il (Kata Kerja), atau Harf (Huruf)",
      "arti": "Arti dasar/harfiah dari kata tersebut",
      "sharaf": {
        "akar_kata": "Akar kata (root word) huruf Arab, misal: ك ت ب. Jika tidak ada isikan null",
        "makna_dasar": "Makna dasar dari akar kata tersebut",
        "wazan_perubahan": "Bagaimana perubahan bentuknya (wazan) dan apa makna dari perubahan tersebut. Jika tidak ada isikan null"
      },
      "nahwu": {
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

    // Support multiple JSON structures (AI Prompt structure, Static JSON structure, and legacy flat structure)
    const identitas = data.identitas_kata || data || {};
    const sharaf = data.analisis_sharaf || data.sharaf || {};
    const nahwu = data.analisis_nahwu || data.nahwu || {};

    // Section 1: Identitas Kata
    document.getElementById('modal-transliterasi').textContent = identitas.transliterasi || data.transliteration || '-';
    document.getElementById('modal-jenis-kata').textContent = identitas.jenis_kata || data.role || '-';
    document.getElementById('modal-arti-harfiah').textContent = identitas.arti_harfiah || data.arti || '-';

    // Section 2: Analisis Sharaf
    const akarKata = sharaf.akar_kata || data.akarKata;
    document.getElementById('modal-akar-kata').textContent = (akarKata && akarKata !== "null") ? akarKata : '-';
    document.getElementById('modal-makna-dasar').innerHTML = renderMarkdown(sharaf.makna_dasar || data.maknaDasar);

    const wazanEl = document.getElementById('modal-wazan-perubahan');
    const wazanVal = sharaf.wazan_perubahan || data.wazan;
    if (wazanVal && wazanVal !== "null" && wazanVal !== "-") {
        wazanEl.innerHTML = `<strong>Wazan & Perubahan:</strong> ${renderMarkdown(wazanVal)}`;
        wazanEl.style.display = 'block';
    } else {
        wazanEl.style.display = 'none';
    }

    // Section 3: Analisis Nahwu
    document.getElementById('modal-kedudukan').innerHTML = renderMarkdown(nahwu.kedudukan || data.kedudukan);
    const irabEl = document.getElementById('modal-irab-logika');
    const irabVal = nahwu.irab_dan_logika || data.irab;
    if (irabVal && irabVal !== "null" && irabVal !== "-") {
        irabEl.innerHTML = `<strong>Logika Tata Bahasa:</strong> ${renderMarkdown(irabVal)}`;
        irabEl.style.display = 'block';
    } else {
        irabEl.style.display = 'none';
    }

    // Kesimpulan
    const kesimpulanEl = document.getElementById('modal-kesimpulan-makna');
    const kesimpulanVal = data.kesimpulan_makna || data.kesimpulan || data.hikmah;
    if (kesimpulanVal && kesimpulanVal !== "null" && kesimpulanVal !== "-") {
        kesimpulanEl.innerHTML = renderMarkdown(kesimpulanVal);
    } else {
        kesimpulanEl.innerHTML = "-";
    }

    // Show narrative container
    document.getElementById('word-analysis-narrative').style.display = 'block';
}

async function handleDeepExplain(type) {
    if (apiKeys.length === 0 && groqApiKeys.length === 0) {
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

    // Try Gemini First
    if (apiKeys.length > 0) {
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
                console.error(`Error deep explain with Gemini API Key ${currentApiKeyIndex}:`, error);
                currentApiKeyIndex = (currentApiKeyIndex + 1) % apiKeys.length;
                attempts++;
            }
        }
    }

    // Fallback to Groq API
    if (!success && groqApiKeys.length > 0) {
        let groqAttempts = 0;
        const maxGroqAttempts = groqApiKeys.length;

        while (!success && groqAttempts < maxGroqAttempts) {
            const apiKey = groqApiKeys[currentGroqKeyIndex];
            try {
                const result = await callGroqAPIText(apiKey, prompt);

                // Cache the plain text result
                try { await localforage.setItem(cacheKey, result); } catch(e) {}

                renderDeepExplainContent(result);
                success = true;
            } catch (error) {
                console.warn(`Error deep explain with Groq API Key ${currentGroqKeyIndex}. Trying next...`, error);
                currentGroqKeyIndex = (currentGroqKeyIndex + 1) % groqApiKeys.length;
                groqAttempts++;
            }
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

    let success = false;
    let aiReply = "";

    // 3. Prepare AI request payload (adding new user msg)
    // Attempt Gemini first if keys exist
    if (apiKeys.length > 0) {
        let geminiAttempts = 0;
        const maxGeminiAttempts = apiKeys.length;

        // Save the original history state in case we need to fallback
        const originalHistoryLength = chatSessionHistory.length;

        chatSessionHistory.push({
            role: "user",
            parts: [{ text: userMessage }]
        });

        while (!success && geminiAttempts < maxGeminiAttempts) {
            const apiKey = apiKeys[currentApiKeyIndex];
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

                aiReply = data.candidates[0].content.parts[0].text;
                success = true;

                // Save to history
                chatSessionHistory.push({
                    role: "model",
                    parts: [{ text: aiReply }]
                });

            } catch (err) {
                console.warn(`Chat Gemini API Key at index ${currentApiKeyIndex} failed. Trying next...`, err);
                currentApiKeyIndex = (currentApiKeyIndex + 1) % maxGeminiAttempts;
                geminiAttempts++;
            }
        }

        // If Gemini failed completely, pop the user message so we can format for Groq
        if (!success) {
            chatSessionHistory.pop();
        }
    }

    // Fallback to Groq
    if (!success && groqApiKeys.length > 0) {
        // Groq uses a different chat history format {role, content}
        // Let's convert the gemini history to groq format just for this request
        const groqHistory = chatSessionHistory.map(msg => ({
            role: msg.role === 'model' ? 'assistant' : msg.role,
            content: msg.parts[0].text
        }));

        // Removed groqHistory.push since chatSessionHistory already contains the userMessage

        let groqAttempts = 0;
        const maxGroqAttempts = groqApiKeys.length;

        while (!success && groqAttempts < maxGroqAttempts) {
            const apiKey = groqApiKeys[currentGroqKeyIndex];
            const endpoint = `https://api.groq.com/openai/v1/chat/completions`;

            const requestBody = {
                model: "openai/gpt-oss-120b",
                messages: groqHistory,
                temperature: 0.3
            };

            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify(requestBody)
                });

                if (!response.ok) {
                    throw new Error(`Groq Chat API Error: ${response.status}`);
                }

                const data = await response.json();
                aiReply = data.choices[0].message.content;
                success = true;

                // Update the global Gemini-formatted history so subsequent calls still work
                chatSessionHistory.push({
                    role: "user",
                    parts: [{ text: userMessage }]
                });
                chatSessionHistory.push({
                    role: "model",
                    parts: [{ text: aiReply }]
                });

            } catch (err) {
                console.warn(`Chat Groq API Key at index ${currentGroqKeyIndex} failed. Trying next...`, err);
                currentGroqKeyIndex = (currentGroqKeyIndex + 1) % maxGroqAttempts;
                groqAttempts++;
            }
        }
    }

    if (success) {
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
    } else {
        console.error("Chat API Exhausted");
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) {
            loadingEl.innerHTML = `<div><span style="color: red;"><i class="fas fa-exclamation-triangle"></i> Maaf, semua API Key (Gemini & Groq) gagal atau mencapai limit. Silakan coba lagi nanti.</span></div>`;
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

        const storedGroqKeys = await localforage.getItem('groq_api_keys');
        if (storedGroqKeys && Array.isArray(storedGroqKeys)) {
            groqApiKeys = storedGroqKeys;
        } else {
            groqApiKeys = [];
        }
    } catch(e) {
        console.error("Error loading API keys from localforage", e);
        apiKeys = [];
        groqApiKeys = [];
    }
    renderApiKeys();
    renderGroqApiKeys();
}

async function saveApiKeys() {
    try {
        await localforage.setItem('gemini_api_keys', apiKeys);
    } catch(e) {
        console.error("Error saving API keys", e);
    }
}

async function saveGroqApiKeys() {
    try {
        await localforage.setItem('groq_api_keys', groqApiKeys);
    } catch(e) {
        console.error("Error saving Groq API keys", e);
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
            alert(`${addedCount} API Key Gemini berhasil ditambahkan. (${duplicateCount} key diabaikan karena sudah ada).`);
        } else {
            alert(`${addedCount} API Key Gemini berhasil ditambahkan!`);
        }
        return true;
    } else if (duplicateCount > 0) {
        alert("Semua API Key Gemini yang dimasukkan sudah ada!");
    }
    return false;
}

function addGroqApiKey(inputValue, inputElement) {
    const rawInput = inputValue.trim();
    if (!rawInput) return false;

    // Split input by comma to support multiple keys pasted at once
    const keysToAdd = rawInput.split(',').map(k => k.trim()).filter(k => k.length > 0);
    let addedCount = 0;
    let duplicateCount = 0;

    keysToAdd.forEach(key => {
        if (!groqApiKeys.includes(key)) {
            groqApiKeys.push(key);
            addedCount++;
        } else {
            duplicateCount++;
        }
    });

    if (addedCount > 0) {
        saveGroqApiKeys();
        renderGroqApiKeys();
        inputElement.value = '';
        if (duplicateCount > 0) {
            alert(`${addedCount} API Key Groq berhasil ditambahkan. (${duplicateCount} key diabaikan karena sudah ada).`);
        } else {
            alert(`${addedCount} API Key Groq berhasil ditambahkan!`);
        }
        return true;
    } else if (duplicateCount > 0) {
        alert("Semua API Key Groq yang dimasukkan sudah ada!");
    }
    return false;
}

function removeApiKey(index) {
    apiKeys.splice(index, 1);
    saveApiKeys();
    renderApiKeys();
}

function removeGroqApiKey(index) {
    groqApiKeys.splice(index, 1);
    saveGroqApiKeys();
    renderGroqApiKeys();
}

function renderApiKeys() {
    keysList.innerHTML = '';
    if (apiKeys.length === 0) {
        keysList.innerHTML = '<li>Belum ada API Key Gemini tersimpan.</li>';
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

function renderGroqApiKeys() {
    const groqList = document.getElementById('groq-keys-list');
    if (!groqList) return;
    groqList.innerHTML = '';
    if (groqApiKeys.length === 0) {
        groqList.innerHTML = '<li>Belum ada API Key Groq tersimpan.</li>';
        return;
    }

    groqApiKeys.forEach((key, index) => {
        const li = document.createElement('li');
        // Mask the key for display
        const maskedKey = key.substring(0, 4) + '...' + key.substring(key.length - 4);
        li.innerHTML = `
            <span>${maskedKey}</span>
            <button onclick="removeGroqApiKey(${index})" title="Hapus"><i class="fas fa-trash"></i></button>
        `;
        groqList.appendChild(li);
    });
}

// Expose functions to global scope for inline event handlers if needed
window.removeApiKey = removeApiKey;
window.removeGroqApiKey = removeGroqApiKey;

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

// --- Global Tooltip Logic ---
document.addEventListener('DOMContentLoaded', () => {
    const globalTooltip = document.getElementById('global-tooltip');

    document.body.addEventListener('mouseover', (e) => {
        const target = e.target.closest('[data-tooltip]');
        if (target) {
            const text = target.getAttribute('data-tooltip');
            if (text) {
                globalTooltip.textContent = text;
                const rect = target.getBoundingClientRect();

                // Position above the word (centered horizontally)
                let top = rect.top;
                let left = rect.left + (rect.width / 2);

                globalTooltip.style.top = top + 'px';
                globalTooltip.style.left = left + 'px';
                globalTooltip.classList.add('visible');
            }
        }
    });

    document.body.addEventListener('mouseout', (e) => {
        const target = e.target.closest('[data-tooltip]');
        if (target) {
            globalTooltip.classList.remove('visible');
        }
    });

    // Also hide tooltip on scroll to prevent floating orphans
    window.addEventListener('scroll', () => {
        if(globalTooltip) globalTooltip.classList.remove('visible');
    }, { passive: true });
});
