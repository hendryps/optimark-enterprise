/** Page object halaman Login (/login) dan Register (/register). */
import { expect, test, type Locator } from '@playwright/test';
import { rx } from '../utils/text';
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
    // Tunggu salah satu: masuk ke aplikasi, ATAU pesan batas percobaan dari server.
    const entered = rx('/dashboard', '/onboarding');
    await Promise.race([
      this.page.waitForURL(entered, { timeout: 20_000 }),
      this.rateLimitMessage.first().waitFor({ timeout: 20_000 }),
    ]).catch(() => {}); // kegagalan sebenarnya dilaporkan oleh expect di bawah
    await this.skipIfRateLimited();
    await expect(this.page).toHaveURL(entered, { timeout: 5_000 });
  }

  /** Pesan batas percobaan dari server, mis. "Too many attempts. Please try again in 898 seconds." */
  get rateLimitMessage(): Locator {
    return this.page.getByText(rx('Too many attempts', 'Terlalu banyak percobaan'));
  }

  /** Server staging membatasi percobaan login (~15 menit). Itu bukan bug fitur, jadi test di-SKIP, bukan gagal. */
  async skipIfRateLimited(): Promise<void> {
    if (await this.rateLimitMessage.count()) {
      test.skip(true, "Server staging membatasi percobaan login ('Too many attempts'). Ulangi ~15 menit lagi.");
    }
  }

  /**
   * Pastikan login DITOLAK dengan pesan error (banner merah). `message` opsional: kalau diisi, isi banner dicek.
   * Kalau yang tampil justru pesan batas percobaan, test di-SKIP.
   */
  async expectRejected(message?: RegExp): Promise<void> {
    await expect(this.errorBanner.or(this.rateLimitMessage).first()).toBeVisible();
    await this.skipIfRateLimited();
    if (message) await expect(this.errorBanner).toContainText(message);
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
  /** Komponen halaman Login (LOGIN-01). */
  async expectLoginPage(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: rx('Welcome Back', 'Selamat Datang') })).toBeVisible();
    await expect(this.googleButton).toBeVisible();
    await expect(this.page.getByRole('link', { name: rx('Register', 'Sign up', 'Daftar') })).toBeVisible();
    await expect(this.page.getByRole('link', { name: rx('Privacy Policy') })).toBeVisible();
    await expect(this.page.getByRole('img', { name: 'Optimark' })).toBeVisible(); // logo
  }

  /** Komponen halaman Register (REG-01). */
  async expectRegisterPage(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: rx('Create Account', 'Buat Akun') })).toBeVisible();
    await expect(this.googleButton).toBeVisible();
    await expect(this.page.getByRole('link', { name: rx('Sign in', 'Login', 'Masuk') })).toBeVisible();
    await expect(this.page.getByRole('link', { name: rx('Privacy Policy') })).toBeVisible();
    await expect(this.page.getByRole('img', { name: 'Optimark' })).toBeVisible(); // logo
  }
}
