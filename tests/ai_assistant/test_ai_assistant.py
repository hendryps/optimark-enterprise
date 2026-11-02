"""Sheet 'e2e-ai assistant' (ASST-01 .. ASST-27).

Catatan staging (28 Okt 2026): Enter = baris baru, kirim = tombol Send atau Ctrl/Cmd+Enter;
pengaturan Audience dan Budget digabung dalam satu tombol 'General · Budget Medium'.
Akun QA saldo 0: server menjawab 409 saat kirim, jadi test yang butuh jawaban AI memakai
fixture `funded` dan otomatis skip.
"""
import re

import pytest
from playwright.sync_api import expect

from pages.base_page import rx
from utils.tc import tc

pytestmark = pytest.mark.assistant

NEED_AI = "Butuh akun dengan saldo token dan jawaban AI"
# Temuan staging (2 Nov 2026): semua prompt dijawab template yang sama ("Siap. Saya bantu jawab secara praktis...
# Pertanyaan Anda: '<prompt>' ... Langkah yang disarankan: 1-2-3"), tanpa membahas isi topik. Test cek topik
# ditandai xfail; kalau AI sudah menjawab sesuai topik hasilnya XPASS sebagai sinyal untuk melepas tanda ini.
BUG_CAPTION = ("Staging: permintaan caption tertahan di 'Sedang membuat caption... Caption ready' (spinner) "
               "lebih dari 4 menit, jawaban final tidak muncul")
BUG_GENERIK = "Staging: AI menjawab template generik, tidak membahas topik prompt (hanya mengulang pertanyaan)"


@pytest.fixture(autouse=True)
def new_chat_after_test(request):
    """Selesai tiap test (jawaban AI sudah ditunggu di dalam test), buka New chat supaya
    test berikutnya mulai dari percakapan kosong dan tidak ada antrean/konteks tersisa."""
    yield
    if "assistant" in request.fixturenames and request.node.get_closest_marker("consumes_tokens"):
        try:
            request.getfixturevalue("assistant").new_chat()
        except Exception:
            pass  # test gagal di tengah jalan: biarkan error aslinya yang dilaporkan

# Satu prompt = satu topik baru. Topik yang SUDAH PERNAH dikirim ke staging (kopi gula aren, hola,
# lari/jantung, energi surya, toko buku, monstera, astronot, kereta uap, kaktus, bahasa Jepang)
# tidak dipakai lagi. Kalau menambah test, pilih topik yang belum ada di daftar ini.
# Tiap topik punya kata kunci (ID/EN) untuk memastikan jawaban AI sesuai topik yang dikirim.
P_CAPTION = "Buatkan caption Instagram untuk grand opening studio yoga di Ubud."
K_CAPTION = ("yoga", "ubud", "studio")

P_KESEHATAN = "Jelaskan manfaat meditasi bagi kualitas tidur."
K_KESEHATAN = ("meditasi", "tidur", "meditation", "sleep")

P_STATUS = "Apa itu blockchain dan bagaimana cara kerjanya?"
K_STATUS = ("blockchain", "blok", "block")

P_RELEVAN = "Rekomendasikan strategi pemasaran untuk bengkel sepeda motor."
K_RELEVAN = ("bengkel", "motor", "workshop", "garage")

P_DAFTAR = "Sebutkan lima tips memelihara kucing anggora di rumah."
K_DAFTAR = ("kucing", "anggora", "cat", "angora")

P_KONTEKS_1 = "Saya akan membuka kedai bakso di dekat kampus."
P_KONTEKS_2 = "Usulkan tiga nama yang menarik untuk usaha tadi."
K_KONTEKS = ("bakso", "kedai", "kampus", "meatball", "campus")

P_URUT_1 = "Ceritakan secara singkat asal-usul batik Pekalongan."
K_URUT_1 = ("batik", "pekalongan")
P_URUT_2 = "Bagaimana cara membuat sambal terasi yang tahan lama?"
K_URUT_2 = ("sambal", "terasi")

P_TOKEN = "Rancang itinerary tiga hari di Labuan Bajo."


@tc("ASST-01")
def test_05_01_akses_halaman(assistant):
    """Riwayat percakapan, New chat, pengaturan, input, dan tombol Send tampil."""
    expect(assistant.page.get_by_role("heading", name=rx("What can I help you with", "Apa yang"))).to_be_visible()
    expect(assistant.new_chat_button).to_be_visible()
    expect(assistant.settings_button).to_be_visible()
    expect(assistant.input).to_be_visible()
    expect(assistant.send_button).to_be_visible()
    expect(assistant.history_search).to_be_visible()


@tc("ASST-02", tokens=True, bug=BUG_CAPTION)
def test_05_02_kirim_dengan_tombol(assistant, funded):
    """Prompt tampil sebagai pesan pengguna lalu AI selesai menjawab sesuai topik."""
    answer = assistant.ask(P_CAPTION)
    assistant.assert_on_topic(answer, *K_CAPTION)


@tc("ASST-03", tokens=True, bug=BUG_GENERIK)
def test_05_03_kirim_dengan_enter(assistant, funded):
    """Menekan Enter mengirim prompt satu kali, AI selesai menjawab sesuai topik."""
    assistant.input.fill(P_KESEHATAN)
    assistant.input.press("Enter")
    answer = assistant.wait_for_answer(P_KESEHATAN)
    assistant.assert_on_topic(answer, *K_KESEHATAN)
    expect(assistant.user_messages.filter(has_text=P_KESEHATAN)).to_have_count(1)  # bubble pengguna hanya satu


@tc("ASST-04")
def test_05_04_input_multiline(assistant):
    """Shift+Enter membuat baris baru tanpa mengirim."""
    assistant.input.fill("Buatkan strategi promosi:")
    assistant.input.press("Shift+Enter")
    assistant.input.type("Target mahasiswa.")
    assert "\n" in assistant.input.input_value()
    expect(assistant.input).to_be_visible()


@tc("ASST-05")
def test_05_05_prompt_kosong(assistant):
    """Prompt kosong: tombol Send nonaktif."""
    expect(assistant.send_button).to_be_disabled()


@tc("ASST-06")
def test_05_06_prompt_spasi(assistant):
    """Prompt hanya spasi dianggap kosong: Send tetap nonaktif."""
    assistant.input.fill("     ")
    expect(assistant.send_button).to_be_disabled()


@tc("ASST-07", tokens=True, bug=BUG_GENERIK)
def test_05_07_status_pemrosesan(assistant, funded):
    """Setelah dikirim, input langsung kosong (pesan diterima), lalu AI selesai menjawab sesuai topik."""
    assistant.send(P_STATUS)
    expect(assistant.input).to_have_value("")
    answer = assistant.wait_for_answer(P_STATUS)
    assistant.assert_on_topic(answer, *K_STATUS)


@tc("ASST-08", tokens=True, bug=BUG_GENERIK)
def test_05_08_respons_relevan(assistant, funded):
    """Jawaban AI membahas topik yang ditanyakan, bukan topik lain."""
    answer = assistant.ask(P_RELEVAN)
    assistant.assert_on_topic(answer, *K_RELEVAN)


@tc("ASST-09", tokens=True, bug=BUG_GENERIK)
def test_05_09_format_daftar(assistant, funded):
    """Permintaan 'lima tips' dijawab berupa daftar (minimal 3 butir) dan sesuai topik."""
    answer = assistant.ask(P_DAFTAR)
    assistant.assert_on_topic(answer, *K_DAFTAR)
    items = [ln for ln in answer.splitlines() if re.match(r"\s*(?:\d+[.)]|[-*•])\s+\S", ln)]
    assert len(items) >= 3, f"Jawaban bukan daftar: {answer[:300]!r}"


@tc("ASST-10", tokens=True, bug=BUG_GENERIK)
def test_05_10_konteks_percakapan(assistant, funded):
    """Pertanyaan lanjutan tanpa menyebut topik tetap dijawab sesuai konteks pesan sebelumnya."""
    first = assistant.ask(P_KONTEKS_1)
    assistant.assert_on_topic(first, *K_KONTEKS)
    second = assistant.ask(P_KONTEKS_2)
    assistant.assert_on_topic(second, *K_KONTEKS)


@tc("ASST-11", tokens=True, bug=BUG_GENERIK)
def test_05_11_urutan_pesan(assistant, funded):
    """Dua prompt berbeda tampil berurutan; tiap jawaban berada tepat setelah prompt-nya."""
    first = assistant.ask(P_URUT_1)
    assistant.assert_on_topic(first, *K_URUT_1)
    second = assistant.ask(P_URUT_2)
    assistant.assert_on_topic(second, *K_URUT_2)
    assert [t.strip() for t in assistant.user_messages.all_inner_texts()] == [P_URUT_1, P_URUT_2]
    expect(assistant.ai_messages).to_have_count(2)  # satu jawaban per prompt, urutannya sama


@tc("ASST-12")
def test_05_12_pengaturan_audiens(assistant):
    """Memilih Audience B2B memperbarui label pengaturan (isi jawaban AI diuji di test berbayar)."""
    assistant.settings_button.click()
    assistant.audience_select.select_option("B2B")  # Audience berupa <select> native
    expect(assistant.settings_button).to_contain_text("B2B")


@tc("ASST-13")
def test_05_13_pengaturan_budget(assistant):
    """Memilih Budget High memperbarui label pada tombol pengaturan."""
    assistant.settings_button.click()
    assistant.budget_select.select_option("High")  # Budget berupa <select> native
    expect(assistant.settings_button).to_contain_text("High")


@tc("ASST-14")
def test_05_14_konsistensi_pengaturan(assistant):
    """Default General + Medium; label tetap setelah ditutup/dibuka lagi."""
    expect(assistant.settings_button).to_contain_text("General")
    expect(assistant.settings_button).to_contain_text("Medium")
    assistant.settings_button.click()
    assistant.page.keyboard.press("Escape")
    expect(assistant.settings_button).to_contain_text("Medium")


@tc("ASST-15", skip="Butuh percakapan lama (butuh token untuk membuatnya)")
def test_05_15_chat_baru(assistant, funded):
    """Skenario: chat baru. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("ASST-16", skip=NEED_AI)
def test_05_16_pemisahan_konteks(assistant, funded):
    """Skenario: pemisahan konteks. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("ASST-17", skip=NEED_AI)
def test_05_17_penyimpanan_percakapan(assistant, funded):
    """Skenario: penyimpanan percakapan. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("ASST-18", skip=NEED_AI)
def test_05_18_riwayat_percakapan(assistant, funded):
    """Skenario: riwayat percakapan. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("ASST-19", skip=NEED_AI)
def test_05_19_judul_riwayat(assistant, funded):
    """Skenario: judul riwayat. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("ASST-20", skip=NEED_AI)
def test_05_20_persistensi_riwayat(assistant, funded):
    """Skenario: persistensi riwayat. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("ASST-21", skip="Butuh akun kedua dengan riwayat di akun pertama (butuh token)")
def test_05_21_isolasi_data(assistant, funded, user_b):
    """Skenario: isolasi data. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("ASST-22", skip=NEED_AI)
def test_05_22_salin_respons(assistant, funded):
    """Skenario: salin respons. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("ASST-23", skip=NEED_AI)
def test_05_23_feedback_positif(assistant, funded):
    """Skenario: feedback positif. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("ASST-24", skip=NEED_AI)
def test_05_24_feedback_negatif(assistant, funded):
    """Skenario: feedback negatif. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("ASST-25", skip=NEED_AI, tokens=True)
def test_05_25_penggunaan_token(assistant, funded):
    """Skenario: penggunaan token. BELUM diotomasi (placeholder); alasannya ada di skip= pada @tc di atas."""
    ...


@tc("ASST-26")
def test_05_26_batas_token(assistant, unfunded):
    """Saldo tidak cukup: permintaan tidak diproses, muncul info token tidak cukup, saldo tidak negatif."""
    before = assistant.token_balance()
    assistant.input.fill(P_TOKEN)
    assistant.send_button.click()
    assistant.expect_text("not enough", "insufficient", "tidak mencukupi", "tidak cukup", "buy", "upgrade")
    assert assistant.token_balance() == before >= 0


@tc("ASST-27")
def test_05_27_navigasi_riwayat_token(assistant):
    """'View history' pada panel token membuka panel 'Token Usage History'."""
    assistant.page.get_by_text(rx("View history", "Lihat riwayat")).click()
    expect(assistant.page.get_by_role("heading", name=rx("Token Usage History", "Riwayat Penggunaan Token"))).to_be_visible()
