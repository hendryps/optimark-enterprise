/**
 * File contoh untuk test upload (fixture `files`).
 *
 * File dibuat di memori saat test berjalan, jadi TIDAK ada file fisik yang perlu disiapkan/di-commit.
 * Pemakaian di test:
 *   await mediaLibrary.upload(files.png);   // gambar valid
 *   await mediaLibrary.upload(files.pdf);   // format yang tidak didukung
 *   await mediaLibrary.upload(files.big);   // > 2 MB
 */
import zlib from 'node:zlib';

/** Format file yang diterima Playwright `setInputFiles()` untuk file dari memori. */
export interface FilePayload {
  name: string;
  mimeType: string;
  buffer: Buffer;
}

/** Kumpulan file contoh. */
export interface SampleFiles {
  png: FilePayload;
  jpg: FilePayload;
  pdf: FilePayload;
  /** Gambar > 2 MB. */
  big: FilePayload;
  /** Gambar > 30 MB (melewati batas umum). */
  huge: FilePayload;
}

/** Satu bagian (chunk) PNG = panjang + nama + isi + checksum (CRC). */
function chunk(tag: string, data: Buffer): Buffer {
  const tagBuf = Buffer.from(tag, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(Buffer.concat([tagBuf, data])) >>> 0);
  return Buffer.concat([length, tagBuf, data, crc]);
}

/** Bangun gambar PNG 1x1 piksel yang valid. `padBytes` > 0 menambah data sampah agar ukuran file membesar. */
function pngBytes(padBytes = 0): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(1, 0); // lebar
  header.writeUInt32BE(1, 4); // tinggi
  header.set([8, 2, 0, 0, 0], 8); // bit depth, color type, compression, filter, interlace
  const parts = [
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(Buffer.from([0x00, 0xff, 0x00, 0x00]))),
  ];
  if (padBytes) parts.push(chunk('tEXt', Buffer.concat([Buffer.from('pad\0'), Buffer.alloc(padBytes, 'x')])));
  parts.push(chunk('IEND', Buffer.alloc(0)));
  return Buffer.concat(parts);
}

/** Buat semua file contoh. */
export function createSampleFiles(): SampleFiles {
  return {
    png: { name: 'logo.png', mimeType: 'image/png', buffer: pngBytes() },
    jpg: { name: 'logo.jpg', mimeType: 'image/jpeg', buffer: pngBytes() }, // isi PNG, ekstensi JPG
    pdf: { name: 'dokumen.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF\n') },
    big: { name: 'logo-besar.png', mimeType: 'image/png', buffer: pngBytes(2_200_000) },
    huge: { name: 'gambar-besar.png', mimeType: 'image/png', buffer: pngBytes(30_000_000) },
  };
}
