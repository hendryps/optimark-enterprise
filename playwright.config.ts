/**
 * Konfigurasi Playwright Test.
 *
 * Cara menjalankan (lihat juga README):
 *   npm test                 -> test aman (tanpa test yang memakai token / mengubah data)
 *   npm run test:tokens      -> hanya menambah test yang memakai token AI asli
 *   npm run test:destructive -> hanya menambah test yang menyimpan/menghapus data
 *   npm run test:all         -> semuanya
 */
import { defineConfig } from '@playwright/test';
import { env } from './src/config/env';

/** INCLUDE=tokens | destructive | all menentukan test "berat" mana yang ikut dijalankan. */
const include = (process.env.INCLUDE ?? '').toLowerCase();
const excluded: string[] = [];
if (include !== 'tokens' && include !== 'all') excluded.push('@tokens');
if (include !== 'destructive' && include !== 'all') excluded.push('@destructive');

export default defineConfig({
  testDir: './e2e',
  // Dijalankan sekali di awal run (mis. reset akun dummy).
  globalSetup: './src/config/global-setup.ts',
  // Test dijalankan satu per satu: akun QA dipakai bersama dan server staging punya batas percobaan (rate limit).
  workers: 1,
  fullyParallel: false,
  retries: 0,
  // Satu test maksimal 5 menit (test AI generate bisa lama).
  timeout: 5 * 60_000,
  expect: { timeout: env.defaultTimeoutMs },
  // Test dengan penanda @tokens / @destructive dilewati kecuali diminta lewat INCLUDE.
  grepInvert: excluded.length ? new RegExp(excluded.join('|')) : undefined,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  outputDir: 'test-results',
  use: {
    baseURL: env.baseUrl,
    headless: env.headless,
    launchOptions: { slowMo: env.slowMo },
    actionTimeout: env.defaultTimeoutMs,
    navigationTimeout: 20_000, // maksimal 20 detik menunggu halaman termuat
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Video tidak diatur di sini: tab dibuat manual di src/fixtures/sessions.ts, video direkam dan
    // dilampirkan ke laporan HTML dari sana (hanya untuk test yang gagal).
  },
  // Browser test: Google Chrome (harus terpasang di komputer; bukan Chromium bawaan Playwright).
  projects: [{ name: 'chrome', use: { browserName: 'chromium', channel: 'chrome' } }],
});
