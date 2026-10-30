"""Page object menu Billing (/billing): paket aktif, pemakaian token, riwayat pembayaran."""
from playwright.sync_api import expect

from pages.base_page import BasePage, rx


class BillingPage(BasePage):
    """Menu Billing (/billing): paket aktif, pemakaian token, riwayat pembayaran."""

    def open(self) -> "BillingPage":
        """Buka halaman Billing dan tunggu judulnya tampil (halaman kadang lambat)."""
        self.goto("/billing")
        expect(self.page.get_by_role("heading", name="Billing").first).to_be_visible(timeout=30000)
        return self

    # --- elemen halaman (property = dipakai seperti variabel: billing.refresh_button) ---
    @property
    def choose_plan_button(self):
        """Tombol 'Choose plan' untuk memilih paket langganan."""
        return self.button("Choose plan")

    @property
    def view_plans_button(self):
        """Tombol 'View plans' untuk melihat daftar paket."""
        return self.button("View plans")

    @property
    def refresh_button(self):
        """Tombol 'Refresh' untuk memuat ulang riwayat pembayaran."""
        return self.button("Refresh")

    @property
    def search(self):
        """Kolom pencarian invoice."""
        return self.page.get_by_placeholder(rx("Search invoice"))

    @property
    def status_filter(self):
        """<select> status pembayaran (All statuses, Pending, Paid, Failed, Expired)."""
        return self.page.get_by_role("main").locator("select").first

    @property
    def apply_button(self):
        """Tombol 'Apply' untuk menerapkan filter."""
        return self.button("Apply", exact=True)

    @property
    def empty_history(self):
        """Teks state kosong saat belum ada pembayaran."""
        return self.page.get_by_text("No payment history yet")
