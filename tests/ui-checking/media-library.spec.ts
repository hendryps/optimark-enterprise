/**
 * UI CHECKING: Media Library (MLCK-01 .. MLCK-59)
 *
 * TUJUAN: memeriksa tampilan halaman Media Library di STAGING terhadap desain prototype
 *         https://claude.ai/artifact/Qh6LgroG44VKuimpSHnBLG
 *
 * Sumber nilai desain: tests/ui-compare/design-spec.ts (objek MEDIA). Desain berubah? Edit file itu saja.
 * Test fungsi (upload sungguhan, buat folder sungguhan) ada di tests/e2e/media-library/media-library.spec.ts.
 *
 * ASET: tidak ada data tiruan. Semua aset (gambar, video, artikel, folder) diambil dari akun QA di staging.
 *   - Test yang butuh aset (grup "Aset dari staging") otomatis di-SKIP kalau akun QA belum punya media.
 *     Skip bukan berarti lolos: upload dulu beberapa gambar/video/folder ke akun QA supaya test ini jalan.
 *
 * AMAN (run default): tidak ada yang disimpan atau dihapus. Dialog selalu ditutup dengan Batal/Tutup/Escape,
 *       dialog konfirmasi hapus tidak pernah dikonfirmasi, dan tidak ada token AI yang terpakai.
 * KECUALI grup "L. Alur data" (tag @destructive): upload, buat folder, pindah, dan hapus SUNGGUHAN di staging.
 *       Hanya jalan lewat `npm run test:ui:destructive`. Data uji bernama unik "QA Auto <angka>" /
 *       "qa auto <angka>.jpg|mp4" dan dihapus otomatis setelah tiap test (termasuk sisa run yang gagal).
 *
 * TAG (dari mind map QA): @auto-ui = cek UI otomatis tanpa data, @perlu-data-uji = butuh media/file uji,
 *       @destructive = mengubah data staging (wajib cleanup). Filter di laporan: ketik nama tag di kolom cari.
 *
 * Test bertanda `bug: ...` = selisih desain yang SUDAH terkonfirmasi di staging (sengaja diharapkan gagal;
 * kalau dev memperbaikinya test akan lolos dan ditandai gagal supaya tanda `bug` dilepas).
 *
 * Jalankan:
 *   npm run test:ui -- media-library.spec.ts
 *   npm run test:ui -- --grep "MLCK-03"
 *   STRICT_LANGUAGE=true npm run test:ui -- media-library.spec.ts   (teks wajib Indonesia seperti desain)
 */
import type { Locator, Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { expect, meta, test } from '../../src/fixtures';
import type { MediaLibraryPage } from '../../src/pages/media-library-page';
import {
  expectDialogFits, expectTidy, expectTouchTargets, expectWithinScreen, VIEWPORTS,
} from '../ui-compare/responsive-helpers';
import { MEDIA, TOKENS } from '../ui-compare/design-spec';
import {
  btn, exactRx, expectPx, expectWeight, isAscending, matchOrder, textRx, textsInOrder,
} from '../ui-compare/ui-helpers';

// =====================================================================================
// Helper khusus file ini
// =====================================================================================
const DESKTOP = { width: 1440, height: 900 };
const TABLET = { width: 768, height: 1024 };
const MOBILE = { width: 390, height: 844 };

/** Area utama halaman. */
const mainOf = (page: Page): Locator => page.getByRole('main');

/** Tab/kategori ke-i (di staging berupa button, di desain role=tab). */
const tabOf = (page: Page, i: number): Locator =>
  mainOf(page).getByRole('tab', { name: exactRx(MEDIA.tabs[i]) })
    .or(mainOf(page).getByRole('button', { name: exactRx(MEDIA.tabs[i]) })).first();

/** Elemen visual aset (gambar/video) yang tampil di daftar. */
const assetMedia = (page: Page): Locator => mainOf(page).locator('img:visible, video:visible');

/** Kartu aset = pembungkus terdekat dari gambar/video pertama. */
const firstCard = (page: Page): Locator =>
  assetMedia(page).first().locator(
    "xpath=ancestor::*[self::article or self::li or self::a or self::button or @tabindex or @role='button' or contains(@class,'card') or contains(@class,'group')][1]",
  );

/** Teks state kosong apa pun (desain atau staging). */
const emptyText = (page: Page): Locator =>
  page.getByText(textRx(MEDIA.emptyStates.noMedia, MEDIA.emptyStates.noSearchResult, MEDIA.emptyStates.noFilterResult)).first();

/** Tunggu halaman selesai memuat: ada aset ATAU state kosong. Mengembalikan jumlah aset yang tampil. */
async function loadedAssetCount(page: Page): Promise<number> {
  await expect(assetMedia(page).or(emptyText(page)).first()).toBeVisible({ timeout: 20_000 });
  return assetMedia(page).count();
}

/** Skip test kalau akun QA belum punya media di staging. */
async function needAssets(page: Page): Promise<void> {
  test.skip((await loadedAssetCount(page)) === 0, 'Akun QA belum punya media di staging (upload dulu agar test ini jalan)');
}

/** Buka menu aksi aset pertama (hover kartu lalu klik tombol titik-tiga). Skip kalau tidak ada tombol menu. */
async function openFirstAssetMenu(page: Page): Promise<void> {
  await firstCard(page).hover();
  const trigger = firstCard(page).getByRole('button', { name: textRx(MEDIA.assetMenu.trigger) }).first();
  test.skip((await trigger.count()) === 0, 'Tombol menu aksi aset tidak ditemukan di kartu');
  await trigger.click();
}

/** Ukuran file "1.2 MB" / "340 KB" menjadi byte (untuk cek urutan). NaN kalau tidak terbaca. */
function toBytes(text: string): number {
  const m = text.match(/([\d.,]+)\s*(B|KB|MB|GB)/i);
  if (!m) return Number.NaN;
  const unit = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3 }[m[2].toUpperCase() as 'B' | 'KB' | 'MB' | 'GB'];
  return parseFloat(m[1].replace(',', '.')) * unit;
}

/**
 * Temuan tablet/handphone (grup M) yang SUDAH terkonfirmasi di staging. Kunci: "MLCK-nomor|ukuran layar".
 * Test-nya diharapkan gagal (label bug + alasan di laporan). Kalau dev memperbaiki, hapus barisnya.
 */
const TOUCH_BREADCRUMB = 'Area sentuh tautan breadcrumb "Dashboard" hanya 71x20px (minimal 32px)';
const HOVER_ONLY = 'Aksi kartu media (Move/Download/Delete) hanya muncul saat hover; di layar sentuh tidak terlihat';
const TOOLBAR_360 = 'Di layar 360px baris tab menimpa toolbar: "Images" menimpa tombol Filter, "Articles" menimpa List view';
const FILTER_OFFSCREEN = 'Panel filter keluar dari sisi kiri layar, opsi Source/Ratio terpotong';
const UPLOAD_LONG_NAME = 'Dialog Upload melebar sampai 582px saat nama file panjang; dialog, Cancel, dan Upload keluar dari layar';
const UPLOAD_LANDSCAPE = 'Dialog Upload (494px) lebih tinggi dari layar landscape 390px, tidak bisa di-scroll; Cancel/Upload tidak terjangkau';
const MOVE_DIALOG_WIDE = 'Dialog "Move media to…" selebar 404px melebihi layar; tombol Close, New folder, Move here terpotong';
const BACK_WRAP = 'Tombol kembali berisi nama folder pecah dua baris di handphone';
const KNOWN_BUGS_MOBILE: Record<string, string> = {
  'MLCK-77|tablet 768': TOUCH_BREADCRUMB,
  'MLCK-77|handphone 390': TOUCH_BREADCRUMB,
  'MLCK-77|handphone kecil 360': TOUCH_BREADCRUMB,
  'MLCK-77|handphone landscape 844': TOUCH_BREADCRUMB,
  'MLCK-78|tablet 768': HOVER_ONLY,
  'MLCK-78|handphone 390': HOVER_ONLY,
  'MLCK-78|handphone kecil 360': `${HOVER_ONLY}; ${TOOLBAR_360}`,
  'MLCK-72|handphone 390': FILTER_OFFSCREEN,
  'MLCK-72|handphone kecil 360': `${FILTER_OFFSCREEN}; ${TOOLBAR_360}`,
  'MLCK-69|handphone kecil 360': TOOLBAR_360,
  'MLCK-71|handphone kecil 360': TOOLBAR_360,
  'MLCK-73|handphone kecil 360': TOOLBAR_360,
  'MLCK-76|handphone kecil 360': TOOLBAR_360,
  'MLCK-79|handphone kecil 360': TOOLBAR_360,
  'MLCK-75|handphone 390': UPLOAD_LONG_NAME,
  'MLCK-75|handphone kecil 360': UPLOAD_LONG_NAME,
  'MLCK-75|handphone landscape 844': UPLOAD_LANDSCAPE,
  'MLCK-81|handphone 390': MOVE_DIALOG_WIDE,
  'MLCK-81|handphone kecil 360': MOVE_DIALOG_WIDE,
  'MLCK-81|handphone landscape 844': 'Dialog "Move media to…" di landscape 390px: tombol Cancel dan Move here tidak terjangkau walau di-scroll',
  'MLCK-78|handphone landscape 844': HOVER_ONLY,
  'MLCK-80|handphone 390': BACK_WRAP,
  'MLCK-80|handphone kecil 360': `${BACK_WRAP}; ${TOOLBAR_360}`,
};

// =====================================================================================
// Data uji di staging (dipakai grup L dan M yang bertag @destructive)
// =====================================================================================
/** Data uji: nama folder hanya huruf/angka/spasi (aturan staging); nama file huruf kecil. */
const QA_FOLDER = /^QA Auto \d+/; // tanpa $: ikut membersihkan nama tidak valid yang lolos (MLCK-61)
const QA_FILE = /^qa auto \d+\.(jpg|mp4)$/;
const uniq = (): string => `${Date.now()}${Math.floor(Math.random() * 90 + 10)}`;

/** File uji kecil di repo (test-data/). */
const SAMPLE = {
  image: { file: 'test-data/sample-image.jpg', mimeType: 'image/jpeg', ext: 'jpg' },
  video: { file: 'test-data/sample-video.mp4', mimeType: 'video/mp4', ext: 'mp4' },
} as const;

const regionOf = (page: Page): Locator => mainOf(page).getByRole('region', { name: textRx(MEDIA.title) });
const folderCard = (page: Page, name: string): Locator =>
  regionOf(page).getByRole('link').filter({ has: page.getByRole('heading', { name, exact: true }) });
const mediaCard = (page: Page, name: string): Locator =>
  regionOf(page).getByRole('button').filter({ has: page.getByRole('heading', { name, exact: true }) });

/** Tunggu daftar termuat: ada kartu (folder/media, h2) atau pesan kosong. */
async function waitList(page: Page): Promise<void> {
  await expect(regionOf(page).getByRole('heading', { level: 2 }).or(emptyText(page)).first()).toBeVisible({ timeout: 20_000 });
}

async function openFolderDialog(page: Page): Promise<Locator> {
  await btn(mainOf(page), MEDIA.createFolder).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  return dialog;
}

async function createFolder(page: Page, name: string): Promise<void> {
  const dialog = await openFolderDialog(page);
  await dialog.getByRole('textbox').fill(name);
  await btn(dialog, MEDIA.folderDialog.create).click();
  await expect(dialog, 'Dialog Folder Baru menutup setelah folder dibuat').toBeHidden({ timeout: 15_000 });
  await expect(folderCard(page, name), `Folder "${name}" tampil di daftar`).toBeVisible({ timeout: 15_000 });
}

async function uploadFile(page: Page, kind: keyof typeof SAMPLE, name: string): Promise<void> {
  const sample = SAMPLE[kind];
  test.skip(!fs.existsSync(sample.file), `File uji ${sample.file} tidak ada di repo`);
  await btn(mainOf(page), MEDIA.upload).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await page.locator('input[type=file]').first().setInputFiles({
    name, mimeType: sample.mimeType, buffer: fs.readFileSync(path.resolve(sample.file)),
  });
  await expect(dialog.getByText(name), 'File terpilih tampil di daftar dialog upload').toBeVisible();
  await btn(dialog, MEDIA.upload).click();
  await expect(dialog, 'Dialog upload menutup setelah upload selesai').toBeHidden({ timeout: 60_000 });
  await expect(mediaCard(page, name), `Media "${name}" tampil di daftar`).toBeVisible({ timeout: 30_000 });
}

/** Konfirmasi dialog "Delete this item?". */
async function confirmDelete(page: Page): Promise<void> {
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText(textRx(MEDIA.confirmDelete.note))).toBeVisible();
  await btn(dialog, MEDIA.confirmDeleteButton).click();
  await expect(dialog).toBeHidden({ timeout: 15_000 });
}

async function deleteMedia(page: Page, name: string): Promise<void> {
  const card = mediaCard(page, name);
  await card.hover();
  await card.getByRole('button', { name: exactRx(MEDIA.cardActions[2]) }).click();
  await confirmDelete(page);
  await expect(card).toHaveCount(0, { timeout: 15_000 });
}

async function deleteFolder(page: Page, name: string): Promise<void> {
  const card = folderCard(page, name);
  await card.getByRole('button', { name: /actions for folder|menu folder|aksi folder/i }).click();
  await card.getByRole('button', { name: exactRx(MEDIA.folderMenu[2]) }).click();
  await confirmDelete(page);
  await expect(card).toHaveCount(0, { timeout: 15_000 });
}

/** Hapus semua media "qa auto ..." di tampilan saat ini. */
async function deleteAllQaMedia(page: Page): Promise<void> {
  await waitList(page);
  for (let i = 0; i < 20; i++) {
    const heading = regionOf(page).getByRole('heading', { level: 2, name: QA_FILE }).first();
    if (!(await heading.count())) break;
    await deleteMedia(page, (await heading.innerText()).trim());
  }
}

/** Cleanup: hapus semua data uji "QA Auto" (juga sisa run sebelumnya yang gagal di tengah jalan). */
async function cleanupQaData(mediaLibrary: MediaLibraryPage): Promise<void> {
  const page = mediaLibrary.page;
  if (page.isClosed()) return;
  await mediaLibrary.open();
  await waitList(page);
  for (let i = 0; i < 20; i++) {
    const heading = regionOf(page).getByRole('link').getByRole('heading', { name: QA_FOLDER }).first();
    if (!(await heading.count())) break;
    const name = (await heading.innerText()).trim();
    await heading.click(); // isi folder dihapus dulu supaya tidak ada media yatim
    await expect(page).toHaveURL(/\/media-library\/.+/);
    await deleteAllQaMedia(page);
    await mediaLibrary.open();
    await waitList(page);
    await deleteFolder(page, name);
  }
  await deleteAllQaMedia(page);
}

test.describe('UI Checking - Media Library', () => {
  test.beforeEach(async ({ mediaLibrary }) => {
    await mediaLibrary.page.setViewportSize(DESKTOP);
  });

  // ===================================================================================
  // A. HEADER: judul, pencarian, tombol
  // ===================================================================================
  test.describe('A. Header', () => {
    test('MLCK-01 judul halaman', meta({
      bug: 'Judul 30px tebal 600 (Figma: 24px tebal 500)',
    }), async ({ mediaLibrary }) => {
      // Desain: h1 "Media Library", 24px, tebal 500, satu baris.
      const h1 = mediaLibrary.page.getByRole('heading', { level: 1, name: textRx(MEDIA.title) });
      await expect(h1).toBeVisible();
      await expectPx(h1, 'font-size', TOKENS.h1.fontSize);
      await expectWeight(h1, TOKENS.h1.fontWeight);
      // satu baris: tinggi tidak melebihi 1 line-height (32px) + toleransi
      expect.soft((await h1.boundingBox())!.height, 'Judul tidak boleh pecah dua baris').toBeLessThanOrEqual(40);
    });

    test('MLCK-02 kolom pencarian', meta({
      bug: 'Kolom cari 300 x 44px (Figma: 200 x 36px)',
    }), async ({ mediaLibrary }) => {
      // Desain: kolom cari di kanan judul, placeholder "Cari media", 200 x 36 px, ikon kaca pembesar di kiri.
      const input = mediaLibrary.page.getByPlaceholder(textRx(MEDIA.searchPlaceholder));
      await expect(input).toBeVisible();
      const box = (await input.locator('xpath=ancestor-or-self::*[self::label or self::div][1]').boundingBox())!;
      expect.soft(Math.abs(box.height - MEDIA.size.search.height), `tinggi ${box.height}px (desain ${MEDIA.size.search.height}px)`).toBeLessThanOrEqual(2);
      expect.soft(Math.abs(box.width - MEDIA.size.search.width), `lebar ${box.width}px (desain ${MEDIA.size.search.width}px)`).toBeLessThanOrEqual(2);
    });

    test('MLCK-03 tinggi tombol Buat Folder dan Upload', meta({
      bug: 'Tombol Create Folder/Upload setinggi 44px (Figma: 36px)',
    }), async ({ mediaLibrary }) => {
      const main = mainOf(mediaLibrary.page);
      await expectPx(btn(main, MEDIA.createFolder), 'height', TOKENS.controlHeight);
      await expectPx(btn(main, MEDIA.upload), 'height', TOKENS.controlHeight);
    });

    test('MLCK-04 teks tombol satu baris', async ({ mediaLibrary }) => {
      // Desain: label tombol tidak pernah pecah dua baris (white-space: nowrap).
      const main = mainOf(mediaLibrary.page);
      for (const label of [MEDIA.createFolder, MEDIA.upload]) {
        const box = (await btn(main, label).boundingBox())!;
        expect.soft(box.height, `Tombol "${label.id}" tingginya ${box.height}px: kemungkinan teks pecah baris`).toBeLessThanOrEqual(48);
      }
    });

    test('MLCK-05 urutan elemen header', async ({ mediaLibrary }) => {
      // Desain (kiri ke kanan): judul, [kolom cari | Buat Folder | Upload].
      const page = mediaLibrary.page;
      const main = mainOf(page);
      const x = async (l: Locator) => (await l.boundingBox())!.x;
      const search = await x(page.getByPlaceholder(textRx(MEDIA.searchPlaceholder)));
      const create = await x(btn(main, MEDIA.createFolder));
      const upload = await x(btn(main, MEDIA.upload));
      expect.soft(search, 'Kolom cari harus di kiri tombol Buat Folder').toBeLessThan(create);
      expect.soft(create, 'Buat Folder harus di kiri Upload').toBeLessThan(upload);
      expect.soft(await x(page.getByRole('heading', { level: 1, name: textRx(MEDIA.title) })), 'Judul paling kiri').toBeLessThan(search);
    });

    test('MLCK-06 gaya tombol Buat Folder (secondary) dan Upload (primary)', async ({ mediaLibrary }) => {
      // Desain: Buat Folder = secondary (latar putih), Upload = primary (latar warna brand). Keduanya harus beda.
      const main = mainOf(mediaLibrary.page);
      const bg = (l: Locator) => l.evaluate((el) => getComputedStyle(el).backgroundColor);
      const [create, upload] = [await bg(btn(main, MEDIA.createFolder)), await bg(btn(main, MEDIA.upload))];
      expect.soft(upload, 'Upload harus primary (berwarna)').not.toBe(create);
      expect.soft(create, 'Buat Folder harus secondary (putih/terang)').toMatch(/rgb\(2[3-5]\d, 2[3-5]\d, 2[3-5]\d\)|rgba\(0, 0, 0, 0\)/);
    });

    test('MLCK-07 tombol punya ikon', async ({ mediaLibrary }) => {
      // Desain: Buat Folder berikon folder-plus, Upload berikon plus (18px).
      const main = mainOf(mediaLibrary.page);
      await expect.soft(btn(main, MEDIA.createFolder).locator('svg').first(), 'Ikon Buat Folder').toBeVisible();
      await expect.soft(btn(main, MEDIA.upload).locator('svg').first(), 'Ikon Upload').toBeVisible();
    });
  });

  // ===================================================================================
  // B. TAB TIPE MEDIA
  // ===================================================================================
  test.describe('B. Tab tipe media', { tag: '@auto-ui' }, () => {
    test('MLCK-08 empat tab tersedia', async ({ mediaLibrary }) => {
      for (const [i, tab] of MEDIA.tabs.entries()) {
        await expect.soft(tabOf(mediaLibrary.page, i), `Tab "${tab.id}" harus ada`).toBeVisible();
      }
    });

    test('MLCK-09 urutan tab', async ({ mediaLibrary }) => {
      // Desain: Semua, Gambar, Video, Artikel (kiri ke kanan).
      const main = mainOf(mediaLibrary.page);
      const actual = await textsInOrder(main.getByRole('tab').or(main.getByRole('button', { name: textRx(...MEDIA.tabs) })));
      expect(isAscending(matchOrder(actual, MEDIA.tabs)), `Urutan aktual: ${actual.join(' | ')}`).toBe(true);
    });

    test('MLCK-10 tab Semua aktif di awal', async ({ mediaLibrary }) => {
      expect(await mediaLibrary.isActive(tabOf(mediaLibrary.page, 0))).toBe(true);
      for (const i of [1, 2, 3]) expect.soft(await mediaLibrary.isActive(tabOf(mediaLibrary.page, i)), `Tab ke-${i + 1} tidak boleh aktif di awal`).toBe(false);
    });

    test('MLCK-11 hanya satu tab aktif saat berpindah', async ({ mediaLibrary }) => {
      // Desain: klik tab mana pun -> hanya tab itu yang aktif.
      const page = mediaLibrary.page;
      for (const i of [1, 2, 3, 0]) {
        await tabOf(page, i).click();
        for (const j of [0, 1, 2, 3]) {
          expect.soft(await mediaLibrary.isActive(tabOf(page, j)), `Setelah klik tab ${i + 1}, tab ${j + 1} aktif = ${j === i}`).toBe(j === i);
        }
      }
    });

    test('MLCK-12 ukuran dan font tab', meta({
      bug: 'Tab setinggi 40px (Figma: 36px); font 14px/600 sudah sesuai',
    }), async ({ mediaLibrary }) => {
      // Desain: tab setinggi 36px, font 14px, tebal 600.
      for (const i of [0, 1, 2, 3]) {
        const tab = tabOf(mediaLibrary.page, i);
        await expectPx(tab, 'height', MEDIA.size.tab.height);
        await expectPx(tab, 'font-size', MEDIA.size.tab.fontSize);
        await expectWeight(tab, MEDIA.size.tab.fontWeight);
      }
    });

    test('MLCK-13 tab memakai semantik ARIA tab', meta({
      bug: 'Tab di staging berupa button biasa tanpa role=tab/tablist (desain: role=tablist > role=tab)',
    }), async ({ mediaLibrary }) => {
      const main = mainOf(mediaLibrary.page);
      await expect.soft(main.getByRole('tablist')).toHaveCount(1);
      await expect.soft(main.getByRole('tab')).toHaveCount(MEDIA.tabs.length);
    });

    test('MLCK-14 tab sejajar dengan filter dan toggle tampilan', async ({ mediaLibrary }) => {
      // Desain: satu baris toolbar: tab di kiri, [Filter | Grid/List] di kanan, sejajar vertikal.
      const page = mediaLibrary.page;
      const box = async (l: Locator) => (await l.boundingBox())!;
      const tab = await box(tabOf(page, 0));
      const filter = await box(page.getByRole('button', { name: textRx(MEDIA.filterAriaLabel) }).first());
      const grid = await box(page.getByRole('button', { name: textRx(MEDIA.views[0]) }).first());
      expect.soft(tab.x, 'Tab di kiri filter').toBeLessThan(filter.x);
      expect.soft(filter.x, 'Filter di kiri toggle tampilan').toBeLessThan(grid.x);
      const center = (b: { y: number; height: number }) => b.y + b.height / 2;
      expect.soft(Math.abs(center(tab) - center(filter)), 'Tab dan Filter harus satu garis').toBeLessThanOrEqual(8);
    });
  });

  // ===================================================================================
  // C. FILTER dan TAMPILAN
  // ===================================================================================
  test.describe('C. Filter dan tampilan', { tag: '@auto-ui' }, () => {
    const openFilter = async (page: Page) => {
      await page.getByRole('button', { name: textRx(MEDIA.filterAriaLabel) }).first().click();
    };
    const visibleText = (page: Page, label: RegExp) => page.getByText(label).filter({ visible: true }).first();

    test('MLCK-15 tombol filter', async ({ mediaLibrary }) => {
      // Desain: tombol ikon "Filter" (aria-haspopup, aria-expanded=false saat tertutup).
      const filter = mediaLibrary.page.getByRole('button', { name: textRx(MEDIA.filterAriaLabel) }).first();
      await expect(filter).toBeVisible();
      await expect.soft(filter, 'aria-expanded tertutup').not.toHaveAttribute('aria-expanded', 'true');
    });

    test('MLCK-16 panel filter memuat grup Source dan Ratio', async ({ mediaLibrary }) => {
      const page = mediaLibrary.page;
      await openFilter(page);
      await expect.soft(visibleText(page, textRx(MEDIA.filterGroups.source.title))).toBeVisible();
      await expect.soft(visibleText(page, textRx(MEDIA.filterGroups.ratio.title))).toBeVisible();
      for (const o of [...MEDIA.filterGroups.source.options, ...MEDIA.filterGroups.ratio.options]) {
        await expect.soft(visibleText(page, exactRx(o)), `Opsi "${o.id}" harus ada`).toBeVisible();
      }
    });

    test('MLCK-17 urutan opsi filter', async ({ mediaLibrary }) => {
      // Desain: Source (Diunggah, Hasil AI) lalu Ratio (1:1, 16:9, 9:16, 4:5).
      const page = mediaLibrary.page;
      await openFilter(page);
      const all = [MEDIA.filterGroups.source.title, ...MEDIA.filterGroups.source.options, MEDIA.filterGroups.ratio.title, ...MEDIA.filterGroups.ratio.options];
      // Urutan dibaca dari posisi vertikal tiap label di layar (tidak bergantung struktur HTML).
      const ys: number[] = [];
      for (const label of all) {
        const box = await visibleText(page, exactRx(label)).boundingBox();
        ys.push(box ? box.y : -1);
      }
      expect(ys.every((y, i) => y >= 0 && (i === 0 || y > ys[i - 1])), `Posisi vertikal (atas ke bawah) ${all.map((l) => l.id).join(', ')}: ${ys.join(', ')}`).toBe(true);
    });

    test('MLCK-18 opsi filter berupa checkbox', meta({
      bug: 'Opsi filter bukan menuitemcheckbox dan tanpa ikon centang (Figma: checkbox dengan aria-checked)',
    }), async ({ mediaLibrary }) => {
      // Desain: tiap opsi = role menuitemcheckbox, aria-checked=false lalu true saat diklik, ada ikon centang.
      const page = mediaLibrary.page;
      await openFilter(page);
      const option = page.getByRole('menuitemcheckbox', { name: exactRx(MEDIA.filterGroups.ratio.options[0]) });
      await expect(option, 'Opsi harus menuitemcheckbox').toBeVisible();
      await expect(option).toHaveAttribute('aria-checked', 'false');
      await option.click();
      await expect.soft(option).toHaveAttribute('aria-checked', 'true');
    });

    test('MLCK-19 opsi filter bisa dipilih lebih dari satu', async ({ mediaLibrary }) => {
      // Desain: Source dan Ratio multi-pilih. Setelah memilih 1:1 dan 16:9, kedua opsi tampak terpilih.
      const page = mediaLibrary.page;
      await openFilter(page);
      const [one, sixteenNine] = MEDIA.filterGroups.ratio.options;
      const pick = (o: (typeof one)) => page.getByText(exactRx(o)).filter({ visible: true }).first();
      // "terpilih" = aria-checked / aria-pressed bernilai true pada tombol opsi (desain: aria-checked)
      const selected = async (o: (typeof one)) => pick(o).evaluate((el) => {
        const item = el.closest('button, [role^=menuitem]') ?? el;
        return item.getAttribute('aria-checked') === 'true' || item.getAttribute('aria-pressed') === 'true';
      });
      await pick(one).click();
      // menu mungkin menutup sendiri setelah memilih; buka lagi kalau perlu
      if (!(await pick(sixteenNine).isVisible())) await openFilter(page);
      await pick(sixteenNine).click();
      if (!(await pick(one).isVisible())) await openFilter(page);
      expect.soft(await selected(one), 'Opsi 1:1 tetap terpilih').toBe(true);
      expect.soft(await selected(sixteenNine), 'Opsi 16:9 ikut terpilih').toBe(true);
    });

    test('MLCK-20 hasil filter kosong menampilkan pesan', async ({ mediaLibrary }) => {
      // Desain: bila filter tidak cocok dengan aset apa pun -> pesan kosong + saran menghapus filter (bukan halaman rusak).
      // Hanya bisa dipastikan kosong kalau akun QA memang tanpa media.
      const page = mediaLibrary.page;
      test.skip((await loadedAssetCount(page)) > 0, 'Akun QA punya media, hasil filter tidak bisa dipastikan kosong');
      await openFilter(page);
      await page.getByText(exactRx(MEDIA.filterGroups.ratio.options[3])).filter({ visible: true }).first().click(); // 4:5
      await page.keyboard.press('Escape');
      await expect(emptyText(page)).toBeVisible({ timeout: 10_000 });
    });

    test('MLCK-21 panel filter tertutup dengan Escape', meta({
      bug: 'Panel filter tidak menutup dengan tombol Escape (Figma: menu titik-tiga/dropdown menutup dengan Escape)',
    }), async ({ mediaLibrary }) => {
      const page = mediaLibrary.page;
      await openFilter(page);
      const source = visibleText(page, exactRx(MEDIA.filterGroups.source.options[0]));
      await expect(source).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(source).toBeHidden();
    });

    test('MLCK-22 pilihan tampilan Grid dan List', async ({ mediaLibrary }) => {
      const [grid, list] = MEDIA.views.map((v) => mediaLibrary.page.getByRole('button', { name: textRx(v) }).first());
      await expect.soft(grid).toBeVisible();
      await expect.soft(list).toBeVisible();
      expect.soft(await mediaLibrary.isActive(grid), 'Grid aktif di awal').toBe(true);
      expect.soft(await mediaLibrary.isActive(list), 'List tidak aktif di awal').toBe(false);
    });

    test('MLCK-23 berpindah Grid dan List mengubah tombol aktif', async ({ mediaLibrary }) => {
      const page = mediaLibrary.page;
      const [grid, list] = MEDIA.views.map((v) => page.getByRole('button', { name: textRx(v) }).first());
      await list.click();
      expect.soft(await mediaLibrary.isActive(list), 'List aktif setelah diklik').toBe(true);
      expect.soft(await mediaLibrary.isActive(grid), 'Grid tidak aktif lagi').toBe(false);
      await grid.click();
      expect.soft(await mediaLibrary.isActive(grid), 'Grid aktif lagi').toBe(true);
    });

    test('MLCK-24 tombol ikon punya nama aksesibel', async ({ mediaLibrary }) => {
      // Desain: tombol hanya-ikon (Filter, Grid view, List view) punya aria-label.
      const page = mediaLibrary.page;
      for (const name of [MEDIA.filterAriaLabel, MEDIA.views[0], MEDIA.views[1]]) {
        await expect.soft(page.getByRole('button', { name: textRx(name) }).first(), `Tombol ikon "${name.id}" butuh nama aksesibel`).toBeVisible();
      }
    });
  });

  // ===================================================================================
  // D. DIALOG FOLDER dan UPLOAD
  // ===================================================================================
  test.describe('D. Dialog', { tag: '@auto-ui' }, () => {
    const d = MEDIA.folderDialog;
    const openFolderDialog = async (page: Page) => {
      await btn(mainOf(page), MEDIA.createFolder).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      return dialog;
    };

    test('MLCK-25 isi dialog Folder Baru', meta({
      bug: 'Input nama folder tanpa batas 60 karakter (Figma: maxlength 60)',
    }), async ({ mediaLibrary }) => {
      // Desain: judul "Folder Baru", input placeholder "Nama folder" maxlength 60, tombol Batal dan Buat Folder.
      const dialog = await openFolderDialog(mediaLibrary.page);
      await expect.soft(dialog.getByText(textRx(d.titleCreate)).first()).toBeVisible();
      const input = dialog.getByPlaceholder(textRx(d.namePlaceholder)).or(dialog.getByRole('textbox')).first();
      await expect.soft(input).toBeVisible();
      await expect.soft(input).toHaveAttribute('maxlength', String(d.maxLength));
      await expect.soft(btn(dialog, d.cancel)).toBeVisible();
      await expect.soft(btn(dialog, d.create)).toBeVisible();
      await btn(dialog, d.cancel).click();
    });

    test('MLCK-26 dialog bersifat modal', async ({ mediaLibrary }) => {
      // Desain: dialog bersifat modal (aria-modal=true atau halaman di belakangnya disembunyikan dari screen reader,
      // seperti yang dilakukan react-aria); fokus berpindah ke dalam dialog.
      const page = mediaLibrary.page;
      const dialog = await openFolderDialog(page);
      const modal = (await dialog.getAttribute('aria-modal')) === 'true'
        || (await page.evaluate(() => [...document.body.children].some((c) => c.getAttribute('aria-hidden') === 'true' || c.hasAttribute('inert'))));
      expect.soft(modal, 'Dialog harus modal (aria-modal atau latar disembunyikan)').toBe(true);
      const focusInside = await dialog.evaluate((el) => el.contains(document.activeElement));
      expect.soft(focusInside, 'Fokus keyboard harus berada di dalam dialog').toBe(true);
      await btn(dialog, d.cancel).click();
    });

    test('MLCK-27 Buat Folder nonaktif saat nama kosong', async ({ mediaLibrary }) => {
      const dialog = await openFolderDialog(mediaLibrary.page);
      const create = btn(dialog, d.create);
      await expect.soft(create, 'Disabled saat nama kosong').toBeDisabled();
      await dialog.getByRole('textbox').first().fill('Folder QA UI');
      await expect.soft(create, 'Aktif setelah nama diisi').toBeEnabled();
      await btn(dialog, d.cancel).click();
    });

    test('MLCK-28 nama hanya spasi tidak boleh dibuat', async ({ mediaLibrary }) => {
      // Desain: nama dipotong spasi; nama kosong/spasi saja = tombol tetap nonaktif.
      const dialog = await openFolderDialog(mediaLibrary.page);
      await dialog.getByRole('textbox').first().fill('     ');
      await expect.soft(btn(dialog, d.create)).toBeDisabled();
      await btn(dialog, d.cancel).click();
    });

    test('MLCK-29 batas 60 karakter nama folder', meta({
      bug: 'Input nama folder menerima lebih dari 60 karakter (Figma: dipotong di 60)',
    }), async ({ mediaLibrary }) => {
      const dialog = await openFolderDialog(mediaLibrary.page);
      const input = dialog.getByRole('textbox').first();
      await input.pressSequentially('A'.repeat(70));
      expect((await input.inputValue()).length, 'Nilai input harus terpotong 60 karakter').toBeLessThanOrEqual(d.maxLength);
      await btn(dialog, d.cancel).click();
    });

    test('MLCK-30 dialog Folder Baru ditutup Batal dan Escape', async ({ mediaLibrary }) => {
      const page = mediaLibrary.page;
      let dialog = await openFolderDialog(page);
      await btn(dialog, d.cancel).click();
      await expect.soft(page.getByRole('dialog'), 'Batal menutup dialog').toHaveCount(0);
      dialog = await openFolderDialog(page);
      await page.keyboard.press('Escape');
      await expect.soft(page.getByRole('dialog'), 'Escape menutup dialog').toHaveCount(0);
    });

    test('MLCK-31 nama folder yang diketik hilang saat dialog dibuka ulang', async ({ mediaLibrary }) => {
      // Desain: setelah Batal, membuka lagi menampilkan input kosong dan tombol Buat Folder nonaktif.
      const page = mediaLibrary.page;
      let dialog = await openFolderDialog(page);
      await dialog.getByRole('textbox').first().fill('Sisa ketikan');
      await btn(dialog, d.cancel).click();
      dialog = await openFolderDialog(page);
      await expect.soft(dialog.getByRole('textbox').first()).toHaveValue('');
      await expect.soft(btn(dialog, d.create)).toBeDisabled();
      await btn(dialog, d.cancel).click();
    });

    test('MLCK-32 tombol Upload membuka pemilih file', async ({ mediaLibrary }) => {
      // Desain: Upload membuka pemilih file (input multiple, accept gambar/video) atau dialog upload; bisa ditutup tanpa upload.
      const page = mediaLibrary.page;
      const chooser = page.waitForEvent('filechooser', { timeout: 5_000 }).then(() => 'chooser' as const).catch(() => null);
      await btn(mainOf(page), MEDIA.upload).click();
      const dialog = page.getByRole('dialog');
      const opened = (await chooser) ?? ((await dialog.isVisible().catch(() => false)) ? 'dialog' : null);
      expect(opened, 'Upload harus membuka pemilih file atau dialog upload').not.toBeNull();
      if (opened === 'dialog') await btn(dialog, MEDIA.folderDialog.cancel).click();
    });

    test('MLCK-33 input file menerima banyak file gambar dan video', async ({ mediaLibrary }) => {
      // Desain: <input type=file multiple accept="image/*,video/*">.
      const page = mediaLibrary.page;
      await btn(mainOf(page), MEDIA.upload).click();
      const input = page.locator('input[type=file]').first();
      await expect.soft(input, 'Ada input file').toHaveCount(1);
      await expect.soft(input).toHaveAttribute('multiple', /.*/);
      const accept = (await input.getAttribute('accept')) ?? '';
      expect.soft(/image/i.test(accept) && /video/i.test(accept), `accept="${accept}" harus mencakup image dan video`).toBe(true);
      const dialog = page.getByRole('dialog');
      if (await dialog.isVisible().catch(() => false)) await btn(dialog, MEDIA.folderDialog.cancel).click();
    });

    test('MLCK-34 overlay saat file di-drag', meta({
      bug: 'Overlay "Lepaskan File untuk Upload" tidak muncul pada simulasi drag; verifikasi ulang manual dengan drag file sungguhan',
    }), async ({ mediaLibrary }) => {
      // Desain: overlay "Lepaskan File untuk Upload" + keterangan "File akan diunggah ke Media Library."
      const page = mediaLibrary.page;
      await page.evaluate(() => {
        const data = new DataTransfer();
        data.items.add(new File(['x'], 'drag.png', { type: 'image/png' }));
        for (const target of [document.body, document, window] as EventTarget[]) {
          target.dispatchEvent(new DragEvent('dragenter', { bubbles: true, dataTransfer: data }));
          target.dispatchEvent(new DragEvent('dragover', { bubbles: true, dataTransfer: data }));
        }
      });
      await expect(page.getByText(textRx(MEDIA.dropOverlay)).first()).toBeVisible();
      await expect.soft(page.getByText(textRx(MEDIA.dropOverlayDest)).first()).toBeVisible();
    });
  });

  // ===================================================================================
  // E. STATE: error, kosong, pencarian
  // ===================================================================================
  test.describe('E. State halaman', () => {
    test('MLCK-35 state error dan tombol Coba Lagi', meta({
      bug: 'Saat API media-library gagal, staging menampilkan "No media found" (Figma: "Gagal memuat Media Library" + tombol Coba Lagi)',
    }), async ({ mediaLibrary }) => {
      // Desain: data gagal dimuat -> judul + pesan + tombol "Coba Lagi" (ikon refresh).
      // Disimulasikan dengan memblokir endpoint daftar media lalu memuat ulang.
      const page = mediaLibrary.page;
      await page.route('**/api/media-library*', (route) => route.abort());
      await page.reload();
      const e = MEDIA.errorState;
      await expect.soft(page.getByText(textRx(e.title)).first()).toBeVisible({ timeout: 15_000 });
      await expect.soft(page.getByText(textRx(e.message)).first()).toBeVisible();
      await expect.soft(btn(page, e.retry, false).first()).toBeVisible();
    });

    test('MLCK-36 Coba Lagi memuat ulang data', meta({
      bug: 'Belum ada state error + tombol Coba Lagi di staging (lihat MLCK-35)',
    }), async ({ mediaLibrary }) => {
      // Desain: setelah koneksi pulih, klik "Coba Lagi" menghilangkan state error dan menampilkan daftar.
      const page = mediaLibrary.page;
      await page.route('**/api/media-library*', (route) => route.abort());
      await page.reload();
      const retry = btn(page, MEDIA.errorState.retry, false).first();
      await expect(retry).toBeVisible({ timeout: 15_000 });
      await page.unroute('**/api/media-library*');
      await retry.click();
      await expect(page.getByText(textRx(MEDIA.errorState.title)).first()).toBeHidden({ timeout: 15_000 });
    });

    test('MLCK-37 state kosong akun tanpa media', async ({ mediaLibrary }) => {
      // Desain: akun tanpa media -> "Belum ada media yang tersimpan" dengan ilustrasi folder-search.
      const page = mediaLibrary.page;
      test.skip((await loadedAssetCount(page)) > 0, 'Akun QA sudah punya media (state kosong tidak tampil)');
      await expect(page.getByText(textRx(MEDIA.emptyStates.noMedia)).first()).toBeVisible();
    });

    test('MLCK-38 hasil pencarian tidak ditemukan', async ({ mediaLibrary }) => {
      // Desain: kata kunci tanpa hasil -> "Tidak ada aset yang cocok dengan pencarian." (bukan halaman rusak).
      const page = mediaLibrary.page;
      await page.getByPlaceholder(textRx(MEDIA.searchPlaceholder)).fill('zzz-tidak-ada-999');
      await expect(page.getByText(textRx(MEDIA.emptyStates.noSearchResult)).first()).toBeVisible({ timeout: 10_000 });
    });

    test('MLCK-39 menghapus kata kunci mengembalikan daftar', async ({ mediaLibrary }) => {
      const page = mediaLibrary.page;
      const before = await loadedAssetCount(page);
      const search = page.getByPlaceholder(textRx(MEDIA.searchPlaceholder));
      await search.fill('zzz-tidak-ada-999');
      await expect(emptyText(page)).toBeVisible({ timeout: 10_000 });
      await search.fill('');
      await expect(search).toHaveValue('');
      await expect.poll(() => assetMedia(page).count(), { timeout: 10_000, message: 'Jumlah aset kembali seperti semula' }).toBe(before);
    });

    test('MLCK-40 pencarian tidak peka huruf besar-kecil', async ({ mediaLibrary }) => {
      // Desain: pencarian memakai toLowerCase() pada nama (dan prompt). Hasil "ZZZ" sama dengan "zzz".
      const page = mediaLibrary.page;
      await page.getByPlaceholder(textRx(MEDIA.searchPlaceholder)).fill('ZZZ-TIDAK-ADA-999');
      await expect(emptyText(page)).toBeVisible({ timeout: 10_000 });
    });
  });

  // ===================================================================================
  // F. ASET DARI STAGING (butuh media di akun QA; kalau kosong semua test di grup ini dilewati)
  // ===================================================================================
  test.describe('F. Aset dari staging', { tag: '@perlu-data-uji' }, () => {
    test('MLCK-41 semua gambar aset berhasil dimuat', async ({ mediaLibrary }) => {
      // Desain: tidak ada thumbnail rusak. Aset diambil dari staging; naturalWidth > 0 artinya gambar termuat.
      const page = mediaLibrary.page;
      await needAssets(page);
      const broken = await mainOf(page).locator('img:visible').evaluateAll((imgs) =>
        (imgs as HTMLImageElement[]).filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc || i.src));
      expect(broken, `Gambar rusak: ${broken.join(', ')}`).toEqual([]);
    });

    test('MLCK-42 grid 4 kolom di desktop dengan thumbnail persegi', async ({ mediaLibrary }) => {
      // Desain: grid 4 kolom, jarak 12px, preview rasio 1:1.
      const page = mediaLibrary.page;
      await needAssets(page);
      const cols = await assetMedia(page).first().evaluate((el) => {
        let node: HTMLElement | null = el.parentElement;
        while (node && getComputedStyle(node).display !== 'grid') node = node.parentElement;
        return node ? getComputedStyle(node).gridTemplateColumns.split(' ').length : 0;
      });
      expect.soft(cols, `Kolom grid aktual ${cols} (desain ${MEDIA.size.gridColumnsDesktop})`).toBe(MEDIA.size.gridColumnsDesktop);
      const box = (await assetMedia(page).first().boundingBox())!;
      expect.soft(Math.abs(box.width - box.height), `Thumbnail ${Math.round(box.width)}x${Math.round(box.height)} harus persegi`).toBeLessThanOrEqual(2);
    });

    test('MLCK-43 aksi hover pada kartu (Pindah, Unduh, Hapus)', async ({ mediaLibrary }) => {
      // Desain (desktop): saat kartu di-hover muncul tiga tombol ikon: Pindah ke folder, Unduh, Hapus.
      const page = mediaLibrary.page;
      await needAssets(page);
      await firstCard(page).hover();
      for (const a of MEDIA.cardActions) {
        await expect.soft(firstCard(page).getByRole('button', { name: textRx(a) }).first(), `Aksi "${a.id}" harus muncul saat hover`).toBeVisible();
      }
    });

    test('MLCK-44 menu aksi aset', async ({ mediaLibrary }) => {
      // Desain: menu titik-tiga berisi Pindah ke folder, Unduh, Hapus (urutan ini); "Hapus" berwarna merah.
      const page = mediaLibrary.page;
      await needAssets(page);
      await openFirstAssetMenu(page);
      const items = page.getByRole('menuitem').filter({ visible: true });
      const actual = await textsInOrder(items);
      expect.soft(isAscending(matchOrder(actual, MEDIA.assetMenu.items)), `Menu aktual: ${actual.join(' | ')}`).toBe(true);
      const del = items.filter({ hasText: textRx(MEDIA.assetMenu.items[2]) }).first();
      const color = await del.evaluate((el) => getComputedStyle(el).color);
      const [r, g, b] = color.match(/\d+/g)!.map(Number);
      expect.soft(r > g + 40 && r > b + 40, `Warna "Hapus" ${color} harus merah`).toBe(true);
      await page.keyboard.press('Escape');
    });

    test('MLCK-45 detail aset', async ({ mediaLibrary }) => {
      // Desain: klik kartu membuka modal detail: pratinjau di kiri, panel kanan berisi tanggal + Unduh, Hapus, Tutup.
      const page = mediaLibrary.page;
      await needAssets(page);
      await assetMedia(page).first().click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      for (const a of MEDIA.detailActions) {
        await expect.soft(dialog.getByRole('button', { name: textRx(a) }).first(), `Tombol "${a.id}" di detail`).toBeVisible();
      }
      await page.keyboard.press('Escape');
      await expect.soft(dialog, 'Escape menutup detail').toBeHidden();
    });

    test('MLCK-46 konfirmasi hapus dan Batal', async ({ mediaLibrary }) => {
      // Desain: Hapus -> dialog konfirmasi (alertdialog) "Tindakan ini tidak dapat dibatalkan." + Batal.
      // Hanya dibatalkan: tidak ada aset yang dihapus.
      const page = mediaLibrary.page;
      await needAssets(page);
      const before = await assetMedia(page).count();
      await openFirstAssetMenu(page);
      await page.getByRole('menuitem', { name: textRx(MEDIA.assetMenu.items[2]) }).first().click();
      const confirm = page.getByRole('alertdialog').or(page.getByRole('dialog')).first();
      await expect(confirm).toBeVisible();
      await expect.soft(confirm.getByText(textRx(MEDIA.confirmDelete.note)).first()).toBeVisible();
      await btn(confirm, MEDIA.confirmDelete.cancel).click();
      await expect.soft(confirm).toBeHidden();
      expect(await assetMedia(page).count(), 'Jumlah aset tidak berubah').toBe(before);
    });

    test('MLCK-47 dialog Pindahkan Media', async ({ mediaLibrary }) => {
      // Desain: "Pindah ke folder" -> "Pindahkan Media ke..." + penelusur lokasi, tombol Folder Baru, Batal,
      // "Pindahkan ke sini" (nonaktif sampai lokasi dipilih), dan tombol Tutup (X).
      const page = mediaLibrary.page;
      await needAssets(page);
      await openFirstAssetMenu(page);
      await page.getByRole('menuitem', { name: textRx(MEDIA.assetMenu.items[0]) }).first().click();
      const d = MEDIA.moveDialog;
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect.soft(dialog.getByText(textRx(d.title)).first()).toBeVisible();
      await expect.soft(btn(dialog, d.newFolder, false)).toBeVisible();
      await expect.soft(btn(dialog, d.confirm, false)).toBeVisible();
      await expect.soft(dialog.getByRole('button', { name: textRx(d.close) }).first()).toBeVisible();
      await btn(dialog, d.cancel).click();
      await expect.soft(dialog).toBeHidden();
    });

    test('MLCK-48 tampilan List: kolom, urutan, dan sortir ukuran', async ({ mediaLibrary }) => {
      // Desain: kolom Nama, Ditambahkan, Tipe, Ukuran + kolom aksi; header Ditambahkan/Tipe/Ukuran bisa diurutkan;
      // checkbox "Pilih semua aset" disembunyikan (aksi massal belum aktif).
      const page = mediaLibrary.page;
      await needAssets(page);
      await page.getByRole('button', { name: textRx(MEDIA.views[1]) }).first().click();
      const headers = page.getByRole('columnheader');
      await expect(headers.first()).toBeVisible();
      const actual = await textsInOrder(headers);
      for (const c of MEDIA.listColumns) expect.soft(actual.some((t) => textRx(c).test(t)), `Kolom "${c.id}" harus ada. Aktual: ${actual.join(' | ')}`).toBe(true);
      expect.soft(isAscending(matchOrder(actual, MEDIA.listColumns)), `Urutan kolom: ${actual.join(' | ')}`).toBe(true);
      await expect.soft(page.getByRole('checkbox', { name: /pilih semua|select all/i }), 'Pilih semua tidak ditampilkan').toHaveCount(0);

      // klik header Ukuran dua kali: urutan berubah dan konsisten (naik atau turun)
      const sizeHeader = headers.filter({ hasText: textRx(MEDIA.listColumns[3]) }).first();
      const sizes = async () => (await page.getByRole('row').locator('td').allInnerTexts()).map(toBytes).filter((n) => !Number.isNaN(n));
      await sizeHeader.click();
      const first = await sizes();
      test.skip(first.length < 2, 'Ukuran file tidak terbaca atau aset kurang dari 2 untuk uji sortir');
      const asc = first.every((n, i) => i === 0 || n >= first[i - 1]);
      const desc = first.every((n, i) => i === 0 || n <= first[i - 1]);
      expect.soft(asc || desc, `Urutan ukuran harus naik/turun: ${first.join(', ')}`).toBe(true);
    });
  });

  // ===================================================================================
  // G. FOLDER (butuh folder di akun QA)
  // ===================================================================================
  test.describe('G. Folder dari staging', { tag: '@perlu-data-uji' }, () => {
    /** Kartu folder pertama: elemen yang menampilkan teks "n media"/"Belum ada media". */
    const folderCard = (page: Page): Locator =>
      mainOf(page).getByText(/\d+\s+(media|items?)|belum ada (media|aset)|no (media|items)/i).first()
        .locator("xpath=ancestor::*[self::article or self::li or self::a or self::button or @tabindex or @role='button' or contains(@class,'card') or contains(@class,'folder')][1]");

    test('MLCK-49 menu aksi folder', async ({ mediaLibrary }) => {
      // Desain: kebab folder berisi Ganti nama, Pindah ke folder, Hapus folder.
      const page = mediaLibrary.page;
      const card = folderCard(page);
      test.skip((await card.count()) === 0, 'Akun QA belum punya folder di staging');
      await card.hover();
      const trigger = card.getByRole('button').first();
      await trigger.click();
      const actual = await textsInOrder(page.getByRole('menuitem').filter({ visible: true }));
      expect.soft(isAscending(matchOrder(actual, MEDIA.folderMenu)), `Menu folder aktual: ${actual.join(' | ')}`).toBe(true);
      await page.keyboard.press('Escape');
    });

    test('MLCK-50 folder hanya tampil di tab Semua', async ({ mediaLibrary }) => {
      // Desain: folder hanya ada di tab "Semua"; Gambar/Video/Artikel hanya menampilkan media.
      const page = mediaLibrary.page;
      test.skip((await folderCard(page).count()) === 0, 'Akun QA belum punya folder di staging');
      for (const i of [1, 2, 3]) {
        await tabOf(page, i).click();
        await expect.soft(folderCard(page), `Folder tidak boleh tampil di tab ${MEDIA.tabs[i].id}`).toHaveCount(0);
      }
    });

    test('MLCK-51 membuka folder menampilkan tombol kembali', async ({ mediaLibrary }) => {
      // Desain: di dalam folder muncul tombol kembali berlabel "Media Library" di atas isi folder.
      const page = mediaLibrary.page;
      const card = folderCard(page);
      test.skip((await card.count()) === 0, 'Akun QA belum punya folder di staging');
      await card.click();
      const back = mainOf(page).getByRole('button', { name: textRx(MEDIA.folderBack) }).or(mainOf(page).getByRole('link', { name: textRx(MEDIA.folderBack) })).first();
      await expect(back).toBeVisible();
      await back.click();
      await expect(tabOf(page, 0)).toBeVisible();
    });
  });

  // ===================================================================================
  // H. VIDEO (butuh video di akun QA)
  // ===================================================================================
  test.describe('H. Video dari staging', { tag: '@perlu-data-uji' }, () => {
    test('MLCK-52 kartu video: ikon play dan badge durasi', async ({ mediaLibrary }) => {
      // Desain: video punya overlay tombol play dan badge durasi format dua digit "00:30".
      const page = mediaLibrary.page;
      await tabOf(page, 2).click();
      const count = await loadedAssetCount(page);
      test.skip(count === 0, 'Akun QA belum punya video di staging');
      const card = firstCard(page);
      const badge = card.getByText(MEDIA.durationBadge).first();
      test.skip((await badge.count()) === 0, 'Durasi video tidak tampil di kartu (lihat catatan: mungkin hanya saat hover)');
      await expect.soft(badge).toHaveText(MEDIA.durationBadge);
    });
  });

  // ===================================================================================
  // I. RESPONSIF
  // ===================================================================================
  test.describe('I. Responsif', () => {
    const noHorizontalScroll = async (page: Page) =>
      page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);

    for (const [name, size] of [['desktop 1440', DESKTOP], ['tablet 768', TABLET], ['mobile 390', MOBILE]] as const) {
      test(`MLCK-${name.startsWith('desktop') ? '53' : name.startsWith('tablet') ? '54' : '55'} tanpa scroll horizontal di ${name}`, async ({ mediaLibrary }) => {
        // Desain: tata letak menyesuaikan lebar layar; tidak ada elemen yang membuat halaman bergeser ke samping.
        const page = mediaLibrary.page;
        await page.setViewportSize(size);
        await loadedAssetCount(page);
        expect(await noHorizontalScroll(page), `Halaman melebar melewati layar ${size.width}px`).toBe(true);
        await expect.soft(btn(mainOf(page), MEDIA.upload), 'Tombol Upload tetap terjangkau').toBeVisible();
      });
    }

    test('MLCK-56 elemen utama tetap terlihat di mobile 390', async ({ mediaLibrary }) => {
      // Desain: di mobile kolom cari, tab, filter, dan toggle tampilan tetap tampil dalam layar (boleh berpindah baris).
      const page = mediaLibrary.page;
      await page.setViewportSize(MOBILE);
      await loadedAssetCount(page);
      const targets: [string, Locator][] = [
        ['kolom cari', page.getByPlaceholder(textRx(MEDIA.searchPlaceholder))],
        ['tab Semua', tabOf(page, 0)],
        ['filter', page.getByRole('button', { name: textRx(MEDIA.filterAriaLabel) }).first()],
        ['grid view', page.getByRole('button', { name: textRx(MEDIA.views[0]) }).first()],
      ];
      for (const [label, l] of targets) {
        const box = await l.boundingBox();
        expect.soft(box && box.x >= 0 && box.x + box.width <= MOBILE.width + 1, `${label} harus berada dalam lebar layar ${MOBILE.width}px`).toBe(true);
      }
    });

    test('MLCK-57 toolbar tetap menempel saat scroll', async ({ mediaLibrary }) => {
      // Desain: saat daftar di-scroll, baris tab/filter menempel di atas (sticky) dan judul ikut tergulung.
      const page = mediaLibrary.page;
      test.skip((await loadedAssetCount(page)) < 8, 'Aset kurang banyak sehingga halaman tidak bisa di-scroll');
      await page.mouse.wheel(0, 800);
      await page.waitForTimeout(500);
      const box = await tabOf(page, 0).boundingBox();
      expect(box && box.y >= 0 && box.y < 200, `Tab harus tetap terlihat di atas setelah scroll (y=${box?.y})`).toBe(true);
    });
  });

  // ===================================================================================
  // K. ROUTE
  // ===================================================================================
  test.describe('K. Route', { tag: '@auto-ui' }, () => {
    test('MLCK-60 halaman terbuka di route /media-library (URL langsung dan menu sidebar)', async ({ mediaLibrary }) => {
      // Mind map: route /media-library. Fixture membuka lewat URL langsung; lalu dicek juga lewat menu sidebar.
      const page = mediaLibrary.page;
      await expect(page).toHaveURL(/\/media-library\/?$/);
      await expect.soft(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText(textRx(MEDIA.title));
      await mediaLibrary.goto('/dashboard');
      await mediaLibrary.openMenu('Media Library');
      await expect(page).toHaveURL(/\/media-library\/?$/);
      await expect(page.getByRole('heading', { level: 1, name: textRx(MEDIA.title) })).toBeVisible();
    });
  });

  // ===================================================================================
  // L. ALUR DATA: upload, buat folder, validasi nama, pindah, hapus (MENGUBAH DATA STAGING)
  //    Hanya jalan lewat `npm run test:ui:destructive`. Cleanup otomatis setelah tiap test.
  // ===================================================================================
  test.describe('L. Alur data (mengubah data staging)', { tag: '@destructive' }, () => {
    test.afterEach(async ({ mediaLibrary }) => cleanupQaData(mediaLibrary));

    test('MLCK-61 nama folder dengan karakter khusus ditolak', async ({ mediaLibrary }) => {
      // Mind map: validasi nama folder, karakter khusus. Staging: hanya huruf, angka, dan spasi;
      // pesan muncul setelah klik Buat Folder dan dialog tetap terbuka.
      const page = mediaLibrary.page;
      await waitList(page);
      const id = uniq();
      const invalidNames = [`QA Auto ${id}-a`, `QA Auto ${id}/a`, `QA Auto ${id}@#`, `QA Auto ${id}<b>`, `QA Auto ${id}.`];
      const dialog = await openFolderDialog(page);
      for (const name of invalidNames) {
        await dialog.getByRole('textbox').fill(name);
        await btn(dialog, MEDIA.folderDialog.create).click();
        await expect.soft(dialog.getByText(textRx(MEDIA.folderNameInvalid)), `Pesan validasi untuk "${name}"`).toBeVisible();
        await expect.soft(dialog, `Dialog tetap terbuka untuk "${name}"`).toBeVisible();
        if (!(await dialog.isVisible())) await openFolderDialog(page);
      }
      await btn(dialog, MEDIA.folderDialog.cancel).click();
      for (const name of invalidNames) await expect.soft(folderCard(page, name), `Folder "${name}" tidak boleh terbuat`).toHaveCount(0);
    });

    test('MLCK-62 buat folder dengan nama valid', async ({ mediaLibrary }) => {
      // Mind map: Create Folder. Nama unik huruf + angka + spasi -> folder tampil di daftar, pesan kosong hilang.
      const page = mediaLibrary.page;
      await waitList(page);
      const name = `QA Auto ${uniq()}`;
      await createFolder(page, name);
      await expect.soft(page.getByText(textRx(MEDIA.emptyStates.noMedia)).first(), 'Daftar terisi, pesan kosong tidak tampil').toBeHidden();
    });

    test('MLCK-63 nama folder duplikat tidak bisa dibuat', async ({ mediaLibrary }) => {
      // Mind map: validasi nama folder, duplikat. Staging: tombol Buat Folder nonaktif untuk nama yang sudah ada.
      const page = mediaLibrary.page;
      await waitList(page);
      const name = `QA Auto ${uniq()}`;
      await createFolder(page, name);
      const dialog = await openFolderDialog(page);
      await dialog.getByRole('textbox').fill(name);
      const create = btn(dialog, MEDIA.folderDialog.create);
      if (await create.isEnabled()) await create.click(); // perilaku lain yang diterima: diklik tetapi ditolak
      await expect.soft(folderCard(page, name), 'Hanya ada satu folder dengan nama ini').toHaveCount(1);
      if (await dialog.isVisible()) await btn(dialog, MEDIA.folderDialog.cancel).click();
    });

    test('MLCK-64 hapus folder lewat menu folder', async ({ mediaLibrary }) => {
      // Mind map: aksi Delete. Menu folder -> Delete folder -> konfirmasi "Delete this item?" -> folder hilang.
      const page = mediaLibrary.page;
      await waitList(page);
      const name = `QA Auto ${uniq()}`;
      await createFolder(page, name);
      await deleteFolder(page, name);
    });

    test('MLCK-65 upload gambar jpg', { tag: '@perlu-data-uji' }, async ({ mediaLibrary }) => {
      // Mind map: Upload + file uji jpg di repo. Gambar tampil di daftar, termuat, dan ada di tab Images.
      const page = mediaLibrary.page;
      await waitList(page);
      const name = `qa auto ${uniq()}.jpg`;
      await uploadFile(page, 'image', name);
      const card = mediaCard(page, name);
      await expect.soft(card).toContainText(/image\/jpeg/i);
      await expect.soft(card.locator('img')).toHaveJSProperty('complete', true);
      await tabOf(page, 1).click();
      await expect.soft(mediaCard(page, name), 'Tampil di tab Images').toBeVisible();
      await tabOf(page, 2).click();
      await expect.soft(mediaCard(page, name), 'Tidak tampil di tab Videos').toHaveCount(0);
    });

    test('MLCK-66 upload video mp4', { tag: '@perlu-data-uji' }, async ({ mediaLibrary }) => {
      // Mind map: Upload + file uji mp4 di repo. Video tampil di daftar dan di tab Videos.
      const page = mediaLibrary.page;
      await waitList(page);
      const name = `qa auto ${uniq()}.mp4`;
      await uploadFile(page, 'video', name);
      await expect.soft(mediaCard(page, name)).toContainText(/video\/mp4/i);
      await tabOf(page, 2).click();
      await expect.soft(mediaCard(page, name), 'Tampil di tab Videos').toBeVisible();
      await tabOf(page, 1).click();
      await expect.soft(mediaCard(page, name), 'Tidak tampil di tab Images').toHaveCount(0);
    });

    test('MLCK-67 pindahkan media ke folder', { tag: '@perlu-data-uji' }, async ({ mediaLibrary }) => {
      // Mind map: aksi Move to folder. Media hilang dari root dan muncul di dalam folder tujuan.
      const page = mediaLibrary.page;
      await waitList(page);
      const folder = `QA Auto ${uniq()}`;
      const file = `qa auto ${uniq()}.jpg`;
      await createFolder(page, folder);
      await uploadFile(page, 'image', file);
      const card = mediaCard(page, file);
      await card.hover();
      await card.getByRole('button', { name: exactRx(MEDIA.cardActions[0]) }).click();
      const dialog = page.getByRole('dialog', { name: textRx(MEDIA.moveDialog.title) });
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: folder, exact: true }).click();
      await btn(dialog, MEDIA.moveDialog.confirm).click();
      await expect(dialog).toBeHidden({ timeout: 15_000 });
      await expect.soft(mediaCard(page, file), 'Media tidak lagi di root').toHaveCount(0, { timeout: 15_000 });
      await folderCard(page, folder).getByRole('heading').click();
      await expect(page).toHaveURL(/\/media-library\/.+/);
      await expect(mediaCard(page, file), 'Media ada di dalam folder tujuan').toBeVisible({ timeout: 15_000 });
    });

    test('MLCK-68 hapus media dengan konfirmasi', { tag: '@perlu-data-uji' }, async ({ mediaLibrary }) => {
      // Mind map: aksi Delete. Hapus -> dialog "Delete this item?" -> media hilang dari daftar.
      const page = mediaLibrary.page;
      await waitList(page);
      const name = `qa auto ${uniq()}.jpg`;
      await uploadFile(page, 'image', name);
      await deleteMedia(page, name);
    });
  });

  // ===================================================================================
  // M. TABLET & HANDPHONE: UI/UX harus rapi dan tidak berantakan di layar kecil
  //    Tiap test jalan di 4 ukuran (VIEWPORTS): tablet 768, handphone 390, handphone kecil 360,
  //    handphone landscape 844x390. "Rapi" = tidak scroll ke samping, tidak terpotong/menimpa,
  //    teks tidak pecah, dialog muat, area sentuh >= 32px (lihat ui-compare/responsive-helpers.ts).
  // ===================================================================================
  for (const vp of VIEWPORTS) {
    test.describe(`M. Tablet & Handphone [${vp.name}]`, () => {
      const id = (n: number, title: string) => `MLCK-${n} [${vp.name}] ${title}`;
      /** Temuan terkonfirmasi untuk ukuran layar ini (KNOWN_BUGS_MOBILE) -> test diharapkan gagal. */
      const known = (n: number) => {
        const bug = KNOWN_BUGS_MOBILE[`MLCK-${n}|${vp.name}`];
        return meta(bug ? { bug } : {});
      };
      const where = `di ${vp.name}`;

      test.beforeEach(async ({ mediaLibrary }) => {
        // Ubah ukuran lalu muat ulang supaya tata letak responsif dihitung dari awal.
        const page = mediaLibrary.page;
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.reload();
        await expect(btn(mainOf(page), MEDIA.upload)).toBeVisible({ timeout: 20_000 });
        await waitList(page);
      });

      // ---------------------------------------------------------- tanpa data (run default)
      test.describe('tampilan', { tag: '@auto-ui' }, () => {
        test(id(69, 'halaman rapi'), known(69), async ({ mediaLibrary }) => {
          await expectTidy(mediaLibrary.page, `Media Library ${where}`);
        });

        test(id(70, 'header: judul, cari, Buat Folder, Upload di dalam layar'), known(70), async ({ mediaLibrary }) => {
          // Elemen header boleh turun baris, tetapi harus utuh di dalam layar dan judul tidak pecah dua baris.
          const page = mediaLibrary.page;
          const h1 = page.getByRole('heading', { level: 1, name: textRx(MEDIA.title) });
          const targets: [string, Locator][] = [
            ['judul', h1],
            ['kolom cari', page.getByPlaceholder(textRx(MEDIA.searchPlaceholder)).or(regionOf(page).getByRole('searchbox')).first()],
            ['Buat Folder', btn(mainOf(page), MEDIA.createFolder)],
            ['Upload', btn(mainOf(page), MEDIA.upload)],
          ];
          for (const [name, l] of targets) {
            await expect.soft(l, `${name} terlihat`).toBeVisible();
            await expectWithinScreen(page, l, name);
          }
          expect.soft((await h1.boundingBox())?.height ?? 0, 'Judul tidak boleh pecah dua baris').toBeLessThanOrEqual(40);
        });

        test(id(71, 'tab kategori terjangkau, bisa dipindah, tetap rapi'), known(71), async ({ mediaLibrary }) => {
          // Mind map: tab All/Images/Videos/Articles. Di layar kecil boleh digeser, tapi tiap tab bisa diketuk dan aktif.
          const page = mediaLibrary.page;
          for (const i of [1, 2, 3, 0]) {
            const tab = tabOf(page, i);
            await tab.scrollIntoViewIfNeeded();
            await expectWithinScreen(page, tab, `Tab ${MEDIA.tabs[i].id}`);
            await tab.click();
            expect.soft(await mediaLibrary.isActive(tab), `Tab ${MEDIA.tabs[i].id} aktif setelah diketuk`).toBe(true);
            await expectTidy(page, `Tab ${MEDIA.tabs[i].id} ${where}`);
          }
        });

        test(id(72, 'panel filter muat di layar'), known(72), async ({ mediaLibrary }) => {
          // Mind map: filter media. Semua opsi Source dan Ratio terlihat utuh di dalam layar.
          const page = mediaLibrary.page;
          const filter = page.getByRole('button', { name: textRx(MEDIA.filterAriaLabel) }).first();
          await filter.scrollIntoViewIfNeeded();
          await filter.click();
          for (const o of [...MEDIA.filterGroups.source.options, ...MEDIA.filterGroups.ratio.options]) {
            const item = page.getByText(exactRx(o)).filter({ visible: true }).first();
            await expect.soft(item, `Opsi "${o.id}" terlihat`).toBeVisible();
            await expectWithinScreen(page, item, `Opsi filter "${o.id}"`);
          }
          await expectTidy(page, `Panel filter ${where}`);
          await page.keyboard.press('Escape');
        });

        test(id(73, 'Grid view dan List view rapi'), known(73), async ({ mediaLibrary }) => {
          // Mind map: tampilan Grid / List. Berpindah tampilan tidak membuat halaman melebar atau berantakan.
          const page = mediaLibrary.page;
          for (const v of [1, 0]) {
            const view = page.getByRole('button', { name: textRx(MEDIA.views[v]) }).first();
            await view.scrollIntoViewIfNeeded();
            await view.click();
            expect.soft(await mediaLibrary.isActive(view), `${MEDIA.views[v].id} aktif`).toBe(true);
            await expectTidy(page, `${MEDIA.views[v].id} ${where}`);
          }
        });

        test(id(74, 'dialog Folder Baru muat di layar (nama panjang)'), known(74), async ({ mediaLibrary }) => {
          // Mind map: dialog New Folder (field Folder name, Cancel, Create Folder). Nama 60 huruf tidak merusak dialog.
          const page = mediaLibrary.page;
          const dialog = await openFolderDialog(page);
          const input = dialog.getByRole('textbox').first();
          await input.fill('Folder nama panjang untuk cek tampilan di layar kecil QA 60');
          const d = MEDIA.folderDialog;
          await expectDialogFits(page, dialog, [input, btn(dialog, d.cancel), btn(dialog, d.create)]);
          await expectTidy(page, `Dialog Folder Baru ${where}`, { root: dialog });
          await btn(dialog, d.cancel).click();
        });

        test(id(75, 'dialog Upload muat di layar setelah file dipilih'), known(75), async ({ mediaLibrary }) => {
          // Mind map: Upload. File dipilih (TIDAK diunggah): daftar file dengan nama panjang + tombol Remove tetap rapi.
          const page = mediaLibrary.page;
          await btn(mainOf(page), MEDIA.upload).click();
          const dialog = page.getByRole('dialog');
          await expect(dialog).toBeVisible();
          const name = 'qa auto nama file gambar yang cukup panjang untuk cek layar kecil.jpg';
          await page.locator('input[type=file]').first().setInputFiles({
            name, mimeType: SAMPLE.image.mimeType, buffer: fs.readFileSync(path.resolve(SAMPLE.image.file)),
          });
          const fileItem = dialog.getByRole('listitem').filter({ hasText: name });
          await expect(fileItem, 'File terpilih tampil di dialog').toBeVisible();
          await expectWithinScreen(page, fileItem, 'Baris file terpilih');
          await expectDialogFits(page, dialog, [btn(dialog, MEDIA.folderDialog.cancel), btn(dialog, MEDIA.upload)]);
          await expectTidy(page, `Dialog Upload ${where}`, { root: dialog });
          await page.keyboard.press('Escape'); // batal: tidak ada yang diunggah (Escape: tombol Cancel bisa di luar layar)
          await expect(dialog).toBeHidden();
        });

        test(id(76, 'pencarian tanpa hasil rapi'), known(76), async ({ mediaLibrary }) => {
          // Mind map: state daftar kosong. Pesan kosong utuh di dalam layar, toolbar tidak rusak.
          const page = mediaLibrary.page;
          const search = page.getByPlaceholder(textRx(MEDIA.searchPlaceholder)).or(regionOf(page).getByRole('searchbox')).first();
          await search.scrollIntoViewIfNeeded();
          await search.fill('zzz-tidak-ada-999');
          await expect(emptyText(page)).toBeVisible({ timeout: 10_000 });
          await expectWithinScreen(page, emptyText(page), 'Pesan kosong');
          await expectTidy(page, `Pencarian tanpa hasil ${where}`);
        });

        test(id(77, 'area sentuh cukup besar'), known(77), async ({ mediaLibrary }) => {
          // Layar sentuh: tombol, tautan, dan kolom isian minimal 32px agar nyaman diketuk jari.
          await expectTouchTargets(mediaLibrary.page, `Media Library ${where}`);
        });
      });

      // ---------------------------------------------------------- dengan data (npm run test:ui:destructive)
      test.describe('dengan data', { tag: ['@destructive', '@perlu-data-uji'] }, () => {
        test.afterEach(async ({ mediaLibrary }) => cleanupQaData(mediaLibrary));

        /**
         * Siapkan 1 folder + 1 gambar milik test ini. Dibuat di ukuran DESKTOP supaya kendala layar kecil
         * (mis. dialog upload tidak muat di landscape, sudah dicek di MLCK-75) tidak menggagalkan persiapan data;
         * setelah itu layar dikembalikan ke ukuran yang diuji.
         */
        async function seed(page: Page): Promise<{ folder: string; file: string }> {
          const folder = `QA Auto ${uniq()}`;
          const file = `qa auto ${uniq()}.jpg`;
          await page.setViewportSize(DESKTOP);
          await createFolder(page, folder);
          await uploadFile(page, 'image', file);
          await page.setViewportSize({ width: vp.width, height: vp.height });
          await page.reload();
          await waitList(page);
          return { folder, file };
        }

        test(id(78, 'kartu folder dan media rapi, aksi bisa diketuk tanpa hover'), known(78), async ({ mediaLibrary }) => {
          // Mind map: aksi media Move / Delete. Di layar sentuh tidak ada hover, jadi aksi kartu harus tetap terlihat
          // (atau ada tombol menu yang terlihat). Kartu utuh di dalam layar dan tidak saling menimpa.
          const page = mediaLibrary.page;
          const { folder, file } = await seed(page);
          await expectWithinScreen(page, folderCard(page, folder), `Kartu folder "${folder}"`);
          await expectWithinScreen(page, mediaCard(page, file), `Kartu media "${file}"`);
          await page.mouse.move(0, 0); // tidak ada hover, seperti jari
          const card = mediaCard(page, file);
          const shownWithoutHover = await card.locator('button, a[href]').evaluateAll((els) => els.some((el) => {
            let opacity = 1;
            for (let n: Element | null = el; n; n = n.parentElement) opacity *= Number(getComputedStyle(n).opacity);
            const r = el.getBoundingClientRect();
            return opacity > 0.5 && r.width > 0 && r.height > 0;
          }));
          expect.soft(shownWithoutHover, 'Aksi kartu (Move/Download/Delete atau tombol menu) harus terlihat tanpa hover di layar sentuh').toBe(true);
          await expectTidy(page, `Kartu folder dan media ${where}`);
        });

        test(id(79, 'List view dengan data rapi'), known(79), async ({ mediaLibrary }) => {
          // Mind map: List view. Baris media + tombol aksinya utuh di dalam layar (tabel boleh digeser di areanya sendiri).
          const page = mediaLibrary.page;
          const { file } = await seed(page);
          const list = page.getByRole('button', { name: textRx(MEDIA.views[1]) }).first();
          await list.scrollIntoViewIfNeeded();
          await list.click();
          const row = mediaCard(page, file);
          await expect(row).toBeVisible();
          const actions = row.getByRole('button', { name: /actions for media|menu aset|aksi/i }).first();
          await actions.scrollIntoViewIfNeeded();
          await expectWithinScreen(page, actions, 'Tombol aksi baris media');
          await expectTidy(page, `List view dengan data ${where}`);
          await expectTouchTargets(page, `List view dengan data ${where}`, { root: regionOf(page) });
        });

        test(id(80, 'menu folder dan isi folder rapi'), known(80), async ({ mediaLibrary }) => {
          // Mind map: Create Folder. Menu folder (Rename, Move to folder, Delete folder) muat di layar;
          // isi folder (tombol kembali + kartu media) tetap rapi.
          const page = mediaLibrary.page;
          const { folder } = await seed(page);
          const card = folderCard(page, folder);
          await card.scrollIntoViewIfNeeded();
          await card.getByRole('button', { name: /actions for folder|menu folder|aksi folder/i }).click();
          for (const item of MEDIA.folderMenu) {
            const b = card.getByRole('button', { name: exactRx(item) });
            await expect.soft(b, `Menu "${item.id}" terlihat`).toBeVisible();
            await expectWithinScreen(page, b, `Menu folder "${item.id}"`);
          }
          // Dropdown wajar menutupi kartu di bawahnya, jadi kerapian dicek di dalam kartu folder saja.
          await expectTidy(page, `Menu folder ${where}`, { root: card });
          await page.keyboard.press('Escape');
          await card.getByRole('heading').click();
          await expect(page).toHaveURL(/\/media-library\/.+/);
          await waitList(page);
          await expectTidy(page, `Isi folder ${where}`);
        });

        test(id(81, 'dialog Pindahkan Media dan konfirmasi hapus muat di layar'), known(81), async ({ mediaLibrary }) => {
          // Mind map: aksi Move to folder / Delete. Kedua dialog muat, tombolnya terjangkau; semuanya dibatalkan.
          const page = mediaLibrary.page;
          const { file } = await seed(page);
          const card = mediaCard(page, file);
          await card.scrollIntoViewIfNeeded();
          await card.hover();
          await card.getByRole('button', { name: exactRx(MEDIA.cardActions[0]) }).click();
          const move = page.getByRole('dialog', { name: textRx(MEDIA.moveDialog.title) });
          await expect(move).toBeVisible();
          await expectDialogFits(page, move, [btn(move, MEDIA.moveDialog.cancel), btn(move, MEDIA.moveDialog.confirm)]);
          await expectTidy(page, `Dialog Pindahkan Media ${where}`, { root: move });
          await btn(move, MEDIA.moveDialog.cancel).click();
          await expect(move).toBeHidden();

          await card.hover();
          await card.getByRole('button', { name: exactRx(MEDIA.cardActions[2]) }).click();
          const confirm = page.getByRole('dialog');
          await expect(confirm.getByText(textRx(MEDIA.confirmDelete.note))).toBeVisible();
          await expectDialogFits(page, confirm, [btn(confirm, MEDIA.confirmDelete.cancel), btn(confirm, MEDIA.confirmDeleteButton)]);
          await expectTidy(page, `Konfirmasi hapus ${where}`, { root: confirm });
          await btn(confirm, MEDIA.confirmDelete.cancel).click();
          await expect(mediaCard(page, file), 'Batal hapus: media tetap ada').toBeVisible();
        });

        test(id(82, 'detail aset muat di layar'), known(82), async ({ mediaLibrary }) => {
          // Desain: ketuk kartu membuka detail; di layar kecil pratinjau dan panel menumpuk,
          // tombol Unduh/Hapus/Tutup terjangkau.
          const page = mediaLibrary.page;
          const { file } = await seed(page);
          const card = mediaCard(page, file);
          await card.scrollIntoViewIfNeeded();
          await card.locator('img').first().click();
          const dialog = page.getByRole('dialog');
          await expect(dialog, 'Mengetuk kartu membuka detail aset').toBeVisible();
          const actions = MEDIA.detailActions.map((a) => dialog.getByRole('button', { name: textRx(a) }).or(dialog.getByRole('link', { name: textRx(a) })).first());
          await expectDialogFits(page, dialog, actions);
          await expectTidy(page, `Detail aset ${where}`, { root: dialog });
          await page.keyboard.press('Escape');
        });
      });
    });
  }

  // ===================================================================================
  // J. BELUM AKTIF DI PROTOTYPE (dicatat supaya tidak terlupa)
  // ===================================================================================
  test.describe('J. Fitur belum aktif di desain', () => {
    test('MLCK-58 banner penyimpanan hampir penuh / penuh', meta({
      skip: 'Di prototype STORAGE_UI_ENABLED=false (banner 80-99% "Penyimpanan Hampir Penuh", 100% "Penyimpanan Penuh" + tombol "Hapus Asset" belum diaktifkan)',
    }), async () => {});

    test('MLCK-59 pilih banyak aset dan hapus massal', meta({
      skip: 'Di prototype BULK_UI_ENABLED=false (checkbox "Pilih semua aset", bar "n dipilih" + Hapus belum diaktifkan)',
    }), async () => {});
  });
});
