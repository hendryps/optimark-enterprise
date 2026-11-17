/**
 * Dashboard (DASH-xx) — sheet "e2e-dashboard", disusun mengikuti flowchart Dashboard:
 *
 *   Masuk Dashboard -> Lihat ringkasan (Total & Scheduled Content)
 *     -> Sosmed sudah terhubung?  Belum: banner 'Connect Account' (menuju Platform) | Sudah: lanjut
 *     -> Pilih filter periode (1 thn / 30 / 7 hari / 24 jam)
 *     -> Lihat grafik performa & Scheduled Content
 *     -> Mau aksi cepat?  Buat konten: Create New Content (ke Composer)
 *                         Fitur lain : Quick Access (Composer / Studio / Assistant / SEO)
 *     -> Selesai
 *
 * Tiap langkah punya test positif (+) dan negatif (-). Penanda di komentar test: [+] / [-].
 * ID lama (DASH-01 .. DASH-34) dipertahankan supaya cocok dengan sheet; ID baru mulai DASH-35.
 * Test di luar flowchart (sidebar, profil, notifikasi, token) dikumpulkan di describe terakhir.
 *
 * Catatan staging (11 Nov 2026): filter default = 24 hours; tiap filter memanggil
 * GET /api/dashboard?timeFilter=24jam|7hari|30hari|1tahun; 'Connect Account' -> /instagram.
 */
import { credentials } from '../../../src/config/env';
import { BasePage } from '../../../src/pages/base-page';
import {
  DEFAULT_PERIOD,
  PERIODS,
  QUICK_ACCESS,
  SIDEBAR,
  type PeriodKey,
} from '../../../src/pages/dashboard-page';
import { expect, test, meta } from '../../../src/fixtures';
import { num, rx, rxExact } from '../../../src/utils/text';

const ALL_PERIODS = Object.keys(PERIODS) as PeriodKey[];

test.describe('Dashboard — flow', () => {
  // ------------------------------------------------------------------ 1. Masuk Dashboard
  test.describe('1. Masuk Dashboard', () => {
    test('DASH-01 akses dashboard setelah login', async ({ dashboard }) => {
      // [+] Dashboard tampil lengkap setelah login.
      const { page } = dashboard;
      await expect(page.getByRole('heading', { level: 1, name: rx('Dashboard') })).toBeVisible();
      await expect(page.getByRole('navigation')).toBeVisible();
      await expect(dashboard.notificationButton).toBeVisible();
      await expect(dashboard.profileButton).toBeVisible();
    });

    test('DASH-02 akses tanpa autentikasi', async ({ anon }) => {
      // [-] Tanpa sesi login, /dashboard diarahkan ke halaman login dan data akun tidak bocor.
      const base = new BasePage(anon);
      await base.goto('/dashboard');
      await base.expectUrlContains('/login');
      await expect(anon.getByText(/@mailsac\.com/)).toHaveCount(0);
      await expect(anon.getByText(rx('Total Content', 'Total Konten'))).toHaveCount(0);
    });
  });

  // ------------------------------------------------------------------ 2. Lihat ringkasan
  test.describe('2. Lihat ringkasan (Total & Scheduled Content)', () => {
    test('DASH-03 komponen ringkasan dashboard', async ({ dashboard }) => {
      // [+] Kartu ringkasan Total Content dan Scheduled Content tampil beserta angkanya.
      await dashboard.expectText('Total Content', 'Total Konten');
      await dashboard.expectText('Scheduled Content', 'Konten Dijadwalkan');
      expect(await dashboard.contentTotal()).toBeGreaterThanOrEqual(0);
      expect(await dashboard.scheduledTotal()).toBeGreaterThanOrEqual(0);
    });

    test('DASH-35 angka ringkasan konsisten', async ({ dashboard }) => {
      // [+] Scheduled Content adalah bagian dari Total Content, jadi tidak boleh melebihinya.
      const total = await dashboard.contentTotal();
      const scheduled = await dashboard.scheduledTotal();
      expect(scheduled, `Scheduled (${scheduled}) > Total (${total})`).toBeLessThanOrEqual(total);
    });

    test('DASH-04 akun tanpa data', async ({ dashboard, noContent }) => {
      // [-] Akun tanpa data: total 0 dan state kosong untuk grafik dan daftar terjadwal.
      expect(await dashboard.contentTotal()).toBe(0);
      expect(await dashboard.scheduledTotal()).toBe(0);
      await dashboard.expectText('No Content Performance Data', 'Data masih kosong');
      await dashboard.expectText('No Scheduled Content', 'Belum ada konten');
    });

    test('DASH-05 sinkron total konten', meta({
      destructive: true,
      skip: 'Butuh membuat konten baru (butuh platform terhubung); lihat sheet Composer',
    }), async () => {});
    test('DASH-07 sinkron konten dijadwalkan', meta({
      destructive: true,
      skip: 'Butuh membuat konten terjadwal di platform terhubung',
    }), async () => {});
  });

  // ------------------------------------------------------------------ 3. Sosmed sudah terhubung?
  test.describe('3. Sosmed sudah terhubung?', () => {
    test('DASH-36 [Belum] banner Connect Account tampil', async ({ dashboard, unconnected }) => {
      // [-] Belum ada platform terhubung: banner peringatan + tombol 'Connect Account' tampil.
      await expect(dashboard.notConnectedBanner).toBeVisible();
      await expect(dashboard.connectAccountLink).toBeVisible();
    });

    test('DASH-37 [Belum] Connect Account menuju halaman Platform', async ({ dashboard, unconnected }) => {
      // [+] Klik 'Connect Account' membuka halaman koneksi platform (Instagram).
      await dashboard.connectAccountLink.click();
      await dashboard.expectUrlContains('/instagram');
      await expect(dashboard.main.getByRole('heading', { name: rx('Instagram') }).first()).toBeVisible();
    });

    test('DASH-38 [Sudah] banner Connect Account tidak tampil', async ({ dashboard, connected }) => {
      // [+] Platform sudah terhubung: banner tidak tampil, alur langsung lanjut ke filter periode.
      await expect(dashboard.notConnectedBanner).toHaveCount(0);
      await expect(dashboard.connectAccountLink).toHaveCount(0);
      await expect(dashboard.period(DEFAULT_PERIOD)).toBeVisible();
    });

    test('DASH-27 status integrasi', meta({ skip: 'Butuh menghubungkan TikTok asli (OAuth eksternal)' }), async () => {});

    // DASH-28 .. DASH-29: tautan Connect <platform> di bagian Platform sidebar.
    for (const [index, platform] of ['Facebook', 'Instagram'].entries()) {
      test(`DASH-${num(28 + index)} navigasi integrasi ${platform}`, async ({ dashboard }) => {
        // [+] Tautan Connect <platform> membuka halaman/alur platform yang sesuai.
        await dashboard.platformLink(platform).click();
        await dashboard.expectUrlContains(`/${platform.toLowerCase()}`);
      });
    }
  });

  // ------------------------------------------------------------------ 4. Pilih filter periode
  test.describe('4. Pilih filter periode', () => {
    test('DASH-39 filter default saat masuk', async ({ dashboard }) => {
      // [+] Saat Dashboard dibuka, 4 filter tampil dan hanya filter default (24 jam) yang aktif.
      for (const key of ALL_PERIODS) await expect(dashboard.period(key)).toBeVisible();
      expect(await dashboard.activePeriods()).toEqual([DEFAULT_PERIOD]);
    });

    // DASH-10 .. DASH-13: satu test per filter periode.
    const periodKeys: PeriodKey[] = ['24h', '7d', '30d', '1y'];
    for (const [index, key] of periodKeys.entries()) {
      test(`DASH-${num(10 + index)} filter periode ${key}`, async ({ dashboard }) => {
        // [+] Tombol periode menjadi aktif dan data dimuat ulang sesuai periode tanpa error.
        if (key === DEFAULT_PERIOD) await dashboard.selectPeriodAndWait('7d'); // pindah dulu supaya klik terasa
        const response = await dashboard.selectPeriodAndWait(key);
        expect(response.ok(), `API dashboard untuk ${key} gagal: ${response.status()}`).toBe(true);
        expect(await dashboard.activePeriods()).toEqual([key]);
        await dashboard.expectText('Total Content', 'Total Konten');
      });
    }

    test('DASH-14 konsistensi filter periode', async ({ dashboard }) => {
      // [+] Hanya satu filter aktif pada satu waktu saat berganti-ganti.
      for (const key of ALL_PERIODS) {
        await dashboard.selectPeriod(key);
        expect(await dashboard.activePeriods(), `Seharusnya hanya ${key} aktif`).toEqual([key]);
      }
    });

    test('DASH-40 klik ulang filter yang sudah aktif', async ({ dashboard }) => {
      // [-] Klik filter yang sedang aktif berkali-kali tidak menonaktifkannya / tidak membuat dua filter aktif.
      await dashboard.selectPeriodAndWait('30d');
      await dashboard.selectPeriod('30d');
      await dashboard.selectPeriod('30d');
      expect(await dashboard.activePeriods()).toEqual(['30d']);
    });

    test('DASH-41 API dashboard gagal saat ganti filter', async ({ dashboard }) => {
      // [-] Kalau GET /api/dashboard error 500, halaman tidak crash dan filter tetap bisa dipakai.
      const { page } = dashboard;
      await page.route(/\/api\/dashboard\?/, (route) => route.fulfill({ status: 500, body: '{"error":"QA"}' }));
      await dashboard.selectPeriod('7d');
      await expect(page.getByText(rx('Application error', 'Unhandled Runtime Error'))).toHaveCount(0);
      await expect(page.getByRole('heading', { level: 1, name: rx('Dashboard') })).toBeVisible();
      await expect(dashboard.performanceSection).toBeVisible();
      await page.unroute(/\/api\/dashboard\?/);
      const response = await dashboard.selectPeriodAndWait('30d');
      expect(response.ok()).toBe(true);
      expect(await dashboard.activePeriods()).toEqual(['30d']);
    });
  });

  // ------------------------------------------------------------------ 5. Lihat grafik performa & Scheduled Content
  test.describe('5. Lihat grafik performa & Scheduled Content', () => {
    test('DASH-42 grafik dan daftar terjadwal tampil di tiap periode', async ({ dashboard }) => {
      // [+] Setelah memilih periode, bagian grafik performa dan Scheduled Content tetap tampil.
      for (const key of ALL_PERIODS) {
        await dashboard.selectPeriod(key);
        await expect(dashboard.performanceSection, `Grafik hilang pada ${key}`).toBeVisible();
        await expect(dashboard.scheduledSection, `Scheduled Content hilang pada ${key}`).toBeVisible();
      }
    });

    test('DASH-43 state kosong Scheduled Content mengarah ke Composer', async ({ dashboard, noContent }) => {
      // [-] Tanpa konten terjadwal: tampil 'No Scheduled Content' + tombol 'Schedule Content' ke Composer.
      await dashboard.expectText('No Scheduled Content', 'Belum ada konten');
      await dashboard.scheduleContentLink.click();
      await dashboard.expectUrlContains('/content-composer');
    });

    test('DASH-16 grafik total konten', meta({ skip: 'Butuh akun dengan data konten pada periode terpilih untuk membandingkan grafik' }), async () => {});
    test('DASH-08 perubahan jadwal', meta({ destructive: true, skip: 'Butuh konten terjadwal di platform terhubung' }), async () => {});
    test('DASH-09 pembatalan jadwal', meta({ destructive: true, skip: 'Butuh konten terjadwal di platform terhubung' }), async () => {});
  });

  // ------------------------------------------------------------------ 6. Mau aksi cepat?
  test.describe('6. Aksi cepat', () => {
    test('DASH-44 [Buat konten] Create New Content ke Content Composer', async ({ dashboard }) => {
      // [+] Tombol 'Create New Content' membuka Content Composer.
      await dashboard.createContentLink.click();
      await dashboard.expectUrlContains('/content-composer');
      await expect(dashboard.main).toBeVisible();
    });

    test('DASH-45 Quick Access menampilkan 4 fitur', async ({ dashboard }) => {
      // [+] Bagian Quick Access berisi kartu Composer, Studio, Assistant, dan SEO.
      await expect(dashboard.quickAccessSection).toBeVisible();
      for (const title of Object.keys(QUICK_ACCESS)) {
        await expect(dashboard.quickAccess(title), `Kartu '${title}' tidak ada`).toBeVisible();
      }
    });

    // DASH-46 .. DASH-49: tiap kartu Quick Access membuka fitur yang benar.
    for (const [index, [title, url]] of Object.entries(QUICK_ACCESS).entries()) {
      test(`DASH-${num(46 + index)} [Fitur lain] Quick Access: ${title}`, async ({ dashboard }) => {
        // [+] Kartu Quick Access membuka halaman fitur yang sesuai tanpa error.
        await dashboard.quickAccess(title).click();
        await dashboard.expectUrlContains(url);
        await expect(dashboard.page.getByText(rx('404', 'Page not found', 'Application error'))).toHaveCount(0);
        await expect(dashboard.main).toBeVisible();
      });
    }

    test('DASH-50 kembali ke Dashboard setelah aksi cepat', async ({ dashboard }) => {
      // [-] Setelah membuka fitur lewat aksi cepat, tombol Back browser kembali ke Dashboard yang utuh.
      await dashboard.createContentLink.click();
      await dashboard.expectUrlContains('/content-composer');
      await dashboard.page.goBack();
      await dashboard.expectUrlContains('/dashboard');
      await expect(dashboard.createContentLink).toBeVisible();
      expect(await dashboard.activePeriods()).toHaveLength(1);
    });

    test('DASH-51 aksi cepat saat sesi berakhir', async ({ dashboard }) => {
      // [-] Sesi habis (cookies dihapus) lalu klik aksi cepat: pengguna diarahkan ke login, bukan ke fitur.
      await dashboard.page.context().clearCookies();
      await dashboard.createContentLink.click();
      await dashboard.expectUrlContains('/login');
    });
  });
});

// ==================================================================== di luar flowchart
test.describe('Dashboard — navigasi global (di luar flowchart)', () => {
  test('DASH-06 sinkron total ads', meta({ skip: 'Kartu Total Ads tidak ada di flowchart maupun staging' }), async () => {});
  test('DASH-15 grafik total ads', meta({ skip: "Tab grafik 'Total ads' tidak ada di flowchart maupun staging" }), async () => {});

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
