/**
 * UI COMPARE RESPONSIVE: Media Library di tablet dan handphone (MLRS-01 .. MLRS-11)
 *
 * TUJUAN: memastikan tampilan Media Library tetap RAPI di layar kecil dan menu-menunya tidak berantakan:
 * tidak ada scroll ke samping, tidak ada tombol terpotong/saling menimpa, teks tidak pecah/terpotong,
 * area sentuh cukup besar, dan dialog muat di layar.
 *
 * Tiap test dijalankan di semua ukuran layar di VIEWPORTS (responsive-helpers.ts):
 * tablet 768, handphone 390, handphone kecil 360, handphone landscape 844x390.
 * Nama test memuat ukuran layarnya, mis. "MLRS-01 [handphone 390] ...".
 *
 * Aset diambil dari akun QA di staging. Test yang butuh media (MLRS-09, MLRS-10) otomatis skip kalau akun kosong.
 * Aman: tidak menyimpan/menghapus data, semua dialog ditutup dengan Batal/Escape.
 *
 * Jalankan:
 *   npm run test:ui -- media-library-responsive.spec.ts
 *   npm run test:ui -- --grep "MLRS-01"
 *   npm run test:ui -- --grep "handphone 390"
 */
import type { Locator, Page } from '@playwright/test';
import { expect, meta, test } from '../../src/fixtures';
import { MEDIA } from './design-spec';
import {
  expectDialogFits, expectTidy, expectTouchTargets, expectWithinScreen, VIEWPORTS, type ViewportCase,
} from './responsive-helpers';
import { btn, exactRx, textRx } from './ui-helpers';

const mainOf = (page: Page): Locator => page.getByRole('main');
const tabOf = (page: Page, i: number): Locator =>
  mainOf(page).getByRole('tab', { name: exactRx(MEDIA.tabs[i]) })
    .or(mainOf(page).getByRole('button', { name: exactRx(MEDIA.tabs[i]) })).first();
const searchOf = (page: Page): Locator => page.getByPlaceholder(textRx(MEDIA.searchPlaceholder));
const filterOf = (page: Page): Locator => page.getByRole('button', { name: textRx(MEDIA.filterAriaLabel) }).first();
const viewOf = (page: Page, i: number): Locator => page.getByRole('button', { name: textRx(MEDIA.views[i]) }).first();
const assetMedia = (page: Page): Locator => mainOf(page).locator('img:visible, video:visible');
const emptyText = (page: Page): Locator =>
  page.getByText(textRx(MEDIA.emptyStates.noMedia, MEDIA.emptyStates.noSearchResult, MEDIA.emptyStates.noFilterResult)).first();

/** Ubah ukuran layar lalu muat ulang supaya tata letak responsif dihitung dari awal. */
async function useViewport(page: Page, vp: ViewportCase): Promise<void> {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.reload();
  await expect(mainOf(page)).toBeVisible();
  await expect(btn(mainOf(page), MEDIA.upload)).toBeVisible({ timeout: 20_000 });
  await expect(assetMedia(page).or(emptyText(page)).first()).toBeVisible({ timeout: 20_000 });
}

/** Kunci: "nomor test|ukuran layar" -> alasan. Kalau dev memperbaiki, test lolos dan ditandai gagal: lepas barisnya. */
const TOUCH_ML = 'Area sentuh < 32px: tautan breadcrumb Dashboard setinggi 20px';
const TOOLBAR_360 = 'Di layar 360px baris tab (Images/Articles) menimpa tombol Filter dan List view';
const FILTER_OFFSCREEN = 'Panel filter terbuka keluar dari sisi kiri layar sehingga opsi Source/Ratio terpotong';
const KNOWN_BUGS: Record<string, string> = {
  'MLRS-11|tablet 768': TOUCH_ML,
  'MLRS-11|handphone 390': TOUCH_ML,
  'MLRS-11|handphone kecil 360': TOUCH_ML,
  'MLRS-11|handphone landscape 844': TOUCH_ML,
  'MLRS-04|handphone 390': FILTER_OFFSCREEN,
  'MLRS-04|handphone kecil 360': FILTER_OFFSCREEN,
  'MLRS-01|handphone kecil 360': TOOLBAR_360,
  'MLRS-03|handphone kecil 360': TOOLBAR_360,
  'MLRS-05|handphone kecil 360': TOOLBAR_360,
  'MLRS-08|handphone kecil 360': TOOLBAR_360,
  'MLRS-07|handphone landscape 844': 'Dialog Upload setinggi 426px melebihi layar 390px (landscape), tidak bisa di-scroll, tombol Cancel di luar layar',
};

for (const vp of VIEWPORTS) {
  test.describe(`UI Responsive - Media Library [${vp.name}]`, () => {
    const id = (n: string, title: string) => `MLRS-${n} [${vp.name}] ${title}`;
    /** Temuan yang SUDAH terkonfirmasi di staging untuk ukuran layar ini (test diharapkan gagal). */
    const known = (n: string) => meta(KNOWN_BUGS[`MLRS-${n}|${vp.name}`] ? { bug: KNOWN_BUGS[`MLRS-${n}|${vp.name}`] } : {});

    test.beforeEach(async ({ mediaLibrary }) => {
      await useViewport(mediaLibrary.page, vp);
    });

    test(id('01', 'halaman rapi'), known('01'), async ({ mediaLibrary }) => {
      // Rapi = tidak scroll ke samping, tidak ada elemen terpotong/menimpa, teks tidak pecah.
      await expectTidy(mediaLibrary.page, `Media Library di ${vp.name}`);
    });

    test(id('02', 'elemen utama terlihat dan di dalam layar'), known('02'), async ({ mediaLibrary }) => {
      // Desain: judul, kolom cari, Buat Folder, Upload, 4 tab, Filter, dan Grid/List tetap tampil (boleh pindah baris).
      const page = mediaLibrary.page;
      const targets: [string, Locator][] = [
        ['kolom cari', searchOf(page)],
        ['Buat Folder', btn(mainOf(page), MEDIA.createFolder)],
        ['Upload', btn(mainOf(page), MEDIA.upload)],
        ...MEDIA.tabs.map((t, i): [string, Locator] => [`tab ${t.id}`, tabOf(page, i)]),
        ['Filter', filterOf(page)],
        ['Grid view', viewOf(page, 0)],
        ['List view', viewOf(page, 1)],
      ];
      for (const [name, locator] of targets) {
        await locator.scrollIntoViewIfNeeded();
        await expect.soft(locator, `${name} harus terlihat`).toBeVisible();
        await expectWithinScreen(page, locator, name);
      }
    });

    test(id('03', 'tab bisa dipindah dan tetap rapi'), known('03'), async ({ mediaLibrary }) => {
      // Klik tiap tab: yang diklik aktif, tata letak tetap rapi (tidak ada yang bergeser/menimpa).
      const page = mediaLibrary.page;
      for (const i of [1, 2, 3, 0]) {
        await tabOf(page, i).scrollIntoViewIfNeeded();
        await tabOf(page, i).click();
        expect.soft(await mediaLibrary.isActive(tabOf(page, i)), `Tab ${MEDIA.tabs[i].id} aktif setelah diklik`).toBe(true);
        await expectTidy(page, `Tab ${MEDIA.tabs[i].id} di ${vp.name}`);
      }
    });

    test(id('04', 'panel filter muat di layar'), known('04'), async ({ mediaLibrary }) => {
      // Desain: menu Source + Ratio terbuka penuh di dalam layar dan opsinya tidak menimpa satu sama lain.
      const page = mediaLibrary.page;
      await filterOf(page).scrollIntoViewIfNeeded();
      await filterOf(page).click();
      for (const o of [...MEDIA.filterGroups.source.options, ...MEDIA.filterGroups.ratio.options]) {
        const item = page.getByText(exactRx(o)).filter({ visible: true }).first();
        await expect.soft(item, `Opsi "${o.id}" harus terlihat`).toBeVisible();
        await expectWithinScreen(page, item, `Opsi filter "${o.id}"`);
      }
      await expectTidy(page, `Panel filter di ${vp.name}`);
      await page.keyboard.press('Escape');
    });

    test(id('05', 'tampilan List rapi'), known('05'), async ({ mediaLibrary }) => {
      // Desain: List view di layar kecil tidak membuat halaman melebar (tabel boleh di-scroll di dalam areanya sendiri).
      const page = mediaLibrary.page;
      await viewOf(page, 1).scrollIntoViewIfNeeded();
      await viewOf(page, 1).click();
      await expectTidy(page, `List view di ${vp.name}`);
    });

    test(id('06', 'dialog Folder Baru muat di layar'), known('06'), async ({ mediaLibrary }) => {
      // Desain: dialog tidak melebihi lebar layar, input dan tombol Batal/Buat Folder terjangkau.
      const page = mediaLibrary.page;
      await btn(mainOf(page), MEDIA.createFolder).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      const d = MEDIA.folderDialog;
      await expectDialogFits(page, dialog, [dialog.getByRole('textbox').first(), btn(dialog, d.cancel), btn(dialog, d.create)]);
      await expectTidy(page, `Dialog Folder Baru di ${vp.name}`, { root: dialog });
      await btn(dialog, d.cancel).click();
    });

    test(id('07', 'dialog Upload muat di layar'), known('07'), async ({ mediaLibrary }) => {
      // Desain: Upload membuka pemilih file (di handphone: sistem) atau dialog; kalau dialog, harus muat di layar.
      const page = mediaLibrary.page;
      const chooser = page.waitForEvent('filechooser', { timeout: 5_000 }).then(() => true).catch(() => false);
      await btn(mainOf(page), MEDIA.upload).click();
      const dialog = page.getByRole('dialog');
      if ((await chooser) || !(await dialog.isVisible().catch(() => false))) return;
      await expectDialogFits(page, dialog, [btn(dialog, MEDIA.folderDialog.cancel)]);
      await expectTidy(page, `Dialog Upload di ${vp.name}`, { root: dialog });
      await btn(dialog, MEDIA.folderDialog.cancel).click();
    });

    test(id('08', 'state kosong dan pencarian tanpa hasil rapi'), known('08'), async ({ mediaLibrary }) => {
      // Desain: pesan kosong tampil di dalam layar, tidak terpotong, dan toolbar tetap utuh.
      const page = mediaLibrary.page;
      await searchOf(page).scrollIntoViewIfNeeded();
      await searchOf(page).fill('zzz-tidak-ada-999');
      await expect(emptyText(page)).toBeVisible({ timeout: 10_000 });
      await expectWithinScreen(page, emptyText(page), 'Pesan kosong');
      await expectTidy(page, `State kosong di ${vp.name}`);
    });

    test(id('09', 'kartu aset muat di layar'), known('09'), async ({ mediaLibrary }) => {
      // Desain: grid menyesuaikan jumlah kolom; thumbnail tidak keluar layar dan tidak saling menimpa.
      const page = mediaLibrary.page;
      test.skip((await assetMedia(page).count()) === 0, 'Akun QA belum punya media di staging');
      const n = Math.min(await assetMedia(page).count(), 12);
      for (let i = 0; i < n; i++) await expectWithinScreen(page, assetMedia(page).nth(i), `Thumbnail ke-${i + 1}`);
      await expectTidy(page, `Grid aset di ${vp.name}`);
    });

    test(id('10', 'detail aset muat di layar'), known('10'), async ({ mediaLibrary }) => {
      // Desain: modal detail di layar kecil menumpuk (media di atas, panel di bawah); tombol Unduh/Hapus/Tutup terjangkau.
      const page = mediaLibrary.page;
      test.skip((await assetMedia(page).count()) === 0, 'Akun QA belum punya media di staging');
      await assetMedia(page).first().click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      const actions = MEDIA.detailActions.map((a) => dialog.getByRole('button', { name: textRx(a) }).first());
      await expectDialogFits(page, dialog, actions);
      await expectTidy(page, `Detail aset di ${vp.name}`, { root: dialog });
      await page.keyboard.press('Escape');
    });

    test(id('11', 'area sentuh cukup besar'), known('11'), async ({ mediaLibrary }) => {
      // Tablet/handphone dipakai dengan jari: tombol, tautan, dan kolom isian minimal 32px agar nyaman diketuk.
      await expectTouchTargets(mediaLibrary.page, `Media Library di ${vp.name}`);
    });
  });
}

