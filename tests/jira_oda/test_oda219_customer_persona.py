"""Tiket ODA-219 Brand Hub - Customer Persona.

Acceptance Criteria (ringkas):
    AC-01 tombol generate di section Customer Persona -> AI menyusun persona
    AC-02 persona berisi 5 field (Customer Profile, Main Problem / Need, Budget / Purchasing Power, Location, Buying Consideration)
    AC-03 tersimpan dengan label "AI Suggestion"
    AC-04 generate ulang + edit semua field; tersimpan setelah Save
    AC-05 Use Brand Hub ON -> persona ikut dikirim ke AI
    AC-06 generate gagal -> pesan gagal + Coba Lagi, persona lama tetap ada

Test TIDAK menyimpan persona (tombol Save tidak ditekan), supaya akun QA tetap bersih.
"""
import re

import pytest
from playwright.sync_api import expect

from utils.tc import tc

pytestmark = [pytest.mark.jira, pytest.mark.brand_hub]

# Placeholder 5 field persona + nama persona di form staging
FIELD_PLACEHOLDERS = ["e.g. Culinary SME Owner", "e.g. Small business owners", "e.g. Needs promotional content",
                      "e.g. Rp500k", "e.g. Greater Jakarta", "e.g. Affordable price"]


@tc("ODA-219-01")
def test_oda219_01_kartu_persona_di_overview(brand_hub):
    """Overview menampilkan kartu Customer Persona (Not Filled) dengan tombol Add menuju halaman persona."""
    brand_hub.expect_text("No Customer Persona Yet")
    card_add = brand_hub.page.get_by_role("main").get_by_role("button", name="Add")
    card_add.nth(1).click()  # Add ke-2 = kartu Customer Persona (setelah Visual Identity)
    brand_hub.expect_url_contains("/brand-hub/")


@tc("ODA-219-02")
def test_oda219_02_state_kosong_persona(brand_hub):
    """Tab Customer Persona kosong menampilkan 'No customer persona yet' dan 'Fill Manually'."""
    brand_hub.open_tab("Customer Persona")
    brand_hub.expect_text("No customer persona yet")
    expect(brand_hub.fill_manually_button).to_be_visible()


@tc("ODA-219-03")
def test_oda219_03_form_persona_punya_5_field(brand_hub):
    """AC-02: Fill Manually membuka form dengan field persona lengkap."""
    brand_hub.open_tab("Customer Persona")
    brand_hub.fill_manually_button.click()
    expect(brand_hub.dialog).to_be_visible()
    for hint in FIELD_PLACEHOLDERS:
        expect(brand_hub.dialog.get_by_placeholder(re.compile(re.escape(hint)))).to_be_visible()
    for label in ("Customer Profile", "Main Problem", "Budget", "Location", "Buying Consideration"):
        expect(brand_hub.dialog.get_by_text(re.compile(label, re.I)).first).to_be_visible()


@tc("ODA-219-04")
def test_oda219_04_batal_tidak_membuat_persona(brand_hub):
    """Menutup form tanpa menyimpan: persona tidak terbentuk, state kosong tetap tampil."""
    brand_hub.open_tab("Customer Persona")
    brand_hub.fill_manually_button.click()
    brand_hub.dialog.get_by_placeholder(re.compile("Culinary SME Owner")).fill("Persona Uji QA")
    brand_hub.dialog.get_by_role("button", name=re.compile("Cancel|Close|Batal", re.I)).first.click()
    expect(brand_hub.dialog).to_have_count(0)
    brand_hub.expect_text("No customer persona yet")


@tc("ODA-219-05")
def test_oda219_05_simpan_kosong_tidak_membuat_persona(brand_hub):
    """Form kosong lalu Save: tidak membuat persona (dialog tetap terbuka / tombol nonaktif)."""
    brand_hub.open_tab("Customer Persona")
    brand_hub.fill_manually_button.click()
    save = brand_hub.dialog.get_by_role("button", name=re.compile("^Save", re.I)).first
    if save.is_enabled():
        save.click()
        brand_hub.page.wait_for_timeout(1500)
    expect(brand_hub.dialog).to_be_visible()


@tc("ODA-219-06")
def test_oda219_06_ada_tombol_generate_ai(brand_hub):
    """AC-01: ada tombol untuk generate persona dengan AI (bukan hanya isi manual)."""
    brand_hub.open_tab("Customer Persona")
    generate = brand_hub.page.get_by_role("main").get_by_role("button", name=re.compile(r"generate|ai suggest|get ai", re.I))
    assert generate.count() > 0, "Tidak ada tombol generate/AI Suggestion di section Customer Persona (hanya 'Fill Manually')"


@tc("ODA-219-07", destructive=True, skip="Menyimpan persona mengubah data Brand Hub akun QA")
def test_oda219_07_simpan_persona_manual(brand_hub):
    """Skenario AC-04: isi semua field lalu Save; persona tampil di Overview."""
    ...


@tc("ODA-219-08", tokens=True, skip="Butuh tombol generate AI (belum ada di staging) dan token AI")
def test_oda219_08_label_ai_suggestion_dan_generate_ulang(brand_hub):
    """Skenario AC-03/AC-04/AC-06: label 'AI Suggestion', generate ulang, dan Coba Lagi saat gagal."""
    ...
