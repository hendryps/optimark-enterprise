/**
 * Fixture "halaman siap pakai".
 *
 * Tiap fixture membuka halamannya lebih dulu, sehingga di test cukup menulis:
 *
 *   tc('DASH-01', 'akses dashboard', async ({ dashboard }) => {   // <- Dashboard sudah terbuka & sudah login
 *     await expect(dashboard.notificationButton).toBeVisible();
 *   });
 *
 * Semua fixture di sini memakai tab `app` (sudah login) kecuali `auth` dan `onboarding`.
 */
import { AssistantPage } from '../pages/ai-assistant-page';
import { AuthPage } from '../pages/auth-page';
import { BillingPage } from '../pages/billing-page';
import { BrandHubPage } from '../pages/brand-hub-page';
import { CampaignPage } from '../pages/campaign-page';
import { ComposerPage } from '../pages/content-composer-page';
import { DashboardPage } from '../pages/dashboard-page';
import { ImageGeneratorPage } from '../pages/image-generator-page';
import { MediaLibraryPage } from '../pages/media-library-page';
import { OnboardingPage } from '../pages/onboarding-page';
import { ArticlesPage, uniqueTitle } from '../pages/seo-articles-page';
import { SeoPage } from '../pages/seo-page';
import { VideoGeneratorPage } from '../pages/video-generator-page';
import { expect } from '@playwright/test';
import { sessionsTest } from './sessions';

/** Artikel uji yang dibuat fixture `sampleArticle`. */
export interface SampleArticle {
  page: ArticlesPage;
  /** Judul artikel. Ubah nilai ini kalau test mengganti judulnya, supaya pembersihan menghapus artikel yang benar. */
  title: string;
}

export interface PageFixtures {
  auth: AuthPage;
  onboarding: OnboardingPage;
  dashboard: DashboardPage;
  composer: ComposerPage;
  assistant: AssistantPage;
  imageGen: ImageGeneratorPage;
  videoGen: VideoGeneratorPage;
  seo: SeoPage;
  articles: ArticlesPage;
  articleForm: ArticlesPage;
  sampleArticle: SampleArticle;
  mediaLibrary: MediaLibraryPage;
  brandHub: BrandHubPage;
  campaign: CampaignPage;
  billing: BillingPage;
}

export const pagesTest = sessionsTest.extend<PageFixtures>({
  /** Halaman Login/Register (belum login). Belum dibuka: test sendiri yang memanggil openLogin()/openRegister(). */
  auth: async ({ anon }, use) => use(new AuthPage(anon)),

  /** Halaman Onboarding, memakai akun yang belum onboarding. */
  onboarding: async ({ newUser }, use) => {
    const page = new OnboardingPage(newUser);
    await page.goto('/'); // akun yang belum onboarding otomatis diarahkan ke halaman onboarding
    await use(page);
  },

  dashboard: async ({ app }, use) => use(await new DashboardPage(app).open()),
  composer: async ({ app }, use) => use(await new ComposerPage(app).open()),
  assistant: async ({ app }, use) => use(await new AssistantPage(app).open()),
  imageGen: async ({ app }, use) => use(await new ImageGeneratorPage(app).open()),
  videoGen: async ({ app }, use) => use(await new VideoGeneratorPage(app).open()),
  seo: async ({ app }, use) => use(await new SeoPage(app).open()),
  mediaLibrary: async ({ app }, use) => use(await new MediaLibraryPage(app).open()),
  brandHub: async ({ app }, use) => use(await new BrandHubPage(app).open()),
  campaign: async ({ app }, use) => use(await new CampaignPage(app).open()),
  billing: async ({ app }, use) => use(await new BillingPage(app).open()),

  /** Daftar SEO > Articles yang sudah terbuka. */
  articles: async ({ app }, use) => use(await new ArticlesPage(app).openList()),

  /** Form SEO > Articles > New Article yang sudah terbuka. */
  articleForm: async ({ app }, use) => use(await new ArticlesPage(app).openCreate()),

  /**
   * Satu artikel uji (dibuat lewat UI). Dihapus lagi setelah test supaya staging tidak menumpuk data.
   * Kalau penghapusan gagal, muncul peringatan di laporan supaya bisa dihapus manual.
   */
  sampleArticle: async ({ app }, use, testInfo) => {
    const page = new ArticlesPage(app);
    const sample: SampleArticle = { page, title: uniqueTitle() };
    await page.createArticle(sample.title);
    await use(sample);
    try {
      await page.openList();
      if (await page.card(sample.title).count()) {
        await page.deleteArticle(sample.title);
        await expect(page.card(sample.title)).toHaveCount(0, { timeout: 15_000 });
      }
    } catch (error) {
      // Pembersihan best-effort: kegagalannya tidak boleh menutupi hasil test, tetapi dicatat.
      testInfo.annotations.push({
        type: 'peringatan',
        description: `Artikel uji '${sample.title}' gagal dihapus otomatis, hapus manual di SEO > Articles: ${String(error).slice(0, 120)}`,
      });
    }
  },
});
