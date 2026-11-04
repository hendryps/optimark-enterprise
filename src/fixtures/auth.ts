/**
 * Fixture khusus test Login / Register / Lupa Password.
 *
 * Termasuk akses ke inbox Mailsac (untuk membaca email verifikasi dan reset password)
 * dan satu akun dummy yang dibagi ke banyak test (lihat src/utils/new-account.ts).
 */
import { credentials } from '../config/env';
import { AuthPage } from '../pages/auth-page';
import { ForgotPasswordPage, ResetPasswordPage } from '../pages/forgot-password-page';
import { RegisterPage } from '../pages/register-page';
import { Mailsac, type DummyUser } from '../utils/mailsac';
import { NewAccount } from '../utils/new-account';
import { accountTest } from './account-state';
import { openSession } from './sessions';

export interface AuthFixtures {
  /** Email + password akun QA utama dari .env. Test di-skip kalau belum diisi. */
  account: { email: string; password: string };
  /** Email + password akun Google dari .env. Test di-skip kalau belum diisi. */
  googleAccount: { email: string; password: string };
  /** Halaman Login (belum login) dengan bahasa browser dipaksa English (US), supaya pesan error Google selalu sama. */
  googleAuth: AuthPage;
  /** Tab terpisah untuk membuka mailsac.com dan membaca email (tab Optimark tetap di tab lain). */
  mailbox: Mailsac;
  /** Halaman Register (belum login), belum dibuka. */
  registerPage: RegisterPage;
  /** Halaman Forgot Password (belum login), belum dibuka. */
  forgotPage: ForgotPasswordPage;
  /** Halaman Reset Password (belum dibuka; dibuka dari link di email). */
  resetPage: ResetPasswordPage;
  /** Akun dummy yang dibagi ke semua test dalam satu run. */
  newAccount: NewAccount;
  /** Akun dummy yang SUDAH terdaftar dan terverifikasi (dibuat otomatis kalau belum ada). */
  verifiedUser: DummyUser;
}

export const authTest = accountTest.extend<AuthFixtures>({
  account: async ({}, use, testInfo) => {
    const account = credentials('default');
    testInfo.skip(!(account.email && account.password), 'USER_EMAIL / USER_PASSWORD belum diisi di .env');
    await use(account);
  },

  googleAccount: async ({}, use, testInfo) => {
    const account = credentials('google');
    testInfo.skip(!(account.email && account.password), 'GOOGLE_EMAIL / GOOGLE_PASSWORD belum diisi di .env');
    await use(account);
  },

  googleAuth: async ({ browser }, use) => {
    // Halaman Google menampilkan tulisan sesuai bahasa browser; dipaksa English supaya selalu sama.
    const session = await openSession(browser, { locale: 'en-US' });
    await use(new AuthPage(session.page));
    await session.close();
  },

  mailbox: async ({ browser }, use) => {
    const session = await openSession(browser, { locale: 'en-US', withBaseUrl: false, timeoutMs: 30_000 });
    await use(new Mailsac(session.page));
    await session.close();
  },

  registerPage: async ({ anon }, use) => use(new RegisterPage(anon)),
  forgotPage: async ({ anon }, use) => use(new ForgotPasswordPage(anon)),
  resetPage: async ({ anon }, use) => use(new ResetPasswordPage(anon)),

  newAccount: async ({}, use) => use(NewAccount.load()),

  verifiedUser: async ({ newAccount, anon, mailbox }, use) => {
    await use(await newAccount.ensureVerified(anon, mailbox));
  },
});
