/** Page object menu AI Assistant (/ai-assistant): chat, pengaturan Audience/Budget, riwayat (ASST). */
import { expect, type Locator } from '@playwright/test';
import { env } from '../config/env';
import { rx } from '../utils/text';
import { BasePage } from './base-page';

/**
 * AI Assistant: chat, pengaturan Audience/Budget, riwayat percakapan.
 *
 * Catatan staging: tombol Enter = baris baru, Ctrl/Cmd+Enter atau tombol Send = kirim.
 */
export class AssistantPage extends BasePage {
  /** Jumlah balasan AI yang sudah selesai ditunggu. Balasan berikutnya = indeks ini. */
  private answered = 0;

  /** Teks sementara yang tampil selagi AI bekerja ("Sedang membuat caption... Tunggu sebentar ya!"). */
  private static readonly LOADING_TEXT = rx(
    'Sedang membuat', 'Sedang memproses', 'Tunggu sebentar', 'Mohon tunggu',
    'Generating', 'Thinking', 'Please wait', 'Working on',
  );

  /** Buka AI Assistant dan tunggu kolom chat tampil. */
  async open(): Promise<this> {
    await this.goto('/ai-assistant');
    await expect(this.input).toBeVisible({ timeout: 20_000 }); // halaman sempat 'Loading...'
    return this;
  }

  // ---------------------------------------------------------------- elemen halaman
  /** Kolom tempat mengetik pesan/prompt. */
  get input(): Locator {
    return this.page.getByRole('textbox', { name: rx('Ask anything', 'Tanyakan', 'Tulis') });
  }

  /** Tombol 'Send message'. */
  get sendButton(): Locator {
    return this.button('Send message', 'Kirim');
  }

  /** Tombol 'New chat' untuk memulai percakapan baru. */
  get newChatButton(): Locator {
    return this.button('New chat', 'Chat Baru').first();
  }

  /** Tombol gabungan 'General · Budget Medium' (Audience + Budget). */
  get settingsButton(): Locator {
    return this.page.getByRole('button', { name: /Budget\s+(Low|Medium|High)/i });
  }

  /** <select> Audience (General, B2B, B2C, Local Market); ada setelah panel pengaturan dibuka. */
  get audienceSelect(): Locator {
    return this.page.locator('select').nth(0);
  }

  /** <select> Budget (Low, Medium, High). */
  get budgetSelect(): Locator {
    return this.page.locator('select').nth(1);
  }

  /** Kolom pencarian riwayat percakapan. */
  get historySearch(): Locator {
    return this.page.getByRole('searchbox');
  }

  /** Bubble pesan pengguna di area percakapan (bukan judul header / daftar riwayat). */
  get userMessages(): Locator {
    return this.page.locator('div.justify-end p.whitespace-pre-wrap');
  }

  /** Balasan 'Optimark AI' di area percakapan, berurutan dari atas ke bawah. */
  get aiMessages(): Locator {
    return this.page.locator('div.group\\/msg');
  }

  /**
   * Spinner yang tampil selama AI memproses (mis. kartu 'Caption ready' yang berputar).
   *
   * Sengaja TIDAK memakai selector class*=loading/spinner: itu cocok dengan tombol permanen
   * di halaman sehingga test menunggu sampai timeout padahal jawaban sudah keluar.
   */
  get loadingIndicator(): Locator {
    return this.aiMessages.locator('.animate-spin, [role=progressbar], [aria-busy=true]').filter({ visible: true });
  }

  // ---------------------------------------------------------------- aksi
  /** Isi prompt lalu klik Send message. */
  async send(prompt: string): Promise<void> {
    await this.input.fill(prompt);
    await this.sendButton.click();
  }

  /** Mulai percakapan baru dan pastikan area chat bersih (input kosong, sapaan awal tampil). */
  async newChat(): Promise<void> {
    await this.newChatButton.click();
    this.answered = 0;
    await expect(this.input).toHaveValue('');
    await expect(this.page.getByRole('heading', { name: rx('What can I help you with', 'Apa yang') })).toBeVisible();
  }

  /**
   * Tunggu AI BENAR-BENAR selesai menjawab `prompt`, lalu kembalikan teks jawabannya.
   *
   * Selesai = bubble pesan pengguna tampil, balasan AI baru muncul, TIDAK ada spinner, TIDAK ada
   * teks sementara ("Sedang membuat... Tunggu sebentar"), jawaban minimal `minChars` karakter,
   * dan isinya tidak berubah selama `stableSecs` detik. Prompt berikutnya baru boleh dikirim sesudah ini.
   *
   * Kutipan ulang prompt di jawaban ('Pertanyaan Anda: "..."') dibuang supaya cek topik tidak
   * lolos hanya karena AI mengulang pertanyaan.
   */
  async waitForAnswer(prompt: string, minChars = 20, stableSecs = 3): Promise<string> {
    await expect(this.userMessages.filter({ hasText: prompt }).last()).toBeVisible({ timeout: 20_000 });
    const deadline = Date.now() + env.generateTimeoutMs;
    let last = '';
    let sameFor = 0;
    while (Date.now() < deadline) {
      let current = '';
      if ((await this.aiMessages.count()) > this.answered) {
        current = (await this.aiMessages.nth(this.answered).innerText()).split(prompt).join('').trim();
      }
      const busy = (await this.loadingIndicator.count()) > 0 || AssistantPage.LOADING_TEXT.test(current);
      sameFor = !busy && current === last && current.length >= minChars ? sameFor + 1 : 0;
      if (sameFor >= stableSecs) {
        this.answered += 1; // prompt berikutnya menunggu balasan AI berikutnya
        return current;
      }
      last = current;
      await this.page.waitForTimeout(1000);
    }
    throw new Error(`AI belum selesai menjawab dalam ${env.generateTimeoutMs} ms untuk: "${prompt}"\nTeks terakhir: ${last.slice(0, 300)}`);
  }

  /** Kirim prompt, tunggu jawaban AI selesai, kembalikan teks jawabannya. */
  async ask(prompt: string): Promise<string> {
    await this.send(prompt);
    return this.waitForAnswer(prompt);
  }

  /** Jawaban harus menyebut minimal satu kata kunci topik (tidak peka huruf besar/kecil). */
  assertOnTopic(answer: string, ...keywords: string[]): void {
    const lower = answer.toLowerCase();
    const found = keywords.some((keyword) => lower.includes(keyword.toLowerCase()));
    expect(found, `Jawaban tidak sesuai topik. Kata kunci [${keywords.join(', ')}] tidak ditemukan di: ${answer.slice(0, 300)}`).toBe(true);
  }
}
