/**
 * DESIGN SPEC = "kunci jawaban" dari Figma / prototype UX untuk Brand Hub, Template, dan Media Library.
 *
 * Sumber: artifact prototype https://claude.ai/artifact/Qh6LgroG44VKuimpSHnBLG
 *
 * Cara pakai (untuk QA junior):
 *  - File ini HANYA berisi data (teks, ukuran) yang di-desain oleh tim UX.
 *  - Test di folder ini membandingkan UI staging (hasil kerja dev) dengan nilai-nilai di sini.
 *  - Kalau desain berubah, cukup ubah angka/teks DI SINI. Kode test tidak perlu disentuh.
 *
 * Catatan bahasa:
 *  - Prototype Figma berbahasa Indonesia, sedangkan staging saat ini berbahasa Inggris.
 *  - Karena itu setiap label ditulis sebagai pasangan { id, en }. Test menerima SALAH SATU,
 *    supaya yang diuji adalah strukturnya (ada/tidaknya elemen), bukan semata bahasanya.
 *  - Kalau tim memutuskan staging HARUS berbahasa Indonesia, ubah `STRICT_LANGUAGE` jadi true
 *    (atau jalankan dengan STRICT_LANGUAGE=true) maka hanya teks `id` yang diterima.
 */

/** Sepasang label: versi Figma (Indonesia) dan padanan Inggris di staging. */
export interface Label {
  id: string;
  en: string;
  /** Padanan lain yang juga dianggap benar (mis. nama berbeda di staging tetapi artinya sama). */
  alt?: string[];
}

/** Singkat penulisan: L('Semua', 'All') -> { id: 'Semua', en: 'All' }. `alt` = padanan tambahan (opsional). */
export const L = (id: string, en: string = id, ...alt: string[]): Label => ({ id, en, alt: alt.length ? alt : undefined });

/** true = teks di UI WAJIB persis bahasa Indonesia seperti Figma. */
export const STRICT_LANGUAGE = (process.env.STRICT_LANGUAGE ?? 'false').toLowerCase() === 'true';

// =====================================================================================
// Design token (dipakai untuk cek tampilan: ukuran)
// =====================================================================================
export const TOKENS = {
  /** Tinggi standar tab dan tombol di header (px). */
  controlHeight: 36,
  /** Judul halaman (h1): ukuran font px dan ketebalan. */
  h1: { fontSize: 24, fontWeight: 500 },
};

// =====================================================================================
// BRAND HUB
// =====================================================================================
export const BRAND_HUB = {
  title: L('Brand Hub'),
  /** Lebar kolom konten Brand Hub (768 px; halaman 832 px sudah termasuk padding kiri-kanan 2 x 32). */
  columnWidth: 768,
  /** Menu titik-tiga di kanan judul. */
  kebabAriaLabel: L('Opsi Brand Kit', 'Brand Kit options'),
  resetMenu: L('Reset Brand Kit'),
  resetConfirmText: L('Tindakan ini tidak dapat dibatalkan.', 'This action cannot be undone.'),
  /**
   * Tab sesuai Figma (urutan dari kiri ke kanan).
   * PENTING: "Social Links" SUDAH DIHAPUS dari desain (keputusan Denis, 2026-10-23).
   */
  tabs: [
    L('Brand Profile'),
    L('Visual Identity'),
    L('Customer Persona', 'Customer Profiles'),
    L('Guardrails'),
    L('Content Themes'),
  ],
  removedTabs: [L('Social Links')],
  /** Daftar industri di form Brand Profile menurut Figma. */
  industries: [
    L('Periklanan & Pemasaran'),
    L('Teknologi / SaaS'),
    L('Ritel & E-commerce'),
    L('Makanan & Minuman'),
    L('Jasa Profesional'),
    L('Jasa Keuangan'),
  ],
  /** Aturan logo. */
  logo: { maxMegabytes: 2, formats: 'PNG, JPG, SVG, WebP' },

  /** Dialog "Tambah Tema" (Content Themes). */
  themeDialog: {
    titleAdd: L('Tambah Tema', 'Add Theme'),
    description: L('Tema dipakai AI sebagai arah saat menyusun konten.', 'The theme guides how AI structures content.'),
    nameLabel: L('Nama Tema', 'Theme Name'),
    nameMax: 40,
    summaryLabel: L('Ringkasan', 'Summary'),
    summaryMax: 200,
    summaryHint: L('Minimal 20 karakter.', 'Minimum 20 characters.'),
    counterEmpty: '0/200',
    errorNameRequired: L('Nama tema harus diisi.', 'Theme name is required.'),
    errorSummaryRequired: L('Ringkasan harus diisi.', 'Summary is required.'),
    errorSummaryShort: L('Ringkasan minimal 20 karakter.', 'Summary must be at least 20 characters.'),
    cancel: L('Batal', 'Cancel'),
    save: L('Simpan', 'Save'),
  },

  /** Dialog "Edit Persona" (Customer Persona). */
  personaDialog: {
    titleAdd: L('Tambah Persona', 'Add Persona', 'Fill Manually', 'Isi Manual'),
    description: L('Rapikan hasil AI supaya sesuai dengan customer brand-mu.', 'Refine the AI output'),
    required: [
      L('Nama Persona', 'Persona Name'),
      L('Profil Customer', 'Customer Profile'),
      L('Masalah / Kebutuhan Utama', 'Main Problem / Need'),
    ],
    optional: [
      L('Budget / Daya Beli', 'Budget / Purchasing Power'),
      L('Lokasi', 'Location'),
      L('Pertimbangan Membeli', 'Buying Considerations', 'Purchase Considerations', 'Buying Consideration'),
    ],
    nameMax: 60,
    cancel: L('Batal', 'Cancel'),
    save: L('Simpan', 'Save'),
  },
};

// =====================================================================================
// TEMPLATE (Image Generator > tab Jelajahi / Explore)
// =====================================================================================
export const TEMPLATE = {
  // Di staging tab ini bernama "Templates"; di Figma bernama "Jelajahi".
  exploreTab: L('Jelajahi', 'Templates', 'Explore'),
  historyTab: L('Riwayat', 'History'),
  /** Filter kategori (chip). "Semua" selalu pertama. */
  allChip: L('Semua', 'All'),
  categories: [
    L('Poster Promosi', 'Promo Poster'),
    L('Feed Instagram', 'Instagram Feed'),
    L('Story Instagram', 'Instagram Story'),
    L('Baner Iklan', 'Ad Banner'),
    L('Foto Produk', 'Product Photo', 'Product Photography'),
  ],
  /** Kategori khusus video: TIDAK tampil di Image Generator. */
  videoOnlyCategory: L('Video Promosi', 'Promo Video'),
  useButton: L('Gunakan Template', 'Use Template'),
  useShort: L('Gunakan', 'Use'),
  /** Langkah di detail template (urutan sesuai Figma). */
  steps: [
    L('Gunakan template', 'Use the template'),
    L('Upload foto produk', 'Upload a product photo'),
    L('Tulis instruksi', 'Write instructions'),
    L('Atur dan generate', 'Set up and generate'),
  ],
  /** Dialog saat template diganti setelah instruksi ditulis (AC-07). */
  swapDialog: {
    title: L('Ganti template?', 'Replace template?'),
    clearOption: L('Ganti dan hapus instruksi', 'Replace and clear instructions'),
    cancel: L('Batal', 'Cancel'),
    confirm: L('Ganti Template', 'Replace Template'),
  },
};

// =====================================================================================
// MEDIA LIBRARY
// =====================================================================================
export const MEDIA = {
  title: L('Media Library'),
  searchPlaceholder: L('Cari media', 'Search media'),
  createFolder: L('Buat Folder', 'Create Folder'),
  upload: L('Upload'),
  /** Tab tipe media, urutan dari kiri ke kanan. */
  tabs: [L('Semua', 'All'), L('Gambar', 'Images'), L('Video', 'Videos'), L('Artikel', 'Articles')],
  filterAriaLabel: L('Filter', 'Filter media'),
  filterGroups: {
    source: { title: L('Source'), options: [L('Diunggah', 'Uploaded'), L('Hasil AI', 'AI Generated')] },
    ratio: { title: L('Ratio'), options: [L('1:1'), L('16:9'), L('9:16'), L('4:5')] },
  },
  views: [L('Grid view'), L('List view')],
  /** Kolom tampilan List. */
  listColumns: [L('Nama', 'Name'), L('Ditambahkan', 'Added'), L('Tipe', 'Type'), L('Ukuran', 'Size')],
  /** Dialog folder. */
  folderDialog: {
    titleCreate: L('Folder Baru', 'New Folder'),
    namePlaceholder: L('Nama folder', 'Folder name'),
    maxLength: 60,
    cancel: L('Batal', 'Cancel'),
    create: L('Buat Folder', 'Create Folder'),
  },
  /** Overlay saat file di-drag ke halaman. */
  dropOverlay: L('Lepaskan File untuk Upload', 'Drop files to upload'),
  /** Tampilan error saat data gagal dimuat. */
  errorState: {
    title: L('Gagal memuat Media Library', 'Failed to load Media Library'),
    message: L(
      'Terjadi kesalahan saat mengambil data. Periksa koneksi kamu lalu coba lagi.',
      'An error occurred while fetching data',
    ),
    retry: L('Coba Lagi', 'Try Again'),
  },
  /** Dialog pindah media ke folder. */
  moveDialog: {
    title: L('Pindahkan Media ke...', 'Move media to'),
    newFolder: L('Folder Baru', 'New Folder'),
    cancel: L('Batal', 'Cancel'),
    confirm: L('Pindahkan ke sini', 'Move here'),
    close: L('Tutup', 'Close'),
  },

  // ---- tambahan untuk tests/ui-checking/media-library.spec.ts (sumber: artifact prototype yang sama) ----
  /** Ukuran (px) dari CSS prototype. */
  size: { search: { width: 200, height: 36 }, tab: { height: 36, fontSize: 14, fontWeight: 600 }, gridColumnsDesktop: 4 },
  /** Teks di bawah "Lepaskan File untuk Upload". */
  dropOverlayDest: L('File akan diunggah ke Media Library.', 'Files will be uploaded to Media Library.'),
  /** Pesan state kosong. */
  emptyStates: {
    noMedia: L('Belum ada media yang tersimpan', 'No media found'),
    noSearchResult: L('Tidak ada aset yang cocok dengan pencarian.', 'No media found'),
    noFilterResult: L('Tidak ada aset yang cocok. Coba hapus sebagian filter untuk memperluas hasil.', 'No media found'),
  },
  /** Menu aksi sebuah aset (kebab), urutan sesuai desain. "Hapus" berwarna merah (danger). */
  assetMenu: {
    trigger: L('Menu aset', 'Asset menu', 'Actions', 'More'),
    items: [L('Pindah ke folder', 'Move to folder', 'Move'), L('Unduh', 'Download'), L('Hapus', 'Delete')],
  },
  /** Menu aksi sebuah folder (kebab). */
  folderMenu: [L('Ganti nama', 'Rename'), L('Pindah ke folder', 'Move to folder', 'Move'), L('Hapus folder', 'Delete folder')],
  /** Aksi hover di kartu grid (desktop). */
  cardActions: [L('Pindah ke folder', 'Move to folder', 'Move'), L('Unduh', 'Download'), L('Hapus', 'Delete')],
  /** Modal detail aset: tombol di header kanan. */
  detailActions: [L('Unduh', 'Download'), L('Hapus', 'Delete'), L('Tutup', 'Close')],
  /** Dialog konfirmasi hapus. */
  confirmDelete: {
    note: L('Tindakan ini tidak dapat dibatalkan.', 'This action cannot be undone.'),
    cancel: L('Batal', 'Cancel'),
  },
  /** Tombol konfirmasi di dialog hapus ("Delete this item?"). */
  confirmDeleteButton: L('Hapus', 'Delete'),
  /** Pesan validasi nama folder di staging (teks Indonesia belum ada di desain, dikira-kira). */
  folderNameInvalid: L('Nama folder hanya boleh berisi huruf, angka, dan spasi.', 'Folder name must contain only letters, numbers, and spaces.'),
  /** Tombol kembali satu level saat di dalam folder. */
  folderBack: L('Media Library'),
  /** Label lain. */
  loadMore: L('Memuat lebih banyak…', 'Loading more…'),
  /** Format badge durasi video: dua digit menit (00:30). */
  durationBadge: /^\d{2}:\d{2}$/,
};

// =====================================================================================
// AUTH (Login, Register, Forgot Password, Verify Email)
// Sumber: teks staging versi English dan Bahasa Indonesia (pemilih bahasa di pojok halaman).
// Belum ada desain Figma khusus auth; teks Indonesia yang belum pernah terlihat di staging ditandai "dikira-kira".
// =====================================================================================
export const AUTH = {
  language: {
    label: L('Bahasa', 'Language'),
    english: 'English',
    indonesian: 'Bahasa Indonesia',
  },
  logoAlt: 'Optimark',
  footer: L('Semua hak dilindungi.', 'All rights reserved.'),
  privacy: L('Kebijakan Privasi & Penghapusan Data', 'Privacy Policy & Data Deletion'),
  google: L('Lanjutkan dengan Google', 'Continue with Google'),
  showPassword: L('Tampilkan kata sandi', 'Show password', 'Hide password', 'Sembunyikan kata sandi'),
  login: {
    heading: L('Masuk', 'Welcome Back'),
    subtitle: L('Masuk ke akun Optimark Anda', 'Sign in to your Optimark account'),
    divider: L('Atau masuk dengan email', 'Or log in with email'),
    email: L('Email atau username', 'Email or username'),
    emailPlaceholder: L('nama@email.com atau username', 'name@email.com or username'),
    password: L('Kata Sandi', 'Password'),
    passwordPlaceholder: L('Masukkan password Anda', 'Enter your password'),
    forgot: L('Lupa kata sandi?', 'Forgot password?'),
    submit: L('Masuk', 'Sign In'),
    noAccount: L('Belum punya akun?', "Don't have an account?"),
    register: L('Daftar sekarang', 'Register'),
    emailRequired: L('Email atau username wajib diisi.', 'Email or username is required.'),
    passwordRequired: L('Password wajib diisi.', 'Password is required.'),
    /** Teks Indonesia dikira-kira: staging masih menampilkan versi Inggris di mode Indonesia. */
    invalid: L('Email atau kata sandi salah', 'Invalid email or password'),
  },
  register: {
    heading: L('Buat Akun', 'Create Account'),
    subtitle: L('Daftar ke Optimark untuk memulai', 'Sign up for Optimark to get started'),
    divider: L('Atau daftar dengan email', 'Or register with email'),
    fullName: L('Nama Lengkap', 'Full Name'),
    fullNamePlaceholder: L('Masukkan nama lengkap Anda', 'Enter your full name'),
    email: L('Email'),
    emailPlaceholder: L('nama@email.com', 'name@email.com'),
    password: L('Kata Sandi', 'Password'),
    passwordPlaceholder: L('Buat password', 'Create a password'),
    confirm: L('Konfirmasi Kata Sandi', 'Confirm Password'),
    confirmPlaceholder: L('Masukkan kembali password Anda', 'Re-enter your password'),
    submit: L('Buat Akun', 'Create account'),
    haveAccount: L('Sudah punya akun?', 'Already have an account?'),
    signIn: L('Masuk', 'Sign In'),
    /** Aturan password, urutan sesuai tampilan. */
    rules: [
      L('8-15 Karakter', '8-15 Characters'),
      L('Harus mengandung setidaknya 1 angka', 'Must contain at least 1 number'),
      L('Harus mengandung setidaknya 1 huruf besar', 'Must contain at least 1 uppercase letter'),
      L('Harus mengandung setidaknya 1 huruf kecil', 'Must contain at least 1 lowercase letter'),
      L('Harus mengandung setidaknya 1 simbol', 'Must contain at least 1 symbol'),
    ],
    /** Teks Indonesia dikira-kira. */
    mismatch: L('Kata sandi tidak cocok.', 'Passwords do not match.'),
    resend: L('Kirim ulang email verifikasi', 'Resend verification email'),
  },
  forgot: {
    heading: L('Reset Kata Sandi', 'Reset Password'),
    subtitle: L('Masukkan alamat email untuk menerima tautan reset kata sandi.', 'Enter your email address to receive a password reset link.'),
    email: L('Email'),
    submit: L('Kirim Email', 'Send Email'),
    back: L('Kembali ke login', 'Back to sign in'),
    /** Layar setelah terkirim (teks Indonesia dikira-kira). */
    sentHeading: L('Email Terkirim', 'Email Sent'),
    sentMessage: L('Silakan cek kotak masuk/spam email Anda', 'Please check your email inbox/spam to reset your password.'),
    resendCountdown: /(Resend available in|Kirim ulang tersedia dalam)\s*\d+\s*s/i,
  },
  verify: {
    failedHeading: L('Verifikasi gagal', 'Verification failed'),
    tokenMissing: L('Token verifikasi tidak ditemukan', 'Verification token not found'),
    resend: L('Kirim ulang email verifikasi', 'Resend verification email'),
    heading: L('Verifikasi Email', 'Verify Email'),
    subtitle: L('Masukkan kata sandi Anda untuk menyelesaikan verifikasi', 'Enter your password to complete verification'),
    submit: L('Verifikasi Email', 'Verify Email'),
  },
  reset: {
    newPassword: L('Buat kata sandi baru', 'Create a new password'),
    confirm: L('Masukkan kembali password Anda', 'Re-enter your password'),
    save: L('Simpan', 'Save'),
  },
};
