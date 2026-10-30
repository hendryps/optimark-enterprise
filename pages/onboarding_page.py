"""Page object halaman Onboarding (E2E-02): form data brand setelah login pertama."""
from playwright.sync_api import expect

from pages.base_page import BasePage, rx


class OnboardingPage(BasePage):
    """Halaman onboarding setelah login pertama (E2E-02). Locator berbasis label di sheet.

    Catatan: locator halaman ini belum diverifikasi di staging (butuh akun baru), jadi masih perkiraan.
    """

    # --- field form ---
    @property
    def company(self):
        """Input nama perusahaan/bisnis (wajib)."""
        return self.page.get_by_label(rx("Company name", "Business name", "Nama Perusahaan", "Nama Bisnis")).first

    @property
    def industry(self):
        """Dropdown bidang industri (bisa combobox atau tombol, tergantung implementasi UI)."""
        return self.page.get_by_role("combobox", name=rx("Industry", "Bidang Industri")).or_(
            self.button("Industry", "Bidang Industri")).first

    @property
    def website(self):
        """Input alamat website."""
        return self.page.get_by_label(rx("Website")).first

    @property
    def description(self):
        """Input deskripsi bisnis."""
        return self.page.get_by_label(rx("Description", "Deskripsi")).first

    @property
    def tagline(self):
        """Input tagline brand."""
        return self.page.get_by_label(rx("Tagline")).first

    @property
    def finish_button(self):
        """Tombol penyelesaian onboarding."""
        return self.button("Finish", "Complete", "Selesai")

    # --- aksi ---
    def pick_industry(self, name: str) -> None:
        """Buka dropdown industri lalu pilih salah satu opsinya."""
        self.industry.click()
        self.page.get_by_role("option", name=rx(name)).first.click()

    def fill_required(self, name: str = "PT Kopi Nusantara", industry: str = "Food") -> None:
        """Isi field wajib saja (nama perusahaan + industri) dengan data contoh."""
        self.company.fill(name)
        self.pick_industry(industry)

    def pick_color(self, label: str, hex_code: str) -> None:
        """Isi kode warna pada field Primary/Secondary Color."""
        field = self.page.get_by_label(rx(label)).first
        field.fill(hex_code)
        field.blur()  # keluar dari field supaya validasi berjalan

    def expect_still_on_onboarding(self) -> None:
        """Pastikan masih di halaman onboarding (form tidak lolos / tidak berpindah)."""
        expect(self.company).to_be_visible()
