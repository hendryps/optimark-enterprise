"""Kelas dasar untuk Image Generator dan Video Generator (keduanya hampir sama: prompt, konfigurasi, tombol Generate)."""
from playwright.sync_api import Locator, expect

from pages.base_page import BasePage, rx
from utils import config


class GeneratorPage(BasePage):
    """Dasar Image Generator dan Video Generator.

    Di staging, 'Explore' dan 'History' adalah button (bukan tab), semua konfigurasi
    berupa button ber-aria-label (Model, Aspect ratio, ...) yang membuka pilihan.
    """

    PATH = ""
    PROMPT_HINT = ""  # potongan placeholder prompt
    GENERATE_NAME = ""
    PRICE_HINT = ""  # potongan teks tombol Generate di desain baru, mis. "/ Image" (tombol "20 / Image")

    def open(self):
        """Buka halaman generator (PATH milik subclass) dan tunggu kolom prompt tampil."""
        self.goto(self.PATH)
        expect(self.prompt).to_be_visible(timeout=30000)  # halaman kadang lambat memuat
        return self

    # --- tab ---
    def tab(self, *names: str) -> Locator:
        """Tombol tab 'Explore' / 'History' (di staging berupa button, bukan role=tab)."""
        return self.page.get_by_role("main").get_by_role("button", name=rx(*names, exact=True)).first

    def open_tab(self, *names: str) -> None:
        """Klik tab dengan nama tertentu."""
        self.tab(*names).click()

    def history_count(self) -> int:
        """Angka pada badge tab History/Riwayat."""
        return self.first_int(self.tab("History", "Riwayat").inner_text())

    # --- prompt ---
    @property
    def prompt(self) -> Locator:
        """Kolom prompt (deskripsi gambar/video yang ingin dibuat)."""
        return self.page.get_by_role("textbox", name=rx(self.PROMPT_HINT))

    @property
    def generate_button(self) -> Locator:
        """Tombol Generate."""
        return self.page.get_by_role("button", name=rx(self.GENERATE_NAME, "Generate", "Buat"))

    def write_prompt(self, text: str) -> None:
        """Ketik teks ke kolom prompt."""
        self.prompt.fill(text)

    # --- konfigurasi ---
    def option_button(self, label: str) -> Locator:
        """Button konfigurasi (Model, Aspect ratio, Quality, Style, Number of images, Resolution, Duration)."""
        return self.page.get_by_role("button", name=rx(label, exact=True))

    def current(self, label: str) -> str:
        """Nilai yang sedang aktif pada sebuah konfigurasi."""
        return self.option_button(label).inner_text().strip()

    def _set_open(self, label: str, open_: bool) -> None:
        """Buka/tutup popup konfigurasi sesuai aria-expanded (klik hanya kalau perlu, karena klik = toggle)."""
        btn = self.option_button(label)
        if (btn.get_attribute("aria-expanded") == "true") != open_:
            btn.click()

    def options(self, label: str) -> list[str]:
        """Daftar pilihan pada sebuah konfigurasi (popup dibuka, dibaca, lalu ditutup)."""
        self._set_open(label, True)
        # popup berada satu wrapper dengan tombolnya
        texts = self.option_button(label).locator("xpath=..").inner_text().splitlines()
        self._set_open(label, False)
        return [t.strip() for t in texts if t.strip()]

    def choose(self, label: str, option: str) -> None:
        """Buka popup konfigurasi lalu klik pilihan. Pilihan berupa elemen biasa (bukan role=option);
        popup ditambahkan setelah tombolnya di DOM, jadi pencocokan teks diambil yang terakhir."""
        self._set_open(label, True)
        self.page.get_by_text(rx(option, exact=True)).filter(visible=True).last.click()

    @property
    def brand_hub_switch(self) -> Locator:
        """Toggle 'Brand Hub' di kotak prompt (memakai identitas brand dari Brand Hub).

        Di staging berupa button dengan aria-pressed true/false (bukan role=switch seperti dulu)."""
        return self.page.get_by_role("main").get_by_role("button", name="Brand Hub", exact=True)

    # --- referensi ---
    def upload_reference(self, file) -> None:
        """Upload gambar/video referensi."""
        self.upload(file)

    # --- proses ---
    def generate(self) -> None:
        # Tombol antrean melayang ("Open queue") bisa menutupi tombol Generate pada viewport kecil
        """Klik Generate. Memakai dispatch_event karena tombol antrean melayang bisa menutupi tombol ini."""
        self.generate_button.dispatch_event("click")

    def queue_count(self) -> int:
        """Jumlah job di antrean, dari aria-label 'Open queue (N jobs)' (0 kalau tombol tidak ada)."""
        btn = self.page.get_by_role("button", name=rx("Open queue"))
        if not btn.count():
            return 0
        return self.first_int(btn.first.get_attribute("aria-label").split("(")[-1])

    def expect_insufficient_token(self) -> None:
        """Pastikan pesan 'token tidak mencukupi' tampil."""
        expect(self.page.get_by_text(rx("not enough", "insufficient", "tidak mencukupi", "tidak cukup")).first
               ).to_be_visible()

    def generate_and_capture(self, prompt: str) -> dict:
        """Isi prompt, klik Generate (tombol bertuliskan harga token), lalu tangkap request/respons API generate.

        Mengembalikan {"status": kode HTTP, "payload": isi request (dict), "body": isi respons (teks)}.
        Berguna untuk memeriksa apa yang DIKIRIM ke server (mis. flag using_brandhub) dan apakah job berhasil masuk antrean.
        """
        self.write_prompt(prompt)
        button = self.page.get_by_role("main").get_by_role("button", name=self.PRICE_HINT).first
        with self.page.expect_response(lambda r: r.request.method == "POST" and "generate" in r.url, timeout=30000) as info:
            button.click()
        resp = info.value
        try:
            payload = resp.request.post_data_json or {}
        except Exception:
            payload = {}
        return {"status": resp.status, "payload": payload, "body": resp.text()}
