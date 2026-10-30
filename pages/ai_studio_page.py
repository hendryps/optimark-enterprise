"""Page object AI Marketing Studio (/ai-marketing-studio) (tiket Jira RO-25, RO-26, RO-27)."""
from playwright.sync_api import expect

from pages.base_page import BasePage, rx

# Grup alat di panel kiri beserta jumlah fitur di dalamnya (sesuai staging 30 Okt 2026)
TOOL_GROUPS = {"AI Image": 3, "AI Video": 2, "AI Writing": 2}


class AiStudioPage(BasePage):
    """AI Marketing Studio: grup alat, form Image Generator, dan My Project."""

    def open(self) -> "AiStudioPage":
        """Buka Studio dan tunggu judulnya."""
        self.goto("/ai-marketing-studio")
        expect(self.page.get_by_text(rx("AI Marketing Studio")).first).to_be_visible(timeout=30000)  # judul bukan role=heading
        return self

    def group(self, name: str):
        """Tombol grup alat, mis. group("AI Image") (teksnya memuat jumlah fitur)."""
        return self.page.get_by_role("main").get_by_role("button", name=rx(name))

    def tool(self, name: str):
        """Tombol satu alat, mis. tool("Image Enhancer")."""
        return self.page.get_by_role("main").get_by_role("button", name=rx(name))

    @property
    def prompt(self):
        """Kolom prompt pada form Image Generator."""
        return self.page.get_by_role("main").get_by_role("textbox").first

    @property
    def generate_button(self):
        """Tombol Generate."""
        return self.page.get_by_role("main").get_by_role("button", name="Generate", exact=True)

    @property
    def minus(self):
        """Tombol '-' pada stepper Variations."""
        return self.page.get_by_role("main").get_by_role("button", name="-", exact=True)

    @property
    def plus(self):
        """Tombol '+' pada stepper Variations."""
        return self.page.get_by_role("main").get_by_role("button", name="+", exact=True)
