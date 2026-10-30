"""Sheet 'e2e-dashboard' (E2E-03-01 .. 03-25).

Catatan staging yang diamati 28 Okt 2026: dashboard punya kartu Total Content dan Scheduled
Content, TIDAK ada kartu Total Ads; filter periode '1 year / 30 days / 7 days / 24 hours'.
"""
import pytest
from playwright.sync_api import expect

from pages.base_page import rx
from pages.dashboard_page import CARD_ADS, PERIODS, SIDEBAR
from utils.tc import tc

pytestmark = pytest.mark.dashboard

NO_ADS = "Staging tidak menampilkan kartu Total Ads"


@tc("E2E-03-01")
def test_03_01_akses_dashboard_setelah_login(dashboard):
    """Dashboard tampil lengkap setelah login."""
    page = dashboard.page
    expect(page.get_by_role("heading", name=rx("Dashboard"))).to_be_visible()
    expect(page.get_by_role("navigation")).to_be_visible()
    expect(dashboard.notification_button).to_be_visible()
    expect(dashboard.profile_button).to_be_visible()
    for key in PERIODS:
        expect(dashboard.period(key)).to_be_visible()


@tc("E2E-03-02")
def test_03_02_akses_tanpa_autentikasi(anon):
    """Tanpa sesi, /dashboard diarahkan ke login."""
    from pages.base_page import BasePage
    b = BasePage(anon)
    b.goto("/dashboard")
    b.expect_url_contains("/login")
    expect(anon.get_by_text("manto07@mailsac.com")).to_have_count(0)


@tc("E2E-03-03", bug=NO_ADS)
def test_03_03_komponen_utama(dashboard):
    """Kartu Total Ads/Konten/Dijadwalkan, grafik, daftar terjadwal, 4 filter periode."""
    dashboard.expect_text(*CARD_ADS)
    dashboard.expect_text("Total Content", "Total Konten")
    dashboard.expect_text("Scheduled Content", "Konten Dijadwalkan")
    dashboard.expect_text("Content Performance Graph", "Grafik Performa")
    for key in PERIODS:
        expect(dashboard.period(key)).to_be_visible()


@tc("E2E-03-04")
def test_03_04_akun_tanpa_data(dashboard, no_content):
    """Akun tanpa data: total 0 dan state kosong untuk grafik dan daftar."""
    assert dashboard.content_total() == 0
    assert dashboard.scheduled_total() == 0
    dashboard.expect_text("No Content Performance Data", "Data masih kosong")
    dashboard.expect_text("No Scheduled Content", "Belum ada konten")


@tc("E2E-03-05", destructive=True, skip="Butuh membuat konten baru (butuh platform terhubung); lihat sheet Composer")
def test_03_05_sinkron_total_konten():
    """Skenario: sinkron total konten. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-03-06", skip="Fitur Ads/Campaign: kartu Total Ads tidak ada di staging")
def test_03_06_sinkron_total_ads():
    """Skenario: sinkron total ads. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-03-07", destructive=True, skip="Butuh membuat konten terjadwal di platform terhubung")
def test_03_07_sinkron_konten_dijadwalkan():
    """Skenario: sinkron konten dijadwalkan. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-03-08", destructive=True, skip="Butuh konten terjadwal di platform terhubung")
def test_03_08_perubahan_jadwal():
    """Skenario: perubahan jadwal. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-03-09", destructive=True, skip="Butuh konten terjadwal di platform terhubung")
def test_03_09_pembatalan_jadwal():
    """Skenario: pembatalan jadwal. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@pytest.mark.parametrize("key", [
    pytest.param("24h", marks=pytest.mark.tc("E2E-03-10")),
    pytest.param("7d", marks=pytest.mark.tc("E2E-03-11")),
    pytest.param("30d", marks=pytest.mark.tc("E2E-03-12")),
    pytest.param("1y", marks=pytest.mark.tc("E2E-03-13")),
])
def test_03_10_sd_13_filter_periode(dashboard, key):
    """Tombol periode menjadi aktif dan data diperbarui."""
    dashboard.select_period(key)
    assert dashboard.is_active(dashboard.period(key)), f"Filter {key} tidak aktif"
    # Kartu tetap tampil (data dimuat ulang tanpa error)
    dashboard.expect_text("Total Content", "Total Konten")


@tc("E2E-03-14")
def test_03_14_konsistensi_filter(dashboard):
    """Hanya satu filter aktif pada satu waktu saat berganti-ganti."""
    for key in PERIODS:
        dashboard.select_period(key)
        active = [k for k in PERIODS if dashboard.is_active(dashboard.period(k))]
        assert active == [key], f"Seharusnya hanya {key} aktif, ternyata {active}"


@tc("E2E-03-15", skip="Tab grafik 'Total ads' tidak ada di staging (grafik hanya Content Performance)")
def test_03_15_grafik_total_ads():
    """Skenario: grafik total ads. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-03-16", skip="Butuh akun dengan data konten pada periode terpilih untuk membandingkan grafik")
def test_03_16_grafik_total_konten(dashboard, with_content):
    """Skenario: grafik total konten. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-03-17")
@pytest.mark.parametrize("menu,url", list(SIDEBAR.items()))
def test_03_17_navigasi_sidebar(dashboard, menu, url):
    """E2E-03-17: tiap menu sidebar membuka halaman yang benar tanpa error."""
    dashboard.open_menu(menu)
    dashboard.expect_url_contains(url)
    expect(dashboard.page.get_by_role("main")).to_be_visible()


@tc("E2E-03-18")
def test_03_18_expand_collapse_seo(dashboard):
    """Klik menu SEO membuka submenu; klik lagi menutupnya."""
    seo = dashboard.page.get_by_role("navigation").get_by_role("button", name=rx("SEO", exact=True))
    seo.click()
    sub = dashboard.page.get_by_role("navigation").get_by_role("link", name=rx("Keywords", "Overview", "Rank", "Site Audit"))
    expect(sub.first).to_be_visible()
    seo.click()
    expect(sub.first).to_be_hidden()


@tc("E2E-03-19", skip="Butuh menghubungkan TikTok asli (OAuth eksternal)")
def test_03_19_status_integrasi():
    """Skenario: status integrasi. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-03-20")
@pytest.mark.parametrize("platform", ["Facebook", "Instagram"])
def test_03_20_navigasi_integrasi_platform(dashboard, platform):
    """E2E-03-20: tautan Connect <platform> membuka halaman/alur platform yang sesuai."""
    dashboard.platform_link(platform).click()
    dashboard.expect_url_contains(f"/{platform.lower()}")


@tc("E2E-03-21", tokens=True)
def test_03_21_paket_dan_token(dashboard, funded):
    """Panel token tampil; saldo berkurang setelah memakai fitur berbayar (cek via Image Generator)."""
    dashboard.page.goto(dashboard.page.url)
    before_balance, before_used = dashboard.token_balance(), dashboard.token_used()
    assert before_balance == funded
    # Penggunaan token diverifikasi penuh di test_06 (generate gambar); di sini cek konsistensi panel
    assert before_used >= 0


@tc("E2E-03-22")
def test_03_22_informasi_profil(dashboard):
    """Nama dan email di profil sesuai akun login."""
    from utils import config
    email, _ = config.credentials("default")
    expect(dashboard.profile_button).to_contain_text(email)


@tc("E2E-03-23")
def test_03_23_navigasi_profil(dashboard):
    """Klik profil membuka menu dengan pilihan Profil/Pengaturan."""
    dashboard.profile_button.click()
    option = dashboard.page.get_by_role("menuitem", name=rx("Profile", "Settings", "Profil", "Pengaturan")).or_(
        dashboard.page.get_by_role("link", name=rx("Profile", "Settings", "Profil", "Pengaturan"))).first
    expect(option).to_be_visible()
    option.click()
    expect(dashboard.page.get_by_role("main")).to_be_visible()


@tc("E2E-03-24")
def test_03_24_notifikasi(dashboard):
    """Ikon lonceng membuka daftar notifikasi."""
    dashboard.notification_button.click()
    expect(dashboard.page.get_by_text(rx("Notifications", "Notifikasi")).first).to_be_visible()


@tc("E2E-03-25", skip="Butuh minimal satu notifikasi belum dibaca; akun QA tidak memilikinya")
def test_03_25_membaca_notifikasi():
    """Skenario: membaca notifikasi. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...
