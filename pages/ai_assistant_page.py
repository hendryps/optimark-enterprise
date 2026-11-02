"""Page object menu AI Assistant (/ai-assistant): chat, pengaturan Audience/Budget, riwayat (ASST)."""
import re
import time

from playwright.sync_api import expect

from pages.base_page import BasePage, rx
from utils import config


class AssistantPage(BasePage):
    """AI Assistant: chat, pengaturan Audience/Budget, riwayat percakapan (ASST).

    Catatan staging: Enter = baris baru, Ctrl/Cmd+Enter = kirim.
    """

    def open(self) -> "AssistantPage":
        """Buka AI Assistant dan tunggu kolom chat tampil."""
        self.goto("/ai-assistant")
        expect(self.input).to_be_visible(timeout=20000)  # halaman sempat 'Loading...'
        return self

    @property
    def input(self):
        """Kolom tempat mengetik pesan/prompt."""
        return self.page.get_by_role("textbox", name=rx("Ask anything", "Tanyakan", "Tulis"))

    @property
    def send_button(self):
        """Tombol 'Send message'."""
        return self.button("Send message", "Kirim")

    @property
    def new_chat_button(self):
        """Tombol 'New chat' untuk memulai percakapan baru."""
        return self.button("New chat", "Chat Baru").first

    @property
    def settings_button(self):
        """Tombol gabungan 'General · Budget Medium' (Audience + Budget)."""
        return self.page.get_by_role("button", name=re.compile(r"Budget\s+(Low|Medium|High)", re.I))

    @property
    def audience_select(self):
        """<select> Audience (General, B2B, B2C, Local Market); ada setelah panel pengaturan dibuka."""
        return self.page.locator("select").nth(0)

    @property
    def budget_select(self):
        """<select> Budget (Low, Medium, High)."""
        return self.page.locator("select").nth(1)

    @property
    def history_search(self):
        """Kolom pencarian riwayat percakapan."""
        return self.page.get_by_role("searchbox")

    @property
    def chat_area(self):
        """Area utama tempat balasan chat muncul."""
        return self.page.get_by_role("main")

    @property
    def user_messages(self):
        """Bubble pesan pengguna di area percakapan (bukan judul header / daftar riwayat)."""
        return self.page.locator("div.justify-end p.whitespace-pre-wrap")

    @property
    def ai_messages(self):
        """Balasan 'Optimark AI' di area percakapan, berurutan dari atas ke bawah."""
        return self.page.locator(r"div.group\/msg")

    def send(self, prompt: str) -> None:
        """Isi prompt lalu klik Send message."""
        self.input.fill(prompt)
        self.send_button.click()

    def send_with_shortcut(self, prompt: str) -> None:
        """Kirim dengan Ctrl+Enter (cara kirim di staging)."""
        self.input.fill(prompt)
        self.input.press("Control+Enter")

    def new_chat(self) -> None:
        """Mulai percakapan baru dan pastikan area chat bersih (kolom input kosong, sapaan awal tampil)."""
        self.new_chat_button.click()
        self._answered = 0
        expect(self.input).to_have_value("")
        expect(self.page.get_by_role("heading", name=rx("What can I help you with", "Apa yang"))).to_be_visible()

    _answered = 0  # jumlah balasan AI yang sudah selesai ditunggu; balasan berikutnya = indeks ini

    # Teks sementara yang ditampilkan AI selagi masih bekerja ("Sedang membuat caption... Tunggu sebentar ya!")
    LOADING_TEXT = rx("Sedang membuat", "Sedang memproses", "Tunggu sebentar", "Mohon tunggu",
                      "Generating", "Thinking", "Please wait", "Working on")

    @property
    def loading_indicator(self):
        """Spinner yang tampil selama AI memproses (mis. kartu 'Caption ready' yang berputar).

        Sengaja TIDAK memakai selector class*=loading/spinner: itu cocok dengan tombol permanen
        di halaman sehingga test menunggu sampai timeout padahal jawaban sudah keluar.
        """
        return self.ai_messages.locator(".animate-spin, [role=progressbar], [aria-busy=true]").filter(visible=True)

    def wait_for_answer(self, prompt: str, min_chars: int = 20, stable_secs: int = 3) -> str:
        """Tunggu AI BENAR-BENAR selesai menjawab `prompt`, lalu kembalikan teks jawabannya.

        Selesai = bubble pesan pengguna tampil, balasan AI baru muncul, TIDAK ada spinner, TIDAK ada
        teks sementara ('Sedang membuat... Tunggu sebentar'), jawaban minimal `min_chars` karakter,
        dan isinya tidak berubah selama `stable_secs` detik. Prompt berikutnya baru boleh dikirim sesudah ini.
        Kutipan ulang prompt di jawaban ('Pertanyaan Anda: "..."') dibuang supaya cek topik tidak
        lolos hanya karena AI mengulang pertanyaan.
        """
        expect(self.user_messages.filter(has_text=prompt).last).to_be_visible(timeout=20000)
        deadline = time.monotonic() + config.GENERATE_TIMEOUT_MS / 1000
        last, same_for = "", 0
        while time.monotonic() < deadline:
            current = ""
            if self.ai_messages.count() > self._answered:
                current = self.ai_messages.nth(self._answered).inner_text().replace(prompt, "").strip()
            busy = self.loading_indicator.count() > 0 or bool(self.LOADING_TEXT.search(current))
            same_for = same_for + 1 if (not busy and current == last and len(current) >= min_chars) else 0
            if same_for >= stable_secs:
                self._answered += 1  # prompt berikutnya menunggu balasan AI berikutnya
                return current
            last = current
            self.page.wait_for_timeout(1000)
        raise AssertionError(f"AI belum selesai menjawab dalam {config.GENERATE_TIMEOUT_MS} ms untuk: {prompt!r}\n"
                             f"Teks terakhir: {last[:300]!r}")

    def ask(self, prompt: str) -> str:
        """Kirim prompt, tunggu jawaban AI selesai, kembalikan teks jawabannya."""
        self.send(prompt)
        return self.wait_for_answer(prompt)

    @staticmethod
    def assert_on_topic(answer: str, *keywords: str) -> None:
        """Jawaban harus menyebut minimal satu kata kunci topik (tidak peka huruf besar/kecil)."""
        low = answer.lower()
        assert any(k.lower() in low for k in keywords), (
            f"Jawaban tidak sesuai topik. Kata kunci {keywords} tidak ditemukan di: {answer[:300]!r}")
