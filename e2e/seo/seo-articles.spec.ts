/**
 * SEO > Articles (ART-01 .. ART-40): daftar artikel, form New Article / Edit Article, pencarian, hapus.
 *
 * Aturan yang ditemukan di staging (2 Nov 2026):
 *   - Kolom yang divalidasi: Title, Meta Title, Meta Description ("... is required"). Slug terisi otomatis dari Title.
 *   - Excerpt, Alt Text, Author, Meta Keywords tidak divalidasi walau berlabel bintang.
 *   - Create sukses: toast "Article created" lalu kembali ke /seo/articles. Tiap kartu punya Edit / Export / Delete.
 *
 * Test yang MENYIMPAN atau MENGHAPUS data diberi `destructive: true` (tidak ikut run default;
 * jalankan dengan `npm run test:destructive`). Artikel uji dibuat dengan judul unik dan dihapus lagi
 * lewat fixture `sampleArticle`.
 */
import { ArticlesPage, CREATE_PATH, LIST_PATH, uniqueTitle } from '../../src/pages/seo-articles-page';
import { expect, meta, test } from '../../src/fixtures';
import { rx, rxExact } from '../../src/utils/text';

const TITLE_REQUIRED = 'Title is required';
const META_TITLE_REQUIRED = 'Meta title is required';
const META_DESC_REQUIRED = 'Meta description is required';

const BUG_SEARCH = 'Staging: pencarian tidak memfilter, artikel yang tidak cocok dengan kata kunci tetap tampil';
const BUG_CATEGORIES = "Staging: form artikel menampilkan toast 'Failed to load categories' (Category tidak bisa dipilih)";
const BUG_AUTHOR = "Staging: Author yang diisi tidak tersimpan (daftar menampilkan 'Unknown', form Edit kosong)";

/** Pola URL daftar artikel: /seo/articles (boleh diakhiri garis miring). */
const LIST_URL = new RegExp(`${LIST_PATH}/?$`);

/** Hapus artikel uji (best-effort) supaya staging tidak menumpuk data. */
async function cleanup(articles: ArticlesPage, title: string, testInfo: { annotations: { type: string; description?: string }[] }) {
  try {
    await articles.openList();
    if (await articles.card(title).count()) {
      await articles.deleteArticle(title);
      await expect(articles.card(title)).toHaveCount(0, { timeout: 15_000 });
    }
  } catch (error) {
    testInfo.annotations.push({
      type: 'peringatan',
      description: `Artikel uji '${title}' gagal dihapus otomatis, hapus manual di SEO > Articles: ${String(error).slice(0, 120)}`,
    });
  }
}

test.describe('SEO Articles', () => {
  // ============================================================ DAFTAR ARTIKEL (positif)
  test('ART-01 akses daftar artikel', async ({ articles }) => {
    // Judul, deskripsi, tombol New Article, kartu Total Articles, kolom cari, dan tombol Search tampil.
    await expect(articles.listHeading).toBeVisible();
    await expect(articles.page.getByText(rx('Create and save article drafts'))).toBeVisible();
    await expect(articles.newArticleLink).toBeVisible();
    await expect(articles.searchInput).toBeVisible();
    await expect(articles.searchButton).toBeVisible();
  });

  test('ART-02 total artikel berupa angka', async ({ articles }) => {
    // Kartu Total Articles menampilkan angka 0 atau lebih.
    expect(await articles.totalArticles()).toBeGreaterThanOrEqual(0);
  });

  test('ART-03 navigasi sidebar ke Articles', async ({ seo }) => {
    // Submenu SEO > Articles di sidebar membuka daftar artikel.
    await seo.page.getByRole('link', { name: rxExact('Articles') }).first().click();
    await seo.expectUrlContains(LIST_PATH);
    await expect(seo.page.getByRole('heading', { name: rx('Articles Management') })).toBeVisible();
  });

  test('ART-04 tombol New Article', async ({ articles }) => {
    // Tombol New Article membuka form New Article.
    await articles.newArticleLink.click();
    await articles.expectUrlContains(CREATE_PATH);
    await expect(articles.page.getByRole('heading', { name: rxExact('New Article') })).toBeVisible();
  });

  test('ART-05 reload daftar tetap tampil', async ({ articles }) => {
    // Reload halaman daftar tidak menghilangkan judul maupun kolom cari.
    await articles.page.reload();
    await expect(articles.listHeading).toBeVisible({ timeout: 30_000 });
    await expect(articles.searchInput).toBeVisible();
  });

  // ============================================================ FORM NEW ARTICLE (positif)
  test('ART-06 bagian form lengkap', async ({ articleForm }) => {
    // Form memuat bagian Basic Information, Media, Taxonomy, SEO beserta kolom utamanya.
    for (const heading of ['Basic Information', 'Media', 'Taxonomy', 'SEO']) {
      await expect(articleForm.page.getByRole('heading', { name: rxExact(heading) })).toBeVisible();
    }
    for (const field of [
      articleForm.titleInput, articleForm.slugInput, articleForm.excerptInput, articleForm.altTextInput,
      articleForm.authorInput, articleForm.metaTitleInput, articleForm.metaKeywordsInput, articleForm.metaDescriptionInput,
    ]) {
      await expect(field).toBeVisible();
    }
    await expect(articleForm.createButton).toBeVisible();
    await expect(articleForm.cancelButton).toBeVisible();
  });

  test('ART-07 live preview mengikuti judul', async ({ articleForm }) => {
    // Live Preview menampilkan 'Untitled article', lalu berubah mengikuti Title yang diketik.
    await expect(articleForm.previewTitle).toHaveText(rxExact('Untitled article'));
    await articleForm.titleInput.fill('Panduan Belajar SEO Pemula');
    await expect(articleForm.previewTitle).toHaveText('Panduan Belajar SEO Pemula');
  });

  test('ART-08 slug otomatis dari judul', async ({ articleForm }) => {
    // Slug terisi otomatis dari Title dalam huruf kecil dengan tanda hubung.
    await articleForm.titleInput.fill('Panduan Belajar SEO Pemula');
    await expect(articleForm.slugInput).toHaveValue('panduan-belajar-seo-pemula');
  });

  test('ART-09 slug dinormalisasi', async ({ articleForm }) => {
    // Slug yang diketik dengan spasi dan simbol dirapikan menjadi format slug.
    await articleForm.slugInput.fill('Slug Dengan Spasi!!');
    await articleForm.slugInput.press('Tab');
    await expect(articleForm.slugInput).toHaveValue('slug-dengan-spasi');
  });

  test('ART-10 preview pencarian mengikuti meta', async ({ articleForm }) => {
    // Search Preview menampilkan Meta Title dan Meta Description yang diketik.
    await articleForm.metaTitleInput.fill('Judul Meta Uji Preview');
    await articleForm.metaDescriptionInput.fill('Deskripsi meta untuk uji preview hasil pencarian.');
    await expect(articleForm.page.getByText('Judul Meta Uji Preview').last()).toBeVisible();
    await expect(articleForm.page.getByText('Deskripsi meta untuk uji preview hasil pencarian.').last()).toBeVisible();
  });

  test('ART-11 sembunyikan dan tampilkan preview', async ({ articleForm }) => {
    // Tombol Hide preview menyembunyikan Live Preview, dan menampilkannya lagi saat diklik ulang.
    await expect(articleForm.previewPanel).toBeVisible();
    await articleForm.previewToggle.click();
    await expect(articleForm.previewPanel).toBeHidden();
    await articleForm.previewToggle.click();
    await expect(articleForm.previewPanel).toBeVisible();
  });

  test('ART-12 export nonaktif sebelum disimpan', async ({ articleForm }) => {
    // Export nonaktif di form baru karena artikel belum tersimpan.
    await expect(articleForm.exportButton).toBeDisabled();
  });

  test('ART-13 fitur AI belum tersedia', async ({ articleForm }) => {
    // Generate with AI menampilkan 'Coming soon' dan Generate image nonaktif.
    await expect(articleForm.page.getByText(rx('Coming soon')).first()).toBeVisible();
    await expect(articleForm.button('Generate image')).toBeDisabled();
  });

  test('ART-14 cancel kembali ke daftar', async ({ articles }) => {
    // Cancel di form New Article kembali ke daftar tanpa menambah artikel.
    const before = await articles.totalArticles();
    await articles.newArticleLink.click();
    await expect(articles.titleInput).toBeVisible();
    await articles.titleInput.fill(uniqueTitle('Batal'));
    await articles.cancelButton.click();
    await expect(articles.page).toHaveURL(LIST_URL);
    await expect(articles.listHeading).toBeVisible();
    expect(await articles.totalArticles()).toBe(before);
  });

  // ============================================================ FORM NEW ARTICLE (negatif / validasi)
  test('ART-15 create form kosong', async ({ articleForm }) => {
    // Create tanpa mengisi apa pun ditolak: muncul 'Title is required' dan tetap di form.
    await articleForm.createButton.click();
    await expect(articleForm.toast(TITLE_REQUIRED).first()).toBeVisible();
    await articleForm.expectUrlContains(CREATE_PATH);
  });

  test('ART-16 create hanya judul', async ({ articleForm }) => {
    // Hanya Title terisi: Meta Title dan Meta Description wajib muncul sebagai pesan error di kolomnya.
    await articleForm.titleInput.fill(uniqueTitle('Hanya Judul'));
    await articleForm.createButton.click();
    await expect(articleForm.page.getByText(META_TITLE_REQUIRED).first()).toBeVisible();
    await expect(articleForm.page.getByText(META_DESC_REQUIRED).first()).toBeVisible();
    await articleForm.expectUrlContains(CREATE_PATH);
  });

  test('ART-17 title hanya spasi', async ({ articleForm }) => {
    // Title berisi spasi saja dianggap kosong: 'Title is required'.
    await articleForm.titleInput.fill('     ');
    await articleForm.metaTitleInput.fill('Meta uji');
    await articleForm.metaDescriptionInput.fill('Deskripsi uji');
    await articleForm.createButton.click();
    await expect(articleForm.toast(TITLE_REQUIRED).first()).toBeVisible();
    await articleForm.expectUrlContains(CREATE_PATH);
  });

  test('ART-18 tanpa meta title', async ({ articleForm }) => {
    // Meta Title kosong ditolak walau kolom lain terisi.
    await articleForm.titleInput.fill(uniqueTitle('Tanpa Meta Title'));
    await articleForm.metaDescriptionInput.fill('Deskripsi uji');
    await articleForm.createButton.click();
    await expect(articleForm.page.getByText(META_TITLE_REQUIRED).first()).toBeVisible();
    await expect(articleForm.page.getByText(META_DESC_REQUIRED)).toHaveCount(0);
    await articleForm.expectUrlContains(CREATE_PATH);
  });

  test('ART-19 tanpa meta description', async ({ articleForm }) => {
    // Meta Description kosong ditolak walau kolom lain terisi.
    await articleForm.titleInput.fill(uniqueTitle('Tanpa Meta Desc'));
    await articleForm.metaTitleInput.fill('Meta uji');
    await articleForm.createButton.click();
    await expect(articleForm.page.getByText(META_DESC_REQUIRED).first()).toBeVisible();
    await expect(articleForm.page.getByText(META_TITLE_REQUIRED)).toHaveCount(0);
    await articleForm.expectUrlContains(CREATE_PATH);
  });

  test('ART-20 meta hanya spasi', async ({ articleForm }) => {
    // Meta Title dan Meta Description berisi spasi saja dianggap kosong.
    await articleForm.titleInput.fill(uniqueTitle('Meta Spasi'));
    await articleForm.metaTitleInput.fill('   ');
    await articleForm.metaDescriptionInput.fill('   ');
    await articleForm.createButton.click();
    await expect(articleForm.page.getByText(META_TITLE_REQUIRED).first()).toBeVisible();
    await expect(articleForm.page.getByText(META_DESC_REQUIRED).first()).toBeVisible();
  });

  test('ART-21 judul HTML tidak dieksekusi', async ({ articleForm }) => {
    // Title berisi tag HTML/script tampil sebagai teks di preview dan tidak menjalankan script.
    const dialogs: string[] = [];
    articleForm.page.on('dialog', (dialog) => {
      dialogs.push(dialog.message());
      void dialog.dismiss();
    });
    const payload = '<img src=x onerror=alert(1)>';
    await articleForm.titleInput.fill(payload);
    await expect(articleForm.previewTitle).toHaveText(payload);
    await articleForm.page.waitForTimeout(1000);
    expect(dialogs, `Script dieksekusi: ${dialogs}`).toEqual([]);
  });

  // Bug muncul tidak konsisten (kadang toast tampil, kadang tidak), jadi hanya dicatat, tidak diharapkan gagal.
  test('ART-22 kategori termuat', meta({ flakyBug: BUG_CATEGORIES }), async ({ articleForm }) => {
    // Membuka form tidak menampilkan error 'Failed to load categories'.
    await articleForm.page.waitForTimeout(3000);
    await expect(articleForm.toast('Failed to load categories')).toHaveCount(0);
  });

  // ============================================================ PENCARIAN
  test('ART-23 cari spasi tidak error', async ({ articles }) => {
    // Mencari dengan spasi saja tidak merusak halaman: daftar tetap tampil.
    await articles.search('   ');
    await expect(articles.listHeading).toBeVisible();
    await expect(articles.page.getByText(rx('Application error'))).toHaveCount(0);
  });

  test('ART-24 cari karakter khusus aman', async ({ articles }) => {
    // Kata kunci berisi tag HTML tidak menjalankan script dan tidak merusak halaman.
    const dialogs: string[] = [];
    articles.page.on('dialog', (dialog) => {
      dialogs.push(dialog.message());
      void dialog.dismiss();
    });
    await articles.search('<script>alert(1)</script>');
    await articles.page.waitForTimeout(1500);
    await expect(articles.listHeading).toBeVisible();
    expect(dialogs, `Script dieksekusi: ${dialogs}`).toEqual([]);
  });

  test('ART-25 cari dengan Enter', async ({ articles }) => {
    // Menekan Enter di kolom cari tidak menyebabkan error halaman.
    await articles.searchInput.fill('artikel');
    await articles.searchInput.press('Enter');
    await expect(articles.listHeading).toBeVisible();
  });

  test('ART-26 cari judul yang ada', meta({ destructive: true }), async ({ sampleArticle }) => {
    // Mencari judul artikel yang ada menampilkan kartu artikel tersebut.
    const articles = await sampleArticle.page.openList();
    await articles.search(sampleArticle.title);
    await expect(articles.card(sampleArticle.title)).toBeVisible();
  });

  test('ART-27 cari tidak peka huruf', meta({ destructive: true }), async ({ sampleArticle }) => {
    // Pencarian tidak membedakan huruf besar/kecil.
    const articles = await sampleArticle.page.openList();
    await articles.search(sampleArticle.title.toLowerCase());
    await expect(articles.card(sampleArticle.title)).toBeVisible();
  });

  test('ART-28 cari tanpa hasil', meta({ destructive: true, bug: BUG_SEARCH }), async ({ sampleArticle }) => {
    // Kata kunci yang tidak cocok menyembunyikan artikel dan tidak menampilkan kartu lain.
    const articles = await sampleArticle.page.openList();
    await articles.search('zzzxqj-kata-tidak-ada');
    await expect(articles.card(sampleArticle.title)).toBeHidden({ timeout: 8000 });
  });

  // ============================================================ CREATE / EDIT / DELETE (menyimpan data)
  test('ART-29 create semua kolom', meta({ destructive: true }), async ({ articles }, testInfo) => {
    // Create dengan semua kolom terisi: toast 'Article created', kembali ke daftar, kartu muncul, total bertambah.
    const before = await articles.totalArticles();
    const title = uniqueTitle();
    await articles.newArticleLink.click();
    await articles.fillAll(title);
    await articles.createButton.click();
    try {
      await expect(articles.toast('Article created').first()).toBeVisible();
      await expect(articles.page).toHaveURL(LIST_URL, { timeout: 30_000 });
      await expect(articles.card(title)).toBeVisible({ timeout: 30_000 });
      expect(await articles.totalArticles()).toBe(before + 1);
    } finally {
      await cleanup(articles, title, testInfo);
    }
  });

  test('ART-30 create hanya kolom wajib', meta({ destructive: true }), async ({ articles }, testInfo) => {
    // Create hanya dengan Title, Meta Title, dan Meta Description berhasil.
    const title = uniqueTitle('Minimal');
    await articles.newArticleLink.click();
    await articles.fillRequired(title);
    await articles.createButton.click();
    try {
      await expect(articles.toast('Article created').first()).toBeVisible();
      await expect(articles.card(title)).toBeVisible({ timeout: 30_000 });
    } finally {
      await cleanup(articles, title, testInfo);
    }
  });

  test('ART-31 create judul ganda ditolak', meta({ destructive: true }), async ({ sampleArticle }) => {
    // Membuat artikel kedua dengan judul (slug) yang sama ditolak: tetap di form, tanpa toast 'Article created'.
    const articles = await sampleArticle.page.openList();
    await articles.newArticleLink.click();
    await articles.fillRequired(sampleArticle.title);
    await articles.createButton.click();
    await articles.page.waitForTimeout(3000);
    try {
      await expect(articles.toast('Article created')).toHaveCount(0);
      await articles.expectUrlContains(CREATE_PATH);
    } finally {
      if (!articles.page.url().includes(CREATE_PATH)) {
        // Kalau ternyata terbuat dobel, buang yang ekstra.
        await articles.openList();
        const sameTitle = articles.page.getByRole('link', { name: sampleArticle.title, exact: true });
        while ((await sameTitle.count()) > 1) {
          await articles.deleteArticle(sampleArticle.title);
          await articles.page.waitForTimeout(1500);
        }
      }
    }
  });

  test('ART-32 edit membuka data tersimpan', meta({ destructive: true }), async ({ sampleArticle }) => {
    // Edit membuka form 'Edit Article' berisi judul yang tersimpan, dengan tombol Save dan Cancel.
    const articles = await sampleArticle.page.openList();
    await articles.editLink(sampleArticle.title).click();
    await expect(articles.page.getByRole('heading', { name: rxExact('Edit Article') })).toBeVisible();
    await expect(articles.titleInput).toHaveValue(sampleArticle.title);
    await expect(articles.saveButton).toBeVisible();
    await expect(articles.cancelButton).toBeVisible();
  });

  test('ART-33 edit simpan perubahan', meta({ destructive: true }), async ({ sampleArticle }) => {
    // Mengubah judul lalu Save memperbarui kartu di daftar.
    const articles = await sampleArticle.page.openList();
    await articles.editLink(sampleArticle.title).click();
    const newTitle = uniqueTitle('QA Diubah');
    await articles.titleInput.fill(newTitle);
    await articles.saveButton.click();
    sampleArticle.title = newTitle; // supaya fixture menghapus artikel dengan judul terbaru
    await articles.openList();
    await expect(articles.card(newTitle)).toBeVisible({ timeout: 30_000 });
  });

  test('ART-34 edit judul kosong ditolak', meta({ destructive: true }), async ({ sampleArticle }) => {
    // Mengosongkan Title lalu Save ditolak: 'Title is required' dan judul di daftar tidak berubah.
    const articles = await sampleArticle.page.openList();
    await articles.editLink(sampleArticle.title).click();
    await articles.titleInput.fill('');
    await articles.saveButton.click();
    await expect(articles.toast(TITLE_REQUIRED).first()).toBeVisible();
    await articles.openList();
    await expect(articles.card(sampleArticle.title)).toBeVisible();
  });

  test('ART-35 edit cancel tidak menyimpan', meta({ destructive: true }), async ({ sampleArticle }) => {
    // Cancel di form Edit kembali ke daftar tanpa menyimpan perubahan.
    const articles = await sampleArticle.page.openList();
    await articles.editLink(sampleArticle.title).click();
    await articles.titleInput.fill(uniqueTitle('Jangan Tersimpan'));
    await articles.cancelButton.click();
    await expect(articles.page).toHaveURL(LIST_URL);
    await expect(articles.card(sampleArticle.title)).toBeVisible();
  });

  test('ART-36 author tersimpan', meta({ destructive: true, bug: BUG_AUTHOR }), async ({ sampleArticle }) => {
    // Author yang diisi saat Create tampil lagi di form Edit.
    const articles = await sampleArticle.page.openList();
    await articles.editLink(sampleArticle.title).click();
    await expect(articles.authorInput).toHaveValue('QA Tester');
  });

  test('ART-37 hapus artikel', meta({ destructive: true }), async ({ sampleArticle }) => {
    // Delete menghapus artikel: kartu hilang dari daftar dan Total Articles berkurang satu.
    const articles = await sampleArticle.page.openList();
    const before = await articles.totalArticles();
    await articles.deleteArticle(sampleArticle.title);
    await expect(articles.card(sampleArticle.title)).toHaveCount(0, { timeout: 15_000 });
    expect(await articles.totalArticles()).toBe(before - 1);
  });

  // ============================================================ AKSES & ROUTING (negatif)
  test('ART-38 akses tanpa login', async ({ anon }) => {
    // Membuka /seo/articles tanpa login diarahkan ke halaman login.
    await new ArticlesPage(anon).goto(LIST_PATH);
    await expect(anon).toHaveURL(/login/, { timeout: 30_000 });
  });

  test('ART-39 form tanpa login', async ({ anon }) => {
    // Membuka form New Article tanpa login diarahkan ke halaman login.
    await new ArticlesPage(anon).goto(CREATE_PATH);
    await expect(anon).toHaveURL(/login/, { timeout: 30_000 });
  });

  test('ART-40 artikel tidak ada', async ({ app }) => {
    // Membuka artikel dengan ID yang tidak ada tidak menampilkan 'Application error'.
    await new ArticlesPage(app).goto(`${LIST_PATH}/id-artikel-tidak-ada`);
    await app.waitForTimeout(4000);
    await expect(app.getByText(/Application error/i)).toHaveCount(0);
    expect((await app.locator('body').innerText()).trim(), 'Halaman kosong').not.toBe('');
  });
});
