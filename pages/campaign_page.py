"""Page object menu Campaign: daftar (/campaign) dan form buat campaign (/campaign/create)."""
from playwright.sync_api import expect

from pages.base_page import BasePage, rx


class CampaignPage(BasePage):
    """Menu Campaign: daftar (/campaign) dan form buat campaign (/campaign/create)."""

    def open(self) -> "CampaignPage":
        """Buka daftar campaign."""
        self.goto("/campaign")
        expect(self.page.get_by_role("heading", name="Campaign").first).to_be_visible(timeout=30000)
        return self

    def open_create(self) -> "CampaignPage":
        """Langsung buka form 'Create New Campaign'."""
        self.goto("/campaign/create")
        expect(self.page.get_by_role("heading", name=rx("Create New Campaign"))).to_be_visible(timeout=30000)
        return self

    # --- halaman daftar ---
    @property
    def create_button(self):
        """Link/tombol 'Create Campaign' di halaman daftar."""
        return self.page.get_by_role("main").get_by_role("link", name="Create Campaign").first

    @property
    def search(self):
        """Kolom pencarian campaign."""
        return self.page.get_by_placeholder(rx("Search campaigns"))

    @property
    def status_filter(self):
        """<select> filter status pada daftar (All Status, Draft, Active, ...)."""
        return self.page.get_by_role("main").locator("select").first

    @property
    def empty_state(self):
        """Teks 'No campaigns yet' saat belum ada campaign."""
        return self.page.get_by_text("No campaigns yet")

    # --- form buat campaign ---
    @property
    def name_input(self):
        """Input nama campaign."""
        return self.page.get_by_placeholder(rx("Example: Q2 2026 Campaign"))

    @property
    def objective_select(self):
        """<select> tujuan campaign (dropdown pertama di form)."""
        return self.page.get_by_role("main").locator("select").nth(0)

    @property
    def status_select(self):
        """<select> status campaign (dropdown kedua di form)."""
        return self.page.get_by_role("main").locator("select").nth(1)

    @property
    def submit_button(self):
        """Tombol 'Create Campaign' untuk menyimpan form."""
        return self.page.get_by_role("main").get_by_role("button", name="Create Campaign", exact=True)

    @property
    def cancel_button(self):
        """Tombol Cancel pada form."""
        return self.page.get_by_role("main").get_by_role("button", name="Cancel", exact=True)

    @property
    def back_button(self):
        """Tombol Back pada form."""
        return self.page.get_by_role("main").get_by_role("button", name="Back", exact=True)

    @staticmethod
    def options(select) -> list[str]:
        """Teks semua opsi pada <select> (tanpa opsi kosong)."""
        return [t.strip() for t in select.locator("option").all_inner_texts() if t.strip()]
