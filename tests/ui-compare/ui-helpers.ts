/**
 * Helper khusus test perbandingan UI (Figma vs staging).
 *
 * Isinya fungsi kecil yang dipakai berulang di tiga file test di folder ini:
 *  - mengubah label desain (Label) menjadi regex pencari teks,
 *  - membaca gaya CSS yang BENAR-BENAR dipakai browser (ukuran font, tinggi, ketebalan),
 *  - membandingkan hasilnya dengan angka dari design-spec.ts.
 */
import { expect, type Locator, type Page } from '@playwright/test';
import { escapeRegex } from '../../src/utils/text';
import { STRICT_LANGUAGE, type Label } from './design-spec';

// ------------------------------------------------------------------ teks / label
/** Daftar teks yang diterima untuk sebuah label (hanya Indonesia kalau STRICT_LANGUAGE aktif). */
function accepted(label: Label): string[] {
  return STRICT_LANGUAGE ? [label.id] : [label.id, label.en, ...(label.alt ?? [])];
}

/** Regex "mengandung teks" (tidak peka huruf besar/kecil). Contoh: textRx(L('Semua','All')) cocok "Semua" atau "All". */
export function textRx(...labels: Label[]): RegExp {
  const parts = labels.flatMap(accepted).map(escapeRegex);
  return new RegExp(parts.join('|'), 'i');
}

/** Regex "sama persis" (spasi pinggir diabaikan). Dipakai untuk nama tombol/tab yang pendek. */
export function exactRx(...labels: Label[]): RegExp {
  const parts = labels.flatMap(accepted).map(escapeRegex);
  return new RegExp(`^\\s*(?:${parts.join('|')})\\s*$`, 'i');
}

/** Cari elemen yang menampilkan teks label (hanya yang terlihat). */
export function byText(page: Page, label: Label): Locator {
  return page.getByText(textRx(label)).filter({ visible: true }).first();
}

/** Cari tombol berdasarkan label. `exact` = nama tombol harus persis sama. */
export function btn(scope: Page | Locator, label: Label, exact = true): Locator {
  return scope.getByRole('button', { name: exact ? exactRx(label) : textRx(label) });
}

// ------------------------------------------------------------------ gaya CSS
/** Ambil satu properti CSS hasil akhir (computed style) dari sebuah elemen, mis. 'font-size' -> '24px'. */
async function css(locator: Locator, property: string): Promise<string> {
  return locator.evaluate((el, prop) => getComputedStyle(el).getPropertyValue(prop), property);
}

/** Ubah '24px' menjadi angka 24. */
const toPx = (value: string): number => parseFloat(value);

/**
 * Pastikan properti CSS (dalam px) sama dengan angka desain.
 * `tolerance` = selisih yang masih dianggap sama (default 1 px, karena pembulatan browser).
 * Memakai expect.soft: kalau salah, test TETAP lanjut sehingga semua selisih desain tercatat sekaligus.
 */
export async function expectPx(locator: Locator, property: string, expected: number, tolerance = 1): Promise<void> {
  const actual = toPx(await css(locator, property));
  expect.soft(Math.abs(actual - expected), `${property}: desain ${expected}px, aktual ${actual}px`).toBeLessThanOrEqual(tolerance);
}

/** Pastikan ketebalan font (weight) sama dengan desain. */
export async function expectWeight(locator: Locator, expected: number): Promise<void> {
  const actual = Number(await css(locator, 'font-weight'));
  expect.soft(actual, `font-weight: desain ${expected}, aktual ${actual}`).toBe(expected);
}

// ------------------------------------------------------------------ urutan elemen
/**
 * Ambil teks sejumlah elemen sesuai urutan di layar (kiri ke kanan / atas ke bawah).
 * Dipakai untuk memastikan URUTAN tab sama dengan Figma.
 */
export async function textsInOrder(locator: Locator): Promise<string[]> {
  const items = await locator.allInnerTexts();
  return items.map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

/** Ubah urutan teks aktual menjadi urutan label desain yang cocok (label yang tidak ditemukan dilewati). */
export function matchOrder(actual: string[], labels: Label[]): number[] {
  return labels.map((label) => actual.findIndex((t) => textRx(label).test(t)));
}

/** Apakah daftar angka naik terus (tanpa -1)? Artinya semua label ditemukan dan urutannya benar. */
export const isAscending = (list: number[]): boolean => list.every((n, i) => n >= 0 && (i === 0 || n > list[i - 1]));
