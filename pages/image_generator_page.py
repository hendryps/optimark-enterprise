"""Page object Image Generator (/image-generator) (E2E-06). Semua logika ada di GeneratorPage."""
from playwright.sync_api import Locator

from pages.base_generator_page import GeneratorPage


class ImageGeneratorPage(GeneratorPage):
    """Halaman Image Generator. PATH/PROMPT_HINT/GENERATE_NAME dipakai oleh GeneratorPage."""
    PATH = "/image-generator"
    PROMPT_HINT = "Describe the image"
    GENERATE_NAME = "Generate image"
    PRICE_HINT = "/ Image"

    def gallery(self) -> Locator:
        """Kartu gambar inspirasi di tab Explore."""
        return self.page.get_by_role("figure")
