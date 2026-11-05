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
}
