"""Decorator @tc untuk menautkan test ke ID di Google Sheet dan menandai kondisinya.

    @tc("E2E-03-10")                          # test biasa
    @tc("E2E-04-24", bug="Field menerima >2200 karakter")   # bug yang sudah tercatat di sheet (Fail)
    @tc("E2E-01-02", skip="Butuh akun Google baru")         # tidak bisa diotomasi
    @tc("E2E-06-17", tokens=True)             # memakai token asli
    @tc("E2E-02-18", destructive=True)        # mengubah/menghabiskan data permanen
"""
import pytest


def tc(case_id: str, *, skip: str | None = None, bug: str | None = None,
       tokens: bool = False, destructive: bool = False):
    """case_id = ID di Google Sheet. Parameter lain (semua opsional) memberi label khusus pada test."""

    def decorate(fn):
        """Menempelkan "stiker" (pytest marker) ke fungsi test sesuai parameter di atas."""
        marks = [pytest.mark.tc(case_id)]  # stiker utama: ID test case
        if tokens:
            marks.append(pytest.mark.consumes_tokens)  # dikecualikan dari run default
        if destructive:
            marks.append(pytest.mark.destructive)  # dikecualikan dari run default
        if skip:
            marks.append(pytest.mark.skip(reason=skip))
        if bug:
            # xfail: test dianggap "gagal yang diharapkan" karena bug di sheet.
            # Kalau bug sudah diperbaiki, test jadi XPASS sebagai sinyal untuk dilepas.
            marks.append(pytest.mark.xfail(reason=f"Bug di sheet: {bug}", strict=False))
        for m in marks:
            fn = m(fn)
        return fn

    return decorate
