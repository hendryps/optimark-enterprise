/**
 * Konfigurasi Playwright KHUSUS pengecekan UI/UX (folder tests/ui-compare/).
 *
 * Terpisah dari playwright.config.ts (yang untuk test E2E di folder tests/e2e/) karena ini bukan test alur
 * pengguna, melainkan membandingkan tampilan staging dengan desain Figma.
 *
 * Cara menjalankan:
 *   npm run test:ui                 -> semua cek UI
 *   npm run test:ui -- --grep MLUI  -> hanya sebagian (contoh: Media Library)
 *   npm run report:ui               -> buka laporan HTML
 */
import { defineConfig } from '@playwright/test';
import { env } from './src/config/env';

export default defineConfig({
  testDir: './tests/ui-compare', // hanya membaca tests/ui-compare, bukan tests/e2e
  globalSetup: './src/config/global-setup.ts',
  workers: 1, // akun QA dipakai bersama, jalan satu per satu
  fullyParallel: false,
  retries: 0,
  timeout: 2 * 60_000,
  expect: { timeout: env.defaultTimeoutMs },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report-ui', open: 'never' }]],
  outputDir: 'test-results-ui', // hasil terpisah dari test E2E
  use: {
    baseURL: env.baseUrl,
    headless: env.headless,
    launchOptions: { slowMo: env.slowMo },
    actionTimeout: env.defaultTimeoutMs,
    navigationTimeout: 20_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chrome', use: { browserName: 'chromium', channel: 'chrome' } }],
});
