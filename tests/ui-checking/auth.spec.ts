/**
 * UI CHECKING: Auth (AUCK-01 .. AUCK-45)
 *
 * TUJUAN: memeriksa tampilan dan alur halaman Login, Register, Forgot Password, dan Verify Email di STAGING
 *         sesuai mind map QA Auth (route, prasyarat, state yang dicek, tag test).
 *
 * Sumber teks: tests/ui-compare/design-spec.ts (objek AUTH, versi English dan Bahasa Indonesia).
 * Test fungsi yang lebih rinci (validasi password satu per satu, reset password sampai login) ada di
 * tests/e2e/auth/*.spec.ts. File ini fokus ke TAMPILAN tiap langkah + alur utama dari mind map.
 *
 * PRASYARAT: semua test memakai tab BELUM LOGIN (fixture `anon`: konteks baru tanpa storageState),
 *   kecuali AUCK-11 yang login dengan akun QA dari .env.
 *
 * TAG (dari mind map QA):
 *   @auto-ui       = elemen form login/register/forgot, pesan validasi, ganti bahasa (aman, run default)
 *   @cek-tampil    = hanya cek tombol tampil + mengarah ke Google (tidak login Google sungguhan)
 *   @mailsac       = perlu bantuan: membaca email verifikasi / reset password di Mailsac
 *   @destructive   = membuat akun baru (email unik Mailsac). Tidak ikut `npm run test:ui`;
 *                    jalankan dengan `npm run test:ui:destructive -- auth.spec.ts`
 *
 * BATAS SERVER: staging membatasi percobaan login/registrasi (~15 menit). Kalau muncul "Too many attempts",
 *   test di-SKIP (bukan gagal). Test ini sengaja memakai sesedikit mungkin percobaan login salah.
 *
 * Jalankan:
 *   npm run test:ui -- auth.spec.ts
 *   npm run test:ui -- --grep "AUCK-10"
 *   npm run test:ui:destructive -- auth.spec.ts      (+ alur daftar, verifikasi email, reset password)
 */
import type { Locator, Page } from '@playwright/test';
import { expect, meta, test } from '../../src/fixtures';
import { ResetPasswordPage } from '../../src/pages/forgot-password-page';
import { VerifyEmailPage } from '../../src/pages/register-page';
import { extractLink } from '../../src/utils/mailsac';
import { escapeRegex } from '../../src/utils/text';
import { AUTH, type Label } from '../ui-compare/design-spec';
import {
  expectTidy, expectTouchTargets, expectWithinScreen, VIEWPORTS,
} from '../ui-compare/responsive-helpers';
import { exactRx, textRx } from '../ui-compare/ui-helpers';

// =====================================================================================
// Helper
// =====================================================================================
type Lang = 'id' | 'en';

/** Nama kolom isian (label + tanda wajib "*"), mis. "Password *" atau "Kata Sandi *". Bahasa mana pun. */
const fieldRx = (label: Label): RegExp => new RegExp(`${exactRx(label).source.slice(0, -1)}(?:\\*\\s*)?$`, 'i');
/** Seperti fieldRx, tetapi HANYA satu bahasa (untuk test ganti bahasa). */
const fieldIn = (label: Label, lang: Lang): RegExp => new RegExp(`^\\s*${escapeRegex(label[lang])}\\s*\\*?\\s*$`, 'i');
/** Teks persis satu bahasa. */
const textIn = (label: Label, lang: Lang): RegExp => new RegExp(`^\\s*${escapeRegex(label[lang])}\\s*$`, 'i');

const field = (page: Page, label: Label): Locator => page.getByRole('textbox', { name: fieldRx(label) });
const button = (page: Page, label: Label): Locator => page.getByRole('button', { name: exactRx(label) });
const link = (page: Page, label: Label): Locator => page.getByRole('link', { name: exactRx(label) });
const heading = (page: Page): Locator => page.getByRole('heading', { level: 1 });
const languageSelect = (page: Page): Locator => page.getByRole('combobox', { name: textRx(AUTH.language.label) });

/** Ganti bahasa lewat pemilih di pojok halaman, tunggu <html lang> berubah. */
async function setLanguage(page: Page, lang: Lang): Promise<void> {
  await languageSelect(page).selectOption({ label: lang === 'id' ? AUTH.language.indonesian : AUTH.language.english });
  await expect(page.locator('html')).toHaveAttribute('lang', lang);
}

/** Pesan batas percobaan server -> skip (bukan bug fitur). */
const RATE_LIMIT = /too many attempts|terlalu banyak percobaan/i;
async function skipIfRateLimited(page: Page): Promise<void> {
  test.skip((await page.getByText(RATE_LIMIT).count()) > 0, "Server staging membatasi percobaan ('Too many attempts'). Ulangi ~15 menit lagi.");
}

/** True kalau browser menolak isi kolom (validasi bawaan HTML: wajib diisi / format email). */
const isInvalid = (l: Locator): Promise<boolean> => l.evaluate((el) => !(el as HTMLInputElement).validity.valid);

/** Posisi vertikal elemen (untuk cek urutan atas -> bawah). */
async function topOf(l: Locator): Promise<number> {
  return (await l.boundingBox())?.y ?? Number.NaN;
}

/** Status centang tiap aturan password (true = hijau/terpenuhi), urutan sesuai AUTH.register.rules. */
async function passwordRuleStates(page: Page, lang: Lang): Promise<(boolean | null)[]> {
  const labels = AUTH.register.rules.map((r) => r[lang].toLowerCase());
  return page.locator('form').first().evaluate((form, texts) => texts.map((t) => {
    const span = Array.from(form.querySelectorAll('span')).find((s) => (s.textContent ?? '').trim().toLowerCase().startsWith(t));
    if (!span) return null;
    const dot = span.previousElementSibling;
    return /bg-green/.test(dot?.getAttribute('class') ?? '');
  }), labels);
}

/** Email unik yang PASTI belum terdaftar (untuk layar "Email Sent" tanpa mengirim email sungguhan). */
const unknownEmail = (): string => `qa.tidak.terdaftar.${Date.now()}@mailsac.com`;

/**
 * Temuan yang SUDAH terkonfirmasi di staging. Kunci: "AUCK-nomor" atau "AUCK-nomor|ukuran layar".
 * Test-nya diharapkan gagal (label bug + alasan di laporan). Kalau dev memperbaiki, hapus barisnya.
 */
const TOUCH_AUTH = 'Area sentuh < 32px: pemilih bahasa (tinggi 18px), tautan "Forgot password?" (20px), "Privacy Policy & Data Deletion" (18px)';
const KNOWN_BUGS: Record<string, string> = {
  'AUCK-33': 'Di mode Bahasa Indonesia pesan login salah tetap berbahasa Inggris: "Invalid email or password"',
  'AUCK-34': 'aria-label "Show password" dan "Clear input" tidak diterjemahkan di mode Bahasa Indonesia',
  'AUCK-35': 'Mode Indonesia mencampur istilah: label "Kata Sandi", tetapi placeholder "Masukkan password Anda" / "Buat password" dan pesan "Password wajib diisi."',
  'AUCK-45|desktop 1440': TOUCH_AUTH,
  'AUCK-45|tablet 768': TOUCH_AUTH,
  'AUCK-45|handphone 390': TOUCH_AUTH,
  'AUCK-45|handphone kecil 360': TOUCH_AUTH,
  'AUCK-45|handphone landscape 844': TOUCH_AUTH,
};
const known = (key: string) => meta(KNOWN_BUGS[key] ? { bug: KNOWN_BUGS[key] } : {});

test.describe('UI Checking - Auth', () => {
  // ===================================================================================
  // A. ROUTE DAN PRASYARAT (belum login)
  // ===================================================================================
  test.describe('A. Route dan prasyarat', { tag: '@auto-ui' }, () => {
    test('AUCK-01 route /login menampilkan halaman Login', known('AUCK-01'), async ({ auth }) => {
      const page = auth.page;
      await auth.openLogin();
      await expect(page).toHaveURL(/\/login\/?$/);
      await expect(heading(page)).toHaveText(exactRx(AUTH.login.heading));
      await expect.soft(page).toHaveTitle(/optimark/i);
    });

    test('AUCK-02 route /register menampilkan halaman Register', known('AUCK-02'), async ({ auth }) => {
      const page = auth.page;
      await auth.openRegister();
      await expect(page).toHaveURL(/\/register\/?$/);
      await expect(heading(page)).toHaveText(exactRx(AUTH.register.heading));
    });

    test('AUCK-03 route /forgot-password menampilkan halaman Reset Password', known('AUCK-03'), async ({ forgotPage }) => {
      const page = forgotPage.page;
      await forgotPage.goto('/forgot-password');
      await expect(page).toHaveURL(/\/forgot-password\/?$/);
      await expect(heading(page)).toHaveText(exactRx(AUTH.forgot.heading));
    });

    test('AUCK-04 route /verify-email: tanpa token gagal, dengan token minta password', known('AUCK-04'), async ({ auth }) => {
      // Mind map: /verify-email dibuka dari link di email. Tanpa token -> "Verification failed" + form kirim ulang.
      // Dengan token -> form password + tombol Verify Email (token palsu, tidak disubmit).
      const page = auth.page;
      await auth.goto('/verify-email');
      await expect(heading(page)).toHaveText(exactRx(AUTH.verify.failedHeading));
      await expect.soft(page.getByText(textRx(AUTH.verify.tokenMissing))).toBeVisible();
      await expect.soft(field(page, AUTH.register.email)).toBeVisible();
      await expect.soft(button(page, AUTH.verify.resend)).toBeVisible();
      await expect.soft(link(page, AUTH.forgot.back)).toHaveAttribute('href', /\/login/);

      await auth.goto('/verify-email?token=qa-token-palsu');
      await expect(heading(page)).toHaveText(exactRx(AUTH.verify.heading));
      await expect.soft(page.getByText(textRx(AUTH.verify.subtitle))).toBeVisible();
      await expect.soft(field(page, AUTH.login.password)).toHaveAttribute('type', 'password');
      await expect.soft(button(page, AUTH.verify.submit)).toBeVisible();
    });

    test('AUCK-05 belum login: halaman privat diarahkan ke /login', known('AUCK-05'), async ({ auth }) => {
      // Mind map prasyarat: belum login (konteks baru tanpa storageState).
      const page = auth.page;
      await auth.goto('/dashboard');
      await expect(page).toHaveURL(/\/login/, { timeout: 20_000 });
      await expect(heading(page)).toHaveText(exactRx(AUTH.login.heading));
    });
  });

  // ===================================================================================
  // B. LOGIN (Google dan email/username + password)
  // ===================================================================================
  test.describe('B. Login', { tag: '@auto-ui' }, () => {
    test.beforeEach(async ({ auth }) => {
      await auth.openLogin();
      await expect(heading(auth.page)).toBeVisible();
    });

    test('AUCK-06 elemen halaman Login lengkap dan berurutan', known('AUCK-06'), async ({ auth }) => {
      const page = auth.page;
      const l = AUTH.login;
      const items: [string, Locator][] = [
        ['logo', page.getByRole('img', { name: AUTH.logoAlt })],
        ['judul', heading(page)],
        ['subjudul', page.getByText(textRx(l.subtitle))],
        ['Continue with Google', button(page, AUTH.google)],
        ['pemisah "atau masuk dengan email"', page.getByText(textRx(l.divider))],
        ['kolom email/username', field(page, l.email)],
        ['kolom password', field(page, l.password)],
        ['tombol Sign In', button(page, l.submit)],
        ['tautan Register', link(page, l.register)],
        ['footer', page.getByText(textRx(AUTH.footer))],
      ];
      for (const [name, loc] of items) await expect.soft(loc, `${name} tampil`).toBeVisible();
      await expect.soft(languageSelect(page), 'Pemilih bahasa tampil').toBeVisible();
      await expect.soft(link(page, l.forgot), 'Tautan lupa password').toBeVisible();
      await expect.soft(page.getByText(textRx(l.noAccount))).toBeVisible();
      await expect.soft(link(page, AUTH.privacy)).toHaveAttribute('href', /privacy/);
      const tops = await Promise.all(items.map(([, loc]) => topOf(loc)));
      const order = items.map(([n], i) => `${n}@${Math.round(tops[i])}`).join(' | ');
      expect.soft(tops.every((y, i) => i === 0 || y >= tops[i - 1] - 1), `Urutan atas -> bawah: ${order}`).toBe(true);
    });

    test('AUCK-07 atribut kolom login (wajib, autocomplete, placeholder, password tersembunyi)', known('AUCK-07'), async ({ auth }) => {
      const page = auth.page;
      const email = field(page, AUTH.login.email);
      const password = field(page, AUTH.login.password);
      await expect.soft(email).toHaveAttribute('required', '');
      await expect.soft(email).toHaveAttribute('autocomplete', 'username');
      await expect.soft(email).toHaveAttribute('placeholder', textRx(AUTH.login.emailPlaceholder));
      await expect.soft(password).toHaveAttribute('required', '');
      await expect.soft(password).toHaveAttribute('type', 'password');
      await expect.soft(password).toHaveAttribute('autocomplete', 'current-password');
      await expect.soft(password).toHaveAttribute('placeholder', textRx(AUTH.login.passwordPlaceholder));
      await expect.soft(email, 'Kolom email kosong di awal').toHaveValue('');
    });

    test('AUCK-08 tombol mata menampilkan dan menyembunyikan password', known('AUCK-08'), async ({ auth }) => {
      const page = auth.page;
      const password = field(page, AUTH.login.password);
      await password.fill('Rahasia#123');
      const eye = page.getByRole('button', { name: textRx(AUTH.showPassword) }).first();
      await eye.click();
      await expect.soft(password, 'Password terlihat setelah klik mata').toHaveAttribute('type', 'text');
      await eye.click();
      await expect.soft(password, 'Password tersembunyi lagi').toHaveAttribute('type', 'password');
      await expect.soft(password, 'Isi tidak hilang saat berpindah tampilan').toHaveValue('Rahasia#123');
    });

    test('AUCK-09 form kosong menampilkan pesan wajib diisi di bawah kolom', known('AUCK-09'), async ({ auth }) => {
      // Mind map state: form kosong dan validasi field wajib.
      const page = auth.page;
      await button(page, AUTH.login.submit).click();
      await expect.soft(page.getByText(textRx(AUTH.login.emailRequired))).toBeVisible();
      await expect.soft(page.getByText(textRx(AUTH.login.passwordRequired))).toBeVisible();
      await expect.soft(field(page, AUTH.login.email)).toHaveAttribute('aria-invalid', 'true');
      await expect.soft(field(page, AUTH.login.password)).toHaveAttribute('aria-invalid', 'true');
      await auth.expectNotLoggedIn();
    });

    test('AUCK-10 login tidak berhasil menampilkan pesan error', known('AUCK-10'), async ({ auth }) => {
      // Mind map: login tidak berhasil -> tampil pesan error, tetap di /login, isi email tidak hilang.
      const page = auth.page;
      await field(page, AUTH.login.email).fill(unknownEmail());
      await field(page, AUTH.login.password).fill('SalahSekali#123');
      await button(page, AUTH.login.submit).click();
      await expect(page.getByText(textRx(AUTH.login.invalid)).or(page.getByText(RATE_LIMIT)).first()).toBeVisible({ timeout: 20_000 });
      await skipIfRateLimited(page);
      await auth.expectNotLoggedIn();
      await expect.soft(field(page, AUTH.login.email), 'Email yang diketik tidak hilang').not.toHaveValue('');
      await expectTidy(page, 'Halaman login dengan pesan error');
    });

    test('AUCK-11 login berhasil masuk Dashboard', known('AUCK-11'), async ({ auth, account }) => {
      // Mind map: login berhasil -> masuk Dashboard (akun QA dari .env, sudah onboarding).
      await auth.login(account.email, account.password);
      await expect(auth.page).toHaveURL(/\/dashboard/);
    });

    test('AUCK-12 tautan Forgot password dan Register', known('AUCK-12'), async ({ auth }) => {
      const page = auth.page;
      await link(page, AUTH.login.forgot).click();
      await expect(page).toHaveURL(/\/forgot-password/);
      await expect(heading(page)).toHaveText(exactRx(AUTH.forgot.heading));
      await auth.openLogin();
      await link(page, AUTH.login.register).click();
      await expect(page).toHaveURL(/\/register/);
      await expect(heading(page)).toHaveText(exactRx(AUTH.register.heading));
    });

    test('AUCK-13 Continue with Google mengarah ke halaman Google', { tag: '@cek-tampil' }, async ({ auth }) => {
      // Mind map: cek tampil saja. Tidak login Google sungguhan, hanya memastikan diarahkan ke accounts.google.com.
      const page = auth.page;
      await button(page, AUTH.google).click();
      await expect(page).toHaveURL(/accounts\.google\.com/, { timeout: 20_000 });
      expect.soft(decodeURIComponent(page.url()), 'Kembali ke staging setelah login Google').toContain('staging-app.optimark.ai');
    });
  });

  // ===================================================================================
  // C. FORGOT PASSWORD
  // ===================================================================================
  test.describe('C. Forgot Password', { tag: '@auto-ui' }, () => {
    test.beforeEach(async ({ forgotPage }) => {
      await forgotPage.open();
    });

    test('AUCK-14 elemen halaman Reset Password', known('AUCK-14'), async ({ forgotPage }) => {
      const page = forgotPage.page;
      const f = AUTH.forgot;
      await expect.soft(heading(page)).toHaveText(exactRx(f.heading));
      await expect.soft(page.getByText(textRx(f.subtitle))).toBeVisible();
      const email = field(page, f.email);
      await expect.soft(email).toHaveAttribute('type', 'email');
      await expect.soft(email).toHaveAttribute('required', '');
      await expect.soft(email).toHaveAttribute('placeholder', textRx(AUTH.register.emailPlaceholder));
      await expect.soft(button(page, f.submit)).toBeVisible();
      await expect.soft(link(page, f.back)).toHaveAttribute('href', /\/login/);
      await expect.soft(languageSelect(page)).toBeVisible();
    });

    test('AUCK-15 email kosong ditolak', known('AUCK-15'), async ({ forgotPage }) => {
      const page = forgotPage.page;
      await button(page, AUTH.forgot.submit).click();
      expect.soft(await isInvalid(field(page, AUTH.forgot.email)), 'Kolom email ditandai tidak valid').toBe(true);
      await expect(heading(page), 'Tetap di form').toHaveText(exactRx(AUTH.forgot.heading));
    });

    test('AUCK-16 format email salah ditolak', known('AUCK-16'), async ({ forgotPage }) => {
      const page = forgotPage.page;
      await field(page, AUTH.forgot.email).fill('salahformat');
      await button(page, AUTH.forgot.submit).click();
      expect.soft(await isInvalid(field(page, AUTH.forgot.email)), 'Format tanpa @ ditolak').toBe(true);
      await expect(heading(page), 'Tetap di form').toHaveText(exactRx(AUTH.forgot.heading));
    });

    test('AUCK-17 Send Email menampilkan layar Email Sent dengan hitung mundur', known('AUCK-17'), async ({ forgotPage }) => {
      // Mind map: input email lalu Send Email. Email yang belum terdaftar tetap mendapat layar yang sama
      // (tidak membocorkan email mana yang terdaftar) dan tidak ada email sungguhan yang dikirim.
      const page = forgotPage.page;
      await field(page, AUTH.forgot.email).fill(unknownEmail());
      await button(page, AUTH.forgot.submit).click();
      await expect(heading(page).or(page.getByText(RATE_LIMIT)).first()).toHaveText(new RegExp(`${exactRx(AUTH.forgot.sentHeading).source}|${RATE_LIMIT.source}`, 'i'), { timeout: 20_000 });
      await skipIfRateLimited(page);
      await expect.soft(page.getByText(textRx(AUTH.forgot.sentMessage))).toBeVisible();
      const resend = page.getByRole('button', { name: AUTH.forgot.resendCountdown });
      await expect.soft(resend, 'Tombol kirim ulang dengan hitung mundur').toBeVisible();
      await expect.soft(resend, 'Kirim ulang nonaktif selama hitung mundur').toBeDisabled();
      await expect.soft(link(page, AUTH.forgot.back)).toBeVisible();
    });

    test('AUCK-18 Back to sign in kembali ke Login', known('AUCK-18'), async ({ forgotPage }) => {
      const page = forgotPage.page;
      await link(page, AUTH.forgot.back).click();
      await expect(page).toHaveURL(/\/login/);
      await expect(heading(page)).toHaveText(exactRx(AUTH.login.heading));
    });
  });

  // ===================================================================================
  // D. REGISTER (form; tanpa membuat akun)
  // ===================================================================================
  test.describe('D. Register', { tag: '@auto-ui' }, () => {
    test.beforeEach(async ({ registerPage }) => {
      await registerPage.open();
    });

    test('AUCK-19 elemen halaman Register lengkap dan berurutan', known('AUCK-19'), async ({ registerPage }) => {
      // Mind map: isi form Full Name, Email, Password, Confirm Password lalu Create account.
      const page = registerPage.page;
      const r = AUTH.register;
      const items: [string, Locator][] = [
        ['logo', page.getByRole('img', { name: AUTH.logoAlt })],
        ['judul', heading(page)],
        ['subjudul', page.getByText(textRx(r.subtitle))],
        ['Continue with Google', button(page, AUTH.google)],
        ['pemisah', page.getByText(textRx(r.divider))],
        ['Full Name', field(page, r.fullName)],
        ['Email', field(page, r.email)],
        ['Password', field(page, r.password)],
        ['Confirm Password', field(page, r.confirm)],
        ['Create account', button(page, r.submit)],
        ['tautan Sign In', link(page, r.signIn)],
        ['footer', page.getByText(textRx(AUTH.footer))],
      ];
      for (const [name, loc] of items) await expect.soft(loc, `${name} tampil`).toBeVisible();
      await expect.soft(heading(page)).toHaveText(exactRx(r.heading));
      await expect.soft(page.getByText(textRx(r.haveAccount))).toBeVisible();
      await expect.soft(languageSelect(page)).toBeVisible();
      const tops = await Promise.all(items.map(([, loc]) => topOf(loc)));
      const order = items.map(([n], i) => `${n}@${Math.round(tops[i])}`).join(' | ');
      expect.soft(tops.every((y, i) => i === 0 || y >= tops[i - 1] - 1), `Urutan atas -> bawah: ${order}`).toBe(true);
      await expect.soft(page.getByText(textRx(r.rules[0])), 'Aturan password belum tampil sebelum mengetik').toBeHidden();
    });

    test('AUCK-20 atribut kolom register (wajib, tipe, autocomplete, placeholder)', known('AUCK-20'), async ({ registerPage }) => {
      const page = registerPage.page;
      const r = AUTH.register;
      const spec: [Label, Label, string, string][] = [
        [r.fullName, r.fullNamePlaceholder, 'text', 'name'],
        [r.email, r.emailPlaceholder, 'email', 'email'],
        [r.password, r.passwordPlaceholder, 'password', 'new-password'],
        [r.confirm, r.confirmPlaceholder, 'password', 'new-password'],
      ];
      for (const [label, ph, type, ac] of spec) {
        const f = field(page, label);
        await expect.soft(f, `${label.en} wajib`).toHaveAttribute('required', '');
        await expect.soft(f, `${label.en} tipe`).toHaveAttribute('type', type);
        await expect.soft(f, `${label.en} autocomplete`).toHaveAttribute('autocomplete', ac);
        await expect.soft(f, `${label.en} placeholder`).toHaveAttribute('placeholder', textRx(ph));
        await expect.soft(f, `${label.en} kosong di awal`).toHaveValue('');
      }
    });

    test('AUCK-21 form kosong: semua kolom ditandai wajib, tidak pindah halaman', known('AUCK-21'), async ({ registerPage }) => {
      // Mind map state: form kosong dan validasi field wajib.
      const page = registerPage.page;
      await button(page, AUTH.register.submit).click();
      for (const label of [AUTH.register.fullName, AUTH.register.email, AUTH.register.password, AUTH.register.confirm]) {
        expect.soft(await isInvalid(field(page, label)), `${label.en} ditandai wajib diisi`).toBe(true);
      }
      await registerPage.expectStillOnForm();
    });

    test('AUCK-22 format email salah ditolak', known('AUCK-22'), async ({ registerPage }) => {
      const page = registerPage.page;
      await registerPage.fillForm('Qa Test', 'qa-tanpa-at', 'Kuat#1234a');
      await button(page, AUTH.register.submit).click();
      expect.soft(await isInvalid(field(page, AUTH.register.email)), 'Email tanpa @ ditolak').toBe(true);
      await registerPage.expectStillOnForm();
    });

    test('AUCK-23 aturan password tampil saat mengetik dan centangnya mengikuti isi', known('AUCK-23'), async ({ registerPage }) => {
      // 5 aturan: 8-15 karakter, angka, huruf besar, huruf kecil, simbol. Centang hijau = terpenuhi.
      const page = registerPage.page;
      const pw = field(page, AUTH.register.password);
      await pw.fill('abc');
      for (const rule of AUTH.register.rules) await expect.soft(page.getByText(textRx(rule)).first(), `Aturan "${rule.en}" tampil`).toBeVisible();
      expect.soft(await passwordRuleStates(page, 'en'), '"abc": hanya huruf kecil yang terpenuhi').toEqual([false, false, false, true, false]);
      await pw.fill('Kuat#1234a');
      expect.soft(await passwordRuleStates(page, 'en'), '"Kuat#1234a": semua aturan terpenuhi').toEqual([true, true, true, true, true]);
      await pw.fill('Kuat#1234abcdefgh');
      expect.soft((await passwordRuleStates(page, 'en'))[0], 'Lebih dari 15 karakter: aturan panjang tidak terpenuhi').toBe(false);
      await expectTidy(page, 'Form register dengan daftar aturan password');
    });

    test('AUCK-24 konfirmasi password beda menampilkan pesan', known('AUCK-24'), async ({ registerPage }) => {
      const page = registerPage.page;
      await registerPage.fillForm('Qa Test', `qa.konfirmasi.${Date.now()}@mailsac.com`, 'Kuat#1234a', 'Beda#1234a');
      await button(page, AUTH.register.submit).click();
      await expect(page.getByText(textRx(AUTH.register.mismatch)).or(page.getByText(RATE_LIMIT)).first()).toBeVisible({ timeout: 15_000 });
      await skipIfRateLimited(page);
      await registerPage.expectStillOnForm();
      await expect.soft(field(page, AUTH.register.fullName), 'Isi form tidak hilang').toHaveValue('Qa Test');
    });

    test('AUCK-25 tombol mata di Password dan Confirm Password bekerja sendiri-sendiri', known('AUCK-25'), async ({ registerPage }) => {
      const page = registerPage.page;
      const pw = field(page, AUTH.register.password);
      const confirm = field(page, AUTH.register.confirm);
      await pw.fill('Kuat#1234a');
      await confirm.fill('Kuat#1234a');
      const eyes = page.getByRole('button', { name: textRx(AUTH.showPassword) });
      await expect.soft(eyes, 'Dua tombol mata').toHaveCount(2);
      await eyes.nth(0).click();
      await expect.soft(pw).toHaveAttribute('type', 'text');
      await expect.soft(confirm, 'Confirm tetap tersembunyi').toHaveAttribute('type', 'password');
      await eyes.nth(1).click();
      await expect.soft(confirm).toHaveAttribute('type', 'text');
    });

    test('AUCK-26 tautan Sign In kembali ke Login', known('AUCK-26'), async ({ registerPage }) => {
      const page = registerPage.page;
      await link(page, AUTH.register.signIn).click();
      await expect(page).toHaveURL(/\/login/);
      await expect(heading(page)).toHaveText(exactRx(AUTH.login.heading));
    });

    test('AUCK-27 Register dengan Google mengarah ke halaman Google', { tag: '@cek-tampil' }, async ({ registerPage }) => {
      // Mind map: Register dengan Google (Continue with Google). Cek tampil saja.
      const page = registerPage.page;
      await button(page, AUTH.google).click();
      await expect(page).toHaveURL(/accounts\.google\.com/, { timeout: 20_000 });
    });
  });

  // ===================================================================================
  // E. GANTI BAHASA: English / Bahasa Indonesia
  // ===================================================================================
  test.describe('E. Ganti bahasa', { tag: '@auto-ui' }, () => {
    test('AUCK-28 pemilih bahasa ada di semua halaman auth dengan 2 pilihan', known('AUCK-28'), async ({ auth }) => {
      const page = auth.page;
      for (const path of ['/login', '/register', '/forgot-password', '/verify-email']) {
        await auth.goto(path);
        const select = languageSelect(page);
        await expect.soft(select, `Pemilih bahasa di ${path}`).toBeVisible();
        const options = (await select.locator('option').allInnerTexts()).map((t) => t.trim());
        expect.soft(options, `Pilihan bahasa di ${path}`).toEqual([AUTH.language.english, AUTH.language.indonesian]);
        await expect.soft(select, `Default English di ${path}`).toHaveValue(/en/i);
      }
    });

    test('AUCK-29 Login dalam Bahasa Indonesia', known('AUCK-29'), async ({ auth }) => {
      const page = auth.page;
      await auth.openLogin();
      await setLanguage(page, 'id');
      const l = AUTH.login;
      await expect.soft(heading(page)).toHaveText(textIn(l.heading, 'id'));
      await expect.soft(page.getByText(textIn(l.subtitle, 'id'))).toBeVisible();
      await expect.soft(page.getByRole('button', { name: textIn(AUTH.google, 'id') })).toBeVisible();
      await expect.soft(page.getByRole('textbox', { name: fieldIn(l.email, 'id') })).toHaveAttribute('placeholder', l.emailPlaceholder.id);
      await expect.soft(page.getByRole('textbox', { name: fieldIn(l.password, 'id') })).toBeVisible();
      await expect.soft(page.getByRole('link', { name: textIn(l.forgot, 'id') })).toBeVisible();
      await expect.soft(page.getByRole('button', { name: textIn(l.submit, 'id') })).toBeVisible();
      await expect.soft(page.getByRole('link', { name: textIn(l.register, 'id') })).toBeVisible();
      await expect.soft(page.getByRole('link', { name: textIn(AUTH.privacy, 'id') })).toBeVisible();
      await expect.soft(languageSelect(page), 'Label pemilih ikut berubah').toHaveAccessibleName(textIn(AUTH.language.label, 'id'));
    });

    test('AUCK-30 bahasa tetap saat pindah halaman dan reload', known('AUCK-30'), async ({ auth }) => {
      const page = auth.page;
      await auth.openLogin();
      await setLanguage(page, 'id');
      const checks: [string, Label][] = [
        ['/register', AUTH.register.heading],
        ['/forgot-password', AUTH.forgot.heading],
        ['/verify-email', AUTH.verify.failedHeading],
        ['/verify-email?token=qa-token-palsu', AUTH.verify.heading],
      ];
      for (const [path, h] of checks) {
        await auth.goto(path);
        await expect.soft(heading(page), `Judul ${path} dalam Bahasa Indonesia`).toHaveText(textIn(h, 'id'));
      }
      await page.reload();
      await expect.soft(page.locator('html'), 'Setelah reload tetap Indonesia').toHaveAttribute('lang', 'id');
      await auth.goto('/register');
      const r = AUTH.register;
      for (const label of [r.fullName, r.password, r.confirm]) {
        await expect.soft(page.getByRole('textbox', { name: fieldIn(label, 'id') }), `Kolom ${label.id}`).toBeVisible();
      }
      await expect.soft(page.getByRole('button', { name: textIn(r.submit, 'id') })).toBeVisible();
      await expect.soft(page.getByRole('link', { name: textIn(r.signIn, 'id') })).toBeVisible();
    });

    test('AUCK-31 pesan validasi form login kosong dalam Bahasa Indonesia', known('AUCK-31'), async ({ auth }) => {
      // Mind map state: bahasa English dan Bahasa Indonesia untuk pesan validasi.
      const page = auth.page;
      await auth.openLogin();
      await setLanguage(page, 'id');
      await page.getByRole('button', { name: textIn(AUTH.login.submit, 'id') }).click();
      await expect.soft(page.getByText(textIn(AUTH.login.emailRequired, 'id'))).toBeVisible();
      await expect.soft(page.getByText(textIn(AUTH.login.passwordRequired, 'id'))).toBeVisible();
    });

    test('AUCK-32 aturan password register dalam Bahasa Indonesia', known('AUCK-32'), async ({ registerPage }) => {
      const page = registerPage.page;
      await registerPage.open();
      await setLanguage(page, 'id');
      await page.getByRole('textbox', { name: fieldIn(AUTH.register.password, 'id') }).fill('abc');
      for (const rule of AUTH.register.rules) {
        await expect.soft(page.getByText(new RegExp(`^\\s*${escapeRegex(rule.id)}`, 'i')).first(), `Aturan "${rule.id}"`).toBeVisible();
      }
      expect.soft(await passwordRuleStates(page, 'id'), 'Centang aturan bekerja di Bahasa Indonesia').toEqual([false, false, false, true, false]);
    });

    test('AUCK-33 pesan error login salah dalam Bahasa Indonesia', known('AUCK-33'), async ({ auth }) => {
      const page = auth.page;
      await auth.openLogin();
      await setLanguage(page, 'id');
      await page.getByRole('textbox', { name: fieldIn(AUTH.login.email, 'id') }).fill(unknownEmail());
      await page.getByRole('textbox', { name: fieldIn(AUTH.login.password, 'id') }).fill('SalahSekali#123');
      await page.getByRole('button', { name: textIn(AUTH.login.submit, 'id') }).click();
      const anyError = page.getByText(textRx(AUTH.login.invalid)).or(page.getByText(RATE_LIMIT)).first();
      await expect(anyError).toBeVisible({ timeout: 20_000 });
      await skipIfRateLimited(page);
      await expect(page.getByText(textIn(AUTH.login.invalid, 'en')), 'Pesan error tidak boleh tetap berbahasa Inggris').toHaveCount(0);
    });

    test('AUCK-34 label aksesibilitas ikut diterjemahkan', known('AUCK-34'), async ({ registerPage }) => {
      // Pembaca layar membaca aria-label. Di mode Indonesia tidak boleh tersisa "Show password" / "Clear input".
      const page = registerPage.page;
      await registerPage.open();
      await setLanguage(page, 'id');
      await page.getByRole('textbox', { name: fieldIn(AUTH.register.fullName, 'id') }).fill('Qa Test');
      const english = await page.locator('[aria-label]').evaluateAll((els) => els
        .map((e) => e.getAttribute('aria-label') ?? '')
        .filter((t) => /^(show password|hide password|clear input|language)$/i.test(t.trim())));
      expect(english, `aria-label masih berbahasa Inggris: ${english.join(', ')}`).toEqual([]);
    });

    test('AUCK-35 istilah "Kata Sandi" konsisten di label, placeholder, dan pesan', known('AUCK-35'), async ({ auth }) => {
      // Label memakai "Kata Sandi"; placeholder dan pesan sebaiknya memakai istilah yang sama (bukan "password").
      const page = auth.page;
      const mixed: string[] = [];
      for (const path of ['/login', '/register']) {
        await auth.goto(path);
        if ((await page.locator('html').getAttribute('lang')) !== 'id') await setLanguage(page, 'id');
        if (path === '/login') await page.getByRole('button', { name: textIn(AUTH.login.submit, 'id') }).click();
        const texts = await page.locator('main, body').first().evaluate((root) => [
          ...Array.from(root.querySelectorAll('input')).map((i) => `placeholder "${i.placeholder}"`),
          ...Array.from(root.querySelectorAll('p, span, label, div')).filter((e) => e.children.length === 0).map((e) => `teks "${(e.textContent ?? '').trim()}"`),
        ]);
        mixed.push(...texts.filter((t) => /\bpassword\b/i.test(t)).map((t) => `${path}: ${t}`));
      }
      expect(Array.from(new Set(mixed)), `Masih memakai "password" di mode Indonesia:\n- ${Array.from(new Set(mixed)).join('\n- ')}`).toEqual([]);
    });

    test('AUCK-36 kembali ke English', known('AUCK-36'), async ({ auth }) => {
      const page = auth.page;
      await auth.openLogin();
      await setLanguage(page, 'id');
      await expect(heading(page)).toHaveText(textIn(AUTH.login.heading, 'id'));
      await setLanguage(page, 'en');
      await expect.soft(heading(page)).toHaveText(textIn(AUTH.login.heading, 'en'));
      await expect.soft(page.getByRole('button', { name: textIn(AUTH.login.submit, 'en') })).toBeVisible();
      await expect.soft(page.getByRole('textbox', { name: fieldIn(AUTH.login.email, 'en') })).toBeVisible();
    });
  });

  // ===================================================================================
  // F. ALUR EMAIL: daftar -> verifikasi -> onboarding -> dashboard, dan forgot password (MEMBUAT AKUN BARU)
  //    Akun dummy unik di Mailsac, didaftarkan SEKALI per run (dibagi dengan langkah berikutnya).
  //    Hanya jalan lewat `npm run test:ui:destructive`.
  // ===================================================================================
  test.describe('F. Alur email (akun baru)', { tag: ['@destructive', '@mailsac'] }, () => {
    test('AUCK-37 Create account menampilkan layar cek email', known('AUCK-37'), async ({ registerPage, newAccount }) => {
      // Mind map: isi form -> klik Create account -> (verifikasi email). Email unik via Mailsac.
      test.skip(newAccount.registered, 'Akun dummy run ini sudah terdaftar oleh test lain; layar cek email tidak bisa diulang');
      await newAccount.register(registerPage);
      const page = registerPage.page;
      await expect(button(page, AUTH.register.resend), 'Tombol kirim ulang email verifikasi').toBeVisible();
      await expect.soft(page.getByText(newAccount.user.email).first(), 'Email tujuan ditampilkan').toBeVisible();
      await expectTidy(page, 'Layar cek email');
    });

    test('AUCK-38 email verifikasi masuk dan halaman Verify Email tampil', known('AUCK-38'), async ({ anon, registerPage, newAccount, mailbox }) => {
      // Mind map: verifikasi email (link di email + password). Halaman dari link diperiksa tampilannya dulu.
      test.skip(newAccount.verified, 'Akun dummy run ini sudah terverifikasi');
      if (!newAccount.registered) await newAccount.register(registerPage);
      const body = await newAccount.readVerifyMail(mailbox);
      const verifyLink = extractLink(body, 'verify-email');
      expect.soft(verifyLink, 'Link mengarah ke staging').toContain('/verify-email?token=');
      const tab = await new VerifyEmailPage(anon).openLink(verifyLink); // hanya dilihat, belum disubmit
      await expect(heading(tab.page)).toHaveText(exactRx(AUTH.verify.heading));
      await expect.soft(field(tab.page, AUTH.login.password)).toBeVisible();
      await expect.soft(button(tab.page, AUTH.verify.submit)).toBeVisible();
      await expectTidy(tab.page, 'Halaman Verify Email dari link');
      await tab.page.close();
    });

    test('AUCK-39 verifikasi email lalu onboarding sampai Dashboard', known('AUCK-39'), async ({ anon, registerPage, newAccount, mailbox }) => {
      // Mind map: verifikasi email -> Onboarding -> Dashboard.
      await test.step('Verifikasi: isi password di halaman dari link email', async () => {
        if (!newAccount.verified) {
          if (!newAccount.registered) await newAccount.register(registerPage);
          const tab = await newAccount.verify(new VerifyEmailPage(anon), mailbox);
          await expect(tab.page, 'Setelah verifikasi langsung ke Onboarding').toHaveURL(/\/onboarding/);
        }
      });
      await test.step('Login, isi Onboarding, masuk Dashboard', async () => {
        // Verifikasi otomatis login di konteks yang sama; logout dulu supaya alur login manual benar-benar diuji.
        await anon.context().clearCookies();
        await newAccount.ensureDashboard(anon, registerPage);
        await expect(anon).toHaveURL(/\/dashboard/);
      });
    });

    test('AUCK-40 Forgot Password: link reset dikirim ke email dan halaman reset tampil', known('AUCK-40'), async ({ anon, forgotPage, newAccount, mailbox }) => {
      // Mind map: input email lalu Send Email -> link reset password dikirim ke email. Password TIDAK diganti.
      await newAccount.ensureVerified(anon, mailbox);
      const resetLink = await newAccount.ensureResetLink(forgotPage, mailbox, true);
      expect.soft(resetLink, 'Link reset mengarah ke staging').toMatch(/\/reset-password\?token=/);
      const reset = new ResetPasswordPage(anon);
      await reset.openLink(resetLink);
      await expect.soft(reset.newPassword).toHaveAttribute('type', 'password');
      await expect.soft(reset.confirmPassword).toHaveAttribute('type', 'password');
      await expect.soft(reset.saveButton).toBeVisible();
      await expectTidy(anon, 'Halaman reset password');
    });
  });

  // ===================================================================================
  // G. TABLET & HANDPHONE: halaman auth rapi di layar kecil (dan desktop)
  // ===================================================================================
  const SIZES = [{ name: 'desktop 1440', width: 1440, height: 900 }, ...VIEWPORTS];
  for (const vp of SIZES) {
    test.describe(`G. Tampilan [${vp.name}]`, { tag: '@auto-ui' }, () => {
      const id = (n: number, title: string) => `AUCK-${n} [${vp.name}] ${title}`;
      const k = (n: number) => known(`AUCK-${n}|${vp.name}`);

      test.beforeEach(async ({ anon }) => {
        await anon.setViewportSize({ width: vp.width, height: vp.height });
      });

      test(id(41, 'Login rapi'), k(41), async ({ auth }) => {
        const page = auth.page;
        await auth.openLogin();
        await expect(heading(page)).toBeVisible();
        for (const loc of [field(page, AUTH.login.email), field(page, AUTH.login.password), button(page, AUTH.login.submit), button(page, AUTH.google)]) {
          await loc.scrollIntoViewIfNeeded();
          await expectWithinScreen(page, loc, (await loc.getAttribute('placeholder')) ?? (await loc.innerText()));
        }
        await button(page, AUTH.login.submit).click(); // tampilkan pesan wajib diisi juga
        await expectTidy(page, `Login ${vp.name}`);
      });

      test(id(42, 'Register rapi (dengan daftar aturan password)'), k(42), async ({ registerPage }) => {
        const page = registerPage.page;
        await registerPage.open();
        await field(page, AUTH.register.password).fill('abc');
        for (const loc of [field(page, AUTH.register.fullName), field(page, AUTH.register.confirm), button(page, AUTH.register.submit)]) {
          await loc.scrollIntoViewIfNeeded();
          await expectWithinScreen(page, loc, (await loc.getAttribute('placeholder')) ?? 'Create account');
        }
        await expectTidy(page, `Register ${vp.name}`);
      });

      test(id(43, 'Forgot Password dan layar Email Sent rapi'), k(43), async ({ forgotPage }) => {
        const page = forgotPage.page;
        await forgotPage.open();
        await expectTidy(page, `Forgot Password ${vp.name}`);
        await field(page, AUTH.forgot.email).fill(unknownEmail());
        await button(page, AUTH.forgot.submit).click();
        await expect(page.getByText(textRx(AUTH.forgot.sentMessage)).or(page.getByText(RATE_LIMIT)).first()).toBeVisible({ timeout: 20_000 });
        await skipIfRateLimited(page);
        await expectTidy(page, `Email Sent ${vp.name}`);
      });

      test(id(44, 'Verify Email (tanpa dan dengan token) rapi'), k(44), async ({ auth }) => {
        const page = auth.page;
        await auth.goto('/verify-email');
        await expect(heading(page)).toBeVisible();
        await expectTidy(page, `Verify Email tanpa token ${vp.name}`);
        await auth.goto('/verify-email?token=qa-token-palsu');
        await expect(heading(page)).toBeVisible();
        await expectTidy(page, `Verify Email dengan token ${vp.name}`);
      });

      test(id(45, 'area sentuh cukup besar di Login dan Register'), k(45), async ({ auth }) => {
        const page = auth.page;
        for (const path of ['/login', '/register']) {
          await auth.goto(path);
          await expect(heading(page)).toBeVisible();
          await expectTouchTargets(page, `${path} ${vp.name}`);
        }
      });
    });
  }
});
