# UI Checking: Media Library

Pengecekan tampilan **Media Library di staging** terhadap desain prototype
(https://claude.ai/artifact/Qh6LgroG44VKuimpSHnBLG).

| File | Isi | ID test |
|---|---|---|
| `media-library.spec.ts` | 59 cek UI: header, tab, filter, tampilan, dialog, state, aset, folder, responsif | MLCK-01 .. MLCK-59 |

Nilai desain (teks, ukuran, urutan) ada di `../ui-compare/design-spec.ts` (objek `MEDIA`), helper di `../ui-compare/ui-helpers.ts`.

## Cara jalan

```bash
npm run test:ui -- media-library.spec.ts          # semua cek Media Library
npm run test:ui -- --grep "MLCK-03"               # satu test
STRICT_LANGUAGE=true npm run test:ui -- media-library.spec.ts   # teks wajib Indonesia seperti desain
npm run report:ui                                 # laporan HTML
```

## Kelompok test

| Grup | ID | Yang dicek |
|---|---|---|
| A. Header | 01-07 | judul 24px/500, kolom cari, tinggi tombol, urutan, gaya primary/secondary, ikon |
| B. Tab | 08-14 | 4 tab, urutan, aktif default, satu aktif, ukuran, ARIA tab, sejajar toolbar |
| C. Filter & tampilan | 15-24 | tombol filter, grup Source/Ratio, urutan, checkbox, multi-pilih, kosong, Escape, Grid/List |
| D. Dialog | 25-34 | Folder Baru (isi, modal, disabled, spasi, maks 60, tutup), Upload, overlay drag |
| E. State | 35-40 | error + Coba Lagi, kosong, pencarian tidak ketemu, hapus kata kunci |
| F. Aset staging | 41-48 | gambar termuat, grid 4 kolom, hover aksi, menu, detail, konfirmasi hapus, pindah, List + sortir |
| G. Folder | 49-51 | menu folder, hanya di tab Semua, tombol kembali |
| H. Video | 52 | badge durasi |
| I. Responsif | 53-57 | tanpa scroll horizontal (1440/768/390), elemen di mobile, toolbar sticky |
| J. Belum aktif | 58-59 | banner penyimpanan dan pilih massal (dimatikan di prototype), di-skip |

## Soal aset

Tidak ada data tiruan: aset diambil dari **akun QA di staging**. Grup F, G, H, dan MLCK-57 otomatis **skip**
kalau akun belum punya media/folder. Skip bukan lolos. Upload dulu beberapa gambar, video, dan folder
ke akun QA agar test ini benar-benar berjalan (selector grup ini disusun dari desain prototype dan
belum bisa diverifikasi ke DOM staging selama akun masih kosong).

## Arti hasil

- **passed**: staging sama dengan desain.
- **`bug: ...`**: selisih desain yang sudah terkonfirmasi (test diharapkan gagal). Kalau dev memperbaiki,
  test akan ditandai gagal -> lepas tanda `bug`-nya.
- **skipped**: tidak ada data (media/folder) atau fitur belum aktif di desain.

Aman: tidak ada yang disimpan/dihapus; dialog selalu ditutup, konfirmasi hapus tidak pernah dikonfirmasi.
