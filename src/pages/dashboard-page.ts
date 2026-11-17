/** Page object Dashboard (/dashboard): ringkasan, banner platform, filter periode, grafik, aksi cepat, sidebar. */
import { expect, type Locator, type Response } from '@playwright/test';
import { rx, rxExact } from '../utils/text';
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

/** Nilai parameter `timeFilter` di request GET /api/dashboard untuk tiap periode. */
export const PERIOD_API: Record<PeriodKey, string> = {
  '24h': '24jam',
  '7d': '7hari',
  '30d': '30hari',
  '1y': '1tahun',
};

/** Periode yang aktif saat Dashboard pertama kali dibuka. */
export const DEFAULT_PERIOD: PeriodKey = '24h';

/** Kartu Quick Access (judul kartu -> URL tujuan), sesuai flowchart: Composer / Studio / Assistant / SEO. */
export const QUICK_ACCESS: Record<string, string> = {
  'AI Content Composer': '/content-composer',
  'AI Marketing Studio': '/ai-marketing-studio',
  'AI Marketing Assistant': '/ai-assistant',
  'SEO & Rank Tracking': '/seo',
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

  /** Klik filter periode dan tunggu data dashboard dimuat ulang (GET /api/dashboard?timeFilter=...). */
  async selectPeriodAndWait(key: PeriodKey): Promise<Response> {
    const [response] = await Promise.all([
      this.page.waitForResponse((r) => r.url().includes(`/api/dashboard?timeFilter=${PERIOD_API[key]}`)),
      this.selectPeriod(key),
    ]);
    return response;
  }

  /** Daftar periode yang sedang aktif (seharusnya selalu tepat satu). */
  async activePeriods(): Promise<PeriodKey[]> {
    const active: PeriodKey[] = [];
    for (const key of Object.keys(PERIODS) as PeriodKey[]) {
      if (await this.isActive(this.period(key))) active.push(key);
    }
    return active;
  }

  /** Area konten utama (tanpa sidebar). */
  get main(): Locator {
    return this.page.getByRole('main');
  }

  /** Tombol aksi cepat 'Create New Content' di header Dashboard. */
  get createContentLink(): Locator {
    return this.main.getByRole('link', { name: rx('Create New Content', 'Buat Konten Baru') });
  }

  /** Link 'Connect Account' di banner belum terhubung (menuju halaman Platform). */
  get connectAccountLink(): Locator {
    return this.main.getByRole('link', { name: rxExact('Connect Account', 'Hubungkan Akun') });
  }

  /** Judul bagian grafik performa. */
  get performanceSection(): Locator {
    return this.main.getByRole('heading', { name: rx('Content Performance Graph', 'Grafik Performa') });
  }

  /** Judul bagian daftar Scheduled Content. */
  get scheduledSection(): Locator {
    return this.main.getByRole('heading', { name: rxExact('Scheduled Content', 'Konten Dijadwalkan') });
  }

  /** Link 'Schedule Content' pada state kosong daftar terjadwal. */
  get scheduleContentLink(): Locator {
    return this.main.getByRole('link', { name: rxExact('Schedule Content', 'Jadwalkan Konten') });
  }

  /** Judul bagian Quick Access. */
  get quickAccessSection(): Locator {
    return this.main.getByRole('heading', { name: rx('Quick Access', 'Akses Cepat') });
  }

  /** Kartu Quick Access berdasarkan judul kartu (lihat QUICK_ACCESS). */
  quickAccess(title: string): Locator {
    return this.main.getByRole('link').filter({ has: this.page.getByRole('heading', { name: rxExact(title) }) });
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
