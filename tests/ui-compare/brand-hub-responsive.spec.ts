/**
 * UI COMPARE RESPONSIVE: Brand Hub di tablet dan handphone (BHRS-01 .. BHRS-10)
 *
 * TUJUAN: memastikan tampilan Brand Hub tetap RAPI di layar kecil dan menu-menunya tidak berantakan:
 * tidak ada scroll ke samping, tab tetap terjangkau, tombol tidak terpotong/saling menimpa,
 * teks tidak pecah/terpotong, area sentuh cukup besar, dan dialog muat di layar.
 *
 * Tiap test dijalankan di semua ukuran layar di VIEWPORTS (responsive-helpers.ts):
 * tablet 768, handphone 390, handphone kecil 360, handphone landscape 844x390.
 * Nama test memuat ukuran layarnya, mis. "BHRS-01 [handphone 390] ...".
 *
 * Aman: tidak menyimpan/menghapus data, semua dialog ditutup dengan Batal.
 *
 * Jalankan:
 *   npm run test:ui -- brand-hub-responsive.spec.ts
 *   npm run test:ui -- --grep "BHRS-02"
 *   npm run test:ui -- --grep "handphone 390"
 */
import type { Locator, Page } from '@playwright/test';
import { expect, meta, test } from '../../src/fixtures';
import { BRAND_HUB } from './design-spec';
import {
  expectDialogFits, expectTidy, expectTouchTargets, expectWithinScreen, VIEWPORTS, type ViewportCase,
} from './responsive-helpers';
import { btn, textRx } from './ui-helpers';

const tabOf = (page: Page, label: (typeof BRAND_HUB.tabs)[number]): Locator => page.getByRole('tab', { name: textRx(label) }).first();
const kebabOf = (page: Page): Locator => page.getByRole('heading', { level: 1 }).locator('xpath=following::button[1]');

/** Tab Overview + 5 tab Figma. */
const ALL_TABS = [{ id: 'Overview', en: 'Overview' }, ...BRAND_HUB.tabs];

/** Ubah ukuran layar lalu muat ulang supaya tata letak responsif dihitung dari awal. */
async function useViewport(page: Page, vp: ViewportCase): Promise<void> {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.reload();
  await expect(page.getByRole('tab', { name: /overview/i })).toBeVisible({ timeout: 20_000 });
}

/** Buka tab (di layar sempit daftar tab bisa di-scroll, jadi digulirkan dulu) lalu pastikan terpilih. */
async function openTab(page: Page, label: (typeof ALL_TABS)[number]): Promise<void> {
  const tab = tabOf(page, label);
  await tab.scrollIntoViewIfNeeded();
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
}

/** Kunci: "nomor test|ukuran layar" -> alasan. Kalau dev memperbaiki, test lolos dan ditandai gagal: lepas barisnya. */
const TOUCH_BH = 'Area sentuh < 32px: tautan breadcrumb Dashboard/Brand Hub setinggi 20px, tombol "Clear input" 20x20px, kolom cari font 24px';
const PERSONA_TALL = 'Dialog Persona (±920px) lebih tinggi dari layar dan isinya tidak bisa di-scroll, sehingga tombol Simpan/Batal tak terjangkau';
const KNOWN_BUGS: Record<string, string> = {
  'BHRS-10|tablet 768': TOUCH_BH,
  'BHRS-10|handphone 390': TOUCH_BH,
  'BHRS-10|handphone kecil 360': TOUCH_BH,
  'BHRS-10|handphone landscape 844': TOUCH_BH,
  'BHRS-09|handphone 390': PERSONA_TALL,
  'BHRS-09|handphone kecil 360': PERSONA_TALL,
  'BHRS-09|handphone landscape 844': PERSONA_TALL,
};

for (const vp of VIEWPORTS) {
  test.describe(`UI Responsive - Brand Hub [${vp.name}]`, () => {
    const id = (n: string, title: string) => `BHRS-${n} [${vp.name}] ${title}`;
    /** Temuan yang SUDAH terkonfirmasi di staging untuk ukuran layar ini (test diharapkan gagal). */
    const known = (n: string) => meta(KNOWN_BUGS[`BHRS-${n}|${vp.name}`] ? { bug: KNOWN_BUGS[`BHRS-${n}|${vp.name}`] } : {});

    test.beforeEach(async ({ brandHub }) => {
      await useViewport(brandHub.page, vp);
    });

    test(id('01', 'halaman rapi'), known('01'), async ({ brandHub }) => {
      // Rapi = tidak scroll ke samping, tidak ada elemen terpotong/menimpa, teks tidak pecah.
      await expectTidy(brandHub.page, `Brand Hub di ${vp.name}`);
    });

    test(id('02', 'judul dan menu opsi terlihat'), known('02'), async ({ brandHub }) => {
      // Desain: judul "Brand Hub" dan tombol titik-tiga tampil di dalam layar, judul tidak terpotong.
      const page = brandHub.page;
      const h1 = page.getByRole('heading', { level: 1, name: textRx(BRAND_HUB.title) });
      await expect.soft(h1, 'Judul harus terlihat').toBeVisible();
      await expectWithinScreen(page, h1, 'Judul');
      const kebab = kebabOf(page);
      await expect.soft(kebab, 'Tombol titik-tiga harus terlihat').toBeVisible();
      await expectWithinScreen(page, kebab, 'Tombol titik-tiga');
    });

    test(id('03', 'semua tab terjangkau'), known('03'), async ({ brandHub }) => {
      // Desain: 6 tab (Overview + 5). Di layar sempit boleh di-scroll ke samping DI DALAM daftar tab,
      // tapi tiap tab harus bisa digulirkan ke dalam layar, dan halaman tidak boleh ikut melebar.
      const page = brandHub.page;
      for (const label of ALL_TABS) {
        const tab = tabOf(page, label);
        await expect.soft(tab, `Tab "${label.id}" harus ada`).toBeVisible();
        await tab.scrollIntoViewIfNeeded();
        await expectWithinScreen(page, tab, `Tab "${label.id}"`);
      }
      await expectTidy(page, `Daftar tab di ${vp.name}`);
    });

    test(id('04', 'daftar tab tidak menumpuk'), known('04'), async ({ brandHub }) => {
      // Desain: tab tersusun satu baris (kiri ke kanan), tidak pecah jadi beberapa baris yang menumpuk.
      const page = brandHub.page;
      const ys: string[] = [];
      for (const label of ALL_TABS) {
        const box = await tabOf(page, label).boundingBox();
        ys.push(`${label.id}: ${box ? Math.round(box.y) : 'tidak terlihat'}`);
      }
      const values = ys.map((s) => Number(s.split(': ')[1]));
      expect.soft(Math.max(...values) - Math.min(...values), `Semua tab harus berada di satu baris yang sama. Posisi y: ${ys.join(', ')}`).toBeLessThanOrEqual(8);
    });

    test(id('05', 'tiap tab rapi saat dibuka'), known('05'), async ({ brandHub }) => {
      // Buka tiap tab (Overview, Brand Profile, Visual Identity, Customer Persona, Guardrails, Content Themes)
      // lalu periksa kerapian isinya.
      const page = brandHub.page;
      for (const label of ALL_TABS) {
        await openTab(page, label);
        await page.waitForTimeout(800); // beri waktu isi tab tampil
        await expectTidy(page, `Tab ${label.id} di ${vp.name}`);
      }
    });

    test(id('06', 'menu Reset Brand Kit dan konfirmasi muat'), known('06'), async ({ brandHub }) => {
      // Desain: menu titik-tiga terbuka di dalam layar; konfirmasi reset muat dan tombol Batal terjangkau.
      const page = brandHub.page;
      await kebabOf(page).click();
      const reset = page.getByRole('menuitem', { name: /reset/i });
      await expect(reset).toBeVisible();
      await expectWithinScreen(page, reset, 'Menu Reset');
      await expectTidy(page, `Menu opsi di ${vp.name}`);
      await reset.click();
      const dialog = page.getByRole('alertdialog').or(page.getByRole('dialog')).first();
      await expect(dialog).toBeVisible();
      await expectDialogFits(page, dialog, [btn(dialog, BRAND_HUB.themeDialog.cancel).first()]);
      await expectTidy(page, `Konfirmasi reset di ${vp.name}`, { root: dialog });
      await btn(dialog, BRAND_HUB.themeDialog.cancel).first().click(); // batal: data tidak berubah
    });

    test(id('07', 'form Brand Profile dan dropdown industri muat'), known('07'), async ({ brandHub }) => {
      // Desain: kolom form tidak melebihi layar; dropdown Industri terbuka di dalam layar.
      const page = brandHub.page;
      await openTab(page, BRAND_HUB.tabs[0]);
      const fields = page.getByRole('main').locator('input:visible, textarea:visible, select:visible');
      const n = Math.min(await fields.count(), 12);
      for (let i = 0; i < n; i++) await expectWithinScreen(page, fields.nth(i), `Kolom form ke-${i + 1}`);
      const dropdown = page.getByRole('main').getByText(/^\s*Industr(y|i)/i).first().locator('xpath=following::button[1]');
      await dropdown.scrollIntoViewIfNeeded();
      await dropdown.click();
      const option = page.getByRole('option').or(page.getByRole('menuitem')).filter({ visible: true }).first();
      if (await option.count()) await expectWithinScreen(page, option, 'Opsi dropdown industri');
      await expectTidy(page, `Dropdown industri di ${vp.name}`);
      await page.keyboard.press('Escape');
    });

    test(id('08', 'Visual Identity (logo dan warna) rapi'), known('08'), async ({ brandHub }) => {
      // Desain: area unggah logo, pemilih warna, dan font tersusun ke bawah tanpa melebar.
      const page = brandHub.page;
      await openTab(page, BRAND_HUB.tabs[1]);
      await page.waitForTimeout(800);
      await expectTidy(page, `Visual Identity di ${vp.name}`);
    });

    test(id('09', 'dialog Persona muat di layar'), known('09'), async ({ brandHub }) => {
      // Desain: dialog Tambah Persona (3 kolom wajib + 3 opsional) muat di lebar layar, bisa di-scroll
      // di dalamnya kalau tinggi, dan tombol Batal/Simpan terjangkau.
      const page = brandHub.page;
      const d = BRAND_HUB.personaDialog;
      await openTab(page, BRAND_HUB.tabs[2]);
      const open = btn(page, d.titleAdd, false).first();
      await open.waitFor({ timeout: 8_000 }).catch(() => undefined); // isi tab dimuat belakangan
      test.skip((await open.count()) === 0, 'Tombol Tambah Persona tidak ditemukan');
      await open.click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expectDialogFits(page, dialog, [btn(dialog, d.cancel).last(), btn(dialog, d.save)]);
      await expectTidy(page, `Dialog Persona di ${vp.name}`, { root: dialog });
      await btn(dialog, d.cancel).last().click(); // batal: tidak menyimpan
    });

    test(id('10', 'area sentuh cukup besar'), known('10'), async ({ brandHub }) => {
      // Tablet/handphone dipakai dengan jari: tombol, tautan, dan kolom isian minimal 32px agar nyaman diketuk.
      const page = brandHub.page;
      for (const label of [ALL_TABS[0], BRAND_HUB.tabs[0], BRAND_HUB.tabs[1]]) {
        await openTab(page, label);
        await page.waitForTimeout(800);
        await expectTouchTargets(page, `Tab ${label.id} di ${vp.name}`);
      }
    });
  });
}
