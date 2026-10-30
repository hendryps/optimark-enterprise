"""Page object menu Media Library (/media-library) (E2E-09): folder, upload, kategori, filter, Grid/List."""
from playwright.sync_api import expect

from pages.base_page import BasePage, rx

CATEGORIES = ["All", "Images", "Videos", "Articles"]


class MediaLibraryPage(BasePage):
    """Menu Media Library (/media-library): folder, upload, kategori, filter, tampilan Grid/List."""

    def open(self) -> "MediaLibraryPage":
        """Buka Media Library dan tunggu judulnya tampil."""
        self.goto("/media-library")
        expect(self.page.get_by_role("heading", name="Media Library")).to_be_visible(timeout=30000)
        return self

    @property
    def create_folder_button(self):
        """Tombol 'Create Folder'."""
        return self.page.get_by_role("main").get_by_role("button", name="Create Folder", exact=True)

    @property
    def upload_button(self):
        """Tombol 'Upload'."""
        return self.page.get_by_role("main").get_by_role("button", name="Upload", exact=True)

    def category(self, name: str):
        """Kategori All/Images/Videos/Articles (berupa button, bukan tab)."""
        return self.page.get_by_role("main").get_by_role("button", name=rx(name, exact=True))

    @property
    def search(self):
        """Kolom pencarian media."""
        return self.page.get_by_placeholder("Search media")  # input type=search

    @property
    def filter_button(self):
        """Tombol 'Filter media' (panel Source dan Ratio)."""
        return self.button("Filter media")

    @property
    def grid_view(self):
        """Tombol tampilan Grid."""
        return self.button("Grid view")

    @property
    def list_view(self):
        """Tombol tampilan List."""
        return self.button("List view")

    @property
    def dialog(self):
        """Dialog/popup yang sedang terbuka (New Folder atau Upload media)."""
        return self.page.get_by_role("dialog")

    @property
    def empty_state(self):
        """Teks 'No media found' saat tidak ada hasil."""
        return self.page.get_by_text("No media found")
