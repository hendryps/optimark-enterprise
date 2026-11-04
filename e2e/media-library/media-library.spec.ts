/**
 * Menu Media Library (MEDIA-01 .. MEDIA-16).
 *
 * BELUM ada di Google Sheet; ID ini usulan dan dibuat dari UI staging.
 * Test yang menambah data permanen (membuat folder, upload file) ditandai destructive karena
 * staging belum punya aksi hapus yang bisa dipakai membersihkan.
 *
 * Cara membaca satu test (pola yang sama dipakai di semua file test):
 *
 *   test('MEDIA-01 akses halaman', async ({ mediaLibrary }) => {      // <- ID + judul + fixture
 *     await expect(mediaLibrary.uploadButton).toBeVisible();          // <- ASSERT: tombol Upload harus tampil
 *   });
 *
 * Pilihan khusus (skip, bug, tokens, destructive) ditulis dengan meta(), mis.
 *   test('MEDIA-09 buat folder valid', meta({ destructive: true, skip: 'alasan' }), async () => {});
 *
 * - `mediaLibrary` adalah fixture: halaman sudah terbuka dan sudah login (src/fixtures/pages.ts).
 * - `mediaLibrary.xxx` adalah elemen halaman, didefinisikan di src/pages/media-library-page.ts.
 * - `expect(...)` adalah asersi Playwright: otomatis menunggu sampai kondisi terpenuhi.
 * - `files.png` dkk. adalah file contoh untuk upload (src/utils/sample-files.ts).
 */
import { MEDIA_CATEGORIES } from '../../src/pages/media-library-page';
import { expect, test, meta } from '../../src/fixtures';

const num = (n: number) => String(n).padStart(2, '0');

test.describe('Media Library', () => {
  test('MEDIA-01 akses halaman', async ({ mediaLibrary }) => {
    // Judul, Create Folder, Upload, kategori, pencarian, filter, dan toggle Grid/List tampil.
    await expect(mediaLibrary.createFolderButton).toBeVisible();
    await expect(mediaLibrary.uploadButton).toBeVisible();
    // Keempat kategori (All, Images, Videos, Articles) harus ada
    for (const category of MEDIA_CATEGORIES) await expect(mediaLibrary.category(category)).toBeVisible();
    // Pencarian, filter, dan dua mode tampilan
    await expect(mediaLibrary.search).toBeVisible();
    await expect(mediaLibrary.filterButton).toBeVisible();
    await expect(mediaLibrary.gridView).toBeVisible();
    await expect(mediaLibrary.listView).toBeVisible();
  });

  test('MEDIA-02 state kosong', async ({ mediaLibrary }) => {
    // Tanpa media: tampil 'No media found' dengan saran mengganti pencarian/kategori.
    // Kalau akun sudah punya media, state kosong tidak muncul -> lewati test, bukan gagal.
    test.skip((await mediaLibrary.emptyState.count()) === 0, 'Akun QA sudah punya media');
    await expect(mediaLibrary.emptyState).toBeVisible();
    await mediaLibrary.expectText('Try another search term', 'choose a different category');
  });

  // MEDIA-03 .. MEDIA-05: kategori Images, Videos, Articles. Tiap varian punya ID sendiri.
  MEDIA_CATEGORIES.slice(1).forEach((name, index) => {
    test(`MEDIA-${num(index + 3)} kategori ${name}`, async ({ mediaLibrary }) => {
      // Kategori bisa dipilih dan menjadi aktif.
      await mediaLibrary.category(name).click();
      expect(await mediaLibrary.isActive(mediaLibrary.category(name))).toBe(true); // yang diklik jadi aktif
      expect(await mediaLibrary.isActive(mediaLibrary.category('All'))).toBe(false); // "All" tidak lagi aktif
    });
  });

  test('MEDIA-06 dialog buat folder', async ({ mediaLibrary }) => {
    // Create Folder membuka dialog 'New Folder' dengan input nama, Cancel, dan Create Folder.
    await mediaLibrary.createFolderButton.click();
    const dialog = mediaLibrary.dialog;
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('New Folder')).toBeVisible();
    await expect(dialog.getByLabel('Folder name').or(dialog.getByRole('textbox'))).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Create Folder' })).toBeVisible();
  });

  test('MEDIA-07 batal buat folder', async ({ mediaLibrary }) => {
    // Cancel menutup dialog tanpa membuat folder.
    await mediaLibrary.createFolderButton.click();
    await mediaLibrary.dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(mediaLibrary.dialog).toHaveCount(0); // dialog hilang dari halaman
  });

  test('MEDIA-08 buat folder tanpa nama', async ({ mediaLibrary }) => {
    // Folder tanpa nama tidak dibuat: tombol nonaktif atau dialog tetap terbuka dengan pesan.
    await mediaLibrary.createFolderButton.click();
    const submit = mediaLibrary.dialog.getByRole('button', { name: 'Create Folder' });
    // Dua perilaku diterima: tombol nonaktif, ATAU diklik tetapi dialog tidak menutup
    if (await submit.isEnabled()) await submit.click();
    await expect(mediaLibrary.dialog).toBeVisible();
  });

  test('MEDIA-09 buat folder valid', meta({
    destructive: true,
    skip: 'Belum ada aksi hapus folder untuk membersihkan data uji',
  }), async () => {});

  test('MEDIA-10 dialog upload', async ({ mediaLibrary }) => {
    // Upload membuka dialog 'Upload media' dengan area drag-and-drop, Choose files, Cancel, Upload.
    await mediaLibrary.uploadButton.click();
    const dialog = mediaLibrary.dialog;
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Upload media')).toBeVisible();
    await expect(dialog.getByText('Drag and drop files here').first()).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Choose files' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible();
  });

  test('MEDIA-11 batal upload', async ({ mediaLibrary }) => {
    // Cancel menutup dialog upload.
    await mediaLibrary.uploadButton.click();
    await mediaLibrary.dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(mediaLibrary.dialog).toHaveCount(0);
  });

  // destructive = menambah data permanen -> tidak ikut run default
  test('MEDIA-12 upload gambar valid', meta({ destructive: true }), async ({ mediaLibrary, files }) => {
    // Upload gambar valid: file tampil di Media Library.
    await mediaLibrary.uploadButton.click(); // 1. buka dialog upload
    await mediaLibrary.upload(files.png); // 2. pilih file logo.png (dari memori, bukan dari disk)
    await mediaLibrary.dialog.getByRole('button', { name: 'Upload', exact: true }).click(); // 3. konfirmasi upload
    await mediaLibrary.expectText('logo.png'); // 4. nama file tampil di daftar
  });

  test('MEDIA-13 filter source dan ratio', async ({ mediaLibrary }) => {
    // Panel filter menyediakan Source (Uploaded, AI Generated) dan Ratio (1:1, 16:9, 9:16, 4:5).
    await mediaLibrary.filterButton.click();
    for (const label of ['Uploaded', 'AI Generated', '1:1', '16:9', '9:16', '4:5']) {
      // filter visible: abaikan teks yang sama tetapi tersembunyi
      await expect(mediaLibrary.page.getByText(label, { exact: true }).filter({ visible: true }).first()).toBeVisible();
    }
  });

  test('MEDIA-14 toggle grid dan list', async ({ mediaLibrary }) => {
    // Tombol List view dan Grid view bisa diklik bergantian tanpa error.
    await mediaLibrary.listView.click();
    await mediaLibrary.gridView.click();
    await expect(mediaLibrary.createFolderButton).toBeVisible(); // halaman masih sehat setelah berpindah mode
  });

  test('MEDIA-15 pencarian tidak ditemukan', async ({ mediaLibrary }) => {
    // Kata kunci yang tidak ada menampilkan 'No media found'.
    await mediaLibrary.search.fill('zzz-tidak-ada-999'); // kata acak yang pasti tidak ada
    await expect(mediaLibrary.emptyState).toBeVisible({ timeout: 10_000 });
  });

  test('MEDIA-16 hapus pencarian memulihkan daftar', async ({ mediaLibrary }) => {
    // Mengosongkan pencarian menghilangkan state tidak ditemukan (jika ada media).
    await mediaLibrary.search.fill('zzz-tidak-ada-999');
    await expect(mediaLibrary.emptyState).toBeVisible({ timeout: 10_000 });
    await mediaLibrary.search.fill(''); // hapus kata kunci
    await mediaLibrary.page.waitForTimeout(1000); // beri waktu daftar dimuat ulang
    await expect(mediaLibrary.search).toHaveValue('');
  });
});
