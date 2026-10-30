"""Fixture "kondisi akun": melewati (skip) test kalau akun QA tidak memenuhi syarat.

Akun QA di staging bisa berubah-ubah (saldo token habis, belum ada platform terhubung, belum ada
konten). Daripada test gagal dengan pesan membingungkan, test yang butuh kondisi tertentu cukup
menambahkan nama fixture di parameternya, mis.:

    def test_generate(image_gen, funded):   # otomatis SKIP kalau saldo token 0

Pasangan fixture:
    funded       <-> unfunded       (punya token   <-> tidak punya token)
    connected    <-> unconnected    (ada platform  <-> tanpa platform sosial)
    with_content <-> no_content     (ada konten    <-> belum ada konten)
"""
import pytest
from playwright.sync_api import Page

from pages.dashboard_page import DashboardPage


def _state(app: Page) -> dict:
    """Baca kondisi akun dari Dashboard, lalu kembali ke halaman semula.

    Kembali ke halaman asal penting supaya urutan fixture (halaman vs kondisi) tidak memengaruhi test.
    """
    back_to = app.url if app.url.startswith("http") else None
    dash = DashboardPage(app).open()
    state = {
        "tokens": dash.token_balance(),  # saldo token
        "connected": dash.not_connected_banner.count() == 0,  # banner "belum terhubung" tidak ada = sudah terhubung
        "content": dash.content_total(),  # jumlah konten
    }
    if back_to:
        app.goto(back_to)
    return state


@pytest.fixture
def funded(app) -> int:
    """Skip kalau saldo token 0. Mengembalikan saldo awal."""
    s = _state(app)["tokens"]
    if s <= 0:
        pytest.skip("Akun QA tidak punya saldo token")
    return s


@pytest.fixture
def unfunded(app) -> None:
    """Skip kalau akun masih punya token (untuk tes 'token tidak mencukupi')."""
    if _state(app)["tokens"] > 0:
        pytest.skip("Akun QA masih punya token; butuh akun dengan saldo tidak cukup")


@pytest.fixture
def connected(app) -> None:
    """Skip kalau belum ada platform sosial terhubung."""
    if not _state(app)["connected"]:
        pytest.skip("Akun QA belum menghubungkan platform sosial (mis. TikTok)")


@pytest.fixture
def unconnected(app) -> None:
    """Skip kalau sudah ada platform terhubung (untuk tes 'tanpa platform')."""
    if _state(app)["connected"]:
        pytest.skip("Akun QA sudah punya platform terhubung")


@pytest.fixture
def with_content(app) -> int:
    """Skip kalau akun belum punya konten. Mengembalikan jumlah konten."""
    n = _state(app)["content"]
    if n <= 0:
        pytest.skip("Akun QA belum punya konten")
    return n


@pytest.fixture
def no_content(app) -> None:
    """Skip kalau akun sudah punya konten (untuk tes state kosong)."""
    if _state(app)["content"] > 0:
        pytest.skip("Akun QA sudah punya konten")
