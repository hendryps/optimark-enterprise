"""Fixture "halaman siap pakai".

Tiap fixture membuka halamannya lebih dulu, sehingga di test cukup menulis:

    def test_contoh(dashboard):          # <- halaman Dashboard sudah terbuka & sudah login
        expect(dashboard.notification_button).to_be_visible()

Semua fixture di sini memakai tab `app` (sudah login) kecuali `auth` dan `onboarding`.
"""
import pytest

from pages.ai_assistant_page import AssistantPage
from pages.ai_studio_page import AiStudioPage
from pages.auth_page import AuthPage
from pages.billing_page import BillingPage
from pages.brand_hub_page import BrandHubPage
from pages.campaign_page import CampaignPage
from pages.content_composer_page import ComposerPage
from pages.dashboard_page import DashboardPage
from pages.image_generator_page import ImageGeneratorPage
from pages.media_library_page import MediaLibraryPage
from pages.onboarding_page import OnboardingPage
from pages.seo_page import SeoPage
from pages.video_generator_page import VideoGeneratorPage


@pytest.fixture
def auth(anon) -> AuthPage:
    """Halaman Login/Register (belum login). Belum dibuka: test sendiri yang memanggil open_login()/open_register()."""
    return AuthPage(anon)


@pytest.fixture
def onboarding(new_user) -> OnboardingPage:
    """Halaman Onboarding, memakai akun yang belum onboarding."""
    page = OnboardingPage(new_user)
    page.goto("/")  # akun yang belum onboarding otomatis diarahkan ke halaman onboarding
    return page


@pytest.fixture
def dashboard(app) -> DashboardPage:
    return DashboardPage(app).open()


@pytest.fixture
def composer(app) -> ComposerPage:
    return ComposerPage(app).open()


@pytest.fixture
def assistant(app) -> AssistantPage:
    return AssistantPage(app).open()


@pytest.fixture
def image_gen(app) -> ImageGeneratorPage:
    return ImageGeneratorPage(app).open()


@pytest.fixture
def video_gen(app) -> VideoGeneratorPage:
    return VideoGeneratorPage(app).open()


@pytest.fixture
def seo(app) -> SeoPage:
    return SeoPage(app).open()


@pytest.fixture
def media_library(app) -> MediaLibraryPage:
    return MediaLibraryPage(app).open()


@pytest.fixture
def brand_hub(app) -> BrandHubPage:
    return BrandHubPage(app).open()


@pytest.fixture
def campaign(app) -> CampaignPage:
    return CampaignPage(app).open()


@pytest.fixture
def billing(app) -> BillingPage:
    return BillingPage(app).open()


@pytest.fixture
def ai_studio(app) -> AiStudioPage:
    """AI Marketing Studio (/ai-marketing-studio) yang sudah terbuka."""
    return AiStudioPage(app).open()
