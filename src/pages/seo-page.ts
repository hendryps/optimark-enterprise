/** Page object menu SEO (/seo): Growth Intel dengan 9 tab, Analyze domain, Overview, Open Workspace / View All. */
import { expect, type Locator, type Response } from '@playwright/test';
import { rx, rxExact } from '../utils/text';
import { BasePage } from './base-page';

/** Tab pada halaman Growth Intel · SEO (urutan sesuai tampilan). */
export const SEO_TABS = [
  'Overview', 'Content Ideas', 'Content Optimizer', 'Keywords', 'Rank Tracking',
  'Backlinks', 'Competitors', 'Site Audit', 'AI SEO',
];

/** Elemen penanda isi tiap tab (selain Overview dan Site Audit yang isinya belum terlihat karena crash), dipakai untuk memastikan tab benar-benar termuat. */
export const TAB_MARKERS: Record<string, { role: 'button' | 'textbox' | 'text'; name: string }> = {
  'Content Ideas': { role: 'button', name: 'Research Topics' },
  'Content Optimizer': { role: 'button', name: 'Analyze Content' },
  Keywords: { role: 'button', name: 'Keywords Explorer' },
  'Rank Tracking': { role: 'textbox', name: 'Target keyword' },
  Backlinks: { role: 'text', name: 'Analyze Website Backlinks' },
  Competitors: { role: 'textbox', name: 'Website or Domain' },
  'AI SEO': { role: 'button', name: 'Google AI Overview' },
};

/** Ringkasan SEO milik akun dari GET /api/seo-dashboard/overview (dipakai untuk cabang "sudah dianalisis?"). */
export interface SeoOverview {
  client: { website: string | null; domain: string | null };
}

export class SeoPage extends BasePage {
  /** Buka halaman SEO dan tunggu judul 'Growth Intel' tampil. */
  async open(): Promise<this> {
    await this.goto('/seo');
    await expect(this.page.getByRole('heading', { name: rx('Growth Intel') })).toBeVisible({ timeout: 20_000 });
    return this;
  }

  /** Tab berdasarkan nama, mis. seo.tab('Keywords'). */
  tab(name: string): Locator {
    return this.page.getByRole('tab', { name: rxExact(name) });
  }

  /** Kolom URL halaman yang ingin dianalisis. */
  get urlInput(): Locator {
    return this.page.getByPlaceholder('https://example.com/page');
  }

  /** Kolom kata kunci target. */
  get keywordInput(): Locator {
    return this.page.getByPlaceholder(rx('target keyword'));
  }

  /** Tombol 'Analyze'. */
  get analyzeButton(): Locator {
    return this.buttonExact('Analyze');
  }

  /** Panel tab yang sedang aktif. */
  get activePanel(): Locator {
    return this.page.getByRole('tabpanel');
  }

  /** Penanda isi sebuah tab (lihat TAB_MARKERS). */
  tabMarker(name: string): Locator {
    const marker = TAB_MARKERS[name];
    if (marker.role === 'text') return this.page.getByText(rx(marker.name)).first();
    return this.page.getByRole(marker.role, { name: rx(marker.name) }).first();
  }

  /** Teks layar crash Next.js ('Application error: a client-side exception ...'). */
  get crashScreen(): Locator {
    return this.page.getByText(rx('Application error', 'client-side exception'));
  }

  /** Bagian 'Main Organic Competitors' di Overview: 'Waiting' sebelum dianalisis, 'Auto-detected' sesudahnya. */
  get competitorsStatus(): Locator {
    return this.page.getByText(rxExact('Waiting', 'Auto-detected'));
  }

  /** Tombol 'View All' pada tabel Top Organic Keywords. */
  get viewAllButton(): Locator {
    return this.buttonExact('View All');
  }

  /** Tombol 'Open Workspace' pada kartu Growth Insights. */
  get openWorkspaceButton(): Locator {
    return this.buttonExact('Open Workspace');
  }

  /** Isi domain lalu klik Analyze; tunggu respons GET /api/competitor-analysis/discover. */
  async analyze(url: string, keyword?: string): Promise<Response> {
    await this.urlInput.fill(url);
    if (keyword !== undefined) await this.keywordInput.fill(keyword);
    const [response] = await Promise.all([
      this.page.waitForResponse((r) => r.url().includes('/api/competitor-analysis/discover')),
      this.analyzeButton.click(),
    ]);
    return response;
  }

  /** Data ringkasan SEO akun (domain/website tersimpan atau belum). */
  async overviewData(): Promise<SeoOverview> {
    const response = await this.page.request.get('/api/seo-dashboard/overview');
    expect(response.ok(), `GET /api/seo-dashboard/overview gagal: ${response.status()}`).toBe(true);
    return (await response.json()) as SeoOverview;
  }

  /** True kalau akun sudah punya website/domain tersimpan (cabang "Sudah dianalisis"). */
  async isAnalyzed(): Promise<boolean> {
    const { client } = await this.overviewData();
    return Boolean(client?.domain || client?.website);
  }
}
