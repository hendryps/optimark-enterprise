/**
 * Helper pengecekan TAMPILAN RESPONSIF (tablet dan handphone) untuk test di folder ui-compare.
 *
 * Tujuan: memastikan UI/UX tetap rapi di layar kecil dan menu-menunya tidak berantakan.
 * Dipakai oleh brand-hub-responsive.spec.ts dan media-library-responsive.spec.ts.
 */
import { expect, type Locator, type Page } from '@playwright/test';

/** Ukuran layar yang diuji. Tablet = iPad portrait, handphone = iPhone 14 dan Android kecil. */
export const VIEWPORTS = [
  { name: 'tablet 768', width: 768, height: 1024 },
  { name: 'handphone 390', width: 390, height: 844 },
  { name: 'handphone kecil 360', width: 360, height: 640 },
  { name: 'handphone landscape 844', width: 844, height: 390 },
] as const;
export type ViewportCase = (typeof VIEWPORTS)[number];

/** Area sentuh minimal (px) untuk tombol di tablet/handphone. */
export const MIN_TOUCH = 32;

interface AuditOptions {
  /** Batasi pemeriksaan ke satu area (mis. dialog). Default: seluruh halaman. */
  root?: Locator;
  /** Area sentuh minimal (px). 0 = tidak dicek. */
  minTouch?: number;
}

/**
 * Periksa apakah tata letak RAPI pada ukuran layar saat ini. Mengembalikan daftar temuan (kosong = rapi):
 *  1. halaman melebar ke samping (scroll horizontal),
 *  2. elemen interaktif terpotong di tepi layar (yang sepenuhnya di luar layar dianggap menu geser/drawer),
 *  3. teks tombol/tab/judul terpotong tanpa titik-titik (ellipsis),
 *  4. teks tombol/tab pecah menjadi lebih dari satu baris,
 *  5. dua elemen interaktif saling menimpa,
 *  6. area sentuh terlalu kecil.
 * Hanya elemen yang benar-benar terlihat (tidak tertutup backdrop dialog) yang diperiksa.
 */
export async function auditLayout(page: Page, options: AuditOptions = {}): Promise<string[]> {
  const root = options.root ?? page.locator('body');
  return root.evaluate((rootEl, { minTouch }) => {
    const vw = document.documentElement.clientWidth;
    const issues: string[] = [];
    const label = (el: Element) => {
      const raw = el.getAttribute('aria-label') || (el as HTMLElement).innerText || el.getAttribute('placeholder') || '';
      return `<${el.tagName.toLowerCase()}> "${raw.replace(/\s+/g, ' ').trim().slice(0, 30)}"`;
    };
    const shown = (el: Element) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0;
    };
    const inScroller = (el: Element) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const o = getComputedStyle(p).overflowX;
        if (o === 'auto' || o === 'scroll') return true;
      }
      return false;
    };
    if (rootEl === document.body && document.documentElement.scrollWidth > vw + 1) {
      issues.push(`Halaman melebar ke samping: lebar isi ${document.documentElement.scrollWidth}px > lebar layar ${vw}px`);
    }
    const selector = 'button, a[href], input:not([type=hidden]):not([type=file]):not([type=checkbox]), select, textarea, [role=tab], [role=button], [role=menuitem], h1';
    const all = Array.from(rootEl.querySelectorAll(selector)).filter(shown);
    const topmost = (el: Element) => {
      const r = el.getBoundingClientRect();
      const x = Math.min(Math.max(r.left + r.width / 2, 0), vw - 1);
      const y = Math.min(Math.max(r.top + r.height / 2, 0), window.innerHeight - 1);
      const hit = document.elementFromPoint(x, y);
      return !!hit && (el.contains(hit) || hit.contains(el));
    };
    const onScreen = all.filter((el) => {
      const r = el.getBoundingClientRect();
      return r.right > 1 && r.left < vw - 1 && topmost(el);
    });

    for (const el of onScreen) {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      const tag = el.tagName.toLowerCase();
      const isTab = el.getAttribute('role') === 'tab';
      if ((r.left < -1 || r.right > vw + 1) && !inScroller(el)) {
        issues.push(`${label(el)} terpotong di tepi layar (x ${Math.round(r.left)}..${Math.round(r.right)}, layar ${vw}px)`);
      }
      if ((tag === 'button' || isTab || tag === 'h1')
        && (el as HTMLElement).scrollWidth > (el as HTMLElement).clientWidth + 1
        && ['hidden', 'clip'].includes(s.overflowX) && s.textOverflow !== 'ellipsis') {
        issues.push(`${label(el)} teksnya terpotong tanpa titik-titik`);
      }
      // hanya label pendek (<= 24 huruf) yang wajib satu baris; ajakan panjang (mis. area unggah) boleh turun baris
      if ((tag === 'button' || isTab) && (el as HTMLElement).innerText.trim() && (el as HTMLElement).innerText.trim().length <= 24) {
        // hitung baris per node teks (ikon di dalam tombol tidak dihitung sebagai baris lain)
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let wrapped = false;
        for (let n = walker.nextNode(); n && !wrapped; n = walker.nextNode()) {
          if (!n.textContent?.trim()) continue;
          const range = document.createRange();
          range.selectNodeContents(n);
          const tops = new Set(Array.from(range.getClientRects()).filter((q) => q.width > 0).map((q) => Math.round(q.top / 6)));
          wrapped = tops.size > 1;
        }
        if (wrapped) issues.push(`${label(el)} teksnya pecah menjadi lebih dari satu baris`);
      }
      const inlineLink = tag === 'a' && s.display === 'inline';
      if (minTouch > 0 && !inlineLink && tag !== 'h1' && (r.height < minTouch - 0.5 || r.width < minTouch - 0.5)) {
        issues.push(`${label(el)} area sentuh ${Math.round(r.width)}x${Math.round(r.height)}px (minimal ${minTouch}px)`);
      }
    }

    // saling menimpa: hanya antar elemen yang tidak bersarang
    const controls = onScreen.filter((el) => el.tagName.toLowerCase() !== 'h1');
    for (let i = 0; i < controls.length; i++) {
      for (let j = i + 1; j < controls.length; j++) {
        const a = controls[i];
        const b = controls[j];
        if (a.contains(b) || b.contains(a)) continue;
        // menu/dropdown/dialog yang melayang memang menutupi isi halaman di bawahnya
        const popup = '[role=menu], [role=listbox], [role=dialog], [role=alertdialog]';
        if (!!a.closest(popup) !== !!b.closest(popup)) continue;
        // tombol "clear"/ikon di dalam kolom input memang sengaja menimpa input (satu pembungkus)
        const field = (x: Element) => ['input', 'textarea', 'select'].includes(x.tagName.toLowerCase());
        if ((field(a) || field(b)) && a.parentElement?.parentElement === b.parentElement?.parentElement) continue;
        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
        const h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
        if (w > 2 && h > 2 && (w * h) / Math.min(ra.width * ra.height, rb.width * rb.height) > 0.1) {
          issues.push(`${label(a)} menimpa ${label(b)} (${Math.round(w)}x${Math.round(h)}px)`);
        }
      }
    }
    return Array.from(new Set(issues));
  }, { minTouch: options.minTouch ?? 0 });
}

/** Pastikan tata letak rapi. Memakai expect.soft: semua temuan muncul sekaligus di laporan. */
export async function expectTidy(page: Page, context: string, options: AuditOptions = {}): Promise<void> {
  const issues = await auditLayout(page, options);
  expect.soft(issues, `${context} tidak rapi:\n- ${issues.join('\n- ')}`).toEqual([]);
}

/** Pastikan semua tombol/tautan/kolom isian punya area sentuh minimal MIN_TOUCH px (nyaman diketuk jari). */
export async function expectTouchTargets(page: Page, context: string, options: { root?: Locator } = {}): Promise<void> {
  const issues = (await auditLayout(page, { ...options, minTouch: MIN_TOUCH })).filter((i) => i.includes('area sentuh'));
  expect.soft(issues, `${context}: area sentuh terlalu kecil:\n- ${issues.join('\n- ')}`).toEqual([]);
}

/** Pastikan elemen berada penuh di dalam lebar layar. */
export async function expectWithinScreen(page: Page, target: Locator, name: string): Promise<void> {
  const box = await target.boundingBox();
  const vw = page.viewportSize()!.width;
  expect.soft(box, `${name} tidak terlihat`).not.toBeNull();
  if (!box) return;
  expect.soft(box.x, `${name} keluar di sisi kiri layar (x=${Math.round(box.x)})`).toBeGreaterThanOrEqual(-1);
  expect.soft(box.x + box.width, `${name} keluar di sisi kanan layar (kanan=${Math.round(box.x + box.width)}, layar ${vw}px)`).toBeLessThanOrEqual(vw + 1);
}

/**
 * Dialog di layar kecil: lebarnya muat; kalau lebih tinggi dari layar harus bisa di-scroll di dalamnya;
 * tombol aksinya bisa dijangkau (setelah scroll) di dalam layar.
 */
export async function expectDialogFits(page: Page, dialog: Locator, actions: Locator[]): Promise<void> {
  await expectWithinScreen(page, dialog, 'Dialog');
  const vh = page.viewportSize()!.height;
  const box = await dialog.boundingBox();
  if (box && box.height > vh + 1) {
    const scrollable = await dialog.evaluate((el) => [el, ...Array.from(el.querySelectorAll('*'))].some((n) => {
      const o = getComputedStyle(n).overflowY;
      return (o === 'auto' || o === 'scroll') && n.scrollHeight > n.clientHeight;
    }));
    expect.soft(scrollable, `Dialog setinggi ${Math.round(box.height)}px melebihi layar ${vh}px dan tidak bisa di-scroll`).toBe(true);
  }
  for (const action of actions) {
    await action.scrollIntoViewIfNeeded();
    const b = await action.boundingBox();
    const name = (await action.innerText().catch(() => '')).trim() || 'tombol aksi';
    expect.soft(b !== null && b.y >= -1 && b.y + b.height <= vh + 1, `Tombol "${name}" tidak terjangkau di dalam layar setelah scroll`).toBe(true);
    await expectWithinScreen(page, action, `Tombol "${name}"`);
  }
}
