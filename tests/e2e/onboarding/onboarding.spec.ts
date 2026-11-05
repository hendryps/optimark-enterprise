/**
 * Onboarding (ONB-01 .. ONB-19) — sheet "e2e-onboarding".
 *
 * Semua test memakai akun yang BELUM onboarding (NEW_USER_EMAIL / NEW_USER_PASSWORD di .env),
 * jadi otomatis di-skip kalau akun itu belum disiapkan. Test yang menyelesaikan onboarding
 * (ONB-17, ONB-18) bersifat destructive karena akun hanya bisa onboarding sekali.
 */
import { expect, meta, test } from '../../../src/fixtures';
import { rx } from '../../../src/utils/text';

/** Teks 501 karakter untuk menguji batas 500 karakter. */
const LONG_TEXT = 'a'.repeat(501);

test.describe('Onboarding', () => {
  test('ONB-01 akses halaman onboarding', async ({ onboarding }) => {
    // Setelah login pertama pengguna diarahkan ke onboarding dan field tampil.
    await onboarding.expectStillOnOnboarding();
    await expect(onboarding.industry).toBeVisible();
    await expect(onboarding.finishButton).toBeVisible();
  });

  test('ONB-02 input nama perusahaan', async ({ onboarding }) => {
    // Nama Perusahaan tampil utuh tanpa pesan validasi.
    await onboarding.company.fill('PT Kopi Nusantara');
    await onboarding.company.blur();
    await expect(onboarding.company).toHaveValue('PT Kopi Nusantara');
  });

  test('ONB-03 validasi nama perusahaan kosong', async ({ onboarding }) => {
    // Submit tanpa Nama Perusahaan ditolak dan tetap di onboarding.
    await onboarding.pickIndustry('Tech');
    await onboarding.finishButton.click();
    await onboarding.expectStillOnOnboarding();
    await onboarding.expectText('required', 'wajib');
  });

  test('ONB-04 pilih bidang industri', async ({ onboarding }) => {
    // Industri yang dipilih tampil sebagai pilihan aktif.
    await onboarding.pickIndustry('Tech');
    await expect(onboarding.industry).toContainText(rx('Tech', 'Teknologi'));
  });

  test('ONB-05 validasi bidang industri', async ({ onboarding }) => {
    // Submit tanpa Bidang Industri ditolak.
    await onboarding.company.fill('PT Kopi Nusantara');
    await onboarding.finishButton.click();
    await onboarding.expectStillOnOnboarding();
    await onboarding.expectText('required', 'wajib', 'select', 'pilih');
  });

  test('ONB-06 input website valid', async ({ onboarding }) => {
    // URL valid tampil utuh tanpa error format.
    await onboarding.website.fill('https://www.kopinusantara.com');
    await onboarding.website.blur();
    await expect(onboarding.website).toHaveValue('https://www.kopinusantara.com');
    await expect(onboarding.page.getByText(rx('invalid', 'tidak valid'))).toHaveCount(0);
  });

  test('ONB-07 validasi website tidak valid', async ({ onboarding }) => {
    // Website 'kopi nusantara' ditolak dengan pesan format URL.
    await onboarding.fillRequired();
    await onboarding.website.fill('kopi nusantara');
    await onboarding.finishButton.click();
    await onboarding.expectStillOnOnboarding();
    await onboarding.expectText('invalid', 'valid URL', 'tidak valid', 'format');
  });

  test('ONB-08 input deskripsi dan counter', async ({ onboarding }) => {
    // Penghitung karakter berubah mengikuti input.
    await onboarding.description.fill('Brand kopi lokal dengan cita rasa khas Nusantara');
    await onboarding.expectText('48', '/ 500', '/500');
  });

  test('ONB-09 batas 500 karakter', async ({ onboarding }) => {
    // Deskripsi maksimal 500 karakter.
    await onboarding.description.fill(LONG_TEXT);
    const value = await onboarding.description.inputValue();
    expect(value.length, `Field menerima ${value.length} karakter`).toBeLessThanOrEqual(500);
  });

  test('ONB-10 input tagline', async ({ onboarding }) => {
    // Tagline tampil utuh tanpa validasi.
    await onboarding.tagline.fill('Setiap tegukan adalah cerita');
    await onboarding.tagline.blur();
    await expect(onboarding.tagline).toHaveValue('Setiap tegukan adalah cerita');
  });

  test('ONB-11 upload logo PNG', async ({ onboarding, files }) => {
    // Logo PNG valid diterima (nama/preview tampil).
    await onboarding.upload(files.png);
    await expect(
      onboarding.page.getByText('logo.png').or(onboarding.page.getByRole('img', { name: rx('logo', 'preview') })).first(),
    ).toBeVisible();
  });

  test(
    'ONB-12 upload logo drag and drop',
    meta({ skip: 'Drag and drop file dari OS tidak bisa disimulasikan andal di Playwright; uji manual' }),
    async () => {},
  );

  test('ONB-13 format logo tidak didukung', async ({ onboarding, files }) => {
    // PDF ditolak dengan pesan format yang didukung.
    await onboarding.upload(files.pdf);
    await onboarding.expectText('SVG', 'PNG', 'format');
    await expect(onboarding.page.getByText('dokumen.pdf')).toHaveCount(0);
  });

  test('ONB-14 ukuran logo lebih dari 2 MB', async ({ onboarding, files }) => {
    // Logo > 2 MB ditolak dengan pesan ukuran maksimal.
    await onboarding.upload(files.big);
    await onboarding.expectText('2 MB', '2MB');
  });

  test('ONB-15 primary color', async ({ onboarding }) => {
    // Primary Color #80C342 tampil di field.
    await onboarding.pickColor('Primary', '#80C342');
    await expect(onboarding.page.getByLabel(rx('Primary')).first()).toHaveValue(rx('80C342'));
  });

  test('ONB-16 secondary color', async ({ onboarding }) => {
    // Secondary Color #2E5E1A tampil di field.
    await onboarding.pickColor('Secondary', '#2E5E1A');
    await expect(onboarding.page.getByLabel(rx('Secondary')).first()).toHaveValue(rx('2E5E1A'));
  });

  test('ONB-17 submit data minimum', meta({ destructive: true }), async ({ onboarding }) => {
    // Hanya field wajib -> onboarding selesai, ke dashboard.
    await onboarding.fillRequired();
    await onboarding.finishButton.click();
    await onboarding.expectUrlContains('/dashboard');
  });

  test('ONB-18 submit seluruh data', meta({ destructive: true }), async ({ onboarding, files }) => {
    // Semua field valid -> tersimpan, ke dashboard tanpa error.
    await onboarding.fillRequired();
    await onboarding.website.fill('https://www.kopinusantara.com');
    await onboarding.description.fill('Brand kopi lokal dengan cita rasa khas Nusantara');
    await onboarding.tagline.fill('Setiap tegukan adalah cerita');
    await onboarding.upload(files.png);
    await onboarding.pickColor('Primary', '#80C342');
    await onboarding.pickColor('Secondary', '#2E5E1A');
    await onboarding.finishButton.click();
    await onboarding.expectUrlContains('/dashboard');
  });

  test('ONB-19 logout dari onboarding', async ({ onboarding }) => {
    // Logout mengakhiri sesi; onboarding tidak bisa dibuka tanpa login.
    await onboarding.button('Logout', 'Log out', 'Sign out', 'Keluar').first().click();
    const confirm = onboarding.button('Logout', 'Log out', 'Yes', 'Ya', 'Confirm');
    if (await confirm.count()) await confirm.last().click();
    await onboarding.expectUrlContains('/login');
    await onboarding.goto('/');
    await onboarding.expectUrlContains('/login');
  });
});
