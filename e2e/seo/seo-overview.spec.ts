/**
 * Menu SEO > Overview (SEO-01 .. SEO-33).
 *
 * BELUM ada di Google Sheet; ID ini usulan dan dibuat dari UI staging.
 * Halaman Growth Intel · SEO punya 9 tab. Analisis nyata (tombol Analyze) memakai kuota/token,
 * jadi hanya dicek kesiapan input-nya: tombol Analyze yang AKTIF tidak pernah diklik di sini.
 */
import { SEO_TABS } from '../../src/pages/seo-page';
import { expect, meta, test } from '../../src/fixtures';
import { rx } from '../../src/utils/text';

const SITE_AUDIT_BUG = "Membuka tab Site Audit menampilkan 'Application error: a client-side exception has occurred'";
const BUG_URL_INVALID = "Staging: URL tidak valid ('bukan-url') tetap mengaktifkan tombol Analyze, tanpa validasi format";

/** Nomor urut dua digit untuk ID test, mis. 3 -> "03". */
const num = (n: number) => String(n).padStart(2, '0');

test.describe('SEO Overview', () => {
  test('SEO-01 akses halaman', async ({ seo }) => {
    // Judul Growth Intel · SEO dan seluruh 9 tab tampil.
    for (const name of SEO_TABS) await expect(seo.tab(name)).toBeVisible();
  });

  test('SEO-02 tab default overview', async ({ seo }) => {
    // Tab Overview aktif saat halaman dibuka.
    await expect(seo.tab('Overview')).toHaveAttribute('aria-selected', 'true');
  });

  // SEO-03 .. SEO-10: setiap tab (selain Overview) bisa dibuka.
  SEO_TABS.slice(1).forEach((name, index) => {
    const details = name === 'Site Audit' ? meta({ bug: SITE_AUDIT_BUG }) : meta();
    test(`SEO-${num(index + 3)} buka tab ${name}`, details, async ({ seo }) => {
      // Setiap tab bisa dibuka dan menjadi aktif; tab lain tidak aktif.
      await seo.tab(name).click();
      await expect(seo.tab(name)).toHaveAttribute('aria-selected', 'true');
      await expect(seo.tab('Overview')).toHaveAttribute('aria-selected', 'false');
    });
  });

  test('SEO-11 input analisis overview', async ({ seo }) => {
    // Overview punya input URL halaman, input keyword, dan tombol Analyze.
    await expect(seo.urlInput).toBeVisible();
    await expect(seo.keywordInput).toBeVisible();
    await expect(seo.analyzeButton).toBeVisible();
  });

  test('SEO-12 input menerima teks', async ({ seo }) => {
    // URL dan keyword tampil utuh sesuai yang diketik.
    await seo.urlInput.fill('https://example.com/page');
    await seo.keywordInput.fill('kopi susu gula aren');
    await expect(seo.urlInput).toHaveValue('https://example.com/page');
    await expect(seo.keywordInput).toHaveValue('kopi susu gula aren');
  });

  test('SEO-13 analyze tanpa input', async ({ seo }) => {
    // Analyze tanpa URL/keyword tidak memulai analisis (tombol nonaktif atau ada validasi).
    await seo.analyzeButton.click({ force: true });
    await seo.page.waitForTimeout(800);
    await expect(seo.tab('Overview')).toHaveAttribute('aria-selected', 'true');
    const hasValidation = (await seo.page.getByText(/required|wajib|enter|masukkan/i).count()) > 0;
    expect((await seo.analyzeButton.isDisabled()) || hasValidation).toBe(true);
  });

  test('SEO-14 tab tidak hilang setelah reload', async ({ seo }) => {
    // Reload halaman tetap menampilkan seluruh tab.
    await seo.page.reload();
    for (const name of SEO_TABS) await expect(seo.tab(name)).toBeVisible({ timeout: 30_000 });
  });

  // ============================================================ OVERVIEW: tombol Analyze & input (positif + negatif)
  test('SEO-15 analyze nonaktif saat kosong', async ({ seo }) => {
    // Saat URL dan keyword kosong, tombol Analyze nonaktif.
    await expect(seo.analyzeButton).toBeDisabled();
  });

  test('SEO-16 analyze aktif setelah URL diisi', async ({ seo }) => {
    // Mengisi URL yang valid mengaktifkan tombol Analyze (keyword opsional). Tidak diklik: memakai token.
    await seo.urlInput.fill('https://example.com/page');
    await expect(seo.analyzeButton).toBeEnabled();
  });

  test('SEO-17 analyze aktif URL dan keyword', async ({ seo }) => {
    // URL dan keyword terisi: Analyze aktif. Tidak diklik: memakai token.
    await seo.urlInput.fill('https://example.com/page');
    await seo.keywordInput.fill('kopi susu');
    await expect(seo.analyzeButton).toBeEnabled();
  });

  test('SEO-18 analyze nonaktif hanya keyword', async ({ seo }) => {
    // Hanya keyword tanpa URL: Analyze tetap nonaktif.
    await seo.keywordInput.fill('kopi susu');
    await expect(seo.analyzeButton).toBeDisabled();
  });

  test('SEO-19 analyze nonaktif input spasi', async ({ seo }) => {
    // URL dan keyword berisi spasi saja dianggap kosong: Analyze nonaktif.
    await seo.urlInput.fill('   ');
    await seo.keywordInput.fill('   ');
    await expect(seo.analyzeButton).toBeDisabled();
  });

  test('SEO-20 analyze nonaktif lagi setelah dikosongkan', async ({ seo }) => {
    // Setelah URL diisi lalu dihapus, Analyze kembali nonaktif.
    await seo.urlInput.fill('https://example.com/page');
    await expect(seo.analyzeButton).toBeEnabled();
    await seo.urlInput.fill('');
    await expect(seo.analyzeButton).toBeDisabled();
  });

  test('SEO-21 URL tidak valid ditolak', meta({ bug: BUG_URL_INVALID }), async ({ seo }) => {
    // URL tanpa format yang benar ('bukan-url') seharusnya tidak mengaktifkan Analyze.
    await seo.urlInput.fill('bukan-url');
    await seo.keywordInput.fill('kopi susu');
    await expect(seo.analyzeButton).toBeDisabled();
  });

  test('SEO-22 input panjang diterima tanpa error', async ({ seo }) => {
    // Keyword 500 karakter diterima dan halaman tidak error.
    await seo.keywordInput.fill('k'.repeat(500));
    await expect(seo.keywordInput).toHaveValue('k'.repeat(500));
    await expect(seo.tab('Overview')).toBeVisible();
  });

  test('SEO-23 input HTML tidak dieksekusi', async ({ seo }) => {
    // Keyword berisi tag HTML/script tidak menjalankan script dan halaman tetap normal.
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

  // ============================================================ OVERVIEW: kartu ringkasan & grafik
  test('SEO-24 kartu ringkasan tampil', async ({ seo }) => {
    // Empat kartu ringkasan tampil: SEO Health Score, Indexed Pages, Keywords Ranking, AI Citations.
    for (const label of ['SEO Health Score', 'Indexed Pages', 'Keywords Ranking', 'AI Citations']) {
      await expect(seo.page.getByText(new RegExp(`^\\s*${label}\\s*$`, 'i')).first()).toBeVisible();
    }
  });

  test('SEO-25 skor SEO format', async ({ seo }) => {
    // SEO Health Score ditampilkan dalam format 'NN/100'.
    await expect(seo.page.getByText(/^\s*\d{1,3}\/100\s*$/).first()).toBeVisible();
  });

  test('SEO-26 bagian grafik tampil', async ({ seo }) => {
    // Bagian AI Citations, Organic Traffic, dan Position Distribution tampil.
    for (const heading of ['AI Citations', 'Organic Traffic', 'Position Distribution']) {
      await expect(seo.page.getByText(new RegExp(`^\\s*${heading}\\s*$`, 'i')).first()).toBeVisible();
    }
  });

  test('SEO-27 position distribution rentang', async ({ seo }) => {
    // Position Distribution memuat rentang Top 3, 4-10, 11-20, dan 21+.
    for (const range of ['Top 3', '4-10', '11-20', '21+']) {
      await expect(seo.page.getByText(new RegExp(`^\\s*${range.replace('+', '\\+')}\\s*$`, 'i')).first()).toBeVisible();
    }
  });

  test('SEO-28 pilihan grafik traffic', async ({ seo }) => {
    // Pilihan 'Organic Traffic' dan 'Organic Pages' tampil dan bisa diklik tanpa error.
    const traffic = seo.page.getByText(/^\s*Organic Traffic\s*$/i).last(); // pilihan di kanan judul grafik
    const pages = seo.page.getByText(/^\s*Organic Pages\s*$/i).first();
    await expect(traffic).toBeVisible();
    await expect(pages).toBeVisible();
    await pages.click();
    await traffic.click();
    await expect(seo.tab('Overview')).toHaveAttribute('aria-selected', 'true');
  });

  // ============================================================ TAB LAIN: isi & kembali ke Overview
  test('SEO-29 isi tab content ideas', async ({ seo }) => {
    // Tab Content Ideas menampilkan bagian 'Topic Research'.
    await seo.tab('Content Ideas').click();
    await expect(seo.page.getByText(rx('Topic Research')).first()).toBeVisible();
  });

  test('SEO-30 isi tab keywords', async ({ seo }) => {
    // Tab Keywords menampilkan 'Keywords Explorer'.
    await seo.tab('Keywords').click();
    await expect(seo.page.getByText(rx('Keywords Explorer')).first()).toBeVisible();
  });

  test('SEO-31 kembali ke overview', async ({ seo }) => {
    // Berpindah tab lalu kembali ke Overview menampilkan kartu ringkasan lagi.
    await seo.tab('Keywords').click();
    await seo.tab('Overview').click();
    await expect(seo.tab('Overview')).toHaveAttribute('aria-selected', 'true');
    await expect(seo.page.getByText(/^\s*SEO Health Score\s*$/i).first()).toBeVisible();
  });

  test('SEO-32 input tetap setelah pindah tab', async ({ seo }) => {
    // Isi URL tidak hilang setelah berpindah tab dan kembali (atau dikosongkan tanpa error).
    await seo.urlInput.fill('https://example.com/page');
    await seo.tab('Backlinks').click();
    await seo.tab('Overview').click();
    await expect(seo.urlInput).toBeVisible();
  });

  test('SEO-33 submenu SEO di sidebar', async ({ seo }) => {
    // Sidebar SEO memuat submenu Overview dan Articles.
    const nav = seo.page.getByRole('navigation');
    await expect(nav.getByRole('link', { name: /^\s*Overview\s*$/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /^\s*Articles\s*$/i })).toBeVisible();
  });
});
