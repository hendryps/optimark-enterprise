# Optimark E2E: Playwright + Python

Automation untuk Google Sheet **"End to End Testing - Test Case Optimark"**, dijalankan di **staging**
(`https://staging.app.optimark.ai`). Setiap test ditautkan ke ID di sheet lewat `@tc("E2E-03-10")`.

## Setup

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium
copy .env.example .env      # isi USER_EMAIL / USER_PASSWORD (file .env tidak di-commit)
```

## Menjalankan

```bash
pytest                                  # run aman (default)
pytest tests/dashboard                  # satu menu (satu folder)
pytest -m dashboard                     # per modul: auth onboarding dashboard composer assistant image video seo media_library brand_hub campaign billing
pytest -k "E2E-03-10" --co              # cari berdasarkan nama
pytest -m consumes_tokens               # test yang MEMAKAI TOKEN asli (butuh saldo)
pytest -m destructive                   # test yang mengubah data permanen (onboarding, post terjadwal)
HEADLESS=false pytest -k 04_15          # lihat browsernya
```

Report: folder `playwright-report/`, dibuka dengan `npx playwright show-report` (tambahkan `--port 9324` kalau port 9323 sedang dipakai). Trace test gagal: `npx playwright show-trace playwright-report/traces/<nama-test>.zip`. Default `pytest` **mengecualikan** `consumes_tokens` dan `destructive`.

## Struktur

| Folder/File | Isi |
|---|---|
| `tests/<menu>/test_<menu>.py` | Satu folder per menu aplikasi (`auth`, `dashboard`, `media_library`, ...), isinya test |
| `tests/jira_oda/` | Test dari tiket Jira project **ODA** (kolom QA Testing), ID `ODA-<tiket>-<nn>`. Jalankan: `pytest tests/jira_oda` atau `pytest -m jira` |
| `pages/` | Page object, satu file per halaman (`dashboard_page.py`, ...) + `base_page.py` dan `base_generator_page.py` (dasar bersama). Semua locator ada di sini |
| `fixtures/` | Fixture pytest: `browser.py` (browser, login, tab), `page_objects.py` (halaman siap pakai), `account_state.py` (skip sesuai kondisi akun), `sample_files.py` (file upload) |
| `utils/config.py` | Baca `.env` (URL staging, kredensial, timeout) |
| `utils/tc.py` | Decorator `@tc(id, skip=, bug=, tokens=, destructive=)` |
| `conftest.py` | Hanya mendaftarkan isi `fixtures/` ke pytest |
| `docs/PANDUAN-PEMULA.md` | Panduan untuk QA baru: peta folder, cara menjalankan, cara menulis test |
| `.claude/agents/` | Agent Claude Code (`qa-page-analyzer`, `qa-test-runner`), opsional, di luar alur pytest |

Baru pertama kali? Baca **[docs/PANDUAN-PEMULA.md](docs/PANDUAN-PEMULA.md)**.

## Menu di luar Google Sheet

Lima menu sidebar ini belum punya test case di sheet, jadi test-nya dibuat dari UI staging dan ID-nya
**usulan** (bukan dari sheet). Tab `e2e-billing` di sheet masih kosong.

| Menu | File test | ID |
|---|---|---|
| SEO | `test_e2e_seo.py` | E2E-08-xx |
| Media Library | `test_e2e_media_library.py` | E2E-09-xx |
| Brand Hub | `test_e2e_brand_hub.py` | E2E-10-xx |
| Campaign | `test_e2e_campaign.py` | E2E-11-xx |
| Billing | `test_e2e_billing.py` | E2E-12-xx |

## Arti status di hasil run

- **passed**: sesuai Expected Result di sheet.
- **skipped**: tidak bisa/tidak aman diotomasi, atau akun QA belum memenuhi syarat. Alasannya tertulis. Contoh: butuh akun Google baru, butuh saldo token, butuh TikTok terhubung.
- **xfailed**: bug yang sudah tercatat di sheet (status Fail) atau perbedaan staging vs sheet. Alasan di `bug=`.
- **XPASS**: test yang ditandai bug ternyata lolos, berarti bug sudah diperbaiki, lepaskan `bug=`.

## Kondisi akun QA saat ini (28 Okt 2026)

Akun `manto07@mailsac.com`: onboarding selesai, **saldo token 0**, **belum ada platform terhubung**, belum ada konten.
Karena itu test yang butuh token / TikTok / data konten otomatis di-skip lewat fixture `funded`, `connected`, `with_content`.
Untuk mengaktifkannya: top-up token dan hubungkan TikTok di akun QA, lalu jalankan ulang.
Test kebalikannya (`unfunded`, `unconnected`, `no_content`) hanya jalan saat akun memang dalam kondisi itu.

## Akun tambahan (opsional, di `.env`)

| Variabel | Dipakai untuk |
|---|---|
| `USER_B_EMAIL/PASSWORD` | Isolasi data antar akun (E2E-05-21, 06-30, 07-36) |
| `NEW_USER_EMAIL/PASSWORD` | Akun BELUM onboarding: seluruh `test_e2e_onboarding` (di-skip tanpa ini) |
| `VIDEO_FILE` | Path MP4 valid untuk upload video di Composer |

## Perbedaan staging vs sheet yang ditemukan

- UI staging berbahasa **Inggris**; locator dibuat dua bahasa (Inggris/Indonesia) lewat `rx()`.
- Dashboard tidak punya kartu **Total Ads** dan tab grafik "Total ads" (hanya Total Content, Scheduled Content).
- Tombol **Create Ads / Buat Iklan** tidak ada di Content Planner.
- AI Assistant: kirim pesan lewat tombol Send atau **Ctrl/Cmd+Enter**; Audience dan Budget digabung di satu panel.
- Image Generator: rasio hanya 1:1, 3:2, 2:3. Tidak ada estimasi biaya token, hanya "N tokens left".
- Klik **Generate saat saldo 0** memasukkan job ke antrean tanpa pesan "token tidak cukup" (lihat 06-33, 07-39).

## Yang tidak diotomasi (di-skip)

Login/registrasi Google dengan akun nyata (Google memblokir otomasi), drag-and-drop file dari OS,
menunggu publikasi TikTok nyata, serta test yang butuh minimal data/token/notifikasi di akun QA.
Tab `Template TC` dan `e2e-billing` di sheet masih kosong, jadi belum ada test-nya.

## Catatan locator

Locator sudah diverifikasi langsung di staging untuk Login, Dashboard, Content Planner (List/Calendar),
AI Assistant, Image Generator, dan Video Generator (halaman utama). Form **Create Post** dan **onboarding**
belum bisa diverifikasi (butuh platform terhubung / akun baru), jadi locator-nya masih tebakan dari label di sheet.

## Test auth (login, register, lupa password)

| File | Isi | ID |
|---|---|---|
| `tests/auth/test_login.py` | Login email+password dan akun Google (positif + negatif) | `LOGIN-EP/EN/GP/GN-xx` |
| `tests/auth/test_register.py` | Register, verifikasi email via Mailsac, onboarding sampai Dashboard | `REG-Pxx` / `REG-Nxx` |
| `tests/auth/test_reset_password.py` | Forgot + reset password via Mailsac | `RST-Pxx` / `RST-Nxx` |

- Akun Google dan password diisi di `.env` (`GOOGLE_EMAIL`, `GOOGLE_PASSWORD`). Browser tampil (`HEADLESS=false`) dengan jeda `SLOW_MO=1000`.
- Email dummy dibuat otomatis (`utils/mailsac.py`), mis. `dimas.anggara.3110260216@mailsac.com`. Inbox Mailsac **publik**, jangan pakai data asli.
- **Rate limit staging:** registrasi dibatasi ~15 menit ("Too many attempts"), forgot password ~60 detik per email. Kalau terkena, test di-SKIP (bukan gagal). Jalankan folder `tests/auth` cukup sekali per ~15 menit.
- Akun yang berhasil sampai Dashboard dicatat di `playwright-report/test-data-registrasi.csv`; test gagal dicatat di `playwright-report/failures.md` (+ screenshot dan trace).
- Report HTML: buka `playwright-report/index.html` di browser.
