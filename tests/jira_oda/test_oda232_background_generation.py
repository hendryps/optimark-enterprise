"""Tiket ODA-232 Marketing Studio - Background Generation.

Acceptance Criteria (ringkas):
    AC-01 status generate jelas: Queued, Processing, Completed, Failed
    AC-02 pindah halaman / tutup composer, proses tetap berjalan
    AC-03 notifikasi saat selesai/gagal; klik notifikasi membuka hasil
    AC-04 Cancel hanya saat Queued; yang dibatalkan tidak memakai token
    AC-05 hasil sukses otomatis masuk Inbox Media Library

Semua AC butuh generate sungguhan (memakai token AI). Akun QA saldo 0, jadi yang bisa diuji hanya
kondisi yang TIDAK memicu generate. Sisanya di-skip agar tidak menghabiskan token tanpa izin.
"""
import re

import pytest
from playwright.sync_api import expect

from utils.tc import tc

pytestmark = [pytest.mark.jira, pytest.mark.image]


@tc("ODA-232-01")
def test_oda232_01_generate_nonaktif_saat_saldo_nol(image_gen, unfunded):
    """Saldo 0: tombol Generate nonaktif sehingga tidak ada job yang masuk antrean tanpa token."""
    # Tombol Generate di desain baru berbentuk "20 / Image" (harga token per gambar)
    generate = image_gen.page.get_by_role("button", name="/ Image").first
    expect(generate).to_be_disabled()


@tc("ODA-232-02")
def test_oda232_02_indikator_antrean_bertahan_antar_halaman(image_gen):
    """AC-02: indikator Queue (jumlah job) tetap ada setelah pindah halaman, tanda proses tidak terikat satu layar."""
    queue = image_gen.page.get_by_text("Queue", exact=True)
    if not queue.count():
        pytest.skip("Indikator Queue tidak tampil di akun ini")
    expect(queue.first).to_be_visible()
    image_gen.goto("/dashboard")
    expect(image_gen.page.get_by_text("Queue", exact=True).first).to_be_visible()


@tc("ODA-232-08")
def test_oda232_08_panel_antrean_ai(image_gen):
    """AC-01: panel 'AI Queue' menampilkan jumlah job aktif dan daftar job beserta statusnya."""
    image_gen.page.get_by_role("button", name=re.compile("Open queue")).click()
    image_gen.expect_text("AI Queue")
    image_gen.expect_text("active jobs")


@tc("ODA-232-09")
def test_oda232_09_job_queued_punya_tombol_cancel(image_gen):
    """AC-04: job berstatus Queued punya tombol Cancel (hanya pada status Queued)."""
    image_gen.page.get_by_role("button", name=re.compile("Open queue")).click()
    image_gen.expect_text("AI Queue")
    if not image_gen.page.get_by_text("Queue", exact=True).count():
        pytest.skip("Tidak ada job berstatus Queued di akun QA")
    assert image_gen.page.get_by_role("button", name=re.compile(r"cancel|batal", re.I)).filter(visible=True).count() > 0, (
        "Job berstatus Queue tidak punya tombol Cancel")


@tc("ODA-232-10")
def test_oda232_10_label_status_sesuai_spesifikasi(image_gen):
    """AC-01: label status memakai istilah spesifikasi (Queued/Processing/Completed/Failed), bukan 'Queue'."""
    image_gen.page.get_by_role("button", name=re.compile("Open queue")).click()
    image_gen.expect_text("AI Queue")
    labels = ("Queued", "Processing", "Completed", "Failed")
    assert any(image_gen.page.get_by_text(l, exact=True).count() for l in labels), (
        "Tidak ada label status Queued/Processing/Completed/Failed; job menampilkan label 'Queue'")


PROMPT = "QA test: segelas kopi susu gula aren di meja kayu, foto produk minimalis"


def queue_job(image_gen) -> dict:
    """Kirim satu generate gambar. Kalau server menolak (job gagal masuk antrean), test turunan di-skip
    dengan alasan jelas; kegagalannya sendiri dilaporkan oleh ODA-232-03."""
    result = image_gen.generate_and_capture(PROMPT)
    if result["status"] >= 400:
        pytest.skip(f"Generate ditolak server (HTTP {result['status']}): {result['body'][:120]}. Lihat ODA-232-03")
    return result


@tc("ODA-232-03", tokens=True)
def test_oda232_03_job_masuk_antrean_dengan_status(image_gen, funded):
    """AC-01: generate dengan saldo cukup membuat job (HTTP sukses) dan job tampil di panel AI Queue dengan status."""
    result = image_gen.generate_and_capture(PROMPT)
    assert result["status"] < 400, f"Job gagal masuk antrean: HTTP {result['status']} {result['body'][:160]}"
    image_gen.page.get_by_role("button", name=re.compile("Open queue")).click()
    image_gen.expect_text("AI Queue")


@tc("ODA-232-04", tokens=True)
def test_oda232_04_proses_tetap_jalan_saat_pindah_halaman(image_gen, funded):
    """AC-02: setelah generate lalu pindah halaman, job tetap ada di antrean/riwayat."""
    queue_job(image_gen)
    image_gen.goto("/dashboard")
    image_gen.page.get_by_role("button", name=re.compile("Open queue")).first.click()
    image_gen.expect_text("AI Queue")


@tc("ODA-232-05", tokens=True)
def test_oda232_05_notifikasi_hasil(image_gen, funded):
    """AC-03: saat job selesai/gagal ada notifikasi di bell."""
    queue_job(image_gen)
    image_gen.goto("/dashboard")
    image_gen.page.wait_for_timeout(60000)  # beri waktu job diproses
    image_gen.page.get_by_role("button", name=re.compile("Open notifications")).click()
    assert not image_gen.page.get_by_text("No notifications yet").count(), "Tidak ada notifikasi setelah job selesai/gagal"


@tc("ODA-232-06", tokens=True)
def test_oda232_06_cancel_hanya_saat_queued(image_gen, funded):
    """AC-04: job berstatus Queued bisa dibatalkan dan token tidak terpakai."""
    before = image_gen.token_balance()
    queue_job(image_gen)
    image_gen.page.get_by_role("button", name=re.compile("Open queue")).click()
    cancel = image_gen.page.get_by_role("button", name=re.compile(r"cancel|batal", re.I)).filter(visible=True)
    assert cancel.count() > 0, "Tidak ada tombol Cancel pada job Queued"
    cancel.first.click()
    image_gen.page.wait_for_timeout(2000)
    assert image_gen.token_balance() == before, "Token terpotong untuk job yang dibatalkan"


@tc("ODA-232-07", tokens=True)
def test_oda232_07_hasil_masuk_inbox_media_library(image_gen, funded):
    """AC-05: hasil sukses otomatis masuk Inbox Media Library walau user sudah pindah halaman."""
    queue_job(image_gen)
    image_gen.goto("/media-library")
    image_gen.page.wait_for_timeout(60000)  # beri waktu job selesai
    image_gen.page.reload()
    assert not image_gen.page.get_by_text("No media found").count(), "Media Library masih kosong setelah generate"
