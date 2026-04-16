import re

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

switch_search = r'''        mushafDisplay\.style\.display = 'none';
    \} else if \(mode === 'mushaf'\) \{
        homeSection\.style\.display = 'none';
        introSection\.style\.display = 'none';
        quranDisplay\.style\.display = 'none';
        homeSearchSection\.style\.display = 'none';
        mushafDisplay\.style\.display = 'block';

        if \(!mushafPageInput\.value\) \{'''

switch_replace = r'''        mushafDisplay.style.display = 'none';
        const quizSection = document.getElementById('quiz-section');
        if (quizSection) quizSection.style.display = 'none';
    } else if (mode === 'mushaf') {
        homeSection.style.display = 'none';
        introSection.style.display = 'none';
        quranDisplay.style.display = 'none';
        homeSearchSection.style.display = 'none';
        mushafDisplay.style.display = 'block';
        const quizSection = document.getElementById('quiz-section');
        if (quizSection) quizSection.style.display = 'none';

        if (!mushafPageInput.value) {'''

content = re.sub(switch_search, switch_replace, content)

# Now append the quiz mode toggle inside that block
if "mode === 'quiz'" not in content:
    append_search = r'''        if \(!mushafPageInput\.value\) \{
            initMushafNav\(\);
            fetchMushafPage\(1\); // Load default page 1
        \}
    \}
\}'''

    append_replace = r'''        if (!mushafPageInput.value) {
            initMushafNav();
            fetchMushafPage(1); // Load default page 1
        }
    } else if (mode === 'quiz') {
        homeSection.style.display = 'none';
        introSection.style.display = 'none';
        homeSearchSection.style.display = 'none';
        quranDisplay.style.display = 'none';
        mushafDisplay.style.display = 'none';

        const quizSection = document.getElementById('quiz-section');
        if (quizSection) {
            quizSection.style.display = 'block';
            if (typeof initQuiz === 'function') {
                initQuiz();
            }
        }
    }
}'''
    content = re.sub(append_search, append_replace, content)

# Append quiz logic
quiz_logic = r'''

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

    qCountSelect.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
            qCustomInput.style.display = 'block';
        } else {
            qCustomInput.style.display = 'none';
        }
    });

    document.getElementById('start-quiz-btn').onclick = startQuiz;
    document.getElementById('quiz-next-btn').onclick = nextQuizQuestion;
    document.getElementById('quiz-retry-btn').onclick = resetQuizSetup;
    document.getElementById('quiz-print-btn').onclick = () => window.print();
    document.getElementById('quiz-ask-expert-btn').onclick = openQuizChat;

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
            <td style="padding: 10px; border-bottom: 1px solid var(--border-color);">${DOMPurify.sanitize(item.name)}</td>
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

    if (!apiKeys || apiKeys.length === 0) {
        alert("API Key belum disetting. Silakan setting API Key di menu Setting terlebih dahulu.");
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

async function fetchRandomAyahData() {
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
    const ayahData = await window.fetchRandomAyahData();

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
  "answer": "A", // Hanya huruf A, B, C, atau D
  "explanation": "Penjelasan detail mengapa jawaban tersebut benar dan analisis tata bahasanya..."
}
`;

    let resultJson = null;
    let lastError = null;
    let success = false;

    // Try Gemini API keys
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

    // Fallback to Groq API keys if Gemini fails
    if (!success && typeof groqApiKeys !== 'undefined' && groqApiKeys && groqApiKeys.length > 0) {
        console.warn("Gemini failed for quiz question, trying Groq fallback", lastError);
        try {
            const responseText = await callGroqAPIText(groqApiKeys[0], prompt);
            resultJson = extractJsonFromResponse(responseText);
        } catch (e) {
            console.error("Groq also failed:", e);
        }
    }

    if (!resultJson || !resultJson.question || !resultJson.options) {
         throw new Error("Gagal parsing JSON dari AI");
    }

    return resultJson;
}

function extractJsonFromResponse(responseText) {
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
        const qData = await window.generateQuizQuestion(quizCurrentState.level);
        quizCurrentState.questions.push(qData);
        renderCurrentQuestion();
    } catch (error) {
        console.error("Quiz generation error:", error);
        alert("Maaf, terjadi kesalahan saat menyusun soal. AI mungkin sedang sibuk. Silakan coba lagi.");
        document.getElementById('quiz-loading').style.display = 'none';
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
    // Disable all buttons
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
        // Highlight correct answer
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
    // Gunakan DOMPurify untuk sanitasi output markdown AI
    document.getElementById('quiz-explanation-text').innerHTML = DOMPurify.sanitize(marked.parse(explanationText));
    document.getElementById('quiz-next-btn').style.display = 'inline-block';
}

function openQuizChat() {
    const qData = quizCurrentState.questions[quizCurrentState.currentQuestionIndex];
    const context = `Saya sedang mengerjakan Kuis Nahwu Shorof AI.
Ayat: ${qData.surahRef} - ${qData.ayahContext}
Pertanyaan: ${qData.question}
Jawaban yang Benar: ${qData.answer} (${qData.options[qData.answer]})
Penjelasan: ${qData.explanation}

Tolong jelaskan lebih lanjut mengenai materi di atas karena saya masih belum paham.`;

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

    appendMessage('ai', "Tentu, saya akan dengan senang hati menjelaskan lebih lanjut mengenai soal kuis tersebut. Bagian mana yang masih membingungkan Anda?");
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

window.fetchRandomAyahData = window.fetchRandomAyahData || fetchRandomAyahData;
window.generateQuizQuestion = window.generateQuizQuestion || generateQuizQuestion;
'''

if 'function startQuiz()' not in content:
    content += quiz_logic

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)
