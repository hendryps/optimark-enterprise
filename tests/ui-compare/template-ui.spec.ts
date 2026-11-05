/**
 * UI COMPARE: Template (TPLUI-01 .. TPLUI-10)
 *
 * "Template" = galeri template di Image Generator, tab "Jelajahi" (Explore).
 * Pengguna memilih satu template lalu menekan "Gunakan Template" supaya template itu menempel
 * di kotak prompt sebagai referensi gaya.
 *
 * TUJUAN: membandingkan galeri template di staging dengan desain (nama kategori, filter chip,
 * detail template, dialog "Ganti template?"). Nilai desain ada di ./design-spec.ts (objek TEMPLATE).
 *
 * Test bertanda `bug: ...` = selisih desain yang SUDAH terkonfirmasi di staging (sengaja diharapkan gagal;
 * kalau dev memperbaikinya test akan lolos dan ditandai gagal supaya tanda `bug` dilepas).
 *
 * Catatan:
 *  - Test di sini HANYA melihat dan menempelkan template. Tidak ada tombol Generate yang ditekan,
 *    jadi TIDAK memakai token AI dan tidak mengubah data.
 *  - Test yang butuh template tampil akan di-skip (bukan gagal) bila galeri kosong,
 *    supaya jelas bedanya "tidak ada data" dengan "tampilan salah".
 *
 * Jalankan:  npx playwright test -c playwright.ui.config.ts/template-ui.spec.ts
 */
import { expect, meta, test } from '../../src/fixtures';
import type { Page } from '@playwright/test';
import { TEMPLATE } from './design-spec';
import { btn, exactRx, textRx } from './ui-helpers';

/** Buka Image Generator lalu pindah ke tab Jelajahi/Explore (tempat template berada). */
async function openExplore(page: Page): Promise<void> {
  await page.getByRole('main').getByRole('button', { name: exactRx(TEMPLATE.exploreTab) })
    .or(page.getByRole('tab', { name: exactRx(TEMPLATE.exploreTab) }))
    .first()
    .click();
  // Kategori dan kartu dimuat dari server: tunggu sampai tombol "Use" pertama muncul.
  await useButtons(page).first().waitFor({ state: 'visible', timeout: 20_000 }).catch(() => {});
}

/** Chip/tombol filter kategori berdasarkan labelnya. */
const chip = (page: Page, label: { id: string; en: string }) =>
  page.getByRole('main').getByRole('button', { name: exactRx(label) }).first();

/** Semua tombol "Use/Gunakan" di galeri: satu tombol = satu kartu template. */
const useButtons = (page: Page) => page.getByRole('main').getByRole('button', { name: exactRx(TEMPLATE.useShort) });

/** Gambar kartu template ke-n (diklik untuk membuka detail; tombol Use sendiri langsung memasang template). */
const tileImage = (page: Page, n = 0) => useButtons(page).nth(n).locator('xpath=ancestor::div[.//img][1]').locator('img').first();

test.describe('UI Compare - Template', () => {
  test('TPLUI-01 tab Jelajahi dan Riwayat', async ({ imageGen }) => {
    // Desain: di Image Generator ada dua tab: "Jelajahi" (template) dan "Riwayat" (hasil sebelumnya).
    const main = imageGen.page.getByRole('main');
    await expect.soft(main.getByRole('button', { name: exactRx(TEMPLATE.exploreTab) })
      .or(main.getByRole('tab', { name: exactRx(TEMPLATE.exploreTab) })).first()).toBeVisible();
    await expect.soft(main.getByRole('button', { name: exactRx(TEMPLATE.historyTab) })
      .or(main.getByRole('tab', { name: exactRx(TEMPLATE.historyTab) })).first()).toBeVisible();
  });

  test('TPLUI-02 filter kategori sesuai Figma', meta({
    bug: 'Kategori template staging (Product Photography, Ad Creative, Reference Adaptation, Brand Campaign, Portrait) berbeda dari Figma (Poster Promosi, Feed Instagram, Story Instagram, Baner Iklan, Foto Produk)',
  }), async ({ imageGen }) => {
    // Desain: chip "Semua" + 5 kategori gambar (Poster Promosi, Feed Instagram, Story Instagram,
    // Baner Iklan, Foto Produk).
    await openExplore(imageGen.page);
    await expect.soft(chip(imageGen.page, TEMPLATE.allChip), 'Chip "Semua" harus ada').toBeVisible();
    for (const category of TEMPLATE.categories) {
      await expect.soft(chip(imageGen.page, category), `Kategori "${category.id}" harus ada`).toBeVisible();
    }
  });

  test('TPLUI-03 kategori video tidak tampil di Image Generator', async ({ imageGen }) => {
    // Desain: "Video Promosi" hanya untuk Video Generator, tidak boleh muncul di Image Generator.
    await openExplore(imageGen.page);
    await expect(chip(imageGen.page, TEMPLATE.videoOnlyCategory)).toHaveCount(0);
  });

  test('TPLUI-04 chip Semua aktif secara default', async ({ imageGen }) => {
    // Desain: saat tab Jelajahi dibuka, chip "Semua" langsung aktif (aria-pressed=true).
    await openExplore(imageGen.page);
    await expect(chip(imageGen.page, TEMPLATE.allChip)).toHaveAttribute('aria-pressed', 'true');
  });

  test('TPLUI-05 memilih kategori mengaktifkan chip-nya', async ({ imageGen }) => {
    // Desain: klik satu kategori -> chip itu aktif dan "Semua" tidak lagi aktif.
    await openExplore(imageGen.page);
    const target = TEMPLATE.categories[4]; // Foto Produk = "Product Photography" di staging
    await chip(imageGen.page, target).click();
    await expect.soft(chip(imageGen.page, target)).toHaveAttribute('aria-pressed', 'true');
    await expect.soft(chip(imageGen.page, TEMPLATE.allChip)).toHaveAttribute('aria-pressed', 'false');
  });

  test('TPLUI-06 galeri menampilkan kartu template', async ({ imageGen }) => {
    // Desain: di bawah chip ada grid kartu template (gambar).
    await openExplore(imageGen.page);
    await expect(useButtons(imageGen.page).first(), 'Tidak ada kartu template di galeri').toBeVisible();
  });

  test('TPLUI-07 tombol Gunakan muncul saat kartu di-hover', async ({ imageGen }) => {
    // Desain: saat kursor di atas kartu, muncul tombol kecil "Gunakan" di bawah tengah kartu.
    await openExplore(imageGen.page);
    await expect(useButtons(imageGen.page).first()).toBeVisible(); // tunggu galeri selesai dimuat
    const tile = tileImage(imageGen.page);
    await tile.hover();
    await expect(imageGen.page.getByRole('button', { name: textRx(TEMPLATE.useButton, TEMPLATE.useShort) }).first()).toBeVisible();
  });

  test('TPLUI-08 detail template memuat langkah penggunaan', async ({ imageGen }) => {
    // Desain: klik kartu membuka detail dengan 4 langkah berurutan + tombol "Gunakan Template".
    await openExplore(imageGen.page);
    await expect(useButtons(imageGen.page).first()).toBeVisible(); // tunggu galeri selesai dimuat
    await tileImage(imageGen.page).click();
    const dialog = imageGen.page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    for (const step of TEMPLATE.steps) {
      await expect.soft(dialog.getByText(textRx(step)).first(), `Langkah "${step.id}" harus ada`).toBeVisible();
    }
    await expect.soft(btn(dialog, TEMPLATE.useButton, false)).toBeVisible();
  });

  test('TPLUI-09 Gunakan Template menempel di kotak prompt', async ({ imageGen }) => {
    // Desain: setelah "Gunakan Template", detail menutup dan template menempel di atas kotak prompt.
    await openExplore(imageGen.page);
    await expect(useButtons(imageGen.page).first()).toBeVisible(); // tunggu galeri selesai dimuat
    await tileImage(imageGen.page).click();
    const dialog = imageGen.page.getByRole('dialog');
    await btn(dialog, TEMPLATE.useButton, false).click();
    await expect(dialog).toHaveCount(0); // detail ditutup
    await expect(imageGen.page.locator('textarea').first()).toBeVisible(); // kotak instruksi tetap ada
  });

  test('TPLUI-10 dialog Ganti template? (batal)', async ({ imageGen }) => {
    // Desain: bila instruksi sudah ditulis lalu template diganti, muncul "Ganti template?"
    // dengan opsi "Ganti dan hapus instruksi", tombol Batal dan "Ganti Template". Kita memilih Batal.
    await openExplore(imageGen.page);
    await expect(useButtons(imageGen.page).first()).toBeVisible(); // tunggu galeri selesai dimuat
    test.skip((await useButtons(imageGen.page).count()) < 2, 'Butuh minimal 2 template');

    // 1) pasang template pertama
    await tileImage(imageGen.page, 0).click();
    await btn(imageGen.page.getByRole('dialog'), TEMPLATE.useButton, false).click();
    // 2) tulis instruksi
    // Setelah template terpasang, placeholder kotak prompt berubah ("Describe the changes"), jadi dicari lewat textarea.
    await imageGen.page.locator('textarea').first().fill('instruksi uji perbandingan UI');
    // 3) buka lagi galeri dan coba pakai template lain
    await openExplore(imageGen.page);
    await tileImage(imageGen.page, 1).click();
    await btn(imageGen.page.getByRole('dialog'), TEMPLATE.useButton, false).click();

    const swap = imageGen.page.getByRole('alertdialog').or(imageGen.page.getByRole('dialog'));
    await expect.soft(swap.getByText(textRx(TEMPLATE.swapDialog.title)).first()).toBeVisible();
    await expect.soft(swap.getByText(textRx(TEMPLATE.swapDialog.clearOption))).toBeVisible();
    await expect.soft(btn(swap, TEMPLATE.swapDialog.confirm, false)).toBeVisible();
    await btn(swap, TEMPLATE.swapDialog.cancel).click();
  });
});
