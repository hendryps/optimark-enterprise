/**
 * Penanda kondisi khusus sebuah test case: skip, bug yang sudah diketahui, memakai token, mengubah data.
 *
 * ID test case (mis. "LOGIN-02") ditulis di JUDUL test, jadi bisa dipilih dengan `--grep`:
 *
 *   test('LOGIN-02 login berhasil', async ({ auth }) => { ... });
 *   test('REG-02 registrasi Google', meta({ skip: 'Butuh akun Google baru' }), async () => {});
 *   test('ASST-02 kirim dengan tombol', meta({ tokens: true, bug: 'Caption tidak selesai' }), async ({ assistant }) => { ... });
 *
 *   npx playwright test --grep "LOGIN-02"
 */

/** Pilihan tambahan untuk sebuah test case (semuanya opsional). */
export interface CaseOptions {
  /** Test dilewati (skip) dengan alasan ini. Dipakai untuk skenario yang belum bisa diotomasi. */
  skip?: string;
  /** Bug yang sudah diketahui. Test DIHARAPKAN gagal; kalau tiba-tiba lolos, test dianggap gagal
   *  sebagai sinyal bahwa bug sudah diperbaiki dan tanda `bug` ini boleh dilepas. */
  bug?: string;
  /** Bug yang muncul tidak konsisten: hanya dicatat sebagai catatan, test tidak diharapkan gagal. */
  flakyBug?: string;
  /** Test memakai token AI asli. Tidak ikut run default (lihat `npm run test:tokens`). */
  tokens?: boolean;
  /** Test mengubah/menghapus data permanen. Tidak ikut run default (lihat `npm run test:destructive`). */
  destructive?: boolean;
}

/** Detail yang dimengerti Playwright: tag (untuk filter) dan anotasi (tampil di laporan). */
export interface CaseDetails {
  tag: string[];
  annotation: { type: string; description?: string }[];
}

/** Ubah pilihan menjadi tag dan anotasi Playwright. Dipakai sebagai argumen ke-2 `test(...)`. */
export function meta(options: CaseOptions = {}): CaseDetails {
  const tag: string[] = [];
  const annotation: CaseDetails['annotation'] = [];

  if (options.tokens) tag.push('@tokens'); // dikecualikan dari run default
  if (options.destructive) tag.push('@destructive'); // dikecualikan dari run default
  if (options.skip) annotation.push({ type: 'skip', description: options.skip });
  if (options.bug) {
    // Tag @bug tampil sebagai label di laporan HTML dan bisa difilter (ketik "@bug" di kolom cari laporan).
    // Tanpa tag ini, expected failure tercampur di kelompok "Passed" dan tidak kelihatan.
    // Tag kedua berisi alasannya, supaya langsung terbaca di daftar test tanpa membuka detail
    // (daftar test di laporan HTML hanya menampilkan tag, bukan anotasi).
    tag.push('@bug', `@${options.bug}`);
    annotation.push({ type: 'fail', description: `Bug diketahui: ${options.bug}` });
  }
  if (options.flakyBug) annotation.push({ type: 'known-bug', description: options.flakyBug });

  return { tag, annotation };
}
