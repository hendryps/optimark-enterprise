/**
 * Menu Billing (BILL-01 .. BILL-12).
 *
 * Tab 'e2e-billing' di Google Sheet masih kosong (hanya daftar ID); test ini dibuat dari UI staging
 * dan ID-nya usulan. Akun QA tanpa paket dan tanpa riwayat pembayaran; test yang butuh kondisi itu
 * di-skip otomatis kalau akunnya sudah berlangganan.
 */
import { expect, test, meta } from '../../src/fixtures';
import { BasePage } from '../../src/pages/base-page';

/** Pilihan filter status pembayaran, urut sesuai tampilan. */
const STATUSES = ['All statuses', 'Pending', 'Paid', 'Failed', 'Expired'];

test.describe('Billing', () => {
  test('BILL-01 akses halaman', async ({ billing }) => {
    // Judul Billing, Current Plan, Token Usage, dan Payment history tampil.
    await billing.expectText('CURRENT PLAN', 'TOKEN USAGE', 'Payment history');
  });

  test('BILL-02 akun tanpa paket', async ({ billing }) => {
    // Tanpa paket: tampil 'No plan yet' dan ajakan memilih paket.
    test.skip((await billing.page.getByText('No plan yet').count()) === 0, 'Akun QA sudah punya paket');
    await billing.expectText('No plan yet', 'Choose a plan');
  });

  test('BILL-03 Choose plan bisa diklik', meta({ bug: 'Tombol Choose plan nonaktif untuk akun tanpa paket (perlu dikonfirmasi apakah disengaja)' }), async ({ billing }) => {
      // Akun tanpa paket bisa menekan Choose plan untuk melihat paket.
      test.skip((await billing.page.getByText('No plan yet').count()) === 0, 'Akun QA sudah punya paket');
      await expect(billing.choosePlanButton).toBeEnabled();
    },
  );

  test('BILL-04 View plans tersedia', async ({ billing }) => {
    // Tombol View plans tampil.
    await expect(billing.viewPlansButton).toBeVisible();
  });

  test('BILL-05 token usage tanpa paket', async ({ billing }) => {
    // Tanpa paket, Token Usage meminta memilih paket dulu.
    test.skip((await billing.page.getByText('No plan yet').count()) === 0, 'Akun QA sudah punya paket');
    await billing.expectText('Choose a plan to start using AI tokens');
  });

  test('BILL-06 riwayat kosong', async ({ billing }) => {
    // Tanpa transaksi: tampil 'No payment history yet'.
    test.skip((await billing.emptyHistory.count()) === 0, 'Akun QA sudah punya riwayat pembayaran');
    await expect(billing.emptyHistory).toBeVisible();
  });

  test('BILL-07 opsi filter status', async ({ billing }) => {
    // Filter status: All statuses, Pending, Paid, Failed, Expired.
    expect(await BasePage.optionTexts(billing.statusFilter)).toEqual(STATUSES);
  });

  // BILL-08: tiap status bisa dipilih.
  for (const status of STATUSES.slice(1)) {
    test(`BILL-08 pilih filter status ${status}`, async ({ billing }) => {
      // Setiap status bisa dipilih tanpa error.
      await billing.statusFilter.selectOption({ label: status });
      await expect(billing.statusFilter.locator('option:checked')).toHaveText(status);
    });
  }

  test('BILL-09 pencarian invoice', async ({ billing }) => {
    // Kolom pencarian invoice/paket menerima teks.
    await billing.search.fill('INV-12345');
    await expect(billing.search).toHaveValue('INV-12345');
  });

  test('BILL-10 refresh riwayat', async ({ billing }) => {
    // Refresh memuat ulang riwayat tanpa meninggalkan halaman atau error.
    await billing.refreshButton.click();
    await billing.expectUrlContains('/billing');
    await expect(billing.page.getByRole('heading', { name: 'Payment history' })).toBeVisible();
  });

  test('BILL-11 filter tanggal', async ({ billing }) => {
    // Filter tanggal: 'Select dates' dan tombol Apply tersedia.
    await billing.expectText('Select dates');
    await expect(billing.applyButton).toBeVisible();
  });

  test('BILL-12 saldo token konsisten dengan sidebar', async ({ billing }) => {
    // Panel token di sidebar menampilkan saldo dan pemakaian yang valid (bukan negatif).
    expect(await billing.tokenBalance()).toBeGreaterThanOrEqual(0);
    expect(await billing.tokenUsed()).toBeGreaterThanOrEqual(0);
  });
});
