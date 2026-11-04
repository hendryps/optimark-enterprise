/** Page object Dashboard (/dashboard): kartu statistik, filter periode, sidebar. */
import { expect, type Locator } from '@playwright/test';
import { rx } from '../utils/text';
import { BasePage } from './base-page';

/** Kunci filter periode. */
export type PeriodKey = '24h' | '7d' | '30d' | '1y';

/** Nama tombol filter periode (Inggris, Indonesia), urut sesuai tampilan. */
export const PERIODS: Record<PeriodKey, string[]> = {
  '24h': ['24 hours', '24 jam'],
  '7d': ['7 days', '7 hari'],
  '30d': ['30 days', '30 hari'],
  '1y': ['1 year', '1 tahun'],
};

/** Label kartu statistik (Inggris, Indonesia). */
const CARD_CONTENT = ['Total Content', 'Total Konten'];
const CARD_SCHEDULED = ['Scheduled Content', 'Konten Dijadwalkan'];
export const CARD_ADS = ['Total Ads'];

/** Menu sidebar yang ada di staging beserta URL tujuannya. */
export const SIDEBAR: Record<string, string> = {
  Dashboard: '/dashboard',
  'Content Composer': '/content-composer',
  'AI Assistant': '/ai-assistant',
  'Image Generator': '/image-generator',
  'Media Library': '/media-library',
  'Brand Hub': '/brand-hub',
  'Video Generator': '/video-generator',
  Campaign: '/campaign',
  Billing: '/billing',
};

export class DashboardPage extends BasePage {
  /** Buka Dashboard dan tunggu judul halaman tampil. */
  async open(): Promise<this> {
    await this.goto('/dashboard');
    await expect(this.page.getByRole('heading', { level: 1 })).toBeVisible();
    return this;
  }

  /** Tombol filter periode: key = '24h' | '7d' | '30d' | '1y'. */
  period(key: PeriodKey): Locator {
    return this.buttonExact(...PERIODS[key]);
  }

  /** Klik filter periode. */
  async selectPeriod(key: PeriodKey): Promise<void> {
    await this.period(key).click();
  }

  /** Angka pada kartu Total Content. */
  async contentTotal(): Promise<number> {
    return this.numberNear(...CARD_CONTENT);
  }

  /** Angka pada kartu Scheduled Content. */
  async scheduledTotal(): Promise<number> {
    return this.numberNear(...CARD_SCHEDULED);
  }

  /** Banner 'Social Media Account Not Connected' (ada selama belum ada platform terhubung). */
  get notConnectedBanner(): Locator {
    return this.page.getByRole('heading', { name: rx('Not Connected', 'Belum Terhubung') });
  }

  /** Tombol lonceng notifikasi. */
  get notificationButton(): Locator {
    return this.button('Open notifications', 'notifikasi');
  }

  /** Tombol profil di kiri bawah sidebar (berisi nama dan email). */
  get profileButton(): Locator {
    return this.page.getByRole('complementary').getByRole('button').last();
  }

  /** Link 'Connect <platform>' (mis. TikTok) di banner belum terhubung. */
  platformLink(name: string): Locator {
    return this.page.getByRole('link', { name: rx(`Connect ${name}`, `Hubungkan ${name}`) });
  }
}
