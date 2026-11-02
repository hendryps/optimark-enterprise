"""Menu SEO (SEO-xx). BELUM ada di Google Sheet; ID ini usulan dan dibuat dari UI staging.

Halaman Growth Intel · SEO punya 9 tab. Analisis nyata (tombol Analyze) memakai kuota/token,
jadi hanya dicek kesiapan input-nya.
"""
import re

import pytest
from playwright.sync_api import expect

from pages.base_page import rx
from pages.seo_page import TABS
from utils.tc import tc

pytestmark = pytest.mark.seo


@tc("SEO-01")
def test_08_01_akses_halaman(seo):
    """Judul Growth Intel · SEO dan seluruh 9 tab tampil."""
    for name in TABS:
        expect(seo.tab(name)).to_be_visible()


@tc("SEO-02")
def test_08_02_tab_default_overview(seo):
    """Tab Overview aktif saat halaman dibuka."""
    expect(seo.tab("Overview")).to_have_attribute("aria-selected", "true")


SITE_AUDIT_BUG = pytest.mark.xfail(
    reason="Bug: membuka tab Site Audit menampilkan 'Application error: a client-side exception has occurred'",
    strict=False)


@pytest.mark.parametrize("name", [
    pytest.param(n, marks=[pytest.mark.tc(f"SEO-{i:02d}")] + ([SITE_AUDIT_BUG] if n == "Site Audit" else []))
    for i, n in enumerate(TABS[1:], start=3)
])
def test_08_03_sd_10_buka_tab(seo, name):
    """Setiap tab bisa dibuka dan menjadi aktif; tab lain tidak aktif."""
    seo.tab(name).click()
    expect(seo.tab(name)).to_have_attribute("aria-selected", "true")
    expect(seo.tab("Overview")).to_have_attribute("aria-selected", "false")


@tc("SEO-11")
def test_08_11_input_analisis_overview(seo):
    """Overview punya input URL halaman, input keyword, dan tombol Analyze."""
    expect(seo.url_input).to_be_visible()
    expect(seo.keyword_input).to_be_visible()
    expect(seo.analyze_button).to_be_visible()


@tc("SEO-12")
def test_08_12_input_menerima_teks(seo):
    """URL dan keyword tampil utuh sesuai yang diketik."""
    seo.url_input.fill("https://example.com/page")
    seo.keyword_input.fill("kopi susu gula aren")
    expect(seo.url_input).to_have_value("https://example.com/page")
    expect(seo.keyword_input).to_have_value("kopi susu gula aren")


@tc("SEO-13")
def test_08_13_analyze_tanpa_input(seo):
    """Analyze tanpa URL/keyword tidak memulai analisis (tombol nonaktif atau ada validasi)."""
    seo.analyze_button.click(force=True)
    seo.page.wait_for_timeout(800)
    expect(seo.tab("Overview")).to_have_attribute("aria-selected", "true")
    assert seo.analyze_button.is_disabled() or seo.page.get_by_text(
        __import__("re").compile("required|wajib|enter|masukkan", __import__("re").I)).count() > 0


@tc("SEO-14")
def test_08_14_tab_tidak_hilang_setelah_reload(seo):
    """Reload halaman tetap menampilkan seluruh tab."""
    seo.page.reload()
    for name in TABS:
        expect(seo.tab(name)).to_be_visible(timeout=30000)


# ============================================================ OVERVIEW: tombol Analyze & input (positif + negatif)
# Catatan: tombol Analyze yang AKTIF tidak pernah diklik di sini karena analisis memakai kuota/token.
BUG_URL_INVALID = "Staging: URL tidak valid ('bukan-url') tetap mengaktifkan tombol Analyze, tanpa validasi format"


@tc("SEO-15")
def test_08_15_analyze_nonaktif_saat_kosong(seo):
    """Saat URL dan keyword kosong, tombol Analyze nonaktif."""
    expect(seo.analyze_button).to_be_disabled()


@tc("SEO-16")
def test_08_16_analyze_aktif_setelah_url_diisi(seo):
    """Mengisi URL yang valid mengaktifkan tombol Analyze (keyword opsional). Tidak diklik: memakai token."""
    seo.url_input.fill("https://example.com/page")
    expect(seo.analyze_button).to_be_enabled()


@tc("SEO-17")
def test_08_17_analyze_aktif_url_dan_keyword(seo):
    """URL dan keyword terisi: Analyze aktif. Tidak diklik: memakai token."""
    seo.url_input.fill("https://example.com/page")
    seo.keyword_input.fill("kopi susu")
    expect(seo.analyze_button).to_be_enabled()


@tc("SEO-18")
def test_08_18_analyze_nonaktif_hanya_keyword(seo):
    """Hanya keyword tanpa URL: Analyze tetap nonaktif."""
    seo.keyword_input.fill("kopi susu")
    expect(seo.analyze_button).to_be_disabled()


@tc("SEO-19")
def test_08_19_analyze_nonaktif_input_spasi(seo):
    """URL dan keyword berisi spasi saja dianggap kosong: Analyze nonaktif."""
    seo.url_input.fill("   ")
    seo.keyword_input.fill("   ")
    expect(seo.analyze_button).to_be_disabled()


@tc("SEO-20")
def test_08_20_analyze_nonaktif_lagi_setelah_dikosongkan(seo):
    """Setelah URL diisi lalu dihapus, Analyze kembali nonaktif."""
    seo.url_input.fill("https://example.com/page")
    expect(seo.analyze_button).to_be_enabled()
    seo.url_input.fill("")
    expect(seo.analyze_button).to_be_disabled()


@tc("SEO-21", bug=BUG_URL_INVALID)
def test_08_21_url_tidak_valid_ditolak(seo):
    """URL tanpa format yang benar ('bukan-url') seharusnya tidak mengaktifkan Analyze."""
    seo.url_input.fill("bukan-url")
    seo.keyword_input.fill("kopi susu")
    expect(seo.analyze_button).to_be_disabled()


@tc("SEO-22")
def test_08_22_input_panjang_diterima_tanpa_error(seo):
    """Keyword 500 karakter diterima dan halaman tidak error."""
    seo.keyword_input.fill("k" * 500)
    expect(seo.keyword_input).to_have_value("k" * 500)
    expect(seo.tab("Overview")).to_be_visible()


@tc("SEO-23")
def test_08_23_input_html_tidak_dieksekusi(seo):
    """Keyword berisi tag HTML/script tidak menjalankan script dan halaman tetap normal."""
    dialogs = []
    seo.page.on("dialog", lambda d: (dialogs.append(d.message), d.dismiss()))
    seo.keyword_input.fill("<script>alert(1)</script>")
    seo.url_input.fill("javascript:alert(1)")
    seo.page.wait_for_timeout(1000)
    assert dialogs == [], f"Script dieksekusi: {dialogs}"
    expect(seo.tab("Overview")).to_be_visible()


# ============================================================ OVERVIEW: kartu ringkasan & grafik
@tc("SEO-24")
def test_08_24_kartu_ringkasan_tampil(seo):
    """Empat kartu ringkasan tampil: SEO Health Score, Indexed Pages, Keywords Ranking, AI Citations."""
    for label in ("SEO Health Score", "Indexed Pages", "Keywords Ranking", "AI Citations"):
        expect(seo.page.get_by_text(rx(label, exact=True)).first).to_be_visible()


@tc("SEO-25")
def test_08_25_skor_seo_format(seo):
    """SEO Health Score ditampilkan dalam format 'NN/100'."""
    expect(seo.page.get_by_text(re.compile(r"^\s*\d{1,3}/100\s*$")).first).to_be_visible()


@tc("SEO-26")
def test_08_26_bagian_grafik_tampil(seo):
    """Bagian AI Citations, Organic Traffic, dan Position Distribution tampil."""
    for heading in ("AI Citations", "Organic Traffic", "Position Distribution"):
        expect(seo.page.get_by_text(rx(heading, exact=True)).first).to_be_visible()


@tc("SEO-27")
def test_08_27_position_distribution_rentang(seo):
    """Position Distribution memuat rentang Top 3, 4-10, 11-20, dan 21+."""
    for rng in ("Top 3", "4-10", "11-20", "21+"):
        expect(seo.page.get_by_text(rx(rng, exact=True)).first).to_be_visible()


@tc("SEO-28")
def test_08_28_pilihan_grafik_traffic(seo):
    """Pilihan 'Organic Traffic' dan 'Organic Pages' tampil dan bisa diklik tanpa error."""
    traffic = seo.page.get_by_text(rx("Organic Traffic", exact=True)).last  # pilihan di kanan judul grafik
    pages = seo.page.get_by_text(rx("Organic Pages", exact=True)).first
    expect(traffic).to_be_visible()
    expect(pages).to_be_visible()
    pages.click()
    traffic.click()
    expect(seo.tab("Overview")).to_have_attribute("aria-selected", "true")


@tc("SEO-29")
def test_08_29_isi_tab_content_ideas(seo):
    """Tab Content Ideas menampilkan bagian 'Topic Research'."""
    seo.tab("Content Ideas").click()
    expect(seo.page.get_by_text(rx("Topic Research")).first).to_be_visible()


@tc("SEO-30")
def test_08_30_isi_tab_keywords(seo):
    """Tab Keywords menampilkan 'Keywords Explorer'."""
    seo.tab("Keywords").click()
    expect(seo.page.get_by_text(rx("Keywords Explorer")).first).to_be_visible()


@tc("SEO-31")
def test_08_31_kembali_ke_overview(seo):
    """Berpindah tab lalu kembali ke Overview menampilkan kartu ringkasan lagi."""
    seo.tab("Keywords").click()
    seo.tab("Overview").click()
    expect(seo.tab("Overview")).to_have_attribute("aria-selected", "true")
    expect(seo.page.get_by_text(rx("SEO Health Score", exact=True)).first).to_be_visible()


@tc("SEO-32")
def test_08_32_input_tetap_setelah_pindah_tab(seo):
    """Isi URL tidak hilang setelah berpindah tab dan kembali (atau dikosongkan tanpa error)."""
    seo.url_input.fill("https://example.com/page")
    seo.tab("Backlinks").click()
    seo.tab("Overview").click()
    expect(seo.url_input).to_be_visible()


@tc("SEO-33")
def test_08_33_submenu_seo_di_sidebar(seo):
    """Sidebar SEO memuat submenu Overview dan Articles."""
    nav = seo.page.get_by_role("navigation")
    expect(nav.get_by_role("link", name=rx("Overview", exact=True))).to_be_visible()
    expect(nav.get_by_role("link", name=rx("Articles", exact=True))).to_be_visible()
