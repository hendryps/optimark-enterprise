"""Sheet 'e2e-onboarding' (E2E-02-01 .. 02-19).

Semua test memakai akun yang BELUM onboarding (NEW_USER_EMAIL / NEW_USER_PASSWORD di .env),
jadi otomatis di-skip kalau akun itu belum disiapkan. Test yang menyelesaikan onboarding
(02-17, 02-18) bersifat destructive karena akun hanya bisa onboarding sekali.
"""
import pytest
from playwright.sync_api import expect

from pages.base_page import rx
from utils.tc import tc

pytestmark = pytest.mark.onboarding

LONG_TEXT = "a" * 501


@tc("E2E-02-01")
def test_02_01_akses_halaman_onboarding(onboarding):
    """Setelah login pertama pengguna diarahkan ke onboarding dan field tampil."""
    onboarding.expect_still_on_onboarding()
    expect(onboarding.industry).to_be_visible()
    expect(onboarding.finish_button).to_be_visible()


@tc("E2E-02-02")
def test_02_02_input_nama_perusahaan(onboarding):
    """Nama Perusahaan tampil utuh tanpa pesan validasi."""
    onboarding.company.fill("PT Kopi Nusantara")
    onboarding.company.blur()
    expect(onboarding.company).to_have_value("PT Kopi Nusantara")


@tc("E2E-02-03")
def test_02_03_validasi_nama_perusahaan_kosong(onboarding):
    """Submit tanpa Nama Perusahaan ditolak dan tetap di onboarding."""
    onboarding.pick_industry("Tech")
    onboarding.finish_button.click()
    onboarding.expect_still_on_onboarding()
    onboarding.expect_text("required", "wajib")


@tc("E2E-02-04")
def test_02_04_pilih_bidang_industri(onboarding):
    """Industri yang dipilih tampil sebagai pilihan aktif."""
    onboarding.pick_industry("Tech")
    expect(onboarding.industry).to_contain_text(rx("Tech", "Teknologi"))


@tc("E2E-02-05")
def test_02_05_validasi_bidang_industri(onboarding):
    """Submit tanpa Bidang Industri ditolak."""
    onboarding.company.fill("PT Kopi Nusantara")
    onboarding.finish_button.click()
    onboarding.expect_still_on_onboarding()
    onboarding.expect_text("required", "wajib", "select", "pilih")


@tc("E2E-02-06")
def test_02_06_input_website_valid(onboarding):
    """URL valid tampil utuh tanpa error format."""
    onboarding.website.fill("https://www.kopinusantara.com")
    onboarding.website.blur()
    expect(onboarding.website).to_have_value("https://www.kopinusantara.com")
    expect(onboarding.page.get_by_text(rx("invalid", "tidak valid"))).to_have_count(0)


@tc("E2E-02-07")
def test_02_07_validasi_website_tidak_valid(onboarding):
    """Website 'kopi nusantara' ditolak dengan pesan format URL."""
    onboarding.fill_required()
    onboarding.website.fill("kopi nusantara")
    onboarding.finish_button.click()
    onboarding.expect_still_on_onboarding()
    onboarding.expect_text("invalid", "valid URL", "tidak valid", "format")


@tc("E2E-02-08")
def test_02_08_input_deskripsi_dan_counter(onboarding):
    """Penghitung karakter berubah mengikuti input."""
    onboarding.description.fill("Brand kopi lokal dengan cita rasa khas Nusantara")
    onboarding.expect_text("48", "/ 500", "/500")


@tc("E2E-02-09")
def test_02_09_batas_500_karakter(onboarding):
    """Deskripsi maksimal 500 karakter."""
    onboarding.description.fill(LONG_TEXT)
    value = onboarding.description.input_value()
    assert len(value) <= 500, f"Field menerima {len(value)} karakter"


@tc("E2E-02-10")
def test_02_10_input_tagline(onboarding):
    """Tagline tampil utuh tanpa validasi."""
    onboarding.tagline.fill("Setiap tegukan adalah cerita")
    onboarding.tagline.blur()
    expect(onboarding.tagline).to_have_value("Setiap tegukan adalah cerita")


@tc("E2E-02-11")
def test_02_11_upload_logo_png(onboarding, files):
    """Logo PNG valid diterima (nama/preview tampil)."""
    onboarding.upload(files["png"])
    expect(onboarding.page.get_by_text("logo.png").or_(onboarding.page.get_by_role("img", name=rx("logo", "preview"))).first).to_be_visible()


@tc("E2E-02-12", skip="Drag and drop file dari OS tidak bisa disimulasikan andal di Playwright; uji manual")
def test_02_12_upload_logo_drag_drop():
    """Skenario: upload logo drag drop. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-02-13")
def test_02_13_format_logo_tidak_didukung(onboarding, files):
    """PDF ditolak dengan pesan format yang didukung."""
    onboarding.upload(files["pdf"])
    onboarding.expect_text("SVG", "PNG", "format")
    expect(onboarding.page.get_by_text("dokumen.pdf")).to_have_count(0)


@tc("E2E-02-14")
def test_02_14_ukuran_logo_lebih_2mb(onboarding, files):
    """Logo > 2 MB ditolak dengan pesan ukuran maksimal."""
    onboarding.upload(files["big"])
    onboarding.expect_text("2 MB", "2MB")


@tc("E2E-02-15")
def test_02_15_primary_color(onboarding):
    """Primary Color #80C342 tampil di field."""
    onboarding.pick_color("Primary", "#80C342")
    expect(onboarding.page.get_by_label(rx("Primary")).first).to_have_value(rx("80C342"))


@tc("E2E-02-16")
def test_02_16_secondary_color(onboarding):
    """Secondary Color #2E5E1A tampil di field."""
    onboarding.pick_color("Secondary", "#2E5E1A")
    expect(onboarding.page.get_by_label(rx("Secondary")).first).to_have_value(rx("2E5E1A"))


@tc("E2E-02-17", destructive=True)
def test_02_17_submit_data_minimum(onboarding):
    """Hanya field wajib -> onboarding selesai, ke dashboard."""
    onboarding.fill_required()
    onboarding.finish_button.click()
    onboarding.expect_url_contains("/dashboard")


@tc("E2E-02-18", destructive=True)
def test_02_18_submit_seluruh_data(onboarding, files):
    """Semua field valid -> tersimpan, ke dashboard tanpa error."""
    onboarding.fill_required()
    onboarding.website.fill("https://www.kopinusantara.com")
    onboarding.description.fill("Brand kopi lokal dengan cita rasa khas Nusantara")
    onboarding.tagline.fill("Setiap tegukan adalah cerita")
    onboarding.upload(files["png"])
    onboarding.pick_color("Primary", "#80C342")
    onboarding.pick_color("Secondary", "#2E5E1A")
    onboarding.finish_button.click()
    onboarding.expect_url_contains("/dashboard")


@tc("E2E-02-19")
def test_02_19_logout_dari_onboarding(onboarding):
    """Logout mengakhiri sesi; onboarding tidak bisa dibuka tanpa login."""
    onboarding.button("Logout", "Log out", "Sign out", "Keluar").first.click()
    confirm = onboarding.button("Logout", "Log out", "Yes", "Ya", "Confirm")
    if confirm.count():
        confirm.last.click()
    onboarding.expect_url_contains("/login")
    onboarding.goto("/")
    onboarding.expect_url_contains("/login")
