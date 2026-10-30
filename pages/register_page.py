"""Page object halaman Register (/register) dan halaman Verifikasi Email (/verify-email)."""
import pytest
from playwright.sync_api import Locator, expect

from pages.auth_page import AuthPage
from pages.base_page import rx
from utils.mailsac import DummyUser

# Pesan rate limit dari server ("Too many attempts. Please try again in 895 seconds.")
RATE_LIMIT = rx("Too many attempts")


class RegisterPage(AuthPage):
    """Halaman Register: form 4 kolom (Full Name, Email, Password, Confirm Password)."""

    @property
    def full_name(self) -> Locator:
        """Kolom Full Name."""
        return self.page.get_by_placeholder("Enter your full name")

    @property
    def email_field(self) -> Locator:
        """Kolom Email. (Dinamai email_field karena `email` di AuthPage adalah kolom login.)"""
        return self.page.get_by_placeholder("name@email.com")

    @property
    def password_field(self) -> Locator:
        """Kolom Password."""
        return self.page.get_by_placeholder("Create a password")

    @property
    def confirm_password(self) -> Locator:
        """Kolom Confirm Password."""
        return self.page.get_by_placeholder("Re-enter your password")

    @property
    def create_button(self) -> Locator:
        """Tombol 'Create account'."""
        return self.button("Create account", exact=True)

    @property
    def resend_button(self) -> Locator:
        """Tombol 'Resend verification email' (muncul di layar 'cek email Anda')."""
        return self.button("Resend verification email")

    def open(self) -> "RegisterPage":
        """Buka halaman /register."""
        self.open_register()
        expect(self.full_name).to_be_visible()
        return self

    def fill_form(self, name: str = "", email: str = "", password: str = "", confirm: str | None = None) -> None:
        """Isi form. Kalau `confirm` tidak diisi, dipakai password yang sama. Kolom kosong dilewati."""
        if confirm is None:
            confirm = password
        for field, value in ((self.full_name, name), (self.email_field, email),
                             (self.password_field, password), (self.confirm_password, confirm)):
            if value:
                field.fill(value)

    def submit_form(self, name: str = "", email: str = "", password: str = "", confirm: str | None = None) -> None:
        """Isi form lalu klik Create account (tanpa menunggu hasil, dipakai untuk skenario negatif)."""
        self.fill_form(name, email, password, confirm)
        self.create_button.click()

    def register(self, user: DummyUser) -> None:
        """Daftarkan akun dummy sampai layar 'cek email' tampil. Di-skip kalau kena rate limit server."""
        self.submit_form(user.full_name, user.email, user.password)
        self.expect_check_email_screen()

    def expect_check_email_screen(self) -> None:
        """Pendaftaran diterima server -> layar 'cek email' (ada tombol Resend verification email).

        Kalau server membalas 'Too many attempts' (dibatasi ~15 menit), test di-SKIP, bukan gagal,
        karena itu bukan bug fitur tapi batas server staging.
        """
        done = self.resend_button.or_(self.page.get_by_text(RATE_LIMIT))
        expect(done.first).to_be_visible(timeout=30000)
        if self.page.get_by_text(RATE_LIMIT).count():
            pytest.skip("Server staging membatasi percobaan registrasi ('Too many attempts'). Ulangi ~15 menit lagi.")

    def field_is_invalid(self, field: Locator) -> bool:
        """True kalau browser menolak isi kolom (validasi bawaan HTML: kosong / format email salah)."""
        return field.evaluate("el => !el.validity.valid")

    def expect_still_on_form(self) -> None:
        """Form ditolak: masih di /register dan tombol Create account masih ada (tidak pindah layar)."""
        self.expect_url_contains("/register")
        expect(self.create_button).to_be_visible()


class VerifyEmailPage(AuthPage):
    """Halaman /verify-email?token=... (dibuka dari link di email verifikasi)."""

    @property
    def password_input(self) -> Locator:
        """Kolom password: pemilik akun harus memasukkan password-nya untuk mengaktifkan akun."""
        return self.page.get_by_placeholder("Enter your password")

    @property
    def verify_button(self) -> Locator:
        """Tombol verifikasi. Labelnya di staging masih 'verify.verifyButton' (kunci terjemahan bocor), jadi dicari longgar."""
        return self.page.get_by_role("button").filter(has_text=rx("verify", "Verifikasi"))

    def open_link(self, link: str) -> "VerifyEmailPage":
        """Salin link verifikasi dari email lalu buka di TAB BARU; kembalikan page object tab baru itu."""
        new_tab = VerifyEmailPage(self.page.context.new_page())
        new_tab.page.goto(link)
        return new_tab

    def submit_password(self, password: str) -> None:
        """Isi password lalu klik tombol verifikasi, TANPA menunggu hasil (dipakai untuk skenario gagal)."""
        expect(self.password_input).to_be_visible(timeout=30000)
        self.password_input.fill(password)
        self.verify_button.click()

    def verify(self, password: str) -> None:
        """Isi password lalu klik verifikasi. Berhasil = otomatis login dan masuk ke /onboarding."""
        self.submit_password(password)
        expect(self.page).to_have_url(rx("/onboarding", "/dashboard"), timeout=30000)
