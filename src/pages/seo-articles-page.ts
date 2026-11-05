/** Page object SEO > Articles (/seo/articles): daftar artikel, form New Article / Edit Article, pencarian. */
import { expect, type Locator } from '@playwright/test';
import { escapeRegex, rx, rxExact } from '../utils/text';
import { BasePage } from './base-page';

export const LIST_PATH = '/seo/articles';
export const CREATE_PATH = '/seo/articles/create';

/** Judul unik per run supaya artikel uji mudah dikenali dan tidak bentrok. */
export function uniqueTitle(prefix = 'QA Artikel'): string {
  return `${prefix} ${Date.now() % 1_000_000_000}`;
}

/** Menu SEO > Articles: daftar (/seo/articles) dan form (/seo/articles/create, /seo/articles/<id>). */
export class ArticlesPage extends BasePage {
  // ---------------------------------------------------------------- navigasi
  /** Buka daftar artikel dan tunggu judul 'Articles Management' tampil. */
  async openList(): Promise<this> {
    await this.goto(LIST_PATH);
    await expect(this.listHeading).toBeVisible({ timeout: 20_000 });
    await expect(this.page.getByText(rx('Total Articles'))).toBeVisible();
    return this;
  }

  /** Buka form New Article dan tunggu kolom Title tampil. */
  async openCreate(): Promise<this> {
    await this.goto(CREATE_PATH);
    await expect(this.titleInput).toBeVisible({ timeout: 20_000 });
    return this;
  }

  // ---------------------------------------------------------------- daftar
  /** Judul 'Articles Management'. */
  get listHeading(): Locator {
    return this.page.getByRole('heading', { name: rx('Articles Management') });
  }

  /** Tombol 'New Article' di pojok kanan atas daftar (berupa tautan ke form create). */
  get newArticleLink(): Locator {
    return this.page.getByRole('link', { name: rx('New Article') }).first();
  }

  /** Kolom 'Search articles...'. */
  get searchInput(): Locator {
    return this.page.getByPlaceholder('Search articles...');
  }

  /** Tombol 'Search'. */
  get searchButton(): Locator {
    return this.buttonExact('Search');
  }

  /** Isi kolom pencarian lalu klik Search. */
  async search(text: string): Promise<void> {
    await this.searchInput.fill(text);
    await this.searchButton.click();
  }

  /** Angka pada kartu 'Total Articles'. */
  async totalArticles(): Promise<number> {
    return this.numberNear('Total Articles');
  }

  /** Kartu artikel berdasarkan judul (tautan judul di daftar). */
  card(title: string): Locator {
    return this.page.getByRole('link', { name: title, exact: true }).first();
  }

  /** Pembungkus kartu: elemen terdekat yang memuat judul sekaligus tombol Edit/Delete. */
  private cardActions(title: string): Locator {
    return this.page
      .locator('div')
      .filter({ has: this.card(title) })
      .filter({ has: this.page.getByRole('button', { name: rx('Delete') }) })
      .last();
  }

  /** Tautan 'Edit' pada kartu artikel berjudul `title`. */
  editLink(title: string): Locator {
    return this.cardActions(title).getByRole('link', { name: rx('Edit') });
  }

  /** Tombol 'Delete' pada kartu artikel berjudul `title`. */
  deleteButton(title: string): Locator {
    return this.cardActions(title).getByRole('button', { name: rx('Delete') });
  }

  /** Hapus artikel dari daftar. Kalau muncul dialog konfirmasi, penghapusan dikonfirmasi. */
  async deleteArticle(title: string): Promise<void> {
    await this.deleteButton(title).click();
    const dialog = this.page.getByRole('dialog').or(this.page.getByRole('alertdialog'));
    const confirm = dialog.getByRole('button', { name: rx('Delete', 'Hapus', 'Confirm', 'Yes', 'Ya') });
    if (await confirm.count()) await confirm.last().click();
  }

  // ---------------------------------------------------------------- form
  /** Kolom form berdasarkan label (label kolom wajib bertanda *). */
  private field(name: string): Locator {
    return this.page.getByLabel(new RegExp(`^\\s*${escapeRegex(name)}\\s*\\*?\\s*$`, 'i'));
  }

  get titleInput(): Locator { return this.field('Title'); }
  /** Slug terisi otomatis dari Title. */
  get slugInput(): Locator { return this.field('Slug'); }
  get excerptInput(): Locator { return this.field('Excerpt'); }
  get altTextInput(): Locator { return this.field('Alt Text'); }
  get authorInput(): Locator { return this.field('Author'); }
  get metaTitleInput(): Locator { return this.field('Meta Title'); }
  get metaKeywordsInput(): Locator { return this.field('Meta Keywords'); }
  get metaDescriptionInput(): Locator { return this.field('Meta Description'); }

  /** Tombol 'Create' (form baru). */
  get createButton(): Locator { return this.buttonExact('Create'); }
  /** Tombol 'Save' (form Edit). */
  get saveButton(): Locator { return this.buttonExact('Save'); }
  /** Tombol 'Cancel'. */
  get cancelButton(): Locator { return this.buttonExact('Cancel'); }
  /** Tombol 'Export' (nonaktif sampai artikel tersimpan). */
  get exportButton(): Locator { return this.buttonExact('Export'); }
  /** Tombol 'Hide preview' / 'Show preview'. */
  get previewToggle(): Locator { return this.button('Hide preview', 'Show preview'); }
  /** Panel 'Live Preview' di sisi kanan form. */
  get previewPanel(): Locator { return this.page.getByText(rxExact('Live Preview')); }
  /** Judul artikel di Live Preview ('Untitled article' selama Title kosong). */
  get previewTitle(): Locator { return this.page.getByRole('heading', { level: 1 }).last(); }

  /** Notifikasi (toast) yang sedang tampil, mis. toast('Article created'). */
  toast(...names: string[]): Locator {
    return this.page.getByText(rx(...names)).filter({ visible: true });
  }

  /** Isi hanya kolom yang divalidasi server: Title, Meta Title, Meta Description. */
  async fillRequired(title: string, metaTitle?: string, metaDescription?: string): Promise<void> {
    await this.titleInput.fill(title);
    await this.metaTitleInput.fill(metaTitle ?? `Meta ${title}`);
    await this.metaDescriptionInput.fill(metaDescription ?? 'Deskripsi meta untuk pengujian otomatis.');
  }

  /** Isi semua kolom teks pada form. */
  async fillAll(title: string, author = 'QA Tester'): Promise<void> {
    await this.fillRequired(title);
    await this.excerptInput.fill('Ringkasan artikel untuk pengujian otomatis.');
    await this.altTextInput.fill('Gambar ilustrasi uji');
    await this.authorInput.fill(author);
    await this.metaKeywordsInput.fill('seo, uji, otomatis');
  }

  /** Isi form create lalu klik Create dan tunggu kembali ke daftar (artikel berhasil dibuat). */
  async createArticle(title: string, author = 'QA Tester'): Promise<void> {
    await this.openCreate();
    await this.fillAll(title, author);
    await this.createButton.click();
    await expect(this.page).toHaveURL(new RegExp(`${LIST_PATH}/?$`), { timeout: 20_000 });
    await expect(this.card(title)).toBeVisible({ timeout: 20_000 });
  }
}
