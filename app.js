// State Variables
let currentMode = 'home'; // Tracking active mode (home/mushaf)
let currentSurah = null;
let currentAyah = null;
let apiKeys = [];
let currentApiKeyIndex = 0;
let groqApiKeys = [];
let currentGroqKeyIndex = 0;
let currentTafsirSource = 'ibnukatsir';

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

// Global Chat Elements
const globalChatFloatBtn = document.getElementById('global-chat-float-btn');
const globalAiChatModal = document.getElementById('global-ai-chat-modal');
const closeGlobalAiChatModalBtn = document.getElementById('close-global-ai-chat-modal');
const globalChatHistory = document.getElementById('global-chat-history');
const globalChatInput = document.getElementById('global-chat-input');
const sendGlobalChatBtn = document.getElementById('send-global-chat-btn');
const newGlobalChatBtn = document.getElementById('new-global-chat-btn');
const fullscreenGlobalChatBtn = document.getElementById('fullscreen-global-chat-btn');
const fullscreenChatBtn = document.getElementById('fullscreen-chat-btn');
const copyGlobalChatBtn = document.getElementById('copy-global-chat-btn');
const downloadGlobalChatBtn = document.getElementById('download-global-chat-btn');

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

// Tafsir Elements
const tafsirModal = document.getElementById('tafsir-modal');
const closeTafsirModalBtn = document.getElementById('close-tafsir-modal');
const tafsirTitleInfo = document.getElementById('tafsir-title-info');
const tafsirContent = document.getElementById('tafsir-content');
const tafsirLoading = document.getElementById('tafsir-loading');
const tafsirBtn = document.getElementById('tafsir-btn');

let currentMushafData = { ayahs: [], translations: [], page: null }; // Store current page data
let currentWordContext = {}; // Store context for detail explanation
let currentDeepExplainText = ""; // Store plain markdown text for download/copy
let chatSessionHistory = []; // Store conversational context for the chat API
let globalChatSessionHistory = []; // Store conversational context for global chat
let currentTafsirSurahData = null; // Cache for current surah tafsir
let currentTafsirSurahSource = null; // Cache source tracking

// --- API Variables ---
const quranApiBaseUrl = 'https://api.alquran.cloud/v1';
const gasBackendUrl = 'https://script.google.com/macros/s/AKfycbz6LH6bOoAYpzqtS91sn-g_ZHH-WJZvg_1eK4lBg4Vqvly9iTe8SPIxMSRQ-5Ox4vt6SA/exec';
const githubDataUrl = './equran-data';
let surahsData = [];
let currentSurahData = null; // Store fetched data for current surah
let currentAyahsIndo = null; // Store translations
let currentAudioUrls = null;
let asbabunNuzulIndex = null; // Store verses that have Asbabun Nuzul
let userBookmarks = []; // Store user saved verses


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

let fullQuranDataCache = null;

// Initialization
async function init() {
    await migrateLocalStorageToIndexedDB();
    await loadTheme();
    await loadApiKeys();
    setupEventListeners();
    initTafsirSelector();
    fetchSurahs();
    loadApiKeys();
    initQuranSearchData();
    await loadAsbabunNuzulIndex();
    await loadBookmarks();



    // Check if we need to show welcome modal on first load
    if (apiKeys.length === 0 && !sessionStorage.getItem('welcome_dismissed')) {
        openModal(welcomeModal);
    }

    // Auto-collapse intro card on mobile
    if (window.innerWidth <= 768 && introCard) {
        introCard.classList.add('is-collapsed');
    }

    initGlobalChat();
}

// Event Listeners
function setupEventListeners() {
    // Theme
    themeToggleBtn.addEventListener('click', toggleTheme);

    // Settings Modal
    settingsBtn.addEventListener('click', () => openModal(settingsModal));
    closeSettingsModalBtn.addEventListener('click', () => { console.log('Closing Settings Modal'); closeModal(settingsModal); });

    // Initialize search keyboard listeners
    initKeyboardListeners();
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
            console.log('Closing Welcome Modal');
            closeModal(welcomeModal);
        });
    }

    if (welcomeSetupBtn) {
        welcomeSetupBtn.addEventListener('click', () => {
            sessionStorage.setItem('welcome_dismissed', 'true');
            console.log('Closing Welcome Modal');
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

    const quizNavBtn = document.getElementById('quiz-nav-btn');
    if (quizNavBtn) {
        quizNavBtn.addEventListener('click', () => {
            switchMode('quiz');
        });
    }

    closeAboutModalBtn.addEventListener('click', () => { console.log('Closing About Modal'); closeModal(aboutModal); });

    helpBtn.addEventListener('click', () => {
        openModal(helpModal);
    });

    closeHelpModalBtn.addEventListener('click', () => { console.log('Closing Help Modal'); closeModal(helpModal); });

    // Deep Detail Modal
    if (closeDeepDetailModalBtn) {
        closeDeepDetailModalBtn.addEventListener('click', () => {
            console.log('Closing Deep Detail Modal');
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
            console.log('Closing AI Chat Modal');
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

    if (fullscreenChatBtn) {
        fullscreenChatBtn.addEventListener('click', () => {
            const modalContent = aiChatModal.querySelector('.modal-content');
            modalContent.classList.toggle('fullscreen');
            const icon = fullscreenChatBtn.querySelector('i');
            if (modalContent.classList.contains('fullscreen')) {
                icon.classList.remove('fa-expand');
                icon.classList.add('fa-compress');
            } else {
                icon.classList.remove('fa-compress');
                icon.classList.add('fa-expand');
            }
        });
    }

    if (newChatBtn) {
        newChatBtn.addEventListener('click', startNewChat);
    }


    // Detail Buttons inside Word Modal
    document.querySelectorAll('.detail-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const closestBtn = e.target.closest('.detail-btn');
            const type = closestBtn.getAttribute('data-type');
            if (type) {
                handleDeepExplain(type);
            }
        });
    });

    // Global Click Handler (Backdrop & Centralized Delegation)
    window.addEventListener('click', (e) => {
        // 1. Close Modals on outside click (Backdrop)
        const activeModal = document.querySelector('.modal.show');
        if (activeModal && e.target === activeModal) {
            console.log(`Backdrop click: Closing ${activeModal.id}`);
            if (activeModal.id === 'welcome-modal') {
                sessionStorage.setItem('welcome_dismissed', 'true');
            }
            closeModal(activeModal);
        }

        // 2. Handle Mushaf/Home Dynamic Content (Tafsir & Word Click)
        const tafsirTarget = e.target.closest('.mushaf-tafsir-btn, .mushaf-end-ayah-block, .mushaf-end-ayah, .mushaf-asbab-icon, .asbab-badge-home');
        if (tafsirTarget) {
            e.preventDefault();
            const surahNum = parseInt(tafsirTarget.dataset.surah);
            const ayahNum = parseInt(tafsirTarget.dataset.ayah);
            if (!isNaN(surahNum) && !isNaN(ayahNum)) {
                // If clicking asbab icon, force source to 'alazhar' (Jalalain & Asbabun Nuzul)
                if (tafsirTarget.classList.contains('mushaf-asbab-icon') || tafsirTarget.classList.contains('asbab-badge-home')) {
                    currentTafsirSource = 'alazhar';
                    const selector = document.getElementById('tafsir-source-select');
                    if (selector) selector.value = 'alazhar';
                }
                openTafsirModal(surahNum, ayahNum);
            }
            return;
        }

        const wordTarget = e.target.closest('.mushaf-word');
        if (wordTarget) {
            const surahNum = parseInt(wordTarget.dataset.surah);
            const ayahNum = parseInt(wordTarget.dataset.ayah);
            const wordIndex = parseInt(wordTarget.dataset.index);
            const plainWord = wordTarget.textContent;
            handleWordClick(plainWord, surahNum, ayahNum, wordIndex, wordTarget);
        }

        // 3. Handle Bookmark Toggles
        const bookmarkToggle = e.target.closest('.mushaf-bookmark-icon');
        if (bookmarkToggle) {
            e.preventDefault();
            const surah = parseInt(bookmarkToggle.dataset.surah);
            const ayah = parseInt(bookmarkToggle.dataset.ayah);
            const page = parseInt(bookmarkToggle.dataset.page);
            const surahName = bookmarkToggle.dataset.surahName;
            toggleBookmark(surah, ayah, page, surahName);
        }
    });

    const bookmarkHistoryBtn = document.getElementById('bookmark-history-btn');
    const bookmarkModal = document.getElementById('bookmark-modal');
    const closeBookmarkModalBtn = document.getElementById('close-bookmark-modal');

    if (bookmarkHistoryBtn) {
        bookmarkHistoryBtn.addEventListener('click', () => {
            renderBookmarkHistory();
            openModal(bookmarkModal);
        });
    }

    if (closeBookmarkModalBtn) {
        closeBookmarkModalBtn.addEventListener('click', () => closeModal(bookmarkModal));
    }

    // Close Modals with Escape key
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const activeModal = document.querySelector('.modal.show');
            if (activeModal) {
                console.log(`ESC: Closing ${activeModal.id}`);
                if (activeModal.id === 'welcome-modal') {
                    sessionStorage.setItem('welcome_dismissed', 'true');
                }
                closeModal(activeModal);
            }
        }
    });

    document.getElementById('close-word-modal').addEventListener('click', () => {
        console.log('Closing Word Modal');
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

    // Tafsir Listener (Home)
    if (tafsirBtn) {
        tafsirBtn.addEventListener('click', () => {
            if (!currentSurahData) return;
            const ayahSelect = document.getElementById('ayah-select');
            const surahNum = currentSurahData.number;
            const ayahNum = parseInt(ayahSelect.value);
            openTafsirModal(surahNum, ayahNum);
        });
    }

    if (closeTafsirModalBtn) {
        closeTafsirModalBtn.addEventListener('click', (e) => {
            console.log("Close button (x) click: Closing Tafsir Modal");
            e.stopPropagation(); // Mencegah pemicu backdrop
            closeModal(tafsirModal || document.getElementById('tafsir-modal'));
        });
    }

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
    const homeSearchSection = document.getElementById('home-search-section');
    const quizSection = document.getElementById('quiz-section');
    const aboutSection = document.getElementById('about-section');

    if (mode === 'home') {
        homeSection.style.display = 'flex';
        introSection.style.display = 'block';
        homeSearchSection.style.display = 'block';
        if (document.getElementById('surah-select').value) {
            quranDisplay.style.display = 'block';
        }
        mushafDisplay.style.display = 'none';
        if (quizSection) quizSection.style.display = 'none';
        if (aboutSection) aboutSection.style.display = 'none';
    } else if (mode === 'mushaf') {
        homeSection.style.display = 'none';
        introSection.style.display = 'none';
        quranDisplay.style.display = 'none';
        homeSearchSection.style.display = 'none';
        mushafDisplay.style.display = 'block';
        if (quizSection) quizSection.style.display = 'none';
        if (aboutSection) aboutSection.style.display = 'none';

        if (!mushafPageInput.value) {
            initMushafNav();
            fetchMushafPage(1); // Load default page 1
        }
    } else if (mode === 'quiz') {
        homeSection.style.display = 'none';
        introSection.style.display = 'none';
        homeSearchSection.style.display = 'none';
        quranDisplay.style.display = 'none';
        mushafDisplay.style.display = 'none';
        if (aboutSection) aboutSection.style.display = 'none';

        if (quizSection) {
            quizSection.style.display = 'block';
            if (typeof initQuiz === 'function') {
                initQuiz();
            }
        }
    } else if (mode === 'about') {
        homeSection.style.display = 'none';
        introSection.style.display = 'none';
        homeSearchSection.style.display = 'none';
        quranDisplay.style.display = 'none';
        mushafDisplay.style.display = 'none';
        if (quizSection) quizSection.style.display = 'none';

        if (aboutSection) {
            aboutSection.style.display = 'block';
        }
    }
}

// --- Modal Logic ---
function openModal(modal) {
    if (!modal) return;
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
}

function closeModal(modal) {
    if (!modal) return;
    console.log(`Closing modal: ${modal.id || 'unknown'}`);
    modal.classList.remove('show');
    // Bersihkan gaya inline agar kembali ke default CSS (display: none)
    modal.style.display = '';
    
    // Tambahan keamanan: pastikan aria-hidden jika digunakan (opsional tapi baik untuk aksesibilitas)
    modal.setAttribute('aria-hidden', 'true');
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
            <div class="msg-actions">
                <button class="msg-action-btn copy-msg-btn" title="Copy Pesan Ini"><i class="fas fa-copy"></i></button>
                <button class="msg-action-btn download-msg-btn" title="Download Pesan Ini"><i class="fas fa-download"></i></button>
            </div>
        </div>
    `;

    const initialAiMsg = chatHistory.querySelector('.chat-message.ai');
    if (initialAiMsg) attachMsgActionListeners(initialAiMsg);

    chatInput.value = '';
    setTimeout(() => chatInput.focus(), 100);
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

// --- Tafsir Feature ---
async function fetchTafsir(surahNumber, source = 'ibnukatsir') {
    const subFolder = source === 'alazhar' ? 'json/' : '';
    const localTafsirPath = `equran-data/tafsir/${source}/${subFolder}Alquran_${surahNumber}.json`;
    const tafsirBaseUrlGitHub = 'https://raw.githubusercontent.com/renpwn/alquran.js/v2/json';
    
    // 1. Check internal session cache first (fastest)
    if (currentTafsirSurahData && currentTafsirSurahData.number == surahNumber && currentTafsirSurahSource === source) {
        return currentTafsirSurahData;
    }

    // 2. Check local folder
    try {
        const localResponse = await fetch(localTafsirPath);
        if (localResponse.ok) {
            const localData = await localResponse.json();
            console.log(`Tafsir Surah ${surahNumber} (${source}) dimuat dari FOLDER LOKAL.`);
            currentTafsirSurahData = localData;
            currentTafsirSurahSource = source;
            return localData;
        }
    } catch (localErr) {
        console.warn(`Local fetch failed for surah ${surahNumber} (${source}), falling back to cache.`, localErr);
    }

    // Untuk Ibnu Katsir, kita punya fallback ke GitHub
    if (source === 'ibnukatsir') {
        const storeKey = `tafsir_surah_ibnukatsir_${surahNumber}`;
        try {
            const storedData = await localforage.getItem(storeKey);
            if (storedData) {
                console.log(`Tafsir Surah ${surahNumber} dimuat dari IndexedDB cache.`);
                currentTafsirSurahData = storedData;
                currentTafsirSurahSource = source;
                return storedData;
            }
        } catch (e) {
            console.warn("LocalForage: Gagal membaca tafsir dari storage permanen", e);
        }

        // 4. Final fallback: Fetch from GitHub
        const url = `${tafsirBaseUrlGitHub}/Alquran_${surahNumber}.json`;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error("Gagal mengunduh tafsir dari repositori GitHub");
            const data = await response.json();
            
            // Save to permanent storage for offline use
            try {
                await localforage.setItem(storeKey, data);
                console.log(`Tafsir Surah ${surahNumber} disimpan ke IndexedDB cache.`);
            } catch(storageErr) {
                console.warn("Gagal menyimpan tafsir ke storage permanen:", storageErr);
            }
            
            currentTafsirSurahData = data;
            currentTafsirSurahSource = source;
            return data;
        } catch (error) {
            console.error("fetchTafsir Error:", error);
            throw error;
        }
    } else {
        // Source lain (seperti Al-Azhar) saat ini hanya tersedia lokal
        throw new Error(`Data tafsir source '${source}' tidak ditemukan secara lokal.`);
    }
}

let activeTafsirSurah = null;
let activeTafsirAyah = null;

function initTafsirSelector() {
    const selector = document.getElementById('tafsir-source-select');
    if (selector) {
        selector.addEventListener('change', (e) => {
            currentTafsirSource = e.target.value;
            if (activeTafsirSurah && activeTafsirAyah) {
                openTafsirModal(activeTafsirSurah, activeTafsirAyah);
            }
        });
    }
}

// --- Global Chat Feature ---
async function initGlobalChat() {
    // Load history from IndexedDB
    try {
        const savedHistory = await localforage.getItem('globalChatHistory');
        if (savedHistory && savedHistory.length > 0) {
            globalChatSessionHistory = savedHistory;
            renderGlobalChatHistory();
        } else {
            // Initialize with system prompt
            globalChatSessionHistory = [{
                role: "system",
                content: "Anda adalah Ahli Al-Quran, Tafsir, dan Guru Bahasa Arab yang sangat berpengalaman. Berikan penjelasan yang ditujukan untuk orang awam sehingga harus menggunakan bahasa Indonesia yang mudah dipahami tapi tetap detail dan akurat. Jika jawaban Anda mengacu atau mengutip pada ayat Al-Quran, Anda WAJIB MENGGUNAKAN FORMAT [NomorSurah:NomorAyat] (sebagai contoh: [2:15] atau [114:5]). Jangan gunakan spasi di dalam kurung siku."
            }];
        }
    } catch (e) {
        console.error("Failed to load global chat history", e);
    }

    if (globalChatFloatBtn) {
        globalChatFloatBtn.addEventListener('click', () => {
            openModal(globalAiChatModal);
            globalChatHistory.scrollTop = globalChatHistory.scrollHeight;
            if (globalChatSessionHistory.length <= 1) {
                // If only system prompt exists, add a greeting
                addGlobalAiMessage("Assalamu'alaikum! Saya adalah Ahli AI Al-Quran. Silakan tanyakan apa saja seputar Al-Quran, Tafsir, atau Bahasa Arab.");
            }
        });
    }

    if (closeGlobalAiChatModalBtn) {
        closeGlobalAiChatModalBtn.addEventListener('click', () => closeModal(globalAiChatModal));
    }

    if (sendGlobalChatBtn && globalChatInput) {
        sendGlobalChatBtn.addEventListener('click', sendGlobalChatMessage);
        globalChatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendGlobalChatMessage();
        });
    }

    if (fullscreenGlobalChatBtn) {
        fullscreenGlobalChatBtn.addEventListener('click', () => {
            const modalContent = globalAiChatModal.querySelector('.modal-content');
            modalContent.classList.toggle('fullscreen');
            const icon = fullscreenGlobalChatBtn.querySelector('i');
            if (modalContent.classList.contains('fullscreen')) {
                icon.classList.remove('fa-expand');
                icon.classList.add('fa-compress');
            } else {
                icon.classList.remove('fa-compress');
                icon.classList.add('fa-expand');
            }
        });
    }

    if (newGlobalChatBtn) {
        newGlobalChatBtn.addEventListener('click', async () => {
            if (confirm('Yakin ingin memulai obrolan baru? Riwayat obrolan ini akan dihapus permanen.')) {
                globalChatHistory.innerHTML = '';
                globalChatSessionHistory = [{
                    role: "system",
                    content: "Anda adalah Ahli Al-Quran, Tafsir, dan Guru Bahasa Arab yang sangat berpengalaman. Berikan penjelasan yang ditujukan untuk orang awam sehingga harus menggunakan bahasa Indonesia yang mudah dipahami tapi tetap detail dan akurat. Jika jawaban Anda mengacu atau mengutip pada ayat Al-Quran, Anda WAJIB MENGGUNAKAN FORMAT [NomorSurah:NomorAyat] (sebagai contoh: [2:15] atau [114:5]). Jangan gunakan spasi di dalam kurung siku."
                }];
                await localforage.setItem('globalChatHistory', globalChatSessionHistory);
                addGlobalAiMessage("Assalamu'alaikum! Obrolan baru telah dimulai. Apa yang ingin Anda tanyakan?");
            }
        });
    }
}

function renderGlobalChatHistory() {
    globalChatHistory.innerHTML = '';
    globalChatSessionHistory.forEach(msg => {
        if (msg.role === 'user') {
            const escapedUserMsg = escapeHtml(msg.content);
            const html = `
                <div class="chat-message user" data-raw-text="${escapedUserMsg}" data-sender="Anda">
                    <div>${escapedUserMsg}</div>
                </div>
            `;
            globalChatHistory.insertAdjacentHTML('beforeend', html);
        } else if (msg.role === 'assistant') {
            const parsedHtml = DOMPurify.sanitize(marked.parse(msg.content));
            const html = `
                <div class="chat-message ai" data-raw-text="${escapeHtml(msg.content)}" data-sender="Ahli AI">
                    <div><strong><i class="fas fa-robot"></i> Ahli AI:</strong><br>${parsedHtml}</div>
                    <div class="msg-actions">
                        <button class="msg-action-btn copy-msg-btn" title="Copy Pesan Ini"><i class="fas fa-copy"></i></button>
                        <button class="msg-action-btn download-msg-btn" title="Download Pesan Ini"><i class="fas fa-download"></i></button>
                    </div>
                </div>
            `;
            globalChatHistory.insertAdjacentHTML('beforeend', html);
        }
    });

    // Attach listeners to newly rendered messages
    globalChatHistory.querySelectorAll('.chat-message.ai').forEach(el => attachMsgActionListeners(el));

    parseQuranLinks();
}

function addGlobalAiMessage(text, isRaw = true) {
    globalChatSessionHistory.push({ role: "assistant", content: text });
    localforage.setItem('globalChatHistory', globalChatSessionHistory);

    const parsedHtml = isRaw ? DOMPurify.sanitize(marked.parse(text)) : text;
    const msgId = 'ai-msg-' + Date.now();
    const html = `
        <div id="${msgId}" class="chat-message ai" data-raw-text="${escapeHtml(text)}" data-sender="Ahli AI">
            <div><strong><i class="fas fa-robot"></i> Ahli AI:</strong><br>${parsedHtml}</div>
            <div class="msg-actions">
                <button class="msg-action-btn copy-msg-btn" title="Copy Pesan Ini"><i class="fas fa-copy"></i></button>
                <button class="msg-action-btn download-msg-btn" title="Download Pesan Ini"><i class="fas fa-download"></i></button>
            </div>
        </div>
    `;
    globalChatHistory.insertAdjacentHTML('beforeend', html);
    globalChatHistory.scrollTop = globalChatHistory.scrollHeight;
    const newMsgEl = document.getElementById(msgId);
    if (newMsgEl) attachMsgActionListeners(newMsgEl);
    parseQuranLinks();
}

async function sendGlobalChatMessage() {
    const userMessage = globalChatInput.value.trim();
    if (!userMessage) return;

    if (apiKeys.length === 0 && groqApiKeys.length === 0) {
        alert("Fitur ini membutuhkan API Key Gemini atau Groq. Silakan masukkan di Settings.");
        openModal(document.getElementById('settings-modal'));
        return;
    }

    // Context awareness: Check active view and attach to user message internally if possible
    let contextInfo = "";
    const activeSurahSelect = document.getElementById('surah-select');
    const activeAyahSelect = document.getElementById('ayah-select');
    const mushafDisplay = document.getElementById('mushaf-display');

    if (mushafDisplay.style.display === 'block' && currentMushafData && currentMushafData.ayahs.length > 0) {
         contextInfo = `User saat ini sedang berada di mode Mushaf. Data halaman saat ini: Hal ${mushafPageInput.value}, rentang ayat: Surah ${currentMushafData.ayahs[0].surah.number}:${currentMushafData.ayahs[0].numberInSurah} hingga Surah ${currentMushafData.ayahs[currentMushafData.ayahs.length-1].surah.number}:${currentMushafData.ayahs[currentMushafData.ayahs.length-1].numberInSurah}`;
    } else if (activeSurahSelect.value && activeAyahSelect.value) {
         const sName = activeSurahSelect.options[activeSurahSelect.selectedIndex]?.text || "Surah " + activeSurahSelect.value;
         contextInfo = `User saat ini sedang membaca/berada di ${sName} Ayat ${activeAyahSelect.value}`;
    }

    // 1. Display User Message
    const escapedUserMsg = escapeHtml(userMessage);
    const userMsgHtml = `
        <div class="chat-message user" data-raw-text="${escapedUserMsg}" data-sender="Anda">
            <div>${escapedUserMsg}</div>
        </div>
    `;
    globalChatHistory.insertAdjacentHTML('beforeend', userMsgHtml);
    globalChatInput.value = '';
    globalChatHistory.scrollTop = globalChatHistory.scrollHeight;

    // 2. Add to history payload
    // We add the context as a system prompt if there is context, to avoid showing context on reload
    if (contextInfo) {
        globalChatSessionHistory.push({ role: "system", content: contextInfo });
    }
    globalChatSessionHistory.push({ role: "user", content: userMessage });
    await localforage.setItem('globalChatHistory', globalChatSessionHistory);

    // 3. Display Loading Indicator
    const loadingId = 'global-loading-' + Date.now();
    const loadingHtml = `
        <div id="${loadingId}" class="chat-message ai">
            <div><strong><i class="fas fa-robot fa-spin"></i> Ahli AI:</strong><br><em>Sedang berpikir...</em></div>
        </div>
    `;
    globalChatHistory.insertAdjacentHTML('beforeend', loadingHtml);
    globalChatHistory.scrollTop = globalChatHistory.scrollHeight;

    // 4. API Call with Fallback (Gemini -> Groq)
    let success = false;
    let aiReply = "";
    let lastError = null;

    // 4a. Try Gemini First
    if (apiKeys.length > 0) {
        let geminiAttempts = 0;
        const maxGeminiAttempts = apiKeys.length;

        // Convert global history (system/user/assistant) to Gemini format
        // Filter out system messages from history to avoid consecutive user roles
        const systemMessages = globalChatSessionHistory.filter(msg => msg.role === 'system').map(msg => msg.content).join('\n');

        const geminiHistory = globalChatSessionHistory
            .filter(msg => msg.role !== 'system')
            .map(msg => ({
                role: msg.role === 'assistant' ? 'model' : msg.role,
                parts: [{ text: msg.content }]
            }));

        const requestPayload = {
            contents: geminiHistory
        };

        if (systemMessages) {
            requestPayload.systemInstruction = {
                role: "system",
                parts: [{ text: systemMessages }]
            };
        }

        while (!success && geminiAttempts < maxGeminiAttempts) {
            const apiKey = apiKeys[currentApiKeyIndex];
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestPayload)
                });

                const data = await response.json();

                if (data.error) {
                    throw new Error(data.error.message || 'API Error');
                }

                aiReply = data.candidates[0].content.parts[0].text;
                success = true;
            } catch (err) {
                console.warn(`Gemini Global Chat error at index ${currentApiKeyIndex}:`, err);
                lastError = err;
                currentApiKeyIndex = (currentApiKeyIndex + 1) % apiKeys.length;
                geminiAttempts++;
            }
        }
    }

    // 4b. Fallback to Groq if Gemini failed or no Gemini keys
    if (!success && groqApiKeys.length > 0) {
        let groqAttempts = 0;
        const maxGroqAttempts = groqApiKeys.length;

        const endpoint = `https://api.groq.com/openai/v1/chat/completions`;
        const requestBody = {
            model: "openai/gpt-oss-120b",
            messages: globalChatSessionHistory,
            temperature: 0.3
        };

        while (!success && groqAttempts < maxGroqAttempts) {
            const apiKey = groqApiKeys[currentGroqKeyIndex];

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
                    const errorText = await response.text();
                    throw new Error(`API Error: ${response.status} - ${errorText}`);
                }

                const data = await response.json();
                aiReply = data.choices[0].message.content;
                success = true;
            } catch (e) {
                console.warn(`Groq Global Chat error at index ${currentGroqKeyIndex}:`, e);
                lastError = e;
                currentGroqKeyIndex = (currentGroqKeyIndex + 1) % groqApiKeys.length;
                groqAttempts++;
            }
        }
    }

    if (!success) {
        console.error("All AI Global Chat attempts failed.");
        aiReply = "Maaf, terjadi kesalahan saat menghubungi AI setelah mencoba Gemini dan Groq API. " + (lastError ? lastError.message : "");
        // Revert user message from history on fail
        globalChatSessionHistory.pop();
        await localforage.setItem('globalChatHistory', globalChatSessionHistory);
    }

    // 5. Remove loading and render
    const loadingEl = document.getElementById(loadingId);
    if (loadingEl) loadingEl.remove();

    if (success) {
        addGlobalAiMessage(aiReply, true);
    } else {
        const errorId = 'ai-msg-err-' + Date.now();
        const errorHtml = `
            <div id="${errorId}" class="chat-message ai" data-sender="Ahli AI">
                <div style="color: red;"><strong><i class="fas fa-exclamation-triangle"></i> Error:</strong><br>${escapeHtml(aiReply)}</div>
                <div class="msg-actions">
                    <button class="msg-action-btn copy-msg-btn" title="Copy Pesan Ini"><i class="fas fa-copy"></i></button>
                    <button class="msg-action-btn download-msg-btn" title="Download Pesan Ini"><i class="fas fa-download"></i></button>
                </div>
            </div>
        `;
        globalChatHistory.insertAdjacentHTML('beforeend', errorHtml);
        globalChatHistory.scrollTop = globalChatHistory.scrollHeight;
        const errEl = document.getElementById(errorId);
        if(errEl) attachMsgActionListeners(errEl);
    }
}

function attachMsgActionListeners(msgElement) {
    const copyBtn = msgElement.querySelector('.copy-msg-btn');
    const downloadBtn = msgElement.querySelector('.download-msg-btn');

    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            let contentHtml = msgElement.querySelector('div').innerHTML;
            let htmlLog = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Riwayat Jawaban Ahli AI</title></head><body style="font-family: Arial, sans-serif;">`;
            htmlLog += `<div style="margin-bottom: 20px;">${contentHtml}</div>`;
            htmlLog += `</body></html>`;

            const rawText = msgElement.getAttribute('data-raw-text') || msgElement.innerText;

            try {
                const blob = new Blob([htmlLog], { type: 'text/html' });
                const clipboardItem = new ClipboardItem({ 'text/html': blob });

                navigator.clipboard.write([clipboardItem]).then(() => {
                    const originalHtml = copyBtn.innerHTML;
                    copyBtn.innerHTML = '<i class="fas fa-check" style="color: var(--secondary-color);"></i>';
                    setTimeout(() => { copyBtn.innerHTML = originalHtml; }, 2000);
                }).catch(err => {
                    navigator.clipboard.writeText(rawText).then(() => {
                        const originalHtml = copyBtn.innerHTML;
                        copyBtn.innerHTML = '<i class="fas fa-check" style="color: var(--secondary-color);"></i>';
                        setTimeout(() => { copyBtn.innerHTML = originalHtml; }, 2000);
                    }).catch(e => console.error(e));
                });
            } catch (e) {
                navigator.clipboard.writeText(rawText).then(() => {
                    const originalHtml = copyBtn.innerHTML;
                    copyBtn.innerHTML = '<i class="fas fa-check" style="color: var(--secondary-color);"></i>';
                    setTimeout(() => { copyBtn.innerHTML = originalHtml; }, 2000);
                }).catch(e => console.error(e));
            }
        });
    }

    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            let contentHtml = msgElement.querySelector('div').innerHTML;
            let htmlLog = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Jawaban Ahli AI</title></head><body style="font-family: Arial, sans-serif;">`;
            htmlLog += `<div style="margin-bottom: 20px;">${contentHtml}</div>`;
            htmlLog += `</body></html>`;

            const fileName = `Jawaban_Ahli_AI_${Date.now()}.docx`;

            try {
                if (typeof htmlDocx === 'undefined') {
                    throw new Error("htmlDocx is not defined");
                }
                const converted = htmlDocx.asBlob(htmlLog);
                const url = URL.createObjectURL(converted);
                const a = document.createElement("a");
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } catch(error) {
                console.error("Gagal menggenerate DOCX", error);
                const rawText = msgElement.getAttribute('data-raw-text') || msgElement.innerText;
                const blob = new Blob([rawText], { type: "text/plain;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `Jawaban_Ahli_AI_${Date.now()}.txt`;
                a.click();
                URL.revokeObjectURL(url);
            }
        });
    }
}

function parseQuranLinks() {
    // Replace [Surah:Ayah] with clickable links
    const messages = globalChatHistory.querySelectorAll('.chat-message.ai div:not(.parsed-links)');
    messages.forEach(msgDiv => {
        let html = msgDiv.innerHTML;
        // Regex to find [SurahNumber:AyahNumber] e.g., [2:15]
        const regex = /\[(\d+):(\d+)\]/g;
        if (regex.test(html)) {
            html = html.replace(regex, (match, surahNum, ayahNum) => {
                // Try to find the surah name if we have data
                let surahName = `Surah ${surahNum}`;
                if (surahsData && surahsData.length >= surahNum) {
                    surahName = surahsData[surahNum - 1].englishName;
                }
                return `<a href="#" class="quran-link" data-surah="${surahNum}" data-ayah="${ayahNum}" title="Buka ${surahName} Ayat ${ayahNum}">${surahName} Ayat ${ayahNum}</a>`;
            });
            msgDiv.innerHTML = html;
        }
        msgDiv.classList.add('parsed-links');

        // Attach click events to new links
        const links = msgDiv.querySelectorAll('.quran-link:not(.bound)');
        links.forEach(link => {
            link.classList.add('bound');
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const surah = e.target.getAttribute('data-surah');
                const ayah = e.target.getAttribute('data-ayah');

                // Close modal and navigate
                closeModal(globalAiChatModal);
                document.getElementById('home-btn').click(); // Switch to home view

                // Trigger navigation
                const surahSelect = document.getElementById('surah-select');
                surahSelect.value = surah;
                surahSelect.dispatchEvent(new Event('change'));

                // Wait for surah to load then select ayah
                setTimeout(() => {
                    const ayahSelect = document.getElementById('ayah-select');
                    if (ayahSelect) {
                        ayahSelect.value = ayah;
                        ayahSelect.dispatchEvent(new Event('change'));

                        // Scroll to the specific ayah smoothly
                        setTimeout(() => {
                            const ayahEl = document.querySelector(`.ayah-word-group[data-ayah="${ayah}"]`);
                            if(ayahEl) ayahEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 500);
                    }
                }, 1500);
            });
        });
    });
}

async function openTafsirModal(surahNum, ayahNum) {
    if (!tafsirModal) {
        console.error("tafsirModal element not found!");
        return;
    }
    
    // Simpan state aktif untuk reload saat ganti sumber
    activeTafsirSurah = surahNum;
    activeTafsirAyah = ayahNum;

    console.log(`Menampilkan Modal Tafsir (${currentTafsirSource}): QS ${surahNum}:${ayahNum}`);
    
    // Pastikan selector sinkron dengan state
    const selector = document.getElementById('tafsir-source-select');
    if (selector) selector.value = currentTafsirSource;

    openModal(tafsirModal);
    
    tafsirLoading.style.display = 'flex';
    tafsirContent.style.display = 'none';
    tafsirTitleInfo.textContent = `Menyiapkan Tafsir ${currentTafsirSource === 'alazhar' ? 'Al-Azhar' : 'Ibnu Katsir'} Surah ${surahNum}, Ayat ${ayahNum}...`;
    tafsirContent.innerHTML = '';

    try {
        const surahTafsirData = await fetchTafsir(surahNum, currentTafsirSource);
        
        // Cek apakah data ayat ada
        const ayahTafsir = surahTafsirData.ayahs[ayahNum - 1];
        
        if (ayahTafsir) {
            const surahObj = surahsData.find(s => s.number == surahNum);
            const surahName = surahObj ? surahObj.englishName : `Surah ${surahNum}`;
            
            const sourceLabel = currentTafsirSource === 'alazhar' ? 'Al-Azhar' : 'Ibnu Katsir';
            const tafsirText = currentTafsirSource === 'alazhar' ? ayahTafsir.al_azhar : (ayahTafsir.ibnu_katsir || ayahTafsir.tafsir);

            if (tafsirText) {
                tafsirTitleInfo.textContent = `Surah ${surahName} (${surahNum}), Ayat ${ayahNum} - ${sourceLabel}`;
                tafsirContent.innerHTML = `<div class="tafsir-text">${tafsirText}</div>`;
                tafsirContent.style.display = 'block';
            } else {
                tafsirTitleInfo.textContent = `Tafsir Tidak Ditemukan`;
                tafsirContent.innerHTML = `<p>Mohon maaf, teks Tafsir ${sourceLabel} untuk ayat ini belum tersedia.</p>`;
                tafsirContent.style.display = 'block';
            }
        } else {
            tafsirTitleInfo.textContent = `Ayat Tidak Ditemukan`;
            tafsirContent.innerHTML = `<p>Data untuk ayat ${ayahNum} tidak tersedia dalam database tafsir ini.</p>`;
            tafsirContent.style.display = 'block';
        }
    } catch (error) {
        console.error("Modal Tafsir Error:", error);
        tafsirTitleInfo.textContent = "Kesalahan Muat Data";
        tafsirContent.innerHTML = `<p>Gagal mengambil data Tafsir. Pastikan file JSON tersedia di folder <code>equran-data/tafsir/${currentTafsirSource}/</code>.</p>`;
        tafsirContent.style.display = 'block';
    } finally {
        tafsirLoading.style.display = 'none';
    }
}

// --- Bookmark Logic ---
async function loadBookmarks() {
    try {
        const stored = await localforage.getItem('user_bookmarks');
        if (stored) userBookmarks = stored;
        console.log("Bookmarks loaded:", userBookmarks.length);
    } catch (e) {
        console.warn("Failed to load bookmarks:", e);
    }
}

async function saveBookmarks() {
    try {
        await localforage.setItem('user_bookmarks', userBookmarks);
    } catch (e) {
        console.warn("Failed to save bookmarks:", e);
    }
}

function toggleBookmark(surah, ayah, page, surahName) {
    const isBookmarked = userBookmarks.some(b => b.surah === surah && b.ayah === ayah);
    
    if (isBookmarked) {
        // Toggle Off: Remove ALL occurrences
        userBookmarks = userBookmarks.filter(b => !(b.surah === surah && b.ayah === ayah));
        console.log(`Bookmark removed: ${surahName} ${ayah}`);
        showToast(`Ayat ${ayah} dihapus dari bookmark.`);
    } else {
        // Toggle On: Add new
        userBookmarks.push({
            id: Date.now().toString(),
            surah: surah,
            ayah: ayah,
            page: !isNaN(page) ? page : (parseInt(document.getElementById('mushaf-page-input').value) || 1),
            surahName: surahName,
            timestamp: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
        });
        console.log(`Bookmark added: ${surahName} ${ayah}`);
        showToast(`Ayat ${ayah} berhasil disimpan.`);
    }

    saveBookmarks();
    updateBookmarkHistory();

    // Instant UI sync for the specific icons being toggled
    const icons = document.querySelectorAll(`.mushaf-bookmark-icon[data-surah="${surah}"][data-ayah="${ayah}"], .bookmark-icon-home[data-surah="${surah}"][data-ayah="${ayah}"]`);
    icons.forEach(icon => {
        if (!isBookmarked) {
            icon.classList.add('active');
            const i = icon.querySelector('i');
            if (i) { i.className = 'fas fa-bookmark'; }
        } else {
            icon.classList.remove('active');
            const i = icon.querySelector('i');
            if (i) { i.className = 'far fa-bookmark'; }
        }
    });

    // We still trigger a refresh for consistency, but the instant update above handles the "sticky" color
    if (currentMode === 'mushaf') {
        // Only re-render if needed, or rely on the instant toggle above
    } else {
        displayAyah(ayah);
    }
}

// Helper to update bookmark history modal
function updateBookmarkHistory() {
    renderBookmarkHistory();
}

function showToast(message) {
    // Check if toast container exists
    let toast = document.getElementById('quran-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'quran-toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = 'show';
    setTimeout(() => { toast.className = toast.className.replace('show', ''); }, 3000);
}

function renderBookmarkHistory() {
    const container = document.getElementById('bookmark-list-container');
    const noMsg = document.getElementById('no-bookmarks-msg');
    
    // Clear existing
    const existingItems = container.querySelectorAll('.bookmark-item');
    existingItems.forEach(item => item.remove());

    if (userBookmarks.length === 0) {
        noMsg.style.display = 'block';
        return;
    }

    noMsg.style.display = 'none';
    
    // Sort by newest first
    const sorted = [...userBookmarks].reverse();

    sorted.forEach(item => {
        const displayPage = !isNaN(item.page) && item.page ? `Halaman ${item.page}` : 'Mode Beranda';
        const div = document.createElement('div');
        div.className = 'bookmark-item';
        div.innerHTML = `
            <div class="bookmark-info" onclick="goToBookmark(${item.surah}, ${item.ayah}, ${item.page})">
                <p class="bookmark-title">${item.surahName} - Ayat ${item.ayah}</p>
                <p class="bookmark-meta">${displayPage} • Disimpan pada ${item.timestamp}</p>
            </div>
            <button class="delete-bookmark-btn" title="Hapus Bookmark" onclick="event.stopPropagation(); deleteBookmarkManual('${item.id}')">
                <i class="fas fa-trash-alt"></i>
            </button>
        `;
        container.appendChild(div);
    });
}

function deleteBookmarkManual(id) {
    userBookmarks = userBookmarks.filter(b => b.id !== id);
    saveBookmarks();
    renderBookmarkHistory();
    
    // Refresh Mushaf if active to sync toggle icons
    if (currentMode === 'mushaf') renderMushafPage();
}

function goToBookmark(surah, ayah, page) {
    closeModal(document.getElementById('bookmark-modal'));
    
    // Navigation Logic
    if (currentMode !== 'mushaf') {
        switchMode('mushaf');
    }

    // Set page and trigger load
    const pageInput = document.getElementById('mushaf-page-input');
    if (pageInput) {
        pageInput.value = page;
        // The change event should trigger fetchMushafPage
        pageInput.dispatchEvent(new Event('change'));
        
        // After a delay to allow loading, scroll to that ayah
        setTimeout(() => {
            const marker = document.querySelector(`.mushaf-end-ayah[data-ayah="${ayah}"], .mushaf-end-ayah-block[data-ayah="${ayah}"]`);
            if (marker) {
                marker.scrollIntoView({ behavior: 'smooth', block: 'center' });
                marker.style.outline = '2px solid var(--secondary-color)';
                setTimeout(() => marker.style.outline = 'none', 3000);
            }
        }, 1500);
    }
}


// ==========================================

// ==========================================
// QUIZ NAHWU & SHOROF AI LOGIC
// ==========================================
var quizCurrentState = {
    questions: [],
    currentQuestionIndex: 0,
    score: 0,
    totalQuestions: 5,
    level: 'Pemula',
    userName: 'Hamba Allah',
    startTime: null
};

async function initQuiz() {
    const qCountSelect = document.getElementById('quiz-question-count');
    const qCustomInput = document.getElementById('quiz-custom-count');

    // Ensure we only bind events once
    if (!window.quizInitialized) {
        qCountSelect.addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
                qCustomInput.style.display = 'block';
            } else {
                qCustomInput.style.display = 'none';
            }
        });

        document.getElementById('start-quiz-btn').addEventListener('click', startQuiz);
        document.getElementById('quiz-next-btn').addEventListener('click', nextQuizQuestion);
        document.getElementById('quiz-retry-btn').addEventListener('click', resetQuizSetup);
        document.getElementById('quiz-print-btn').addEventListener('click', () => window.print());
        document.getElementById('quiz-ask-expert-btn').addEventListener('click', openQuizChat);

        window.quizInitialized = true;
    }

    await renderQuizHistory();
}

async function renderQuizHistory() {
    const historyData = await localforage.getItem('quiz_history') || [];
    const container = document.getElementById('quiz-history-container');
    const tbody = document.getElementById('quiz-history-body');

    if (historyData.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    tbody.innerHTML = '';

    // Sort by date desc, take top 5
    const sortedHistory = historyData.sort((a, b) => b.date - a.date).slice(0, 5);

    sortedHistory.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding: 10px; border-bottom: 1px solid var(--border-color);">${new Date(item.date).toLocaleDateString('id-ID')}</td>
            <td style="padding: 10px; border-bottom: 1px solid var(--border-color);">${typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(item.name) : item.name}</td>
            <td style="padding: 10px; border-bottom: 1px solid var(--border-color);">${item.level}</td>
            <td style="padding: 10px; border-bottom: 1px solid var(--border-color);">${item.totalQuestions}</td>
            <td style="padding: 10px; border-bottom: 1px solid var(--border-color); font-weight: bold;">${item.score}</td>
        `;
        tbody.appendChild(tr);
    });
}

function resetQuizSetup() {
    document.getElementById('quiz-setup-view').style.display = 'block';
    document.getElementById('quiz-active-view').style.display = 'none';
    document.getElementById('quiz-summary-view').style.display = 'none';
    renderQuizHistory();
}

async function startQuiz() {
    const nameInput = document.getElementById('quiz-user-name').value.trim();
    const countSelect = document.getElementById('quiz-question-count').value;
    const customCount = document.getElementById('quiz-custom-count').value;
    const levelInput = document.getElementById('quiz-level').value;

    let total = parseInt(countSelect);
    if (countSelect === 'custom') {
        total = parseInt(customCount);
        if (isNaN(total) || total < 1 || total > 50) {
            alert('Masukkan jumlah soal yang valid (1-50).');
            return;
        }
    }

    if ((!apiKeys || apiKeys.length === 0) && (!groqApiKeys || groqApiKeys.length === 0)) {
        alert("API Key belum disetting. Silakan setting API Key (Gemini atau Groq) di menu Setting terlebih dahulu.");
        return;
    }

    quizCurrentState = {
        questions: [],
        currentQuestionIndex: 0,
        score: 0,
        totalQuestions: total,
        level: levelInput,
        userName: nameInput || 'Hamba Allah',
        startTime: Date.now()
    };

    document.getElementById('quiz-setup-view').style.display = 'none';
    document.getElementById('quiz-active-view').style.display = 'block';
    document.getElementById('quiz-summary-view').style.display = 'none';
    document.getElementById('quiz-total-num').textContent = total;
    document.getElementById('quiz-current-score').textContent = '0';

    await loadNextQuestion();
}

async function fetchRandomAyahDataForQuiz() {
    // 1. Get random surah (1-114)
    const surahNum = Math.floor(Math.random() * 114) + 1;

    // 2. Fetch surah details to get number of ayahs
    const surahMetaRes = await fetch(`https://api.alquran.cloud/v1/surah/${surahNum}`);
    const surahMetaData = await surahMetaRes.json();
    const totalAyahs = surahMetaData.data.numberOfAyahs;
    const surahName = surahMetaData.data.englishName;

    // 3. Get random ayah
    const ayahNum = Math.floor(Math.random() * totalAyahs) + 1;

    // 4. Fetch ayah text and translation
    const textRes = await fetch(`https://api.alquran.cloud/v1/ayah/${surahNum}:${ayahNum}/quran-uthmani`);
    const textData = await textRes.json();

    const transRes = await fetch(`https://api.alquran.cloud/v1/ayah/${surahNum}:${ayahNum}/id.indonesian`);
    const transData = await transRes.json();

    return {
        surahNum,
        surahName,
        ayahNum,
        text: textData.data.text,
        translation: transData.data.text
    };
}

async function generateQuizQuestion(level) {
    const ayahData = await fetchRandomAyahDataForQuiz();

    const prompt = `Anda adalah seorang Ahli Nahwu Shorof, Ahli bahasa Arab, dan Dosen Profesor Al-Quran yang sedang menguji mahasiswanya.
Buatkan 1 soal pilihan ganda tentang tata bahasa Arab (Nahwu / Shorof) berdasarkan ayat Al-Quran berikut ini.

Surah: ${ayahData.surahName} (${ayahData.surahNum}), Ayat: ${ayahData.ayahNum}
Teks Arab: ${ayahData.text}
Terjemahan: ${ayahData.translation}

Tingkat Kesulitan: ${level}
- Pemula: Fokus pada identifikasi kata dasar (Fi'il, Isim, Huruf), makna dasar, atau ciri-ciri sederhana.
- Menengah: Fokus pada I'rab dasar (Fa'il, Maf'ul bih, Mubtada, Khabar), wazan fi'il, atau struktur frasa (Idhafah, Na'at Man'ut).
- Mahir: Fokus pada I'rab detail (alasan pemakaian harakat tertentu, kedudukan kalimat), Balaghah, atau analisis Sharaf mendalam (I'lal, dll).

Instruksi Penting:
1. Soal dan pilihan jawaban (A, B, C, D) harus dalam kombinasi Bahasa Indonesia dan istilah Bahasa Arab yang relevan.
2. Jelaskan jawaban yang benar secara detail layaknya seorang ahli mengajari muridnya.
3. KEMBALIKAN OUTPUT STRICTLY DALAM FORMAT JSON SEPERTI DI BAWAH INI TANPA MARKDOWN ATAU TEKS TAMBAHAN APAPUN:
{
  "ayahContext": "${ayahData.text}",
  "ayahTranslation": "${ayahData.translation}",
  "surahRef": "${ayahData.surahName} ${ayahData.surahNum}:${ayahData.ayahNum}",
  "question": "Pertanyaan soal...",
  "options": {
    "A": "Pilihan A",
    "B": "Pilihan B",
    "C": "Pilihan C",
    "D": "Pilihan D"
  },
  "answer": "A",
  "explanation": "Penjelasan detail mengapa jawaban tersebut benar dan analisis tata bahasanya..."
}
`;

    let resultJson = null;
    let lastError = null;
    let success = false;

    // Try Gemini API keys
    if (apiKeys && apiKeys.length > 0) {
        for (let i = 0; i < apiKeys.length; i++) {
            try {
                const responseText = await callGeminiAPIText(apiKeys[i], prompt);
                resultJson = extractJsonFromResponse(responseText);
                if (resultJson) {
                    success = true;
                    break;
                }
            } catch (e) {
                lastError = e;
            }
        }
    }

    // Fallback to Groq API keys if Gemini fails or empty
    if (!success && typeof groqApiKeys !== 'undefined' && groqApiKeys && groqApiKeys.length > 0) {
        console.warn("Gemini failed for quiz question, trying Groq fallback", lastError);
        for (let i = 0; i < groqApiKeys.length; i++) {
            try {
                const responseText = await callGroqAPIText(groqApiKeys[i], prompt);
                resultJson = extractJsonFromResponse(responseText);
                if (resultJson) {
                    success = true;
                    break;
                }
            } catch (e) {
                console.error("Groq attempt failed:", e);
                lastError = e;
            }
        }
    }

    if (!success || !resultJson || !resultJson.question || !resultJson.options) {
         throw new Error("Gagal parsing JSON dari AI atau kuota habis: " + (lastError ? lastError.message : "Unknown error"));
    }

    return resultJson;
}

function extractJsonFromResponse(responseText) {
    if (!responseText) return null;
    try {
        const startIndex = responseText.indexOf('{');
        const endIndex = responseText.lastIndexOf('}');
        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
            const jsonStr = responseText.substring(startIndex, endIndex + 1);
            return JSON.parse(jsonStr);
        }
        return JSON.parse(responseText);
    } catch (e) {
        console.error("Error extracting JSON from AI response:", responseText);
        return null;
    }
}

async function loadNextQuestion() {
    document.getElementById('quiz-loading').style.display = 'block';
    document.getElementById('quiz-question-container').style.display = 'none';
    document.getElementById('quiz-explanation-container').style.display = 'none';
    document.getElementById('quiz-next-btn').style.display = 'none';

    document.getElementById('quiz-current-num').textContent = quizCurrentState.currentQuestionIndex + 1;

    try {
        const qData = await generateQuizQuestion(quizCurrentState.level);
        quizCurrentState.questions.push(qData);
        renderCurrentQuestion();
    } catch (error) {
        console.error("Quiz generation error:", error);
        alert("Maaf, terjadi kesalahan saat menyusun soal: " + error.message);
        document.getElementById('quiz-loading').style.display = 'none';
        document.getElementById('quiz-setup-view').style.display = 'block';
        document.getElementById('quiz-active-view').style.display = 'none';
    }
}

function renderCurrentQuestion() {
    document.getElementById('quiz-loading').style.display = 'none';
    document.getElementById('quiz-question-container').style.display = 'block';

    const qData = quizCurrentState.questions[quizCurrentState.currentQuestionIndex];

    document.getElementById('quiz-ayah-ref').textContent = `Surat ${qData.surahRef}`;
    document.getElementById('quiz-ayah-text').textContent = qData.ayahContext;
    document.getElementById('quiz-ayah-translation').textContent = qData.ayahTranslation;
    document.getElementById('quiz-question-text').textContent = qData.question;

    const optionsContainer = document.getElementById('quiz-options-container');
    optionsContainer.innerHTML = '';

    for (const [key, value] of Object.entries(qData.options)) {
        const btn = document.createElement('button');
        btn.className = 'quiz-option-btn';
        btn.innerHTML = `<strong>${key}.</strong> ${value}`;
        btn.onclick = () => handleOptionClick(key, btn);
        optionsContainer.appendChild(btn);
    }
}

function handleOptionClick(selectedKey, btnElement) {
    const buttons = document.querySelectorAll('.quiz-option-btn');
    buttons.forEach(b => b.disabled = true);

    const qData = quizCurrentState.questions[quizCurrentState.currentQuestionIndex];
    const isCorrect = selectedKey === qData.answer;

    if (isCorrect) {
        btnElement.classList.add('correct');
        quizCurrentState.score++;
        document.getElementById('quiz-current-score').textContent = quizCurrentState.score;
    } else {
        btnElement.classList.add('incorrect');
        buttons.forEach(b => {
            if (b.innerHTML.startsWith(`<strong>${qData.answer}.</strong>`)) {
                b.classList.add('correct');
            }
        });
    }

    showExplanation(qData.explanation);
}

function showExplanation(explanationText) {
    document.getElementById('quiz-explanation-container').style.display = 'block';
    // Gunakan DOMPurify jika ada
    const htmlContent = typeof marked !== 'undefined' ? marked.parse(explanationText) : explanationText;
    document.getElementById('quiz-explanation-text').innerHTML = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(htmlContent) : htmlContent;
    document.getElementById('quiz-next-btn').style.display = 'inline-block';
}

function openQuizChat() {
    const qData = quizCurrentState.questions[quizCurrentState.currentQuestionIndex];
    const context = `Saya sedang mengerjakan Kuis Nahwu Shorof AI.\nAyat: ${qData.surahRef} - ${qData.ayahContext}\nPertanyaan: ${qData.question}\nJawaban yang Benar: ${qData.answer} (${qData.options[qData.answer]})\nPenjelasan: ${qData.explanation}\n\nTolong jelaskan lebih lanjut mengenai materi di atas karena saya masih belum paham.`;

    document.getElementById('chat-modal').style.display = 'flex';
    document.getElementById('chat-messages').innerHTML = '';

    // Inject system context to chat state
    currentChatState = {
        history: [{
            role: "user",
            parts: [{text: "System Context: Anda adalah Ahli Nahwu dan Shorof. " + context}]
        }, {
            role: "model",
            parts: [{text: "Tentu, saya adalah Ahli Nahwu dan Shorof. Saya akan dengan senang hati menjelaskan lebih lanjut mengenai soal kuis tersebut. Bagian mana yang masih membingungkan Anda?"}]
        }]
    };

    appendMessage('ai', "Tentu, saya adalah Ahli Nahwu dan Shorof. Saya akan dengan senang hati menjelaskan lebih lanjut mengenai soal kuis tersebut. Bagian mana yang masih membingungkan Anda?");
}

async function nextQuizQuestion() {
    quizCurrentState.currentQuestionIndex++;
    if (quizCurrentState.currentQuestionIndex >= quizCurrentState.totalQuestions) {
        await finishQuiz();
    } else {
        await loadNextQuestion();
    }
}

async function finishQuiz() {
    document.getElementById('quiz-active-view').style.display = 'none';
    document.getElementById('quiz-summary-view').style.display = 'block';

    document.getElementById('quiz-summary-level').textContent = quizCurrentState.level;
    document.getElementById('quiz-final-score').textContent = quizCurrentState.score;
    document.getElementById('quiz-final-total').textContent = quizCurrentState.totalQuestions;

    const percentage = (quizCurrentState.score / quizCurrentState.totalQuestions) * 100;
    let msg = "";
    if (percentage === 100) msg = "Sempurna! Anda adalah Ahli Nahwu Shorof sejati!";
    else if (percentage >= 80) msg = "Luar Biasa! Pemahaman tata bahasa Anda sangat baik.";
    else if (percentage >= 60) msg = "Bagus! Terus tingkatkan kemampuan bahasa Arab Anda.";
    else msg = "Jangan menyerah! Mari belajar Nahwu & Shorof lebih giat lagi.";

    document.getElementById('quiz-final-message').textContent = msg;

    // Save history
    const historyItem = {
        date: Date.now(),
        name: quizCurrentState.userName,
        level: quizCurrentState.level,
        score: quizCurrentState.score,
        totalQuestions: quizCurrentState.totalQuestions
    };

    let historyData = await localforage.getItem('quiz_history') || [];
    historyData.push(historyItem);
    await localforage.setItem('quiz_history', historyData);
}
