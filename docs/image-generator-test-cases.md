# Test Case Image Generator (versi artifact terbaru)

Sumber: artifact https://claude.ai/artifact/Qh6LgroG44VKuimpSHnBLG (prototype UI Optimark, menu **AI Marketing Studio > Image Generator**).
Status: **DRAFT untuk di-review**. Spec Playwright ([image-generator.spec.ts](../tests/e2e/image-generator/image-generator.spec.ts)) belum diubah; setelah daftar ini disetujui, spec dan page object disesuaikan.

> **Update:** artifact hanya acuan UI/UX; elemen diambil dari staging (UI staging berbahasa Inggris: tab Templates/History, kategori Product Photography dll, Quality Low/Medium/High). Daftar di bawah masih memakai istilah artifact sebagai referensi. Di spec Playwright, ID lama IMG-01..35 dipertahankan (sesuai mapping Google Sheet) dan fitur baru ditambahkan sebagai IMG-36..46.

## Perbedaan UI artifact vs spec saat ini

| Hal | Spec saat ini | Artifact terbaru |
|---|---|---|
| Tab | Explore / History | **Template** / **Riwayat** (default buka di Template; kalau dari "Gunakan Prompt" langsung ke Riwayat) |
| Kualitas | Low/Medium/High (Medium) | **Rendah / Sedang / Tinggi** (default Sedang) |
| Jumlah gambar | Number of images, default 1 | Pilihan 1-4, default **1** |
| Rasio | 1:1, 3:2, dll | 21:9, 16:9, 3:2, 4:3, 1:1, 3:4, 9:16 (default **1:1**) |
| Resolusi | tidak ada | **1K / 2K / 4K** (default 1K) |
| Model | GPT Image 1.5 | **GPT Image 2** (default) + 9 model lain, ada filter tag |
| Tombol Generate | label "30 / Image" | label **"5 / Gambar"** (biaya per gambar), tooltip "N x biaya = total token" |
| Prompt kosong | tombol nonaktif | tombol nonaktif + tooltip "Masukan prompt untuk generate" |
| Saldo kurang | tombol aktif lalu muncul pesan | tombol **nonaktif** + tooltip "Token tidak cukup: butuh X, saldo Y" |
| Referensi | 1 gambar | **maks 5 gambar**, ada progres upload |
| Fitur baru | - | Template (Recreate), Brand Hub toggle, Batalkan, Hapus, Buat Ulang, Jadikan Referensi, Gunakan di Composer, pencarian dan filter Riwayat |

Saldo awal di artifact: **100 token**. Biaya per gambar = token model x pengali kualitas (Rendah 0,5 / Sedang 1 / Tinggi 2, dibulatkan, minimal 1).

## Catatan [PLACEHOLDER] di artifact (belum final di desain)

Test untuk bagian ini ditandai **(P)**: nilainya bisa berubah, jangan dikunci ketat dulu.
- Token per model, pengali kualitas, kemampuan tiap model (rasio/resolusi/kualitas/jumlah maksimal).
- UI "Insufficient Token Balance" (sekarang hanya tooltip).
- Tooltip tombol hapus referensi.

## Daftar test case

Prioritas: **H** = tinggi, **M** = sedang, **L** = rendah. Tipe: **Auto** = bisa diotomasi tanpa token, **Token** = memakai saldo (hanya jalan dengan `npm run test:tokens`), **Manual** = butuh data/akun khusus.

### A. Akses dan tampilan halaman

| ID | Skenario | Langkah singkat | Hasil yang diharapkan | Prio | Tipe |
|---|---|---|---|---|---|
| IMG-01 | Buka halaman Image Generator | Klik menu Image Generator | Tab Template aktif; ada tab Template dan Riwayat; kotak prompt, tombol "Gambar" (referensi), toggle Brand Hub, chip pengaturan, tombol Generate tampil; breadcrumb "Image Generator > Template" | H | Auto |
| IMG-02 | Nilai default pengaturan | Buka halaman baru | Model GPT Image 2, rasio 1:1, kualitas Sedang, jumlah 1, label tombol "5 / Gambar" | H | Auto |
| IMG-03 | Saldo token tampil di header | Lihat header | Saldo tampil sebagai angka (artifact: 100) | M | Auto |
| IMG-04 | Pindah tab Template <-> Riwayat | Klik Riwayat lalu Template | Isi tab berganti, breadcrumb ikut berubah, saldo tidak berubah, tidak ada generate | M | Auto |
| IMG-05 | Riwayat kosong | Akun tanpa hasil generate, buka Riwayat | Tampil "Belum ada hasil generate" | M | Auto |

### B. Tab Template

| ID | Skenario | Langkah singkat | Hasil yang diharapkan | Prio | Tipe |
|---|---|---|---|---|---|
| IMG-06 | Kategori template | Buka tab Template | Chip kategori: Poster Promosi, Feed Instagram, Story Instagram, Baner Iklan, Foto Produk (tanpa Video Promosi); grid kartu template tampil | H | Auto |
| IMG-07 | Filter kategori | Klik tiap chip kategori | Grid hanya berisi template kategori itu; "Semua" menampilkan campuran | M | Auto |
| IMG-08 | Buka detail template | Klik kartu template | Modal detail terbuka: preview, langkah upload foto produk (Wajib), tombol "Gunakan Template", tombol tutup | H | Auto |
| IMG-09 | Tutup detail template | Klik tutup / "Kembali ke daftar template" | Modal tertutup, kembali ke daftar | L | Auto |
| IMG-10 | Gunakan template | Di modal klik "Gunakan Template" | Modal tertutup; template menempel di atas kotak prompt; rasio mengikuti template; tombol "Gambar" (referensi) tidak tersedia, tooltip "Tidak tersedia saat memakai template" | H | Auto |
| IMG-11 | Generate template tanpa foto produk | Pasang template, tanpa upload foto | Tombol Generate nonaktif, tooltip "Upload foto produk dulu" (atau "foto produk dan avatar" bila template butuh avatar) | H | Auto |
| IMG-12 | Prompt opsional saat pakai template | Pasang template + upload foto produk, prompt kosong | Tombol Generate aktif | M | Auto |
| IMG-13 | Ganti template setelah menulis instruksi | Tulis instruksi, pilih template lain | Dialog "Ganti template?" dengan tombol Batal, Ganti Template, "Ganti dan hapus instruksi" | M | Auto |
| IMG-14 | Batal ganti template | Di dialog klik Batal | Template lama tetap, instruksi tetap | L | Auto |
| IMG-15 | Model tidak sama dengan model template | Pasang template lalu ganti model | Strip template menampilkan keterangan bahwa model bukan model bawaan template | L | Auto |
| IMG-16 | Generate dari template | Template + foto produk, klik Generate | Pindah ke Riwayat, item baru "Memproses..." dengan chip nama template, saldo berkurang | H | Token |

### C. Prompt

| ID | Skenario | Langkah singkat | Hasil yang diharapkan | Prio | Tipe |
|---|---|---|---|---|---|
| IMG-17 | Isi prompt | Ketik prompt valid | Teks tampil utuh; Generate aktif (saldo cukup) | H | Auto |
| IMG-18 | Prompt kosong | Biarkan kosong | Generate nonaktif, tooltip "Masukan prompt untuk generate" | H | Auto |
| IMG-19 | Prompt hanya spasi | Ketik beberapa spasi | Dianggap kosong, Generate nonaktif | M | Auto |
| IMG-20 | Prompt multiline | Ketik dua baris | Baris tersimpan, kotak prompt membesar mengikuti isi | M | Auto |
| IMG-21 | Prompt sangat panjang | Ketik teks panjang | Tidak error; tinggi kotak dibatasi (scroll) | L | Auto |
| IMG-22 | Karakter khusus dan emoji | Prompt berisi simbol, emoji, tanda kutip | Tersimpan apa adanya, tidak merusak tampilan | L | Auto |

### D. Pengaturan (model, rasio, kualitas, jumlah, resolusi)

| ID | Skenario | Langkah singkat | Hasil yang diharapkan | Prio | Tipe |
|---|---|---|---|---|---|
| IMG-23 | Daftar model | Klik chip model | Dropdown memuat 10 model (GPT Image 2, FLUX 1.1 Pro, FLUX 1 Dev, FLUX Pro, Recraft V3, Luma Photon, Ideogram V2, Google Imagen 3, Google Imagen 3 Fast, Stable Diffusion 3.5 Large) dengan deskripsi; model aktif bertanda | H | Auto |
| IMG-24 | Filter model berdasarkan tag | Centang Foto Produk, Ilustrasi, Kreatif, Draft Cepat | Daftar hanya model yang cocok dengan salah satu tag terpilih | M | Auto |
| IMG-25 | Pilih model | Pilih FLUX 1 Dev | Chip model berubah, label biaya ikut berubah (P) | H | Auto |
| IMG-26 | Daftar rasio | Klik chip rasio | 7 pilihan: 21:9, 16:9, 3:2, 4:3, 1:1, 3:4, 9:16 (sesuai kemampuan model) | H | Auto |
| IMG-27 | Pilih rasio | Pilih 16:9 | Chip rasio berubah ke 16:9 | H | Auto |
| IMG-28 | Pilihan kualitas | Klik chip kualitas | Rendah, Sedang, Tinggi; default Sedang | H | Auto |
| IMG-29 | Biaya mengikuti kualitas (P) | Ganti kualitas Rendah/Sedang/Tinggi | Label tombol berubah: 3 / 5 / 10 per gambar (GPT Image 2) | M | Auto |
| IMG-30 | Pilihan jumlah | Klik chip jumlah | 1, 2, 3, 4; default 1 | H | Auto |
| IMG-31 | Total biaya = jumlah x biaya | Pilih jumlah 4 | Tooltip tombol "4 x 5 = 20 token" (P) | H | Auto |
| IMG-32 | Pilihan resolusi | Buka pengaturan | 1K, 2K, 4K; default 1K | M | Auto |
| IMG-33 | Model tidak mendukung pengaturan saat ini (P) | Pilih rasio 21:9 + resolusi 4K, ganti model ke FLUX 1 Dev | Pengaturan turun ke nilai terdekat yang didukung, muncul catatan "FLUX 1 Dev tidak mendukung semua pengaturan tadi: ..." | M | Auto |
| IMG-34 | Jumlah maksimal per model (P) | Pilih Recraft V3 | Jumlah maksimal 2 | L | Auto |
| IMG-35 | Konsistensi banyak pengaturan | Ubah rasio, kualitas, jumlah sekaligus | Semua chip menampilkan pilihan terakhir | M | Auto |
| IMG-36 | Pengaturan kembali default setelah generate | Setelah Generate | Prompt kosong, pengaturan kembali default | M | Token |

### E. Gambar referensi

| ID | Skenario | Langkah singkat | Hasil yang diharapkan | Prio | Tipe |
|---|---|---|---|---|---|
| IMG-37 | Upload 1 referensi | Klik "Gambar", pilih PNG valid | Thumbnail tampil dengan progres upload lalu siap | H | Auto |
| IMG-38 | Upload beberapa referensi | Pilih 3 gambar sekaligus | 3 thumbnail tampil | M | Auto |
| IMG-39 | Batas 5 referensi | Upload sampai 5 | Tile "Gambar" tampak nonaktif, tooltip "Maksimal 5 gambar"; gambar ke-6 tidak ditambahkan | H | Auto |
| IMG-40 | Hapus referensi | Hover thumbnail, klik hapus | Thumbnail hilang; tile aktif lagi bila sebelumnya penuh | H | Auto |
| IMG-41 | File bukan gambar | Pilih PDF | Tidak ditambahkan sebagai referensi | M | Auto |
| IMG-42 | Generate menunggu upload selesai | Saat progres belum 100% | Generate nonaktif sampai upload selesai | M | Auto |
| IMG-43 | Generate dengan referensi | Referensi + prompt, Generate | Hasil dibuat, referensi dikosongkan setelah submit | H | Token |

### F. Brand Hub

| ID | Skenario | Langkah singkat | Hasil yang diharapkan | Prio | Tipe |
|---|---|---|---|---|---|
| IMG-44 | Toggle Brand Hub default mati | Buka halaman | Toggle Brand Hub OFF (`aria-checked=false`) | M | Auto |
| IMG-45 | Nyalakan Brand Hub | Klik toggle | Toggle ON; tooltip "Pakai identitas brand dari Brand Hub" | M | Auto |
| IMG-46 | Brand Hub tercatat di Riwayat | Generate dengan toggle ON | Item Riwayat punya chip "Brand Hub"; toggle kembali OFF setelah submit | M | Token |

### G. Generate dan token

| ID | Skenario | Langkah singkat | Hasil yang diharapkan | Prio | Tipe |
|---|---|---|---|---|---|
| IMG-47 | Generate berhasil | Prompt valid, klik Generate | Tombol sempat loading; pindah ke tab Riwayat; item baru status "Memproses... N%" sebanyak jumlah gambar | H | Token |
| IMG-48 | Hasil selesai | Tunggu proses | Tiap slot menampilkan gambar, bisa diklik untuk detail, ada tombol unduh | H | Token |
| IMG-49 | Saldo berkurang sesuai biaya | Cek saldo sebelum/sesudah | Saldo turun sebesar jumlah x biaya per gambar | H | Token |
| IMG-50 | Saldo tidak mencukupi | Saldo < total biaya | Tombol Generate **nonaktif**, tooltip "Token tidak cukup: butuh X, saldo Y"; tidak ada job baru; saldo tetap | H | Auto |
| IMG-51 | Saldo cukup tepat | Saldo = total biaya | Generate aktif | M | Auto |
| IMG-52 | Gagal generate mengembalikan token | Slot berstatus gagal | Item menampilkan pesan gagal; token slot itu dikembalikan | H | Manual |
| IMG-53 | Batalkan proses | Saat "Memproses", klik Batalkan | Slot berstatus "Dibatalkan"; tombol berubah jadi Hapus | H | Token |
| IMG-54 | Hapus item gagal/dibatalkan | Klik Hapus | Item hilang dari Riwayat | M | Token |
| IMG-55 | Hasil tersimpan di Media Library | Setelah hasil selesai | Gambar muncul di Media Library (Gambar, sumber Hasil AI) lengkap dengan prompt dan model | H | Token |

### H. Riwayat

| ID | Skenario | Langkah singkat | Hasil yang diharapkan | Prio | Tipe |
|---|---|---|---|---|---|
| IMG-56 | Tampilan item Riwayat | Buka Riwayat berisi hasil | Judul tanggal-jam, gambar, prompt, chip model, rasio, resolusi, kualitas, jumlah, token | H | Token |
| IMG-57 | Urutan terbaru di atas | Generate dua kali | Item terbaru paling atas | M | Token |
| IMG-58 | Pencarian | Ketik kata dari prompt di "Cari hasil generate..." | Hanya item yang cocok tampil | M | Auto |
| IMG-59 | Filter Status dan Tanggal | Klik tombol Status / Tanggal | Dropdown filter muncul dan menyaring daftar (P: perilaku belum final) | L | Auto |
| IMG-60 | Grid mengikuti rasio | Hasil 4 gambar rasio 16:9, 3:2, 1:1 | Kolom: 16:9 = 2 kolom, 3:2 dan 4:3 = 3 kolom, lainnya 4 kolom | L | Token |
| IMG-61 | Persistensi Riwayat | Reload halaman | Riwayat masih ada | M | Token |
| IMG-62 | Isolasi Riwayat antar akun | Login akun B | Riwayat akun A tidak tampil | M | Manual |

### I. Detail hasil (modal) dan aksi lanjutan

| ID | Skenario | Langkah singkat | Hasil yang diharapkan | Prio | Tipe |
|---|---|---|---|---|---|
| IMG-63 | Buka detail hasil | Klik gambar di Riwayat | Modal: tanggal, chip (model, rasio, kualitas, jumlah, token), prompt, aksi Unduh, Buat Ulang, Jadikan Referensi, Gunakan di Composer; tombol Tutup | H | Token |
| IMG-64 | Unduh | Klik Unduh | File gambar terunduh (nama dari slug prompt) | M | Token |
| IMG-65 | Buat Ulang | Klik Buat Ulang | Kotak prompt terisi prompt dan semua pengaturan hasil itu; **tidak** generate dan saldo tidak berubah | H | Token |
| IMG-66 | Jadikan Referensi | Klik Jadikan Referensi | Gambar masuk ke daftar referensi (maks 5; bila penuh tombol nonaktif, tooltip "Maksimal 5 gambar") | M | Token |
| IMG-67 | Gunakan di Composer | Klik Gunakan di Composer | Pindah ke Buat Postingan dengan gambar terpasang | M | Token |
| IMG-68 | Tutup detail | Klik Tutup | Modal tertutup, tetap di Riwayat | L | Token |

### J. Reuse prompt dan alur dari menu lain

| ID | Skenario | Langkah singkat | Hasil yang diharapkan | Prio | Tipe |
|---|---|---|---|---|---|
| IMG-69 | Gunakan Prompt dari Media Library | Buka aset hasil AI, klik "Gunakan Prompt" | Image Generator terbuka di tab Riwayat dengan prompt dan pengaturan tersimpan terisi; setting yang tidak tersimpan harus dipilih lagi; tidak ada generate otomatis | M | Auto |
| IMG-70 | Handoff dari Artikel Generator | Datang dari Artikel dengan blok media menunggu | Banner dengan tombol "Kembali ke Artikel"; di detail hasil tombol utama jadi "Gunakan di Artikel" | L | Manual |

### K. Responsif

| ID | Skenario | Langkah singkat | Hasil yang diharapkan | Prio | Tipe |
|---|---|---|---|---|---|
| IMG-71 | Tampilan mobile | Lebar layar ponsel | Pengaturan terkumpul di tombol "Pengaturan"; hasil memakai maksimal 2 kolom; ketuk hasil membuka lightbox lalu "Lihat Detail" | L | Auto |

## Ringkasan

- Total **71** test case: Auto 48 (tanpa token), Token 20, Manual 3.
- Test **Token** sengaja hanya jalan dengan `npm run test:tokens -- tests/e2e/image-generator`, sama seperti spec sekarang.

## Pemetaan ke IMG lama (untuk update [test-id-mapping.csv](test-id-mapping.csv))

| ID lama | ID baru | Catatan |
|---|---|---|
| IMG-01 | IMG-01, IMG-02 | UI tab dan label berubah |
| IMG-02, IMG-03, IMG-04 | IMG-04, IMG-06, IMG-08 | Explore diganti Template; "Load more" tidak ada di artifact |
| IMG-05..08 | IMG-17..20 | |
| IMG-09..17 | IMG-23..35 | Kualitas dan jumlah pakai istilah baru |
| IMG-18..22 | IMG-37..42 | Referensi sekarang hingga 5 gambar |
| IMG-23..25 | IMG-47..48, IMG-63 | |
| IMG-26..30 | IMG-04, IMG-56..62 | Tab Riwayat |
| IMG-31..32 | IMG-49 | |
| IMG-33 | IMG-50 | Perilaku berubah: tombol nonaktif, bukan pesan error |
| IMG-34, IMG-35 | IMG-35, IMG-04 | |
