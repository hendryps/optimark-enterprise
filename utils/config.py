"""Pengaturan proyek: membaca file .env (URL staging, akun QA, timeout) dan menyediakannya sebagai variabel Python."""
import os
from pathlib import Path

from dotenv import load_dotenv

# Folder root project (satu level di atas folder utils)
ROOT = Path(__file__).resolve().parent.parent
# Baca file .env supaya isinya bisa diambil lewat os.getenv
load_dotenv(ROOT / ".env")

# --- Pengaturan umum ---
BASE_URL = os.getenv("BASE_URL", "https://staging.app.optimark.ai").rstrip("/")
HEADLESS = os.getenv("HEADLESS", "false").lower() == "true"  # default false = browser TAMPIL; true = tidak tampil
SLOW_MO = int(os.getenv("SLOW_MO", "1000"))  # jeda per aksi (ms); 1000 = 1 detik supaya jalannya test terlihat
DEFAULT_TIMEOUT_MS = int(os.getenv("DEFAULT_TIMEOUT_MS", "10000"))  # batas tunggu aksi biasa
GENERATE_TIMEOUT_MS = int(os.getenv("GENERATE_TIMEOUT_MS", "240000"))  # batas tunggu AI generate
VIDEO_FILE = os.getenv("VIDEO_FILE", "")  # path MP4 valid (opsional)

# Folder penyimpan session login supaya tiap akun hanya login sekali per sesi test
AUTH_DIR = ROOT / "auth"
AUTH_DIR.mkdir(exist_ok=True)

# peran akun -> awalan variabel .env. USER_* wajib, sisanya opsional.
ACCOUNTS = {
    "default": "USER",  # akun QA utama
    "user_b": "USER_B",  # akun kedua (isolasi data)
    "new_user": "NEW_USER",  # akun belum onboarding
    "google": "GOOGLE",  # akun Google untuk tes "Continue with Google" (GOOGLE_EMAIL / GOOGLE_PASSWORD)
}


def credentials(role: str) -> tuple[str, str]:
    """Email dan password untuk sebuah peran akun (string kosong kalau belum diisi)."""
    prefix = ACCOUNTS[role]
    return os.getenv(f"{prefix}_EMAIL", ""), os.getenv(f"{prefix}_PASSWORD", "")


def auth_file(role: str) -> Path:
    """Lokasi file sesi login untuk sebuah peran akun, mis. auth/default.json."""
    return AUTH_DIR / f"{role}.json"
