/** Kelas dasar untuk Image Generator dan Video Generator (keduanya hampir sama: prompt, konfigurasi, tombol Generate). */
import { expect, type Locator } from '@playwright/test';
import { firstInt, rx, rxExact } from '../utils/text';
import { BasePage } from './base-page';

/**
 * Dasar Image Generator dan Video Generator.
 *
 * Di staging, 'Explore' dan 'History' berupa button (bukan tab), dan semua konfigurasi
 * berupa button ber-aria-label (Model, Aspect ratio, ...) yang membuka pilihan.
 * Subclass mengisi PATH, PROMPT_HINT, dan GENERATE_NAME.
 */
export abstract class GeneratorPage extends BasePage {
  protected abstract readonly PATH: string;
  /** Potongan placeholder kolom prompt. */
  protected abstract readonly PROMPT_HINT: string;
  /** Nama tombol Generate. */
  protected abstract readonly GENERATE_NAME: string;

  /** Buka halaman generator dan tunggu kolom prompt tampil. */
  async open(): Promise<this> {
    await this.goto(this.PATH);
    await expect(this.prompt).toBeVisible({ timeout: 30_000 }); // halaman kadang lambat memuat
    return this;
  }

  // ---------------------------------------------------------------- tab
  /** Tombol tab 'Explore' / 'History' (di staging berupa button, bukan role=tab). */
  tab(...names: string[]): Locator {
    return this.page.getByRole('main').getByRole('button', { name: rxExact(...names) }).first();
  }

  /** Klik tab dengan nama tertentu. */
  async openTab(...names: string[]): Promise<void> {
    await this.tab(...names).click();
  }

  // ---------------------------------------------------------------- prompt
  /** Kolom prompt (deskripsi gambar/video yang ingin dibuat). */
  get prompt(): Locator {
    return this.page.getByRole('textbox', { name: rx(this.PROMPT_HINT) });
  }

  /** Tombol Generate. */
  get generateButton(): Locator {
    return this.page.getByRole('button', { name: rx(this.GENERATE_NAME, 'Generate', 'Buat') });
  }

  /** Ketik teks ke kolom prompt. */
  async writePrompt(text: string): Promise<void> {
    await this.prompt.fill(text);
  }

  // ---------------------------------------------------------------- konfigurasi
  /** Button konfigurasi (Model, Aspect ratio, Quality, Style, Number of images, Resolution, Duration). */
  optionButton(label: string): Locator {
    return this.page.getByRole('button', { name: rxExact(label) });
  }

  /** Nilai yang sedang aktif pada sebuah konfigurasi. */
  async current(label: string): Promise<string> {
    return (await this.optionButton(label).innerText()).trim();
  }

  /** Buka/tutup popup konfigurasi sesuai aria-expanded (klik hanya kalau perlu, karena klik = toggle). */
  private async setOpen(label: string, open: boolean): Promise<void> {
    const button = this.optionButton(label);
    if (((await button.getAttribute('aria-expanded')) === 'true') !== open) await button.click();
  }

  /** Daftar pilihan pada sebuah konfigurasi (popup dibuka, dibaca, lalu ditutup). */
  async options(label: string): Promise<string[]> {
    await this.setOpen(label, true);
    // popup berada satu pembungkus dengan tombolnya
    const text = await this.optionButton(label).locator('xpath=..').innerText();
    await this.setOpen(label, false);
    return text.split('\n').map((t) => t.trim()).filter(Boolean);
  }

  /**
   * Buka popup konfigurasi lalu klik satu pilihan. Pilihan berupa elemen biasa (bukan role=option);
   * popup ditambahkan setelah tombolnya di DOM, jadi pencocokan teks diambil yang terakhir.
   */
  async choose(label: string, option: string): Promise<void> {
    await this.setOpen(label, true);
    await this.page.getByText(rxExact(option)).filter({ visible: true }).last().click();
  }

  // ---------------------------------------------------------------- referensi & proses
  /** Upload gambar/video referensi. */
  async uploadReference(file: Parameters<BasePage['upload']>[0]): Promise<void> {
    await this.upload(file);
  }

  /**
   * Klik Generate memakai dispatchEvent, karena tombol antrean melayang ("Open queue")
   * bisa menutupi tombol Generate pada layar kecil.
   */
  async generate(): Promise<void> {
    await this.generateButton.dispatchEvent('click');
  }

  /** Jumlah job di antrean, dari aria-label 'Open queue (N jobs)' (0 kalau tombolnya tidak ada). */
  async queueCount(): Promise<number> {
    const button = this.page.getByRole('button', { name: rx('Open queue') });
    if (!(await button.count())) return 0;
    const label = (await button.first().getAttribute('aria-label')) ?? '';
    return firstInt(label.split('(').pop() ?? '');
  }

  /** Pastikan pesan 'token tidak mencukupi' tampil. */
  async expectInsufficientToken(): Promise<void> {
    await expect(
      this.page.getByText(rx('not enough', 'insufficient', 'tidak mencukupi', 'tidak cukup')).first(),
    ).toBeVisible();
  }

}
