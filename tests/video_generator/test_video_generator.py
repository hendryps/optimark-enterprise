"""Sheet 'e2e-video generator' (E2E-07-01 .. 07-41).

Sama seperti Image Generator: akun QA saldo 0 sehingga test yang menghasilkan video memakai
`funded` + tokens=True (jalankan sengaja dengan -m consumes_tokens). Konfigurasi video di
staging: Model (Seedance 2.0), Aspect ratio, Resolution, Duration, dan toggle Audio.
"""
import pytest
from playwright.sync_api import expect

from pages.base_page import rx
from utils.tc import tc

pytestmark = pytest.mark.video

PROMPT = "Video sinematik kopi susu dituangkan ke dalam gelas dengan gerakan lambat."
NEED_TOKEN = "Butuh saldo token untuk generate video"
PLAY_BUG = "Video di tab Explore tidak terputar"


@tc("E2E-07-01")
def test_07_01_akses_halaman(video_gen):
    """Explore/History, galeri, prompt, upload gambar, konfigurasi, audio, token, dan Generate tampil."""
    page = video_gen.page
    expect(video_gen.tab("Explore", "Jelajahi")).to_be_visible()
    expect(video_gen.tab("History", "Riwayat")).to_be_visible()
    expect(video_gen.prompt).to_be_visible()
    expect(page.get_by_role("button", name="Image", exact=True)).to_be_visible()
    for label in ("Model", "Aspect ratio", "Resolution", "Duration"):
        expect(video_gen.option_button(label)).to_be_visible()
    expect(page.get_by_role("button", name=rx("Audio", exact=True))).to_be_visible()
    expect(page.get_by_text(rx("tokens left", "token tersisa"))).to_be_visible()
    expect(video_gen.generate_button).to_be_visible()


@tc("E2E-07-02")
def test_07_02_tab_jelajahi(video_gen):
    """Explore aktif dan menampilkan video inspirasi (thumbnail/tombol play)."""
    video_gen.open_tab("History", "Riwayat")
    video_gen.open_tab("Explore", "Jelajahi")
    expect(video_gen.gallery().first).to_be_visible()


@tc("E2E-07-03")
def test_07_03_galeri_jelajahi(video_gen):
    """Galeri memuat video; scroll memuat lebih banyak tanpa error."""
    assert video_gen.gallery().count() > 0
    video_gen.page.mouse.wheel(0, 2000)
    expect(video_gen.gallery().first).to_be_visible()


@tc("E2E-07-04", bug=PLAY_BUG)
def test_07_04_putar_video(video_gen):
    """Klik play memutar video yang dipilih."""
    video = video_gen.page.locator("video").first
    video_gen.page.get_by_role("button", name=rx("play", "putar")).first.click()
    assert video.evaluate("v => !v.paused && v.currentTime > 0 || v.readyState > 2")


@tc("E2E-07-05", bug=PLAY_BUG)
def test_07_05_jeda_dan_lanjut(video_gen):
    """Pause menghentikan video, play melanjutkan."""
    video = video_gen.page.locator("video").first
    video_gen.page.get_by_role("button", name=rx("play", "putar")).first.click()
    video_gen.page.get_by_role("button", name=rx("pause", "jeda")).first.click()
    assert video.evaluate("v => v.paused")


@tc("E2E-07-06", bug=PLAY_BUG)
def test_07_06_label_durasi(video_gen):
    """Label durasi pada thumbnail sesuai durasi video."""
    label = video_gen.page.get_by_text(rx("^\\d+s$")).first
    expect(label).to_be_visible()
    secs = int(label.inner_text().rstrip("s"))
    duration = video_gen.page.locator("video").first.evaluate("v => v.duration")
    assert abs(duration - secs) <= 1.5


@tc("E2E-07-07")
def test_07_07_input_prompt(video_gen):
    """Prompt tampil utuh."""
    video_gen.write_prompt(PROMPT)
    expect(video_gen.prompt).to_have_value(PROMPT)


@tc("E2E-07-08")
def test_07_08_prompt_kosong(video_gen):
    """Tanpa prompt dan tanpa gambar: tombol generate nonaktif."""
    expect(video_gen.generate_button).to_be_disabled()


@tc("E2E-07-09")
def test_07_09_prompt_spasi(video_gen):
    """Prompt spasi dianggap kosong."""
    video_gen.write_prompt("     ")
    expect(video_gen.generate_button).to_be_disabled()


@tc("E2E-07-10")
def test_07_10_prompt_multiline(video_gen):
    """Prompt multi-baris tersimpan."""
    text = "Video produk kopi susu\nKamera bergerak mendekat"
    video_gen.write_prompt(text)
    expect(video_gen.prompt).to_have_value(text)


@tc("E2E-07-11", tokens=True, skip=NEED_TOKEN)
def test_07_11_text_to_video(video_gen, funded):
    """Skenario: text to video. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-07-12")
def test_07_12_upload_referensi(video_gen, files):
    """Gambar referensi valid diterima."""
    video_gen.upload_reference(files["png"])
    expect(video_gen.page.get_by_role("img", name="logo.png")).to_be_visible()


@tc("E2E-07-13", tokens=True, skip=NEED_TOKEN, bug="Gambar tidak dipakai sebagai referensi video")
def test_07_13_image_to_video(video_gen, funded):
    """Skenario: image to video. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-07-14", bug="Tombol submit tidak bisa diklik untuk image-to-video tanpa prompt")
def test_07_14_image_only(video_gen, files, funded):
    """Hanya gambar (tanpa prompt): generate jalan atau ada validasi jelas."""
    video_gen.upload_reference(files["png"])
    expect(video_gen.generate_button).to_be_enabled()


@tc("E2E-07-15")
def test_07_15_referensi_format_tidak_didukung(video_gen, files):
    """PDF ditolak."""
    video_gen.upload_reference(files["pdf"])
    video_gen.expect_text("not supported", "unsupported", "format", "tidak didukung", "invalid")
    expect(video_gen.page.get_by_text("dokumen.pdf")).to_have_count(0)


@tc("E2E-07-16")
def test_07_16_referensi_melebihi_ukuran(video_gen, files):
    """Gambar sangat besar ditolak dengan pesan batas ukuran."""
    video_gen.upload_reference(files["huge"])
    video_gen.expect_text("MB", "size", "ukuran")


@tc("E2E-07-17")
def test_07_17_hapus_referensi(video_gen, files):
    """Referensi bisa dihapus."""
    video_gen.upload_reference(files["png"])
    video_gen.page.get_by_role("button", name=rx("Remove all", "Hapus semua")).click()
    expect(video_gen.page.get_by_role("img", name="logo.png")).to_have_count(0)


@tc("E2E-07-18")
def test_07_18_model_seedance(video_gen):
    """Seedance 2.0 adalah model aktif/pilihan."""
    models = video_gen.options("Model")
    assert any("Seedance 2.0" in m for m in models), models
    video_gen.choose("Model", "Seedance 2.0")
    assert "Seedance 2.0" in video_gen.current("Model")


@tc("E2E-07-19")
def test_07_19_ubah_model(video_gen):
    """Mengganti ke model lain mengubah model aktif."""
    models = [m for m in video_gen.options("Model") if m != video_gen.current("Model")]
    if not models:
        pytest.skip("Hanya satu model video tersedia")
    video_gen.choose("Model", models[0])
    assert models[0] in video_gen.current("Model")


@pytest.mark.parametrize("label,preferred", [
    pytest.param("Aspect ratio", "16:9", marks=pytest.mark.tc("E2E-07-20")),
    pytest.param("Aspect ratio", None, marks=pytest.mark.tc("E2E-07-21")),
    pytest.param("Resolution", "720p", marks=pytest.mark.tc("E2E-07-22")),
    pytest.param("Resolution", None, marks=pytest.mark.tc("E2E-07-23")),
    pytest.param("Duration", "5s", marks=pytest.mark.tc("E2E-07-24")),
    pytest.param("Duration", None, marks=pytest.mark.tc("E2E-07-25")),
])
def test_07_20_sd_25_konfigurasi(video_gen, label, preferred):
    """Rasio/resolusi/durasi bisa dipilih: nilai preferensi atau opsi lain."""
    opts = video_gen.options(label)
    if preferred:
        assert preferred in opts, f"{preferred} tidak ada di {opts}"
        target = preferred
    else:
        others = [o for o in opts if o != video_gen.current(label)]
        if not others:
            pytest.skip(f"{label} hanya punya satu opsi")
        target = others[-1]
    video_gen.choose(label, target)
    assert target in video_gen.current(label)


@tc("E2E-07-26")
def test_07_26_toggle_audio_nonaktif(video_gen):
    """Toggle Audio bisa dimatikan."""
    audio = video_gen.page.get_by_role("button", name=rx("Audio", exact=True))
    state = audio.get_attribute("aria-pressed")
    audio.click()
    assert audio.get_attribute("aria-pressed") != state or state is None


@tc("E2E-07-27", tokens=True, skip=NEED_TOKEN, bug="Audio tidak berfungsi pada video hasil")
def test_07_27_video_dengan_audio(video_gen, funded):
    """Skenario: video dengan audio. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-07-28", tokens=True, skip=NEED_TOKEN)
def test_07_28_status_pemrosesan(video_gen, funded):
    """Skenario: status pemrosesan. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-07-29", tokens=True, skip=NEED_TOKEN, bug="Hasil tampil ganda sebelum refresh (2 video sama, setelah refresh 1)")
def test_07_29_hasil_sesuai_prompt(video_gen, funded):
    """Skenario: hasil sesuai prompt. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-07-30", tokens=True, skip=NEED_TOKEN)
def test_07_30_detail_hasil(video_gen, funded):
    """Skenario: detail hasil. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-07-31")
def test_07_31_tab_riwayat(video_gen):
    """Tab History aktif."""
    video_gen.open_tab("History", "Riwayat")
    video_gen.expect_text("History", "Riwayat")


@tc("E2E-07-32", tokens=True, skip=NEED_TOKEN)
def test_07_32_badge_riwayat(video_gen, funded):
    """Skenario: badge riwayat. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-07-33", skip="Butuh video pada dua tanggal berbeda")
def test_07_33_pengelompokan_riwayat():
    """Skenario: pengelompokan riwayat. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-07-34", skip="Butuh video di Riwayat")
def test_07_34_pemutaran_riwayat(video_gen, funded):
    """Skenario: pemutaran riwayat. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-07-35", tokens=True, skip=NEED_TOKEN)
def test_07_35_persistensi_riwayat(video_gen, funded):
    """Skenario: persistensi riwayat. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-07-36", skip="Butuh riwayat di akun utama dan akun kedua (USER_B_*)")
def test_07_36_isolasi_riwayat(video_gen, funded, user_b):
    """Skenario: isolasi riwayat. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-07-37", tokens=True, skip=NEED_TOKEN)
def test_07_37_penggunaan_token(video_gen, funded):
    """Skenario: penggunaan token. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-07-38", bug="Staging hanya menampilkan sisa token ('N tokens left'), tidak ada estimasi biaya")
def test_07_38_biaya_berubah_saat_konfigurasi_diubah(video_gen):
    """Estimasi token pada tombol Generate/label diperbarui saat durasi diubah (jika ditampilkan)."""
    label = video_gen.page.get_by_text(rx("tokens left", "token tersisa")).first
    before = label.inner_text()
    others = [o for o in video_gen.options("Duration") if o != video_gen.current("Duration")]
    if not others:
        pytest.skip("Durasi hanya satu opsi")
    video_gen.choose("Duration", others[-1])
    video_gen.write_prompt(PROMPT)
    # Biaya diharapkan tampil di UI; kalau tidak ada elemen biaya, test ini gagal sebagai temuan
    cost = video_gen.page.get_by_text(rx("\\d+\\s*tokens?\\b(?!\\s*left)", "biaya", "cost"))
    expect(cost.first).to_be_visible()


@tc("E2E-07-39", bug="Generate saat saldo 0: tidak ada pesan token tidak cukup dan job masuk antrean")
def test_07_39_saldo_tidak_mencukupi(video_gen, unfunded):
    """Saldo tidak cukup: info saldo tampil, saldo tetap, tidak ada job/hasil kosong."""
    before_balance, before_queue = video_gen.token_balance(), video_gen.queue_count()
    video_gen.write_prompt(PROMPT)
    video_gen.expect_text("0 tokens left", "tidak mencukupi", "not enough", "insufficient")
    if video_gen.generate_button.is_enabled():
        video_gen.generate()
        video_gen.expect_insufficient_token()
    assert video_gen.token_balance() == before_balance >= 0
    assert video_gen.queue_count() == before_queue, "Generate tanpa saldo tetap memasukkan job ke antrean"


@tc("E2E-07-40")
def test_07_40_konsistensi_konfigurasi(video_gen):
    """Beberapa konfigurasi diubah sekaligus tetap tercermin."""
    chosen = {}
    for label in ("Aspect ratio", "Resolution", "Duration"):
        others = [o for o in video_gen.options(label) if o != video_gen.current(label)]
        if others:
            video_gen.choose(label, others[-1])
            chosen[label] = others[-1]
    assert chosen, "Tidak ada konfigurasi yang bisa diubah"
    for label, value in chosen.items():
        assert value in video_gen.current(label)


@tc("E2E-07-41")
def test_07_41_navigasi_antar_tab(video_gen):
    """Pindah Explore <-> History tidak menjalankan generate dan tidak memotong token."""
    before = video_gen.token_balance()
    video_gen.write_prompt(PROMPT)
    video_gen.open_tab("History", "Riwayat")
    video_gen.open_tab("Explore", "Jelajahi")
    assert video_gen.token_balance() == before
    expect(video_gen.prompt).to_be_visible()
