/**
 * UI COMPARE: Media Library (MLUI-01 .. MLUI-18)
 *
 * TUJUAN: membandingkan halaman Media Library di staging dengan desain Figma/UX.
 * Nilai desain ada di ./design-spec.ts (objek MEDIA). Test fungsi (upload, buat folder, filter)
 * sudah ada di tests/e2e/media-library/media-library.spec.ts; file ini fokus pada KESESUAIAN DESAIN.
 *
 * Test bertanda `bug: ...` = selisih desain yang SUDAH terkonfirmasi di staging (sengaja diharapkan gagal;
 * kalau dev memperbaikinya test akan lolos dan ditandai gagal supaya tanda `bug` dilepas).
 *
 * Aman dijalankan: semua dialog ditutup dengan Batal, tidak ada folder/file yang dibuat.
 *
 * Jalankan:  npx playwright test -c playwright.ui.config.ts/media-library-ui.spec.ts
 */
import { expect, meta, test } from '../../src/fixtures';
import { MEDIA, TOKENS } from './design-spec';
import {
  btn, exactRx, expectPx, expectWeight, isAscending, matchOrder, textRx, textsInOrder,
} from './ui-helpers';

test.describe('UI Compare - Media Library', () => {
  // ------------------------------------------------------------------ header
  test('MLUI-01 judul halaman', meta({
    bug: 'Judul 30px tebal 600 dan terpecah dua baris (Figma: 24px tebal 500, satu baris)',
  }), async ({ mediaLibrary }) => {
    // Desain: h1 "Media Library", font 24px, tebal 500.
    const h1 = mediaLibrary.page.getByRole('heading', { level: 1, name: textRx(MEDIA.title) });
    await expect(h1).toBeVisible();
    await expectPx(h1, 'font-size', TOKENS.h1.fontSize);
    await expectWeight(h1, TOKENS.h1.fontWeight);
  });

  test('MLUI-02 kolom pencarian', async ({ mediaLibrary }) => {
    // Desain: kolom cari di kanan judul, placeholder "Cari media".
    await expect(mediaLibrary.page.getByPlaceholder(textRx(MEDIA.searchPlaceholder))).toBeVisible();
  });

  test('MLUI-03 tombol Buat Folder dan Upload', meta({
    bug: 'Tombol Create Folder/Upload setinggi 44px dan teks Create Folder pecah dua baris (Figma: 36px)',
  }), async ({ mediaLibrary }) => {
    // Desain: dua tombol: "Buat Folder" (secondary) dan "Upload" (primary), keduanya setinggi 36px.
    const main = mediaLibrary.page.getByRole('main');
    const create = btn(main, MEDIA.createFolder);
    const upload = btn(main, MEDIA.upload);
    await expect.soft(create).toBeVisible();
    await expect.soft(upload).toBeVisible();
    await expectPx(create, 'height', TOKENS.controlHeight);
    await expectPx(upload, 'height', TOKENS.controlHeight);
  });

  // ------------------------------------------------------------------ tab tipe media
  test('MLUI-04 tab tipe media sesuai Figma', async ({ mediaLibrary }) => {
    // Desain: Semua, Gambar, Video, Artikel (urutan ini). Di staging bisa berupa tab atau button.
    const main = mediaLibrary.page.getByRole('main');
    for (const tab of MEDIA.tabs) {
      await expect.soft(main.getByRole('tab', { name: exactRx(tab) }).or(main.getByRole('button', { name: exactRx(tab) })).first(),
        `Tab "${tab.id}" harus ada`).toBeVisible();
    }
  });

  test('MLUI-05 urutan tab tipe media', async ({ mediaLibrary }) => {
    // Desain: urutan dari kiri ke kanan = Semua, Gambar, Video, Artikel.
    const main = mediaLibrary.page.getByRole('main');
    const items = main.getByRole('tab').or(main.getByRole('button', { name: textRx(...MEDIA.tabs) }));
    const actual = await textsInOrder(items);
    expect(isAscending(matchOrder(actual, MEDIA.tabs)), `Urutan aktual: ${actual.join(' | ')}`).toBe(true);
  });

  test('MLUI-06 tab Semua aktif secara default', async ({ mediaLibrary }) => {
    // Desain: saat halaman dibuka, tab "Semua" yang aktif.
    const all = mediaLibrary.page.getByRole('main').getByRole('tab', { name: exactRx(MEDIA.tabs[0]) })
      .or(mediaLibrary.page.getByRole('main').getByRole('button', { name: exactRx(MEDIA.tabs[0]) })).first();
    expect(await mediaLibrary.isActive(all)).toBe(true);
  });

  test('MLUI-07 memilih tab mengubah tab aktif', async ({ mediaLibrary }) => {
    // Desain: klik "Gambar" -> "Gambar" aktif, "Semua" tidak lagi aktif.
    const main = mediaLibrary.page.getByRole('main');
    const pick = (i: number) => main.getByRole('tab', { name: exactRx(MEDIA.tabs[i]) })
      .or(main.getByRole('button', { name: exactRx(MEDIA.tabs[i]) })).first();
    await pick(1).click();
    expect.soft(await mediaLibrary.isActive(pick(1))).toBe(true);
    expect.soft(await mediaLibrary.isActive(pick(0))).toBe(false);
  });

  // ------------------------------------------------------------------ filter dan tampilan
  test('MLUI-08 panel filter Source dan Ratio', async ({ mediaLibrary }) => {
    // Desain: tombol filter membuka menu: grup Source (Diunggah, Hasil AI) dan Ratio (1:1, 16:9, 9:16, 4:5).
    await mediaLibrary.page.getByRole('button', { name: textRx(MEDIA.filterAriaLabel) }).first().click();
    const page = mediaLibrary.page;
    const visibleText = (text: RegExp) => page.getByText(text).filter({ visible: true }).first();
    await expect.soft(visibleText(textRx(MEDIA.filterGroups.source.title))).toBeVisible();
    await expect.soft(visibleText(textRx(MEDIA.filterGroups.ratio.title))).toBeVisible();
    for (const option of [...MEDIA.filterGroups.source.options, ...MEDIA.filterGroups.ratio.options]) {
      await expect.soft(visibleText(exactRx(option)), `Opsi filter "${option.id}" harus ada`).toBeVisible();
    }
  });

  test('MLUI-09 opsi filter bisa dicentang', meta({
    bug: 'Opsi filter bukan menuitemcheckbox dan tanpa ikon centang (Figma: checkbox dengan aria-checked)',
  }), async ({ mediaLibrary }) => {
    // Desain: tiap opsi filter berupa checkbox (role menuitemcheckbox, ada ikon centang) dan jadi
    // tercentang (aria-checked=true) saat diklik. Opsi tidak boleh sekadar teks biasa.
    await mediaLibrary.page.getByRole('button', { name: textRx(MEDIA.filterAriaLabel) }).first().click();
    const option = mediaLibrary.page.getByRole('menuitemcheckbox', { name: exactRx(MEDIA.filterGroups.ratio.options[0]) });
    await expect(option, 'Opsi filter belum berupa menuitemcheckbox (tidak bisa dibaca screen reader sebagai pilihan)').toBeVisible();
    await expect(option).toHaveAttribute('aria-checked', 'false');
    await option.click();
    await expect.soft(option).toHaveAttribute('aria-checked', 'true');
  });

  test('MLUI-10 pilihan tampilan Grid dan List', async ({ mediaLibrary }) => {
    // Desain: dua tombol ikon "Grid view" dan "List view"; Grid aktif saat pertama dibuka.
    const [grid, list] = MEDIA.views.map((v) => mediaLibrary.page.getByRole('button', { name: textRx(v) }).first());
    await expect.soft(grid).toBeVisible();
    await expect.soft(list).toBeVisible();
    expect.soft(await mediaLibrary.isActive(grid), 'Grid harus aktif di awal').toBe(true);
  });

  test('MLUI-11 kolom tampilan List sesuai Figma', async ({ mediaLibrary }) => {
    // Desain: kolom tabel: Nama, Ditambahkan, Tipe, Ukuran (+ checkbox "Pilih semua aset").
    // Kalau akun belum punya media, tabel kosong -> test dilewati.
    await mediaLibrary.page.getByRole('button', { name: textRx(MEDIA.views[1]) }).first().click();
    const headers = mediaLibrary.page.getByRole('columnheader');
    test.skip((await headers.count()) === 0, 'Tabel List tidak tampil (kemungkinan belum ada media)');
    const actual = await textsInOrder(headers);
    for (const column of MEDIA.listColumns) {
      expect.soft(actual.some((t) => textRx(column).test(t)), `Kolom "${column.id}" harus ada. Aktual: ${actual.join(' | ')}`).toBe(true);
    }
    expect.soft(isAscending(matchOrder(actual, MEDIA.listColumns)), `Urutan kolom aktual: ${actual.join(' | ')}`).toBe(true);
  });

  // ------------------------------------------------------------------ dialog Folder Baru
  test('MLUI-12 dialog Folder Baru sesuai Figma', meta({
    bug: 'Input nama folder tanpa batas 60 karakter (Figma: maxlength 60)',
  }), async ({ mediaLibrary }) => {
    // Desain: judul "Folder Baru", input placeholder "Nama folder" (maks 60), Batal dan "Buat Folder".
    const d = MEDIA.folderDialog;
    await btn(mediaLibrary.page.getByRole('main'), MEDIA.createFolder).click();
    const dialog = mediaLibrary.page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect.soft(dialog.getByText(textRx(d.titleCreate)).first()).toBeVisible();
    const input = dialog.getByPlaceholder(textRx(d.namePlaceholder)).or(dialog.getByRole('textbox')).first();
    await expect.soft(input).toBeVisible();
    await expect.soft(input).toHaveAttribute('maxlength', String(d.maxLength));
    await expect.soft(btn(dialog, d.cancel)).toBeVisible();
    await expect.soft(btn(dialog, d.create)).toBeVisible();
    await btn(dialog, d.cancel).click();
    await expect(dialog).toHaveCount(0);
  });

  test('MLUI-13 tombol Buat Folder nonaktif saat nama kosong', async ({ mediaLibrary }) => {
    // Desain: tombol "Buat Folder" di dalam dialog nonaktif (disabled) selama nama folder kosong,
    // dan aktif setelah nama diisi.
    const d = MEDIA.folderDialog;
    await btn(mediaLibrary.page.getByRole('main'), MEDIA.createFolder).click();
    const dialog = mediaLibrary.page.getByRole('dialog');
    const create = btn(dialog, d.create);
    await expect.soft(create, 'Harus disabled saat nama kosong').toBeDisabled();
    await dialog.getByRole('textbox').first().fill('Folder QA UI');
    await expect.soft(create, 'Harus aktif setelah nama diisi').toBeEnabled();
    await btn(dialog, d.cancel).click(); // tidak membuat folder
    await expect(dialog).toHaveCount(0);
  });

  // ------------------------------------------------------------------ dialog Upload
  test('MLUI-14 dialog Upload dapat ditutup', async ({ mediaLibrary }) => {
    // Desain: klik Upload membuka pemilih file; dialog bisa ditutup tanpa meng-upload apa pun.
    await btn(mediaLibrary.page.getByRole('main'), MEDIA.upload).click();
    const dialog = mediaLibrary.page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await btn(dialog, MEDIA.folderDialog.cancel).click();
    await expect(dialog).toHaveCount(0);
  });

  // ------------------------------------------------------------------ state khusus (butuh data / kondisi tertentu)
  test('MLUI-15 state error dan tombol Coba Lagi', meta({
    bug: 'Saat API media-library gagal, staging menampilkan "No media found" (Figma: "Gagal memuat Media Library" + tombol Coba Lagi)',
  }), async ({ mediaLibrary }) => {
    // Desain: bila data gagal dimuat tampil "Gagal memuat Media Library" + pesan + tombol "Coba Lagi".
    // Kita SIMULASIKAN gagal dengan memblokir request data media lalu memuat ulang halaman.
    const page = mediaLibrary.page;
    // Hanya endpoint daftar media (/api/media-library...) yang diputus; login dan menu tetap normal.
    await page.route('**/api/media-library*', (route) => route.abort());
    await page.reload();
    const e = MEDIA.errorState;
    await expect.soft(page.getByText(textRx(e.title)).first()).toBeVisible({ timeout: 15_000 });
    await expect.soft(page.getByText(textRx(e.message)).first()).toBeVisible();
    await expect.soft(btn(page, e.retry, false).first()).toBeVisible();
  });

  test('MLUI-16 hasil pencarian tidak ditemukan', async ({ mediaLibrary }) => {
    // Desain: kata kunci yang tidak ada menampilkan state kosong (bukan halaman rusak).
    await mediaLibrary.page.getByPlaceholder(textRx(MEDIA.searchPlaceholder)).fill('zzz-tidak-ada-999');
    await expect(mediaLibrary.page.getByText(/no media found|tidak ada media|tidak ditemukan/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('MLUI-17 dialog Pindahkan Media', async ({ mediaLibrary }) => {
    // Desain: dari menu aksi sebuah aset -> "Pindahkan" membuka dialog "Pindahkan Media ke..."
    // berisi opsi "Folder Baru", tombol Batal dan "Pindahkan ke sini".
    // Butuh minimal satu media; kalau akun kosong test dilewati.
    const page = mediaLibrary.page;
    const actions = page.getByRole('button', { name: /more|actions|menu|opsi|lainnya/i }).filter({ visible: true }).first();
    test.skip((await actions.count()) === 0, 'Tidak ada media/menu aksi untuk dicoba');
    await actions.click();
    const move = page.getByRole('menuitem', { name: /move|pindah/i }).first();
    test.skip((await move.count()) === 0, 'Menu Pindahkan tidak ditemukan di menu aksi');
    await move.click();
    const d = MEDIA.moveDialog;
    const dialog = page.getByRole('dialog');
    await expect.soft(dialog.getByText(textRx(d.title)).first()).toBeVisible();
    await expect.soft(dialog.getByText(textRx(d.newFolder)).first()).toBeVisible();
    await expect.soft(btn(dialog, d.confirm, false)).toBeVisible();
    await btn(dialog, d.cancel).click();
  });

  test('MLUI-18 overlay saat file di-drag', meta({
    bug: 'Overlay "Lepaskan File untuk Upload" tidak muncul pada simulasi drag; verifikasi ulang manual dengan drag file sungguhan',
  }), async ({ mediaLibrary }) => {
    // Desain: saat file di-drag ke halaman, muncul overlay "Lepaskan File untuk Upload".
    // Disimulasikan dengan event dragenter pada body (tanpa file asli, tidak ada upload).
    const page = mediaLibrary.page;
    await page.evaluate(() => {
      const data = new DataTransfer();
      data.items.add(new File(['x'], 'drag.png', { type: 'image/png' }));
      // Aplikasi bisa mendengarkan di body, document, atau window: kirim ke ketiganya.
      for (const target of [document.body, document, window] as EventTarget[]) {
        target.dispatchEvent(new DragEvent('dragenter', { bubbles: true, dataTransfer: data }));
        target.dispatchEvent(new DragEvent('dragover', { bubbles: true, dataTransfer: data }));
      }
    });
    await expect(page.getByText(textRx(MEDIA.dropOverlay)).first()).toBeVisible();
  });
});
