/**
 * Pengaturan proyek: membaca file `.env` (URL staging, akun QA, timeout) dan menyediakannya
 * sebagai konstanta TypeScript. Semua file lain cukup `import { env } from '../config/env'`.
 */
import dotenv from 'dotenv';
import path from 'node:path';

/** Folder root proyek (dua level di atas src/config). */
export const ROOT = path.resolve(__dirname, '..', '..');

// Baca file .env supaya isinya bisa diambil lewat process.env
dotenv.config({ path: path.join(ROOT, '.env') });

/** Ambil angka dari .env; pakai `fallback` kalau kosong atau bukan angka. */
function num(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && process.env[name] ? value : fallback;
}

export const env = {
  /** Alamat staging tanpa garis miring di belakang. */
  baseUrl: (process.env.BASE_URL ?? 'https://staging-app.optimark.ai').replace(/\/+$/, ''),
  /** false (default) = browser TAMPIL; true = berjalan tanpa tampilan. */
  headless: (process.env.HEADLESS ?? 'false').toLowerCase() === 'true',
  /** Jeda tiap aksi (ms). 1000 = 1 detik supaya jalannya test mudah diikuti. */
  slowMo: num('SLOW_MO', 1000),
  /** Batas tunggu aksi biasa (klik, isi teks, dll). */
  defaultTimeoutMs: num('DEFAULT_TIMEOUT_MS', 10_000),
  /** Batas tunggu proses AI generate (bisa lama, video beberapa menit). */
  generateTimeoutMs: num('GENERATE_TIMEOUT_MS', 240_000),
};

/** Folder penyimpan sesi login supaya tiap akun hanya login sekali (berisi cookies). */
export const AUTH_DIR = path.join(ROOT, 'auth');

/** Peran akun yang dikenal test. */
export type Role = 'default' | 'userB' | 'newUser';

/** Peran akun -> awalan variabel di .env (USER_EMAIL, USER_B_EMAIL, ...). */
const PREFIX: Record<Role, string> = {
  default: 'USER', // akun QA utama (wajib diisi)
  userB: 'USER_B', // akun kedua, untuk test isolasi data
  newUser: 'NEW_USER', // akun yang belum onboarding
};

/** Email dan password sebuah peran akun (string kosong kalau belum diisi di .env). */
export function credentials(role: Role): { email: string; password: string } {
  const prefix = PREFIX[role];
  return { email: process.env[`${prefix}_EMAIL`] ?? '', password: process.env[`${prefix}_PASSWORD`] ?? '' };
}

/** Lokasi file sesi login untuk sebuah peran, mis. auth/default.json. */
export function authFile(role: Role): string {
  return path.join(AUTH_DIR, `${role}.json`);
}
