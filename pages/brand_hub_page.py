"""Page object menu Brand Hub (/brand-hub): ringkasan dan form identitas brand."""
from playwright.sync_api import expect

from pages.base_page import BasePage, rx

# Daftar tab sesuai urutan di layar
TABS = ["Overview", "Brand Profile", "Visual Identity", "Customer Profiles", "Guardrails",
        "Content Themes", "Social Links"]
# Tab yang di staging masih "being prepared" (belum bisa dipakai)
COMING_SOON = ["Customer Profiles", "Guardrails", "Content Themes", "Social Links"]


class BrandHubPage(BasePage):
    """Menu Brand Hub (/brand-hub): ringkasan dan form identitas brand."""

    def open(self) -> "BrandHubPage":
        """Buka Brand Hub dan tunggu tab Overview tampil."""
        self.goto("/brand-hub")
        expect(self.tab("Overview")).to_be_visible(timeout=30000)
        return self

    def tab(self, name: str):
        """Tab berdasarkan namanya, mis. brand_hub.tab("Brand Profile")."""
        return self.page.get_by_role("tab", name=rx(name, exact=True))

    def open_tab(self, name: str) -> None:
        """Klik tab lalu pastikan tab itu benar-benar terpilih (aria-selected=true)."""
        self.tab(name).click()
        expect(self.tab(name)).to_have_attribute("aria-selected", "true")

    @property
    def company(self):
        """Input nama perusahaan/bisnis."""
        return self.page.get_by_label(rx("Company / Business Name", "Business Name")).first

    @property
    def save_button(self):
        """Tombol Save di area utama halaman."""
        return self.page.get_by_role("main").get_by_role("button", name="Save", exact=True)

    @property
    def cancel_button(self):
        """Tombol Cancel di area utama halaman."""
        return self.page.get_by_role("main").get_by_role("button", name="Cancel", exact=True)

    # --- Fetch from Website (ODA-218) ---
    @property
    def fetch_button(self):
        """Tombol 'Fetch from Website' di tab Brand Profile."""
        return self.page.get_by_role("main").get_by_role("button", name="Fetch from Website")

    @property
    def dialog(self):
        """Dialog yang sedang terbuka (Fetch Profile from Website / form persona)."""
        return self.page.get_by_role("dialog")

    @property
    def fetch_url(self):
        """Input 'Website URL' di dialog crawl."""
        return self.dialog.get_by_role("textbox").first

    @property
    def start_crawl(self):
        """Tombol 'Start Crawl' di dialog."""
        return self.dialog.get_by_role("button", name="Start Crawl")

    def try_crawl(self, url: str) -> list:
        """Isi URL lalu Start Crawl. Mengembalikan daftar (status, url) respons POST /crawl yang terjadi."""
        calls = []
        self.page.on("response", lambda r: calls.append((r.status, r.url))
                     if r.request.method == "POST" and r.url.endswith("/crawl") else None)  # hanya POST yang memulai crawl
        self.fetch_button.click()
        self.fetch_url.fill(url)
        self.start_crawl.click()
        self.page.wait_for_timeout(4000)  # beri waktu server menjawab
        return calls

    # --- Customer Persona (ODA-219) ---
    @property
    def fill_manually_button(self):
        """Tombol 'Fill Manually' pada state kosong Customer Persona."""
        return self.page.get_by_role("main").get_by_role("button", name="Fill Manually")
