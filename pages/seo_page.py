"""Page object menu SEO (/seo): Growth Intel dengan 9 tab."""
from playwright.sync_api import expect

from pages.base_page import BasePage, rx

# Tab pada halaman Growth Intel · SEO (urutan sesuai tampilan)
TABS = ["Overview", "Content Ideas", "Content Optimizer", "Keywords", "Rank Tracking",
        "Backlinks", "Competitors", "Site Audit", "AI SEO"]


class SeoPage(BasePage):
    """Menu SEO (/seo): Growth Intel dengan 9 tab."""

    def open(self) -> "SeoPage":
        """Buka halaman SEO dan tunggu judul 'Growth Intel' tampil."""
        self.goto("/seo")
        expect(self.page.get_by_role("heading", name=rx("Growth Intel"))).to_be_visible(timeout=30000)
        return self

    def tab(self, name: str):
        """Tab berdasarkan nama, mis. seo.tab("Keywords")."""
        return self.page.get_by_role("tab", name=rx(name, exact=True))

    @property
    def url_input(self):
        """Input URL halaman yang ingin dianalisis."""
        return self.page.get_by_placeholder("https://example.com/page")

    @property
    def keyword_input(self):
        """Input kata kunci target."""
        return self.page.get_by_placeholder(rx("target keyword"))

    @property
    def analyze_button(self):
        """Tombol 'Analyze'."""
        return self.button("Analyze", exact=True)
