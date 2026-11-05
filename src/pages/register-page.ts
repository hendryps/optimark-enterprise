/** Page object halaman Register (/register) dan halaman Verifikasi Email (/verify-email). */
import { expect, test, type Locator } from '@playwright/test';
import type { DummyUser } from '../utils/mailsac';
import { rx } from '../utils/text';
import { AuthPage } from './auth-page';

/** Pesan batas percobaan dari server ("Too many attempts. Please try again in 895 seconds."). */
export const RATE_LIMIT = rx('Too many attempts');

/** Halaman Register: form 4 kolom (Full Name, Email, Password, Confirm Password). */
export class RegisterPage extends AuthPage {
  /** Kolom Full Name. */
  get fullName(): Locator {
    return this.page.getByPlaceholder('Enter your full name');
  }

  /** Kolom Email. (Dinamai emailField karena `email` di AuthPage adalah kolom login.) */
  get emailField(): Locator {
    return this.page.getByPlaceholder('name@email.com');
  }

  /** Kolom Password. */
  get passwordField(): Locator {
    return this.page.getByPlaceholder('Create a password');
  }

  /** Kolom Confirm Password. */
  get confirmPassword(): Locator {
    return this.page.getByPlaceholder('Re-enter your password');
  }

  /** Tombol 'Create account'. */
  get createButton(): Locator {
    return this.buttonExact('Create account');
  }

  /** Tombol 'Resend verification email' (muncul di layar "cek email Anda"). */
  get resendButton(): Locator {
    return this.button('Resend verification email');
  }

  /** Buka /register dan tunggu form tampil. */
  async open(): Promise<this> {
    await this.openRegister();
    await expect(this.fullName).toBeVisible();
    return this;
  }

  /** Isi form. Kalau `confirm` tidak diisi, dipakai password yang sama. Kolom kosong dilewati. */
  async fillForm(name = '', email = '', password = '', confirm?: string): Promise<void> {
    const confirmValue = confirm ?? password;
    const fields: [Locator, string][] = [
      [this.fullName, name],
      [this.emailField, email],
      [this.passwordField, password],
      [this.confirmPassword, confirmValue],
    ];
    for (const [field, value] of fields) {
      if (value) await field.fill(value);
    }
  }

  /** Isi form lalu klik Create account TANPA menunggu hasil (untuk skenario negatif). */
  async submitForm(name = '', email = '', password = '', confirm?: string): Promise<void> {
    await this.fillForm(name, email, password, confirm);
    await this.createButton.click();
  }

  /** Daftarkan akun dummy sampai layar "cek email" tampil. Di-skip kalau kena batas percobaan server. */
  async register(user: DummyUser): Promise<void> {
    await this.submitForm(user.fullName, user.email, user.password);
    await this.expectCheckEmailScreen();
  }

  /**
   * Pendaftaran diterima server -> layar "cek email" (ada tombol Resend verification email).
   *
   * Kalau server membalas 'Too many attempts' (dibatasi ~15 menit), test di-SKIP, bukan gagal,
   * karena itu batas server staging, bukan bug fitur.
   */
  async expectCheckEmailScreen(): Promise<void> {
    const done = this.resendButton.or(this.page.getByText(RATE_LIMIT));
    await expect(done.first()).toBeVisible({ timeout: 20_000 });
    if (await this.page.getByText(RATE_LIMIT).count()) {
      test.skip(true, "Server staging membatasi percobaan registrasi ('Too many attempts'). Ulangi ~15 menit lagi.");
    }
  }

  /** True kalau browser menolak isi kolom (validasi bawaan HTML: kosong / format email salah). */
  async fieldIsInvalid(field: Locator): Promise<boolean> {
    return field.evaluate((el) => !(el as HTMLInputElement).validity.valid);
  }

  /** Form ditolak: masih di /register dan tombol Create account masih ada (tidak pindah layar). */
  async expectStillOnForm(): Promise<void> {
    await this.expectUrlContains('/register');
    await expect(this.createButton).toBeVisible();
  }
}

/** Halaman /verify-email?token=... (dibuka dari link di email verifikasi). */
export class VerifyEmailPage extends AuthPage {
  /** Kolom password: pemilik akun memasukkan password-nya untuk mengaktifkan akun. */
  get passwordInput(): Locator {
    return this.page.getByPlaceholder('Enter your password');
  }

  /**
   * Tombol verifikasi. Labelnya di staging masih 'verify.verifyButton' (kunci terjemahan bocor),
   * jadi dicari secara longgar.
   */
  get verifyButton(): Locator {
    return this.page.getByRole('button').filter({ hasText: rx('verify', 'Verifikasi') });
  }

  /** Buka link verifikasi di TAB BARU; mengembalikan page object untuk tab baru itu. */
  async openLink(link: string): Promise<VerifyEmailPage> {
    const newTab = new VerifyEmailPage(await this.page.context().newPage());
    await newTab.page.goto(link);
    return newTab;
  }

  /** Isi password lalu klik tombol verifikasi TANPA menunggu hasil (untuk skenario gagal). */
  async submitPassword(password: string): Promise<void> {
    await expect(this.passwordInput).toBeVisible({ timeout: 20_000 });
    await this.passwordInput.fill(password);
    await this.verifyButton.click();
  }

  /** Isi password lalu klik verifikasi. Berhasil = otomatis login dan masuk ke /onboarding. */
  async verify(password: string): Promise<void> {
    await this.submitPassword(password);
    await expect(this.page).toHaveURL(rx('/onboarding', '/dashboard'), { timeout: 20_000 });
  }
}
