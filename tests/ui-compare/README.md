# UI Compare: Figma vs Staging

Folder ini membandingkan tampilan **staging** (hasil kerja dev) dengan **desain Figma/UX** untuk 3 fitur.

| File | Fitur | ID test |
|---|---|---|
| `brand-hub-ui.spec.ts` | Brand Hub | BHUI-01 .. BHUI-21 |
| `template-ui.spec.ts` | Template (Image Generator > tab Templates/Jelajahi) | TPLUI-01 .. TPLUI-10 |
| `media-library-ui.spec.ts` | Media Library | MLUI-01 .. MLUI-18 |
| `design-spec.ts` | **Data desain** (teks, ukuran, urutan dari Figma) | - |
| `ui-helpers.ts` | Helper cek teks, urutan, CSS | - |

## Cara jalan

```bash
npm run test:ui                                  # semua cek UI
npm run test:ui -- brand-hub-ui.spec.ts          # satu fitur
npm run test:ui -- --grep "MLUI-03"              # satu test
STRICT_LANGUAGE=true npm run test:ui             # wajib teks Indonesia seperti Figma
npm run report:ui                                # buka laporan HTML
```

Folder ini sengaja **terpisah dari `tests/e2e/`**: ini pengecekan UI/UX (desain vs staging), bukan test alur E2E.
Memakai konfigurasi sendiri `playwright.ui.config.ts`, dan `npm test` (E2E) tidak ikut menjalankannya.

Semua test aman: tidak menyimpan/menghapus data, tidak memakai token AI (semua dialog ditutup dengan Batal).

## Cara kerja

1. Nilai "benar" ada di `design-spec.ts`. Desain berubah? Edit file itu saja.
2. Test membaca UI staging lalu membandingkannya (`expect.soft` = semua selisih dalam satu test dilaporkan sekaligus).
3. Label ditulis `{ id, en }` karena Figma berbahasa Indonesia sedangkan staging berbahasa Inggris. Test menerima salah satu; `STRICT_LANGUAGE=true` hanya menerima Indonesia.

## Arti hasil

- **passed**: UI staging sama dengan desain.
- **`bug: ...` (expected failure)**: selisih desain yang sudah terkonfirmasi, alasannya tertulis di test. Kalau dev memperbaiki, test akan lolos dan ditandai gagal -> lepas tanda `bug`-nya.
- **skipped**: tidak ada data untuk diuji (akun QA belum punya media, galeri template kosong). Bukan berarti lolos.
