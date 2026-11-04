/**
 * Menu Campaign (CAMP-01 .. CAMP-15).
 *
 * BELUM ada di Google Sheet; ID ini usulan dan dibuat dari UI staging.
 * Membuat campaign valid butuh date picker dan meninggalkan data permanen, jadi ditandai destructive.
 */
import { expect, test, meta } from '../../src/fixtures';
import { BasePage } from '../../src/pages/base-page';

test.describe('Campaign', () => {
  test('CAMP-01 akses halaman', async ({ campaign }) => {
    // Judul, tombol Create Campaign, pencarian, dan filter status tampil.
    await expect(campaign.createButton).toBeVisible();
    await expect(campaign.search).toBeVisible();
    await expect(campaign.statusFilter).toBeVisible();
  });

  test('CAMP-02 state kosong', async ({ campaign }) => {
    // Tanpa campaign: tampil 'No campaigns yet' dan ajakan membuat campaign pertama.
    test.skip((await campaign.emptyState.count()) === 0, 'Akun QA sudah punya campaign');
    await expect(campaign.emptyState).toBeVisible();
    await campaign.expectText('Create your first campaign');
  });

  test('CAMP-03 opsi filter status', async ({ campaign }) => {
    // Filter status: All Status, Draft, Active, Paused, Completed, Cancelled.
    expect(await BasePage.optionTexts(campaign.statusFilter)).toEqual([
      'All Status', 'Draft', 'Active', 'Paused', 'Completed', 'Cancelled',
    ]);
  });

  test('CAMP-04 filter status bisa dipilih', async ({ campaign }) => {
    // Memilih status mengubah nilai filter tanpa error.
    await campaign.statusFilter.selectOption({ label: 'Draft' });
    await expect(campaign.statusFilter.locator('option:checked')).toHaveText('Draft');
  });

  test('CAMP-05 pencarian tidak ditemukan', async ({ campaign }) => {
    // Kata kunci tak dikenal: tidak ada campaign yang tampil dan halaman tetap bisa dipakai.
    await campaign.search.fill('zzz-tidak-ada-999');
    await campaign.page.waitForTimeout(1000);
    await expect(campaign.search).toHaveValue('zzz-tidak-ada-999');
    await expect(campaign.createButton).toBeVisible();
  });

  test('CAMP-06 buka form buat campaign', async ({ campaign }) => {
    // Create Campaign membuka /campaign/create (Create New Campaign).
    await campaign.createButton.click();
    await campaign.expectUrlContains('/campaign/create');
    await expect(campaign.page.getByRole('heading', { name: 'Create New Campaign' })).toBeVisible();
  });

  test('CAMP-07 komponen form', async ({ campaign }) => {
    // Form: Campaign Name*, Objective*, Status*, Start Date*, End Date, Cancel, Create Campaign.
    await campaign.openCreate();
    await expect(campaign.nameInput).toBeVisible();
    await campaign.expectText('Campaign Objective', 'Status', 'Start Date', 'End Date');
    await expect(campaign.cancelButton).toBeVisible();
    await expect(campaign.submitButton).toBeVisible();
  });

  test('CAMP-08 opsi objective', async ({ campaign }) => {
    // Objective: Awareness, Engagement, Conversion, Traffic, Lead Generation (default Awareness).
    await campaign.openCreate();
    expect(await BasePage.optionTexts(campaign.objectiveSelect)).toEqual([
      'Awareness', 'Engagement', 'Conversion', 'Traffic', 'Lead Generation',
    ]);
    await expect(campaign.objectiveSelect.locator('option:checked')).toHaveText('Awareness');
  });

  test('CAMP-09 status default draft', async ({ campaign }) => {
    // Status default pada form adalah Draft.
    await campaign.openCreate();
    await expect(campaign.statusSelect.locator('option:checked')).toHaveText('Draft');
  });

  test('CAMP-10 konsistensi bahasa status', meta({
      bug:
        'Label status pada form tercampur bahasa (Aktif, Dijeda, Selesai, Dibatalkan) ' +
        'padahal filter daftar berbahasa Inggris (Active, Paused, Completed, Cancelled)',
    }), async ({ campaign }) => {
      // Label status pada form sama dengan label pada filter daftar.
      const listLabels = (await BasePage.optionTexts(campaign.statusFilter)).filter((t) => t !== 'All Status');
      await campaign.openCreate();
      const formLabels = await BasePage.optionTexts(campaign.statusSelect);
      expect([...formLabels].sort()).toEqual([...listLabels].sort());
    },
  );

  test('CAMP-11 submit kosong ditolak', async ({ campaign }) => {
    // Create Campaign tanpa nama/tanggal tidak membuat campaign dan tetap di form.
    await campaign.openCreate();
    await campaign.submitButton.click({ force: true });
    await campaign.page.waitForTimeout(1000);
    await campaign.expectUrlContains('/campaign/create');
  });

  test('CAMP-12 input nama', async ({ campaign }) => {
    // Nama campaign tampil utuh.
    await campaign.openCreate();
    await campaign.nameInput.fill('Promo Lebaran 2027');
    await expect(campaign.nameInput).toHaveValue('Promo Lebaran 2027');
  });

  test('CAMP-13 batal kembali ke daftar', async ({ campaign }) => {
    // Cancel kembali ke daftar tanpa membuat campaign.
    await campaign.openCreate();
    await campaign.nameInput.fill('Tidak jadi dibuat');
    await campaign.cancelButton.click();
    await campaign.expectUrlContains('/campaign');
    expect(campaign.page.url()).not.toContain('/create');
  });

  test('CAMP-14 tombol back', async ({ campaign }) => {
    // Tombol Back kembali ke daftar campaign.
    await campaign.openCreate();
    await campaign.backButton.click();
    await expect(campaign.page).toHaveURL(/\/campaign\/?$/);
  });

  test('CAMP-15 buat campaign valid', meta({
    destructive: true,
    skip: 'Butuh date picker dan meninggalkan campaign permanen di akun QA',
  }), async () => {});
});
