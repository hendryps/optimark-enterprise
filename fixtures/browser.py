"""Fixture browser: membuka Chromium, login, dan menyiapkan "tab" siap pakai untuk test.

Alur singkat (dibaca dari atas ke bawah):
    1. `browser`        -> satu Chromium dipakai bersama oleh semua test (hemat waktu).
    2. `state_*`        -> login SEKALI per akun, simpan "tiket masuk" (cookies) ke folder auth/.
    3. `app` / `anon` ... -> tiap test mendapat tab baru yang bersih, memakai tiket tadi.
    4. Setelah test selesai, tab ditutup dan rekaman trace disimpan kalau test gagal.
"""
import pytest
from playwright.sync_api import Browser, BrowserContext, Page, sync_playwright

from pages.auth_page import AuthPage
from utils import config

# Tempat menyimpan rekaman Playwright Trace (file .zip; buka dengan: npx playwright show-trace <file.zip>)
TRACE_DIR = config.ROOT / "playwright-report" / "traces"
# Catatan test gagal: screenshot + file failures.md (dibaca QA setelah run selesai)
SHOT_DIR = config.ROOT / "playwright-report" / "screenshots"
FAILURE_LOG = config.ROOT / "playwright-report" / "failures.md"


def pytest_sessionstart(session):
    """Awal run: kosongkan catatan kegagalan lama supaya failures.md hanya berisi run terbaru."""
    FAILURE_LOG.parent.mkdir(parents=True, exist_ok=True)
    FAILURE_LOG.write_text("# Catatan test gagal\n\n(Kosong = semua test lolos)\n", encoding="utf-8")
    for old in SHOT_DIR.glob("*.png") if SHOT_DIR.exists() else []:
        old.unlink()


def _record_failure(ctx: BrowserContext, request, safe_name: str) -> None:
    """Test gagal -> ambil screenshot layar terakhir dan tulis ringkasannya ke failures.md.

    Isi catatan: nama test, ID test case (@tc), URL saat gagal, pesan error, lokasi screenshot dan trace.
    """
    rep = request.node.rep_call
    tc_marker = request.node.get_closest_marker("tc")
    tc_id = tc_marker.args[0] if tc_marker else "-"
    page = ctx.pages[0] if ctx.pages else None
    shot = "-"
    url = "-"
    if page is not None:
        url = page.url
        try:
            SHOT_DIR.mkdir(parents=True, exist_ok=True)
            shot_path = SHOT_DIR / f"{safe_name}.png"
            page.screenshot(path=str(shot_path), full_page=True)
            shot = str(shot_path.relative_to(config.ROOT))
        except Exception as exc:  # screenshot gagal jangan menutupi error test asli
            shot = f"(screenshot gagal: {exc})"
    # Ambil baris error yang paling berguna (maksimal 15 baris terakhir)
    error = "\n".join(rep.longreprtext.strip().splitlines()[-15:])
    with FAILURE_LOG.open("a", encoding="utf-8") as f:
        f.write(
            f"## GAGAL: {request.node.name}\n"
            f"- Test case : {tc_id}\n"
            f"- File      : {request.node.nodeid}\n"
            f"- URL       : {url}\n"
            f"- Screenshot: {shot}\n"
            f"- Trace     : playwright-report/traces/{safe_name}.zip\n\n"
            f"```\n{error}\n```\n\n"
        )


# ---------------------------------------------------------------- hasil test -> trace
@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    """Hook pytest: catat hasil tiap fase test (setup/call/teardown) di objek `item`.

    Kenapa perlu? Fixture di bawah ingin tahu "test ini gagal atau lolos?" untuk memutuskan
    apakah trace disimpan. Hasilnya dibaca lewat `request.node.rep_call`.
    """
    outcome = yield
    setattr(item, f"rep_{call.when}", outcome.get_result())


def _finish(ctx: BrowserContext, request) -> None:
    """Dipanggil di akhir test: hentikan rekaman trace, simpan kalau perlu, lalu tutup context.

    Mode ditentukan opsi `--tracing` (lihat pytest.ini):
        off                -> tidak menyimpan apa-apa
        on                 -> simpan trace untuk SEMUA test
        retain-on-failure  -> simpan hanya untuk test yang gagal (default proyek ini)
    """
    mode = request.config.getoption("--tracing")
    rep = getattr(request.node, "rep_call", None)
    failed = rep is not None and rep.failed
    # Nama file dibersihkan dari karakter aneh supaya aman di Windows
    safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in request.node.name)
    if failed:
        _record_failure(ctx, request, safe)  # catat rapi sebelum tab ditutup
    if mode != "off":
        if mode == "on" or failed:
            TRACE_DIR.mkdir(parents=True, exist_ok=True)
            ctx.tracing.stop(path=str(TRACE_DIR / f"{safe}.zip"))
        else:
            ctx.tracing.stop()  # dibuang
    ctx.close()


# ---------------------------------------------------------------- browser
@pytest.fixture(scope="session")
def browser() -> Browser:
    """Satu browser Chromium untuk seluruh sesi test (scope="session" = dibuat sekali saja).

    HEADLESS=false di .env -> browser terlihat di layar. SLOW_MO memperlambat tiap aksi (untuk debugging).
    """
    with sync_playwright() as p:
        b = p.chromium.launch(headless=config.HEADLESS, slow_mo=config.SLOW_MO)
        yield b
        b.close()


# ---------------------------------------------------------------- login
def _login_state(browser: Browser, role: str) -> str:
    """Login lewat form email+password lalu simpan sesinya ke auth/<peran>.json.

    Dengan begitu 250+ test tidak perlu login satu per satu; cukup sekali per akun.
    Kalau kredensial akun itu belum diisi di .env, test yang membutuhkannya di-skip (bukan error).
    """
    email, password = config.credentials(role)
    if not (email and password):
        pytest.skip(f"Kredensial akun '{role}' belum diisi di .env")
    path = config.auth_file(role)
    ctx = browser.new_context(base_url=config.BASE_URL)
    page = ctx.new_page()
    AuthPage(page).open_login().login(email, password)
    ctx.storage_state(path=str(path))  # simpan cookies + localStorage
    ctx.close()
    return str(path)


@pytest.fixture(scope="session")
def state_default(browser) -> str:
    """Sesi login akun QA utama (USER_EMAIL di .env)."""
    return _login_state(browser, "default")


@pytest.fixture(scope="session")
def state_user_b(browser) -> str:
    """Sesi login akun kedua (USER_B_EMAIL), untuk test isolasi data antar akun."""
    return _login_state(browser, "user_b")


@pytest.fixture(scope="session")
def state_new_user(browser) -> str:
    """Sesi login akun yang BELUM onboarding (NEW_USER_EMAIL)."""
    return _login_state(browser, "new_user")


# ---------------------------------------------------------------- tab siap pakai
def _new_page(browser: Browser, state: str | None) -> tuple[BrowserContext, Page]:
    """Buat "context" baru (= profil browser yang bersih) beserta satu tab.

    state=None -> belum login. state=<path json> -> sudah login memakai sesi tersimpan.
    """
    ctx = browser.new_context(storage_state=state, base_url=config.BASE_URL)
    ctx.set_default_timeout(config.DEFAULT_TIMEOUT_MS)  # batas tunggu tiap aksi
    ctx.set_default_navigation_timeout(60000)  # staging kadang lambat saat load halaman
    ctx.tracing.start(screenshots=True, snapshots=True, sources=False)  # mulai merekam
    return ctx, ctx.new_page()


@pytest.fixture
def app(browser, state_default, request) -> Page:
    """Tab yang SUDAH login sebagai akun QA utama. Ini yang paling sering dipakai."""
    ctx, page = _new_page(browser, state_default)
    yield page  # <- test berjalan di sini
    _finish(ctx, request)


@pytest.fixture
def anon(browser, request) -> Page:
    """Tab TANPA login (anonim). Dipakai untuk test halaman login/register dan akses tanpa sesi."""
    ctx, page = _new_page(browser, None)
    yield page
    _finish(ctx, request)


@pytest.fixture
def user_b(browser, state_user_b, request) -> Page:
    """Tab yang login sebagai akun kedua."""
    ctx, page = _new_page(browser, state_user_b)
    yield page
    _finish(ctx, request)


@pytest.fixture
def new_user(browser, state_new_user, request) -> Page:
    """Tab yang login sebagai akun yang belum onboarding."""
    ctx, page = _new_page(browser, state_new_user)
    yield page
    _finish(ctx, request)
