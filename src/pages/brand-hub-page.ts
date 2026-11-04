/** Page object menu Brand Hub (/brand-hub): ringkasan dan form identitas brand. */
import { expect, type Locator } from '@playwright/test';
import { rx, rxExact } from '../utils/text';
import { BasePage } from './base-page';

/** Daftar tab sesuai urutan di layar. */
export const BRAND_TABS = [
  'Overview', 'Brand Profile', 'Visual Identity', 'Customer Profiles', 'Guardrails', 'Content Themes', 'Social Links',
];

/** Tab yang di staging masih "being prepared" (belum bisa dipakai). */
export const COMING_SOON = ['Customer Profiles', 'Guardrails', 'Content Themes', 'Social Links'];

export class BrandHubPage extends BasePage {
  /** Buka Brand Hub dan tunggu tab Overview tampil. */
  async open(): Promise<this> {
    await this.goto('/brand-hub');
    await expect(this.tab('Overview')).toBeVisible({ timeout: 30_000 });
    return this;
  }

  /** Tab berdasarkan namanya, mis. brandHub.tab('Brand Profile'). */
  tab(name: string): Locator {
    return this.page.getByRole('tab', { name: rxExact(name) });
  }

  /** Klik tab lalu pastikan tab itu benar-benar terpilih (aria-selected=true). */
  async openTab(name: string): Promise<void> {
    await this.tab(name).click();
    await expect(this.tab(name)).toHaveAttribute('aria-selected', 'true');
  }

  /** Kolom nama perusahaan/bisnis. */
  get company(): Locator {
    return this.page.getByLabel(rx('Company / Business Name', 'Business Name')).first();
  }

  /** Tombol Save di area utama halaman. */
  get saveButton(): Locator {
    return this.page.getByRole('main').getByRole('button', { name: 'Save', exact: true });
  }

  /** Tombol Cancel di area utama halaman. */
  get cancelButton(): Locator {
    return this.page.getByRole('main').getByRole('button', { name: 'Cancel', exact: true });
  }
}
