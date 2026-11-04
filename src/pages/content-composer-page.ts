/** Page object Content Composer / Content Planner (/content-composer) (COMP). */
import { expect, type Locator } from '@playwright/test';
import { rx, rxExact } from '../utils/text';
import { BasePage } from './base-page';

/** Nama tab status konten (Inggris, Indonesia). */
export const TAB_DRAFT = ['Draft'];
export const TAB_SCHEDULED = ['Scheduled', 'Dijadwalkan'];
export const TAB_PUBLISHED = ['Published', 'Diterbitkan'];
export const STATUS_TABS = [TAB_DRAFT, TAB_SCHEDULED, TAB_PUBLISHED];

/** Content Composer / Content Planner: List, Calendar, dan form Create Post. */
export class ComposerPage extends BasePage {
  /** Buka Content Composer dan tunggu tombol Create Post tampil. */
  async open(): Promise<this> {
    await this.goto('/content-composer');
    await expect(this.createPostButton).toBeVisible();
    return this;
  }

  // ---------------------------------------------------------------- header & tampilan
  /** Tombol/link 'Create Post'. */
  get createPostButton(): Locator {
    return this.button('Create Post', 'Buat Postingan')
      .or(this.page.getByRole('link', { name: rx('Create Post', 'Buat Postingan') }))
      .first();
  }

  /** Tab tampilan: List / Calendar (Kalender). */
  viewTab(...names: string[]): Locator {
    return this.page.getByRole('tab', { name: rxExact(...names) });
  }

  /** Tab status konten: Draft / Scheduled / Published. */
  statusTab(names: string[]): Locator {
    return this.page.getByRole('tab', { name: rx(...names) });
  }

  /** Angka pada badge tab status (0 kalau tidak ada angka). */
  async statusBadge(names: string[]): Promise<number> {
    const digits = (await this.statusTab(names).innerText()).match(/\d+/g);
    return digits ? Number(digits[digits.length - 1]) : 0;
  }

  /** Baris konten pada tampilan List (tanpa baris header). */
  get rows(): Locator {
    return this.page.getByRole('main').locator('[role=row]:not(:has([role=columnheader]))');
  }

  // ---------------------------------------------------------------- kalender
  /** Kontrol navigasi kalender: 'Previous' | 'Today' | 'Next' (di staging berupa role=radio). */
  calNav(name: string): Locator {
    return this.page.getByRole('radiogroup', { name: 'Calendar navigation' }).getByRole('radio', { name: rxExact(name) });
  }

  /** Judul bulan kalender, mis. 'October 2026'. */
  async calendarTitle(): Promise<string> {
    const months = 'January|February|March|April|May|June|July|August|September|October|November|December';
    return this.page.getByText(new RegExp(`^\\s*(?:${months})\\s+20\\d\\d\\s*$`, 'i')).first().innerText();
  }

  // ---------------------------------------------------------------- pencarian & filter
  /** Kolom pencarian konten. */
  get search(): Locator {
    return this.page.getByRole('textbox', { name: rx('Search content', 'Cari konten') });
  }

  /** Dropdown filter jenis konten. */
  get typeFilter(): Locator {
    return this.page.getByRole('combobox', { name: rx('Content type', 'Jenis konten') });
  }

  /** Pesan state kosong, mis. 'No drafts to display'. */
  get emptyState(): Locator {
    return this.page.getByText(
      rx('No drafts', 'No scheduled', 'No published', 'No content', 'Tidak ada', 'tidak ditemukan'),
    );
  }

  /** Kolom judul/nama postingan. */
  get title(): Locator {
    return this.page.getByLabel(rx('Post title', 'Post name', 'Nama/Judul Postingan', 'Judul')).first();
  }

  /** Kolom caption postingan. */
  get caption(): Locator {
    return this.page.getByLabel(rx('Caption')).or(this.page.getByPlaceholder(rx('caption'))).first();
  }

  /** Tombol 'Schedule Now'. */
  get scheduleButton(): Locator {
    return this.button('Schedule Now', 'Jadwalkan Sekarang');
  }

  /** Tombol simpan draft ('Finish Later' / 'Save Draft'). */
  get draftButton(): Locator {
    return this.button('Finish Later', 'Save Draft', 'Selesaikan Nanti');
  }

  /** Tombol Cancel. */
  get cancelButton(): Locator {
    return this.buttonExact('Cancel', 'Batal');
  }

}
