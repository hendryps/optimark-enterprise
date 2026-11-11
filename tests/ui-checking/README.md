# UI Checking

Pengecekan tampilan **Media Library** dan **Auth** di staging terhadap desain prototype
(https://claude.ai/artifact/Qh6LgroG44VKuimpSHnBLG).

| File | Isi | ID test |
|---|---|---|
| `auth.spec.ts` | Login, Register, Forgot Password, Verify Email, ganti bahasa, alur email (Mailsac), tablet/HP. Lihat bagian **Auth** di bawah | AUCK-01 .. AUCK-45 |
| `media-library.spec.ts` | Cek UI desktop, alur data, dan tablet/handphone (MLCK-69..82 dijalankan di 4 ukuran layar) | MLCK-01 .. MLCK-82 |

Nilai desain (teks, ukuran, urutan) ada di `../ui-compare/design-spec.ts` (objek `MEDIA`), helper di `../ui-compare/ui-helpers.ts`.

## Cara jalan

```bash
npm run test:ui -- media-library.spec.ts          # semua cek Media Library
npm run test:ui -- --grep "MLCK-03"               # satu test
STRICT_LANGUAGE=true npm run test:ui -- media-library.spec.ts   # teks wajib Indonesia seperti desain
npm run test:ui:destructive -- media-library.spec.ts   # + grup L (upload/buat/pindah/hapus sungguhan)
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
| K. Route | 60 | `/media-library` lewat URL langsung dan menu sidebar |
| M. Tablet & Handphone | 69-82 | per ukuran layar (tablet 768, handphone 390, handphone kecil 360, landscape 844x390): halaman rapi, header, tab, filter, Grid/List, dialog Folder Baru dan Upload, pencarian kosong, area sentuh. Dengan data (`@destructive`): kartu + aksi tanpa hover, List view, menu dan isi folder, dialog Pindahkan dan konfirmasi hapus, detail aset |
| L. Alur data (`@destructive`) | 61-68 | validasi nama (karakter khusus, duplikat), buat folder, hapus folder, upload jpg, upload mp4, pindah ke folder, hapus media |

## Tag (dari mind map QA)

| Tag | Arti | Grup |
|---|---|---|
| `@auto-ui` | Cek UI otomatis, tanpa data | B, C, D, K, M (tampilan) |
| `@perlu-data-uji` | Butuh media di akun QA atau file uji di `test-data/` | F, G, H, MLCK-65..68 |
| `@destructive` | Mengubah data staging, wajib cleanup. **Tidak ikut** `npm run test:ui` | L, M (dengan data) |
| `@bug` | Bug yang sudah diketahui (lihat label alasannya di laporan) | per test |

Filter di laporan HTML: ketik nama tag di kolom cari. Di terminal: `--grep @auto-ui`.

## Soal aset

Tidak ada data tiruan: aset diambil dari **akun QA di staging**. Grup F, G, H, dan MLCK-57 otomatis **skip**
kalau akun belum punya media/folder. Skip bukan lolos. Upload dulu beberapa gambar, video, dan folder
ke akun QA agar test ini benar-benar berjalan (selector grup ini disusun dari desain prototype dan
belum bisa diverifikasi ke DOM staging selama akun masih kosong).

## Tablet dan handphone (grup M)

Judul test memuat ukuran layarnya, mis. `MLCK-72 [handphone 390] panel filter muat di layar`.

```bash
npm run test:ui -- --grep "handphone 390"      # satu ukuran layar
npm run test:ui -- --grep "MLCK-75"             # satu test di semua ukuran
```

"Rapi" diperiksa otomatis oleh `expectTidy` (`../ui-compare/responsive-helpers.ts`): tidak scroll ke samping,
tidak terpotong di tepi layar, teks tidak terpotong/pecah baris, tidak saling menimpa, dialog muat, area sentuh >= 32px.
Temuan terkonfirmasi ada di `KNOWN_BUGS_MOBILE` (atas file spec, kunci `MLCK-nomor|ukuran layar`).
Test dengan data menyiapkan folder + gambar di ukuran desktop lalu kembali ke ukuran layar yang diuji.

## Data uji grup L dan M

- File uji: `test-data/sample-image.jpg` (3,7 KB) dan `test-data/sample-video.mp4` (32 KB, 2 detik), ikut di-commit.
- Nama unik: folder `QA Auto <angka>` (staging hanya menerima huruf, angka, spasi), file `qa auto <angka>.jpg|mp4`.
- Cleanup otomatis setelah setiap test: isi folder dihapus dulu, lalu foldernya, lalu media di root.
  Sisa dari run yang gagal di tengah jalan ikut dibersihkan di run berikutnya.

## Arti hasil

- **passed**: staging sama dengan desain.
- **`bug: ...`**: selisih desain yang sudah terkonfirmasi (test diharapkan gagal). Kalau dev memperbaiki,
  test akan ditandai gagal -> lepas tanda `bug`-nya.
- **skipped**: tidak ada data (media/folder) atau fitur belum aktif di desain.

Run default aman: tidak ada yang disimpan/dihapus; dialog selalu ditutup, konfirmasi hapus tidak pernah dikonfirmasi.
Hanya grup L (`npm run test:ui:destructive`) yang mengubah data, dan selalu dibersihkan lagi.

---

# Auth (`auth.spec.ts`)

Disusun dari mind map QA Auth. Teks EN/ID ada di `../ui-compare/design-spec.ts` (objek `AUTH`).
Semua test memakai tab **belum login** (fixture `anon`), kecuali AUCK-11 (login akun QA dari `.env`).

```bash
npm run test:ui -- auth.spec.ts                    # semua kecuali alur akun baru
npm run test:ui:destructive -- auth.spec.ts        # + daftar akun baru, verifikasi email, reset password (Mailsac)
npm run test:ui -- --grep "AUCK-2[89]|AUCK-3"      # grup ganti bahasa
```

| Grup | ID | Yang dicek |
|---|---|---|
| A. Route dan prasyarat | 01-05 | `/login`, `/register`, `/forgot-password`, `/verify-email` (tanpa/dengan token), halaman privat dialihkan ke login |
| B. Login | 06-13 | elemen + urutan, atribut kolom, tombol mata, form kosong, login salah, login berhasil ke Dashboard, tautan, Google |
| C. Forgot Password | 14-18 | elemen, kosong, format salah, layar Email Sent + hitung mundur, Back to sign in |
| D. Register | 19-27 | elemen + urutan, atribut kolom, form kosong, format email, aturan password (centang), konfirmasi beda, 2 tombol mata, Sign In, Google |
| E. Ganti bahasa | 28-36 | pemilih di semua halaman, Login ID, bahasa bertahan saat pindah halaman/reload, validasi ID, aturan password ID, error login ID, aria-label, istilah konsisten, kembali EN |
| F. Alur email (`@destructive @mailsac`) | 37-40 | Create account -> layar cek email, email verifikasi + halaman Verify, verifikasi -> Onboarding -> Dashboard, link reset password di email |
| G. Tampilan per layar | 41-45 | desktop 1440, tablet 768, HP 390, HP 360, landscape: Login, Register, Forgot + Email Sent, Verify Email, area sentuh |

| Tag | Arti |
|---|---|
| `@auto-ui` | Elemen form, pesan validasi, ganti bahasa. Aman, ikut run default |
| `@cek-tampil` | Continue with Google: hanya cek diarahkan ke accounts.google.com |
| `@mailsac` | Membaca email verifikasi / reset di Mailsac |
| `@destructive` | Membuat akun baru (email unik `@mailsac.com`), sekali per run |

Bug terkonfirmasi ada di `KNOWN_BUGS` di atas file (kunci `AUCK-nomor` atau `AUCK-nomor|ukuran layar`).
Batas server ("Too many attempts", ~15 menit) membuat test di-skip, bukan gagal.
