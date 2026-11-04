/** Page object halaman Login (/login) dan Register (/register). */
import { errors, expect, type Locator } from '@playwright/test';
import { rx, rxExact } from '../utils/text';
import { BasePage } from './base-page';

/** Halaman Login dan Register. Staging punya dua cara masuk: Google dan email + password. */
export class AuthPage extends BasePage {
  /** Buka halaman /login. */
  async openLogin(): Promise<this> {
    await this.goto('/login');
    return this;
  }

  /** Buka halaman /register. */
  async openRegister(): Promise<this> {
    await this.goto('/register');
    return this;
  }

  // ---------------------------------------------------------------- elemen form login
  /** Tombol 'Continue with Google'. */
  get googleButton(): Locator {
    return this.button('Continue with Google');
  }

  /** Kolom 'Email or username'. */
  get email(): Locator {
    return this.page.getByRole('textbox', { name: rx('Email or username', 'Email atau username') });
  }

  /** Kolom Password. */
  get password(): Locator {
    return this.page.getByRole('textbox', { name: rx('Password', 'Kata sandi') });
  }

  /** Tombol 'Sign In'. */
  get signInButton(): Locator {
    return this.buttonExact('Sign In', 'Masuk');
  }

  /** Kotak merah di atas form untuk error dari server, mis. 'Invalid email or password'. */
  get errorBanner(): Locator {
    return this.page.locator('div.text-red-500').first();
  }

  /** Ikon mata di dalam kolom Password (membuka/menutup tampilan password). */
  get showPasswordButton(): Locator {
    return this.page.getByRole('button', { name: rx('Show password', 'Hide password') });
  }

  /** Tautan 'Forgot password?'. */
  get forgotPasswordLink(): Locator {
    return this.page.getByRole('link', { name: rx('Forgot password', 'Lupa kata sandi') });
  }

  // ---------------------------------------------------------------- aksi login
  /** Login email + password, lalu tunggu masuk ke aplikasi (dashboard atau onboarding). */
  async login(email: string, password: string): Promise<void> {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.signInButton.click();
    await expect(this.page).toHaveURL(rx('/dashboard', '/onboarding'), { timeout: 30_000 }); // staging kadang lambat
  }

  /**
   * Isi form (kolom yang kosong dibiarkan kosong) lalu klik Sign In TANPA menunggu hasil.
   * Dipakai untuk skenario negatif, jadi tidak mengharapkan berpindah ke dashboard.
   */
  async submit(email = '', password = ''): Promise<void> {
    if (email) await this.email.fill(email);
    if (password) await this.password.fill(password);
    await this.signInButton.click();
  }

  /** Pastikan login TIDAK berhasil: masih di /login dan tombol Sign In masih tampil. */
  async expectNotLoggedIn(): Promise<void> {
    await this.expectUrlContains('/login');
    await expect(this.signInButton).toBeVisible();
  }

  // ---------------------------------------------------------------- pengecekan komponen halaman
  /** Komponen halaman Login (AUTH-06). */
  async expectLoginPage(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: rx('Welcome Back', 'Selamat Datang') })).toBeVisible();
    await expect(this.googleButton).toBeVisible();
    await expect(this.page.getByRole('link', { name: rx('Register', 'Sign up', 'Daftar') })).toBeVisible();
    await expect(this.page.getByRole('link', { name: rx('Privacy Policy') })).toBeVisible();
    await expect(this.page.getByRole('img', { name: 'Optimark' })).toBeVisible(); // logo
  }

  /** Komponen halaman Register (AUTH-01). */
  async expectRegisterPage(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: rx('Create Account', 'Buat Akun') })).toBeVisible();
    await expect(this.googleButton).toBeVisible();
    await expect(this.page.getByRole('link', { name: rx('Sign in', 'Login', 'Masuk') })).toBeVisible();
    await expect(this.page.getByRole('link', { name: rx('Privacy Policy') })).toBeVisible();
    await expect(this.page.getByRole('img', { name: 'Optimark' })).toBeVisible(); // logo
  }

  /**
   * Klik 'Continue with Google' lalu batalkan.
   * Google bisa terbuka sebagai popup (ditutup) atau pindah halaman penuh (kembali ke halaman sebelumnya).
   * Staging memakai pindah halaman penuh.
   */
  async clickGoogleAndClosePopup(): Promise<void> {
    try {
      const [popup] = await Promise.all([this.page.waitForEvent('popup', { timeout: 3000 }), this.googleButton.click()]);
      await popup.close();
    } catch (error) {
      if (!(error instanceof errors.TimeoutError)) throw error;
      // Tidak ada popup -> tombol sudah diklik dan halaman berpindah ke Google
      await this.page.waitForURL(/accounts\.google\.com/);
      await this.page.goBack();
      await expect(this.googleButton).toBeVisible();
    }
  }

  // ---------------------------------------------------------------- login Google (halaman accounts.google.com)
  /** Kolom 'Email or phone' di halaman Google. */
  get googleEmailInput(): Locator {
    return this.page.getByRole('textbox', { name: rx('Email or phone', 'Email atau ponsel') });
  }

  /** Kolom 'Enter your password' di halaman Google. */
  get googlePasswordInput(): Locator {
    return this.page.getByRole('textbox', { name: rx('Enter your password', 'Masukkan sandi Anda') });
  }

  /** Tombol 'Next' / 'Berikutnya' di halaman Google. */
  get googleNextButton(): Locator {
    return this.page.getByRole('button', { name: rxExact('Next', 'Berikutnya') });
  }

  /** Dari /login klik 'Continue with Google' sampai halaman Google tampil. */
  async goToGoogleSignin(): Promise<void> {
    await this.openLogin();
    await this.googleButton.click();
    await this.page.waitForURL(/accounts\.google\.com/, { timeout: 30_000 });
    await expect(this.googleEmailInput).toBeVisible({ timeout: 30_000 });
  }

  /** Langkah 1 di Google: isi email lalu klik Next. */
  async googleEnterEmail(email: string): Promise<void> {
    await this.googleEmailInput.fill(email);
    await this.googleNextButton.click();
  }

  /** Langkah 2 di Google: isi password lalu klik Next (hanya muncul kalau email dikenal). */
  async googleEnterPassword(password: string): Promise<void> {
    await expect(this.googlePasswordInput).toBeVisible({ timeout: 30_000 });
    await this.googlePasswordInput.fill(password);
    await this.googleNextButton.click();
  }

  /** Alur lengkap login Google sampai kembali ke aplikasi Optimark. */
  async loginWithGoogle(email: string, password: string): Promise<void> {
    await this.goToGoogleSignin();
    await this.googleEnterEmail(email);
    await this.googleEnterPassword(password);
    // Setelah Google menerima akun, browser dikembalikan ke staging Optimark
    await expect(this.page).toHaveURL(rx('/dashboard', '/onboarding'), { timeout: 60_000 });
  }
}
