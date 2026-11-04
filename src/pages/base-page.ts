/**
 * BasePage: aksi umum yang diwariskan SEMUA page object
 * (navigasi, tombol, angka, saldo token, asersi) beserta helper pencarian teks.
 *
 * Aturan locator di proyek ini: pakai role / label / teks yang dilihat pengguna, bukan selector CSS.
 */
import { expect, type Locator, type Page } from '@playwright/test';
import { env } from '../config/env';
import { escapeRegex, firstInt, rx, rxExact } from '../utils/text';

export class BasePage {
  /** `page` = satu tab browser milik Playwright. */
  constructor(readonly page: Page) {}

  // ---------------------------------------------------------------- navigasi
  /** Buka alamat = baseUrl + path, mis. goto('/dashboard'). */
  async goto(path = '/'): Promise<void> {
    await this.page.goto(`${env.baseUrl}${path}`);
  }

  /** Klik menu sidebar berdasarkan nama (bisa berupa link atau button). */
  async openMenu(name: string): Promise<void> {
    const nav = this.page.getByRole('navigation');
    await nav
      .getByRole('link', { name: rxExact(name) })
      .or(nav.getByRole('button', { name: rxExact(name) }))
      .first()
      .click();
  }

  // ---------------------------------------------------------------- elemen umum
  /** Cari tombol berdasarkan nama. Boleh beberapa nama (Inggris/Indonesia). */
  button(...names: string[]): Locator {
    return this.page.getByRole('button', { name: rx(...names) });
  }

  /** Seperti `button`, tetapi namanya harus sama persis. */
  buttonExact(...names: string[]): Locator {
    return this.page.getByRole('button', { name: rxExact(...names) });
  }

  /** Cari elemen berdasarkan teks yang tampil. */
  text(...names: string[]): Locator {
    return this.page.getByText(rx(...names));
  }

  /** Upload lewat input file pertama. `file` = path file atau objek { name, mimeType, buffer }. */
  async upload(file: string | { name: string; mimeType: string; buffer: Buffer }): Promise<void> {
    await this.page.locator('input[type=file]').first().setInputFiles(file);
  }

  /**
   * Apakah tombol/tab ini "aktif"? Dicek dari atribut ARIA umum, class active/selected,
   * atau class warna brand (staging menandai filter aktif dengan `bg-brand-600 text-white`).
   */
  async isActive(locator: Locator): Promise<boolean> {
    return locator.evaluate((el) => {
      return (
        el.getAttribute('aria-pressed') === 'true' ||
        el.getAttribute('aria-selected') === 'true' ||
        el.getAttribute('data-state') === 'active' ||
        /(^|\s)(active|selected|bg-brand-\d+|bg-primary-muted)(\s|$)/.test(el.className)
      );
    });
  }

  /** Teks semua opsi pada sebuah <select> (opsi kosong dibuang). */
  static async optionTexts(select: Locator): Promise<string[]> {
    const texts = await select.locator('option').allInnerTexts();
    return texts.map((t) => t.trim()).filter(Boolean);
  }

  // ---------------------------------------------------------------- angka
  /** Angka pada kartu berlabel `labels`: paragraf (<p>) pertama setelah label. Menunggu sampai berisi angka. */
  async numberNear(...labels: string[]): Promise<number> {
    const label = this.page.getByText(rxExact(...labels)).first();
    const value = label.locator('xpath=following::p[1]');
    await expect(value).toHaveText(/\d/);
    return firstInt(await value.innerText());
  }

  // ---------------------------------------------------------------- token (panel di sidebar)
  /** Teks mentah panel token di sidebar. */
  private async tokenPanel(): Promise<string> {
    return this.page.getByRole('button', { name: rx('Remaining balance', 'Saldo') }).first().innerText();
  }

  /** Saldo token: 'Remaining balance' / 'Saldo tersisa'. */
  async tokenBalance(): Promise<number> {
    const match = (await this.tokenPanel()).match(/(?:Remaining balance|Saldo[^\n]*)\s*([\d.,]+)/i);
    if (!match) throw new Error('Saldo token tidak terbaca di panel token');
    return firstInt(match[1]);
  }

  /** Token terpakai: 'Used' / 'Terpakai'. */
  async tokenUsed(): Promise<number> {
    const match = (await this.tokenPanel()).match(/(?:Used|Terpakai[^\n]*)\s*([\d.,]+)/i);
    if (!match) throw new Error('Token terpakai tidak terbaca di panel token');
    return firstInt(match[1]);
  }

  // ---------------------------------------------------------------- asersi
  /** Pastikan URL saat ini mengandung potongan teks tertentu. */
  async expectUrlContains(fragment: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(escapeRegex(fragment)));
  }

  /** Pastikan teks (salah satu bahasa) tampil. Elemen tersembunyi, mis. <option> native, diabaikan. */
  async expectText(...names: string[]): Promise<void> {
    await expect(this.page.getByText(rx(...names)).filter({ visible: true }).first()).toBeVisible();
  }
}
