/**
 * Menu SEO (Growth Intel) — SEO-xx, disusun mengikuti flowchart SEO:
 *
 *   Buka menu SEO -> Website sudah dianalisis?
 *     Belum: Klik Analyze (masukkan domain) & proses | Sudah: lanjut
 *   -> Lihat Overview (Health Score, Keywords, Traffic, AI Citations)
 *   -> Pilih tab (Content Ideas / Optimizer / Keywords / Rank Tracking / Backlinks / Competitors / Site Audit / AI SEO)
 *   -> Open Workspace / View All (lihat detail)
 *   -> Butuh artikel SEO?  Ya: Buka Articles > New Article | Tidak: selesai
 *
 * Tiap langkah punya test positif [+] dan negatif [-] (penanda di komentar test).
 * ID lama SEO-01 .. SEO-33 dipertahankan; ID baru mulai SEO-34.
 * Detail langkah "Articles > New Article" (validasi form, simpan, edit, hapus) ada di seo-articles.spec.ts.
 *
 * Catatan staging (11 Nov 2026):
 *   - Analyze hanya memanggil GET /api/competitor-analysis/discover?domain=... (tidak memakai token,
 *     tidak menyimpan data), sehingga aman dijalankan di run default.
 *   - Hasil Analyze tidak tersimpan: setelah reload, Overview kembali 'Waiting'. Status "sudah dianalisis"
 *     dibaca dari domain/website akun di GET /api/seo-dashboard/overview.
 *   - Tab Site Audit crash: "Application error" (TypeError: k.map is not a function).
 */
import { CREATE_PATH, LIST_PATH } from '../../../src/pages/seo-articles-page';
import { SEO_TABS, TAB_MARKERS } from '../../../src/pages/seo-page';
import { expect, meta, test } from '../../../src/fixtures';
import { num, rx, rxExact } from '../../../src/utils/text';

const BUG_URL_INVALID = "Staging: URL tidak valid ('bukan-url') tetap mengaktifkan tombol Analyze, tanpa validasi format";
const BUG_SITE_AUDIT = 'Staging: tab Site Audit crash (Application error, TypeError k.map is not a function)';

const SAMPLE_DOMAIN = 'https://example.com';

test.describe('SEO — flow', () => {
  // ------------------------------------------------------------------ 1. Buka menu SEO
  test.describe('1. Buka menu SEO', () => {
    test('SEO-01 akses halaman', async ({ seo }) => {
      // [+] Judul Growth Intel · SEO dan seluruh 9 tab tampil.
      for (const name of SEO_TABS) await expect(seo.tab(name)).toBeVisible();
    });

    test('SEO-33 submenu SEO di sidebar', async ({ seo }) => {
      // [+] Sidebar SEO memuat submenu Overview dan Articles.
      const nav = seo.page.getByRole('navigation');
      await expect(nav.getByRole('link', { name: rxExact('Overview') })).toBeVisible();
      await expect(nav.getByRole('link', { name: rxExact('Articles') })).toBeVisible();
    });

    test('SEO-34 buka SEO dari sidebar Dashboard', async ({ dashboard }) => {
      // [+] Menu SEO > Overview di sidebar membuka halaman Growth Intel.
      const nav = dashboard.page.getByRole('navigation');
      await nav.getByRole('button', { name: rxExact('SEO') }).click();
      await nav.getByRole('link', { name: rxExact('Overview') }).click();
      await dashboard.expectUrlContains('/seo');
      await expect(dashboard.page.getByRole('heading', { name: rx('Growth Intel') })).toBeVisible({ timeout: 20_000 });
    });

    test('SEO-14 tab tidak hilang setelah reload', async ({ seo }) => {
      // [+] Reload halaman tetap menampilkan seluruh tab.
      await seo.page.reload();
      for (const name of SEO_TABS) await expect(seo.tab(name)).toBeVisible({ timeout: 30_000 });
    });

    test('SEO-35 akses tanpa login', async ({ anon }) => {
      // [-] Tanpa sesi login, /seo diarahkan ke halaman login.
      await anon.goto('/seo');
      await expect(anon).toHaveURL(/\/login/);
      await expect(anon.getByRole('heading', { name: rx('Growth Intel') })).toHaveCount(0);
    });
  });

  // ------------------------------------------------------------------ 2. Website sudah dianalisis?
  test.describe('2. Website sudah dianalisis?', () => {
    test('SEO-36 [Belum] Overview menunggu analisis', async ({ seo }) => {
      // [-] Akun belum punya domain: kompetitor 'Waiting' dan Analyze nonaktif sampai domain diisi.
      test.skip(await seo.isAnalyzed(), 'Akun QA sudah punya website/domain tersimpan');
      await expect(seo.competitorsStatus).toHaveText(rxExact('Waiting'));
      await expect(seo.page.getByText(rx('Enter or save a website'))).toBeVisible();
      await expect(seo.analyzeButton).toBeDisabled();
    });

    test('SEO-37 [Sudah] Overview langsung berisi data', async ({ seo }) => {
      // [+] Akun sudah punya domain: Overview tidak lagi menunggu analisis.
      test.skip(!(await seo.isAnalyzed()), 'Akun QA belum menyimpan website/domain');
      await expect(seo.competitorsStatus).not.toHaveText(rxExact('Waiting'));
    });

    test('SEO-11 input analisis overview', async ({ seo }) => {
      // [+] Overview punya input URL/domain, input keyword, dan tombol Analyze.
      await expect(seo.urlInput).toBeVisible();
      await expect(seo.keywordInput).toBeVisible();
      await expect(seo.analyzeButton).toBeVisible();
    });

    test('SEO-12 input menerima teks', async ({ seo }) => {
      // [+] URL dan keyword tampil utuh sesuai yang diketik.
      await seo.urlInput.fill('https://example.com/page');
      await seo.keywordInput.fill('kopi susu gula aren');
      await expect(seo.urlInput).toHaveValue('https://example.com/page');
      await expect(seo.keywordInput).toHaveValue('kopi susu gula aren');
    });

    test('SEO-16 analyze aktif setelah URL diisi', async ({ seo }) => {
      // [+] Mengisi URL yang valid mengaktifkan tombol Analyze (keyword opsional).
      await seo.urlInput.fill('https://example.com/page');
      await expect(seo.analyzeButton).toBeEnabled();
    });

    test('SEO-17 analyze aktif URL dan keyword', async ({ seo }) => {
      // [+] URL dan keyword terisi: Analyze aktif.
      await seo.urlInput.fill('https://example.com/page');
      await seo.keywordInput.fill('kopi susu');
      await expect(seo.analyzeButton).toBeEnabled();
    });

    test('SEO-38 [Belum] klik Analyze memproses domain', async ({ seo }) => {
      // [+] Analyze domain valid: proses discovery berhasil dan Overview menampilkan kompetitor terdeteksi.
      const response = await seo.analyze(SAMPLE_DOMAIN, 'kopi');
      expect(response.ok(), `Discover gagal: ${response.status()}`).toBe(true);
      expect(response.url()).toContain('domain=example.com');
      await expect(seo.competitorsStatus).toHaveText(rxExact('Auto-detected'), { timeout: 20_000 });
      await expect(seo.tab('Overview')).toHaveAttribute('aria-selected', 'true');
      await expect(seo.crashScreen).toHaveCount(0);
    });

    test('SEO-13 analyze tanpa input', async ({ seo }) => {
      // [-] Analyze tanpa URL/keyword tidak memulai analisis (tombol nonaktif atau ada validasi).
      await seo.analyzeButton.click({ force: true });
      await seo.page.waitForTimeout(800);
      await expect(seo.tab('Overview')).toHaveAttribute('aria-selected', 'true');
      const hasValidation = (await seo.page.getByText(/required|wajib|enter|masukkan/i).count()) > 0;
      expect((await seo.analyzeButton.isDisabled()) || hasValidation).toBe(true);
    });

    test('SEO-15 analyze nonaktif saat kosong', async ({ seo }) => {
      // [-] Saat URL dan keyword kosong, tombol Analyze nonaktif.
      await expect(seo.analyzeButton).toBeDisabled();
    });

    test('SEO-18 analyze nonaktif hanya keyword', async ({ seo }) => {
      // [-] Hanya keyword tanpa URL: Analyze tetap nonaktif.
      await seo.keywordInput.fill('kopi susu');
      await expect(seo.analyzeButton).toBeDisabled();
    });

    test('SEO-19 analyze nonaktif input spasi', async ({ seo }) => {
      // [-] URL dan keyword berisi spasi saja dianggap kosong: Analyze nonaktif.
      await seo.urlInput.fill('   ');
      await seo.keywordInput.fill('   ');
      await expect(seo.analyzeButton).toBeDisabled();
    });

    test('SEO-20 analyze nonaktif lagi setelah dikosongkan', async ({ seo }) => {
      // [-] Setelah URL diisi lalu dihapus, Analyze kembali nonaktif.
      await seo.urlInput.fill('https://example.com/page');
      await expect(seo.analyzeButton).toBeEnabled();
      await seo.urlInput.fill('');
      await expect(seo.analyzeButton).toBeDisabled();
    });

    test('SEO-21 URL tidak valid ditolak', meta({ bug: BUG_URL_INVALID }), async ({ seo }) => {
      // [-] URL tanpa format yang benar ('bukan-url') seharusnya tidak mengaktifkan Analyze.
      await seo.urlInput.fill('bukan-url');
      await seo.keywordInput.fill('kopi susu');
      await expect(seo.analyzeButton).toBeDisabled();
    });

    test('SEO-39 analyze domain tidak valid tidak menampilkan hasil', async ({ seo }) => {
      // [-] Domain asal-asalan diproses tanpa crash dan tidak menampilkan kompetitor palsu.
      await seo.analyze('bukan-url');
      await expect(seo.crashScreen).toHaveCount(0);
      await expect(seo.competitorsStatus).toHaveText(rxExact('Waiting'));
    });

    test('SEO-40 analyze saat server error', async ({ seo }) => {
      // [-] API discovery error 500: halaman tidak crash, Overview tetap 'Waiting', Analyze bisa diulang.
      await seo.page.route(/\/api\/competitor-analysis\/discover/, (route) =>
        route.fulfill({ status: 500, body: '{"error":"QA"}' }),
      );
      await seo.analyze(SAMPLE_DOMAIN);
      await expect(seo.crashScreen).toHaveCount(0);
      await expect(seo.competitorsStatus).toHaveText(rxExact('Waiting'));
      await expect(seo.analyzeButton).toBeEnabled();
    });

    test('SEO-22 input panjang diterima tanpa error', async ({ seo }) => {
      // [-] Keyword 500 karakter diterima dan halaman tidak error.
      await seo.keywordInput.fill('k'.repeat(500));
      await expect(seo.keywordInput).toHaveValue('k'.repeat(500));
      await expect(seo.tab('Overview')).toBeVisible();
    });

    test('SEO-23 input HTML tidak dieksekusi', async ({ seo }) => {
      // [-] Keyword berisi tag HTML/script tidak menjalankan script dan halaman tetap normal.
      const dialogs: string[] = [];
      seo.page.on('dialog', (dialog) => {
        dialogs.push(dialog.message());
        void dialog.dismiss();
      });
      await seo.keywordInput.fill('<script>alert(1)</script>');
      await seo.urlInput.fill('javascript:alert(1)');
      await seo.page.waitForTimeout(1000);
      expect(dialogs, `Script dieksekusi: ${dialogs}`).toEqual([]);
      await expect(seo.tab('Overview')).toBeVisible();
    });
  });

  // ------------------------------------------------------------------ 3. Lihat Overview
  test.describe('3. Lihat Overview (Health Score, Keywords, Traffic, AI Citations)', () => {
    test('SEO-02 tab default overview', async ({ seo }) => {
      // [+] Tab Overview aktif saat halaman dibuka.
      await expect(seo.tab('Overview')).toHaveAttribute('aria-selected', 'true');
    });

    test('SEO-24 kartu ringkasan tampil', async ({ seo }) => {
      // [+] Empat kartu ringkasan tampil: SEO Health Score, Indexed Pages, Keywords Ranking, AI Citations.
      for (const label of ['SEO Health Score', 'Indexed Pages', 'Keywords Ranking', 'AI Citations']) {
        await expect(seo.page.getByText(rxExact(label)).first()).toBeVisible();
      }
    });

    test('SEO-25 skor SEO format', async ({ seo }) => {
      // [+] SEO Health Score ditampilkan dalam format 'NN/100' dengan nilai 0..100.
      const score = seo.page.getByText(/^\s*\d{1,3}\/100\s*$/).first();
      await expect(score).toBeVisible();
      const value = parseInt(await score.innerText(), 10);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    });

    test('SEO-26 bagian grafik tampil', async ({ seo }) => {
      // [+] Bagian AI Citations, Organic Traffic, dan Position Distribution tampil.
      for (const heading of ['AI Citations', 'Organic Traffic', 'Position Distribution']) {
        await expect(seo.page.getByText(rxExact(heading)).first()).toBeVisible();
      }
    });

    test('SEO-27 position distribution rentang', async ({ seo }) => {
      // [+] Position Distribution memuat rentang Top 3, 4-10, 11-20, dan 21+.
      for (const range of ['Top 3', '4-10', '11-20', '21+']) {
        await expect(seo.page.getByText(rxExact(range)).first()).toBeVisible();
      }
    });

    test('SEO-28 pilihan grafik traffic', async ({ seo }) => {
      // [+] Pilihan 'Organic Traffic' dan 'Organic Pages' tampil dan bisa diklik tanpa error.
      const traffic = seo.page.getByText(rxExact('Organic Traffic')).last(); // pilihan di kanan judul grafik
      const pages = seo.page.getByText(rxExact('Organic Pages')).first();
      await expect(traffic).toBeVisible();
      await expect(pages).toBeVisible();
      await pages.click();
      await traffic.click();
      await expect(seo.tab('Overview')).toHaveAttribute('aria-selected', 'true');
    });

    test('SEO-41 overview tanpa data keyword', async ({ seo }) => {
      // [-] Belum ada keyword dilacak: kartu bernilai 0 dan pesan ajakan 'Track keywords' tampil, bukan error.
      const { client } = await seo.overviewData();
      test.skip(Boolean(client?.domain), 'Akun QA sudah punya domain/keyword');
      await expect(seo.page.getByText(rx('Track keywords to unlock')).first()).toBeVisible();
      await expect(seo.crashScreen).toHaveCount(0);
    });
  });

  // ------------------------------------------------------------------ 4. Pilih tab
  test.describe('4. Pilih tab', () => {
    // SEO-03 .. SEO-10: setiap tab (selain Overview) bisa dibuka tanpa crash.
    SEO_TABS.slice(1).forEach((name, index) => {
      const options = name === 'Site Audit' ? meta({ bug: BUG_SITE_AUDIT }) : {};
      test(`SEO-${num(3 + index)} buka tab ${name}`, options, async ({ seo }) => {
        // [+] Tab bisa dibuka dan menjadi aktif, tab Overview tidak aktif, halaman tidak crash.
        await seo.tab(name).click();
        // Crash baru muncul setelah data tab selesai dimuat (bukan saat klik), jadi beri waktu render dulu.
        await seo.page.waitForTimeout(3000);
        await expect(seo.crashScreen).toHaveCount(0);
        await expect(seo.tab(name)).toHaveAttribute('aria-selected', 'true');
        await expect(seo.tab('Overview')).toHaveAttribute('aria-selected', 'false');
        if (TAB_MARKERS[name]) await expect(seo.tabMarker(name)).toBeVisible();
      });
    });

    test('SEO-29 isi tab content ideas', async ({ seo }) => {
      // [+] Tab Content Ideas menampilkan bagian 'Topic Research'.
      await seo.tab('Content Ideas').click();
      await expect(seo.page.getByText(rx('Topic Research')).first()).toBeVisible();
    });

    test('SEO-30 isi tab keywords', async ({ seo }) => {
      // [+] Tab Keywords menampilkan 'Keywords Explorer'.
      await seo.tab('Keywords').click();
      await expect(seo.page.getByText(rx('Keywords Explorer')).first()).toBeVisible();
    });

    test('SEO-31 kembali ke overview', async ({ seo }) => {
      // [+] Berpindah tab lalu kembali ke Overview menampilkan kartu ringkasan lagi.
      await seo.tab('Keywords').click();
      await seo.tab('Overview').click();
      await expect(seo.tab('Overview')).toHaveAttribute('aria-selected', 'true');
      await expect(seo.page.getByText(rxExact('SEO Health Score')).first()).toBeVisible();
    });

    test('SEO-32 input tetap setelah pindah tab', async ({ seo }) => {
      // [-] Isi URL tidak membuat error setelah berpindah tab dan kembali.
      await seo.urlInput.fill('https://example.com/page');
      await seo.tab('Backlinks').click();
      await seo.tab('Overview').click();
      await expect(seo.urlInput).toBeVisible();
    });

    test('SEO-42 hanya satu tab aktif', async ({ seo }) => {
      // [-] Berganti tab berkali-kali (tanpa Site Audit yang crash) tetap hanya satu tab aktif.
      for (const name of SEO_TABS.filter((t) => t !== 'Site Audit')) {
        await seo.tab(name).click();
        await expect(seo.page.getByRole('tab', { selected: true })).toHaveCount(1);
        await expect(seo.tab(name)).toHaveAttribute('aria-selected', 'true');
      }
    });
  });

  // ------------------------------------------------------------------ 5. Open Workspace / View All
  test.describe('5. Open Workspace / View All (lihat detail)', () => {
    test('SEO-43 Open Workspace membuka detail', async ({ seo }) => {
      // [+] Tombol 'Open Workspace' (Growth Insights) membuka workspace Content Optimizer.
      await seo.openWorkspaceButton.click();
      await expect(seo.tab('Content Optimizer')).toHaveAttribute('aria-selected', 'true');
      await expect(seo.tabMarker('Content Optimizer')).toBeVisible();
    });

    test('SEO-44 View All membuka daftar keyword lengkap', meta({
      skip: 'Butuh akun dengan keyword ter-track (tabel Top Organic Keywords berisi data)',
    }), async () => {});

    test('SEO-45 View All tanpa data keyword', async ({ seo }) => {
      // [-] Tabel Top Organic Keywords kosong: klik 'View All' tidak crash dan tetap di halaman SEO.
      await seo.viewAllButton.click();
      await expect(seo.crashScreen).toHaveCount(0);
      await seo.expectUrlContains('/seo');
      await expect(seo.page.getByRole('tab', { selected: true })).toHaveCount(1);
    });
  });

  // ------------------------------------------------------------------ 6. Butuh artikel SEO?
  test.describe('6. Butuh artikel SEO?', () => {
    test('SEO-46 [Ya] buka Articles lalu New Article', async ({ seo }) => {
      // [+] Dari halaman SEO: sidebar SEO > Articles, lalu New Article membuka form artikel baru.
      await seo.page.getByRole('navigation').getByRole('link', { name: rxExact('Articles') }).click();
      await seo.expectUrlContains(LIST_PATH);
      await seo.page.getByRole('link', { name: rx('New Article') }).first().click();
      await seo.expectUrlContains(CREATE_PATH);
      await expect(seo.page.getByRole('heading', { name: rxExact('New Article') })).toBeVisible();
    });

    test('SEO-47 [Ya] form New Article tanpa login', async ({ anon }) => {
      // [-] Membuka form New Article tanpa sesi login diarahkan ke halaman login.
      await anon.goto(CREATE_PATH);
      await expect(anon).toHaveURL(/\/login/);
    });

    test('SEO-48 [Tidak] selesai kembali ke Dashboard', async ({ seo }) => {
      // [+] Tidak butuh artikel: breadcrumb Dashboard membawa pengguna keluar dari SEO.
      await seo.page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: rxExact('Dashboard') }).click();
      await seo.expectUrlContains('/dashboard');
    });
  });
});
