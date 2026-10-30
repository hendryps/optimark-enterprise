"""Sheet 'e2e-content composer' (E2E-04-01 .. 04-42).

Akun QA di staging belum punya data konten dan belum menghubungkan platform, jadi test
yang butuh konten/TikTok memakai fixture `with_content` / `connected` dan otomatis skip.
Test yang membuat post nyata ditandai destructive.
Bug yang sudah tercatat di sheet (status Fail) ditandai bug=... (xfail).
"""
import pytest
from playwright.sync_api import expect

from pages.base_page import rx
from pages.content_composer_page import STATUS_TABS, TAB_DRAFT, TAB_PUBLISHED, TAB_SCHEDULED
from utils import config
from utils.tc import tc

pytestmark = pytest.mark.composer

NEED_PLATFORM = "Butuh akun QA dengan platform (TikTok) terhubung"


# ----------------------------------------------------------------- List
@tc("E2E-04-01")
def test_04_01_akses_halaman(composer):
    """Halaman Content Planner: breadcrumb, tab status, pencarian, filter, List/Calendar, Create Post."""
    page = composer.page
    expect(page.get_by_role("navigation", name="Breadcrumb")).to_be_visible()
    for tab in STATUS_TABS:
        expect(composer.status_tab(tab)).to_be_visible()
    expect(composer.search).to_be_visible()
    expect(composer.type_filter).to_be_visible()
    expect(composer.view_tab("List")).to_be_visible()
    expect(composer.view_tab("Calendar", "Kalender")).to_be_visible()
    expect(composer.create_post_button).to_be_visible()


@tc("E2E-04-02")
def test_04_02_tampilan_list(composer, with_content):
    """List menampilkan konten sesuai tab aktif."""
    expect(composer.view_tab("List")).to_have_attribute("aria-selected", "true")
    assert composer.rows.count() > 0


@tc("E2E-04-03")
def test_04_03_jumlah_per_status(composer, with_content):
    """Badge tiap tab sama dengan jumlah baris yang tampil."""
    for tab in STATUS_TABS:
        composer.status_tab(tab).click()
        composer.page.wait_for_load_state("networkidle")
        assert composer.rows.count() == composer.status_badge(tab)


@pytest.mark.parametrize("tab", [
    pytest.param(TAB_DRAFT, marks=pytest.mark.tc("E2E-04-04")),
    pytest.param(TAB_SCHEDULED, marks=pytest.mark.tc("E2E-04-05")),
    pytest.param(TAB_PUBLISHED, marks=pytest.mark.tc("E2E-04-06")),
])
def test_04_04_sd_06_tab_status(composer, tab):
    """Tab status bisa dibuka dan menampilkan daftar atau state kosong."""
    composer.status_tab(tab).click()
    expect(composer.status_tab(tab)).to_have_attribute("aria-selected", "true")
    if composer.status_badge(tab) == 0:
        expect(composer.empty_state.first).to_be_visible()
    else:
        assert composer.rows.count() == composer.status_badge(tab)


@tc("E2E-04-07", skip="Butuh data konten dengan caption 'Testing E2E TikTok'")
def test_04_07_pencarian():
    """Skenario: pencarian. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-04-08")
def test_04_08_pencarian_tidak_ditemukan(composer):
    """Kata kunci yang tidak ada -> tidak ada baris, halaman tetap bisa dipakai."""
    composer.search.fill("konten-tidak-tersedia-999")
    composer.page.wait_for_timeout(1000)  # tunggu debounce pencarian
    assert composer.rows.count() == 0
    expect(composer.search).to_be_enabled()


@tc("E2E-04-09", skip="Butuh konten bertipe Video untuk memverifikasi hasil filter")
def test_04_09_filter_jenis_konten():
    """Skenario: filter jenis konten. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-04-10", skip="Butuh konten TikTok untuk memverifikasi hasil filter platform")
def test_04_10_filter_platform():
    """Skenario: filter platform. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-04-11", skip="Butuh data konten Promo/Video/TikTok untuk kombinasi filter")
def test_04_11_kombinasi_filter():
    """Skenario: kombinasi filter. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-04-12", skip="Butuh minimal tiga konten dengan waktu update berbeda")
def test_04_12_pengurutan():
    """Skenario: pengurutan. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-04-13", skip="Butuh konten Draft/Dijadwalkan")
def test_04_13_edit_postingan(composer, with_content):
    """Skenario: edit postingan. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-04-14", skip="Butuh satu data konten")
def test_04_14_menu_aksi(composer, with_content):
    """Skenario: menu aksi. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


# ----------------------------------------------------------------- Kalender
@tc("E2E-04-15")
def test_04_15_tampilan_kalender(composer):
    """Tab Calendar aktif; navigasi bulan, Today, dan filter Content Type/Status/Platform tampil."""
    composer.view_tab("Calendar", "Kalender").click()
    expect(composer.view_tab("Calendar", "Kalender")).to_have_attribute("aria-selected", "true")
    for nav in ("Previous", "Today", "Next"):
        expect(composer.cal_nav(nav)).to_be_visible()
    for flt in ("Content Type", "Status", "Platform"):
        expect(composer.button(flt, exact=True)).to_be_visible()


@tc("E2E-04-16")
def test_04_16_navigasi_kalender(composer):
    """Panah bulan sebelumnya/berikutnya mengubah judul bulan."""
    composer.view_tab("Calendar", "Kalender").click()
    now = composer.calendar_title()
    composer.cal_nav("Previous").click()
    assert composer.calendar_title() != now
    composer.cal_nav("Next").click()
    composer.cal_nav("Next").click()
    assert composer.calendar_title() not in (now,)
    composer.cal_nav("Previous").click()
    assert composer.calendar_title() == now


@tc("E2E-04-17")
def test_04_17_tombol_hari_ini(composer):
    """Tombol Today kembali ke bulan saat ini."""
    composer.view_tab("Calendar", "Kalender").click()
    now = composer.calendar_title()
    composer.cal_nav("Previous").click()
    composer.cal_nav("Today").click()
    assert composer.calendar_title() == now


@tc("E2E-04-18", skip="Butuh konten video TikTok berstatus Dijadwalkan")
def test_04_18_filter_kalender():
    """Skenario: filter kalender. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


# ----------------------------------------------------------------- Form Buat Postingan
@tc("E2E-04-19")
def test_04_19_akses_buat_postingan(composer, connected):
    """Form Create Post tampil lengkap."""
    composer.create_post_button.click()
    composer.expect_url_contains("/content-composer/create")
    expect(composer.title).to_be_visible()
    expect(composer.schedule_button).to_be_visible()
    expect(composer.draft_button).to_be_visible()
    expect(composer.cancel_button).to_be_visible()


@tc("E2E-04-20", skip=NEED_PLATFORM)
def test_04_20_pilih_akun_tiktok(composer, connected):
    """Skenario: pilih akun tiktok. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-04-21")
def test_04_21_tanpa_akun_terhubung(composer, unconnected):
    """Tanpa platform terhubung, tidak ada akun pilihan dan ada ajakan menghubungkan platform."""
    composer.create_post_button.click()
    composer.expect_text("connect", "hubungkan", "no account", "belum ada akun")


@tc("E2E-04-22", skip=NEED_PLATFORM)
def test_04_22_input_judul_caption(composer, connected):
    """Skenario: input judul caption. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-04-23", skip=NEED_PLATFORM)
def test_04_23_validasi_judul(composer, connected):
    """Skenario: validasi judul. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-04-24", skip=NEED_PLATFORM, bug="Field menerima >2.200 karakter, hanya muncul pesan batas")
def test_04_24_batas_caption(composer, connected):
    """Skenario: batas caption. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-04-25", skip=NEED_PLATFORM)
def test_04_25_emoji_caption(composer, connected):
    """Skenario: emoji caption. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-04-26", skip=NEED_PLATFORM)
def test_04_26_upload_video(composer, connected):
    """Skenario: upload video. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-04-27", skip=NEED_PLATFORM)
def test_04_27_validasi_media(composer, connected):
    """Skenario: validasi media. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-04-28", skip=NEED_PLATFORM)
def test_04_28_pratinjau(composer, connected):
    """Skenario: pratinjau. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-04-29", skip=NEED_PLATFORM + " dan token", tokens=True)
def test_04_29_generate_caption_ai(composer, connected, funded):
    """Skenario: generate caption ai. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-04-30", skip=NEED_PLATFORM)
def test_04_30_validasi_generate_ai(composer, connected):
    """Skenario: validasi generate ai. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-04-31", skip=NEED_PLATFORM + " dan media hasil generate")
def test_04_31_galeri_ai(composer, connected):
    """Skenario: galeri ai. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-04-32", skip=NEED_PLATFORM)
def test_04_32_toggle_jadwal(composer, connected):
    """Skenario: toggle jadwal. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-04-33", skip=NEED_PLATFORM, bug="Waktu lampau tidak bisa diklik, tidak ada pesan validasi")
def test_04_33_validasi_jadwal_lampau(composer, connected):
    """Skenario: validasi jadwal lampau. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-04-34", destructive=True, skip=NEED_PLATFORM)
def test_04_34_simpan_draft(composer, connected):
    """Skenario: simpan draft. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-04-35", skip=NEED_PLATFORM)
def test_04_35_batal_buat_postingan(composer, connected):
    """Skenario: batal buat postingan. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-04-36", destructive=True, skip=NEED_PLATFORM + "; membuat jadwal posting TikTok nyata")
def test_04_36_penjadwalan_postingan(composer, connected):
    """Skenario: penjadwalan postingan. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-04-37", skip=NEED_PLATFORM)
def test_04_37_tanpa_media(composer, connected):
    """Skenario: tanpa media. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-04-38", skip=NEED_PLATFORM)
def test_04_38_tanpa_caption(composer, connected):
    """Skenario: tanpa caption. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-04-39", destructive=True, skip=NEED_PLATFORM)
def test_04_39_edit_jadwal(composer, connected):
    """Skenario: edit jadwal. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-04-40", destructive=True, skip="Menunggu publikasi nyata ke TikTok (5+ menit)")
def test_04_40_status_terbit():
    """Skenario: status terbit. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-04-41", destructive=True, skip=NEED_PLATFORM, bug="Kalender tidak menampilkan postingan terjadwal")
def test_04_41_sinkron_kalender(composer, connected):
    """Skenario: sinkron kalender. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-04-42", bug="Tombol Create Ads tidak ada di Content Planner staging")
def test_04_42_navigasi_buat_iklan(composer):
    """Tombol Buat Iklan/Create Ads membuka alur Campaign."""
    ads = composer.button("Create Ads", "Buat Iklan").or_(
        composer.page.get_by_role("link", name=rx("Create Ads", "Buat Iklan"))).first
    ads.click(timeout=3000)
    composer.expect_url_contains("/campaign")
