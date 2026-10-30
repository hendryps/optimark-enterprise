"""Page object Content Composer / Content Planner (/content-composer) (E2E-04)."""
import re

from playwright.sync_api import expect

from pages.base_page import BasePage, rx

# (Inggris, Indonesia)
TAB_DRAFT = ("Draft",)
TAB_SCHEDULED = ("Scheduled", "Dijadwalkan")
TAB_PUBLISHED = ("Published", "Diterbitkan")
STATUS_TABS = [TAB_DRAFT, TAB_SCHEDULED, TAB_PUBLISHED]


class ComposerPage(BasePage):
    """Content Composer / Content Planner: List, Calendar, dan form Create Post (E2E-04)."""

    def open(self) -> "ComposerPage":
        """Buka Content Composer dan tunggu tombol Create Post tampil."""
        self.goto("/content-composer")
        expect(self.create_post_button).to_be_visible()
        return self

    # --- header & tampilan ---
    @property
    def create_post_button(self):
        """Tombol/link 'Create Post'."""
        return self.button("Create Post", "Buat Postingan").or_(
            self.page.get_by_role("link", name=rx("Create Post", "Buat Postingan"))).first

    def view_tab(self, *names: str):
        """Tab tampilan: List / Calendar (Kalender)."""
        return self.page.get_by_role("tab", name=rx(*names, exact=True))

    def status_tab(self, names: tuple):
        """Tab status konten: Draft / Scheduled / Published."""
        return self.page.get_by_role("tab", name=rx(*names))

    def status_badge(self, names: tuple) -> int:
        """Angka pada badge tab status (0 kalau tidak ada angka)."""
        digits = re.findall(r"\d+", self.status_tab(names).inner_text())
        return int(digits[-1]) if digits else 0

    @property
    def rows(self):
        """Baris konten pada tampilan List (tanpa baris header)."""
        return self.page.get_by_role("main").locator("[role=row]:not(:has([role=columnheader]))")

    # --- kalender ---
    def cal_nav(self, name: str):
        """Kontrol navigasi kalender: 'Previous' | 'Today' | 'Next' (di staging berupa role=radio)."""
        return self.page.get_by_role("radiogroup", name="Calendar navigation").get_by_role(
            "radio", name=rx(name, exact=True))

    def calendar_title(self) -> str:
        """Judul bulan kalender, mis. 'October 2026'."""
        months = "January|February|March|April|May|June|July|August|September|October|November|December"
        return self.page.get_by_text(re.compile(rf"^\s*(?:{months})\s+20\d\d\s*$", re.I)).first.inner_text()

    # --- pencarian & filter ---
    @property
    def search(self):
        """Kolom pencarian konten."""
        return self.page.get_by_role("textbox", name=rx("Search content", "Cari konten"))

    @property
    def type_filter(self):
        """Dropdown filter jenis konten."""
        return self.page.get_by_role("combobox", name=rx("Content type", "Jenis konten"))

    def choose_filter(self, combo, option: str) -> None:
        """Buka dropdown lalu pilih satu opsi."""
        combo.click()
        self.page.get_by_role("option", name=rx(option)).first.click()

    @property
    def empty_state(self):
        """Pesan state kosong, mis. 'No drafts to display'."""
        return self.page.get_by_text(rx("No drafts", "No scheduled", "No published", "No content", "Tidak ada", "tidak ditemukan"))

    # --- form Create Post (halaman /content-composer/create) ---
    def open_create_form(self) -> None:
        """Langsung buka halaman form Create Post."""
        self.goto("/content-composer/create")
        self.page.wait_for_load_state("networkidle")  # tunggu React siap supaya klik switch tidak hilang

    @property
    def title(self):
        """Input judul/nama postingan."""
        return self.page.get_by_label(rx("Post title", "Post name", "Nama/Judul Postingan", "Judul")).first

    @property
    def caption(self):
        """Input caption postingan."""
        return self.page.get_by_label(rx("Caption")).or_(
            self.page.get_by_placeholder(rx("caption"))).first

    @property
    def schedule_button(self):
        """Tombol 'Schedule Now'."""
        return self.button("Schedule Now", "Jadwalkan Sekarang")

    @property
    def draft_button(self):
        """Tombol simpan draft ('Finish Later' / 'Save Draft')."""
        return self.button("Finish Later", "Save Draft", "Selesaikan Nanti")

    @property
    def cancel_button(self):
        """Tombol Cancel."""
        return self.button("Cancel", "Batal", exact=True)

    def upload_media(self, file) -> None:
        """Upload gambar/video ke postingan."""
        self.upload(file)

    # --- toggle Use Brand Hub & picker Media Library di form Create Post (ODA-230, ODA-143) ---
    @property
    def use_brand_hub(self):
        """Switch 'Use Brand Hub' (switch pertama di form Create Post)."""
        return self.page.get_by_role("switch").first

    @property
    def library_button(self):
        """Tombol 'Media Library' di bagian media (membuka picker)."""
        return self.page.get_by_role("main").get_by_role("button", name="Media Library").first

    @property
    def post_name(self):
        """Input 'Post Name / Title'."""
        return self.page.get_by_role("main").get_by_role("textbox").first
