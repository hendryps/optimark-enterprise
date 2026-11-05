/**
 * Image Generator (IMG-01 .. IMG-35) — sheet "e2e-image generator".
 *
 * Akun QA saldo 0 (tombol Generate nonaktif, label '0 tokens left'), jadi test yang benar-benar
 * menghasilkan gambar memakai fixture `funded` + `tokens: true` dan hanya jalan kalau dipilih sengaja:
 *   npm run test:tokens -- tests/e2e/image-generator
 * Test konfigurasi/validasi/UI tidak memakai token.
 */
import { expect, meta, test } from '../../../src/fixtures';
import { num, rx } from '../../../src/utils/text';

const PROMPT = 'Buat poster promosi kopi susu gula aren dengan gaya modern.';
const NEED_TOKEN = 'Butuh saldo token untuk generate';
const INSPIRATION_BUG = 'Gambar di tab Explore tidak bisa diklik';

test.describe('Image Generator', () => {
  test('IMG-01 akses halaman', async ({ imageGen }) => {
    // Explore/History, galeri, prompt, referensi, konfigurasi, token, dan tombol generate tampil.
    const { page } = imageGen;
    await expect(imageGen.tab('Templates', 'Explore', 'Jelajahi')).toBeVisible();
    await expect(imageGen.tab('History', 'Riwayat')).toBeVisible();
    await expect(imageGen.gallery().first()).toBeVisible();
    await expect(imageGen.prompt).toBeVisible();
    await expect(page.getByRole('button', { name: 'Upload image', exact: true })).toBeVisible();
    for (const label of ['Model', 'Orientation', 'Quality', 'Style', 'Number of images']) {
      await expect(imageGen.optionButton(label)).toBeVisible();
    }
    await expect(page.getByRole('button', { name: rx('Remaining balance', 'Saldo') }).first()).toBeVisible(); // panel saldo token
    await expect(imageGen.generateButton).toBeVisible();
  });

  test('IMG-02 tab jelajahi', async ({ imageGen }) => {
    // Tab Explore aktif dan menampilkan galeri inspirasi.
    await imageGen.openTab('History', 'Riwayat');
    await imageGen.openTab('Templates', 'Explore', 'Jelajahi');
    await expect(imageGen.gallery().first()).toBeVisible();
  });

  test('IMG-03 galeri jelajahi', async ({ imageGen }) => {
    // Galeri template memuat banyak kartu dan tombol Load more.
    await expect(imageGen.gallery().first()).toBeVisible();
    expect(await imageGen.gallery().count()).toBeGreaterThanOrEqual(6);
    await expect(imageGen.button('Load more', 'Muat lebih banyak')).toBeVisible();
  });

  test('IMG-04 pilih inspirasi', meta({ bug: INSPIRATION_BUG }), async ({ imageGen }) => {
    // Klik gambar inspirasi membuka detail / menerapkan prompt tanpa generate otomatis.
    const promptBefore = await imageGen.prompt.inputValue();
    await imageGen.gallery().first().click();
    await imageGen.page.waitForTimeout(800);
    const changed =
      (await imageGen.prompt.inputValue()) !== promptBefore || (await imageGen.page.getByRole('dialog').count()) > 0;
    expect(changed, 'Klik gambar tidak membuka detail dan tidak mengisi prompt').toBe(true);
  });

  test('IMG-05 input prompt', async ({ imageGen }) => {
    // Prompt tampil utuh; tombol generate aktif jika syarat terpenuhi (saldo cukup).
    await imageGen.writePrompt(PROMPT);
    await expect(imageGen.prompt).toHaveValue(PROMPT);
  });

  test('IMG-06 prompt kosong', async ({ imageGen }) => {
    // Prompt kosong: tombol generate nonaktif.
    await expect(imageGen.generateButton).toBeDisabled();
  });

  test('IMG-07 prompt spasi', async ({ imageGen }) => {
    // Prompt spasi dianggap kosong: tombol generate tetap nonaktif.
    await imageGen.writePrompt('     ');
    await expect(imageGen.generateButton).toBeDisabled();
  });

  test('IMG-08 prompt multiline', async ({ imageGen }) => {
    // Prompt beberapa baris tersimpan dengan baris yang sama.
    const text = 'Poster kopi susu\nWarna dominan hijau';
    await imageGen.writePrompt(text);
    await expect(imageGen.prompt).toHaveValue(text);
  });

  test('IMG-09 pilih model', async ({ imageGen }) => {
    // Daftar model tampil dan GPT Image 1.5 bisa dipilih.
    const models = await imageGen.options('Model');
    expect(models.some((m) => m.includes('GPT Image 1.5')), models.join(', ')).toBe(true);
    await imageGen.choose('Model', 'GPT Image 1.5');
    expect(await imageGen.current('Model')).toContain('GPT Image 1.5');
  });

  test('IMG-10 rasio 1:1', meta({ tokens: true, skip: NEED_TOKEN }), async () => {});

  // IMG-11 .. IMG-13: pilihan rasio, kualitas, dan style bisa diubah.
  const configCases: [string, string | null][] = [
    ['Orientation', '3:2'],
    ['Quality', 'High'],
    ['Style', null],
  ];
  for (const [index, [label, option]] of configCases.entries()) {
    test(`IMG-${num(11 + index)} konfigurasi dapat diubah: ${label}`, async ({ imageGen }) => {
      // Pilihan rasio/kualitas/style berubah dan tampil pada tombol konfigurasi.
      const options = await imageGen.options(label);
      const current = await imageGen.current(label);
      // Kalau pilihan yang diminta tidak ada (null), ambil pilihan lain yang berbeda dari sekarang.
      const target = option && options.includes(option) ? option : options.find((o) => o !== current);
      expect(target, `Tidak ada pilihan lain untuk ${label}`).toBeTruthy();
      await imageGen.choose(label, target as string);
      expect(await imageGen.current(label)).toContain(target);
    });
  }

  test('IMG-14 kualitas sedang', async ({ imageGen }) => {
    // Kualitas default adalah Medium dan bisa dipilih.
    expect(await imageGen.current('Quality')).toContain('Medium');
    await imageGen.choose('Quality', 'Medium');
    expect(await imageGen.current('Quality')).toContain('Medium');
  });

  test('IMG-15 style default', async ({ imageGen }) => {
    // Style default adalah Default dan bisa dipilih.
    expect(await imageGen.current('Style')).toContain('Default');
    await imageGen.choose('Style', 'Default');
    expect(await imageGen.current('Style')).toContain('Default');
  });

  test('IMG-16 jumlah output 1', async ({ imageGen }) => {
    // Number of images bisa diubah menjadi 1.
    await imageGen.choose('Number of images', '1');
    expect((await imageGen.current('Number of images')).endsWith('1')).toBe(true);
  });

  test('IMG-17 jumlah output 4', async ({ imageGen }) => {
    // Number of images default 1 dan bisa diubah menjadi 4.
    expect((await imageGen.current('Number of images')).endsWith('1')).toBe(true);
    await imageGen.choose('Number of images', '4');
    expect((await imageGen.current('Number of images')).endsWith('4')).toBe(true);
  });

  test('IMG-18 upload referensi', async ({ imageGen, files }) => {
    // Gambar referensi valid diterima (thumbnail/nama tampil).
    await imageGen.uploadReference(files.png);
    await expect(imageGen.page.getByRole('img', { name: 'logo.png' })).toBeVisible();
  });

  test('IMG-19 generate dengan referensi', meta({ tokens: true, skip: NEED_TOKEN }), async () => {});

  test('IMG-20 referensi format tidak didukung', async ({ imageGen, files }) => {
    // PDF ditolak; referensi tidak ditambahkan.
    await imageGen.uploadReference(files.pdf);
    await imageGen.expectText('not supported', 'unsupported', 'format', 'tidak didukung', 'invalid');
    await expect(imageGen.page.getByText('dokumen.pdf')).toHaveCount(0);
  });

  test('IMG-21 referensi melebihi ukuran', async ({ imageGen, files }) => {
    // Gambar sangat besar ditolak dengan pesan batas ukuran.
    await imageGen.uploadReference(files.huge);
    await imageGen.expectText('MB', 'size', 'ukuran');
  });

  test('IMG-22 hapus referensi', async ({ imageGen, files }) => {
    // Referensi bisa dihapus dari form.
    await imageGen.uploadReference(files.png);
    await imageGen.page.getByRole('img', { name: 'logo.png' }).hover(); // tombol hapus baru muncul saat thumbnail di-hover
    await imageGen.page.getByRole('button', { name: rx('Remove image', 'Remove', 'Hapus') }).click();
    await expect(imageGen.page.getByRole('img', { name: 'logo.png' })).toHaveCount(0);
  });

  test('IMG-23 proses generate', meta({ tokens: true, skip: NEED_TOKEN }), async () => {});
  test('IMG-24 hasil sesuai prompt', meta({ tokens: true, skip: NEED_TOKEN }), async () => {});
  test('IMG-25 detail hasil', meta({ tokens: true, skip: NEED_TOKEN }), async () => {});

  test('IMG-26 tab riwayat', async ({ imageGen }) => {
    // Tab History aktif.
    await imageGen.openTab('History', 'Riwayat');
    await expect(imageGen.page.getByText(rx('Image Generator')).first()).toBeVisible();
    await imageGen.expectText('History', 'Riwayat');
  });

  test('IMG-27 badge riwayat', meta({ tokens: true, skip: NEED_TOKEN }), async () => {});
  test('IMG-28 pengelompokan riwayat', meta({ skip: 'Butuh hasil generate pada dua tanggal berbeda' }), async () => {});
  test('IMG-29 persistensi riwayat', meta({ tokens: true, skip: NEED_TOKEN }), async () => {});
  test('IMG-30 isolasi riwayat', meta({ skip: 'Butuh riwayat di akun utama dan akun kedua (USER_B_*)' }), async () => {});
  test('IMG-31 penggunaan token', meta({ tokens: true, skip: NEED_TOKEN }), async () => {});
  test('IMG-32 perhitungan token', meta({ tokens: true, skip: NEED_TOKEN }), async () => {});

  test(
    'IMG-33 saldo tidak mencukupi',
    meta({ bug: 'Generate saat saldo 0: tidak ada pesan token tidak cukup dan job masuk antrean' }),
    async ({ imageGen, unfunded }) => {
      // Saldo tidak cukup: permintaan tidak diproses, ada info saldo, saldo tetap, tidak ada job/hasil kosong.
      const balanceBefore = await imageGen.tokenBalance();
      const queueBefore = await imageGen.queueCount();
      await imageGen.writePrompt(PROMPT);
      await imageGen.expectText('0 tokens left', 'tidak mencukupi', 'not enough', 'insufficient');
      if (await imageGen.generateButton.isEnabled()) {
        await imageGen.generate();
        await imageGen.expectInsufficientToken();
      }
      const balanceAfter = await imageGen.tokenBalance();
      expect(balanceAfter).toBe(balanceBefore);
      expect(balanceAfter).toBeGreaterThanOrEqual(0);
      expect(await imageGen.queueCount(), 'Generate tanpa saldo tetap memasukkan job ke antrean').toBe(queueBefore);
    },
  );

  test('IMG-34 konsistensi konfigurasi', async ({ imageGen }) => {
    // Beberapa konfigurasi diubah sekaligus tetap tercermin pada tombolnya.
    await imageGen.choose('Orientation', '3:2');
    await imageGen.choose('Number of images', '1');
    await imageGen.choose('Quality', 'High');
    expect(await imageGen.current('Orientation')).toContain('3:2');
    expect((await imageGen.current('Number of images')).endsWith('1')).toBe(true);
    expect(await imageGen.current('Quality')).toContain('High');
  });

  test('IMG-35 navigasi antar tab', async ({ imageGen }) => {
    // Pindah Explore <-> History tidak menjalankan generate dan tidak memotong token.
    const before = await imageGen.tokenBalance();
    await imageGen.writePrompt(PROMPT);
    await imageGen.openTab('History', 'Riwayat');
    await imageGen.openTab('Templates', 'Explore', 'Jelajahi');
    expect(await imageGen.tokenBalance()).toBe(before);
    await expect(imageGen.prompt).toBeVisible();
  });
});
