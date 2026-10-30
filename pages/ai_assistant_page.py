"""Page object menu AI Assistant (/ai-assistant): chat, pengaturan Audience/Budget, riwayat (E2E-05)."""
import re

from playwright.sync_api import expect

from pages.base_page import BasePage, rx
from utils import config


class AssistantPage(BasePage):
    """AI Assistant: chat, pengaturan Audience/Budget, riwayat percakapan (E2E-05).

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

    def send(self, prompt: str) -> None:
        """Isi prompt lalu klik Send message."""
        self.input.fill(prompt)
        self.send_button.click()

    def send_with_shortcut(self, prompt: str) -> None:
        """Kirim dengan Ctrl+Enter (cara kirim di staging)."""
        self.input.fill(prompt)
        self.input.press("Control+Enter")

    def wait_for_answer(self) -> None:
        """Tunggu AI selesai menjawab: tombol Send kembali tersedia dan input kosong."""
        expect(self.input).to_have_value("", timeout=config.GENERATE_TIMEOUT_MS)
