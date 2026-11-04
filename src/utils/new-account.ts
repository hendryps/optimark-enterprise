/**
 * NewAccount: satu akun dummy yang dipakai bersama oleh banyak test dalam SATU kali run.
 *
 * Kenapa dibagi? Server staging membatasi jumlah registrasi (rate limit ~15 menit), jadi akun
 * didaftarkan SEKALI lalu dipakai test lain (verifikasi, login, reset password).
 * Tiap langkah dikerjakan hanya kalau belum pernah dikerjakan, jadi aman dijalankan berurutan
 * maupun sendiri-sendiri.
 *
 * Playwright memulai ulang proses test setelah ada test yang gagal, sehingga variabel di memori hilang.
 * Karena itu status akun disimpan ke file `auth/new-account.json` dan dibaca lagi di tiap test.
 * File ini dihapus otomatis di awal setiap run (lihat src/config/global-setup.ts).
 */
import { expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { AUTH_DIR } from '../config/env';
import { AuthPage } from '../pages/auth-page';
import { ForgotPasswordPage, ResetPasswordPage } from '../pages/forgot-password-page';
import { OnboardingPage } from '../pages/onboarding-page';
import { RegisterPage, VerifyEmailPage } from '../pages/register-page';
import { extractLink, makeDummyUser, Mailsac, NEW_PASSWORD, type DummyUser } from './mailsac';

/** Subjek email dari Optimark (nama brand di email masih "Digimar", jadi dicocokkan dengan pola). */
export const VERIFY_SUBJECT = 'Verify your .* account';
export const RESET_SUBJECT = 'Reset your .* password';

/** Lokasi file penyimpan status akun dummy. */
export const NEW_ACCOUNT_FILE = path.join(AUTH_DIR, 'new-account.json');

/** Data yang disimpan ke file (semua bisa diubah-ubah oleh langkah-langkah di bawah). */
interface AccountState {
  user: DummyUser;
  registered: boolean;
  verified: boolean;
  /** Isi email verifikasi. */
  verifyMail: string | null;
  /** Link reset terakhir dari email. */
  resetLink: string | null;
  /** Isi layar "cek email" tepat setelah daftar. */
  checkEmailText: string;
  /** True = onboarding selesai dan sudah sampai dashboard. */
  onDashboard: boolean;
  /** Link reset yang sudah terpakai untuk ganti password. */
  usedLink: string;
  /** True = link reset terakhir sudah dipakai (tidak berlaku lagi). */
  resetUsed: boolean;
  /** True = password sudah diganti lewat reset. */
  passwordChanged: boolean;
  /** Password sebelum diganti. */
  oldPassword: string;
}

export class NewAccount {
  private constructor(private state: AccountState) {}

  /** Baca akun dari file; kalau belum ada, buat akun dummy baru. */
  static load(): NewAccount {
    if (fs.existsSync(NEW_ACCOUNT_FILE)) {
      return new NewAccount(JSON.parse(fs.readFileSync(NEW_ACCOUNT_FILE, 'utf8')) as AccountState);
    }
    const fresh = new NewAccount({
      user: makeDummyUser(),
      registered: false,
      verified: false,
      verifyMail: null,
      resetLink: null,
      checkEmailText: '',
      onDashboard: false,
      usedLink: '',
      resetUsed: false,
      passwordChanged: false,
      oldPassword: '',
    });
    fresh.save();
    return fresh;
  }

  /** Hapus file status (dipanggil di awal run supaya tiap run memakai akun baru). */
  static reset(): void {
    fs.rmSync(NEW_ACCOUNT_FILE, { force: true });
  }

  /** Simpan status terbaru ke file. */
  private save(): void {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
    fs.writeFileSync(NEW_ACCOUNT_FILE, JSON.stringify(this.state, null, 2), 'utf8');
  }

  // ---------------------------------------------------------------- data (hanya baca)
  get user(): DummyUser { return this.state.user; }
  get registered(): boolean { return this.state.registered; }
  get verified(): boolean { return this.state.verified; }
  get checkEmailText(): string { return this.state.checkEmailText; }
  get onDashboard(): boolean { return this.state.onDashboard; }
  get usedLink(): string { return this.state.usedLink; }
  get passwordChanged(): boolean { return this.state.passwordChanged; }
  get oldPassword(): string { return this.state.oldPassword; }
  get resetUsed(): boolean { return this.state.resetUsed; }

  /** Tandai link reset terakhir sudah terpakai / tidak berlaku lagi (supaya test berikutnya meminta link baru). */
  markResetUsed(): void {
    this.state.resetUsed = true;
    this.save();
  }

  // ---------------------------------------------------------------- langkah 1: daftar
  /** Daftarkan akun lewat form Register. */
  async register(registerPage: RegisterPage): Promise<void> {
    await (await registerPage.open()).register(this.state.user);
    this.state.registered = true;
    this.state.checkEmailText = await registerPage.page.innerText('body');
    this.save();
  }

  // ---------------------------------------------------------------- langkah 2: baca email verifikasi
  /** Tunggu email verifikasi masuk ke Mailsac lalu kembalikan isinya. */
  async readVerifyMail(mailbox: Mailsac): Promise<string> {
    if (this.state.verifyMail === null) {
      this.state.verifyMail = await mailbox.waitForMail(this.state.user.email, VERIFY_SUBJECT);
      this.save();
    }
    return this.state.verifyMail;
  }

  // ---------------------------------------------------------------- langkah 3: verifikasi
  /**
   * Salin link verifikasi dari email, buka di TAB BARU, isi password -> otomatis login (/onboarding).
   * Mengembalikan page object tab baru itu supaya test bisa memeriksanya.
   */
  async verify(verifyPage: VerifyEmailPage, mailbox: Mailsac): Promise<VerifyEmailPage> {
    const link = extractLink(await this.readVerifyMail(mailbox), 'verify-email');
    const tab = await verifyPage.openLink(link);
    await tab.verify(this.state.user.password);
    this.state.verified = true;
    this.save();
    return tab;
  }

  /** Pastikan akun sudah terdaftar + terverifikasi (mengerjakan langkah yang belum). */
  async ensureVerified(anonPage: Page, mailbox: Mailsac): Promise<DummyUser> {
    if (!this.state.registered) await this.register(new RegisterPage(anonPage));
    if (!this.state.verified) await this.verify(new VerifyEmailPage(anonPage), mailbox);
    return this.state.user;
  }

  // ---------------------------------------------------------------- onboarding
  /** Login dengan password yang sedang berlaku; kalau diarahkan ke /onboarding, isi lengkap sampai masuk /dashboard. */
  async ensureDashboard(page: Page, loginPage: AuthPage): Promise<void> {
    await loginPage.openLogin();
    await loginPage.login(this.state.user.email, this.state.user.password);
    if (page.url().includes('/onboarding')) await new OnboardingPage(page).completeBusinessProfile();
    await expect(page).toHaveURL(/\/dashboard/);
    this.state.onDashboard = true;
    this.save();
  }

  // ---------------------------------------------------------------- reset password
  /**
   * Pastikan ada link reset yang MASIH BERLAKU (minta + baca emailnya kalau belum ada / sudah terpakai).
   * `fresh = true` memaksa minta link baru.
   */
  async ensureResetLink(forgotPage: ForgotPasswordPage, mailbox: Mailsac, fresh = false): Promise<string> {
    if (this.state.resetLink === null || this.state.resetUsed || fresh) {
      const before = await mailbox.countMails(this.state.user.email, RESET_SUBJECT);
      await (await forgotPage.open()).requestResetPatiently(this.state.user.email);
      await forgotPage.expectEmailSent();
      const body = await mailbox.waitForMail(this.state.user.email, RESET_SUBJECT, before);
      this.state.resetLink = extractLink(body, 'reset-password');
      this.state.resetUsed = false;
      this.save();
    }
    return this.state.resetLink as string;
  }

  /** Pastikan password akun sudah diganti ke NEW_PASSWORD lewat link reset. */
  async ensurePasswordReset(forgotPage: ForgotPasswordPage, resetPage: ResetPasswordPage, mailbox: Mailsac): Promise<void> {
    if (this.state.passwordChanged) return;
    const link = await this.ensureResetLink(forgotPage, mailbox);
    await resetPage.openLink(link);
    await resetPage.save(NEW_PASSWORD);
    await expect(resetPage.page).toHaveURL(/\/login\?reset=success/, { timeout: 30_000 });
    this.state.resetUsed = true;
    this.state.usedLink = link; // link yang sudah dipakai (untuk test "link tidak bisa dipakai dua kali")
    this.state.passwordChanged = true;
    this.state.oldPassword = this.state.user.password;
    this.state.user = { ...this.state.user, password: NEW_PASSWORD };
    this.save();
  }
}
