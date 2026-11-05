/** Page object Lupa Password: /forgot-password (minta link) dan /reset-password?token=... (password baru). */
import { expect, type Locator } from '@playwright/test';
import { rx } from '../utils/text';
import { AuthPage } from './auth-page';

/** Halaman /forgot-password: isi email, server mengirim link reset ke email itu. */
export class ForgotPasswordPage extends AuthPage {
  /** Kolom Email. */
  get emailField(): Locator {
    return this.page.getByPlaceholder('name@email.com');
  }

  /** Tombol 'Send Email'. */
  get sendButton(): Locator {
    return this.buttonExact('Send Email');
  }

  /** Tautan 'Back to sign in'. */
  get backToLogin(): Locator {
    return this.page.getByRole('link', { name: rx('Back to sign in') });
  }

  /** Buka /forgot-password dan tunggu kolom email tampil. */
  async open(): Promise<this> {
    await this.goto('/forgot-password');
    await expect(this.emailField).toBeVisible();
    return this;
  }

  /** Isi email (boleh kosong) lalu klik Send Email. */
  async requestReset(email = ''): Promise<void> {
    if (email) await this.emailField.fill(email);
    await this.sendButton.click();
  }

  /**
   * Seperti requestReset, tetapi kalau server membalas 'Too many attempts ... in N seconds'
   * (jeda ~60 detik per email), tunggu N detik lalu coba lagi (maksimal 3 kali).
   */
  async requestResetPatiently(email: string): Promise<void> {
    await this.emailField.fill(email);
    for (let attempt = 0; attempt < 3; attempt++) {
      await this.sendButton.click();
      const limit = this.page.getByText(rx('Too many attempts'));
      const sent = this.page.getByText(rx('Email Sent')).first();
      await expect(limit.or(sent).first()).toBeVisible({ timeout: 20_000 });
      if (!(await limit.count())) return;
      const seconds = Number((await limit.innerText()).match(/(\d+)\s*seconds?/i)?.[1] ?? 60);
      await this.page.waitForTimeout((seconds + 2) * 1000);
    }
  }

  /** Masih di form 'Reset Password' (belum terkirim). */
  async expectForm(): Promise<void> {
    await expect(this.page.getByText(rx('Reset Password')).first()).toBeVisible();
    await expect(this.sendButton).toBeVisible();
  }

  /** Layar 'Email Sent' tampil beserta hitung mundur kirim ulang. */
  async expectEmailSent(): Promise<void> {
    await expect(this.page.getByText(rx('Email Sent')).first()).toBeVisible({ timeout: 20_000 });
    await expect(this.page.getByText(rx('check your email'))).toBeVisible();
    await expect(this.page.getByText(rx('Resend available in'))).toBeVisible();
  }
}

/** Halaman /reset-password?token=... (dibuka dari link di email reset). */
export class ResetPasswordPage extends AuthPage {
  /** Kolom password baru. */
  get newPassword(): Locator {
    return this.page.getByPlaceholder('Create a new password');
  }

  /** Kolom konfirmasi password baru. */
  get confirmPassword(): Locator {
    return this.page.getByPlaceholder('Re-enter your password');
  }

  /** Tombol 'Save'. */
  get saveButton(): Locator {
    return this.buttonExact('Save');
  }

  /** Buka link reset dari email. */
  async openLink(link: string): Promise<void> {
    await this.page.goto(link);
    await expect(this.newPassword).toBeVisible({ timeout: 20_000 });
  }

  /** Isi password baru + konfirmasi (default sama) lalu klik Save. */
  async save(newPassword = '', confirm?: string): Promise<void> {
    const confirmValue = confirm ?? newPassword;
    if (newPassword) await this.newPassword.fill(newPassword);
    if (confirmValue) await this.confirmPassword.fill(confirmValue);
    await this.saveButton.click();
  }
}
