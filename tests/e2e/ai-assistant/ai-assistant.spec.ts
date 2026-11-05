/**
 * AI Assistant (ASST-01 .. ASST-27) — sheet "e2e-ai assistant".
 *
 * Catatan staging (28 Okt 2026): Enter = baris baru, kirim = tombol Send atau Ctrl/Cmd+Enter;
 * pengaturan Audience dan Budget digabung dalam satu tombol 'General · Budget Medium'.
 * Akun QA saldo 0: server menjawab 409 saat kirim, jadi test yang butuh jawaban AI memakai
 * fixture `funded` dan otomatis di-skip.
 *
 * Aturan prompt: satu test = SATU prompt dengan topik baru. Tiap prompt dikirim, ditunggu sampai AI
 * BENAR-BENAR selesai menjawab (spinner hilang), dicek jawabannya sesuai topik, lalu dibuka chat baru.
 * Prompt berikutnya tidak pernah dikirim sebelum jawaban sebelumnya selesai (tidak menumpuk antrean).
 * Pengecualian: ASST-10 (konteks) dan ASST-11 (urutan pesan) memang butuh dua prompt dalam satu chat.
 */
import { expect, meta, test } from '../../../src/fixtures';
import { rx } from '../../../src/utils/text';

const NEED_AI = 'Butuh akun dengan saldo token dan jawaban AI';

// Temuan staging (2 Nov 2026): semua prompt dijawab template yang sama ("Siap. Saya bantu jawab secara praktis...
// Pertanyaan Anda: '<prompt>' ... Langkah yang disarankan: 1-2-3"), tanpa membahas isi topik. Test cek topik
// ditandai `bug`; kalau AI sudah menjawab sesuai topik, test lolos dan tanda `bug` boleh dilepas.
const BUG_CAPTION =
  "Staging: permintaan caption tertahan di 'Sedang membuat caption... Caption ready' (spinner) lebih dari 4 menit, jawaban final tidak muncul";
const BUG_GENERIK = 'Staging: AI menjawab template generik, tidak membahas topik prompt (hanya mengulang pertanyaan)';

// Satu prompt = satu topik baru. Topik yang SUDAH PERNAH dikirim ke staging (kopi gula aren, hola,
// lari/jantung, energi surya, toko buku, monstera, astronot, kereta uap, kaktus, bahasa Jepang)
// tidak dipakai lagi. Kalau menambah test, pilih topik yang belum ada di daftar ini.
// Tiap topik punya kata kunci (ID/EN) untuk memastikan jawaban AI sesuai topik yang dikirim.
const P_CAPTION = 'Buatkan caption Instagram untuk grand opening studio yoga di Ubud.';
const K_CAPTION = ['yoga', 'ubud', 'studio'];

const P_KESEHATAN = 'Jelaskan manfaat meditasi bagi kualitas tidur.';
const K_KESEHATAN = ['meditasi', 'tidur', 'meditation', 'sleep'];

const P_STATUS = 'Apa itu blockchain dan bagaimana cara kerjanya?';
const K_STATUS = ['blockchain', 'blok', 'block'];

const P_RELEVAN = 'Rekomendasikan strategi pemasaran untuk bengkel sepeda motor.';
const K_RELEVAN = ['bengkel', 'motor', 'workshop', 'garage'];

const P_DAFTAR = 'Sebutkan lima tips memelihara kucing anggora di rumah.';
const K_DAFTAR = ['kucing', 'anggora', 'cat', 'angora'];

const P_KONTEKS_1 = 'Saya akan membuka kedai bakso di dekat kampus.';
const P_KONTEKS_2 = 'Usulkan tiga nama yang menarik untuk usaha tadi.';
const K_KONTEKS = ['bakso', 'kedai', 'kampus', 'meatball', 'campus'];

const P_URUT_1 = 'Ceritakan secara singkat asal-usul batik Pekalongan.';
const K_URUT_1 = ['batik', 'pekalongan'];
const P_URUT_2 = 'Bagaimana cara membuat sambal terasi yang tahan lama?';
const K_URUT_2 = ['sambal', 'terasi'];

const P_TOKEN = 'Rancang itinerary tiga hari di Labuan Bajo.';

test.describe('AI Assistant', () => {
  // Selesai tiap test yang memakai token (jawaban AI sudah ditunggu di dalam test), buka New chat supaya
  // test berikutnya mulai dari percakapan kosong dan tidak ada antrean/konteks tersisa.
  test.afterEach(async ({ assistant }, testInfo) => {
    if (!testInfo.tags.includes('@tokens')) return;
    try {
      await assistant.newChat();
    } catch {
      // Test gagal di tengah jalan: biarkan error aslinya yang dilaporkan.
    }
  });

  test('ASST-01 akses halaman', async ({ assistant }) => {
    // Riwayat percakapan, New chat, pengaturan, input, dan tombol Send tampil.
    await expect(assistant.page.getByRole('heading', { name: rx('What can I help you with', 'Apa yang') })).toBeVisible();
    await expect(assistant.newChatButton).toBeVisible();
    await expect(assistant.settingsButton).toBeVisible();
    await expect(assistant.input).toBeVisible();
    await expect(assistant.sendButton).toBeVisible();
    await expect(assistant.historySearch).toBeVisible();
  });

  test('ASST-02 kirim dengan tombol', meta({ tokens: true, bug: BUG_CAPTION }), async ({ assistant, funded }) => {
    // Prompt tampil sebagai pesan pengguna lalu AI selesai menjawab sesuai topik.
    const answer = await assistant.ask(P_CAPTION);
    assistant.assertOnTopic(answer, ...K_CAPTION);
  });

  test('ASST-03 kirim dengan Enter', meta({ tokens: true, bug: BUG_GENERIK }), async ({ assistant, funded }) => {
    // Menekan Enter mengirim prompt satu kali, AI selesai menjawab sesuai topik.
    await assistant.input.fill(P_KESEHATAN);
    await assistant.input.press('Enter');
    const answer = await assistant.waitForAnswer(P_KESEHATAN);
    assistant.assertOnTopic(answer, ...K_KESEHATAN);
    await expect(assistant.userMessages.filter({ hasText: P_KESEHATAN })).toHaveCount(1); // bubble pengguna hanya satu
  });

  test('ASST-04 input multiline', async ({ assistant }) => {
    // Shift+Enter membuat baris baru tanpa mengirim.
    await assistant.input.fill('Buatkan strategi promosi:');
    await assistant.input.press('Shift+Enter');
    await assistant.input.pressSequentially('Target mahasiswa.');
    expect(await assistant.input.inputValue()).toContain('\n');
    await expect(assistant.input).toBeVisible();
  });

  test('ASST-05 prompt kosong', async ({ assistant }) => {
    // Prompt kosong: tombol Send nonaktif.
    await expect(assistant.sendButton).toBeDisabled();
  });

  test('ASST-06 prompt spasi', async ({ assistant }) => {
    // Prompt hanya spasi dianggap kosong: Send tetap nonaktif.
    await assistant.input.fill('     ');
    await expect(assistant.sendButton).toBeDisabled();
  });

  test('ASST-07 status pemrosesan', meta({ tokens: true, bug: BUG_GENERIK }), async ({ assistant, funded }) => {
    // Setelah dikirim, input langsung kosong (pesan diterima), lalu AI selesai menjawab sesuai topik.
    await assistant.send(P_STATUS);
    await expect(assistant.input).toHaveValue('');
    const answer = await assistant.waitForAnswer(P_STATUS);
    assistant.assertOnTopic(answer, ...K_STATUS);
  });

  test('ASST-08 respons relevan', meta({ tokens: true, bug: BUG_GENERIK }), async ({ assistant, funded }) => {
    // Jawaban AI membahas topik yang ditanyakan, bukan topik lain.
    const answer = await assistant.ask(P_RELEVAN);
    assistant.assertOnTopic(answer, ...K_RELEVAN);
  });

  test('ASST-09 format daftar', meta({ tokens: true, bug: BUG_GENERIK }), async ({ assistant, funded }) => {
    // Permintaan 'lima tips' dijawab berupa daftar (minimal 3 butir) dan sesuai topik.
    const answer = await assistant.ask(P_DAFTAR);
    assistant.assertOnTopic(answer, ...K_DAFTAR);
    const items = answer.split('\n').filter((line) => /^\s*(?:\d+[.)]|[-*•])\s+\S/.test(line));
    expect(items.length, `Jawaban bukan daftar: ${answer.slice(0, 300)}`).toBeGreaterThanOrEqual(3);
  });

  test('ASST-10 konteks percakapan', meta({ tokens: true, bug: BUG_GENERIK }), async ({ assistant, funded }) => {
    // Pertanyaan lanjutan tanpa menyebut topik tetap dijawab sesuai konteks pesan sebelumnya.
    const first = await assistant.ask(P_KONTEKS_1);
    assistant.assertOnTopic(first, ...K_KONTEKS);
    const second = await assistant.ask(P_KONTEKS_2);
    assistant.assertOnTopic(second, ...K_KONTEKS);
  });

  test('ASST-11 urutan pesan', meta({ tokens: true, bug: BUG_GENERIK }), async ({ assistant, funded }) => {
    // Dua prompt berbeda tampil berurutan; tiap jawaban berada tepat setelah prompt-nya.
    const first = await assistant.ask(P_URUT_1);
    assistant.assertOnTopic(first, ...K_URUT_1);
    const second = await assistant.ask(P_URUT_2);
    assistant.assertOnTopic(second, ...K_URUT_2);
    const texts = (await assistant.userMessages.allInnerTexts()).map((t) => t.trim());
    expect(texts).toEqual([P_URUT_1, P_URUT_2]);
    await expect(assistant.aiMessages).toHaveCount(2); // satu jawaban per prompt, urutannya sama
  });

  test('ASST-12 pengaturan audiens', async ({ assistant }) => {
    // Memilih Audience B2B memperbarui label pengaturan (isi jawaban AI diuji di test berbayar).
    await assistant.settingsButton.click();
    await assistant.audienceSelect.selectOption('B2B'); // Audience berupa <select> native
    await expect(assistant.settingsButton).toContainText('B2B');
  });

  test('ASST-13 pengaturan budget', async ({ assistant }) => {
    // Memilih Budget High memperbarui label pada tombol pengaturan.
    await assistant.settingsButton.click();
    await assistant.budgetSelect.selectOption('High'); // Budget berupa <select> native
    await expect(assistant.settingsButton).toContainText('High');
  });

  test('ASST-14 konsistensi pengaturan', async ({ assistant }) => {
    // Default General + Medium; label tetap setelah ditutup/dibuka lagi.
    await expect(assistant.settingsButton).toContainText('General');
    await expect(assistant.settingsButton).toContainText('Medium');
    await assistant.settingsButton.click();
    await assistant.page.keyboard.press('Escape');
    await expect(assistant.settingsButton).toContainText('Medium');
  });

  test('ASST-15 chat baru', meta({ skip: 'Butuh percakapan lama (butuh token untuk membuatnya)' }), async () => {});
  test('ASST-16 pemisahan konteks', meta({ skip: NEED_AI }), async () => {});
  test('ASST-17 penyimpanan percakapan', meta({ skip: NEED_AI }), async () => {});
  test('ASST-18 riwayat percakapan', meta({ skip: NEED_AI }), async () => {});
  test('ASST-19 judul riwayat', meta({ skip: NEED_AI }), async () => {});
  test('ASST-20 persistensi riwayat', meta({ skip: NEED_AI }), async () => {});
  test('ASST-21 isolasi data', meta({ skip: 'Butuh akun kedua dengan riwayat di akun pertama (butuh token)' }), async () => {});
  test('ASST-22 salin respons', meta({ skip: NEED_AI }), async () => {});
  test('ASST-23 feedback positif', meta({ skip: NEED_AI }), async () => {});
  test('ASST-24 feedback negatif', meta({ skip: NEED_AI }), async () => {});
  test('ASST-25 penggunaan token', meta({ skip: NEED_AI, tokens: true }), async () => {});

  test('ASST-26 batas token', meta({
    bug: 'Pesan tetap dikirim dan dijawab AI saat saldo token 0 (tidak ada pesan token tidak cukup)',
  }), async ({ assistant, unfunded }) => {
    // Saldo tidak cukup: permintaan tidak diproses, muncul info token tidak cukup, saldo tidak negatif.
    const before = await assistant.tokenBalance();
    await assistant.input.fill(P_TOKEN);
    await assistant.sendButton.click();
    await assistant.expectText('not enough', 'insufficient', 'tidak mencukupi', 'tidak cukup', 'buy', 'upgrade');
    const after = await assistant.tokenBalance();
    expect(after).toBe(before);
    expect(after).toBeGreaterThanOrEqual(0);
  });

  test('ASST-27 navigasi riwayat token', async ({ assistant }) => {
    // 'View history' pada panel token membuka panel 'Token Usage History'.
    await assistant.page.getByText(rx('View history', 'Lihat riwayat')).click();
    await expect(
      assistant.page.getByRole('heading', { name: rx('Token Usage History', 'Riwayat Penggunaan Token') }),
    ).toBeVisible();
  });
});
