"""Page object SEO > Articles (/seo/articles): daftar artikel, form New Article / Edit Article, pencarian."""
import re
import time

from playwright.sync_api import expect

from pages.base_page import BasePage, rx

LIST_PATH = "/seo/articles"
CREATE_PATH = "/seo/articles/create"


def unique_title(prefix: str = "QA Artikel") -> str:
    """Judul unik per run supaya artikel uji mudah dikenali dan tidak bentrok."""
    return f"{prefix} {int(time.time() * 1000) % 10**9}"


class ArticlesPage(BasePage):
    """Menu SEO > Articles: daftar (/seo/articles) dan form (/seo/articles/create, /seo/articles/<id>)."""

    # ------------------------------------------------------------ navigasi
    def open_list(self) -> "ArticlesPage":
        """Buka daftar artikel dan tunggu judul 'Articles Management' tampil."""
        self.goto(LIST_PATH)
        expect(self.list_heading).to_be_visible(timeout=30000)
        expect(self.page.get_by_text(rx("Total Articles"))).to_be_visible()
        return self

    def open_create(self) -> "ArticlesPage":
        """Buka form New Article dan tunggu kolom Title tampil."""
        self.goto(CREATE_PATH)
        expect(self.title_input).to_be_visible(timeout=30000)
        return self

    # ------------------------------------------------------------ daftar
    @property
    def list_heading(self):
        """Judul 'Articles Management'."""
        return self.page.get_by_role("heading", name=rx("Articles Management"))

    @property
    def new_article_link(self):
        """Tombol 'New Article' di pojok kanan atas daftar (tautan ke form create)."""
        return self.page.get_by_role("link", name=rx("New Article")).first

    @property
    def search_input(self):
        """Kolom 'Search articles...'."""
        return self.page.get_by_placeholder("Search articles...")

    @property
    def search_button(self):
        """Tombol 'Search'."""
        return self.button("Search", exact=True)

    def search(self, text: str) -> None:
        """Isi kolom pencarian lalu klik Search."""
        self.search_input.fill(text)
        self.search_button.click()

    def total_articles(self) -> int:
        """Angka pada kartu 'Total Articles'."""
        return self.number_near("Total Articles")

    def card(self, title: str):
        """Kartu artikel berdasarkan judul (tautan judul di daftar)."""
        return self.page.get_by_role("link", name=title, exact=True).first

    def _card_actions(self, title: str):
        """Pembungkus kartu: elemen terdekat yang memuat judul sekaligus tombol Edit/Delete."""
        return self.page.locator("div").filter(has=self.card(title)).filter(
            has=self.page.get_by_role("button", name=rx("Delete"))).last

    def edit_link(self, title: str):
        """Tautan 'Edit' pada kartu artikel berjudul `title`."""
        return self._card_actions(title).get_by_role("link", name=rx("Edit"))

    def delete_button(self, title: str):
        """Tombol 'Delete' pada kartu artikel berjudul `title`."""
        return self._card_actions(title).get_by_role("button", name=rx("Delete"))

    def delete_article(self, title: str) -> None:
        """Hapus artikel dari daftar; kalau muncul dialog konfirmasi, konfirmasi penghapusan."""
        self.delete_button(title).click()
        confirm = self.page.get_by_role("dialog").or_(self.page.get_by_role("alertdialog")).get_by_role(
            "button", name=rx("Delete", "Hapus", "Confirm", "Yes", "Ya"))
        if confirm.count():
            confirm.last.click()

    # ------------------------------------------------------------ form
    def _label(self, name: str):
        """Kolom form berdasarkan label (label bertanda * untuk kolom wajib)."""
        return self.page.get_by_label(re.compile(rf"^\s*{re.escape(name)}\s*\*?\s*$", re.I))

    @property
    def title_input(self):
        """Kolom Title."""
        return self._label("Title")

    @property
    def slug_input(self):
        """Kolom Slug (terisi otomatis dari Title)."""
        return self._label("Slug")

    @property
    def excerpt_input(self):
        """Kolom Excerpt."""
        return self._label("Excerpt")

    @property
    def alt_text_input(self):
        """Kolom Alt Text gambar."""
        return self._label("Alt Text")

    @property
    def author_input(self):
        """Kolom Author."""
        return self._label("Author")

    @property
    def meta_title_input(self):
        """Kolom Meta Title."""
        return self._label("Meta Title")

    @property
    def meta_keywords_input(self):
        """Kolom Meta Keywords."""
        return self._label("Meta Keywords")

    @property
    def meta_description_input(self):
        """Kolom Meta Description."""
        return self._label("Meta Description")

    @property
    def create_button(self):
        """Tombol 'Create' (form baru)."""
        return self.button("Create", exact=True)

    @property
    def save_button(self):
        """Tombol 'Save' (form Edit)."""
        return self.button("Save", exact=True)

    @property
    def cancel_button(self):
        """Tombol 'Cancel'."""
        return self.button("Cancel", exact=True)

    @property
    def export_button(self):
        """Tombol 'Export' (nonaktif sampai artikel tersimpan)."""
        return self.button("Export", exact=True)

    @property
    def preview_toggle(self):
        """Tombol 'Hide preview' / 'Show preview'."""
        return self.button("Hide preview", "Show preview")

    @property
    def preview_panel(self):
        """Panel 'Live Preview' di sisi kanan form."""
        return self.page.get_by_text(rx("Live Preview", exact=True))

    @property
    def preview_title(self):
        """Judul artikel di Live Preview ('Untitled article' selama Title kosong)."""
        return self.page.get_by_role("heading", level=1).last

    def toast(self, *names: str):
        """Notifikasi (toast) yang sedang tampil, mis. toast('Article created')."""
        return self.page.get_by_text(rx(*names)).filter(visible=True)

    def fill_required(self, title: str, meta_title: str | None = None, meta_description: str | None = None) -> None:
        """Isi hanya kolom yang divalidasi server: Title, Meta Title, Meta Description."""
        self.title_input.fill(title)
        self.meta_title_input.fill(meta_title if meta_title is not None else f"Meta {title}")
        self.meta_description_input.fill(
            meta_description if meta_description is not None else "Deskripsi meta untuk pengujian otomatis.")

    def fill_all(self, title: str, author: str = "QA Tester") -> None:
        """Isi semua kolom teks pada form."""
        self.fill_required(title)
        self.excerpt_input.fill("Ringkasan artikel untuk pengujian otomatis.")
        self.alt_text_input.fill("Gambar ilustrasi uji")
        self.author_input.fill(author)
        self.meta_keywords_input.fill("seo, uji, otomatis")

    def create_article(self, title: str, **kwargs) -> None:
        """Isi form create lalu klik Create dan tunggu kembali ke daftar (artikel berhasil dibuat)."""
        self.open_create()
        self.fill_all(title, **kwargs)
        self.create_button.click()
        expect(self.page).to_have_url(re.compile(rf"{LIST_PATH}/?$"), timeout=30000)
        expect(self.card(title)).to_be_visible(timeout=30000)
