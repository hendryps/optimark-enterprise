"""Tiket ODA-218 Brand Hub - Website Crawl Result for AI.

Acceptance Criteria (ringkas) dan pemetaan:
    AC-01 klik "Get AI Suggestions" (di staging: tombol "Fetch from Website") membaca website -> test 01-03
    AC-04 website tidak bisa dibaca: alasan singkat + Coba Lagi, data lama tidak berubah  -> test 04-06
    AC-02/03/05/06 butuh crawl yang berhasil / data onboarding / status background        -> di-skip (lihat alasan)

Catatan: crawl TIDAK disimpan otomatis ("nothing is saved automatically"), dan test tidak menekan Save.
"""
import pytest
from playwright.sync_api import expect

from utils.tc import tc

pytestmark = [pytest.mark.jira, pytest.mark.brand_hub]

PUBLIC_SITE = "https://example.com"
UNREACHABLE = "https://qa-optimark-tidak-ada.invalid"


@tc("ODA-218-01")
def test_oda218_01_tombol_fetch_membuka_dialog(brand_hub):
    """AC-01: tombol Fetch from Website membuka dialog dengan input URL, Start Crawl, dan Close."""
    brand_hub.open_tab("Brand Profile")
    brand_hub.fetch_button.click()
    expect(brand_hub.dialog).to_be_visible()
    expect(brand_hub.dialog.get_by_text("Fetch Profile from Website")).to_be_visible()
    expect(brand_hub.fetch_url).to_be_visible()
    expect(brand_hub.start_crawl).to_be_visible()
    expect(brand_hub.dialog.get_by_role("button", name="Close")).to_be_visible()


@tc("ODA-218-02")
def test_oda218_02_close_menutup_dialog(brand_hub):
    """Close menutup dialog tanpa mengubah form Brand Profile."""
    brand_hub.open_tab("Brand Profile")
    before = brand_hub.company.input_value()
    brand_hub.fetch_button.click()
    brand_hub.dialog.get_by_role("button", name="Close").click()
    expect(brand_hub.dialog).to_have_count(0)
    expect(brand_hub.company).to_have_value(before)


@tc("ODA-218-03")
def test_oda218_03_crawl_website_publik_berhasil_dimulai(brand_hub):
    """AC-01/AC-05: crawl website publik valid harus DIMULAI (API tidak error) dan berjalan di background."""
    brand_hub.open_tab("Brand Profile")
    calls = brand_hub.try_crawl(PUBLIC_SITE)
    statuses = [s for s, _ in calls]
    assert calls, "Tidak ada request crawl yang dikirim ke server"
    assert all(s < 400 for s in statuses), f"API crawl menjawab error {statuses} untuk website publik {PUBLIC_SITE}"
    assert not brand_hub.page.get_by_text("Failed to start the crawl").count(), "Muncul pesan 'Failed to start the crawl'"


@tc("ODA-218-04")
def test_oda218_04_crawl_gagal_data_lama_tidak_berubah(brand_hub):
    """AC-04: website tidak bisa dibaca -> data Brand Hub yang lama tidak berubah."""
    brand_hub.open_tab("Brand Profile")
    name = brand_hub.company.input_value()
    description = brand_hub.page.get_by_placeholder("Example: A local coffee shop", exact=False).input_value()
    brand_hub.try_crawl(UNREACHABLE)
    brand_hub.dialog.get_by_role("button", name="Close").click()
    expect(brand_hub.company).to_have_value(name)
    expect(brand_hub.page.get_by_placeholder("Example: A local coffee shop", exact=False)).to_have_value(description)
    # Muat ulang: data tersimpan di server juga tidak berubah
    brand_hub.page.reload()
    expect(brand_hub.company).to_have_value(name)


@tc("ODA-218-05")
def test_oda218_05_gagal_menampilkan_pesan_dan_bisa_coba_lagi(brand_hub):
    """AC-04: saat gagal tampil pesan di dialog dan tombol Start Crawl tetap tersedia untuk Coba Lagi."""
    brand_hub.open_tab("Brand Profile")
    brand_hub.try_crawl(UNREACHABLE)
    expect(brand_hub.dialog).to_be_visible()
    expect(brand_hub.dialog.get_by_text("Failed to start the crawl").or_(
        brand_hub.dialog.get_by_text("not found").or_(brand_hub.dialog.get_by_text("blocked")))).to_be_visible()
    expect(brand_hub.start_crawl).to_be_enabled()


@tc("ODA-218-06")
def test_oda218_06_pesan_gagal_menyebut_alasan(brand_hub):
    """AC-04: pesan gagal menyebut ALASAN singkat (tidak ditemukan / diblokir / kosong), bukan pesan koneksi umum."""
    brand_hub.open_tab("Brand Profile")
    brand_hub.try_crawl(UNREACHABLE)
    text = brand_hub.dialog.inner_text().lower()
    assert any(k in text for k in ("not found", "tidak ditemukan", "blocked", "diblokir", "empty", "kosong")), (
        f"Pesan tidak menyebut alasan. Isi dialog: {text!r}")


@tc("ODA-218-07")
def test_oda218_07_url_tidak_valid_ditolak_di_form(brand_hub):
    """URL yang bukan alamat website (mis. 'tidak-valid') ditolak oleh validasi form, bukan dikirim ke server."""
    brand_hub.open_tab("Brand Profile")
    calls = brand_hub.try_crawl("tidak-valid")
    assert not calls, f"URL tidak valid tetap dikirim ke server: {calls}"


@tc("ODA-218-08", skip="Butuh crawl yang berhasil (API crawl staging menjawab 502); AC-02 format data ke tim AI tidak terlihat dari UI")
def test_oda218_08_hasil_crawl_tersimpan_untuk_ai(brand_hub):
    """Skenario AC-02: hasil crawl (markdown, branding, gambar) disimpan dan diteruskan ke AI."""
    ...


@tc("ODA-218-09", skip="Butuh crawl berhasil untuk menguji status processing dan pindah halaman (AC-05)")
def test_oda218_09_crawl_background_boleh_pindah_halaman(brand_hub):
    """Skenario AC-05: status processing, user boleh pindah halaman selama crawl berjalan."""
    ...


@tc("ODA-218-10", skip="Butuh akun tanpa website dan data onboarding untuk menguji rekomendasi tanpa website (AC-06)")
def test_oda218_10_rekomendasi_tanpa_website(brand_hub):
    """Skenario AC-06: tanpa website, rekomendasi dibuat dari data onboarding saja."""
    ...
