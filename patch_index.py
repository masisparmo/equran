import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace button in the header nav
nav_search = r'<button id="about-btn" title="Tentang Aplikasi"><i class="fas fa-info-circle"></i> <span class="nav-text">About</span></button>'
nav_replace = r'''<button id="quiz-nav-btn" onclick="switchMode('quiz')" title="Kuis AI"><i class="fas fa-trophy"></i> <span class="nav-text">Kuis</span></button>
            <button id="about-btn" title="Tentang Aplikasi"><i class="fas fa-info-circle"></i> <span class="nav-text">About</span></button>'''

if 'switchMode(\'quiz\')' not in content:
    content = content.replace(nav_search, nav_replace)

    quiz_section = r'''        <!-- Quiz Section -->
        <section id="quiz-section" class="card" style="display: none;">
            <!-- Quiz Setup View -->
            <div id="quiz-setup-view">
                <h2 style="color: var(--primary-color); border-bottom: 2px solid var(--border-color); padding-bottom: 10px;"><i class="fas fa-trophy"></i> Kuis Nahwu & Shorof AI</h2>
                <p style="margin-bottom: 20px;">Uji pemahaman Anda tentang Nahwu dan Shorof dari ayat-ayat Al-Qur'an secara acak.</p>

                <div style="display: flex; flex-direction: column; gap: 15px; max-width: 500px; margin-bottom: 30px;">
                    <div>
                        <label style="font-weight: bold; margin-bottom: 5px; display: block;">Nama Anda</label>
                        <input type="text" id="quiz-user-name" placeholder="Masukkan nama..." class="search-input" style="width: 100%; box-sizing: border-box;">
                    </div>
                    <div>
                        <label style="font-weight: bold; margin-bottom: 5px; display: block;">Jumlah Soal</label>
                        <select id="quiz-question-count" class="search-input" style="width: 100%; box-sizing: border-box;">
                            <option value="5">5 Soal</option>
                            <option value="10">10 Soal</option>
                            <option value="15">15 Soal</option>
                            <option value="custom">Custom...</option>
                        </select>
                        <input type="number" id="quiz-custom-count" placeholder="Jumlah soal" class="search-input" style="display: none; width: 100%; box-sizing: border-box; margin-top: 10px;" min="1" max="50">
                    </div>
                    <div>
                        <label style="font-weight: bold; margin-bottom: 5px; display: block;">Tingkat Kesulitan</label>
                        <select id="quiz-level" class="search-input" style="width: 100%; box-sizing: border-box;">
                            <option value="Pemula">Pemula (Fokus: Identifikasi Dasar)</option>
                            <option value="Menengah">Menengah (Fokus: I'rab Dasar & Wazan)</option>
                            <option value="Mahir">Mahir (Fokus: I'rab Detail & Balaghah)</option>
                        </select>
                    </div>
                    <button id="start-quiz-btn" class="nav-btn" style="width: 100%; margin-top: 10px; background-color: var(--primary-color); color: white;"><i class="fas fa-play"></i> Mulai Kuis</button>
                </div>

                <div id="quiz-history-container" style="margin-top: 40px; display: none;">
                    <h3 style="border-bottom: 1px solid var(--border-color); padding-bottom: 10px;">Riwayat Kuis Terakhir</h3>
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; margin-top: 15px; text-align: left;">
                            <thead>
                                <tr style="background-color: var(--bg-hover);">
                                    <th style="padding: 10px; border-bottom: 2px solid var(--border-color);">Tanggal</th>
                                    <th style="padding: 10px; border-bottom: 2px solid var(--border-color);">Nama</th>
                                    <th style="padding: 10px; border-bottom: 2px solid var(--border-color);">Level</th>
                                    <th style="padding: 10px; border-bottom: 2px solid var(--border-color);">Total Soal</th>
                                    <th style="padding: 10px; border-bottom: 2px solid var(--border-color);">Skor Benar</th>
                                </tr>
                            </thead>
                            <tbody id="quiz-history-body">
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Quiz Active View -->
            <div id="quiz-active-view" style="display: none;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 10px;">
                    <h3 style="margin: 0;">Soal <span id="quiz-current-num">1</span> / <span id="quiz-total-num">10</span></h3>
                    <div style="font-size: 0.9em; background: var(--bg-hover); padding: 5px 10px; border-radius: 20px;">
                        Skor Sementara: <strong id="quiz-current-score" style="color: var(--primary-color);">0</strong>
                    </div>
                </div>

                <div id="quiz-loading" style="text-align: center; padding: 40px 20px; display: none;">
                    <i class="fas fa-spinner fa-spin fa-3x" style="color: var(--primary-color); margin-bottom: 15px;"></i>
                    <p id="quiz-loading-text">AI sedang menyiapkan soal dari ayat Al-Qur'an secara acak...</p>
                </div>

                <div id="quiz-question-container" style="display: none;">
                    <div style="background-color: var(--bg-hover); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <p style="font-size: 0.9em; color: var(--text-muted); margin-top: 0;" id="quiz-ayah-ref">Referensi Surat</p>
                        <p class="arabic-text large-arabic" style="text-align: center; margin-bottom: 15px;" id="quiz-ayah-text">Ayat</p>
                        <p style="text-align: center; font-style: italic; margin-bottom: 0;" id="quiz-ayah-translation">Terjemahan</p>
                    </div>

                    <h4 style="font-size: 1.1em; margin-bottom: 20px;" id="quiz-question-text">Pertanyaan...</h4>

                    <div id="quiz-options-container">
                        <!-- Options injected here -->
                    </div>

                    <div id="quiz-explanation-container" class="quiz-explanation-box" style="display: none;">
                        <h4 style="margin-top: 0; color: var(--primary-color);"><i class="fas fa-info-circle"></i> Penjelasan Detail AI</h4>
                        <div id="quiz-explanation-text" class="rich-text-container" style="margin-bottom: 15px;"></div>

                        <div style="background: var(--bg-color); padding: 15px; border-radius: 8px; margin-top: 15px; border: 1px solid var(--border-color);">
                            <p style="margin-top: 0; font-weight: bold;">Masih belum paham?</p>
                            <button id="quiz-ask-expert-btn" class="nav-btn"><i class="fas fa-comment-dots"></i> Tanya Ahli AI</button>
                        </div>
                    </div>

                    <div style="text-align: right; margin-top: 20px;">
                        <button id="quiz-next-btn" class="nav-btn" style="display: none; background-color: var(--primary-color); color: white;">Lanjut ke Soal Berikutnya <i class="fas fa-arrow-right"></i></button>
                    </div>
                </div>
            </div>

            <!-- Quiz Summary View -->
            <div id="quiz-summary-view" style="display: none; text-align: center;">
                <h2 style="color: var(--primary-color); margin-bottom: 10px;">Kuis Selesai!</h2>
                <div style="font-size: 4rem; margin: 20px 0; color: var(--primary-color);">
                    <i class="fas fa-award"></i>
                </div>
                <h3 id="quiz-final-message">Selamat, Anda Luar Biasa!</h3>
                <p>Anda telah menyelesaikan kuis level <strong id="quiz-summary-level"></strong>.</p>

                <div style="display: inline-block; background: var(--bg-hover); padding: 20px 40px; border-radius: 12px; margin: 20px 0;">
                    <div style="font-size: 1.2em; margin-bottom: 10px;">Skor Akhir Anda:</div>
                    <div style="font-size: 2.5em; font-weight: bold; color: var(--primary-color);">
                        <span id="quiz-final-score"></span> / <span id="quiz-final-total"></span>
                    </div>
                </div>

                <div style="margin-top: 30px; display: flex; justify-content: center; gap: 15px; flex-wrap: wrap;">
                    <button id="quiz-retry-btn" class="nav-btn" style="background-color: var(--primary-color); color: white;"><i class="fas fa-redo"></i> Coba Lagi</button>
                    <button id="quiz-print-btn" class="nav-btn"><i class="fas fa-print"></i> Cetak Hasil</button>
                </div>
            </div>
        </section>

        <!-- About Modal -->'''

    content = content.replace('<!-- About Modal -->', quiz_section)

    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(content)
