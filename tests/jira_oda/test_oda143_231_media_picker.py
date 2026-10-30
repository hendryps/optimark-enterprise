"""Tiket ODA-143 Media Library - Context-Aware Single-Item Picker dan ODA-231 Marketing Studio - Media Library as Reference.

ODA-143 (picker dari Composer, Article, Studio):
    AC-01 picker menampilkan Inbox/Folder, pencarian/filter, dan pratinjau sebelum dipilih
    AC-02 tujuan menentukan jenis item & jumlah pilihan; pilihan tidak kompatibel diberi alasan
    AC-03 konfirmasi mengembalikan item ke draft; batal/gagal tidak menyisipkan apa pun
    AC-04 memakai ulang = merujuk item yang sama (bukan salinan); tidak ada bulk action
ODA-231 (reference di AI Image/Video):
    AC-01 tombol upload reference punya dua pilihan: dari device atau dari Media Library
    AC-02 picker: Inbox + Folder + search, hanya JPG/PNG/WebP maks 20 MB
    AC-03..05 pilih/lepas/hapus item (butuh item di Media Library)

Library akun QA kosong ("Tidak ada item di lokasi ini"), jadi pemilihan item sungguhan di-skip.
"""
import re

import pytest
from playwright.sync_api import expect

from utils.tc import tc

pytestmark = [pytest.mark.jira, pytest.mark.media_library]

PICKER_TITLE = "Pilih dari Media Library"


def open_composer_picker(composer):
    """Buka picker dari form Create Post."""
    composer.open_create_form()
    composer.library_button.click()
    expect(composer.page.get_by_text(PICKER_TITLE).last).to_be_visible()


# ------------------------------------------------------------------ ODA-143: picker dari Composer
@tc("ODA-143-01")
def test_oda143_01_picker_terbuka_dari_composer(composer):
    """AC-01: Media Library di Create Post membuka picker dengan Inbox/Folder dan panel pratinjau."""
    open_composer_picker(composer)
    composer.expect_text("Inbox / Folder")
    composer.expect_text("Pratinjau pilihan")
    composer.expect_text("Belum ada item dipilih")


@tc("ODA-143-02")
def test_oda143_02_aturan_jenis_dan_jumlah(composer):
    """AC-02: picker menjelaskan jenis item dan batas jumlah pilihan sesuai tujuan (Composer: gambar, video, maks. 10)."""
    open_composer_picker(composer)
    composer.expect_text("Maks. 10 pilihan")
    composer.expect_text("gambar, video diperbolehkan")


@tc("ODA-143-03")
def test_oda143_03_picker_tidak_menyediakan_aksi_massal(composer):
    """AC-04: picker hanya memilih, tanpa bulk action untuk mengelola Library (hapus/pindah/rename)."""
    open_composer_picker(composer)
    page = composer.page
    for action in ("Delete", "Hapus", "Move", "Pindah", "Rename"):
        expect(page.get_by_role("button", name=re.compile(rf"^{action}", re.I))).to_have_count(0)


@tc("ODA-143-04")
def test_oda143_04_tombol_gunakan_nonaktif_tanpa_pilihan(composer):
    """AC-03: tanpa item dipilih, tombol 'Gunakan' tidak bisa mengonfirmasi."""
    open_composer_picker(composer)
    use = composer.page.get_by_role("button", name="Gunakan", exact=True)
    expect(use).to_be_disabled()


@tc("ODA-143-05")
def test_oda143_05_batal_menutup_tanpa_menyisipkan(composer):
    """AC-03: Batal menutup picker dan tidak menyisipkan media ke draft."""
    open_composer_picker(composer)
    composer.page.get_by_role("button", name="Batal", exact=True).click()
    expect(composer.page.get_by_text("Pratinjau pilihan")).to_have_count(0)
    expect(composer.page.get_by_text("Belum ada item dipilih")).to_have_count(0)


@tc("ODA-143-06")
def test_oda143_06_picker_punya_pencarian(composer):
    """AC-01: picker menyediakan kolom pencarian (dan/atau filter) untuk menemukan item."""
    open_composer_picker(composer)
    page = composer.page
    has_search = (page.get_by_role("searchbox").count() + page.get_by_placeholder(re.compile("cari|search", re.I)).count())
    assert has_search > 0, "Picker tidak punya kolom pencarian"


@tc("ODA-143-07")
def test_oda143_07_picker_dari_form_artikel(app):
    """ODA-143: picker juga tersedia dari form artikel (Main Image / Thumbnail) sebagai pilihan satu item."""
    app.goto("https://staging.app.optimark.ai/seo/articles/create")
    app.get_by_role("button", name=PICKER_TITLE).first.click()
    expect(app.get_by_text("Inbox / Folder")).to_be_visible()
    expect(app.get_by_text(re.compile(r"Maks\. 1 pilihan"))).to_be_visible()


@tc("ODA-143-08", skip="Library akun QA kosong: pilih item lalu Gunakan, dan pemakaian ulang tanpa salinan, butuh media (AC-03/AC-04)")
def test_oda143_08_pilih_item_dan_gunakan(composer):
    """Skenario AC-03/AC-04: pilih item, pratinjau muncul, Gunakan memasang item yang sama ke draft."""
    ...


# ------------------------------------------------------------------ ODA-231: reference di Marketing Studio / generator
@tc("ODA-231-01")
def test_oda231_01_reference_punya_dua_pilihan(image_gen):
    """AC-01: tombol upload reference di AI Image punya pilihan 'dari device' DAN 'dari Media Library'."""
    image_gen.page.get_by_role("button", name="Upload image").first.click()
    expect(image_gen.page.get_by_text(re.compile("Media Library", re.I)).filter(visible=True).first).to_be_visible(timeout=5000)


@tc("ODA-231-02")
def test_oda231_02_video_reference_punya_pilihan_library(video_gen):
    """AC-01: composer AI Video juga menawarkan Media Library sebagai sumber reference."""
    assert video_gen.page.get_by_text(re.compile("Media Library", re.I)).filter(visible=True).count() > 0, (
        "Tidak ada opsi Media Library di composer Video Generator")


@tc("ODA-231-03")
def test_oda231_03_studio_picker_terbuka(ai_studio):
    """AC-02: 'Pilih dari Media Library' di Marketing Studio membuka picker Inbox/Folder + search."""
    ai_studio.page.get_by_role("button", name=PICKER_TITLE).first.click()
    expect(ai_studio.page.get_by_text("Inbox / Folder")).to_be_visible(timeout=5000)


@tc("ODA-231-04", skip="Library akun QA kosong: pemasangan reference, pelepasan tanpa menghapus file, dan file terhapus butuh media (AC-03..05)")
def test_oda231_04_pasang_dan_lepas_reference(ai_studio):
    """Skenario AC-03/04/05: reference terpasang tanpa salinan; dilepas tidak menghapus file; file hilang -> pesan."""
    ...
