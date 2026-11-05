# Optimark E2E — Playwright + TypeScript

Test otomatis untuk aplikasi Optimark, dijalankan di **staging** (`https://staging-app.optimark.ai`).
Setiap test punya ID unik di judulnya (mis. `DASH-10`, `ASST-02`) supaya mudah dicari dan dicocokkan
dengan Google Sheet (lihat [docs/test-id-mapping.csv](docs/test-id-mapping.csv) untuk ID lama → baru).

## 1. Setup (sekali saja)

Butuh **Node.js 20 atau lebih baru**.

```bash
npm install                      # pasang semua paket
                                 # browser test = Google Chrome (pasang Chrome biasa; atau: npx playwright install chrome)
copy .env.example .env           # lalu isi USER_EMAIL / USER_PASSWORD (file .env tidak di-commit)
```

## 2. Menjalankan test

```bash
npm test                              # run aman (default): tanpa test berat
npm run test:headless                 # tanpa menampilkan browser
npm run test:tokens                   # ikut menjalankan test yang MEMAKAI TOKEN asli
npm run test:destructive              # ikut menjalankan test yang MENYIMPAN/MENGHAPUS data
npm run test:all                      # semuanya
npm run test:list                     # hanya daftar test, tidak dijalankan
npm run report                        # buka laporan HTML (playwright-report/)
npm run typecheck                     # cek kesalahan penulisan kode TypeScript

# Memilih test tertentu
npx playwright test e2e/dashboard                    # satu folder (satu menu)
npx playwright test e2e/auth/login.spec.ts           # satu file
npx playwright test -g "DASH-10"                     # satu test berdasarkan ID di judul
npx playwright test -g "LOGIN"                       # semua test yang judulnya memuat teks itu (satu fitur)
npx playwright test --ui                             # mode UI interaktif (enak untuk debugging)
```

Test dijalankan **satu per satu** (bukan paralel) karena akun QA dipakai bersama dan server staging
punya batas percobaan (rate limit). Test yang memakai token atau mengubah data **tidak ikut** run
default; pakai perintah `test:tokens` / `test:destructive` kalau memang ingin menjalankannya.

## 3. Struktur folder

| Folder / file | Isi |
|---|---|
| `e2e/<menu>/*.spec.ts` | Test, satu folder per menu (`dashboard`, `auth`, `seo`, ...) |
| `src/pages/` | **Page object**: semua locator dan langkah per halaman (`dashboard-page.ts`, ...), dasar bersama di `base-page.ts` dan `generator-page.ts` |
| `src/fixtures/` | **Fixture**: `sessions.ts` (browser + login), `pages.ts` (halaman siap pakai), `account-state.ts` (skip sesuai kondisi akun), `auth.ts` (Mailsac + akun dummy), `index.ts` (pintu masuk) |
| `src/utils/` | `text.ts` (pencarian teks dua bahasa), `case-info.ts` (`meta()` untuk skip/bug/token), `mailsac.ts`, `new-account.ts`, `sample-files.ts` |
| `src/config/env.ts` | Membaca `.env` (URL staging, akun QA, timeout) |
| `playwright.config.ts` | Pengaturan Playwright (browser, timeout, laporan, filter test berat) |
| `docs/test-id-mapping.csv` | Pemetaan ID lama (Google Sheet) ke ID baru beserta file test-nya |

## 4. Cara membaca dan menulis test

Satu test = satu skenario. Polanya selalu **ARRANGE → ACT → ASSERT**:

```ts
import { expect, test } from '../../src/fixtures';

test('BILL-04 View plans tersedia', async ({ billing }) => {
  // ARRANGE: fixture `billing` sudah membuka halaman Billing dan sudah login
  // ACT: (tidak ada aksi tambahan)
  // ASSERT: tombol View plans harus tampil
  await expect(billing.viewPlansButton).toBeVisible();
});
```

- **ID test** ditulis di awal judul: `'BILL-04 View plans tersedia'`.
- **Fixture** (`billing`, `dashboard`, `app`, `anon`, `funded`, ...) ditulis di parameter. Playwright
  menyiapkannya otomatis. Daftar lengkap ada di `src/fixtures/`.
- **Locator dan langkah panjang** ada di page object (`src/pages/`), jadi test tetap pendek. Kalau
  tampilan aplikasi berubah, cukup perbaiki di satu tempat.
- **`expect(...)`** otomatis menunggu sampai kondisi terpenuhi (tidak perlu `sleep`).

### Kondisi khusus lewat `meta()`

```ts
import { expect, meta, test } from '../../src/fixtures';

// Belum bisa diotomasi -> dilewati dengan alasan
test('REG-02 registrasi Google', meta({ skip: 'Butuh akun Google baru' }), async () => {});

// Bug yang sudah diketahui -> DIHARAPKAN gagal. Kalau tiba-tiba lolos, test dianggap gagal
// sebagai sinyal bug sudah diperbaiki dan `bug` boleh dilepas.
test('CAMP-10 bahasa status', meta({ bug: 'Label tercampur bahasa' }), async ({ campaign }) => { /* ... */ });

// Memakai token AI asli / mengubah data permanen -> tidak ikut run default
test('IMG-23 generate', meta({ tokens: true }), async ({ imageGen, funded }) => { /* ... */ });
test('MEDIA-12 upload', meta({ destructive: true }), async ({ mediaLibrary, files }) => { /* ... */ });
```

### Fixture kondisi akun

Akun QA bisa berubah (saldo habis, belum ada konten). Tambahkan fixture ini di parameter supaya test
**otomatis dilewati** kalau syaratnya tidak terpenuhi, bukan gagal dengan pesan membingungkan:
`funded` / `unfunded` (punya token / tidak), `connected` / `unconnected` (ada platform sosial / tidak),
`withContent` / `noContent` (ada konten / belum).

## 5. Arti hasil run

- **passed**: sesuai yang diharapkan.
- **skipped**: tidak bisa/tidak aman diotomasi, atau akun QA belum memenuhi syarat (alasan tertulis di laporan).
- **expected failure**: test dengan `bug: ...` yang memang gagal (bug sudah tercatat).
- **failed**: ada yang tidak sesuai. Buka `npm run report` untuk melihat error, screenshot, dan trace.

## 6. Akun di `.env`

| Variabel | Dipakai untuk |
|---|---|
| `BASE_URL` | Alamat staging |
| `USER_EMAIL` / `USER_PASSWORD` | Akun QA utama (wajib) |
| `USER_B_EMAIL/PASSWORD` | Akun kedua, untuk test isolasi data (opsional) |
| `NEW_USER_EMAIL/PASSWORD` | Akun yang BELUM onboarding, untuk seluruh test onboarding (di-skip tanpa ini) |
| `HEADLESS` | `false` = browser tampil (default), `true` = tidak tampil |
| `SLOW_MO` | Jeda tiap aksi (ms) supaya jalannya test mudah diikuti |
| `GENERATE_TIMEOUT_MS` | Batas tunggu AI generate |

## 7. Catatan penting

- **Cloudflare di staging**: domain `staging-app.optimark.ai` memblokir browser otomatis di sebagian
  permintaan (login dan navigasi bisa dibalas 403). Kalau test gagal di langkah login/navigasi dengan
  halaman "blocked" atau menggantung, minta tim Optimark mengizinkan IP/mesin test.
- **Mailsac** dipakai untuk membaca email verifikasi dan reset password. Inbox-nya **publik**, jangan
  pernah memakai data asli di sana.
- **Akun dummy** untuk test register/reset dibuat otomatis dan disimpan di `auth/new-account.json`
  (dihapus otomatis di awal setiap run).
