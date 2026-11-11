# UI Compare: Figma vs Staging

Folder ini membandingkan tampilan **staging** (hasil kerja dev) dengan **desain Figma/UX** untuk 3 fitur.

| File | Fitur | ID test |
|---|---|---|
| `brand-hub-ui.spec.ts` | Brand Hub | BHUI-01 .. BHUI-21 |
| `template-ui.spec.ts` | Template (Image Generator > tab Templates/Jelajahi) | TPLUI-01 .. TPLUI-10 |
| `media-library-ui.spec.ts` | Media Library | MLUI-01 .. MLUI-18 |
| `../ui-checking/media-library.spec.ts` | Media Library (versi lengkap, lihat README di folder itu) | MLCK-01 .. MLCK-59 |
| `brand-hub-responsive.spec.ts` | Brand Hub di tablet dan handphone | BHRS-01 .. BHRS-10 |
| `media-library-responsive.spec.ts` | Media Library di tablet dan handphone | MLRS-01 .. MLRS-11 |
| `responsive-helpers.ts` | Pemeriksa kerapian layar kecil (overflow, menimpa, terpotong, area sentuh, dialog) | - |
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

## Tampilan responsif (tablet dan handphone)

`brand-hub-responsive.spec.ts` dan `media-library-responsive.spec.ts` memastikan UI tetap rapi dan menu tidak berantakan
di layar kecil. Tiap test dijalankan di 4 ukuran (`VIEWPORTS` di `responsive-helpers.ts`):
tablet 768x1024, handphone 390x844, handphone kecil 360x640, handphone landscape 844x390.
Judul test memuat ukuran layarnya, mis. `MLRS-04 [handphone 390] panel filter muat di layar`.

Yang diperiksa otomatis (`auditLayout`): halaman tidak melebar ke samping, elemen tidak terpotong di tepi layar,
teks tombol/tab tidak terpotong atau pecah baris, tidak ada tombol saling menimpa, area sentuh >= 32px,
dan dialog muat di layar (bisa di-scroll di dalamnya, tombol aksi terjangkau).

```bash
npm run test:ui -- brand-hub-responsive.spec.ts
npm run test:ui -- --grep "handphone 390"
npm run test:ui -- --grep "MLRS-04"
```

Temuan terkonfirmasi ditulis di `KNOWN_BUGS` (bagian atas tiap file, kunci `nomor|ukuran layar`) dan test-nya diharapkan gagal.
Kalau dev memperbaiki, test akan ditandai gagal: hapus barisnya dari `KNOWN_BUGS`.
Test aset (MLRS-09, MLRS-10) skip bila akun QA belum punya media.
