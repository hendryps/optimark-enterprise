/**
 * Fixture "kondisi akun": melewati (skip) test kalau akun QA tidak memenuhi syarat.
 *
 * Akun QA di staging bisa berubah-ubah (saldo token habis, belum ada platform terhubung, belum ada
 * konten). Daripada test gagal dengan pesan membingungkan, test yang butuh kondisi tertentu cukup
 * menambahkan nama fixture di parameternya, mis.:
 *
 *   tc('IMG-10', 'generate gambar', { tokens: true }, async ({ imageGen, funded }) => { ... });
 *   // otomatis SKIP kalau saldo token 0
 *
 * Pasangan fixture:
 *   funded      <-> unfunded      (punya token   <-> tidak punya token)
 *   connected   <-> unconnected   (ada platform  <-> tanpa platform sosial)
 *   withContent <-> noContent     (ada konten    <-> belum ada konten)
 */
import type { Page } from '@playwright/test';
import { DashboardPage } from '../pages/dashboard-page';
import { pagesTest } from './pages';

/** Kondisi akun yang dibaca dari Dashboard. */
interface AccountSnapshot {
  /** Saldo token. */
  tokens: number;
  /** True = sudah ada platform sosial terhubung. */
  connected: boolean;
  /** Jumlah konten. */
  content: number;
}

/**
 * Baca kondisi akun dari Dashboard, lalu kembali ke halaman semula.
 * Kembali ke halaman asal penting supaya urutan fixture (halaman vs kondisi) tidak memengaruhi test.
 */
async function readAccount(app: Page): Promise<AccountSnapshot> {
  const backTo = app.url().startsWith('http') ? app.url() : null;
  const dashboard = await new DashboardPage(app).open();
  const snapshot: AccountSnapshot = {
    tokens: await dashboard.tokenBalance(),
    connected: (await dashboard.notConnectedBanner.count()) === 0, // banner "belum terhubung" tidak ada = sudah terhubung
    content: await dashboard.contentTotal(),
  };
  if (backTo) await app.goto(backTo);
  return snapshot;
}

export interface AccountFixtures {
  /** Saldo token awal. Test di-skip kalau saldo 0. */
  funded: number;
  /** Test di-skip kalau akun masih punya token (untuk test "token tidak mencukupi"). */
  unfunded: void;
  /** Test di-skip kalau belum ada platform sosial terhubung. */
  connected: void;
  /** Test di-skip kalau sudah ada platform terhubung (untuk test "tanpa platform"). */
  unconnected: void;
  /** Jumlah konten. Test di-skip kalau akun belum punya konten. */
  withContent: number;
  /** Test di-skip kalau akun sudah punya konten (untuk test state kosong). */
  noContent: void;
}

export const accountTest = pagesTest.extend<AccountFixtures>({
  funded: async ({ app }, use, testInfo) => {
    const { tokens } = await readAccount(app);
    testInfo.skip(tokens <= 0, 'Akun QA tidak punya saldo token');
    await use(tokens);
  },
  unfunded: async ({ app }, use, testInfo) => {
    const { tokens } = await readAccount(app);
    testInfo.skip(tokens > 0, 'Akun QA masih punya token; butuh akun dengan saldo tidak cukup');
    await use();
  },
  connected: async ({ app }, use, testInfo) => {
    const { connected } = await readAccount(app);
    testInfo.skip(!connected, 'Akun QA belum menghubungkan platform sosial (mis. TikTok)');
    await use();
  },
  unconnected: async ({ app }, use, testInfo) => {
    const { connected } = await readAccount(app);
    testInfo.skip(connected, 'Akun QA sudah punya platform terhubung');
    await use();
  },
  withContent: async ({ app }, use, testInfo) => {
    const { content } = await readAccount(app);
    testInfo.skip(content <= 0, 'Akun QA belum punya konten');
    await use(content);
  },
  noContent: async ({ app }, use, testInfo) => {
    const { content } = await readAccount(app);
    testInfo.skip(content > 0, 'Akun QA sudah punya konten');
    await use();
  },
});
