/**
 * Menu Brand Hub (BRAND-01 .. BRAND-22).
 *
 * BELUM ada di Google Sheet; ID ini usulan dan dibuat dari UI staging.
 * Di staging hanya Overview, Brand Profile, dan Visual Identity yang berfungsi; Customer Profiles,
 * Guardrails, Content Themes, dan Social Links masih "being prepared". Test yang menyimpan
 * perubahan ke akun QA ditandai destructive.
 */
import { BRAND_TABS, COMING_SOON } from '../../src/pages/brand-hub-page';
import { expect, test, meta } from '../../src/fixtures';
import { num, rx } from '../../src/utils/text';

/** Nomor urut dua digit untuk ID test, mis. 3 -> "03". */
test.describe('Brand Hub', () => {
  test('BRAND-01 akses halaman', async ({ brandHub }) => {
    // Ketujuh tab Brand Hub tampil dan Overview aktif.
    for (const name of BRAND_TABS) await expect(brandHub.tab(name)).toBeVisible();
    await expect(brandHub.tab('Overview')).toHaveAttribute('aria-selected', 'true');
  });

  test('BRAND-02 overview meringkas profil', async ({ brandHub }) => {
    // Overview meringkas Brand Profile (nama + tombol Edit) dan menawarkan Add untuk bagian lain.
    await brandHub.expectText('Brand Profile');
    await expect(brandHub.button('Edit').first()).toBeVisible();
    expect(await brandHub.button('Add').count()).toBeGreaterThanOrEqual(1);
  });

  // BRAND-03 .. BRAND-08: setiap tab (selain Overview) bisa dibuka.
  BRAND_TABS.slice(1).forEach((name, index) => {
    test(`BRAND-${num(3 + index)} buka tab ${name}`, async ({ brandHub }) => {
      // Setiap tab bisa dibuka dan menjadi aktif.
      await brandHub.openTab(name);
      await expect(brandHub.tab('Overview')).toHaveAttribute('aria-selected', 'false');
    });
  });

  // BRAND-09 .. BRAND-12: bagian yang belum tersedia.
  COMING_SOON.forEach((name, index) => {
    test(`BRAND-${num(9 + index)} bagian belum tersedia: ${name}`, async ({ brandHub }) => {
      // Bagian yang belum jadi menampilkan 'being prepared' dan tombol Back to Overview yang berfungsi.
      await brandHub.openTab(name);
      await brandHub.expectText('being prepared');
      await brandHub.button('Back to Overview').click();
      await expect(brandHub.tab('Overview')).toHaveAttribute('aria-selected', 'true');
    });
  });

  test('BRAND-13 form brand profile', async ({ brandHub }) => {
    // Brand Profile: Company/Business Name*, Industry*, Fetch from Website, Cancel, Save.
    await brandHub.openTab('Brand Profile');
    await expect(brandHub.company).toBeVisible();
    await brandHub.expectText('Industry');
    await expect(brandHub.button('Fetch from Website')).toBeVisible();
    await expect(brandHub.cancelButton).toBeVisible();
    await expect(brandHub.saveButton).toBeVisible();
  });

  test('BRAND-14 data onboarding terisi', async ({ brandHub }) => {
    // Nama bisnis dari onboarding sudah terisi (tidak diminta isi ulang).
    await brandHub.openTab('Brand Profile');
    await expect(brandHub.company).not.toHaveValue('');
  });

  test('BRAND-15 nama bisnis wajib', async ({ brandHub }) => {
    // Business Name dikosongkan lalu Save: tidak tersimpan dan ada pesan validasi.
    await brandHub.openTab('Brand Profile');
    await brandHub.company.fill('');
    await brandHub.saveButton.click();
    await brandHub.expectText('required', 'wajib', 'Please enter', 'cannot be empty');
  });

  test('BRAND-16 daftar industri', async ({ brandHub }) => {
    // Dropdown Industry menyediakan pilihan industri (mis. E-Commerce & Retail, Fashion & Pakaian).
    await brandHub.openTab('Brand Profile');
    await brandHub.page
      .getByRole('main')
      .getByRole('button', { name: rx('Finance', 'Retail', 'Fashion', 'Event', 'Jasa', 'Food') })
      .first()
      .click();
    await brandHub.expectText('E-Commerce & Retail', 'Fashion & Pakaian');
  });

  test('BRAND-17 batal tidak menyimpan', async ({ brandHub }) => {
    // Mengubah nama lalu Cancel: setelah reload nama tetap yang lama.
    await brandHub.openTab('Brand Profile');
    const original = await brandHub.company.inputValue();
    await brandHub.company.fill(`${original} XYZ`);
    await brandHub.cancelButton.click();
    await brandHub.page.reload();
    await brandHub.openTab('Brand Profile');
    await expect(brandHub.company).toHaveValue(original);
  });

  test('BRAND-18 simpan profil', meta({ destructive: true }), async ({ brandHub }) => {
    // Ubah nama lalu Save: tersimpan (tampil di Overview). Nama dikembalikan di akhir.
    await brandHub.openTab('Brand Profile');
    const original = await brandHub.company.inputValue();
    try {
      await brandHub.company.fill(`${original} QA`);
      await brandHub.saveButton.click();
      await brandHub.page.reload();
      await brandHub.expectText(`${original} QA`);
    } finally {
      await brandHub.openTab('Brand Profile');
      await brandHub.company.fill(original);
      await brandHub.saveButton.click();
    }
  });

  test('BRAND-19 visual identity: aturan logo', async ({ brandHub }) => {
    // Visual Identity menjelaskan format logo (PNG/JPG/SVG/WebP, maks. 2 MB) dan punya Add Color.
    await brandHub.openTab('Visual Identity');
    await brandHub.expectText('PNG, JPG, SVG, or WebP', '2 MB');
    await expect(brandHub.button('Add Color')).toBeVisible();
  });

  test('BRAND-20 logo melebihi 2 MB', async ({ brandHub, files }) => {
    // Logo > 2 MB ditolak dengan pesan ukuran.
    await brandHub.openTab('Visual Identity');
    await brandHub.upload(files.big);
    await brandHub.expectText('2 MB', 'too large', 'terlalu besar');
  });

  test('BRAND-21 logo format tidak didukung', async ({ brandHub, files }) => {
    // PDF ditolak sebagai logo.
    await brandHub.openTab('Visual Identity');
    await brandHub.upload(files.pdf);
    await brandHub.expectText('PNG, JPG, SVG', 'not supported', 'unsupported', 'format');
    await expect(brandHub.page.getByText('dokumen.pdf')).toHaveCount(0);
  });

  test('BRAND-22 upload logo valid', meta({
    destructive: true,
    skip: 'Mengganti logo akun QA secara permanen; belum ada aksi hapus logo yang terverifikasi',
  }), async () => {});
});
