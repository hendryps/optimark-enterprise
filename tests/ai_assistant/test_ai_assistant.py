"""Sheet 'e2e-ai assistant' (E2E-05-01 .. 05-27).

Catatan staging (28 Okt 2026): Enter = baris baru, kirim = tombol Send atau Ctrl/Cmd+Enter;
pengaturan Audience dan Budget digabung dalam satu tombol 'General · Budget Medium'.
Akun QA saldo 0: server menjawab 409 saat kirim, jadi test yang butuh jawaban AI memakai
fixture `funded` dan otomatis skip.
"""
import pytest
from playwright.sync_api import expect

from pages.base_page import rx
from utils.tc import tc

pytestmark = pytest.mark.assistant

NEED_AI = "Butuh akun dengan saldo token dan jawaban AI"
PROMPT = "Buatkan caption Instagram untuk promosi kopi susu gula aren."


@tc("E2E-05-01")
def test_05_01_akses_halaman(assistant):
    """Riwayat percakapan, New chat, pengaturan, input, dan tombol Send tampil."""
    expect(assistant.page.get_by_role("heading", name=rx("What can I help you with", "Apa yang"))).to_be_visible()
    expect(assistant.new_chat_button).to_be_visible()
    expect(assistant.settings_button).to_be_visible()
    expect(assistant.input).to_be_visible()
    expect(assistant.send_button).to_be_visible()
    expect(assistant.history_search).to_be_visible()


@tc("E2E-05-02", tokens=True, bug="Prompt tidak tampil di area percakapan setelah Kirim")
def test_05_02_kirim_dengan_tombol(assistant, funded):
    """Prompt tampil sebagai pesan pengguna lalu AI menjawab."""
    assistant.send(PROMPT)
    expect(assistant.chat_area.get_by_text(PROMPT)).to_be_visible()


@tc("E2E-05-03", tokens=True, bug="Staging: Enter = baris baru; kirim lewat Ctrl/Cmd+Enter")
def test_05_03_kirim_dengan_enter(assistant, funded):
    """Menekan Enter mengirim prompt satu kali."""
    assistant.input.fill(PROMPT)
    assistant.input.press("Enter")
    expect(assistant.chat_area.get_by_text(PROMPT)).to_be_visible()


@tc("E2E-05-04")
def test_05_04_input_multiline(assistant):
    """Shift+Enter membuat baris baru tanpa mengirim."""
    assistant.input.fill("Buatkan strategi promosi:")
    assistant.input.press("Shift+Enter")
    assistant.input.type("Target mahasiswa.")
    assert "\n" in assistant.input.input_value()
    expect(assistant.input).to_be_visible()


@tc("E2E-05-05")
def test_05_05_prompt_kosong(assistant):
    """Prompt kosong: tombol Send nonaktif."""
    expect(assistant.send_button).to_be_disabled()


@tc("E2E-05-06")
def test_05_06_prompt_spasi(assistant):
    """Prompt hanya spasi dianggap kosong: Send tetap nonaktif."""
    assistant.input.fill("     ")
    expect(assistant.send_button).to_be_disabled()


@tc("E2E-05-07", skip=NEED_AI)
def test_05_07_status_pemrosesan(assistant, funded):
    """Skenario: status pemrosesan. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-05-08", skip=NEED_AI)
def test_05_08_respons_relevan(assistant, funded):
    """Skenario: respons relevan. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-05-09", skip=NEED_AI)
def test_05_09_format_daftar(assistant, funded):
    """Skenario: format daftar. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-05-10", skip=NEED_AI)
def test_05_10_konteks_percakapan(assistant, funded):
    """Skenario: konteks percakapan. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-05-11", skip=NEED_AI)
def test_05_11_urutan_pesan(assistant, funded):
    """Skenario: urutan pesan. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-05-12")
def test_05_12_pengaturan_audiens(assistant):
    """Memilih Audience B2B memperbarui label pengaturan (isi jawaban AI diuji di test berbayar)."""
    assistant.settings_button.click()
    assistant.audience_select.select_option("B2B")  # Audience berupa <select> native
    expect(assistant.settings_button).to_contain_text("B2B")


@tc("E2E-05-13")
def test_05_13_pengaturan_budget(assistant):
    """Memilih Budget High memperbarui label pada tombol pengaturan."""
    assistant.settings_button.click()
    assistant.budget_select.select_option("High")  # Budget berupa <select> native
    expect(assistant.settings_button).to_contain_text("High")


@tc("E2E-05-14")
def test_05_14_konsistensi_pengaturan(assistant):
    """Default General + Medium; label tetap setelah ditutup/dibuka lagi."""
    expect(assistant.settings_button).to_contain_text("General")
    expect(assistant.settings_button).to_contain_text("Medium")
    assistant.settings_button.click()
    assistant.page.keyboard.press("Escape")
    expect(assistant.settings_button).to_contain_text("Medium")


@tc("E2E-05-15", skip="Butuh percakapan lama (butuh token untuk membuatnya)")
def test_05_15_chat_baru(assistant, funded):
    """Skenario: chat baru. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-05-16", skip=NEED_AI)
def test_05_16_pemisahan_konteks(assistant, funded):
    """Skenario: pemisahan konteks. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-05-17", skip=NEED_AI)
def test_05_17_penyimpanan_percakapan(assistant, funded):
    """Skenario: penyimpanan percakapan. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-05-18", skip=NEED_AI)
def test_05_18_riwayat_percakapan(assistant, funded):
    """Skenario: riwayat percakapan. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-05-19", skip=NEED_AI)
def test_05_19_judul_riwayat(assistant, funded):
    """Skenario: judul riwayat. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-05-20", skip=NEED_AI)
def test_05_20_persistensi_riwayat(assistant, funded):
    """Skenario: persistensi riwayat. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-05-21", skip="Butuh akun kedua dengan riwayat di akun pertama (butuh token)")
def test_05_21_isolasi_data(assistant, funded, user_b):
    """Skenario: isolasi data. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-05-22", skip=NEED_AI)
def test_05_22_salin_respons(assistant, funded):
    """Skenario: salin respons. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-05-23", skip=NEED_AI)
def test_05_23_feedback_positif(assistant, funded):
    """Skenario: feedback positif. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-05-24", skip=NEED_AI)
def test_05_24_feedback_negatif(assistant, funded):
    """Skenario: feedback negatif. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-05-25", skip=NEED_AI, tokens=True)
def test_05_25_penggunaan_token(assistant, funded):
    """Skenario: penggunaan token. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("E2E-05-26")
def test_05_26_batas_token(assistant, unfunded):
    """Saldo tidak cukup: permintaan tidak diproses, muncul info token tidak cukup, saldo tidak negatif."""
    before = assistant.token_balance()
    assistant.input.fill(PROMPT)
    assistant.send_button.click()
    assistant.expect_text("not enough", "insufficient", "tidak mencukupi", "tidak cukup", "buy", "upgrade")
    assert assistant.token_balance() == before >= 0


@tc("E2E-05-27")
def test_05_27_navigasi_riwayat_token(assistant):
    """'View history' pada panel token membuka panel 'Token Usage History'."""
    assistant.page.get_by_text(rx("View history", "Lihat riwayat")).click()
    expect(assistant.page.get_by_role("heading", name=rx("Token Usage History", "Riwayat Penggunaan Token"))).to_be_visible()
