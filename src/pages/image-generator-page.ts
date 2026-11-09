/** Page object Image Generator (/image-generator). Semua logika ada di GeneratorPage. */
import type { Locator } from '@playwright/test';
import { rxExact } from '../utils/text';
import { GeneratorPage } from './generator-page';

export class ImageGeneratorPage extends GeneratorPage {
  protected readonly PATH = '/image-generator';
  protected readonly PROMPT_HINT = 'Describe the image';
  protected readonly GENERATE_NAME = '/ Image' // tombol Generate berlabel biaya token, mis. "30 / Image";

  /** Kartu template di tab Templates (tiap kartu punya tombol 'Use'). */
  gallery(): Locator {
    return this.page.getByRole('main').getByRole('button', { name: rxExact('Use', 'Gunakan') });
  }

  // ---------------------------------------------------------------- tab Templates
  /** Chip kategori template (All, Product Photography, Ad Creative, ...). Chip aktif ber-aria-pressed=true. */
  category(name: string): Locator {
    return this.page.getByRole('main').getByRole('button', { name: rxExact(name) });
  }

  /** Tombol 'Load more' di bawah galeri template. */
  get loadMore(): Locator {
    return this.page.getByRole('main').getByRole('button', { name: rxExact('Load more', 'Muat lebih banyak') });
  }

  /** Pasang template ke kotak prompt dengan menekan 'Use' pada kartu ke-`index` (mulai 0). */
  async useTemplate(index = 0): Promise<void> {
    await this.gallery().nth(index).click();
    await this.templateStrip.waitFor({ state: 'visible' });
  }

  // ---------------------------------------------------------------- template yang sedang dipasang
  /** Baris template di atas kotak prompt (aria-label 'Template <nama>, view details'). */
  get templateStrip(): Locator {
    return this.page.getByRole('button', { name: /^Template .*view details/i });
  }

  /** Tombol 'Remove template' untuk melepas template. */
  get removeTemplate(): Locator {
    return this.page.getByRole('button', { name: rxExact('Remove template') });
  }

  /** Tombol upload foto produk (wajib saat memakai template). */
  get productUpload(): Locator {
    return this.page.getByRole('button', { name: /^Upload product photo/i });
  }

  /** Kolom 'Describe the changes (optional)' yang menggantikan kolom prompt saat template terpasang. */
  get changesBox(): Locator {
    return this.page.getByRole('textbox', { name: /Describe the changes/i });
  }

  // ---------------------------------------------------------------- Brand Hub
  /** Tombol toggle Brand Hub (aria-pressed true/false). */
  get brandHub(): Locator {
    return this.page.getByRole('main').getByRole('button', { name: rxExact('Brand Hub') });
  }
}
