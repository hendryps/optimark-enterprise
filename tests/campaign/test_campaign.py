"""Menu Campaign (E2E-11-xx). BELUM ada di Google Sheet; ID ini usulan dan dibuat dari UI staging.

Membuat campaign valid butuh date picker dan meninggalkan data permanen, jadi ditandai destructive.
"""
import pytest
from playwright.sync_api import expect

from utils.tc import tc

pytestmark = pytest.mark.campaign


@tc("E2E-11-01")
def test_11_01_akses_halaman(campaign):
    """Judul, tombol Create Campaign, pencarian, dan filter status tampil."""
    expect(campaign.create_button).to_be_visible()
    expect(campaign.search).to_be_visible()
    expect(campaign.status_filter).to_be_visible()


@tc("E2E-11-02")
def test_11_02_state_kosong(campaign):
    """Tanpa campaign: tampil 'No campaigns yet' dan ajakan membuat campaign pertama."""
    if not campaign.empty_state.count():
        pytest.skip("Akun QA sudah punya campaign")
    expect(campaign.empty_state).to_be_visible()
    campaign.expect_text("Create your first campaign")


@tc("E2E-11-03")
def test_11_03_opsi_filter_status(campaign):
    """Filter status: All Status, Draft, Active, Paused, Completed, Cancelled."""
    opts = campaign.options(campaign.status_filter)
    assert opts == ["All Status", "Draft", "Active", "Paused", "Completed", "Cancelled"], opts


@tc("E2E-11-04")
def test_11_04_filter_status_bisa_dipilih(campaign):
    """Memilih status mengubah nilai filter tanpa error."""
    campaign.status_filter.select_option(label="Draft")
    expect(campaign.status_filter.locator("option:checked")).to_have_text("Draft")


@tc("E2E-11-05")
def test_11_05_pencarian_tidak_ditemukan(campaign):
    """Kata kunci tak dikenal: tidak ada campaign yang tampil dan halaman tetap bisa dipakai."""
    campaign.search.fill("zzz-tidak-ada-999")
    campaign.page.wait_for_timeout(1000)
    expect(campaign.search).to_have_value("zzz-tidak-ada-999")
    expect(campaign.create_button).to_be_visible()


@tc("E2E-11-06")
def test_11_06_buka_form_buat_campaign(campaign):
    """Create Campaign membuka /campaign/create (Create New Campaign)."""
    campaign.create_button.click()
    campaign.expect_url_contains("/campaign/create")
    expect(campaign.page.get_by_role("heading", name="Create New Campaign")).to_be_visible()


@tc("E2E-11-07")
def test_11_07_komponen_form(campaign):
    """Form: Campaign Name*, Objective*, Status*, Start Date*, End Date, Cancel, Create Campaign."""
    campaign.open_create()
    expect(campaign.name_input).to_be_visible()
    campaign.expect_text("Campaign Objective", "Status", "Start Date", "End Date")
    expect(campaign.cancel_button).to_be_visible()
    expect(campaign.submit_button).to_be_visible()


@tc("E2E-11-08")
def test_11_08_opsi_objective(campaign):
    """Objective: Awareness, Engagement, Conversion, Traffic, Lead Generation (default Awareness)."""
    campaign.open_create()
    assert campaign.options(campaign.objective_select) == [
        "Awareness", "Engagement", "Conversion", "Traffic", "Lead Generation"]
    expect(campaign.objective_select.locator("option:checked")).to_have_text("Awareness")


@tc("E2E-11-09")
def test_11_09_status_default_draft(campaign):
    """Status default pada form adalah Draft."""
    campaign.open_create()
    expect(campaign.status_select.locator("option:checked")).to_have_text("Draft")


@tc("E2E-11-10", bug="Label status pada form tercampur bahasa (Aktif, Dijeda, Selesai, Dibatalkan) "
                     "padahal filter daftar berbahasa Inggris (Active, Paused, Completed, Cancelled)")
def test_11_10_konsistensi_bahasa_status(campaign):
    """Label status pada form sama dengan label pada filter daftar."""
    list_labels = set(campaign.options(campaign.status_filter)) - {"All Status"}
    campaign.open_create()
    assert set(campaign.options(campaign.status_select)) == list_labels


@tc("E2E-11-11")
def test_11_11_submit_kosong_ditolak(campaign):
    """Create Campaign tanpa nama/tanggal tidak membuat campaign dan tetap di form."""
    campaign.open_create()
    campaign.submit_button.click(force=True)
    campaign.page.wait_for_timeout(1000)
    campaign.expect_url_contains("/campaign/create")


@tc("E2E-11-12")
def test_11_12_input_nama(campaign):
    """Nama campaign tampil utuh."""
    campaign.open_create()
    campaign.name_input.fill("Promo Lebaran 2027")
    expect(campaign.name_input).to_have_value("Promo Lebaran 2027")


@tc("E2E-11-13")
def test_11_13_batal_kembali_ke_daftar(campaign):
    """Cancel kembali ke daftar tanpa membuat campaign."""
    campaign.open_create()
    campaign.name_input.fill("Tidak jadi dibuat")
    campaign.cancel_button.click()
    campaign.expect_url_contains("/campaign")
    assert "/create" not in campaign.page.url


@tc("E2E-11-14")
def test_11_14_tombol_back(campaign):
    """Tombol Back kembali ke daftar campaign."""
    campaign.open_create()
    campaign.back_button.click()
    assert campaign.page.url.rstrip("/").endswith("/campaign")


@tc("E2E-11-15", destructive=True, skip="Butuh date picker dan meninggalkan campaign permanen di akun QA")
def test_11_15_buat_campaign_valid(campaign):
    """Skenario: buat campaign valid. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...
