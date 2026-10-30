"""Page object Lupa Password: /forgot-password (minta link) dan /reset-password?token=... (buat password baru)."""
import re

from playwright.sync_api import Locator, expect

from pages.auth_page import AuthPage
from pages.base_page import rx


class ForgotPasswordPage(AuthPage):
    """Halaman /forgot-password: isi email, server mengirim link reset ke email itu."""

    @property
    def email_field(self) -> Locator:
        """Kolom Email."""
        return self.page.get_by_placeholder("name@email.com")

    @property
    def send_button(self) -> Locator:
        """Tombol 'Send Email'."""
        return self.button("Send Email", exact=True)

    @property
    def back_to_login(self) -> Locator:
        """Tautan 'Back to sign in'."""
        return self.page.get_by_role("link", name=rx("Back to sign in"))

    def open(self) -> "ForgotPasswordPage":
        """Buka /forgot-password."""
        self.goto("/forgot-password")
        expect(self.email_field).to_be_visible()
        return self

    def request_reset(self, email: str = "") -> None:
        """Isi email (boleh kosong) lalu klik Send Email."""
        if email:
            self.email_field.fill(email)
        self.send_button.click()

    def request_reset_patiently(self, email: str) -> None:
        """Seperti request_reset, tapi kalau server membalas 'Too many attempts ... in N seconds'
        (jeda ~60 detik per email), tunggu N detik lalu coba lagi (maksimal 3 kali)."""
        self.email_field.fill(email)
        for _ in range(3):
            self.send_button.click()
            limit = self.page.get_by_text(rx("Too many attempts"))
            sent = self.page.get_by_text(rx("Email Sent")).first
            expect(limit.or_(sent).first).to_be_visible(timeout=30000)
            if not limit.count():
                return
            seconds = int(re.search(r"(\d+)\s*seconds?", limit.inner_text()).group(1))
            self.page.wait_for_timeout((seconds + 2) * 1000)

    def expect_form(self) -> None:
        """Masih di form 'Reset Password' (belum terkirim)."""
        expect(self.page.get_by_text(rx("Reset Password")).first).to_be_visible()
        expect(self.send_button).to_be_visible()

    def expect_email_sent(self) -> None:
        """Layar 'Email Sent' tampil beserta hitung mundur kirim ulang."""
        expect(self.page.get_by_text(rx("Email Sent")).first).to_be_visible(timeout=30000)
        expect(self.page.get_by_text(rx("check your email"))).to_be_visible()
        expect(self.page.get_by_text(rx("Resend available in"))).to_be_visible()


class ResetPasswordPage(AuthPage):
    """Halaman /reset-password?token=... (dibuka dari link di email reset)."""

    @property
    def new_password(self) -> Locator:
        """Kolom password baru."""
        return self.page.get_by_placeholder("Create a new password")

    @property
    def confirm_password(self) -> Locator:
        """Kolom konfirmasi password baru."""
        return self.page.get_by_placeholder("Re-enter your password")

    @property
    def save_button(self) -> Locator:
        """Tombol 'Save'."""
        return self.button("Save", exact=True)

    def open_link(self, link: str) -> None:
        """Buka link reset dari email."""
        self.page.goto(link)
        expect(self.new_password).to_be_visible(timeout=30000)

    def save(self, new_password: str = "", confirm: str | None = None) -> None:
        """Isi password baru + konfirmasi (default sama) lalu klik Save."""
        if confirm is None:
            confirm = new_password
        if new_password:
            self.new_password.fill(new_password)
        if confirm:
            self.confirm_password.fill(confirm)
        self.save_button.click()
