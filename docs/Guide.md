# Panduan Pemula: Automation Optimark (Playwright + Python)

Panduan ini untuk QA yang baru pertama kali melihat proyek ini. Tidak perlu tahu Playwright sebelumnya.

## 1. Ini sebenarnya apa?

Bayangkan ada **robot** yang bisa membuka browser, mengetik, mengklik, lalu memeriksa hasilnya,
persis seperti QA manual, tetapi lebih cepat dan tidak pernah bosan.

- **Playwright** = otot robotnya (yang mengendalikan browser).
- **pytest** = mandor robotnya (yang mengatur test mana jalan, lalu mencatat lolos atau gagal).
- **Python** = bahasa yang dipakai untuk menulis perintahnya.

Robot ini membuka **staging** (`https://staging.app.optimark.ai`), bukan produksi.
Setiap test dihubungkan ke baris di Google Sheet lewat ID, misalnya `E2E-03-10`.

## 2. Peta folder (apa isi tiap folder)

```
optimark/
├── tests/          <- DAFTAR TUGAS robot. Satu folder per menu aplikasi
│   ├── auth/             Login & Register        (E2E-01)
│   ├── onboarding/       Onboarding              (E2E-02)
│   ├── dashboard/        Dashboard               (E2E-03)
│   ├── content_composer/ Content Composer        (E2E-04)
│   ├── ai_assistant/     AI Assistant            (E2E-05)
│   ├── image_generator/  Image Generator         (E2E-06)
│   ├── video_generator/  Video Generator         (E2E-07)
│   ├── seo/              SEO                     (E2E-08, usulan)
│   ├── media_library/    Media Library           (E2E-09, usulan)
│   ├── brand_hub/        Brand Hub               (E2E-10, usulan)
│   ├── campaign/         Campaign                (E2E-11, usulan)
│   ├── billing/          Billing                 (E2E-12, usulan)
│   └── jira_oda/         Test dari tiket Jira ODA (ID: ODA-218-01 dst.)
│
├── pages/          <- PETA tiap halaman. Di mana tombol/kolom berada. Satu file per halaman
│   ├── base_page.py            alat umum yang dipakai semua halaman
│   ├── base_generator_page.py  alat khusus Image & Video Generator
│   └── dashboard_page.py, auth_page.py, ...
│
├── fixtures/       <- PERSIAPAN sebelum test mulai (buka browser, login, buka halaman)
│   ├── browser.py        buka browser, login, siapkan tab, rekam trace
│   ├── page_objects.py   "dashboard", "composer", ... = halaman yang sudah terbuka
│   ├── account_state.py  cek kondisi akun (punya token? sudah connect TikTok?) lalu skip kalau tidak cocok
│   └── sample_files.py   file contoh (PNG, PDF) untuk test upload
│
├── utils/          <- ALAT BANTU kecil
│   ├── config.py   baca file .env (URL, email, password, timeout)
│   └── tc.py       stiker @tc("E2E-xx-xx") untuk menandai test
│
├── docs/           <- dokumentasi (file ini)
├── playwright-report/ <- HASIL (index.html + rekaman trace test yang gagal). Dibuat otomatis
├── auth/           <- "tiket login" tersimpan. Dibuat otomatis, JANGAN di-commit
├── .claude/agents/ <- asisten AI Claude Code (lihat bagian 7)
├── conftest.py     <- daftar isi fixtures/ (pytest membacanya otomatis)
├── pytest.ini      <- pengaturan pytest
├── requirements.txt<- daftar library Python yang harus di-install
├── .env            <- RAHASIA: email & password akun QA. Tidak di-commit
└── .env.example    <- contoh isi .env
```

### Analogi restoran

| Bagian | Di restoran |
|---|---|
| `tests/` | Daftar pesanan: "buatkan nasi goreng, cek rasanya" |
| `pages/` | Denah dapur: bumbu di rak mana, kompor yang mana |
| `fixtures/` | Persiapan sebelum masak: nyalakan kompor, siapkan piring |
| `utils/` | Pisau dan talenan |
| `playwright-report/` | Catatan hasil: pesanan mana berhasil, mana gagal |

Kenapa dipisah? Kalau tombol di aplikasi pindah tempat, kita cukup memperbaiki **satu file di `pages/`**,
tidak perlu mengubah ratusan test. Pola ini bernama **Page Object Model (POM)**.

## 3. Cara menyiapkan (sekali saja)

Buka terminal di folder `optimark` (D:/optimark), lalu jalankan satu per satu:

```bash
python -m venv .venv                 # 1. buat "kotak" Python khusus proyek ini
.venv\Scripts\activate               # 2. masuk ke kotak itu (Windows). Terminal akan menampilkan (.venv)
pip install -r requirements.txt      # 3. pasang library (Playwright, pytest, dll)
playwright install chromium          # 4. unduh browser untuk robot
copy .env.example .env               # 5. buat file rahasia dari contoh
```

Lalu buka file `.env` dan isi `USER_EMAIL` dan `USER_PASSWORD` dengan akun QA staging.

## 4. Cara menjalankan

Pastikan terminal masih dalam `(.venv)`.

```bash
pytest                                   # jalankan semua test yang aman
pytest tests/dashboard                   # hanya menu Dashboard
pytest tests/dashboard/test_dashboard.py # hanya satu file
pytest -k "03_10"                        # hanya test yang namanya mengandung 03_10
pytest -m dashboard                      # hanya test berstiker "dashboard"
```

Ingin **melihat** robot bekerja? Ubah `HEADLESS=false` di `.env` (browser tampil di layar).
`SLOW_MO=500` membuat robot bergerak pelan supaya mudah diikuti.

Marker (stiker) yang tersedia: `auth`, `onboarding`, `dashboard`, `composer`, `assistant`, `image`,
`video`, `seo`, `media_library`, `brand_hub`, `campaign`, `billing`.

### Test yang sengaja TIDAK ikut jalan

| Stiker | Artinya | Cara menjalankan sengaja |
|---|---|---|
| `consumes_tokens` | Memakai token asli (berbayar) | `pytest -m consumes_tokens` |
| `destructive` | Mengubah data permanen (upload, buat folder, onboarding) | `pytest -m destructive` |

Dua jenis ini dikecualikan supaya `pytest` biasa selalu aman.

## 5. Cara membaca hasil

Di terminal, tiap test diberi huruf/kata:

| Hasil | Artinya | Perlu tindakan? |
|---|---|---|
| `PASSED` / `.` | Lolos, sesuai harapan | Tidak |
| `FAILED` / `F` | Gagal: ada yang tidak sesuai | **Ya**, selidiki. Mungkin bug atau locator berubah |
| `SKIPPED` / `s` | Dilewati. Alasannya tertulis (mis. saldo token 0) | Biasanya tidak |
| `XFAIL` / `x` | Gagal yang sudah diketahui (bug tercatat di sheet) | Tidak |
| `XPASS` | Harusnya gagal, tapi lolos = bug sudah diperbaiki | Ya, lepaskan `bug=` dari `@tc` |

Setelah selesai, buka laporan lewat terminal:

```bash
npx playwright show-report                 # buka laporan di browser (Ctrl+C untuk berhenti)
npx playwright show-report --port 9324     # kalau port 9323 sedang dipakai proyek lain
```

Untuk test yang gagal, ada rekaman di `playwright-report/traces/<nama-test>.zip`. Buka dengan:

```bash
npx playwright show-trace playwright-report/traces/<nama-test>.zip
```

Isinya seperti rekaman video yang bisa di-pause: tiap langkah, screenshot, dan error-nya.

## 6. Cara menulis test baru (contoh)

Misal menambah test "tombol Upload tampil di Media Library".

**Langkah 1: pastikan elemennya ada di `pages/media_library_page.py`** (tambahkan kalau belum):

```python
@property
def upload_button(self):
    """Tombol 'Upload'."""
    return self.page.get_by_role("main").get_by_role("button", name="Upload", exact=True)
```

**Langkah 2: tulis test di `tests/media_library/test_media_library.py`:**

```python
@tc("E2E-09-99")                       # ID test case
def test_09_99_tombol_upload(media_library):   # media_library = halaman sudah terbuka & sudah login
    """Tombol Upload tampil."""        # penjelasan satu kalimat
    expect(media_library.upload_button).to_be_visible()   # periksa: tombol harus tampil
```

**Langkah 3: jalankan hanya test itu:**

```bash
pytest -k "09_99"
```

### Kamus kecil

| Kata | Artinya |
|---|---|
| **fixture** | Persiapan otomatis. Tulis namanya di tanda kurung test, pytest menyiapkannya |
| **locator** | Cara robot menemukan elemen, mis. "tombol bernama Upload" |
| **expect(...)** | Pemeriksaan. Robot menunggu (sampai 10 detik) sampai kondisi terpenuhi, kalau tidak: gagal |
| **page object** | Kelas yang menyimpan locator satu halaman |
| **marker / stiker** | Label pada test (`@tc`, `dashboard`, `destructive`) untuk memilih test |
| **trace** | Rekaman jalannya test, untuk investigasi test gagal |
| **staging** | Server uji coba. Aman dicoba, bukan data pelanggan asli |

### Tips memilih locator

Urutan terbaik (paling stabil dulu): `get_by_role` -> `get_by_label` -> `get_by_placeholder` -> `get_by_text`.
Hindari CSS acak seperti `.btn-3x9f`, karena mudah berubah. Untuk melihat locator di halaman nyata:

```bash
playwright codegen https://staging.app.optimark.ai
```

Browser terbuka; klik apa saja dan Playwright menuliskan kodenya.

## 7. Dua file di `.claude/agents/`

Ini asisten AI untuk **Claude Code**, bukan bagian dari pytest. Keduanya berasal dari plugin `qa-my-app`.

- `qa-page-analyzer`: membuka satu halaman lewat browser, lalu mendaftar semua tombol, form, dan modal-nya.
  Berguna untuk **mencari locator** sebelum menulis page object baru.
- `qa-test-runner`: menjalankan test case berbentuk file markdown (`QA-tests/tasks/T*.md`) dan menulis `result.md`.
  Ini alur terpisah dari pytest; test pytest di proyek ini tidak memakainya.

Tidak wajib dipakai untuk menjalankan automation. Kalau tidak butuh, abaikan saja.

## 8. Masalah yang sering muncul

| Gejala | Penyebab | Solusi |
|---|---|---|
| Banyak test `SKIPPED` "Kredensial ... belum diisi" | `.env` belum diisi | Isi `USER_EMAIL` dan `USER_PASSWORD` |
| `pytest` tidak dikenali | Lupa mengaktifkan `.venv` | Jalankan `.venv\Scripts\activate` |
| `Executable doesn't exist` | Browser belum diunduh | `playwright install chromium` |
| Test gagal `Timeout` | Staging lambat atau elemen berubah | Jalankan ulang; kalau tetap, buka trace-nya |
| Test generate dilewati "tidak punya saldo token" | Akun QA tokennya 0 | Top-up token, lalu `pytest -m consumes_tokens` |
