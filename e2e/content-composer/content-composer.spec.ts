/**
 * Content Composer / Content Planner (COMP-01 .. COMP-42) — sheet "e2e-content composer".
 *
 * Akun QA di staging belum punya data konten dan belum menghubungkan platform, jadi test yang butuh
 * konten/TikTok memakai fixture `withContent` / `connected` dan otomatis di-skip.
 * Test yang membuat post nyata ditandai destructive.
 * Bug yang sudah tercatat di sheet (status Fail) ditandai `bug: ...` (diharapkan gagal).
 */
import { STATUS_TABS, TAB_DRAFT, TAB_PUBLISHED, TAB_SCHEDULED } from '../../src/pages/content-composer-page';
import { expect, meta, test } from '../../src/fixtures';
import { rx } from '../../src/utils/text';

const NEED_PLATFORM = 'Butuh akun QA dengan platform (TikTok) terhubung';

test.describe('Content Composer', () => {
  // ----------------------------------------------------------------- List
  test('COMP-01 akses halaman', async ({ composer }) => {
    // Halaman Content Planner: breadcrumb, tab status, pencarian, filter, List/Calendar, Create Post.
    await expect(composer.page.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible();
    for (const tab of STATUS_TABS) await expect(composer.statusTab(tab)).toBeVisible();
    await expect(composer.search).toBeVisible();
    await expect(composer.typeFilter).toBeVisible();
    await expect(composer.viewTab('List')).toBeVisible();
    await expect(composer.viewTab('Calendar', 'Kalender')).toBeVisible();
    await expect(composer.createPostButton).toBeVisible();
  });

  test('COMP-02 tampilan list', async ({ composer, withContent }) => {
    // List menampilkan konten sesuai tab aktif.
    await expect(composer.viewTab('List')).toHaveAttribute('aria-selected', 'true');
    expect(await composer.rows.count()).toBeGreaterThan(0);
  });

  test('COMP-03 jumlah per status', async ({ composer, withContent }) => {
    // Badge tiap tab sama dengan jumlah baris yang tampil.
    for (const tab of STATUS_TABS) {
      await composer.statusTab(tab).click();
      await composer.page.waitForLoadState('networkidle');
      expect(await composer.rows.count()).toBe(await composer.statusBadge(tab));
    }
  });

  // COMP-04 .. COMP-06: tiap tab status bisa dibuka.
  const statusCases: [string, string, string[]][] = [
    ['COMP-04', 'Draft', TAB_DRAFT],
    ['COMP-05', 'Scheduled', TAB_SCHEDULED],
    ['COMP-06', 'Published', TAB_PUBLISHED],
  ];
  for (const [id, name, tab] of statusCases) {
    test(`${id} tab status ${name}`, async ({ composer }) => {
      // Tab status bisa dibuka dan menampilkan daftar atau state kosong.
      await composer.statusTab(tab).click();
      await expect(composer.statusTab(tab)).toHaveAttribute('aria-selected', 'true');
      const badge = await composer.statusBadge(tab);
      if (badge === 0) {
        await expect(composer.emptyState.first()).toBeVisible();
      } else {
        expect(await composer.rows.count()).toBe(badge);
      }
    });
  }

  test('COMP-07 pencarian', meta({ skip: "Butuh data konten dengan caption 'Testing E2E TikTok'" }), async () => {});

  test('COMP-08 pencarian tidak ditemukan', async ({ composer }) => {
    // Kata kunci yang tidak ada -> tidak ada baris, halaman tetap bisa dipakai.
    await composer.search.fill('konten-tidak-tersedia-999');
    await composer.page.waitForTimeout(1000); // tunggu debounce pencarian
    expect(await composer.rows.count()).toBe(0);
    await expect(composer.search).toBeEnabled();
  });

  test('COMP-09 filter jenis konten', meta({ skip: 'Butuh konten bertipe Video untuk memverifikasi hasil filter' }), async () => {});
  test('COMP-10 filter platform', meta({ skip: 'Butuh konten TikTok untuk memverifikasi hasil filter platform' }), async () => {});
  test('COMP-11 kombinasi filter', meta({ skip: 'Butuh data konten Promo/Video/TikTok untuk kombinasi filter' }), async () => {});
  test('COMP-12 pengurutan', meta({ skip: 'Butuh minimal tiga konten dengan waktu update berbeda' }), async () => {});
  test('COMP-13 edit postingan', meta({ skip: 'Butuh konten Draft/Dijadwalkan' }), async () => {});
  test('COMP-14 menu aksi', meta({ skip: 'Butuh satu data konten' }), async () => {});

  // ----------------------------------------------------------------- Kalender
  test('COMP-15 tampilan kalender', async ({ composer }) => {
    // Tab Calendar aktif; navigasi bulan, Today, dan filter Content Type/Status/Platform tampil.
    await composer.viewTab('Calendar', 'Kalender').click();
    await expect(composer.viewTab('Calendar', 'Kalender')).toHaveAttribute('aria-selected', 'true');
    for (const nav of ['Previous', 'Today', 'Next']) await expect(composer.calNav(nav)).toBeVisible();
    for (const filter of ['Content Type', 'Status', 'Platform']) await expect(composer.buttonExact(filter)).toBeVisible();
  });

  test('COMP-16 navigasi kalender', async ({ composer }) => {
    // Panah bulan sebelumnya/berikutnya mengubah judul bulan.
    await composer.viewTab('Calendar', 'Kalender').click();
    const now = await composer.calendarTitle();
    await composer.calNav('Previous').click();
    expect(await composer.calendarTitle()).not.toBe(now);
    await composer.calNav('Next').click();
    await composer.calNav('Next').click();
    expect(await composer.calendarTitle()).not.toBe(now);
    await composer.calNav('Previous').click();
    expect(await composer.calendarTitle()).toBe(now);
  });

  test('COMP-17 tombol hari ini', async ({ composer }) => {
    // Tombol Today kembali ke bulan saat ini.
    await composer.viewTab('Calendar', 'Kalender').click();
    const now = await composer.calendarTitle();
    await composer.calNav('Previous').click();
    await composer.calNav('Today').click();
    expect(await composer.calendarTitle()).toBe(now);
  });

  test('COMP-18 filter kalender', meta({ skip: 'Butuh konten video TikTok berstatus Dijadwalkan' }), async () => {});

  // ----------------------------------------------------------------- Form Buat Postingan
  test('COMP-19 akses buat postingan', async ({ composer, connected }) => {
    // Form Create Post tampil lengkap.
    await composer.createPostButton.click();
    await composer.expectUrlContains('/content-composer/create');
    await expect(composer.title).toBeVisible();
    await expect(composer.scheduleButton).toBeVisible();
    await expect(composer.draftButton).toBeVisible();
    await expect(composer.cancelButton).toBeVisible();
  });

  test('COMP-20 pilih akun TikTok', meta({ skip: NEED_PLATFORM }), async () => {});

  test('COMP-21 tanpa akun terhubung', async ({ composer, unconnected }) => {
    // Tanpa platform terhubung, tidak ada akun pilihan dan ada ajakan menghubungkan platform.
    await composer.createPostButton.click();
    await composer.expectText('connect', 'hubungkan', 'no account', 'belum ada akun');
  });

  test('COMP-22 input judul dan caption', meta({ skip: NEED_PLATFORM }), async () => {});
  test('COMP-23 validasi judul', meta({ skip: NEED_PLATFORM }), async () => {});
  test('COMP-24 batas caption', meta({ skip: NEED_PLATFORM, bug: 'Field menerima >2.200 karakter, hanya muncul pesan batas' }), async () => {});
  test('COMP-25 emoji caption', meta({ skip: NEED_PLATFORM }), async () => {});
  test('COMP-26 upload video', meta({ skip: NEED_PLATFORM }), async () => {});
  test('COMP-27 validasi media', meta({ skip: NEED_PLATFORM }), async () => {});
  test('COMP-28 pratinjau', meta({ skip: NEED_PLATFORM }), async () => {});
  test('COMP-29 generate caption AI', meta({ skip: `${NEED_PLATFORM} dan token`, tokens: true }), async () => {});
  test('COMP-30 validasi generate AI', meta({ skip: NEED_PLATFORM }), async () => {});
  test('COMP-31 galeri AI', meta({ skip: `${NEED_PLATFORM} dan media hasil generate` }), async () => {});
  test('COMP-32 toggle jadwal', meta({ skip: NEED_PLATFORM }), async () => {});
  test('COMP-33 validasi jadwal lampau', meta({ skip: NEED_PLATFORM, bug: 'Waktu lampau tidak bisa diklik, tidak ada pesan validasi' }), async () => {});
  test('COMP-34 simpan draft', meta({ destructive: true, skip: NEED_PLATFORM }), async () => {});
  test('COMP-35 batal buat postingan', meta({ skip: NEED_PLATFORM }), async () => {});
  test('COMP-36 penjadwalan postingan', meta({ destructive: true, skip: `${NEED_PLATFORM}; membuat jadwal posting TikTok nyata` }), async () => {});
  test('COMP-37 tanpa media', meta({ skip: NEED_PLATFORM }), async () => {});
  test('COMP-38 tanpa caption', meta({ skip: NEED_PLATFORM }), async () => {});
  test('COMP-39 edit jadwal', meta({ destructive: true, skip: NEED_PLATFORM }), async () => {});
  test('COMP-40 status terbit', meta({ destructive: true, skip: 'Menunggu publikasi nyata ke TikTok (5+ menit)' }), async () => {});
  test(
    'COMP-41 sinkron kalender',
    meta({ destructive: true, skip: NEED_PLATFORM, bug: 'Kalender tidak menampilkan postingan terjadwal' }),
    async () => {},
  );

  test('COMP-42 navigasi buat iklan', meta({ bug: 'Tombol Create Ads tidak ada di Content Planner staging' }), async ({ composer }) => {
    // Tombol Buat Iklan/Create Ads membuka alur Campaign.
    const ads = composer
      .button('Create Ads', 'Buat Iklan')
      .or(composer.page.getByRole('link', { name: rx('Create Ads', 'Buat Iklan') }))
      .first();
    await ads.click({ timeout: 3000 });
    await composer.expectUrlContains('/campaign');
  });
});
