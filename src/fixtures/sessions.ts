/**
 * Fixture "sesi browser": tab siap pakai untuk test.
 *
 * Alur singkat (baca dari atas ke bawah):
 *   1. `loginState()`  -> login SEKALI per akun, simpan "tiket masuk" (cookies) ke folder auth/.
 *   2. `app` / `anon` / `userB` / `newUser` -> tiap test mendapat tab baru yang bersih memakai tiket itu.
 *   3. Setelah test selesai, tab ditutup. Kalau test gagal, screenshot dan trace otomatis masuk ke laporan HTML.
 *
 * Cara memakai di test: cukup tulis nama fixture di parameter, mis. `async ({ app }) => { ... }`.
 *   app      = tab yang SUDAH login sebagai akun QA utama (paling sering dipakai)
 *   anon     = tab TANPA login
 *   userB    = tab yang login sebagai akun kedua
 *   newUser  = tab yang login sebagai akun yang belum onboarding
 */
import { test as base, type Browser, type BrowserContext, type Page, type TestInfo } from '@playwright/test';
import fs from 'node:fs';
import { AUTH_DIR, authFile, credentials, env, type Role } from '../config/env';
import { AuthPage } from '../pages/auth-page';

/** Sesi login dianggap masih segar selama 20 menit. */
const STATE_MAX_AGE_MS = 20 * 60_000;

/** Satu sesi browser: tab + cara menutupnya. */
export interface Session {
  page: Page;
  close: () => Promise<void>;
}

/** Pilihan saat membuka sesi. */
interface SessionOptions {
  /** Path file sesi login (cookies). Kosong = belum login. */
  storageState?: string;
  /** Bahasa browser. Dipaksa 'en-US' untuk halaman Google dan Mailsac supaya teksnya sama di semua komputer. */
  locale?: string;
  /** Pakai alamat staging sebagai baseURL. */
  withBaseUrl?: boolean;
  /** Batas tunggu aksi (ms). */
  timeoutMs?: number;
}

/**
 * Buka konteks browser baru (= profil bersih) beserta satu tab.
 * Kalau test gagal, screenshot dan trace dilampirkan ke laporan HTML (direkam otomatis oleh Playwright).
 */
export async function openSession(browser: Browser, options: SessionOptions = {}): Promise<Session> {
  const info = base.info();
  // Video selalu direkam ke folder khusus test ini; nasibnya ditentukan di `close` di bawah.
  const videoDir = info.outputPath(`video-${++sessionCounter}`);
  const context: BrowserContext = await browser.newContext({
    storageState: options.storageState,
    locale: options.locale,
    baseURL: options.withBaseUrl === false ? undefined : env.baseUrl,
    recordVideo: { dir: videoDir, size: { width: 1280, height: 720 } },
  });
  context.setDefaultTimeout(options.timeoutMs ?? env.defaultTimeoutMs);
  context.setDefaultNavigationTimeout(20_000); // staging kadang lambat memuat halaman
  const page = await context.newPage();

  // Trace dan screenshot saat test gagal direkam otomatis oleh Playwright (lihat `use` di playwright.config.ts).
  // Video dikelola di sini: file video baru lengkap setelah konteks ditutup. Kalau test GAGAL video
  // dilampirkan ke laporan HTML (dan tersimpan di test-results/); kalau lolos video dibuang.
  const close = async () => {
    await context.close();
    const failed = info.status !== info.expectedStatus && info.status !== 'skipped';
    const videos = fs.existsSync(videoDir) ? fs.readdirSync(videoDir).filter((f) => f.endsWith('.webm')) : [];
    if (failed) {
      for (const file of videos) {
        await info.attach(`video-${file}`, { path: `${videoDir}/${file}`, contentType: 'video/webm' });
      }
    } else {
      fs.rmSync(videoDir, { recursive: true, force: true });
    }
  };
  return { page, close };
}

/** Penomoran folder video, supaya beberapa tab dalam satu test tidak saling menimpa. */
let sessionCounter = 0;

/**
 * Login lewat form email+password lalu simpan sesinya ke auth/<peran>.json.
 * Dengan begitu ratusan test tidak perlu login satu per satu. File sesi dipakai ulang selama masih segar.
 * Kalau kredensial akun itu belum diisi di .env, test yang membutuhkannya di-skip (bukan error).
 */
export async function loginState(browser: Browser, role: Role, testInfo: TestInfo): Promise<string> {
  const { email, password } = credentials(role);
  if (!email || !password) testInfo.skip(true, `Kredensial akun '${role}' belum diisi di .env`);

  const file = authFile(role);
  const fresh = fs.existsSync(file) && Date.now() - fs.statSync(file).mtimeMs < STATE_MAX_AGE_MS;
  if (fresh) return file;

  fs.mkdirSync(AUTH_DIR, { recursive: true });
  const context = await browser.newContext({ baseURL: env.baseUrl });
  context.setDefaultTimeout(env.defaultTimeoutMs);
  context.setDefaultNavigationTimeout(20_000);
  const page = await context.newPage();
  try {
    const auth = new AuthPage(page);
    await auth.openLogin();
    await auth.login(email, password);
    await context.storageState({ path: file }); // simpan cookies + localStorage
  } finally {
    await context.close();
  }
  return file;
}

/** Fixture yang disediakan file ini. */
export interface SessionFixtures {
  app: Page;
  anon: Page;
  userB: Page;
  newUser: Page;
}

/** Buat fixture tab yang login sebagai `role`. */
function loggedInFixture(role: Role) {
  return async ({ browser }: { browser: Browser }, use: (page: Page) => Promise<void>, testInfo: TestInfo) => {
    const session = await openSession(browser, { storageState: await loginState(browser, role, testInfo) });
    await use(session.page);
    await session.close();
  };
}

export const sessionsTest = base.extend<SessionFixtures>({
  app: loggedInFixture('default'),
  userB: loggedInFixture('userB'),
  newUser: loggedInFixture('newUser'),
  anon: async ({ browser }, use) => {
    const session = await openSession(browser);
    await use(session.page);
    await session.close();
  },
});
