/** Page object Video Generator (/video-generator). Semua logika ada di GeneratorPage. */
import type { Locator } from '@playwright/test';
import { GeneratorPage } from './generator-page';

export class VideoGeneratorPage extends GeneratorPage {
  protected readonly PATH = '/video-generator';
  protected readonly PROMPT_HINT = 'Describe the video';
  protected readonly GENERATE_NAME = 'Generate video';

  /** Daftar video/gambar contoh di tab Explore. */
  gallery(): Locator {
    return this.page.getByRole('main').locator('video, figure');
  }
}
