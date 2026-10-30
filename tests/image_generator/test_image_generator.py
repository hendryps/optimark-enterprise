"""Sheet 'e2e-image generator' (E2E-06-01 .. 06-35).

Akun QA saldo 0 (tombol Generate nonaktif, label '0 tokens left'), jadi test yang benar-benar
menghasilkan gambar memakai `funded` + tokens=True dan hanya jalan kalau dipilih sengaja:
    pytest -m consumes_tokens tests/image_generator/
Test konfigurasi/validasi/UI tidak memakai token.
"""
import pytest
from playwright.sync_api import expect

from pages.base_page import rx
from utils.tc import tc

pytestmark = pytest.mark.image

PROMPT = "Buat poster promosi kopi susu gula aren dengan gaya modern."
NEED_TOKEN = "Butuh saldo token untuk generate"
INSPIRATION_BUG = "Gambar di tab Explore tidak bisa diklik"


@tc("E2E-06-01")
def test_06_01_akses_halaman(image_gen):
    """Explore/History, galeri, prompt, referensi, konfigurasi, token, dan tombol generate tampil."""
    page = image_gen.page
    expect(image_gen.tab("Explore", "Jelajahi")).to_be_visible()
    expect(image_gen.tab("History", "Riwayat")).to_be_visible()
    expect(image_gen.gallery().first).to_be_visible()
    expect(image_gen.prompt).to_be_visible()
    expect(page.get_by_role("button", name="Image", exact=True)).to_be_visible()
    for label in ("Model", "Aspect ratio", "Quality", "Style", "Number of images"):
        expect(image_gen.option_button(label)).to_be_visible()
    expect(page.get_by_text(rx("tokens left", "token tersisa", "sisa token"))).to_be_visible()
    expect(image_gen.generate_button).to_be_visible()


@tc("E2E-06-02")
def test_06_02_tab_jelajahi(image_gen):
    """Tab Explore aktif dan menampilkan galeri inspirasi."""
    image_gen.open_tab("History", "Riwayat")
    image_gen.open_tab("Explore", "Jelajahi")
    expect(image_gen.gallery().first).to_be_visible()


@tc("E2E-06-03")
def test_06_03_galeri_jelajahi(image_gen):
    """Galeri memuat banyak gambar tanpa duplikat judul."""
    titles = image_gen.gallery().locator("p").all_inner_texts()
    assert len(titles) >= 6
    assert len(titles) == len(set(titles)), "Ada gambar inspirasi duplikat"
    image_gen.page.mouse.wheel(0, 2000)
    expect(image_gen.gallery().first).to_be_visible()


@tc("E2E-06-04", bug=INSPIRATION_BUG)
def test_06_04_pilih_inspirasi(image_gen):
    """Klik gambar inspirasi membuka detail / menerapkan prompt tanpa generate otomatis."""
    prompt_before = image_gen.prompt.input_value()
    image_gen.gallery().first.click()
    image_gen.page.wait_for_timeout(800)
    changed = image_gen.prompt.input_value() != prompt_before or image_gen.page.get_by_role("dialog").count() > 0
    assert changed, "Klik gambar tidak membuka detail dan tidak mengisi prompt"


@tc("E2E-06-05")
def test_06_05_input_prompt(image_gen):
    """Prompt tampil utuh; tombol generate aktif jika syarat terpenuhi (saldo cukup)."""
    image_gen.write_prompt(PROMPT)
    expect(image_gen.prompt).to_have_value(PROMPT)


@tc("E2E-06-06")
def test_06_06_prompt_kosong(image_gen):
    """Prompt kosong: tombol generate nonaktif."""
    expect(image_gen.generate_button).to_be_disabled()


@tc("E2E-06-07")
def test_06_07_prompt_spasi(image_gen):
    """Prompt spasi dianggap kosong: tombol generate tetap nonaktif."""
    image_gen.write_prompt("     ")
    expect(image_gen.generate_button).to_be_disabled()


@tc("E2E-06-08")
def test_06_08_prompt_multiline(image_gen):
    """Prompt beberapa baris tersimpan dengan baris yang sama."""
    text = "Poster kopi susu\nWarna dominan hijau"
    image_gen.write_prompt(text)
    expect(image_gen.prompt).to_have_value(text)


@tc("E2E-06-09")
def test_06_09_pilih_model(image_gen):
    """Daftar model tampil dan GPT Image 1.5 bisa dipilih."""
    models = image_gen.options("Model")
    assert any("GPT Image 1.5" in m for m in models), models
    image_gen.choose("Model", "GPT Image 1.5")
    assert "GPT Image 1.5" in image_gen.current("Model")


@tc("E2E-06-10", tokens=True, skip=NEED_TOKEN)
def test_06_10_rasio_1_1(image_gen, funded):
    """Skenario: rasio 1 1. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@pytest.mark.parametrize("label,option", [
    pytest.param("Aspect ratio", "3:2", marks=pytest.mark.tc("E2E-06-11")),
    pytest.param("Quality", "High", marks=pytest.mark.tc("E2E-06-13")),
    pytest.param("Style", None, marks=pytest.mark.tc("E2E-06-15")),
])
def test_06_11_13_15_konfigurasi_dapat_diubah(image_gen, label, option):
    """Pilihan rasio/kualitas/style berubah dan tampil pada tombol konfigurasi."""
    opts = image_gen.options(label)
    target = option if option in opts else next(o for o in opts if o != image_gen.current(label))
    image_gen.choose(label, target)
    assert target in image_gen.current(label)


@tc("E2E-06-12")
def test_06_12_kualitas_sedang(image_gen):
    """Kualitas default adalah Medium dan bisa dipilih."""
    assert "Medium" in image_gen.current("Quality")
    image_gen.choose("Quality", "Medium")
    assert "Medium" in image_gen.current("Quality")


@tc("E2E-06-14")
def test_06_14_style_default(image_gen):
    """Style default adalah Default dan bisa dipilih."""
    assert "Default" in image_gen.current("Style")
    image_gen.choose("Style", "Default")
    assert "Default" in image_gen.current("Style")


@tc("E2E-06-16")
def test_06_16_jumlah_output_1(image_gen):
    """Number of images bisa diubah menjadi 1."""
    image_gen.choose("Number of images", "1")
    assert image_gen.current("Number of images").endswith("1")


@tc("E2E-06-17")
def test_06_17_jumlah_output_4(image_gen):
    """Number of images default 4 dan bisa dipilih."""
    assert image_gen.current("Number of images").endswith("4")
    image_gen.choose("Number of images", "1")
    image_gen.choose("Number of images", "4")
    assert image_gen.current("Number of images").endswith("4")


@tc("E2E-06-18")
def test_06_18_upload_referensi(image_gen, files):
    """Gambar referensi valid diterima (thumbnail/nama tampil)."""
    image_gen.upload_reference(files["png"])
    expect(image_gen.page.get_by_role("img", name="Reference")).to_be_visible()


@tc("E2E-06-19", tokens=True, skip=NEED_TOKEN)
def test_06_19_generate_dengan_referensi(image_gen, funded):
    """Skenario: generate dengan referensi. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-06-20")
def test_06_20_referensi_format_tidak_didukung(image_gen, files):
    """PDF ditolak; referensi tidak ditambahkan."""
    image_gen.upload_reference(files["pdf"])
    image_gen.expect_text("not supported", "unsupported", "format", "tidak didukung", "invalid")
    expect(image_gen.page.get_by_text("dokumen.pdf")).to_have_count(0)


@tc("E2E-06-21")
def test_06_21_referensi_melebihi_ukuran(image_gen, files):
    """Gambar sangat besar ditolak dengan pesan batas ukuran."""
    image_gen.upload_reference(files["huge"])
    image_gen.expect_text("MB", "size", "ukuran")


@tc("E2E-06-22")
def test_06_22_hapus_referensi(image_gen, files):
    """Referensi bisa dihapus dari form."""
    image_gen.upload_reference(files["png"])
    image_gen.page.get_by_role("button", name=rx("Remove reference", "Hapus referensi")).click()
    expect(image_gen.page.get_by_role("img", name="Reference")).to_have_count(0)


@tc("E2E-06-23", tokens=True, skip=NEED_TOKEN)
def test_06_23_proses_generate(image_gen, funded):
    """Skenario: proses generate. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-06-24", tokens=True, skip=NEED_TOKEN)
def test_06_24_hasil_sesuai_prompt(image_gen, funded):
    """Skenario: hasil sesuai prompt. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-06-25", tokens=True, skip=NEED_TOKEN)
def test_06_25_detail_hasil(image_gen, funded):
    """Skenario: detail hasil. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-06-26")
def test_06_26_tab_riwayat(image_gen):
    """Tab History aktif."""
    image_gen.open_tab("History", "Riwayat")
    expect(image_gen.page.get_by_text(rx("Image Generator")).first).to_be_visible()
    image_gen.expect_text("History", "Riwayat")


@tc("E2E-06-27", tokens=True, skip=NEED_TOKEN)
def test_06_27_badge_riwayat(image_gen, funded):
    """Skenario: badge riwayat. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-06-28", skip="Butuh hasil generate pada dua tanggal berbeda")
def test_06_28_pengelompokan_riwayat():
    """Skenario: pengelompokan riwayat. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-06-29", tokens=True, skip=NEED_TOKEN)
def test_06_29_persistensi_riwayat(image_gen, funded):
    """Skenario: persistensi riwayat. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-06-30", skip="Butuh riwayat di akun utama dan akun kedua (USER_B_*)")
def test_06_30_isolasi_riwayat(image_gen, funded, user_b):
    """Skenario: isolasi riwayat. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-06-31", tokens=True, skip=NEED_TOKEN)
def test_06_31_penggunaan_token(image_gen, funded):
    """Skenario: penggunaan token. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-06-32", tokens=True, skip=NEED_TOKEN)
def test_06_32_perhitungan_token(image_gen, funded):
    """Skenario: perhitungan token. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-06-33", bug="Generate saat saldo 0: tidak ada pesan token tidak cukup dan job masuk antrean")
def test_06_33_saldo_tidak_mencukupi(image_gen, unfunded):
    """Saldo tidak cukup: permintaan tidak diproses, ada info saldo, saldo tetap, tidak ada job/hasil kosong."""
    before_balance, before_queue = image_gen.token_balance(), image_gen.queue_count()
    image_gen.write_prompt(PROMPT)
    image_gen.expect_text("0 tokens left", "tidak mencukupi", "not enough", "insufficient")
    if image_gen.generate_button.is_enabled():
        image_gen.generate()
        image_gen.expect_insufficient_token()
    assert image_gen.token_balance() == before_balance >= 0
    assert image_gen.queue_count() == before_queue, "Generate tanpa saldo tetap memasukkan job ke antrean"


@tc("E2E-06-34")
def test_06_34_konsistensi_konfigurasi(image_gen):
    """Beberapa konfigurasi diubah sekaligus tetap tercermin pada tombolnya."""
    image_gen.choose("Aspect ratio", "3:2")
    image_gen.choose("Number of images", "1")
    image_gen.choose("Quality", "High")
    assert "3:2" in image_gen.current("Aspect ratio")
    assert image_gen.current("Number of images").endswith("1")
    assert "High" in image_gen.current("Quality")


@tc("E2E-06-35")
def test_06_35_navigasi_antar_tab(image_gen, app):
    """Pindah Explore <-> History tidak menjalankan generate dan tidak memotong token."""
    before = image_gen.token_balance()
    image_gen.write_prompt(PROMPT)
    image_gen.open_tab("History", "Riwayat")
    image_gen.open_tab("Explore", "Jelajahi")
    assert image_gen.token_balance() == before
    expect(image_gen.prompt).to_be_visible()
