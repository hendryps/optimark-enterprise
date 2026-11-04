/** Page object Image Generator (/image-generator). Semua logika ada di GeneratorPage. */
import type { Locator } from '@playwright/test';
import { GeneratorPage } from './generator-page';

export class ImageGeneratorPage extends GeneratorPage {
  protected readonly PATH = '/image-generator';
  protected readonly PROMPT_HINT = 'Describe the image';
  protected readonly GENERATE_NAME = 'Generate image';

  /** Kartu gambar inspirasi di tab Explore. */
  gallery(): Locator {
    return this.page.getByRole('figure');
  }
}
