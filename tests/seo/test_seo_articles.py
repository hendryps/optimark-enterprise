"""SEO > Articles (SEO-ART-xx): daftar artikel, form New Article / Edit Article, pencarian, hapus.

Aturan yang ditemukan di staging (2 Nov 2026):
  - Kolom yang divalidasi: Title, Meta Title, Meta Description ("... is required"). Slug terisi otomatis dari Title.
  - Excerpt, Alt Text, Author, Meta Keywords tidak divalidasi walau berlabel bintang.
  - Create sukses: toast "Article created" lalu kembali ke /seo/articles. Tiap kartu punya Edit / Export / Delete.

Test yang MENYIMPAN atau MENGHAPUS data diberi destructive=True (tidak ikut run default; jalankan dengan -m "").
Artikel uji dibuat dengan judul unik dan dihapus lagi lewat fixture `sample_article`.
"""
import re
import warnings

import pytest
from playwright.sync_api import expect

from pages.base_page import rx
from pages.seo_articles_page import CREATE_PATH, LIST_PATH, ArticlesPage, unique_title
from utils.tc import tc

pytestmark = pytest.mark.seo

TITLE_REQUIRED = "Title is required"
META_TITLE_REQUIRED = "Meta title is required"
META_DESC_REQUIRED = "Meta description is required"

BUG_SEARCH = "Staging: pencarian tidak memfilter, artikel yang tidak cocok dengan kata kunci tetap tampil"
BUG_CATEGORIES = "Staging: form artikel menampilkan toast 'Failed to load categories' (Category tidak bisa dipilih)"
BUG_AUTHOR = "Staging: Author yang diisi tidak tersimpan (daftar menampilkan 'Unknown', form Edit kosong)"


# ============================================================ DAFTAR ARTIKEL (positif)
@tc("SEO-ART-01")
def test_art_01_akses_daftar_artikel(articles):
    """Judul, deskripsi, tombol New Article, kartu Total Articles, kolom cari, dan tombol Search tampil."""
    expect(articles.list_heading).to_be_visible()
    expect(articles.page.get_by_text(rx("Create and save article drafts"))).to_be_visible()
    expect(articles.new_article_link).to_be_visible()
    expect(articles.search_input).to_be_visible()
    expect(articles.search_button).to_be_visible()


@tc("SEO-ART-02")
def test_art_02_total_artikel_berupa_angka(articles):
    """Kartu Total Articles menampilkan angka 0 atau lebih."""
    assert articles.total_articles() >= 0


@tc("SEO-ART-03")
def test_art_03_navigasi_sidebar_ke_articles(seo):
    """Submenu SEO > Articles di sidebar membuka daftar artikel."""
    seo.page.get_by_role("link", name=rx("Articles", exact=True)).first.click()
    seo.expect_url_contains(LIST_PATH)
    expect(seo.page.get_by_role("heading", name=rx("Articles Management"))).to_be_visible()


@tc("SEO-ART-04")
def test_art_04_tombol_new_article(articles):
    """Tombol New Article membuka form New Article."""
    articles.new_article_link.click()
    articles.expect_url_contains(CREATE_PATH)
    expect(articles.page.get_by_role("heading", name=rx("New Article", exact=True))).to_be_visible()


@tc("SEO-ART-05")
def test_art_05_reload_daftar_tetap_tampil(articles):
    """Reload halaman daftar tidak menghilangkan judul maupun kolom cari."""
    articles.page.reload()
    expect(articles.list_heading).to_be_visible(timeout=30000)
    expect(articles.search_input).to_be_visible()


# ============================================================ FORM NEW ARTICLE (positif)
@tc("SEO-ART-06")
def test_art_06_bagian_form_lengkap(article_form):
    """Form memuat bagian Basic Information, Media, Taxonomy, SEO beserta kolom utamanya."""
    for heading in ("Basic Information", "Media", "Taxonomy", "SEO"):
        expect(article_form.page.get_by_role("heading", name=rx(heading, exact=True))).to_be_visible()
    for field in (article_form.title_input, article_form.slug_input, article_form.excerpt_input,
                  article_form.alt_text_input, article_form.author_input, article_form.meta_title_input,
                  article_form.meta_keywords_input, article_form.meta_description_input):
        expect(field).to_be_visible()
    expect(article_form.create_button).to_be_visible()
    expect(article_form.cancel_button).to_be_visible()


@tc("SEO-ART-07")
def test_art_07_live_preview_mengikuti_judul(article_form):
    """Live Preview menampilkan 'Untitled article', lalu berubah mengikuti Title yang diketik."""
    expect(article_form.preview_title).to_have_text(rx("Untitled article", exact=True))
    article_form.title_input.fill("Panduan Belajar SEO Pemula")
    expect(article_form.preview_title).to_have_text("Panduan Belajar SEO Pemula")


@tc("SEO-ART-08")
def test_art_08_slug_otomatis_dari_judul(article_form):
    """Slug terisi otomatis dari Title dalam huruf kecil dengan tanda hubung."""
    article_form.title_input.fill("Panduan Belajar SEO Pemula")
    expect(article_form.slug_input).to_have_value("panduan-belajar-seo-pemula")


@tc("SEO-ART-09")
def test_art_09_slug_dinormalisasi(article_form):
    """Slug yang diketik dengan spasi dan simbol dirapikan menjadi format slug."""
    article_form.slug_input.fill("Slug Dengan Spasi!!")
    article_form.slug_input.press("Tab")
    expect(article_form.slug_input).to_have_value("slug-dengan-spasi")


@tc("SEO-ART-10")
def test_art_10_preview_pencarian_mengikuti_meta(article_form):
    """Search Preview menampilkan Meta Title dan Meta Description yang diketik."""
    article_form.meta_title_input.fill("Judul Meta Uji Preview")
    article_form.meta_description_input.fill("Deskripsi meta untuk uji preview hasil pencarian.")
    expect(article_form.page.get_by_text("Judul Meta Uji Preview").last).to_be_visible()
    expect(article_form.page.get_by_text("Deskripsi meta untuk uji preview hasil pencarian.").last).to_be_visible()


@tc("SEO-ART-11")
def test_art_11_sembunyikan_dan_tampilkan_preview(article_form):
    """Tombol Hide preview menyembunyikan Live Preview, dan menampilkannya lagi saat diklik ulang."""
    expect(article_form.preview_panel).to_be_visible()
    article_form.preview_toggle.click()
    expect(article_form.preview_panel).to_be_hidden()
    article_form.preview_toggle.click()
    expect(article_form.preview_panel).to_be_visible()


@tc("SEO-ART-12")
def test_art_12_export_nonaktif_sebelum_disimpan(article_form):
    """Export nonaktif di form baru karena artikel belum tersimpan."""
    expect(article_form.export_button).to_be_disabled()


@tc("SEO-ART-13")
def test_art_13_fitur_ai_belum_tersedia(article_form):
    """Generate with AI menampilkan 'Coming soon' dan Generate image nonaktif."""
    expect(article_form.page.get_by_text(rx("Coming soon")).first).to_be_visible()
    expect(article_form.button("Generate image")).to_be_disabled()


@tc("SEO-ART-14")
def test_art_14_cancel_kembali_ke_daftar(articles):
    """Cancel di form New Article kembali ke daftar tanpa menambah artikel."""
    before = articles.total_articles()
    articles.new_article_link.click()
    expect(articles.title_input).to_be_visible()
    articles.title_input.fill(unique_title("Batal"))
    articles.cancel_button.click()
    expect(articles.page).to_have_url(re.compile(rf"{LIST_PATH}/?$"))
    expect(articles.list_heading).to_be_visible()
    assert articles.total_articles() == before


# ============================================================ FORM NEW ARTICLE (negatif / validasi)
@tc("SEO-ART-15")
def test_art_15_create_form_kosong(article_form):
    """Create tanpa mengisi apa pun ditolak: muncul 'Title is required' dan tetap di form."""
    article_form.create_button.click()
    expect(article_form.toast(TITLE_REQUIRED).first).to_be_visible()
    article_form.expect_url_contains(CREATE_PATH)


@tc("SEO-ART-16")
def test_art_16_create_hanya_judul(article_form):
    """Hanya Title terisi: Meta Title dan Meta Description wajib muncul sebagai pesan error di kolomnya."""
    article_form.title_input.fill(unique_title("Hanya Judul"))
    article_form.create_button.click()
    expect(article_form.page.get_by_text(META_TITLE_REQUIRED).first).to_be_visible()
    expect(article_form.page.get_by_text(META_DESC_REQUIRED).first).to_be_visible()
    article_form.expect_url_contains(CREATE_PATH)


@tc("SEO-ART-17")
def test_art_17_title_hanya_spasi(article_form):
    """Title berisi spasi saja dianggap kosong: 'Title is required'."""
    article_form.title_input.fill("     ")
    article_form.meta_title_input.fill("Meta uji")
    article_form.meta_description_input.fill("Deskripsi uji")
    article_form.create_button.click()
    expect(article_form.toast(TITLE_REQUIRED).first).to_be_visible()
    article_form.expect_url_contains(CREATE_PATH)


@tc("SEO-ART-18")
def test_art_18_tanpa_meta_title(article_form):
    """Meta Title kosong ditolak walau kolom lain terisi."""
    article_form.title_input.fill(unique_title("Tanpa Meta Title"))
    article_form.meta_description_input.fill("Deskripsi uji")
    article_form.create_button.click()
    expect(article_form.page.get_by_text(META_TITLE_REQUIRED).first).to_be_visible()
    expect(article_form.page.get_by_text(META_DESC_REQUIRED)).to_have_count(0)
    article_form.expect_url_contains(CREATE_PATH)


@tc("SEO-ART-19")
def test_art_19_tanpa_meta_description(article_form):
    """Meta Description kosong ditolak walau kolom lain terisi."""
    article_form.title_input.fill(unique_title("Tanpa Meta Desc"))
    article_form.meta_title_input.fill("Meta uji")
    article_form.create_button.click()
    expect(article_form.page.get_by_text(META_DESC_REQUIRED).first).to_be_visible()
    expect(article_form.page.get_by_text(META_TITLE_REQUIRED)).to_have_count(0)
    article_form.expect_url_contains(CREATE_PATH)


@tc("SEO-ART-20")
def test_art_20_meta_hanya_spasi(article_form):
    """Meta Title dan Meta Description berisi spasi saja dianggap kosong."""
    article_form.title_input.fill(unique_title("Meta Spasi"))
    article_form.meta_title_input.fill("   ")
    article_form.meta_description_input.fill("   ")
    article_form.create_button.click()
    expect(article_form.page.get_by_text(META_TITLE_REQUIRED).first).to_be_visible()
    expect(article_form.page.get_by_text(META_DESC_REQUIRED).first).to_be_visible()


@tc("SEO-ART-21")
def test_art_21_judul_html_tidak_dieksekusi(article_form):
    """Title berisi tag HTML/script tampil sebagai teks di preview dan tidak menjalankan script."""
    dialogs = []
    article_form.page.on("dialog", lambda d: (dialogs.append(d.message), d.dismiss()))
    payload = "<img src=x onerror=alert(1)>"
    article_form.title_input.fill(payload)
    expect(article_form.preview_title).to_have_text(payload)
    article_form.page.wait_for_timeout(1000)
    assert dialogs == [], f"Script dieksekusi: {dialogs}"


@tc("SEO-ART-22", bug=BUG_CATEGORIES)
def test_art_22_kategori_termuat(article_form):
    """Membuka form tidak menampilkan error 'Failed to load categories'."""
    article_form.page.wait_for_timeout(3000)
    expect(article_form.toast("Failed to load categories")).to_have_count(0)


# ============================================================ PENCARIAN
@tc("SEO-ART-23")
def test_art_23_cari_spasi_tidak_error(articles):
    """Mencari dengan spasi saja tidak merusak halaman: daftar tetap tampil."""
    articles.search("   ")
    expect(articles.list_heading).to_be_visible()
    expect(articles.page.get_by_text(rx("Application error"))).to_have_count(0)


@tc("SEO-ART-24")
def test_art_24_cari_karakter_khusus_aman(articles):
    """Kata kunci berisi tag HTML tidak menjalankan script dan tidak merusak halaman."""
    dialogs = []
    articles.page.on("dialog", lambda d: (dialogs.append(d.message), d.dismiss()))
    articles.search("<script>alert(1)</script>")
    articles.page.wait_for_timeout(1500)
    expect(articles.list_heading).to_be_visible()
    assert dialogs == [], f"Script dieksekusi: {dialogs}"


@tc("SEO-ART-25")
def test_art_25_cari_dengan_enter(articles):
    """Menekan Enter di kolom cari tidak menyebabkan error halaman."""
    articles.search_input.fill("artikel")
    articles.search_input.press("Enter")
    expect(articles.list_heading).to_be_visible()


@tc("SEO-ART-26", destructive=True)
def test_art_26_cari_judul_yang_ada(sample_article):
    """Mencari judul artikel yang ada menampilkan kartu artikel tersebut."""
    articles = sample_article.page.open_list()
    articles.search(sample_article.title)
    expect(articles.card(sample_article.title)).to_be_visible()


@tc("SEO-ART-27", destructive=True)
def test_art_27_cari_tidak_peka_huruf(sample_article):
    """Pencarian tidak membedakan huruf besar/kecil."""
    articles = sample_article.page.open_list()
    articles.search(sample_article.title.lower())
    expect(articles.card(sample_article.title)).to_be_visible()


@tc("SEO-ART-28", destructive=True, bug=BUG_SEARCH)
def test_art_28_cari_tanpa_hasil(sample_article):
    """Kata kunci yang tidak cocok menyembunyikan artikel dan tidak menampilkan kartu lain."""
    articles = sample_article.page.open_list()
    articles.search("zzzxqj-kata-tidak-ada")
    expect(articles.card(sample_article.title)).to_be_hidden(timeout=8000)


# ============================================================ CREATE / EDIT / DELETE (menyimpan data)
@tc("SEO-ART-29", destructive=True)
def test_art_29_create_semua_kolom(articles):
    """Create dengan semua kolom terisi: toast 'Article created', kembali ke daftar, kartu muncul, total bertambah."""
    before = articles.total_articles()
    title = unique_title()
    articles.new_article_link.click()
    articles.fill_all(title)
    articles.create_button.click()
    try:
        expect(articles.toast("Article created").first).to_be_visible()
        expect(articles.page).to_have_url(re.compile(rf"{LIST_PATH}/?$"), timeout=30000)
        expect(articles.card(title)).to_be_visible(timeout=30000)
        assert articles.total_articles() == before + 1
    finally:
        _cleanup(articles, title)


@tc("SEO-ART-30", destructive=True)
def test_art_30_create_hanya_kolom_wajib(articles):
    """Create hanya dengan Title, Meta Title, dan Meta Description berhasil."""
    title = unique_title("Minimal")
    articles.new_article_link.click()
    articles.fill_required(title)
    articles.create_button.click()
    try:
        expect(articles.toast("Article created").first).to_be_visible()
        expect(articles.card(title)).to_be_visible(timeout=30000)
    finally:
        _cleanup(articles, title)


@tc("SEO-ART-31", destructive=True)
def test_art_31_create_judul_ganda_ditolak(sample_article):
    """Membuat artikel kedua dengan judul (slug) yang sama ditolak: tetap di form, tanpa toast 'Article created'."""
    articles = sample_article.page.open_list()
    articles.new_article_link.click()
    articles.fill_required(sample_article.title)
    articles.create_button.click()
    articles.page.wait_for_timeout(3000)
    try:
        expect(articles.toast("Article created")).to_have_count(0)
        articles.expect_url_contains(CREATE_PATH)
    finally:
        if LIST_PATH + "/create" not in articles.page.url:  # kalau ternyata terbuat dobel, buang yang ekstra
            articles.open_list()
            while articles.page.get_by_role("link", name=sample_article.title, exact=True).count() > 1:
                articles.delete_article(sample_article.title)
                articles.page.wait_for_timeout(1500)


@tc("SEO-ART-32", destructive=True)
def test_art_32_edit_membuka_data_tersimpan(sample_article):
    """Edit membuka form 'Edit Article' berisi judul yang tersimpan, dengan tombol Save dan Cancel."""
    articles = sample_article.page.open_list()
    articles.edit_link(sample_article.title).click()
    expect(articles.page.get_by_role("heading", name=rx("Edit Article", exact=True))).to_be_visible()
    expect(articles.title_input).to_have_value(sample_article.title)
    expect(articles.save_button).to_be_visible()
    expect(articles.cancel_button).to_be_visible()


@tc("SEO-ART-33", destructive=True)
def test_art_33_edit_simpan_perubahan(sample_article):
    """Mengubah judul lalu Save memperbarui kartu di daftar."""
    articles = sample_article.page.open_list()
    articles.edit_link(sample_article.title).click()
    new_title = unique_title("QA Diubah")
    articles.title_input.fill(new_title)
    articles.save_button.click()
    sample_article.title = new_title  # supaya fixture menghapus artikel dengan judul terbaru
    articles.open_list()
    expect(articles.card(new_title)).to_be_visible(timeout=30000)


@tc("SEO-ART-34", destructive=True)
def test_art_34_edit_judul_kosong_ditolak(sample_article):
    """Mengosongkan Title lalu Save ditolak: 'Title is required' dan judul di daftar tidak berubah."""
    articles = sample_article.page.open_list()
    articles.edit_link(sample_article.title).click()
    articles.title_input.fill("")
    articles.save_button.click()
    expect(articles.toast(TITLE_REQUIRED).first).to_be_visible()
    articles.open_list()
    expect(articles.card(sample_article.title)).to_be_visible()


@tc("SEO-ART-35", destructive=True)
def test_art_35_edit_cancel_tidak_menyimpan(sample_article):
    """Cancel di form Edit kembali ke daftar tanpa menyimpan perubahan."""
    articles = sample_article.page.open_list()
    articles.edit_link(sample_article.title).click()
    articles.title_input.fill(unique_title("Jangan Tersimpan"))
    articles.cancel_button.click()
    expect(articles.page).to_have_url(re.compile(rf"{LIST_PATH}/?$"))
    expect(articles.card(sample_article.title)).to_be_visible()


@tc("SEO-ART-36", destructive=True, bug=BUG_AUTHOR)
def test_art_36_author_tersimpan(sample_article):
    """Author yang diisi saat Create tampil lagi di form Edit."""
    articles = sample_article.page.open_list()
    articles.edit_link(sample_article.title).click()
    expect(articles.author_input).to_have_value("QA Tester")


@tc("SEO-ART-37", destructive=True)
def test_art_37_hapus_artikel(sample_article):
    """Delete menghapus artikel: kartu hilang dari daftar dan Total Articles berkurang satu."""
    articles = sample_article.page.open_list()
    before = articles.total_articles()
    articles.delete_article(sample_article.title)
    expect(articles.card(sample_article.title)).to_have_count(0, timeout=15000)
    assert articles.total_articles() == before - 1


# ============================================================ AKSES & ROUTING (negatif)
@tc("SEO-ART-38")
def test_art_38_akses_tanpa_login(anon):
    """Membuka /seo/articles tanpa login diarahkan ke halaman login."""
    ArticlesPage(anon).goto(LIST_PATH)
    expect(anon).to_have_url(re.compile("login"), timeout=30000)


@tc("SEO-ART-39")
def test_art_39_form_tanpa_login(anon):
    """Membuka form New Article tanpa login diarahkan ke halaman login."""
    ArticlesPage(anon).goto(CREATE_PATH)
    expect(anon).to_have_url(re.compile("login"), timeout=30000)


@tc("SEO-ART-40")
def test_art_40_artikel_tidak_ada(app):
    """Membuka artikel dengan ID yang tidak ada tidak menampilkan 'Application error'."""
    ArticlesPage(app).goto(f"{LIST_PATH}/id-artikel-tidak-ada")
    app.wait_for_timeout(4000)
    expect(app.get_by_text(re.compile("Application error", re.I))).to_have_count(0)
    assert app.locator("body").inner_text().strip(), "Halaman kosong"


def _cleanup(articles: ArticlesPage, title: str) -> None:
    """Hapus artikel uji (best-effort) supaya staging tidak menumpuk data."""
    try:
        articles.open_list()
        if articles.card(title).count():
            articles.delete_article(title)
            expect(articles.card(title)).to_have_count(0, timeout=15000)
    except Exception as exc:
        warnings.warn(f"Artikel uji '{title}' gagal dihapus otomatis, hapus manual di SEO > Articles: {exc}")
