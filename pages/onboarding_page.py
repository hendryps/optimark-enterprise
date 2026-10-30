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

    # --- alur lengkap akun baru (locator DIVERIFIKASI di staging, berbasis placeholder) ---
    def complete_business_profile(self, company: str = "Kopi Senja Nusantara",
                                  industry: str = "Kuliner & Restoran",
                                  website: str = "https://www.kopisenja.co.id",
                                  description: str = "Kedai kopi lokal dengan biji kopi pilihan dari petani Nusantara.",
                                  tagline: str = "Setiap seduhan punya cerita") -> None:
        """Isi form onboarding sampai lengkap lalu klik Finish -> masuk ke /dashboard.

        Kolom wajib: nama bisnis, industri, deskripsi singkat. Tombol Finish tetap nonaktif sampai ketiganya terisi.
        Website dan tagline opsional tapi diisi supaya datanya lengkap.
        """
        self.page.get_by_placeholder("Example: PT Kopi Kenangan Indonesia").fill(company)
        # Dropdown industri adalah <select> biasa; select pertama di halaman = pilihan bahasa, jadi ambil yang berisi opsi industri
        self.page.locator("select").filter(has_text="Select an industry").select_option(label=industry)
        self.page.get_by_placeholder("https://www.contoh.com").fill(website)
        self.page.locator("textarea").fill(description)
        self.page.get_by_placeholder("Example: Kopi Kenangan - Every sip is a story").fill(tagline)
        finish = self.page.get_by_role("button", name="Finish")
        expect(finish).to_be_enabled()
        finish.click()
        expect(self.page).to_have_url(rx("/dashboard"), timeout=60000)
