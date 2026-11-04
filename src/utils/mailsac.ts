/**
 * Bantuan untuk Mailsac (https://mailsac.com): membuat email dummy, membaca inbox, mengambil link di email.
 *
 * Kenapa Mailsac? Inbox-nya PUBLIK: alamat apa pun @mailsac.com langsung jadi kotak surat tanpa daftar.
 * Jadi QA cukup mendaftarkan email "nama@mailsac.com" di Optimark, lalu membuka
 * https://mailsac.com/inbox/nama@mailsac.com untuk membaca email verifikasi / reset password.
 *
 * PERINGATAN: karena inbox-nya publik, JANGAN pernah memakai data asli/pribadi di Mailsac.
 *
 * Cara pakai di test (lihat fixture `mailbox` di src/fixtures/auth.ts):
 *   const user = makeDummyUser();                                  // data dummy baru
 *   ...daftar di Optimark dengan user.email...
 *   const body = await mailbox.waitForMail(user.email, 'Verify your');  // tunggu emailnya masuk
 *   const link = extractLink(body, 'verify-email');                // ambil link verifikasi
 */
import type { Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../config/env';

/** Password dummy yang memenuhi aturan Optimark: 8-15 karakter, ada angka, huruf besar, huruf kecil, simbol. */
const DEFAULT_PASSWORD = 'Optimark#2026';
/** Password baru yang dipakai saat test reset password. */
export const NEW_PASSWORD = 'Baru#Optimark26';

/** Nama depan + belakang supaya email dummy terlihat seperti orang sungguhan. */
const FIRST_NAMES = ['rizky', 'dimas', 'anindya', 'salsabila', 'bagas', 'nadia', 'fajar', 'citra', 'wulan', 'gilang'];
const LAST_NAMES = ['pratama', 'anggara', 'wijaya', 'kusuma', 'lestari', 'santoso', 'permata', 'ramadhan', 'hakim', 'putri'];

/** File pencatatan data tes yang BERHASIL registrasi (untuk ditempel ke Google Sheet). */
const TEST_DATA_CSV = path.join(ROOT, 'playwright-report', 'test-data-registrasi.csv');

/** Satu akun dummy: nama lengkap, email Mailsac, dan password. */
export interface DummyUser {
  fullName: string;
  email: string;
  password: string;
}

/** Pilih satu elemen acak dari daftar. */
function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** Tambah angka 0 di depan sampai 2 digit (5 -> "05"). */
function two(n: number): string {
  return String(n).padStart(2, '0');
}

/** Huruf pertama kapital (rizky -> Rizky). */
function title(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * Daftar permanen nama + email yang SUDAH PERNAH dipakai (satu baris per akun: "Nama|email").
 * Disimpan di auth/ (tidak dihapus tiap run), supaya nama dan email tidak pernah dipakai dua kali.
 */
const USED_FILE = path.join(ROOT, 'auth', 'used-accounts.txt');

/** Baca daftar nama dan email yang sudah dipakai. */
function readUsed(): { names: Set<string>; emails: Set<string> } {
  const names = new Set<string>();
  const emails = new Set<string>();
  if (fs.existsSync(USED_FILE)) {
    for (const line of fs.readFileSync(USED_FILE, 'utf8').split('\n')) {
      const [name, email] = line.trim().split('|');
      if (name) names.add(name.toLowerCase());
      if (email) emails.add(email.toLowerCase());
    }
  }
  return { names, emails };
}

/**
 * Buat akun dummy BARU yang unik, mis. "Dimas Anggara" / dimas.anggara.0412@mailsac.com.
 *
 * Nama dan email dicek ke daftar `auth/used-accounts.txt`; kombinasi yang sudah pernah dipakai dilewati,
 * lalu kombinasi baru langsung dicatat di sana. Angka di belakang email = hari+bulan + 2 digit acak.
 * Satu email hanya bisa didaftarkan sekali di Optimark, jadi data lama tidak boleh dipakai lagi.
 */
export function makeDummyUser(): DummyUser {
  const used = readUsed();
  const now = new Date();
  for (let attempt = 0; attempt < 500; attempt++) {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const fullName = `${title(first)} ${title(last)}`;
    const email = `${first}.${last}.${two(now.getDate())}${two(now.getMonth() + 1)}${two(Math.floor(Math.random() * 100))}@mailsac.com`;
    if (used.names.has(fullName.toLowerCase()) || used.emails.has(email)) continue;
    fs.mkdirSync(path.dirname(USED_FILE), { recursive: true });
    fs.appendFileSync(USED_FILE, `${fullName}|${email}\n`, 'utf8');
    return { fullName, email, password: DEFAULT_PASSWORD };
  }
  throw new Error('Semua kombinasi nama sudah terpakai. Tambahkan nama baru ke FIRST_NAMES / LAST_NAMES di src/utils/mailsac.ts.');
}

/** Ambil link dari teks email. `pathHint` = potongan path, mis. 'verify-email' atau 'reset-password'. */
export function extractLink(mailText: string, pathHint: string): string {
  const url = (mailText.match(/https?:\/\/\S+/g) ?? []).find((u) => u.includes(pathHint));
  if (!url) throw new Error(`Link '${pathHint}' tidak ditemukan di email:\n${mailText.slice(0, 500)}`);
  return url;
}

/** Catat satu baris data tes yang berhasil ke playwright-report/test-data-registrasi.csv. */
export function recordTestData(caseId: string, user: DummyUser, note: string): void {
  fs.mkdirSync(path.dirname(TEST_DATA_CSV), { recursive: true });
  const isNew = !fs.existsSync(TEST_DATA_CSV);
  const cell = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const now = new Date();
  const when = `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())} ${two(now.getHours())}:${two(now.getMinutes())}`;
  const lines: string[] = [];
  if (isNew) {
    lines.push(['Tanggal', 'ID Test Case', 'Nama Lengkap', 'Email', 'Password', 'Inbox Mailsac', 'Catatan'].map(cell).join(','));
  }
  lines.push([when, caseId, user.fullName, user.email, user.password, `https://mailsac.com/inbox/${user.email}`, note].map(cell).join(','));
  // BOM di awal file supaya rapi saat dibuka di Excel
  fs.appendFileSync(TEST_DATA_CSV, (isNew ? '﻿' : '') + lines.join('\n') + '\n', 'utf8');
}

/** Membaca inbox Mailsac lewat browser (tab terpisah dari tab aplikasi Optimark). */
export class Mailsac {
  /** `page` = tab browser yang khusus dipakai untuk membuka mailsac.com. */
  constructor(readonly page: Page) {}

  /** Buka halaman inbox sebuah alamat. */
  async openInbox(address: string): Promise<void> {
    await this.page.goto(`https://mailsac.com/inbox/${address}`);
  }

  /** Baris email di tabel inbox yang subject-nya cocok. */
  private rows(subjectRegex: string) {
    return this.page.locator('table tbody tr').filter({ hasText: new RegExp(subjectRegex, 'i') });
  }

  /** Jumlah email bersubject tertentu yang sudah ada di inbox (0 kalau belum ada). */
  async countMails(address: string, subjectRegex: string): Promise<number> {
    await this.openInbox(address);
    await this.page.waitForTimeout(2500); // beri waktu daftar email termuat
    return this.rows(subjectRegex).count();
  }

  /**
   * Tunggu email baru bersubject `subjectRegex` lalu kembalikan isi teksnya.
   *
   * `alreadyHave` = jumlah email bersubject sama yang SUDAH ada sebelumnya (dari countMails),
   * supaya email lama tidak terbaca sebagai email baru. Inbox di-refresh tiap 5 detik.
   */
  async waitForMail(address: string, subjectRegex: string, alreadyHave = 0, timeoutSeconds = 150): Promise<string> {
    let waited = 0;
    await this.openInbox(address);
    while (waited <= timeoutSeconds) {
      await this.page.waitForTimeout(2500);
      const rows = this.rows(subjectRegex);
      if ((await rows.count()) > alreadyHave) {
        await rows.first().click(); // baris paling atas = email terbaru
        // Isi email ditampilkan di dalam iframe (frame ke-2 setelah halaman utama).
        // URL iframe kosong / about:srcdoc tergantung mode browser, jadi dipilih lewat urutan.
        for (let i = 0; i < 20; i++) {
          for (const frame of this.page.frames().slice(1)) {
            const text = (await frame.locator('body').innerText()).trim();
            if (text) return text;
          }
          await this.page.waitForTimeout(500);
        }
      }
      await this.page.waitForTimeout(2500);
      waited += 5;
      await this.page.reload();
    }
    throw new Error(`Email '${subjectRegex}' tidak masuk ke ${address} dalam ${timeoutSeconds} detik`);
  }
}
