"""Bantuan untuk Mailsac (https://mailsac.com): membuat email dummy, membaca inbox, mengambil link di email.

Kenapa Mailsac? Inbox-nya PUBLIK: alamat apa pun @mailsac.com langsung jadi kotak surat tanpa daftar.
Jadi QA cukup mendaftarkan email "nama@mailsac.com" di Optimark, lalu membuka
https://mailsac.com/inbox/nama@mailsac.com untuk membaca email verifikasi / reset password.

PERINGATAN: karena publik, JANGAN pernah memakai data asli/pribadi di inbox Mailsac.

Cara pakai di test (lihat fixture `mailbox` di tests/auth/conftest.py):
    user = make_dummy_user()                                   # data dummy baru
    ...daftar di Optimark dengan user.email...
    body = mailbox.wait_for_mail(user.email, "Verify your")    # tunggu emailnya masuk
    link = extract_link(body, "verify-email")                  # ambil link verifikasi
"""
import csv
import random
import re
from dataclasses import dataclass
from datetime import datetime

from playwright.sync_api import Page

from utils import config

# Password dummy yang memenuhi aturan Optimark: 8-15 karakter, ada angka, huruf besar, huruf kecil, simbol !@#$%&*
DEFAULT_PASSWORD = "Optimark#2026"
NEW_PASSWORD = "Baru#Optimark26"  # dipakai saat tes reset password

# Nama depan + belakang supaya email dummy terlihat seperti orang sungguhan
_FIRST_NAMES = ["rizky", "dimas", "anindya", "salsabila", "bagas", "nadia", "fajar", "citra", "wulan", "gilang"]
_LAST_NAMES = ["pratama", "anggara", "wijaya", "kusuma", "lestari", "santoso", "permata", "ramadhan", "hakim", "putri"]

# File pencatatan data tes yang BERHASIL registrasi (untuk ditempel ke Google Sheet)
TEST_DATA_CSV = config.ROOT / "playwright-report" / "test-data-registrasi.csv"


@dataclass
class DummyUser:
    """Satu akun dummy: nama lengkap, email Mailsac, dan password."""

    full_name: str
    email: str
    password: str


def make_dummy_user() -> DummyUser:
    """Buat akun dummy BARU yang unik, mis. 'Dimas Anggara' / dimas.anggara.3110260216@mailsac.com.

    Angka di belakang = tanggal+jam saat test jalan (ddmmyyhhmm), supaya setiap run memakai email baru
    (satu email hanya bisa didaftarkan sekali di Optimark).
    """
    first = random.choice(_FIRST_NAMES)
    last = random.choice(_LAST_NAMES)
    stamp = datetime.now().strftime("%d%m%y%H%M")
    return DummyUser(
        full_name=f"{first.title()} {last.title()}",
        email=f"{first}.{last}.{stamp}@mailsac.com",
        password=DEFAULT_PASSWORD,
    )


def extract_link(mail_text: str, path_hint: str) -> str:
    """Ambil link staging Optimark dari teks email. path_hint = potongan path, mis. 'verify-email' atau 'reset-password'."""
    for url in re.findall(r"https?://\S+", mail_text):
        if path_hint in url:
            return url
    raise AssertionError(f"Link '{path_hint}' tidak ditemukan di email:\n{mail_text[:500]}")


def record_test_data(case_id: str, user: DummyUser, note: str) -> None:
    """Catat satu baris data tes yang berhasil ke playwright-report/test-data-registrasi.csv."""
    TEST_DATA_CSV.parent.mkdir(parents=True, exist_ok=True)
    is_new = not TEST_DATA_CSV.exists()
    with TEST_DATA_CSV.open("a", newline="", encoding="utf-8-sig") as f:  # utf-8-sig supaya rapi dibuka di Excel
        w = csv.writer(f)
        if is_new:
            w.writerow(["Tanggal", "ID Test Case", "Nama Lengkap", "Email", "Password", "Inbox Mailsac", "Catatan"])
        w.writerow([datetime.now().strftime("%Y-%m-%d %H:%M"), case_id, user.full_name, user.email,
                    user.password, f"https://mailsac.com/inbox/{user.email}", note])


class Mailsac:
    """Membaca inbox Mailsac lewat browser (tab terpisah dari tab aplikasi Optimark)."""

    def __init__(self, page: Page):
        """`page` = tab browser yang khusus dipakai untuk membuka mailsac.com."""
        self.page = page

    def open_inbox(self, address: str) -> None:
        """Buka halaman inbox sebuah alamat."""
        self.page.goto(f"https://mailsac.com/inbox/{address}")

    def _rows(self, subject_regex: str):
        """Baris email di tabel inbox yang subject-nya cocok."""
        return self.page.locator("table tbody tr").filter(has_text=re.compile(subject_regex, re.I))

    def count_mails(self, address: str, subject_regex: str) -> int:
        """Jumlah email bersubject tertentu yang sudah ada di inbox (0 kalau belum ada)."""
        self.open_inbox(address)
        self.page.wait_for_timeout(2500)  # beri waktu daftar email termuat
        return self._rows(subject_regex).count()

    def wait_for_mail(self, address: str, subject_regex: str, already_have: int = 0, timeout_s: int = 150) -> str:
        """Tunggu email baru bersubject `subject_regex` lalu kembalikan isi teksnya.

        already_have = jumlah email bersubject sama yang SUDAH ada sebelumnya (dari count_mails),
        supaya email lama tidak terbaca sebagai email baru. Inbox di-refresh tiap 5 detik.
        """
        waited = 0
        self.open_inbox(address)
        while waited <= timeout_s:
            self.page.wait_for_timeout(2500)
            rows = self._rows(subject_regex)
            if rows.count() > already_have:
                rows.first.click()  # baris paling atas = email terbaru
                # Isi email ditampilkan di dalam iframe (frame ke-2 setelah halaman utama).
                # URL iframe-nya kosong / about:srcdoc tergantung mode browser, jadi dipilih lewat urutan.
                for _ in range(20):
                    for frame in self.page.frames[1:]:
                        text = frame.inner_text("body").strip()
                        if text:
                            return text
                    self.page.wait_for_timeout(500)
            self.page.wait_for_timeout(2500)
            waited += 5
            self.page.reload()
        raise AssertionError(f"Email '{subject_regex}' tidak masuk ke {address} dalam {timeout_s} detik")
