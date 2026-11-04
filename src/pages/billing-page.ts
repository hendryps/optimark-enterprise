/** Page object menu Billing (/billing): paket aktif, pemakaian token, riwayat pembayaran. */
import { expect, type Locator } from '@playwright/test';
import { rx } from '../utils/text';
import { BasePage } from './base-page';

export class BillingPage extends BasePage {
  /** Buka halaman Billing dan tunggu judulnya tampil (halaman kadang lambat). */
  async open(): Promise<this> {
    await this.goto('/billing');
    await expect(this.page.getByRole('heading', { name: 'Billing' }).first()).toBeVisible({ timeout: 30_000 });
    return this;
  }

  /** Tombol 'Choose plan' untuk memilih paket langganan. */
  get choosePlanButton(): Locator {
    return this.button('Choose plan');
  }

  /** Tombol 'View plans' untuk melihat daftar paket. */
  get viewPlansButton(): Locator {
    return this.button('View plans');
  }

  /** Tombol 'Refresh' untuk memuat ulang riwayat pembayaran. */
  get refreshButton(): Locator {
    return this.button('Refresh');
  }

  /** Kolom pencarian invoice. */
  get search(): Locator {
    return this.page.getByPlaceholder(rx('Search invoice'));
  }

  /** <select> status pembayaran (All statuses, Pending, Paid, Failed, Expired). */
  get statusFilter(): Locator {
    return this.page.getByRole('main').locator('select').first();
  }

  /** Tombol 'Apply' untuk menerapkan filter. */
  get applyButton(): Locator {
    return this.buttonExact('Apply');
  }

  /** Teks state kosong saat belum ada pembayaran. */
  get emptyHistory(): Locator {
    return this.page.getByText('No payment history yet');
  }
}
