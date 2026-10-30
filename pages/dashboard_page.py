"""Page object Dashboard (/dashboard) (E2E-03): kartu statistik, filter periode, sidebar."""
from playwright.sync_api import expect

from pages.base_page import BasePage, rx

# (Inggris, Indonesia) untuk filter periode, urut sesuai tampilan
PERIODS = {
    "24h": ("24 hours", "24 jam"),
    "7d": ("7 days", "7 hari"),
    "30d": ("30 days", "30 hari"),
    "1y": ("1 year", "1 tahun"),
}
CARD_CONTENT = ("Total Content", "Total Konten")
CARD_SCHEDULED = ("Scheduled Content", "Konten Dijadwalkan")
CARD_ADS = ("Total Ads",)
# Menu sidebar yang ada di staging (link) beserta URL tujuannya
SIDEBAR = {
    "Dashboard": "/dashboard",
    "Content Composer": "/content-composer",
    "AI Assistant": "/ai-assistant",
    "Image Generator": "/image-generator",
    "Media Library": "/media-library",
    "Brand Hub": "/brand-hub",
    "Video Generator": "/video-generator",
    "Campaign": "/campaign",
    "Billing": "/billing",
}


class DashboardPage(BasePage):
    """Dashboard (E2E-03)."""

    def open(self) -> "DashboardPage":
        """Buka Dashboard dan tunggu judul halaman tampil."""
        self.goto("/dashboard")
        expect(self.page.get_by_role("heading", level=1)).to_be_visible()
        return self

    def period(self, key: str):
        """Tombol filter periode: key = '24h' | '7d' | '30d' | '1y'."""
        return self.button(*PERIODS[key], exact=True)

    def select_period(self, key: str) -> None:
        """Klik filter periode: '24h' | '7d' | '30d' | '1y'."""
        self.period(key).click()

    def content_total(self) -> int:
        """Angka pada kartu Total Content."""
        return self.number_near(*CARD_CONTENT)

    def scheduled_total(self) -> int:
        """Angka pada kartu Scheduled Content."""
        return self.number_near(*CARD_SCHEDULED)

    @property
    def not_connected_banner(self):
        """Banner 'Social Media Account Not Connected' (ada selama belum ada platform terhubung)."""
        return self.page.get_by_role("heading", name=rx("Not Connected", "Belum Terhubung"))

    @property
    def notification_button(self):
        """Tombol lonceng notifikasi."""
        return self.button("Open notifications", "notifikasi")

    @property
    def profile_button(self):
        """Tombol profil kiri bawah sidebar (berisi nama dan email)."""
        return self.page.get_by_role("complementary").get_by_role("button").last

    def platform_link(self, name: str):
        """Link 'Connect <platform>' (mis. TikTok) di banner belum terhubung."""
        return self.page.get_by_role("link", name=rx(f"Connect {name}", f"Hubungkan {name}"))
