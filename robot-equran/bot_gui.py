import sys
import os
import json
import threading
import requests
from PySide6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QLabel, QLineEdit, QComboBox, QCheckBox, QPushButton, QProgressBar,
    QGroupBox, QMessageBox, QTextEdit, QGridLayout, QTextBrowser, QSizePolicy
)
from PySide6.QtGui import QIcon
from PySide6.QtCore import Qt, QThread, Signal
from playwright.sync_api import sync_playwright

HISTORY_FILE = "history.json"
CONFIG_FILE = "config.json"

def resource_path(relative_path):
    """ Get absolute path to resource, works for dev and for PyInstaller """
    try:
        # PyInstaller creates a temp folder and stores path in _MEIPASS
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")

    return os.path.join(base_path, relative_path)

def get_surahs():
    try:
        r = requests.get('https://api.alquran.cloud/v1/surah', timeout=10)
        if r.ok:
            return r.json().get('data', [])
    except:
        pass
    return []

def get_ayahs(surah_num):
    try:
        r = requests.get(f'https://api.alquran.cloud/v1/surah/{surah_num}', timeout=10)
        if r.ok:
            return r.json().get('data', {}).get('ayahs', [])
    except:
        pass
    return []

class PlaywrightWorker(QThread):
    status_updated = Signal(str)
    progress_updated = Signal(int, int, str)
    error_occurred = Signal(str)
    log_updated = Signal(str)
    finished_task = Signal()
    word_completed = Signal(int, int, int) # Surah, Ayah, CompletedIndex

    def __init__(self, surah: int, ayah: int, target_word, total_app_words: int, api_key: str, headless: bool):
        super().__init__()
        self.surah = surah
        self.ayah = ayah
        self.target_word = target_word  # 'all' or start index integer
        self.total_app_words = total_app_words # From the API text we know approx size
        self.api_keys = [k.strip() for k in api_key.split(',') if k.strip()]
        self.current_key_idx = 0
        self.headless = headless

        self.is_running = True
        self.is_paused = False
        self.pause_event = threading.Event()
        self.pause_event.set() # Set to True = not paused

    def get_current_api_key(self):
        if not self.api_keys:
            return ""
        return self.api_keys[self.current_key_idx]

    def rotate_api_key(self):
        if not self.api_keys:
            return False

        self.current_key_idx = (self.current_key_idx + 1) % len(self.api_keys)
        masked_key = (self.get_current_api_key()[:4] + "..." + self.get_current_api_key()[-4:]) if len(self.get_current_api_key()) > 8 else "Unknown"
        self.log_updated.emit(f"🔄 [Rotasi API Key] Menggunakan key: {masked_key} (Index: {self.current_key_idx + 1}/{len(self.api_keys)})")
        return True

    def stop(self):
        self.is_running = False
        self.pause_event.set() # Unblock if paused

    def toggle_pause(self):
        self.is_paused = not self.is_paused
        if self.is_paused:
            self.pause_event.clear()
            self.log_updated.emit("[Info] Robot DIPAUSE oleh pengguna.")
        else:
            self.pause_event.set()
            self.log_updated.emit("[Info] Robot di-RESUME melanjutkan tugas...")

    def handle_response(self, response):
        # Hindari membaca body jika responnya Redirect (301, 302, 307, dll)
        if response.status >= 300 and response.status < 400:
            return

        # Mengecek jika response berhasil dan bertipe JSON
        if response.status == 200 and "application/json" in response.headers.get("content-type", ""):
            try:
                data = response.json()
                if isinstance(data, dict) and data.get('status') == 'success':
                    self.log_updated.emit(f"✅ [GSheets] Berhasil kirim data ke komunitas Google Sheets.")
            except Exception:
                pass

    def block_if_paused(self):
        if not self.is_running: return
        self.pause_event.wait()

    def run(self):
        try:
            with sync_playwright() as p:
                self.status_updated.emit("Meluncurkan Browser...")
                self.log_updated.emit("🌐 Membuka browser (Microsoft Edge)...")
                browser = p.chromium.launch(
                    channel="msedge",
                    headless=self.headless,
                    args=['--ignore-certificate-errors']
                )
                context = browser.new_context(ignore_https_errors=True)
                page = context.new_page()

                # Listener Google Sheet & Error Detection
                def on_response(response):
                    self.handle_response(response)
                    if "generativelanguage.googleapis.com" in response.url:
                        # Extract key from query param if possible for logging
                        from urllib.parse import urlparse, parse_qs
                        parsed = urlparse(response.url)
                        api_key_used = parse_qs(parsed.query).get('key', [''])[0]
                        masked_key = (api_key_used[:4] + "..." + api_key_used[-4:]) if len(api_key_used) > 8 else "Unknown"

                        if response.status == 429:
                            self.log_updated.emit(f"⚠️ [QUOTA] Limit Key {masked_key} terlampaui (429).")
                        elif response.status >= 400:
                            try:
                                err_data = response.json()
                                reason = err_data.get('error', {}).get('message', 'Unknown Error')
                                self.log_updated.emit(f"❌ [API Error] {response.status} (Key {masked_key}): {reason}")
                            except:
                                self.log_updated.emit(f"❌ [API Error] Status {response.status} (Key {masked_key})")

                page.on("response", on_response)

                # Hotfix: Intercept old/wrong models and redirect to Gemini 3 Flash Preview
                def handle_route(route):
                    url = route.request.url
                    # Pattern for any old gemini version
                    if "/models/gemini-" in url and "gemini-3-flash-preview" not in url:
                        new_url = url
                        for old in ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-2.5-flash"]:
                            new_url = new_url.replace(old, "gemini-3-flash-preview")

                        if new_url != url:
                            self.log_updated.emit(f"🔄 [Hotfix] Mengalihkan request model ke gemini-3-flash-preview...")
                            route.continue_(url=new_url)
                        else:
                            route.continue_()
                    else:
                        route.continue_()

                page.route("**/models/gemini-*", handle_route)

                self.status_updated.emit("Membuka equran.isparmo.com via HTTP...")
                page.goto("http://equran.isparmo.com/", wait_until="domcontentloaded")
                page.wait_for_load_state("networkidle")

                self.block_if_paused()
                if not self.is_running:
                    browser.close()
                    self.finished_task.emit()
                    return

                # Handle Welcome Modal (No API key injected into UI in Jalur 1)
                if page.locator("#welcome-modal").is_visible():
                    page.click("#close-welcome-modal")
                    self.log_updated.emit("🔑 Modal API Key di-close. Robot (Python) akan menggunakan API Key secara mandiri.")

                self.block_if_paused()
                if not self.is_running:
                    browser.close()
                    self.finished_task.emit()
                    return

                # Pilih Surah
                self.status_updated.emit(f"Memilih Surah: {self.surah}...")
                self.log_updated.emit(f"📖 Menavigasi ke Surah {self.surah}...")
                page.wait_for_selector(f"#surah-select option[value='{self.surah}']", state="attached", timeout=15000)
                page.select_option("#surah-select", str(self.surah))

                # Check when it's not disabled anymore
                page.wait_for_function('document.getElementById("ayah-select").disabled === false', timeout=20000)

                self.block_if_paused()
                if not self.is_running:
                    browser.close()
                    self.finished_task.emit()
                    return

                # 2. Pilih Ayat
                self.status_updated.emit(f"Memilih Ayat: {self.ayah}...")
                self.log_updated.emit(f"🔖 Menavigasi ke Ayat {self.ayah}...")
                page.select_option("#ayah-select", str(self.ayah))

                self.status_updated.emit("Menunggu rendering API Al-Qur'an Cloud...")
                page.wait_for_selector("#arabic-container span.word", state="visible", timeout=15000)
                page.wait_for_timeout(1000) # give a little buffer to fully paint

                self.block_if_paused()
                if not self.is_running:
                    browser.close()
                    self.finished_task.emit()
                    return

                # Inject Indices to DOM (Starting from 0) and Strip Bismillah if needed
                self.status_updated.emit("Menyuntikkan Index Visual ke DOM...")

                # Check condition: If Surah != 1 and Surah != 9 and Ayah == 1, strip Bismillah.
                strip_bismillah = "true" if (self.surah != 1 and self.surah != 9 and self.ayah == 1) else "false"

                inject_js = f"""
                () => {{
                    let words = document.querySelectorAll('#arabic-container span.word');

                    // Menghilangkan Bismillah (4 kata pertama) untuk ayat 1 (kecuali Alfatihah & At-Taubah)
                    if ({strip_bismillah}) {{
                        for (let k = 0; k < 4; k++) {{
                            if (words.length > 0) {{
                                words[0].parentNode.removeChild(words[0]);
                                words = document.querySelectorAll('#arabic-container span.word');
                            }}
                        }}
                    }}

                    // Inject index
                    words.forEach((w, i) => {{
                        if(w.previousSibling && w.previousSibling.className === 'word-index') return;

                        const indexEl = document.createElement('span');
                        indexEl.className = 'word-index';
                        indexEl.innerText = i;
                        indexEl.style.fontSize = '0.5em';
                        indexEl.style.color = '#e74c3c';
                        indexEl.style.verticalAlign = 'top';
                        indexEl.style.marginRight = '2px';
                        indexEl.style.fontWeight = 'bold';

                        w.parentNode.insertBefore(indexEl, w);
                    }});
                    return words.length;
                }}
                """
                total_web_words = page.evaluate(inject_js)

                if total_web_words == 0:
                    self.error_occurred.emit("Tidak ada kata ditemukan di browser.")
                    browser.close()
                    self.finished_task.emit()
                    return

                # Determine target sequence
                if self.target_word == 'all':
                    start_index = 0
                else:
                    start_index = int(self.target_word)

                target_indices = list(range(start_index, total_web_words))
                if not target_indices:
                    self.error_occurred.emit(f"Index {start_index} melebihi jumlah kata {total_web_words-1}.")
                    browser.close()
                    self.finished_task.emit()
                    return

                self.progress_updated.emit(0, len(target_indices), "Memulai iterasi...")
                self.log_updated.emit(f"🚀 Memulai ekstraksi dari index {start_index} sampai {total_web_words-1}. Total diproses: {len(target_indices)}")

                # Get context translations
                indo_translation = page.locator("#translation-container p").inner_text()

                # Retrieve word texts from the DOM using page.evaluate to ensure we get the text after DOM changes
                word_texts = page.evaluate("""
                () => {
                    const words = document.querySelectorAll('#arabic-container span.word');
                    return Array.from(words).map(w => w.innerText.trim());
                }
                """)

                # Implement batching mechanism (Jalur 1)
                batch_size = 6  # Process 5-7 words at a time
                batches = [target_indices[i:i + batch_size] for i in range(0, len(target_indices), batch_size)]

                for batch_idx, batch in enumerate(batches):
                    self.block_if_paused()
                    if not self.is_running:
                        break

                    msg = f"Memproses batch {batch_idx + 1}/{len(batches)} (Index {batch[0]} - {batch[-1]})..."
                    self.status_updated.emit(msg)
                    self.progress_updated.emit(batch[-1] + 1, len(target_indices), msg)
                    self.log_updated.emit(f"▶️ [Batching] Memproses kata index {batch[0]} hingga {batch[-1]}...")

                    words_in_batch = []
                    for idx in batch:
                        if idx < len(word_texts):
                            word_ar = word_texts[idx]
                            words_in_batch.append({"index": idx, "word": word_ar})

                    if not words_in_batch:
                        continue

                    # Call the Gemini API directly from Python
                    ai_results = self.process_batch_with_ai(words_in_batch, indo_translation)

                    if ai_results:
                        for result in ai_results:
                            word_idx = result.get('index')
                            word_text = result.get('word', '')
                            analysis_md = result.get('analysis', '')

                            if word_idx is not None and analysis_md:
                                self.log_updated.emit(f"🔄 Mengirim data kata '{word_text}' (index {word_idx}) ke GAS...")
                                success = self.send_to_gas(self.surah, self.ayah, word_idx, analysis_md)
                                if success:
                                    self.log_updated.emit(f"✔️ Analisis kata '{word_text}' sukses dikirim ke GAS.")
                                    self.word_completed.emit(self.surah, self.ayah, word_idx)
                                else:
                                    self.log_updated.emit(f"❌ Gagal mengirim kata '{word_text}' ke GAS.")
                    else:
                        self.log_updated.emit(f"⚠️ [Peringatan] Batch {batch_idx + 1} gagal diproses oleh AI. Melewati batch ini.")

                    # Short wait before next batch
                    page.wait_for_timeout(1000)

                self.status_updated.emit("Tugas selesai seluruhnya.")
                self.log_updated.emit("🏁 Semua tugas untuk ayat ini telah selesai.")
                browser.close()
                self.finished_task.emit()

        except Exception as e:
            self.error_occurred.emit(str(e))
            self.finished_task.emit()

    def process_batch_with_ai(self, words_batch, translation):
        if not self.api_keys:
            self.log_updated.emit("❌ [Error] API Key kosong. Tidak bisa memanggil AI.")
            return None

        # Build prompt
        words_list_str = "\n".join([f"- Index {w['index']}: {w['word']}" for w in words_batch])
        prompt = f"""
Anda adalah seorang ahli bahasa Arab dan pakar Tafsir Al-Qur'an.
Saya memiliki beberapa kata dari Surah {self.surah}, Ayat {self.ayah}.
Terjemahan ayat ini adalah: "{translation}"

Tolong analisis kata-kata berikut secara berurutan:
{words_list_str}

Untuk setiap kata, berikan hasil analisis dalam format JSON array yang valid.
Struktur setiap objek dalam array HARUS seperti ini:
{{
  "index": (integer, index kata sesuai yang saya berikan),
  "word": "(string, teks Arab kata tersebut)",
  "analysis": "(string, narasi penjelasan analisis tata bahasa, sharaf, nahwu, i'rab, dan makna yang cocok untuk pemula, menggunakan bahasa Indonesia yang baik, gunakan format markdown untuk emphasis/bold)"
}}

Kembalikan HANYA JSON array yang valid, tanpa tambahan teks apapun di awal atau akhir, agar bisa langsung diparsing oleh program.
"""
        max_retries = len(self.api_keys)
        attempts = 0

        while attempts < max_retries:
            api_key = self.get_current_api_key()
            if not api_key:
                break

            try:
                # Setup direct call to Gemini
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
                headers = {"Content-Type": "application/json"}
                payload = {
                    "contents": [{
                        "parts": [{"text": prompt}]
                    }],
                    "generationConfig": {
                        "temperature": 0.3,
                        "response_mime_type": "application/json"
                    }
                }

                response = requests.post(url, headers=headers, json=payload, timeout=60)

                if response.status_code == 429:
                    self.log_updated.emit(f"⚠️ [QUOTA] Limit API Key terlampaui.")
                    self.rotate_api_key()
                    attempts += 1
                    continue

                if response.status_code != 200:
                    self.log_updated.emit(f"❌ [API Error] Status {response.status_code}: {response.text}")
                    self.rotate_api_key()
                    attempts += 1
                    continue

                # Success
                data = response.json()
                text_response = data.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '')

                if text_response:
                    try:
                        import json
                        results = json.loads(text_response)
                        return results
                    except json.JSONDecodeError:
                        self.log_updated.emit("❌ [JSON Error] Gagal memparsing respon dari AI.")
                        return None

            except requests.exceptions.RequestException as e:
                self.log_updated.emit(f"❌ [Network Error] Gagal memanggil API: {str(e)}")
                self.rotate_api_key()
                attempts += 1

        self.log_updated.emit("❌ [Fatal] Semua API Key gagal atau limit terlampaui.")
        return None

    def send_to_gas(self, surah, ayah, word_index, analysis_markdown):
        # The specific endpoint is inferred from the app structure. It requires form-urlencoded data.
        # This mirrors the fetch call in the main web app
        gas_url = "https://script.google.com/macros/s/AKfycbw63-L0D5aD9K_P3R-b5tHh87J2J3l_lS_7s72O4R2P1V6_xZ4sU2N_w1Q7A-K5j6-Z/exec"

        payload = {
            "surah": surah,
            "ayah": ayah,
            "wordIndex": word_index,
            "analysis": analysis_markdown,
            "version": "1.0",
            "source": "PythonRobotBatch"
        }

        try:
            # We must use follow_redirects=True or handle it, typical for GAS
            res = requests.post(gas_url, data=payload, timeout=30)
            if res.status_code == 200:
                try:
                    data = res.json()
                    return data.get('status') == 'success'
                except:
                    # Kadang GAS mengembalikan HTML bukan JSON jika tidak diformat dengan benar
                    return True # Anggap sukses jika 200 OK
            return False
        except Exception as e:
            self.log_updated.emit(f"❌ [Error GAS] {str(e)}")
            return False


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Robot My E-Quran V2 (With Pause & GSheet Monitor)")
        self.setMinimumWidth(800)
        self.setMinimumHeight(600)

        # Set Window Icon
        icon_path = resource_path("app_icon.png")
        if os.path.exists(icon_path):
            self.setWindowIcon(QIcon(icon_path))

        # Global State Variables
        self.surahs_data = []
        self.current_ayahs = []
        self.worker = None
        self.history_data = self.load_history()

        main_widget = QWidget()
        self.setCentralWidget(main_widget)
        layout = QVBoxLayout(main_widget)

        # Layout Split: Kiri Config (Kiri), Kanan Arab Viewer
        top_layout = QHBoxLayout()

        # Kiri Config
        left_config_layout = QVBoxLayout()

        config_group = QGroupBox("Pengaturan Navigasi")
        config_layout = QGridLayout()

        config_layout.addWidget(QLabel("Surah:"), 0, 0)
        self.surah_combo = QComboBox()
        self.surah_combo.currentIndexChanged.connect(self.on_surah_changed)
        config_layout.addWidget(self.surah_combo, 0, 1)

        config_layout.addWidget(QLabel("Ayat:"), 1, 0)
        self.ayah_combo = QComboBox()
        self.ayah_combo.currentIndexChanged.connect(self.on_ayah_changed)
        config_layout.addWidget(self.ayah_combo, 1, 1)

        config_layout.addWidget(QLabel("Mulai Index Ke:"), 2, 0)
        self.word_input = QLineEdit("all")
        self.word_input.setToolTip("Isi 'all' (semua), atau angka mulai (misal '2' untuk index 2 sampai habis)")
        config_layout.addWidget(self.word_input, 2, 1)

        config_group.setLayout(config_layout)
        left_config_layout.addWidget(config_group)

        # API Key Group
        options_group = QGroupBox("Konfigurasi Bot")
        options_layout = QVBoxLayout()

        self.api_key_input = QTextEdit()
        self.api_key_input.setPlaceholderText("Paste Gemini API keys (pisahkan dengan koma)")
        self.api_key_input.setMaximumHeight(60)
        options_layout.addWidget(self.api_key_input)

        self.visible_checkbox = QCheckBox("Tampilkan Browser")
        self.visible_checkbox.setChecked(True)
        options_layout.addWidget(self.visible_checkbox)

        self.auto_next_checkbox = QCheckBox("Lanjutkan ke Ayat berikutnya otomatis")
        self.auto_next_checkbox.setChecked(True)
        options_layout.addWidget(self.auto_next_checkbox)

        options_group.setLayout(options_layout)
        left_config_layout.addWidget(options_group)

        # History Panel
        self.history_label = QLabel("Belum ada history.")
        self.history_label.setWordWrap(True)
        self.history_label.setStyleSheet("color: #d35400; font-style: italic;")
        left_config_layout.addWidget(self.history_label)

        self.resume_history_btn = QPushButton("Lanjutkan dari History")
        self.resume_history_btn.setStyleSheet("background-color: #f39c12; color: white;")
        self.resume_history_btn.setEnabled(False)
        self.resume_history_btn.clicked.connect(self.resume_from_history)
        left_config_layout.addWidget(self.resume_history_btn)

        left_config_layout.addStretch()
        top_layout.addLayout(left_config_layout, 1)

        # Kanan Arab Viewer
        right_viewer_layout = QVBoxLayout()
        viewer_group = QGroupBox("Teks Ayat & Index Kata (Arab)")
        v_layout = QVBoxLayout()

        self.arabic_viewer = QTextBrowser()
        # Biarkan font besar di CSS HTML
        v_layout.addWidget(self.arabic_viewer)
        viewer_group.setLayout(v_layout)
        right_viewer_layout.addWidget(viewer_group)

        top_layout.addLayout(right_viewer_layout, 2)

        layout.addLayout(top_layout)

        # Logs & Monitor Area
        monitor_group = QGroupBox("Log Monitor & Google Sheets")
        monitor_layout = QVBoxLayout()
        self.log_console = QTextEdit()
        self.log_console.setReadOnly(True)
        self.log_console.setStyleSheet("background-color: #2c3e50; color: #ecf0f1; font-family: Consolas, monospace;")
        monitor_layout.addWidget(self.log_console)
        monitor_group.setLayout(monitor_layout)
        layout.addWidget(monitor_group)

        # Progress Status
        self.progress_bar = QProgressBar()
        self.progress_bar.setValue(0)
        layout.addWidget(self.progress_bar)

        self.status_label = QLabel("Ready.")
        self.status_label.setStyleSheet("font-weight: bold; color: blue;")
        layout.addWidget(self.status_label)

        # Control Buttons
        btn_layout = QHBoxLayout()
        self.start_btn = QPushButton("▶ Mulai Robot Baru")
        self.start_btn.setStyleSheet("background-color: #27ae60; color: white; padding: 10px; font-weight: bold;")
        self.start_btn.clicked.connect(self.start_robot)

        self.pause_btn = QPushButton("⏸ Pause")
        self.pause_btn.setStyleSheet("background-color: #f1c40f; color: black; padding: 10px; font-weight: bold;")
        self.pause_btn.setEnabled(False)
        self.pause_btn.clicked.connect(self.pause_robot)

        self.stop_btn = QPushButton("⏹ Berhenti")
        self.stop_btn.setStyleSheet("background-color: #c0392b; color: white; padding: 10px; font-weight: bold;")
        self.stop_btn.setEnabled(False)
        self.stop_btn.clicked.connect(self.stop_robot)

        btn_layout.addWidget(self.start_btn)
        btn_layout.addWidget(self.pause_btn)
        btn_layout.addWidget(self.stop_btn)
        layout.addLayout(btn_layout)

        # Initialization
        self.init_data()
        self.update_history_ui()
        self.load_config()

    def load_config(self):
        if os.path.exists(CONFIG_FILE):
            try:
                with open(CONFIG_FILE, 'r') as f:
                    cfg = json.load(f)
                    self.api_key_input.setPlainText(cfg.get("api_key", ""))
            except: pass

    def save_config(self, api_key):
        try:
            with open(CONFIG_FILE, 'w') as f:
                json.dump({"api_key": api_key}, f)
        except: pass

    def add_log(self, text):
        self.log_console.append(text)

    def init_data(self):
        self.add_log("⏳ Mengambil daftar Surah dari Al-Qur'an Cloud...")
        # Lakukan sinkron untuk simplifikasi saat init UI. Idealnya di background.
        QApplication.processEvents()
        self.surahs_data = get_surahs()
        if self.surahs_data:
            self.surah_combo.blockSignals(True)
            self.surah_combo.clear()
            for s in self.surahs_data:
                self.surah_combo.addItem(f"{s['number']}. {s['englishName']} ({s['name']})", s['number'])
            self.surah_combo.blockSignals(False)
            self.add_log(f"✅ Berhasil memuat {len(self.surahs_data)} Surah.")
            self.on_surah_changed() # Trigger load ayah
        else:
            self.add_log("❌ Gagal memuat daftar Surah. Cek internet.")

    def on_surah_changed(self):
        surah_num = self.surah_combo.currentData()
        if not surah_num: return

        self.add_log(f"⏳ Mengambil data Ayat untuk Surah {surah_num}...")
        QApplication.processEvents()
        self.current_ayahs = get_ayahs(surah_num)

        self.ayah_combo.blockSignals(True)
        self.ayah_combo.clear()
        for i, ayah in enumerate(self.current_ayahs):
            self.ayah_combo.addItem(f"Ayat {ayah['numberInSurah']}", ayah['numberInSurah'])
        self.ayah_combo.blockSignals(False)

        if self.current_ayahs:
            self.on_ayah_changed()

    def on_ayah_changed(self):
        idx = self.ayah_combo.currentIndex()
        if idx < 0 or idx >= len(self.current_ayahs): return

        ayah_data = self.current_ayahs[idx]
        text_ar = ayah_data.get('text', '')

        surah_num = int(self.surah_combo.currentData())
        ayah_num = int(self.ayah_combo.currentData())

        # Parse kata
        words = [w for w in text_ar.split() if w.strip()]

        # Remove Bismillah if Surah != 1 and Surah != 9 and Ayah == 1
        if surah_num != 1 and surah_num != 9 and ayah_num == 1:
            words = words[4:]

        # Build HTML for viewer
        html = "<div dir='rtl' style='text-align: right; line-height: 2.5;'>"
        for i, word in enumerate(words):
            html += f"<span style='display:inline-block; margin-left:10px; margin-right:10px; text-align:center; font-family: \"Amiri\", \"Traditional Arabic\", serif;'>"
            html += f"<div style='font-size:12px; color:#e74c3c; font-weight:bold; font-family: Arial, sans-serif;'>{i}</div>"
            html += f"<div style='font-size:28px; color:#2c3e50;'>{word}</div>"
            html += f"</span>"
        html += "</div>"

        self.arabic_viewer.setHtml(html)

    def load_history(self):
        if os.path.exists(HISTORY_FILE):
            try:
                with open(HISTORY_FILE, 'r') as f:
                    return json.load(f)
            except: pass
        return None

    def save_history(self, surah, ayah, completed_idx):
        self.history_data = {
            "surah": surah,
            "ayah": ayah,
            "next_index": completed_idx + 1 # Next target is the +1
        }
        try:
            with open(HISTORY_FILE, 'w') as f:
                json.dump(self.history_data, f)
            self.update_history_ui()
        except Exception as e:
            self.add_log(f"❌ Gagal menyimpan histori: {e}")

    def update_history_ui(self):
        if self.history_data:
            s_num = self.history_data.get("surah")
            a_num = self.history_data.get("ayah")
            nxt = self.history_data.get("next_index")
            self.history_label.setText(f"Histori terakhir: Surah {s_num}, Ayat {a_num}, terproses sampai Index {nxt-1}. Klik tombol Lanjutkan untuk memulai pada index {nxt}.")
            self.resume_history_btn.setEnabled(True)
        else:
            self.history_label.setText("Belum ada history.")
            self.resume_history_btn.setEnabled(False)

    def resume_from_history(self):
        if not self.history_data: return

        s_num = self.history_data.get("surah")
        a_num = self.history_data.get("ayah")
        nxt = self.history_data.get("next_index")

        # Set dropdowns
        idx_surah = self.surah_combo.findData(s_num)
        if idx_surah >= 0:
            self.surah_combo.setCurrentIndex(idx_surah)
            QApplication.processEvents()

            idx_ayah = self.ayah_combo.findData(a_num)
            if idx_ayah >= 0:
                self.ayah_combo.setCurrentIndex(idx_ayah)

        self.word_input.setText(str(nxt))
        self.add_log(f"🔄 Melanjutkan dari Histori: Surah {s_num}, Ayat {a_num}, Mulai Index {nxt}.")
        self.start_robot()

    def start_robot(self):
        surah = self.surah_combo.currentData()
        ayah = self.ayah_combo.currentData()
        target_word = self.word_input.text().strip()

        if target_word.lower() != 'all':
            try:
                int(target_word)
            except ValueError:
                QMessageBox.warning(self, "Error Input", "Batas Index mulai harus berupa angka (contoh: 0, 1, 2) atau tulisan 'all'.")
                return

        api_key = self.api_key_input.toPlainText()
        headless = not self.visible_checkbox.isChecked()

        self.save_config(api_key)

        # How many words in this ayah from our api data?
        idx = self.ayah_combo.currentIndex()
        if idx < 0: return
        ayah_data = self.current_ayahs[idx]
        total_app_words = len([w for w in ayah_data.get('text', '').split() if w.strip()])

        self.set_ui_state(False)
        self.progress_bar.setValue(0)
        self.log_console.clear()
        self.add_log("=== MULAI PROSES ROBOT ===")

        self.worker = PlaywrightWorker(surah, ayah, target_word, total_app_words, api_key, headless)
        self.worker.status_updated.connect(self.on_status_updated)
        self.worker.log_updated.connect(self.add_log)
        self.worker.progress_updated.connect(self.on_progress_updated)
        self.worker.error_occurred.connect(self.on_error_occurred)
        self.worker.finished_task.connect(self.on_finished)
        self.worker.word_completed.connect(self.save_history)

        self.worker.start()

    def pause_robot(self):
        if self.worker is not None:
            self.worker.toggle_pause()
            if self.worker.is_paused:
                self.pause_btn.setText("▶ Resume")
                self.pause_btn.setStyleSheet("background-color: #3498db; color: white; padding: 10px; font-weight: bold;")
                self.status_label.setText("Status: Mem-pause saat iterasi saat ini selesai...")
            else:
                self.pause_btn.setText("⏸ Pause")
                self.pause_btn.setStyleSheet("background-color: #f1c40f; color: black; padding: 10px; font-weight: bold;")
                self.status_label.setText("Status: Melanjutkan iterasi...")

    def stop_robot(self):
        if self.worker is not None:
            self.worker.stop()
            self.status_label.setText("Status: Membatalkan tugas, tunggu browser tertutup...")
            self.stop_btn.setEnabled(False)
            self.pause_btn.setEnabled(False)

    def set_ui_state(self, enabled):
        self.surah_combo.setEnabled(enabled)
        self.ayah_combo.setEnabled(enabled)
        self.word_input.setEnabled(enabled)
        self.resume_history_btn.setEnabled(enabled and bool(self.history_data))
        self.api_key_input.setEnabled(enabled)
        self.visible_checkbox.setEnabled(enabled)

        self.start_btn.setEnabled(enabled)
        self.stop_btn.setEnabled(not enabled)
        self.pause_btn.setEnabled(not enabled)

    def on_status_updated(self, msg):
        self.status_label.setText(f"Status: {msg}")

    def on_progress_updated(self, current, total, text):
        self.progress_bar.setMaximum(total)
        self.progress_bar.setValue(current)

    def on_error_occurred(self, err_msg):
        QMessageBox.critical(self, "Robot Error", f"Terjadi kesalahan pada bot:\n{err_msg}")
        self.status_label.setText("Status: Berhenti karena error.")
        self.progress_bar.setValue(0)

    def on_finished(self):
        self.set_ui_state(True)
        self.pause_btn.setText("⏸ Pause")
        self.pause_btn.setStyleSheet("background-color: #f1c40f; color: black; padding: 10px; font-weight: bold;")

        if "error" not in self.status_label.text().lower() and "membatalkan" not in self.status_label.text().lower():
            # If auto-next is enabled and the word target was 'all' (it successfully completed an ayah without error)
            if self.auto_next_checkbox.isChecked() and self.word_input.text().strip().lower() == 'all':
                current_idx = self.ayah_combo.currentIndex()
                if current_idx < self.ayah_combo.count() - 1:
                    self.add_log(f"🔄 Berpindah otomatis ke Ayat {current_idx + 2}...")
                    self.ayah_combo.setCurrentIndex(current_idx + 1)
                    QApplication.processEvents() # allow UI update
                    self.start_robot() # Loop to next ayah automatically
                    return
                else:
                    current_surah_idx = self.surah_combo.currentIndex()
                    if current_surah_idx < self.surah_combo.count() - 1:
                        self.add_log(f"🔄 Surah telah selesai, Berpindah otomatis ke Surah berikutnya...")
                        self.surah_combo.setCurrentIndex(current_surah_idx + 1)
                        QApplication.processEvents() # Wait for ayahs to populate
                        self.ayah_combo.setCurrentIndex(0) # Ensure it starts at Ayah 1
                        QApplication.processEvents()
                        self.start_robot() # Start the newly loaded Surah
                        return
                    else:
                        self.status_label.setText("Status: Al-Quran telah selesai seluruhnya 114 Surah!")
            else:
                self.status_label.setText("Status: Proses ayat selesai! Ready.")

        self.add_log("=== PROSES SELESAI / BERHENTI ===")

if __name__ == "__main__":
    app = QApplication(sys.argv)
    app.setStyle("Fusion")

    window = MainWindow()
    window.show()
    sys.exit(app.exec())
