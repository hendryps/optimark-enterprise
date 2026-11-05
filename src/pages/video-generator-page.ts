/** Page object Video Generator (/video-generator). Semua logika ada di GeneratorPage. */
import type { Locator } from '@playwright/test';
import { rxExact } from '../utils/text';
import { GeneratorPage } from './generator-page';

export class VideoGeneratorPage extends GeneratorPage {
  protected readonly PATH = '/video-generator';
  protected readonly PROMPT_HINT = 'Describe the video';
  protected readonly GENERATE_NAME = 'Generate video';

  /** Kartu template di tab Templates (tiap kartu punya tombol 'Use'). */
  gallery(): Locator {
    return this.page.getByRole('main').getByRole('button', { name: rxExact('Use', 'Gunakan') });
  }
}
