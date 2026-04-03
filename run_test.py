import sys
import os
import json
from PySide6.QtWidgets import QApplication
from PySide6.QtGui import QPixmap
from PySide6.QtCore import QTimer

# Add robot-equran to path
sys.path.append(os.path.abspath('robot-equran'))

from bot_gui import MainWindow

def run_test():
    app = QApplication(sys.argv)

    api_keys = "AIzaSyDL9nnwzi4sTDl8YEpAoDvz_4ZwsDqb3aE, AIzaSyC4l5LtFdxTDU64xBX3pA705d8wUAA7Hfw, AIzaSyATzt5tdIoxTxYU-_RvAEnRGc0Tx8lLv2A, AIzaSyDuXGvmwM9yIe3YmNEpAu5TLTctRKbySs8, AIzaSyAZCBK4NiCLVAM2W8NvmijbmRyAIhhWH0w, AIzaSyATGnp0biFwKMCGAIrJoqu9xYtBx-mRex4, AIzaSyABShe0T9pjGp2Hk4yGXvYz-7wGkHH9b6M, AIzaSyBLRxx3Kqkx0WQIa30plikutDSFS-9uBDk, AIzaSyDquhmJie9q2LmObFkE3d_NZQs5E6YjW5Q, AIzaSyDTZ6CF3o3lMnfS_0uGhzISbhgyouv1mcM, AIzaSyBVxdiK244xi_eMfzCWYec_FRCfqXJwmUk, AIzaSyAj9yNedsAliL4BDiTWUh0GqiSOWQVszYg, AIzaSyDhIh3uGFVm9fYcgPGPA_YO0wkbn7RN6AY, AIzaSyC8PZqFYl8Is2klO6vDuH5cmQxPXYNhnCk, AIzaSyAV032BSwXkBOEUiZmnvye7ERpAdmBa5SE, AIzaSyDgz7T5zk7Nh75eSJoxuY7Xe25hcHVwKRM, AIzaSyAZjHyTW0qqbycAyC_u0Pa1vNihA_g3xL0, AIzaSyBm0oSvkbmVrlspopEGIOZwYgugOCD_X0M, AIzaSyCU2jZl13GbMW97RU2o2v4_itaFxS1dA5Y, AIzaSyA1CYZpWfKLzqoZZ_UuZ5RyqJUXdvcjWZE, AIzaSyDi3N14a1bjpnBPRvS34T-qvgXUNjFZnZE, AIzaSyA8xLwNdATjNXwgnE_DuOBk_oLFetv-gTc, AIzaSyBR8BS2I4j743HsVzN6mdigMnDwR5RSGI0, AIzaSyA2jRwCYgTAk-BVPfGxSfJ1k49C37C21sU, AIzaSyBSBblWzJ73bYlBZR4RV2kuTa4TO_1iz3U, AIzaSyAHFIJOFyBwzEps-xTgY5SmO2JHK-eIPrM, AIzaSyAhsI76b79GhV_fy2yNf3911D8akm072y0, AIzaSyBMeV5TqD-s4A4hBQ-pqPVAvztOOzE97lw"

    with open('robot-equran/config.json', 'w') as f:
        json.dump({"api_key": api_keys}, f)

    window = MainWindow()
    window.api_key_input.setPlainText(api_keys) # Force set it incase config load missed
    window.resize(1000, 800)
    window.show()

    def start_testing():
        print("Starting test for Surah 112...")
        idx = window.surah_combo.findData(112)
        if idx >= 0:
            window.surah_combo.setCurrentIndex(idx)
        else:
            print("Surah 112 not found")
            app.quit()
            return

        # Hide browser (Headless mode)
        window.visible_checkbox.setChecked(False)

        # Enable auto next
        window.auto_next_checkbox.setChecked(True)

        def check_finish():
            print("Worker finished task...")
            # Check if it was the last ayah of Surah 112 (Ayat 4)
            if window.ayah_combo.currentIndex() == 3 or "Surah berikutnya" in window.log_console.toPlainText():
                print("Finished Surah 112. Stopping robot to prevent moving to 113.")
                window.auto_next_checkbox.setChecked(False)
                QTimer.singleShot(3000, take_screenshot_and_exit)
            elif window.ayah_combo.currentIndex() == window.ayah_combo.count() - 1:
                QTimer.singleShot(3000, take_screenshot_and_exit)

        original_start = window.start_robot
        def hooked_start():
            original_start()
            if window.worker:
                window.worker.finished_task.connect(check_finish)
                # Print errors to console for visibility
                window.worker.error_occurred.connect(lambda e: print(f"WORKER ERROR: {e}"))
                window.worker.log_updated.connect(lambda msg: print(f"LOG: {msg}"))

        window.start_robot = hooked_start

        # Start immediately
        window.start_robot()

    def take_screenshot_and_exit():
        print("Taking screenshot...")
        pixmap = window.grab()
        pixmap.save("test_result.png")
        with open("test_log.txt", "w") as f:
            f.write(window.log_console.toPlainText())
        app.quit()

    # Wait 5 seconds for Surah list to load
    QTimer.singleShot(5000, start_testing)

    # Hard timeout 3 minutes
    QTimer.singleShot(180000, take_screenshot_and_exit)

    # Enable global exception hook
    import traceback
    def excepthook(exc_type, exc_value, exc_tb):
        print(f"Exception: {''.join(traceback.format_exception(exc_type, exc_value, exc_tb))}")
    sys.excepthook = excepthook

    sys.exit(app.exec())

if __name__ == "__main__":
    run_test()
