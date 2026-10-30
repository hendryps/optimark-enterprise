"""Menu Brand Hub (E2E-10-xx). BELUM ada di Google Sheet; ID ini usulan dan dibuat dari UI staging.

Di staging hanya Overview, Brand Profile, dan Visual Identity yang berfungsi; Customer Profiles,
Guardrails, Content Themes, dan Social Links masih "being prepared". Test yang menyimpan
perubahan ke akun QA ditandai destructive.
"""
import pytest
from playwright.sync_api import expect

from pages.base_page import rx
from pages.brand_hub_page import COMING_SOON, TABS
from utils.tc import tc

pytestmark = pytest.mark.brand_hub


@tc("E2E-10-01")
def test_10_01_akses_halaman(brand_hub):
    """Ketujuh tab Brand Hub tampil dan Overview aktif."""
    for name in TABS:
        expect(brand_hub.tab(name)).to_be_visible()
    expect(brand_hub.tab("Overview")).to_have_attribute("aria-selected", "true")


@tc("E2E-10-02")
def test_10_02_overview_ringkasan(brand_hub):
    """Overview meringkas Brand Profile (nama + tombol Edit) dan menawarkan Add untuk bagian lain."""
    brand_hub.expect_text("Brand Profile")
    expect(brand_hub.button("Edit").first).to_be_visible()
    assert brand_hub.button("Add").count() >= 1


@pytest.mark.parametrize("name", [
    pytest.param(n, marks=pytest.mark.tc(f"E2E-10-{i:02d}")) for i, n in enumerate(TABS[1:], start=3)
])
def test_10_03_sd_08_buka_tab(brand_hub, name):
    """Setiap tab bisa dibuka dan menjadi aktif."""
    brand_hub.open_tab(name)
    expect(brand_hub.tab("Overview")).to_have_attribute("aria-selected", "false")


@pytest.mark.parametrize("name", [
    pytest.param(n, marks=pytest.mark.tc(f"E2E-10-{i:02d}")) for i, n in enumerate(COMING_SOON, start=9)
])
def test_10_09_sd_12_bagian_belum_tersedia(brand_hub, name):
    """Bagian yang belum jadi menampilkan 'being prepared' dan tombol Back to Overview yang berfungsi."""
    brand_hub.open_tab(name)
    brand_hub.expect_text("being prepared")
    brand_hub.button("Back to Overview").click()
    expect(brand_hub.tab("Overview")).to_have_attribute("aria-selected", "true")


@tc("E2E-10-13")
def test_10_13_form_brand_profile(brand_hub):
    """Brand Profile: Company/Business Name*, Industry*, Fetch from Website, Cancel, Save."""
    brand_hub.open_tab("Brand Profile")
    expect(brand_hub.company).to_be_visible()
    brand_hub.expect_text("Industry")
    expect(brand_hub.button("Fetch from Website")).to_be_visible()
    expect(brand_hub.cancel_button).to_be_visible()
    expect(brand_hub.save_button).to_be_visible()


@tc("E2E-10-14")
def test_10_14_data_onboarding_terisi(brand_hub):
    """Nama bisnis dari onboarding sudah terisi (tidak diminta isi ulang)."""
    brand_hub.open_tab("Brand Profile")
    expect(brand_hub.company).not_to_have_value("")


@tc("E2E-10-15")
def test_10_15_nama_bisnis_wajib(brand_hub):
    """Business Name dikosongkan lalu Save: tidak tersimpan dan ada pesan validasi."""
    brand_hub.open_tab("Brand Profile")
    brand_hub.company.fill("")
    brand_hub.save_button.click()
    brand_hub.expect_text("required", "wajib", "Please enter", "cannot be empty")


@tc("E2E-10-16")
def test_10_16_daftar_industri(brand_hub):
    """Dropdown Industry menyediakan pilihan industri (mis. E-Commerce & Retail, Fashion & Pakaian)."""
    brand_hub.open_tab("Brand Profile")
    brand_hub.page.get_by_role("main").get_by_role("button", name=rx("Finance", "Retail", "Fashion", "Event", "Jasa", "Food")).first.click()
    brand_hub.expect_text("E-Commerce & Retail", "Fashion & Pakaian")


@tc("E2E-10-17")
def test_10_17_batal_tidak_menyimpan(brand_hub):
    """Mengubah nama lalu Cancel: setelah reload nama tetap yang lama."""
    brand_hub.open_tab("Brand Profile")
    original = brand_hub.company.input_value()
    brand_hub.company.fill(original + " XYZ")
    brand_hub.cancel_button.click()
    brand_hub.page.reload()
    brand_hub.open_tab("Brand Profile")
    expect(brand_hub.company).to_have_value(original)


@tc("E2E-10-18", destructive=True)
def test_10_18_simpan_profil(brand_hub):
    """Ubah nama lalu Save: tersimpan (tampil di Overview). Nama dikembalikan di akhir."""
    brand_hub.open_tab("Brand Profile")
    original = brand_hub.company.input_value()
    try:
        brand_hub.company.fill(original + " QA")
        brand_hub.save_button.click()
        brand_hub.page.reload()
        brand_hub.expect_text(original + " QA")
    finally:
        brand_hub.open_tab("Brand Profile")
        brand_hub.company.fill(original)
        brand_hub.save_button.click()


@tc("E2E-10-19")
def test_10_19_visual_identity_aturan_logo(brand_hub):
    """Visual Identity menjelaskan format logo (PNG/JPG/SVG/WebP, maks. 2 MB) dan punya Add Color."""
    brand_hub.open_tab("Visual Identity")
    brand_hub.expect_text("PNG, JPG, SVG, or WebP", "2 MB")
    expect(brand_hub.button("Add Color")).to_be_visible()


@tc("E2E-10-20")
def test_10_20_logo_melebihi_2mb(brand_hub, files):
    """Logo > 2 MB ditolak dengan pesan ukuran."""
    brand_hub.open_tab("Visual Identity")
    brand_hub.upload(files["big"])
    brand_hub.expect_text("2 MB", "too large", "terlalu besar")


@tc("E2E-10-21")
def test_10_21_logo_format_tidak_didukung(brand_hub, files):
    """PDF ditolak sebagai logo."""
    brand_hub.open_tab("Visual Identity")
    brand_hub.upload(files["pdf"])
    brand_hub.expect_text("PNG, JPG, SVG", "not supported", "unsupported", "format")
    expect(brand_hub.page.get_by_text("dokumen.pdf")).to_have_count(0)


@tc("E2E-10-22", destructive=True, skip="Mengganti logo akun QA secara permanen; belum ada aksi hapus logo yang terverifikasi")
def test_10_22_upload_logo_valid(brand_hub, files):
    """Skenario: upload logo valid. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...
