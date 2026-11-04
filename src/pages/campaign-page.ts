/** Page object menu Campaign: daftar (/campaign) dan form buat campaign (/campaign/create). */
import { expect, type Locator } from '@playwright/test';
import { rx } from '../utils/text';
import { BasePage } from './base-page';

export class CampaignPage extends BasePage {
  /** Buka daftar campaign. */
  async open(): Promise<this> {
    await this.goto('/campaign');
    await expect(this.page.getByRole('heading', { name: 'Campaign' }).first()).toBeVisible({ timeout: 30_000 });
    return this;
  }

  /** Langsung buka form 'Create New Campaign'. */
  async openCreate(): Promise<this> {
    await this.goto('/campaign/create');
    await expect(this.page.getByRole('heading', { name: rx('Create New Campaign') })).toBeVisible({ timeout: 30_000 });
    return this;
  }

  // ---------------------------------------------------------------- halaman daftar
  /** Link/tombol 'Create Campaign' di halaman daftar. */
  get createButton(): Locator {
    return this.page.getByRole('main').getByRole('link', { name: 'Create Campaign' }).first();
  }

  /** Kolom pencarian campaign. */
  get search(): Locator {
    return this.page.getByPlaceholder(rx('Search campaigns'));
  }

  /** <select> filter status pada daftar (All Status, Draft, Active, ...). */
  get statusFilter(): Locator {
    return this.page.getByRole('main').locator('select').first();
  }

  /** Teks 'No campaigns yet' saat belum ada campaign. */
  get emptyState(): Locator {
    return this.page.getByText('No campaigns yet');
  }

  // ---------------------------------------------------------------- form buat campaign
  /** Kolom nama campaign. */
  get nameInput(): Locator {
    return this.page.getByPlaceholder(rx('Example: Q2 2026 Campaign'));
  }

  /** <select> tujuan campaign (dropdown pertama di form). */
  get objectiveSelect(): Locator {
    return this.page.getByRole('main').locator('select').nth(0);
  }

  /** <select> status campaign (dropdown kedua di form). */
  get statusSelect(): Locator {
    return this.page.getByRole('main').locator('select').nth(1);
  }

  /** Tombol 'Create Campaign' untuk menyimpan form. */
  get submitButton(): Locator {
    return this.page.getByRole('main').getByRole('button', { name: 'Create Campaign', exact: true });
  }

  /** Tombol Cancel pada form. */
  get cancelButton(): Locator {
    return this.page.getByRole('main').getByRole('button', { name: 'Cancel', exact: true });
  }

  /** Tombol Back pada form. */
  get backButton(): Locator {
    return this.page.getByRole('main').getByRole('button', { name: 'Back', exact: true });
  }
}
