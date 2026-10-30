"""Tiket ODA-230 Use Brand Hub Toggle in Composer.

Acceptance Criteria (ringkas):
    AC-01 toggle di AI Image, AI Video, AI Article Writer, dan AI Caption (Content Composer); posisi awal selalu OFF
    AC-02 OFF -> hanya prompt/instruksi/gambar user yang dikirim
    AC-03 ON  -> data Brand Hub ikut dikirim dan user bisa melihat ringkasannya
    AC-04 Business Name / Short Description kosong -> pop-up isi data saat toggle ON
    AC-05 pilihan ON/OFF tersimpan bersama hasil generate dan tidak mengubah Brand Hub
    AC-06 mengubah toggle tidak menghapus prompt/foto/setting

AC-02/AC-03 diperiksa dari payload request generate (flag using_brandhub); AC-05 butuh hasil generate sukses.
"""
import pytest
from playwright.sync_api import expect

from utils.tc import tc

pytestmark = [pytest.mark.jira, pytest.mark.composer]


# ------------------------------------------------------------------ AC-01 posisi awal OFF
@tc("ODA-230-01")
def test_oda230_01_composer_toggle_ada_dan_off(composer):
    """AC-01: Create Post (AI Caption) punya switch 'Use Brand Hub' dengan posisi awal OFF."""
    composer.open_create_form()
    composer.expect_text("Use Brand Hub")
    expect(composer.use_brand_hub).to_be_visible()
    expect(composer.use_brand_hub).to_have_attribute("aria-checked", "false")
    composer.expect_text("Generate with only your prompt and selected settings")


@tc("ODA-230-02")
def test_oda230_02_image_generator_toggle_off(image_gen):
    """AC-01: Image Generator punya toggle Brand Hub dengan posisi awal OFF."""
    expect(image_gen.brand_hub_switch).to_be_visible()
    expect(image_gen.brand_hub_switch).to_have_attribute("aria-pressed", "false")


@tc("ODA-230-03")
def test_oda230_03_video_generator_toggle_off(video_gen):
    """AC-01: Video Generator punya toggle Brand Hub dengan posisi awal OFF."""
    expect(video_gen.brand_hub_switch).to_be_visible()
    expect(video_gen.brand_hub_switch).to_have_attribute("aria-pressed", "false")


@tc("ODA-230-04")
def test_oda230_04_toggle_selalu_mulai_off(composer):
    """AC-01: setelah dinyalakan lalu halaman dimuat ulang, posisi awal kembali OFF."""
    composer.open_create_form()
    composer.use_brand_hub.click()
    expect(composer.use_brand_hub).to_have_attribute("aria-checked", "true")
    composer.page.reload()
    expect(composer.use_brand_hub).to_have_attribute("aria-checked", "false")


@tc("ODA-230-05", skip="AI Article Writer di staging masih 'Coming soon' (AI Draft Generator), belum ada toggle-nya")
def test_oda230_05_toggle_ai_article_writer(composer):
    """Skenario AC-01: toggle Use Brand Hub di AI Article Writer."""
    ...


# ------------------------------------------------------------------ AC-03 ringkasan saat ON
@tc("ODA-230-06")
def test_oda230_06_on_menampilkan_ringkasan_brand(composer, app):
    """AC-03: toggle ON menampilkan ringkasan Brand Hub (nama brand dan industri) dan teks penjelasan."""
    composer.open_create_form()
    composer.use_brand_hub.click()
    expect(composer.use_brand_hub).to_have_attribute("aria-checked", "true")
    composer.expect_text("Brand profile and visual identity will guide this generation")
    composer.expect_text("Using Usaha Hermanto")  # nama brand dari Brand Hub akun QA


@tc("ODA-230-07")
def test_oda230_07_off_kembali_ke_teks_awal(composer):
    """AC-02 (UI): setelah dimatikan lagi, teks kembali 'Generate with only your prompt...' dan ringkasan hilang."""
    composer.open_create_form()
    composer.use_brand_hub.click()
    composer.use_brand_hub.click()
    expect(composer.use_brand_hub).to_have_attribute("aria-checked", "false")
    composer.expect_text("Generate with only your prompt and selected settings")
    expect(composer.page.get_by_text("Using Usaha Hermanto")).to_have_count(0)


# ------------------------------------------------------------------ AC-06 input tidak hilang
@tc("ODA-230-08")
def test_oda230_08_ubah_toggle_tidak_menghapus_input(composer):
    """AC-06: judul yang sudah diketik tetap ada setelah toggle ON lalu OFF."""
    composer.open_create_form()
    composer.post_name.fill("Judul uji toggle QA")
    composer.use_brand_hub.click()
    expect(composer.post_name).to_have_value("Judul uji toggle QA")
    composer.use_brand_hub.click()
    expect(composer.post_name).to_have_value("Judul uji toggle QA")


@tc("ODA-230-09")
def test_oda230_09_prompt_generator_tidak_hilang(image_gen):
    """AC-06: prompt di Image Generator tetap ada setelah toggle Brand Hub diubah."""
    image_gen.write_prompt("kopi susu gula aren di gelas bening")
    image_gen.brand_hub_switch.click()
    expect(image_gen.brand_hub_switch).to_have_attribute("aria-pressed", "true")
    expect(image_gen.prompt).to_have_value("kopi susu gula aren di gelas bening")
    image_gen.brand_hub_switch.click()
    expect(image_gen.prompt).to_have_value("kopi susu gula aren di gelas bening")


# ------------------------------------------------------------------ AC-05 Brand Hub tidak berubah
@tc("ODA-230-10")
def test_oda230_10_toggle_tidak_mengubah_brand_hub(composer):
    """AC-05: menyalakan toggle tidak mengubah isi Brand Hub (nama brand tetap sama)."""
    composer.goto("/brand-hub/brand-profile")
    before = composer.page.get_by_placeholder("Example: Kopi Senja").input_value()
    composer.open_create_form()
    composer.use_brand_hub.click()
    composer.goto("/brand-hub/brand-profile")
    expect(composer.page.get_by_placeholder("Example: Kopi Senja")).to_have_value(before)


@tc("ODA-230-11", skip="Akun QA sudah punya Business Name & Short Description; butuh akun dengan profil Brand Hub kosong")
def test_oda230_11_popup_isi_data_brand_wajib(composer):
    """Skenario AC-04: toggle ON dengan Business Name/Short Description kosong memunculkan pop-up pengisian."""
    ...


@tc("ODA-230-12", tokens=True)
def test_oda230_12_payload_generate_off_dan_on(image_gen, funded):
    """AC-02/AC-03: request generate membawa using_brandhub=false saat OFF dan true saat ON (dicek dari payload API)."""
    off = image_gen.generate_and_capture("QA test toggle OFF: kopi susu")
    assert off["payload"].get("using_brandhub") is False, off["payload"]
    image_gen.goto("/image-generator")
    image_gen.page.wait_for_load_state("networkidle")  # tunggu halaman siap supaya klik toggle tidak hilang
    image_gen.brand_hub_switch.click()
    expect(image_gen.brand_hub_switch).to_have_attribute("aria-pressed", "true")
    on = image_gen.generate_and_capture("QA test toggle ON: kopi susu")
    assert on["payload"].get("using_brandhub") is True, on["payload"]
