"""Fixture `files`: file contoh untuk test upload.

File dibuat di memori saat test berjalan, jadi TIDAK ada file fisik yang perlu disiapkan/di-commit.
Pemakaian di test:

    media_library.upload(files["png"])      # gambar valid
    media_library.upload(files["pdf"])      # format yang tidak didukung
    media_library.upload(files["big"])      # > 2 MB
"""
import struct
import zlib

import pytest


def _png_bytes(pad_bytes: int = 0) -> bytes:
    """Bangun gambar PNG 1x1 piksel yang valid. pad_bytes > 0 menambah data sampah agar ukuran file membesar."""

    def chunk(tag: bytes, data: bytes) -> bytes:
        # Setiap bagian PNG = panjang + nama + isi + checksum (CRC)
        crc = zlib.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)

    body = chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(b"\x00\xff\x00\x00"))
    if pad_bytes:
        body += chunk(b"tEXt", b"pad\x00" + b"x" * pad_bytes)
    return b"\x89PNG\r\n\x1a\n" + body + chunk(b"IEND", b"")


def _payload(name: str, mime: str, data: bytes) -> dict:
    """Format yang diterima Playwright set_input_files() untuk file dari memori."""
    return {"name": name, "mimeType": mime, "buffer": data}


@pytest.fixture(scope="session")
def files() -> dict:
    """Kamus file contoh: png, jpg, pdf, big (>2 MB), huge (>30 MB)."""
    return {
        "png": _payload("logo.png", "image/png", _png_bytes()),
        "jpg": _payload("logo.jpg", "image/jpeg", _png_bytes()),  # isi PNG, ekstensi JPG
        "pdf": _payload("dokumen.pdf", "application/pdf", b"%PDF-1.4\n%%EOF\n"),
        "big": _payload("logo-besar.png", "image/png", _png_bytes(2_200_000)),  # > 2 MB
        "huge": _payload("gambar-besar.png", "image/png", _png_bytes(30_000_000)),  # > batas umum
    }
