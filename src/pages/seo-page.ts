/** Page object menu SEO (/seo): Growth Intel dengan 9 tab. */
import { expect, type Locator } from '@playwright/test';
import { rx, rxExact } from '../utils/text';
import { BasePage } from './base-page';

/** Tab pada halaman Growth Intel · SEO (urutan sesuai tampilan). */
export const SEO_TABS = [
  'Overview', 'Content Ideas', 'Content Optimizer', 'Keywords', 'Rank Tracking',
  'Backlinks', 'Competitors', 'Site Audit', 'AI SEO',
];

export class SeoPage extends BasePage {
  /** Buka halaman SEO dan tunggu judul 'Growth Intel' tampil. */
  async open(): Promise<this> {
    await this.goto('/seo');
    await expect(this.page.getByRole('heading', { name: rx('Growth Intel') })).toBeVisible({ timeout: 30_000 });
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
}
