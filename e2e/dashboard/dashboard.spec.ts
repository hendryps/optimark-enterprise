/**
 * Dashboard (DASH-01 .. DASH-34) — sheet "e2e-dashboard".
 *
 * Catatan staging yang diamati 28 Okt 2026: dashboard punya kartu Total Content dan Scheduled
 * Content, TIDAK ada kartu Total Ads; filter periode '1 year / 30 days / 7 days / 24 hours'.
 */
import { credentials } from '../../src/config/env';
import { BasePage } from '../../src/pages/base-page';
import { CARD_ADS, PERIODS, SIDEBAR, type PeriodKey } from '../../src/pages/dashboard-page';
import { expect, test, meta } from '../../src/fixtures';
import { num, rx, rxExact } from '../../src/utils/text';

const NO_ADS = 'Staging tidak menampilkan kartu Total Ads';

test.describe('Dashboard', () => {
  test('DASH-01 akses dashboard setelah login', async ({ dashboard }) => {
    // Dashboard tampil lengkap setelah login.
    const { page } = dashboard;
    await expect(page.getByRole('heading', { name: rx('Dashboard') })).toBeVisible();
    await expect(page.getByRole('navigation')).toBeVisible();
    await expect(dashboard.notificationButton).toBeVisible();
    await expect(dashboard.profileButton).toBeVisible();
    for (const key of Object.keys(PERIODS) as PeriodKey[]) {
      await expect(dashboard.period(key)).toBeVisible();
    }
  });

  test('DASH-02 akses tanpa autentikasi', async ({ anon }) => {
    // Tanpa sesi login, /dashboard diarahkan ke halaman login.
    const base = new BasePage(anon);
    await base.goto('/dashboard');
    await base.expectUrlContains('/login');
    await expect(anon.getByText(/@mailsac\.com/)).toHaveCount(0);
  });

  test('DASH-03 komponen utama dashboard', meta({ bug: NO_ADS }), async ({ dashboard }) => {
    // Kartu Total Ads/Konten/Dijadwalkan, grafik, daftar terjadwal, dan 4 filter periode.
    await dashboard.expectText(...CARD_ADS);
    await dashboard.expectText('Total Content', 'Total Konten');
    await dashboard.expectText('Scheduled Content', 'Konten Dijadwalkan');
    await dashboard.expectText('Content Performance Graph', 'Grafik Performa');
    for (const key of Object.keys(PERIODS) as PeriodKey[]) {
      await expect(dashboard.period(key)).toBeVisible();
    }
  });

  test('DASH-04 akun tanpa data', async ({ dashboard, noContent }) => {
    // Akun tanpa data: total 0 dan state kosong untuk grafik dan daftar.
    expect(await dashboard.contentTotal()).toBe(0);
    expect(await dashboard.scheduledTotal()).toBe(0);
    await dashboard.expectText('No Content Performance Data', 'Data masih kosong');
    await dashboard.expectText('No Scheduled Content', 'Belum ada konten');
  });

  test('DASH-05 sinkron total konten', meta({
    destructive: true,
    skip: 'Butuh membuat konten baru (butuh platform terhubung); lihat sheet Composer',
  }), async () => {});
  test('DASH-06 sinkron total ads', meta({ skip: 'Fitur Ads/Campaign: kartu Total Ads tidak ada di staging' }), async () => {});
  test('DASH-07 sinkron konten dijadwalkan', meta({
    destructive: true,
    skip: 'Butuh membuat konten terjadwal di platform terhubung',
  }), async () => {});
  test('DASH-08 perubahan jadwal', meta({ destructive: true, skip: 'Butuh konten terjadwal di platform terhubung' }), async () => {});
  test('DASH-09 pembatalan jadwal', meta({ destructive: true, skip: 'Butuh konten terjadwal di platform terhubung' }), async () => {});

  // DASH-10 .. DASH-13: satu test per filter periode.
  const periodKeys: PeriodKey[] = ['24h', '7d', '30d', '1y'];
  for (const [index, key] of periodKeys.entries()) {
    test(`DASH-${num(10 + index)} filter periode ${key}`, async ({ dashboard }) => {
      // Tombol periode menjadi aktif dan data diperbarui.
      await dashboard.selectPeriod(key);
      expect(await dashboard.isActive(dashboard.period(key)), `Filter ${key} tidak aktif`).toBe(true);
      // Kartu tetap tampil (data dimuat ulang tanpa error)
      await dashboard.expectText('Total Content', 'Total Konten');
    });
  }

  test('DASH-14 konsistensi filter periode', async ({ dashboard }) => {
    // Hanya satu filter aktif pada satu waktu saat berganti-ganti.
    const keys = Object.keys(PERIODS) as PeriodKey[];
    for (const key of keys) {
      await dashboard.selectPeriod(key);
      const active: PeriodKey[] = [];
      for (const k of keys) {
        if (await dashboard.isActive(dashboard.period(k))) active.push(k);
      }
      expect(active, `Seharusnya hanya ${key} aktif, ternyata ${active}`).toEqual([key]);
    }
  });

  test('DASH-15 grafik total ads', meta({ skip: "Tab grafik 'Total ads' tidak ada di staging (grafik hanya Content Performance)" }), async () => {});
  test('DASH-16 grafik total konten', meta({ skip: 'Butuh akun dengan data konten pada periode terpilih untuk membandingkan grafik' }), async () => {});

  // DASH-17 .. DASH-25: tiap menu sidebar membuka halaman yang benar.
  for (const [index, [menu, url]] of Object.entries(SIDEBAR).entries()) {
    test(`DASH-${num(17 + index)} navigasi sidebar: ${menu}`, async ({ dashboard }) => {
      // Tiap menu sidebar membuka halaman yang benar tanpa error.
      await dashboard.openMenu(menu);
      await dashboard.expectUrlContains(url);
      await expect(dashboard.page.getByRole('main')).toBeVisible();
    });
  }

  test('DASH-26 expand dan collapse menu SEO', async ({ dashboard }) => {
    // Klik menu SEO membuka submenu; klik lagi menutupnya.
    const nav = dashboard.page.getByRole('navigation');
    const seo = nav.getByRole('button', { name: rxExact('SEO') });
    await seo.click();
    const sub = nav.getByRole('link', { name: rx('Keywords', 'Overview', 'Rank', 'Site Audit') });
    await expect(sub.first()).toBeVisible();
    await seo.click();
    await expect(sub.first()).toBeHidden();
  });

  test('DASH-27 status integrasi', meta({ skip: 'Butuh menghubungkan TikTok asli (OAuth eksternal)' }), async () => {});

  // DASH-28 .. DASH-29: tautan Connect <platform>.
  for (const [index, platform] of ['Facebook', 'Instagram'].entries()) {
    test(`DASH-${num(28 + index)} navigasi integrasi ${platform}`, async ({ dashboard }) => {
      // Tautan Connect <platform> membuka halaman/alur platform yang sesuai.
      await dashboard.platformLink(platform).click();
      await dashboard.expectUrlContains(`/${platform.toLowerCase()}`);
    });
  }

  test('DASH-30 paket dan token', meta({ tokens: true }), async ({ dashboard, funded }) => {
    // Panel token tampil; saldo berkurang setelah memakai fitur berbayar (cek via Image Generator).
    await dashboard.page.goto(dashboard.page.url());
    const balance = await dashboard.tokenBalance();
    const used = await dashboard.tokenUsed();
    expect(balance).toBe(funded);
    // Penggunaan token diverifikasi penuh di test Image Generator; di sini cek konsistensi panel.
    expect(used).toBeGreaterThanOrEqual(0);
  });

  test('DASH-31 informasi profil', async ({ dashboard }) => {
    // Nama dan email di profil sesuai akun login.
    await expect(dashboard.profileButton).toContainText(credentials('default').email);
  });

  test('DASH-32 navigasi profil', async ({ dashboard }) => {
    // Klik profil membuka menu dengan pilihan Profil/Pengaturan.
    await dashboard.profileButton.click();
    const name = rx('Profile', 'Settings', 'Profil', 'Pengaturan');
    const option = dashboard.page
      .getByRole('menuitem', { name })
      .or(dashboard.page.getByRole('link', { name }))
      .first();
    await expect(option).toBeVisible();
    await option.click();
    await expect(dashboard.page.getByRole('main')).toBeVisible();
  });

  test('DASH-33 notifikasi', async ({ dashboard }) => {
    // Ikon lonceng membuka daftar notifikasi.
    await dashboard.notificationButton.click();
    await expect(dashboard.page.getByText(rx('Notifications', 'Notifikasi')).first()).toBeVisible();
  });

  test('DASH-34 membaca notifikasi', meta({ skip: 'Butuh minimal satu notifikasi belum dibaca; akun QA tidak memilikinya' }), async () => {});
});
