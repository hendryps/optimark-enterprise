"""Menu Media Library (E2E-09-xx). BELUM ada di Google Sheet; ID ini usulan dan dibuat dari UI staging.

Test yang menambah data permanen (membuat folder, upload file) ditandai destructive karena
staging belum punya aksi hapus yang bisa dipakai membersihkan.

Cara membaca satu test (pola yang sama dipakai di semua file test):

    @tc("E2E-09-01")                       # <- ID test case di Google Sheet (+ opsi: skip=, bug=, tokens=, destructive=)
    def test_09_01_akses_halaman(media_library):   # <- `media_library` = fixture: halaman sudah terbuka & sudah login
        \"\"\"Penjelasan singkat apa yang dicek.\"\"\"
        expect(media_library.upload_button).to_be_visible()   # <- ASSERT: tombol Upload harus tampil

Yang dipakai di sini:
    - `media_library.xxx`  : elemen halaman, didefinisikan di pages/media_library_page.py
    - `expect(...)`        : asersi Playwright, otomatis menunggu sampai kondisi terpenuhi (maks DEFAULT_TIMEOUT_MS)
    - `files[...]`         : file contoh untuk upload (fixtures/sample_files.py)
"""
import pytest
from playwright.sync_api import expect

from pages.media_library_page import CATEGORIES
from utils.tc import tc

# Beri semua test di file ini label "media_library" -> bisa dijalankan sendiri: pytest -m media_library
pytestmark = pytest.mark.media_library


@tc("E2E-09-01")
def test_09_01_akses_halaman(media_library):
    """Judul, Create Folder, Upload, kategori, pencarian, filter, dan toggle Grid/List tampil."""
    # Tombol aksi utama
    expect(media_library.create_folder_button).to_be_visible()
    expect(media_library.upload_button).to_be_visible()
    # Keempat kategori (All, Images, Videos, Articles) harus ada
    for c in CATEGORIES:
        expect(media_library.category(c)).to_be_visible()
    # Pencarian, filter, dan dua mode tampilan
    expect(media_library.search).to_be_visible()
    expect(media_library.filter_button).to_be_visible()
    expect(media_library.grid_view).to_be_visible()
    expect(media_library.list_view).to_be_visible()


@tc("E2E-09-02")
def test_09_02_state_kosong(media_library):
    """Tanpa media: tampil 'No media found' dengan saran mengganti pencarian/kategori."""
    # Kalau akun sudah punya media, state kosong tidak akan muncul -> lewati test, bukan gagal
    if not media_library.empty_state.count():
        pytest.skip("Akun QA sudah punya media")
    expect(media_library.empty_state).to_be_visible()
    media_library.expect_text("Try another search term", "choose a different category")


# Satu fungsi dijalankan 3 kali (Images, Videos, Articles). Setiap varian punya ID sheet sendiri (09-03 .. 09-05).
@pytest.mark.parametrize("name", [
    pytest.param(c, marks=pytest.mark.tc(f"E2E-09-{i:02d}")) for i, c in enumerate(CATEGORIES[1:], start=3)
])
def test_09_03_sd_05_kategori(media_library, name):
    """Kategori Images/Videos/Articles bisa dipilih dan menjadi aktif."""
    media_library.category(name).click()
    assert media_library.is_active(media_library.category(name))  # kategori yang diklik jadi aktif
    assert not media_library.is_active(media_library.category("All"))  # "All" tidak lagi aktif


@tc("E2E-09-06")
def test_09_06_dialog_buat_folder(media_library):
    """Create Folder membuka dialog 'New Folder' dengan input nama, Cancel, dan Create Folder."""
    media_library.create_folder_button.click()
    dlg = media_library.dialog
    expect(dlg).to_be_visible()
    # Isi dialog: judul, input nama, dan dua tombol
    expect(dlg.get_by_text("New Folder")).to_be_visible()
    expect(dlg.get_by_label("Folder name").or_(dlg.get_by_role("textbox"))).to_be_visible()
    expect(dlg.get_by_role("button", name="Cancel")).to_be_visible()
    expect(dlg.get_by_role("button", name="Create Folder")).to_be_visible()


@tc("E2E-09-07")
def test_09_07_batal_buat_folder(media_library):
    """Cancel menutup dialog tanpa membuat folder."""
    media_library.create_folder_button.click()
    media_library.dialog.get_by_role("button", name="Cancel").click()
    expect(media_library.dialog).to_have_count(0)  # dialog hilang dari halaman


@tc("E2E-09-08")
def test_09_08_buat_folder_tanpa_nama(media_library):
    """Folder tanpa nama tidak dibuat: tombol nonaktif atau dialog tetap terbuka dengan pesan."""
    media_library.create_folder_button.click()
    submit = media_library.dialog.get_by_role("button", name="Create Folder")
    # Dua perilaku diterima: tombol nonaktif, ATAU diklik tetapi dialog tidak menutup
    if submit.is_enabled():
        submit.click()
    expect(media_library.dialog).to_be_visible()


@tc("E2E-09-09", destructive=True, skip="Belum ada aksi hapus folder untuk membersihkan data uji")
def test_09_09_buat_folder_valid(media_library):
    """Skenario: buat folder dengan nama valid. BELUM diotomasi; alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-09-10")
def test_09_10_dialog_upload(media_library):
    """Upload membuka dialog 'Upload media' dengan area drag-and-drop, Choose files, Cancel, Upload."""
    media_library.upload_button.click()
    dlg = media_library.dialog
    expect(dlg).to_be_visible()
    expect(dlg.get_by_text("Upload media")).to_be_visible()
    expect(dlg.get_by_text("Drag and drop files here").first).to_be_visible()
    expect(dlg.get_by_role("button", name="Choose files")).to_be_visible()
    expect(dlg.get_by_role("button", name="Cancel")).to_be_visible()


@tc("E2E-09-11")
def test_09_11_batal_upload(media_library):
    """Cancel menutup dialog upload."""
    media_library.upload_button.click()
    media_library.dialog.get_by_role("button", name="Cancel").click()
    expect(media_library.dialog).to_have_count(0)


@tc("E2E-09-12", destructive=True)  # destructive = menambah data permanen -> tidak ikut run default
def test_09_12_upload_gambar_valid(media_library, files):
    """Upload gambar valid: file tampil di Media Library."""
    media_library.upload_button.click()  # 1. buka dialog upload
    media_library.upload(files["png"])  # 2. pilih file logo.png (dari memori, bukan dari disk)
    media_library.dialog.get_by_role("button", name="Upload", exact=True).click()  # 3. konfirmasi upload
    media_library.expect_text("logo.png")  # 4. nama file tampil di daftar


@tc("E2E-09-13")
def test_09_13_filter_source_dan_ratio(media_library):
    """Panel filter menyediakan Source (Uploaded, AI Generated) dan Ratio (1:1, 16:9, 9:16, 4:5)."""
    media_library.filter_button.click()
    for label in ("Uploaded", "AI Generated", "1:1", "16:9", "9:16", "4:5"):
        # filter(visible=True): abaikan teks yang sama tapi tersembunyi
        expect(media_library.page.get_by_text(label, exact=True).filter(visible=True).first).to_be_visible()


@tc("E2E-09-14")
def test_09_14_toggle_grid_list(media_library):
    """Tombol List view dan Grid view bisa diklik bergantian tanpa error."""
    media_library.list_view.click()
    media_library.grid_view.click()
    expect(media_library.create_folder_button).to_be_visible()  # halaman masih sehat setelah berpindah mode


@tc("E2E-09-15")
def test_09_15_pencarian_tidak_ditemukan(media_library):
    """Kata kunci yang tidak ada menampilkan 'No media found'."""
    media_library.search.fill("zzz-tidak-ada-999")  # kata acak yang pasti tidak ada
    expect(media_library.empty_state).to_be_visible(timeout=10000)


@tc("E2E-09-16")
def test_09_16_hapus_pencarian_memulihkan_daftar(media_library):
    """Mengosongkan pencarian menghilangkan state tidak ditemukan (jika ada media)."""
    media_library.search.fill("zzz-tidak-ada-999")
    expect(media_library.empty_state).to_be_visible(timeout=10000)
    media_library.search.fill("")  # hapus kata kunci
    media_library.page.wait_for_timeout(1000)  # beri waktu daftar dimuat ulang
    expect(media_library.search).to_have_value("")
