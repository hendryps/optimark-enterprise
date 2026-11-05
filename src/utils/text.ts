/**
 * Helper pencarian teks dua bahasa.
 *
 * Staging berbahasa Inggris, sedangkan Google Sheet berbahasa Indonesia. Karena itu semua label
 * ditulis dalam dua bahasa supaya test tetap jalan kalau bahasa aplikasi diganti.
 */

/** Escape karakter khusus regex supaya teks biasa aman dipakai di dalam RegExp. */
export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Regex yang cocok dengan SALAH SATU teks (tidak peka huruf besar/kecil, boleh sebagian).
 * Contoh: `rx('Total Content', 'Total Konten')`.
 */
export function rx(...alternatives: string[]): RegExp {
  return new RegExp(alternatives.map(escapeRegex).join('|'), 'i');
}

/** Seperti `rx`, tetapi teks harus SAMA PERSIS (hanya spasi di pinggir yang boleh). */
export function rxExact(...alternatives: string[]): RegExp {
  return new RegExp(`^\\s*(?:${alternatives.map(escapeRegex).join('|')})\\s*$`, 'i');
}

/** Ambil angka pertama dari teks. Contoh: 'Saldo 2.862' -> 2862 (titik/koma ribuan dibuang). */
export function firstInt(raw: string): number {
  const match = raw.match(/\d[\d.,]*/);
  if (!match) throw new Error(`Tidak ada angka di: ${JSON.stringify(raw)}`);
  return parseInt(match[0].replace(/[.,]/g, ''), 10);
}

/** Nomor test case dua digit, mis. 7 -> '07'. */
export const num = (n: number): string => String(n).padStart(2, '0');
