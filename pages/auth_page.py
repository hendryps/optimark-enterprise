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

    # ------------------------------------------------------------------
    # Login email + password: elemen & aksi tambahan (dipakai tests/auth/test_login.py)
    # ------------------------------------------------------------------
    @property
    def error_banner(self):
        """Kotak merah di atas form untuk error dari server, mis. 'Invalid email or password'."""
        return self.page.locator("div.text-red-500").first

    @property
    def show_password_button(self):
        """Ikon mata di dalam input Password (membuka/menutup tampilan password)."""
        return self.page.get_by_role("button", name=rx("Show password", "Hide password"))

    @property
    def forgot_password_link(self):
        """Tautan 'Forgot password?'."""
        return self.page.get_by_role("link", name=rx("Forgot password", "Lupa kata sandi"))

    def submit(self, email: str = "", password: str = "") -> None:
        """Isi form (kolom yang kosong dibiarkan kosong) lalu klik Sign In TANPA menunggu hasil.

        Beda dengan login(): method ini dipakai untuk skenario negatif, jadi tidak
        mengharapkan berpindah ke dashboard.
        """
        if email:
            self.email.fill(email)
        if password:
            self.password.fill(password)
        self.sign_in_button.click()

    def expect_not_logged_in(self) -> None:
        """Pastikan login TIDAK berhasil: masih di /login dan form Sign In masih tampil."""
        self.expect_url_contains("/login")
        expect(self.sign_in_button).to_be_visible()

    # ------------------------------------------------------------------
    # Login Google: langkah-langkah di halaman accounts.google.com
    # ------------------------------------------------------------------
    @property
    def google_email_input(self):
        """Kolom 'Email or phone' di halaman Google."""
        return self.page.get_by_role("textbox", name=rx("Email or phone", "Email atau ponsel"))

    @property
    def google_password_input(self):
        """Kolom 'Enter your password' di halaman Google."""
        return self.page.get_by_role("textbox", name=rx("Enter your password", "Masukkan sandi Anda"))

    @property
    def google_next_button(self):
        """Tombol 'Next' / 'Berikutnya' di halaman Google."""
        return self.page.get_by_role("button", name=rx("Next", "Berikutnya", exact=True))

    def go_to_google_signin(self) -> None:
        """Dari /login klik 'Continue with Google' sampai halaman Google tampil."""
        self.open_login()
        self.google_button.click()
        self.page.wait_for_url(re.compile(r"accounts\.google\.com"), timeout=30000)
        expect(self.google_email_input).to_be_visible(timeout=30000)

    def google_enter_email(self, email: str) -> None:
        """Langkah 1 di Google: isi email lalu klik Next."""
        self.google_email_input.fill(email)
        self.google_next_button.click()

    def google_enter_password(self, password: str) -> None:
        """Langkah 2 di Google: isi password lalu klik Next (hanya muncul kalau email dikenal)."""
        expect(self.google_password_input).to_be_visible(timeout=30000)
        self.google_password_input.fill(password)
        self.google_next_button.click()

    def login_with_google(self, email: str, password: str) -> None:
        """Alur lengkap login Google sampai kembali ke aplikasi Optimark."""
        self.go_to_google_signin()
        self.google_enter_email(email)
        self.google_enter_password(password)
        # Setelah Google menerima akun, browser dikembalikan ke staging Optimark
        expect(self.page).to_have_url(rx("/dashboard", "/onboarding"), timeout=60000)
