/** Page object halaman Onboarding (ONB): form data brand setelah login pertama. */
import { expect, type Locator } from '@playwright/test';
import { rx } from '../utils/text';
import { BasePage } from './base-page';

/**
 * Halaman onboarding setelah login pertama. Locator di bagian atas berbasis label di sheet dan
 * belum diverifikasi di staging (butuh akun baru), jadi masih perkiraan.
 */
export class OnboardingPage extends BasePage {
  // ---------------------------------------------------------------- field form
  /** Kolom nama perusahaan/bisnis (wajib). */
  get company(): Locator {
    return this.page.getByLabel(rx('Company name', 'Business name', 'Nama Perusahaan', 'Nama Bisnis')).first();
  }

  /** Dropdown bidang industri (bisa combobox atau tombol, tergantung implementasi UI). */
  get industry(): Locator {
    return this.page
      .getByRole('combobox', { name: rx('Industry', 'Bidang Industri') })
      .or(this.button('Industry', 'Bidang Industri'))
      .first();
  }

  /** Kolom alamat website. */
  get website(): Locator {
    return this.page.getByLabel(rx('Website')).first();
  }

  /** Kolom deskripsi bisnis. */
  get description(): Locator {
    return this.page.getByLabel(rx('Description', 'Deskripsi')).first();
  }

  /** Kolom tagline brand. */
  get tagline(): Locator {
    return this.page.getByLabel(rx('Tagline')).first();
  }

  /** Tombol penyelesaian onboarding. */
  get finishButton(): Locator {
    return this.button('Finish', 'Complete', 'Selesai');
  }

  // ---------------------------------------------------------------- aksi
  /** Buka dropdown industri lalu pilih salah satu opsinya. */
  async pickIndustry(name: string): Promise<void> {
    await this.industry.click();
    await this.page.getByRole('option', { name: rx(name) }).first().click();
  }

  /** Isi field wajib saja (nama perusahaan + industri) dengan data contoh. */
  async fillRequired(name = 'PT Kopi Nusantara', industry = 'Food'): Promise<void> {
    await this.company.fill(name);
    await this.pickIndustry(industry);
  }

  /** Isi kode warna pada field Primary/Secondary Color. */
  async pickColor(label: string, hexCode: string): Promise<void> {
    const field = this.page.getByLabel(rx(label)).first();
    await field.fill(hexCode);
    await field.blur(); // keluar dari field supaya validasi berjalan
  }

  /** Pastikan masih di halaman onboarding (form tidak lolos / tidak berpindah). */
  async expectStillOnOnboarding(): Promise<void> {
    await expect(this.company).toBeVisible();
  }

  /**
   * Alur lengkap akun baru (locator DIVERIFIKASI di staging, berbasis placeholder).
   *
   * Isi form onboarding sampai lengkap lalu klik Finish -> masuk ke /dashboard.
   * Kolom wajib: nama bisnis, industri, deskripsi singkat. Tombol Finish tetap nonaktif sampai ketiganya terisi.
   * Website dan tagline opsional tetapi diisi supaya datanya lengkap.
   */
  async completeBusinessProfile(
    company = 'Kopi Senja Nusantara',
    industry = 'Kuliner & Restoran',
    website = 'https://www.kopisenja.co.id',
    description = 'Kedai kopi lokal dengan biji kopi pilihan dari petani Nusantara.',
    tagline = 'Setiap seduhan punya cerita',
  ): Promise<void> {
    await this.page.getByPlaceholder('Example: PT Kopi Kenangan Indonesia').fill(company);
    // Dropdown industri adalah <select> biasa. <select> pertama di halaman = pilihan bahasa,
    // jadi dipilih yang memuat opsi "Select an industry".
    await this.page.locator('select').filter({ hasText: 'Select an industry' }).selectOption({ label: industry });
    await this.page.getByPlaceholder('https://www.contoh.com').fill(website);
    await this.page.locator('textarea').fill(description);
    await this.page.getByPlaceholder('Example: Kopi Kenangan - Every sip is a story').fill(tagline);
    const finish = this.page.getByRole('button', { name: 'Finish' });
    await expect(finish).toBeEnabled();
    await finish.click();
    await expect(this.page).toHaveURL(rx('/dashboard'), { timeout: 60_000 });
  }
}
