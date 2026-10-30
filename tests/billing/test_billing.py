"""Menu Billing (E2E-12-xx). Tab 'e2e-billing' di Google Sheet masih kosong (hanya daftar ID);
test ini dibuat dari UI staging dan ID-nya usulan.

Akun QA tanpa paket dan tanpa riwayat pembayaran; test yang butuh kondisi itu di-skip otomatis
kalau akunnya sudah berlangganan.
"""
import pytest
from playwright.sync_api import expect

from utils.tc import tc

pytestmark = pytest.mark.billing

STATUSES = ["All statuses", "Pending", "Paid", "Failed", "Expired"]


@tc("E2E-12-01")
def test_12_01_akses_halaman(billing):
    """Judul Billing, Current Plan, Token Usage, dan Payment history tampil."""
    billing.expect_text("CURRENT PLAN", "TOKEN USAGE", "Payment history")


@tc("E2E-12-02")
def test_12_02_akun_tanpa_paket(billing):
    """Tanpa paket: tampil 'No plan yet' dan ajakan memilih paket."""
    if not billing.page.get_by_text("No plan yet").count():
        pytest.skip("Akun QA sudah punya paket")
    billing.expect_text("No plan yet", "Choose a plan")


@tc("E2E-12-03", bug="Tombol Choose plan nonaktif untuk akun tanpa paket (perlu dikonfirmasi apakah disengaja)")
def test_12_03_choose_plan_bisa_diklik(billing):
    """Akun tanpa paket bisa menekan Choose plan untuk melihat paket."""
    if not billing.page.get_by_text("No plan yet").count():
        pytest.skip("Akun QA sudah punya paket")
    expect(billing.choose_plan_button).to_be_enabled()


@tc("E2E-12-04")
def test_12_04_view_plans_tersedia(billing):
    """Tombol View plans tampil."""
    expect(billing.view_plans_button).to_be_visible()


@tc("E2E-12-05")
def test_12_05_token_usage_tanpa_paket(billing):
    """Tanpa paket, Token Usage meminta memilih paket dulu."""
    if not billing.page.get_by_text("No plan yet").count():
        pytest.skip("Akun QA sudah punya paket")
    billing.expect_text("Choose a plan to start using AI tokens")


@tc("E2E-12-06")
def test_12_06_riwayat_kosong(billing):
    """Tanpa transaksi: tampil 'No payment history yet'."""
    if not billing.empty_history.count():
        pytest.skip("Akun QA sudah punya riwayat pembayaran")
    expect(billing.empty_history).to_be_visible()


@tc("E2E-12-07")
def test_12_07_opsi_filter_status(billing):
    """Filter status: All statuses, Pending, Paid, Failed, Expired."""
    opts = [t.strip() for t in billing.status_filter.locator("option").all_inner_texts() if t.strip()]
    assert opts == STATUSES, opts


@pytest.mark.parametrize("status", STATUSES[1:])
@tc("E2E-12-08")
def test_12_08_pilih_filter_status(billing, status):
    """Setiap status bisa dipilih tanpa error."""
    billing.status_filter.select_option(label=status)
    expect(billing.status_filter.locator("option:checked")).to_have_text(status)


@tc("E2E-12-09")
def test_12_09_pencarian_invoice(billing):
    """Kolom pencarian invoice/paket menerima teks."""
    billing.search.fill("INV-12345")
    expect(billing.search).to_have_value("INV-12345")


@tc("E2E-12-10")
def test_12_10_refresh_riwayat(billing):
    """Refresh memuat ulang riwayat tanpa meninggalkan halaman atau error."""
    billing.refresh_button.click()
    billing.expect_url_contains("/billing")
    expect(billing.page.get_by_role("heading", name="Payment history")).to_be_visible()


@tc("E2E-12-11")
def test_12_11_filter_tanggal(billing):
    """Filter tanggal: 'Select dates' dan tombol Apply tersedia."""
    billing.expect_text("Select dates")
    expect(billing.apply_button).to_be_visible()


@tc("E2E-12-12")
def test_12_12_saldo_token_konsisten_dengan_sidebar(billing):
    """Panel token di sidebar menampilkan saldo dan pemakaian yang valid (bukan negatif)."""
    assert billing.token_balance() >= 0
    assert billing.token_used() >= 0
