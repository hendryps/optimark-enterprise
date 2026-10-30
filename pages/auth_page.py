"""Page object halaman Login (/login) dan Register (/register) (E2E-01)."""
import re

from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import expect

from pages.base_page import BasePage, rx


class AuthPage(BasePage):
    """Halaman Login (/login) dan Register (/register). Staging punya Google dan email+password."""

    def open_login(self) -> "AuthPage":
        """Buka halaman /login."""
        self.goto("/login")
        return self

    def open_register(self) -> "AuthPage":
        """Buka halaman /register."""
        self.goto("/register")
        return self

    @property
    def google_button(self):
        """Tombol 'Continue with Google'."""
        return self.button("Continue with Google")

    @property
    def email(self):
        """Input Email atau username."""
        return self.page.get_by_role("textbox", name=rx("Email or username", "Email atau username"))

    @property
    def password(self):
        """Input Password."""
        return self.page.get_by_role("textbox", name=rx("Password", "Kata sandi"))

    @property
    def sign_in_button(self):
        """Tombol 'Sign In'."""
        return self.button("Sign In", "Masuk", exact=True)

    def login(self, email: str, password: str) -> None:
        """Login email + password lalu tunggu masuk ke aplikasi."""
        self.email.fill(email)
        self.password.fill(password)
        self.sign_in_button.click()
        expect(self.page).to_have_url(rx("/dashboard", "/onboarding"), timeout=30000)  # staging kadang lambat

    def expect_login_page(self) -> None:
        """Komponen halaman Login (E2E-01-06)."""
        expect(self.page.get_by_role("heading", name=rx("Welcome Back", "Selamat Datang"))).to_be_visible()
        expect(self.google_button).to_be_visible()
        expect(self.page.get_by_role("link", name=rx("Register", "Sign up", "Daftar"))).to_be_visible()
        expect(self.page.get_by_role("link", name=rx("Privacy Policy"))).to_be_visible()
        expect(self.page.get_by_role("img", name="Optimark")).to_be_visible()  # logo

    def expect_register_page(self) -> None:
        """Komponen halaman Register (E2E-01-01)."""
        expect(self.page.get_by_role("heading", name=rx("Create Account", "Buat Akun"))).to_be_visible()
        expect(self.google_button).to_be_visible()
        expect(self.page.get_by_role("link", name=rx("Sign in", "Login", "Masuk"))).to_be_visible()
        expect(self.page.get_by_role("link", name=rx("Privacy Policy"))).to_be_visible()
        expect(self.page.get_by_role("img", name="Optimark")).to_be_visible()  # logo

    def click_google_and_close_popup(self) -> None:
        """Klik Continue with Google lalu batalkan.

        Google bisa dibuka sebagai popup (ditutup) atau redirect satu halaman penuh
        (kembali ke halaman sebelumnya). Staging memakai redirect.
        """
        try:
            with self.page.expect_popup(timeout=3000) as popup_info:
                self.google_button.click()
            popup_info.value.close()
        except PlaywrightTimeoutError:
            # Tidak ada popup -> tombol sudah diklik dan halaman berpindah ke Google
            self.page.wait_for_url(re.compile(r"accounts\.google\.com"))
            self.page.go_back()
            expect(self.google_button).to_be_visible()
