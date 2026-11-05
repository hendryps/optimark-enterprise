/**
 * Video Generator (VID-01 .. VID-41) — sheet "e2e-video generator".
 *
 * Sama seperti Image Generator: akun QA saldo 0 sehingga test yang menghasilkan video memakai
 * fixture `funded` + `tokens: true` (jalankan sengaja dengan `npm run test:tokens`). Konfigurasi video
 * di staging: Model (Seedance 2.0), Aspect ratio, Resolution, Duration, dan toggle Audio.
 */
import { expect, meta, test } from '../../src/fixtures';
import { num, rx, rxExact } from '../../src/utils/text';

const PROMPT = 'Video sinematik kopi susu dituangkan ke dalam gelas dengan gerakan lambat.';
const NEED_TOKEN = 'Butuh saldo token untuk generate video';
const PLAY_BUG = 'Video di tab Explore tidak terputar';

test.describe('Video Generator', () => {
  test('VID-01 akses halaman', async ({ videoGen }) => {
    // Explore/History, galeri, prompt, upload gambar, konfigurasi, audio, token, dan Generate tampil.
    const { page } = videoGen;
    await expect(videoGen.tab('Explore', 'Jelajahi')).toBeVisible();
    await expect(videoGen.tab('History', 'Riwayat')).toBeVisible();
    await expect(videoGen.prompt).toBeVisible();
    await expect(page.getByRole('button', { name: 'Image', exact: true })).toBeVisible();
    for (const label of ['Model', 'Aspect ratio', 'Resolution', 'Duration']) {
      await expect(videoGen.optionButton(label)).toBeVisible();
    }
    await expect(page.getByRole('button', { name: rxExact('Audio') })).toBeVisible();
    await expect(page.getByText(rx('tokens left', 'token tersisa'))).toBeVisible();
    await expect(videoGen.generateButton).toBeVisible();
  });

  test('VID-02 tab jelajahi', async ({ videoGen }) => {
    // Explore aktif dan menampilkan video inspirasi (thumbnail/tombol play).
    await videoGen.openTab('History', 'Riwayat');
    await videoGen.openTab('Explore', 'Jelajahi');
    await expect(videoGen.gallery().first()).toBeVisible();
  });

  test('VID-03 galeri jelajahi', async ({ videoGen }) => {
    // Galeri memuat video; scroll memuat lebih banyak tanpa error.
    expect(await videoGen.gallery().count()).toBeGreaterThan(0);
    await videoGen.page.mouse.wheel(0, 2000);
    await expect(videoGen.gallery().first()).toBeVisible();
  });

  test('VID-04 putar video', meta({ bug: PLAY_BUG }), async ({ videoGen }) => {
    // Klik play memutar video yang dipilih.
    const video = videoGen.page.locator('video').first();
    await videoGen.page.getByRole('button', { name: rx('play', 'putar') }).first().click();
    const playing = await video.evaluate((v: HTMLVideoElement) => (!v.paused && v.currentTime > 0) || v.readyState > 2);
    expect(playing).toBe(true);
  });

  test('VID-05 jeda dan lanjut', meta({ bug: PLAY_BUG }), async ({ videoGen }) => {
    // Pause menghentikan video, play melanjutkan.
    const video = videoGen.page.locator('video').first();
    await videoGen.page.getByRole('button', { name: rx('play', 'putar') }).first().click();
    await videoGen.page.getByRole('button', { name: rx('pause', 'jeda') }).first().click();
    expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  });

  test('VID-06 label durasi', meta({ bug: PLAY_BUG }), async ({ videoGen }) => {
    // Label durasi pada thumbnail sesuai durasi video.
    const label = videoGen.page.getByText(/^\d+s$/i).first();
    await expect(label).toBeVisible();
    const seconds = parseInt((await label.innerText()).replace(/s$/i, ''), 10);
    const duration = await videoGen.page.locator('video').first().evaluate((v: HTMLVideoElement) => v.duration);
    expect(Math.abs(duration - seconds)).toBeLessThanOrEqual(1.5);
  });

  test('VID-07 input prompt', async ({ videoGen }) => {
    // Prompt tampil utuh.
    await videoGen.writePrompt(PROMPT);
    await expect(videoGen.prompt).toHaveValue(PROMPT);
  });

  test('VID-08 prompt kosong', async ({ videoGen }) => {
    // Tanpa prompt dan tanpa gambar: tombol generate nonaktif.
    await expect(videoGen.generateButton).toBeDisabled();
  });

  test('VID-09 prompt spasi', async ({ videoGen }) => {
    // Prompt spasi dianggap kosong.
    await videoGen.writePrompt('     ');
    await expect(videoGen.generateButton).toBeDisabled();
  });

  test('VID-10 prompt multiline', async ({ videoGen }) => {
    // Prompt multi-baris tersimpan.
    const text = 'Video produk kopi susu\nKamera bergerak mendekat';
    await videoGen.writePrompt(text);
    await expect(videoGen.prompt).toHaveValue(text);
  });

  test('VID-11 text to video', meta({ tokens: true, skip: NEED_TOKEN }), async () => {});

  test('VID-12 upload referensi', async ({ videoGen, files }) => {
    // Gambar referensi valid diterima.
    await videoGen.uploadReference(files.png);
    await expect(videoGen.page.getByRole('img', { name: 'logo.png' })).toBeVisible();
  });

  test(
    'VID-13 image to video',
    meta({ tokens: true, skip: NEED_TOKEN, bug: 'Gambar tidak dipakai sebagai referensi video' }),
    async () => {},
  );

  test(
    'VID-14 hanya gambar tanpa prompt',
    meta({ bug: 'Tombol submit tidak bisa diklik untuk image-to-video tanpa prompt' }),
    async ({ videoGen, files, funded }) => {
      // Hanya gambar (tanpa prompt): generate jalan atau ada validasi jelas.
      await videoGen.uploadReference(files.png);
      await expect(videoGen.generateButton).toBeEnabled();
    },
  );

  test('VID-15 referensi format tidak didukung', async ({ videoGen, files }) => {
    // PDF ditolak.
    await videoGen.uploadReference(files.pdf);
    await videoGen.expectText('not supported', 'unsupported', 'format', 'tidak didukung', 'invalid');
    await expect(videoGen.page.getByText('dokumen.pdf')).toHaveCount(0);
  });

  test('VID-16 referensi melebihi ukuran', async ({ videoGen, files }) => {
    // Gambar sangat besar ditolak dengan pesan batas ukuran.
    await videoGen.uploadReference(files.huge);
    await videoGen.expectText('MB', 'size', 'ukuran');
  });

  test('VID-17 hapus referensi', async ({ videoGen, files }) => {
    // Referensi bisa dihapus.
    await videoGen.uploadReference(files.png);
    await videoGen.page.getByRole('button', { name: rx('Remove all', 'Hapus semua') }).click();
    await expect(videoGen.page.getByRole('img', { name: 'logo.png' })).toHaveCount(0);
  });

  test('VID-18 model Seedance', async ({ videoGen }) => {
    // Seedance 2.0 adalah model aktif/pilihan.
    const models = await videoGen.options('Model');
    expect(models.some((m) => m.includes('Seedance 2.0')), models.join(', ')).toBe(true);
    await videoGen.choose('Model', 'Seedance 2.0');
    expect(await videoGen.current('Model')).toContain('Seedance 2.0');
  });

  test('VID-19 ubah model', async ({ videoGen }) => {
    // Mengganti ke model lain mengubah model aktif.
    const current = await videoGen.current('Model');
    const others = (await videoGen.options('Model')).filter((m) => m !== current);
    test.skip(others.length === 0, 'Hanya satu model video tersedia');
    await videoGen.choose('Model', others[0]);
    expect(await videoGen.current('Model')).toContain(others[0]);
  });

  // VID-20 .. VID-25: rasio, resolusi, dan durasi (nilai pilihan atau opsi lain).
  const configCases: [string, string | null][] = [
    ['Aspect ratio', '16:9'],
    ['Aspect ratio', null],
    ['Resolution', '720p'],
    ['Resolution', null],
    ['Duration', '5s'],
    ['Duration', null],
  ];
  for (const [index, [label, preferred]] of configCases.entries()) {
    test(`VID-${num(20 + index)} konfigurasi ${label}${preferred ? ` ${preferred}` : ' (opsi lain)'}`, async ({ videoGen }) => {
      // Rasio/resolusi/durasi bisa dipilih: nilai preferensi atau opsi lain.
      const options = await videoGen.options(label);
      let target: string;
      if (preferred) {
        expect(options, `${preferred} tidak ada di ${options.join(', ')}`).toContain(preferred);
        target = preferred;
      } else {
        const current = await videoGen.current(label);
        const others = options.filter((o) => o !== current);
        test.skip(others.length === 0, `${label} hanya punya satu opsi`);
        target = others[others.length - 1];
      }
      await videoGen.choose(label, target);
      expect(await videoGen.current(label)).toContain(target);
    });
  }

  test('VID-26 toggle audio nonaktif', async ({ videoGen }) => {
    // Toggle Audio bisa dimatikan.
    const audio = videoGen.page.getByRole('button', { name: rxExact('Audio') });
    const state = await audio.getAttribute('aria-pressed');
    await audio.click();
    const after = await audio.getAttribute('aria-pressed');
    expect(after !== state || state === null).toBe(true);
  });

  test('VID-27 video dengan audio', meta({ tokens: true, skip: NEED_TOKEN, bug: 'Audio tidak berfungsi pada video hasil' }), async () => {});
  test('VID-28 status pemrosesan', meta({ tokens: true, skip: NEED_TOKEN }), async () => {});
  test(
    'VID-29 hasil sesuai prompt',
    meta({ tokens: true, skip: NEED_TOKEN, bug: 'Hasil tampil ganda sebelum refresh (2 video sama, setelah refresh 1)' }),
    async () => {},
  );
  test('VID-30 detail hasil', meta({ tokens: true, skip: NEED_TOKEN }), async () => {});

  test('VID-31 tab riwayat', async ({ videoGen }) => {
    // Tab History aktif.
    await videoGen.openTab('History', 'Riwayat');
    await videoGen.expectText('History', 'Riwayat');
  });

  test('VID-32 badge riwayat', meta({ tokens: true, skip: NEED_TOKEN }), async () => {});
  test('VID-33 pengelompokan riwayat', meta({ skip: 'Butuh video pada dua tanggal berbeda' }), async () => {});
  test('VID-34 pemutaran riwayat', meta({ skip: 'Butuh video di Riwayat' }), async () => {});
  test('VID-35 persistensi riwayat', meta({ tokens: true, skip: NEED_TOKEN }), async () => {});
  test('VID-36 isolasi riwayat', meta({ skip: 'Butuh riwayat di akun utama dan akun kedua (USER_B_*)' }), async () => {});
  test('VID-37 penggunaan token', meta({ tokens: true, skip: NEED_TOKEN }), async () => {});

  test(
    'VID-38 biaya berubah saat konfigurasi diubah',
    meta({ bug: "Staging hanya menampilkan sisa token ('N tokens left'), tidak ada estimasi biaya" }),
    async ({ videoGen }) => {
      // Estimasi token pada tombol Generate/label diperbarui saat durasi diubah (jika ditampilkan).
      const current = await videoGen.current('Duration');
      const others = (await videoGen.options('Duration')).filter((o) => o !== current);
      test.skip(others.length === 0, 'Durasi hanya satu opsi');
      await videoGen.choose('Duration', others[others.length - 1]);
      await videoGen.writePrompt(PROMPT);
      // Biaya diharapkan tampil di UI; kalau tidak ada elemen biaya, test ini gagal sebagai temuan.
      const cost = videoGen.page.getByText(/\d+\s*tokens?\b(?!\s*left)|biaya|cost/i);
      await expect(cost.first()).toBeVisible();
    },
  );

  test(
    'VID-39 saldo tidak mencukupi',
    meta({ bug: 'Generate saat saldo 0: tidak ada pesan token tidak cukup dan job masuk antrean' }),
    async ({ videoGen, unfunded }) => {
      // Saldo tidak cukup: info saldo tampil, saldo tetap, tidak ada job/hasil kosong.
      const balanceBefore = await videoGen.tokenBalance();
      const queueBefore = await videoGen.queueCount();
      await videoGen.writePrompt(PROMPT);
      await videoGen.expectText('0 tokens left', 'tidak mencukupi', 'not enough', 'insufficient');
      if (await videoGen.generateButton.isEnabled()) {
        await videoGen.generate();
        await videoGen.expectInsufficientToken();
      }
      const balanceAfter = await videoGen.tokenBalance();
      expect(balanceAfter).toBe(balanceBefore);
      expect(balanceAfter).toBeGreaterThanOrEqual(0);
      expect(await videoGen.queueCount(), 'Generate tanpa saldo tetap memasukkan job ke antrean').toBe(queueBefore);
    },
  );

  test('VID-40 konsistensi konfigurasi', async ({ videoGen }) => {
    // Beberapa konfigurasi diubah sekaligus tetap tercermin.
    const chosen: Record<string, string> = {};
    for (const label of ['Aspect ratio', 'Resolution', 'Duration']) {
      const current = await videoGen.current(label);
      const others = (await videoGen.options(label)).filter((o) => o !== current);
      if (others.length) {
        await videoGen.choose(label, others[others.length - 1]);
        chosen[label] = others[others.length - 1];
      }
    }
    expect(Object.keys(chosen).length, 'Tidak ada konfigurasi yang bisa diubah').toBeGreaterThan(0);
    for (const [label, value] of Object.entries(chosen)) {
      expect(await videoGen.current(label)).toContain(value);
    }
  });

  test('VID-41 navigasi antar tab', async ({ videoGen }) => {
    // Pindah Explore <-> History tidak menjalankan generate dan tidak memotong token.
    const before = await videoGen.tokenBalance();
    await videoGen.writePrompt(PROMPT);
    await videoGen.openTab('History', 'Riwayat');
    await videoGen.openTab('Explore', 'Jelajahi');
    expect(await videoGen.tokenBalance()).toBe(before);
    await expect(videoGen.prompt).toBeVisible();
  });
});
