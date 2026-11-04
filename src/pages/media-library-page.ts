/** Page object menu Media Library (/media-library): folder, upload, kategori, filter, tampilan Grid/List. */
import { expect, type Locator } from '@playwright/test';
import { rxExact } from '../utils/text';
import { BasePage } from './base-page';

export const MEDIA_CATEGORIES = ['All', 'Images', 'Videos', 'Articles'];

export class MediaLibraryPage extends BasePage {
  /** Buka Media Library dan tunggu judulnya tampil. */
  async open(): Promise<this> {
    await this.goto('/media-library');
    await expect(this.page.getByRole('heading', { name: 'Media Library' })).toBeVisible({ timeout: 30_000 });
    return this;
  }

  /** Tombol 'Create Folder'. */
  get createFolderButton(): Locator {
    return this.page.getByRole('main').getByRole('button', { name: 'Create Folder', exact: true });
  }

  /** Tombol 'Upload'. */
  get uploadButton(): Locator {
    return this.page.getByRole('main').getByRole('button', { name: 'Upload', exact: true });
  }

  /** Kategori All/Images/Videos/Articles (berupa button, bukan tab). */
  category(name: string): Locator {
    return this.page.getByRole('main').getByRole('button', { name: rxExact(name) });
  }

  /** Kolom pencarian media (input type=search). */
  get search(): Locator {
    return this.page.getByPlaceholder('Search media');
  }

  /** Tombol 'Filter media' (panel Source dan Ratio). */
  get filterButton(): Locator {
    return this.button('Filter media');
  }

  /** Tombol tampilan Grid. */
  get gridView(): Locator {
    return this.button('Grid view');
  }

  /** Tombol tampilan List. */
  get listView(): Locator {
    return this.button('List view');
  }

  /** Dialog/popup yang sedang terbuka (New Folder atau Upload media). */
  get dialog(): Locator {
    return this.page.getByRole('dialog');
  }

  /** Teks 'No media found' saat tidak ada hasil. */
  get emptyState(): Locator {
    return this.page.getByText('No media found');
  }
}
