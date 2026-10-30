"""conftest.py: pintu masuk fixture untuk SEMUA test.

pytest membaca file ini otomatis sebelum menjalankan test, jadi test tidak perlu meng-import
apa pun untuk memakai fixture (cukup tulis nama fixture di parameter fungsi test).

Supaya mudah dibaca, fixture dipecah per tema di folder `fixtures/`:

    fixtures/browser.py        -> browser, login, tab siap pakai (app / anon / user_b / new_user), trace
    fixtures/page_objects.py   -> dashboard, composer, assistant, ... (halaman yang sudah dibuka)
    fixtures/account_state.py  -> funded, connected, with_content, ... (skip otomatis sesuai kondisi akun)
    fixtures/sample_files.py   -> `files`: gambar/PDF contoh untuk test upload

Menambah fixture baru? Taruh di file yang temanya paling cocok, lalu daftarkan di bawah kalau file-nya baru.
"""

pytest_plugins = [
    "fixtures.browser",
    "fixtures.page_objects",
    "fixtures.account_state",
    "fixtures.sample_files",
]
