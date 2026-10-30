"""Menu SEO (E2E-08-xx). BELUM ada di Google Sheet; ID ini usulan dan dibuat dari UI staging.

Halaman Growth Intel · SEO punya 9 tab. Analisis nyata (tombol Analyze) memakai kuota/token,
jadi hanya dicek kesiapan input-nya.
"""
import pytest
from playwright.sync_api import expect

from pages.seo_page import TABS
from utils.tc import tc

pytestmark = pytest.mark.seo


@tc("E2E-08-01")
def test_08_01_akses_halaman(seo):
    """Judul Growth Intel · SEO dan seluruh 9 tab tampil."""
    for name in TABS:
        expect(seo.tab(name)).to_be_visible()


@tc("E2E-08-02")
def test_08_02_tab_default_overview(seo):
    """Tab Overview aktif saat halaman dibuka."""
    expect(seo.tab("Overview")).to_have_attribute("aria-selected", "true")


SITE_AUDIT_BUG = pytest.mark.xfail(
    reason="Bug: membuka tab Site Audit menampilkan 'Application error: a client-side exception has occurred'",
    strict=False)


@pytest.mark.parametrize("name", [
    pytest.param(n, marks=[pytest.mark.tc(f"E2E-08-{i:02d}")] + ([SITE_AUDIT_BUG] if n == "Site Audit" else []))
    for i, n in enumerate(TABS[1:], start=3)
])
def test_08_03_sd_10_buka_tab(seo, name):
    """Setiap tab bisa dibuka dan menjadi aktif; tab lain tidak aktif."""
    seo.tab(name).click()
    expect(seo.tab(name)).to_have_attribute("aria-selected", "true")
    expect(seo.tab("Overview")).to_have_attribute("aria-selected", "false")


@tc("E2E-08-11")
def test_08_11_input_analisis_overview(seo):
    """Overview punya input URL halaman, input keyword, dan tombol Analyze."""
    expect(seo.url_input).to_be_visible()
    expect(seo.keyword_input).to_be_visible()
    expect(seo.analyze_button).to_be_visible()


@tc("E2E-08-12")
def test_08_12_input_menerima_teks(seo):
    """URL dan keyword tampil utuh sesuai yang diketik."""
    seo.url_input.fill("https://example.com/page")
    seo.keyword_input.fill("kopi susu gula aren")
    expect(seo.url_input).to_have_value("https://example.com/page")
    expect(seo.keyword_input).to_have_value("kopi susu gula aren")


@tc("E2E-08-13")
def test_08_13_analyze_tanpa_input(seo):
    """Analyze tanpa URL/keyword tidak memulai analisis (tombol nonaktif atau ada validasi)."""
    seo.analyze_button.click(force=True)
    seo.page.wait_for_timeout(800)
    expect(seo.tab("Overview")).to_have_attribute("aria-selected", "true")
    assert seo.analyze_button.is_disabled() or seo.page.get_by_text(
        __import__("re").compile("required|wajib|enter|masukkan", __import__("re").I)).count() > 0


@tc("E2E-08-14")
def test_08_14_tab_tidak_hilang_setelah_reload(seo):
    """Reload halaman tetap menampilkan seluruh tab."""
    seo.page.reload()
    for name in TABS:
        expect(seo.tab(name)).to_be_visible(timeout=30000)
