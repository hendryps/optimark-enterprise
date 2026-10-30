"""BasePage: aksi umum yang diwariskan SEMUA page object (navigasi, tombol, angka, token, asersi) + helper rx()."""
import re

from playwright.sync_api import Locator, Page, expect

from utils import config


def rx(*alts: str, exact: bool = False) -> re.Pattern:
    """Regex dua bahasa. rx('Total Content', 'Total Konten') cocok dengan salah satunya.

    Staging berbahasa Inggris sedangkan Google Sheet berbahasa Indonesia, jadi semua
    label ditulis dalam dua bahasa supaya test tetap jalan kalau bahasa UI diganti.
    """
    body = "|".join(re.escape(a) for a in alts)
    return re.compile(rf"^\s*(?:{body})\s*$" if exact else body, re.I)


class BasePage:
    """Aksi umum untuk semua halaman Optimark. Locator memakai role/label/teks, bukan CSS."""

    def __init__(self, page: Page):
        # `page` = satu tab browser milik Playwright
        """Simpan `page` (satu tab browser Playwright) supaya bisa dipakai semua method."""
        self.page = page

    # --- navigasi ---
    def goto(self, path: str = "/") -> None:
        """Buka URL = BASE_URL + path, mis. goto('/dashboard')."""
        self.page.goto(f"{config.BASE_URL}{path}")

    def open_menu(self, name: str) -> None:
        """Klik menu sidebar berdasarkan nama (link atau button)."""
        self.page.get_by_role("navigation").get_by_role("link", name=rx(name, exact=True)).or_(
            self.page.get_by_role("navigation").get_by_role("button", name=rx(name, exact=True))).first.click()

    # --- elemen umum ---
    def button(self, *names: str, exact: bool = False) -> Locator:
        """Cari tombol berdasarkan nama (boleh beberapa nama: Inggris/Indonesia)."""
        return self.page.get_by_role("button", name=rx(*names, exact=exact))

    def text(self, *names: str, exact: bool = False) -> Locator:
        """Cari elemen berdasarkan teks yang tampil."""
        return self.page.get_by_text(rx(*names, exact=exact))

    def upload(self, file) -> None:
        """Upload lewat input file pertama. `file` = path atau dict {name, mimeType, buffer}."""
        self.page.locator("input[type=file]").first.set_input_files(file)

    def is_active(self, loc: Locator) -> bool:
        """Tombol/tab 'aktif' menurut atribut ARIA umum, class active/selected, atau
        class warna brand (staging menandai filter aktif dengan `bg-brand-600 text-white`)."""
        return loc.evaluate(
            """el => el.getAttribute('aria-pressed') === 'true'
                  || el.getAttribute('aria-selected') === 'true'
                  || el.getAttribute('data-state') === 'active'
                  || /(^|\\s)(active|selected|bg-brand-\\d+|bg-primary-muted)(\\s|$)/.test(el.className)"""
        )

    # --- angka ---
    @staticmethod
    def first_int(raw: str) -> int:
        """Angka pertama dalam teks, mis. 'Saldo 2.862' -> 2862 (titik/koma ribuan dibuang)."""
        m = re.search(r"\d[\d.,]*", raw)
        if not m:
            raise ValueError(f"Tidak ada angka di: {raw!r}")
        return int(re.sub(r"[.,]", "", m.group()))

    def number_near(self, *labels: str) -> int:
        """Angka pada kartu berlabel `labels`: paragraf (<p>) pertama yang mengikuti label.

        Menunggu sampai berisi angka supaya tidak salah baca saat kartu masih memuat data.
        """
        label = self.page.get_by_text(rx(*labels, exact=True)).first
        value = label.locator("xpath=following::p[1]")
        expect(value).to_have_text(re.compile(r"\d"))
        return self.first_int(value.inner_text())

    # --- token (panel di sidebar) ---
    def _token_panel(self) -> str:
        """Teks mentah panel token di sidebar (dipakai token_balance dan token_used)."""
        return self.page.get_by_role("button", name=rx("Remaining balance", "Saldo")).first.inner_text()

    def token_balance(self) -> int:
        """'Remaining balance' / 'Saldo tersisa' pada panel token."""
        m = re.search(r"(?:Remaining balance|Saldo[^\n]*)\s*([\d.,]+)", self._token_panel(), re.I)
        return self.first_int(m.group(1))

    def token_used(self) -> int:
        """'Used' / 'Terpakai' pada panel token."""
        m = re.search(r"(?:Used|Terpakai[^\n]*)\s*([\d.,]+)", self._token_panel(), re.I)
        return self.first_int(m.group(1))

    # --- asersi ---
    def expect_url_contains(self, fragment: str) -> None:
        """Pastikan URL saat ini mengandung potongan teks tertentu."""
        expect(self.page).to_have_url(re.compile(re.escape(fragment)))

    def expect_text(self, *names: str) -> None:
        """Teks (salah satu bahasa) tampil."""
        # filter(visible=True): abaikan <option> native yang tersembunyi
        expect(self.page.get_by_text(rx(*names)).filter(visible=True).first).to_be_visible()
