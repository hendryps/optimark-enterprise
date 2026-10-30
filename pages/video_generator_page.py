"""Page object Video Generator (/video-generator) (E2E-07). Semua logika ada di GeneratorPage."""
from playwright.sync_api import Locator

from pages.base_generator_page import GeneratorPage


class VideoGeneratorPage(GeneratorPage):
    """Halaman Video Generator. PATH/PROMPT_HINT/GENERATE_NAME dipakai oleh GeneratorPage."""
    PATH = "/video-generator"
    PROMPT_HINT = "Describe the video"
    GENERATE_NAME = "Generate video"

    def gallery(self) -> Locator:
        """Daftar video/gambar contoh di tab Explore."""
        return self.page.get_by_role("main").locator("video, figure")
