/**
 * UI COMPARE: Brand Hub (BHUI-01 .. BHUI-21)
 *
 * TUJUAN: membandingkan tampilan Brand Hub di staging (hasil kerja dev) dengan desain Figma/UX.
 * Nilai "benar" dari desain ada di ./design-spec.ts (objek BRAND_HUB), BUKAN ditulis di sini.
 *
 * Beda dengan tests/e2e/brand-hub/brand-hub.spec.ts:
 *   - file lama  = menguji FUNGSI (bisa disimpan, validasi, upload) di staging apa adanya.
 *   - file ini   = menguji KESESUAIAN dengan desain (nama tab, urutan, teks, ukuran, isi dialog).
 *
 * Cara membaca satu test:
 *
 *   test('BHUI-03 tab sesuai Figma', async ({ brandHub }) => {   // <- brandHub = halaman Brand Hub yang sudah login
 *     ...
 *     expect(...)   // <- kalau hasil staging BEDA dari desain, test GAGAL = ada temuan untuk dilaporkan ke dev
 *   });
 *
 * Test bertanda `bug: ...` = selisih desain yang SUDAH terkonfirmasi di staging (test sengaja diharapkan gagal).
 * Kalau dev memperbaikinya, test itu akan lolos dan otomatis ditandai gagal supaya tanda `bug` dilepas.
 *
 * Asersi `expect.soft` tidak menghentikan test saat salah, jadi semua selisih desain
 * dalam satu test muncul sekaligus di laporan (hemat waktu dibanding gagal satu-satu).
 *
 * Aman dijalankan: tidak ada test di file ini yang menyimpan/menghapus data permanen
 * (semua dialog ditutup lagi dengan Batal).
 *
 * Jalankan:  npx playwright test -c playwright.ui.config.ts/brand-hub-ui.spec.ts
 */
import { expect, meta, test } from '../../src/fixtures';
import type { Page } from '@playwright/test';
import { BRAND_HUB, TOKENS, type Label } from './design-spec';
import {
  btn, byText, exactRx, expectPx, expectWeight, isAscending, matchOrder, textRx, textsInOrder,
} from './ui-helpers';

/** Locator satu tab Brand Hub berdasarkan label desain. */
const tabOf = (page: Page, label: Label) => page.getByRole('tab', { name: textRx(label) }).first();

/** Tombol titik-tiga di sebelah judul (ikon saja). Dicari lewat posisinya: tombol pertama setelah h1. */
const kebabOf = (page: Page) => page.getByRole('heading', { level: 1 }).locator('xpath=following::button[1]');

/** Buka tab lalu pastikan benar-benar terpilih. */
async function openTab(page: Page, label: Label): Promise<void> {
  await tabOf(page, label).click();
  await expect(tabOf(page, label)).toHaveAttribute('aria-selected', 'true');
}

test.describe('UI Compare - Brand Hub', () => {
  // ------------------------------------------------------------------ header halaman
  test('BHUI-01 judul halaman', async ({ brandHub }) => {
    // Desain: judul "Brand Hub", font 24px, tebal 500.
    const h1 = brandHub.page.getByRole('heading', { level: 1, name: textRx(BRAND_HUB.title) });
    await expect(h1).toBeVisible();
    await expectPx(h1, 'font-size', TOKENS.h1.fontSize);
    await expectWeight(h1, TOKENS.h1.fontWeight);
  });

  test('BHUI-02 menu opsi dan Reset Brand Kit', meta({
    bug: 'Tombol titik-tiga tanpa nama aksesibel "Opsi Brand Kit"; teks menu "Reset Brand Hub" (Figma: "Reset Brand Kit")',
  }), async ({ brandHub }) => {
    // Desain: tombol titik-tiga (ikon saja) di kanan judul; isinya satu aksi merah "Reset Brand Kit".
    const kebab = kebabOf(brandHub.page);
    await expect(kebab).toBeVisible();
    // Desain memberi nama aksesibel "Opsi Brand Kit" pada tombol ini (penting untuk screen reader).
    await expect.soft(brandHub.page.getByRole('button', { name: textRx(BRAND_HUB.kebabAriaLabel) }), 'Tombol titik-tiga belum punya nama aksesibel "Opsi Brand Kit"').toBeVisible();
    await kebab.click();
    // Aksi reset harus ada (nama apa pun yang memuat "Reset"); tulisan persisnya dibandingkan terpisah di bawah.
    const reset = brandHub.page.getByRole('menuitem', { name: /reset/i });
    await expect(reset).toBeVisible();
    await expect.soft(brandHub.page.getByRole('menuitem', { name: textRx(BRAND_HUB.resetMenu) }),
      'Teks menu berbeda dari Figma ("Reset Brand Kit")').toBeVisible();
  });

  test('BHUI-03 konfirmasi reset (batal)', async ({ brandHub }) => {
    // Desain: klik Reset membuka konfirmasi "Tindakan ini tidak dapat dibatalkan." dengan tombol Batal.
    // Kita HANYA membatalkan, jadi data Brand Kit tidak berubah.
    await kebabOf(brandHub.page).click();
    await brandHub.page.getByRole('menuitem', { name: /reset/i }).click();
    const dialog = brandHub.page.getByRole('alertdialog').or(brandHub.page.getByRole('dialog')).first();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(textRx(BRAND_HUB.resetConfirmText))).toBeVisible();
    await btn(dialog, BRAND_HUB.themeDialog.cancel).first().click(); // "Batal" sama untuk semua dialog
    await expect(dialog).toHaveCount(0);
  });

  // ------------------------------------------------------------------ tab
  test('BHUI-04 tab sesuai Figma', async ({ brandHub }) => {
    // Desain: tab Brand Profile, Visual Identity, Customer Persona, Guardrails, Content Themes (plus Overview).
    for (const label of BRAND_HUB.tabs) {
      await expect.soft(tabOf(brandHub.page, label), `Tab "${label.id}" harus ada`).toBeVisible();
    }
  });

  test('BHUI-05 urutan tab sesuai Figma', async ({ brandHub }) => {
    // Desain: urutan tab dari kiri ke kanan harus sama dengan Figma.
    const actual = await textsInOrder(brandHub.page.getByRole('tab'));
    const positions = matchOrder(actual, BRAND_HUB.tabs);
    expect(isAscending(positions), `Urutan aktual: ${actual.join(' | ')}`).toBe(true);
  });

  test('BHUI-06 tab Social Links sudah dihapus', meta({
    bug: 'Tab Social Links masih tampil di staging (Figma: dihapus sejak 2026-10-23)',
  }), async ({ brandHub }) => {
    // Desain: "Social Links" DIHAPUS dari Brand Hub (keputusan produk 2026-10-23). Tab ini tidak boleh muncul.
    for (const label of BRAND_HUB.removedTabs) {
      await expect(tabOf(brandHub.page, label), `Tab "${label.id}" seharusnya sudah tidak ada`).toHaveCount(0);
    }
  });

  test('BHUI-07 tab Overview aktif saat dibuka', async ({ brandHub }) => {
    // Desain: saat Brand Hub dibuka, tab pertama (Overview) langsung aktif.
    await expect(brandHub.page.getByRole('tab', { name: /overview/i })).toHaveAttribute('aria-selected', 'true');
  });

  test('BHUI-08 tinggi tab 36px', async ({ brandHub }) => {
    // Desain: setiap tab setinggi 36px.
    await expectPx(tabOf(brandHub.page, BRAND_HUB.tabs[0]), 'height', TOKENS.controlHeight);
  });

  test('BHUI-09 lebar kolom konten', async ({ brandHub }) => {
    // Desain: kolom konten selebar 768px dan terpusat (halaman 832px termasuk padding 2 x 32).
    // Diukur dari daftar tab, yang selebar kolom. Dicek di layar desktop lebar supaya kolom tidak mengecil.
    await brandHub.page.setViewportSize({ width: 1600, height: 900 });
    const box = await brandHub.page.getByRole('tablist').first().boundingBox();
    expect(box, 'Daftar tab tidak ditemukan').not.toBeNull();
    expect.soft(Math.abs(box!.width - BRAND_HUB.columnWidth), `lebar kolom ${box!.width}px, desain ${BRAND_HUB.columnWidth}px`)
      .toBeLessThanOrEqual(2);
  });

  // ------------------------------------------------------------------ isi tiap bagian
  // BHUI-10 .. BHUI-14: lima tab dari Figma bisa dibuka dan menampilkan isinya (bukan "being prepared").
  // Guardrails dan Content Themes di staging masih "being prepared": selisih terkonfirmasi, ditandai bug.
  const NOT_READY = ['Guardrails', 'Content Themes'];
  BRAND_HUB.tabs.forEach((label, index) => {
    const details = NOT_READY.includes(label.id)
      ? meta({ bug: `Bagian ${label.id} di staging masih "being prepared" (Figma: sudah ada isinya)` })
      : meta();
    test(`BHUI-${String(10 + index)} bagian ${label.id} bisa dibuka`, details, async ({ brandHub }) => {
      await openTab(brandHub.page, label);
      // Beri waktu isi bagian tampil dulu; kalau tidak, cek "tidak ada teks" bisa lolos terlalu cepat.
      await brandHub.page.waitForTimeout(1500);
      await expect(brandHub.page.getByText(/being prepared|sedang disiapkan/i)).toHaveCount(0);
    });
  });

  test('BHUI-15 daftar industri Brand Profile', meta({
    bug: 'Daftar industri staging (E-Commerce & Retail, Event & Entertainment, Fashion & Pakaian, Finance & Fintech, Jasa & Profesional, Kecantikan & Skincare) berbeda dari Figma',
  }), async ({ brandHub }) => {
    // Desain: dropdown Industri berisi 6 pilihan (Periklanan & Pemasaran ... Jasa Keuangan).
    await openTab(brandHub.page, BRAND_HUB.tabs[0]);
    // Buka dropdown industri: berupa button tepat di bawah label "Industry" (isinya industri yang sedang terpilih).
    const dropdown = brandHub.page.getByRole('main').getByText(/^\s*Industr(y|i)/i).first().locator('xpath=following::button[1]');
    await dropdown.click();
    for (const industry of BRAND_HUB.industries) {
      await expect.soft(byText(brandHub.page, industry), `Industri "${industry.id}" harus ada`).toBeVisible();
    }
  });

  test('BHUI-16 aturan logo di Visual Identity', async ({ brandHub }) => {
    // Desain: logo maksimal 2 MB, format PNG/JPG/SVG/WebP; warna brand maksimal 5.
    await openTab(brandHub.page, BRAND_HUB.tabs[1]);
    await expect.soft(brandHub.page.getByText(new RegExp(`${BRAND_HUB.logo.maxMegabytes}\\s?MB`, 'i')).first()).toBeVisible();
    await expect.soft(brandHub.page.getByText(/PNG,\s*JPG,\s*SVG,?\s*(or|atau)?\s*WebP/i).first()).toBeVisible();
  });

  // ------------------------------------------------------------------ dialog Tambah Tema
  test('BHUI-17 dialog Tambah Tema sesuai Figma', meta({
    bug: 'Content Themes di staging masih "being prepared": tombol dan dialog Tambah Tema belum ada',
  }), async ({ brandHub }) => {
    // Desain: judul "Tambah Tema", Nama Tema* (maks 40), Ringkasan* (maks 200, counter 0/200,
    // helper "Minimal 20 karakter."), tombol Batal dan Simpan.
    const d = BRAND_HUB.themeDialog;
    await openTab(brandHub.page, BRAND_HUB.tabs[4]);
    await btn(brandHub.page, d.titleAdd, false).first().click();
    const dialog = brandHub.page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect.soft(dialog.getByText(textRx(d.titleAdd)).first()).toBeVisible();
    await expect.soft(dialog.getByText(textRx(d.description))).toBeVisible();

    const name = dialog.getByLabel(textRx(d.nameLabel));
    const summary = dialog.getByLabel(textRx(d.summaryLabel));
    await expect.soft(name).toHaveAttribute('maxlength', String(d.nameMax));
    await expect.soft(summary).toHaveAttribute('maxlength', String(d.summaryMax));
    await expect.soft(dialog.getByText(textRx(d.summaryHint))).toBeVisible();
    await expect.soft(dialog.getByText(d.counterEmpty)).toBeVisible();
    await expect.soft(btn(dialog, d.cancel)).toBeVisible();
    await expect.soft(btn(dialog, d.save)).toBeVisible();

    await btn(dialog, d.cancel).click(); // tutup tanpa menyimpan
    await expect(dialog).toHaveCount(0);
  });

  test('BHUI-18 validasi dialog Tambah Tema', meta({
    bug: 'Content Themes di staging masih "being prepared": dialog Tambah Tema belum ada',
  }), async ({ brandHub }) => {
    // Desain: Simpan dengan form kosong -> pesan "harus diisi". Ringkasan < 20 karakter -> pesan "minimal 20".
    // Counter bertambah sesuai ketikan (mis. "5/200").
    const d = BRAND_HUB.themeDialog;
    await openTab(brandHub.page, BRAND_HUB.tabs[4]);
    await btn(brandHub.page, d.titleAdd, false).first().click();
    const dialog = brandHub.page.getByRole('dialog');

    await btn(dialog, d.save).click(); // form kosong
    await expect.soft(dialog.getByText(textRx(d.errorNameRequired))).toBeVisible();
    await expect.soft(dialog.getByText(textRx(d.errorSummaryRequired))).toBeVisible();

    await dialog.getByLabel(textRx(d.nameLabel)).fill('Tips');
    await dialog.getByLabel(textRx(d.summaryLabel)).fill('Pendek'); // 6 karakter
    await expect.soft(dialog.getByText('6/200')).toBeVisible(); // counter ikut bertambah
    await btn(dialog, d.save).click();
    await expect.soft(dialog.getByText(textRx(d.errorSummaryShort))).toBeVisible();

    await btn(dialog, d.cancel).click();
    await expect(dialog).toHaveCount(0);
  });

  // ------------------------------------------------------------------ dialog Persona
  test('BHUI-19 dialog Persona sesuai Figma', meta({
    bug: 'Batas karakter Nama Persona di staging 80 (Figma: 60)',
  }), async ({ brandHub }) => {
    // Desain: judul "Tambah Persona"/"Edit Persona"; 3 kolom wajib (bertanda *) dan 3 kolom opsional.
    const d = BRAND_HUB.personaDialog;
    await openTab(brandHub.page, BRAND_HUB.tabs[2]);
    await btn(brandHub.page, d.titleAdd, false).first().click();
    const dialog = brandHub.page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    for (const label of [...d.required, ...d.optional]) {
      await expect.soft(dialog.getByLabel(textRx(label)), `Kolom "${label.id}" harus ada`).toBeVisible();
    }
    await expect.soft(dialog.getByLabel(textRx(d.required[0]))).toHaveAttribute('maxlength', String(d.nameMax));
    await btn(dialog, d.cancel).last().click(); // ada dua tombol "Cancel" (ikon X di atas dan footer): pakai yang footer
    await expect(dialog).toHaveCount(0);
  });

  test('BHUI-20 validasi dialog Persona', async ({ brandHub }) => {
    // Desain: dengan kolom wajib kosong data tidak boleh tersimpan; dialog tetap terbuka.
    const d = BRAND_HUB.personaDialog;
    await openTab(brandHub.page, BRAND_HUB.tabs[2]);
    await btn(brandHub.page, d.titleAdd, false).first().click();
    const dialog = brandHub.page.getByRole('dialog');
    // Dua perilaku diterima: tombol Simpan nonaktif, ATAU diklik lalu muncul pesan di kolom wajib.
    const save = btn(dialog, d.save);
    if (await save.isEnabled()) {
      await save.click();
      await expect.soft(dialog.getByRole('alert').or(dialog.locator('[aria-invalid="true"]')).first()).toBeVisible();
    }
    await expect(dialog).toBeVisible(); // dialog tetap terbuka = tidak tersimpan
    await btn(dialog, d.cancel).last().click(); // tombol "Cancel" footer (yang pertama adalah ikon X)
  });

  test('BHUI-21 nama tab persis sama dengan Figma', async ({ brandHub }) => {
    // Desain: teks tab tidak boleh ada tambahan kata (mis. "Customer Persona" bukan "Customer Personas").
    const actual = await textsInOrder(brandHub.page.getByRole('tab'));
    for (const label of BRAND_HUB.tabs) {
      const found = actual.some((t) => exactRx(label).test(t));
      expect.soft(found, `Tab "${label.id}" tidak ada yang persis sama. Aktual: ${actual.join(' | ')}`).toBe(true);
    }
  });
});
