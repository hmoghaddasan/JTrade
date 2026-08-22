# backend/trading_journal/settings.py

import os
import sys
from pathlib import Path
from datetime import timedelta

# ============================================
# مسیر پایه پروژه
# ============================================
BASE_DIR = Path(__file__).resolve().parent.parent

# ============================================
# بارگذاری متغیرهای محیطی از فایل .env
# ============================================
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(BASE_DIR, '.env'))
except ImportError:
    pass


# ============================================
# ✅ تابع دریافت تنظیمات از دیتابیس
# ============================================
def get_db_setting(key, default=None):
    """دریافت تنظیم از دیتابیس با fallback به env"""
    try:
        from apps.accounts.models import SystemSetting
        value = SystemSetting.get_setting(key)
        if value is not None:
            return value
    except Exception:
        pass
    return os.environ.get(key.upper(), default)


def get_db_int(key, default=0):
    """دریافت تنظیم عددی از دیتابیس"""
    try:
        return int(get_db_setting(key, default))
    except (ValueError, TypeError):
        return default


def get_db_bool(key, default=False):
    """دریافت تنظیم بولی از دیتابیس"""
    value = get_db_setting(key, default)
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.lower() in ('true', '1', 'yes', 'on')
    return bool(value)


# ============================================
# کلیدهای امنیتی و تنظیمات پایه
# ============================================
SECRET_KEY = get_db_setting('secret_key', os.environ.get('SECRET_KEY', 'django-insecure-7!@#$%^&*()_+QWERTYUIOP{}|ASDFGHJKL:"ZXCVBNM<>?1234567890'))

DEBUG = get_db_bool('debug', os.environ.get('DEBUG', 'True') == 'True')

ALLOWED_HOSTS = get_db_setting('allowed_hosts', os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1,0.0.0.0')).split(',')

# ============================================
# تنظیمات دوره آزمایشی (از دیتابیس با fallback)
# ============================================
TRIAL_DAYS = get_db_int('trial_days', 7)
TRIAL_TRADES_LIMIT = get_db_int('trial_trades_limit', 10)
TRIAL_AI_CONSULTATIONS_LIMIT = get_db_int('trial_ai_consultations_limit', 5)

# ============================================
# ✅ تنظیمات قابل ویرایش توسط ادمین (از دیتابیس)
# ============================================

# -- عمومی --
APP_NAME = get_db_setting('app_name', 'ژورنال حرفه‌ای ترید')
APP_VERSION = get_db_setting('app_version', '1.7.0')
DEFAULT_FONT = get_db_setting('default_font', 'Vazir')
PRIMARY_COLOR = get_db_setting('primary_color', '#1a237e')
SECONDARY_COLOR = get_db_setting('secondary_color', '#0d47a1')

# -- سایت --
SITE_EMAIL = get_db_setting('site_email', 'info@tradingjournal.com')
SITE_PHONE = get_db_setting('site_phone', '021-12345678')
SITE_ADDRESS = get_db_setting('site_address', 'تهران، خیابان ولیعصر، پلاک ۱۲۳')
FOOTER_TEXT = get_db_setting('footer_text', 'تمامی حقوق محفوظ است.')

# -- ظاهر --
LOGO_PATH = get_db_setting('logo_path', '/static/images/logo.png')
FAVICON_PATH = get_db_setting('favicon_path', '/static/images/favicon.ico')
BG_IMAGE_PATH = get_db_setting('bg_image_path', '/static/images/background.jpg')

# -- ترید --
MAX_TRADES_PER_DAY = get_db_int('max_trades_per_day', 10)
MIN_TRADE_INTERVAL = get_db_int('min_trade_interval', 5)

# -- هوش مصنوعی --
AI_MODEL = get_db_setting('ai_model', 'llama3.1:8b')
AI_TEMPERATURE = get_db_setting('ai_temperature', '0.7')
AI_TIMEOUT = get_db_int('ai_timeout', 600)
OLLAMA_URL = get_db_setting('ollama_url', 'http://127.0.0.1:11434/api/generate')
OLLAMA_AVAILABLE_MODELS = get_db_setting('ollama_available_models', 'llama3.1:8b,mistral:7b,deepseek-r1:7b')
OLLAMA_MODEL = get_db_setting('ollama_model', 'llama3.1:8b')
OLLAMA_TIMEOUT = get_db_int('ollama_timeout', 600)

# -- تصاویر --
MAX_IMAGE_WIDTH = get_db_int('max_image_width', 2000)
MAX_IMAGE_HEIGHT = get_db_int('max_image_height', 2000)
IMAGE_QUALITY = get_db_int('image_quality', 85)
MAX_IMAGE_SIZE_MB = get_db_int('max_image_size_mb', 5)
SHOW_SCREENSHOT_UPLOAD = get_db_bool('show_screenshot_upload', True)

# -- دیتابیس --
DB_NAME = get_db_setting('db_name', os.environ.get('DB_NAME', 'trading_journal'))
DB_USER = get_db_setting('db_user', os.environ.get('DB_USER', 'root'))
DB_PASSWORD = get_db_setting('db_password', os.environ.get('DB_PASSWORD', 'po879000'))
DB_HOST = get_db_setting('db_host', os.environ.get('DB_HOST', 'localhost'))
DB_PORT = get_db_setting('db_port', os.environ.get('DB_PORT', '3306'))

# -- پیامک (SMS) --
SMS_ENABLED = get_db_bool('sms_enabled', os.environ.get('SMS_ENABLED', 'False'))
SMS_API_KEY = get_db_setting('sms_api_key', os.environ.get('SMS_API_KEY', ''))
SMS_SENDER_NUMBER = get_db_setting('sms_sender_number', os.environ.get('SMS_SENDER_NUMBER', '3000****'))
SMS_OTP_TEMPLATE = get_db_setting('sms_otp_template', os.environ.get('SMS_OTP_TEMPLATE', 'verifycode'))

# -- پرداخت (زرین‌پال) --
ZARINPAL_MERCHANT_ID = get_db_setting('zarinpal_merchant_id', os.environ.get('ZARINPAL_MERCHANT_ID', 'c9f6ca76-02cf-11e9-a61e-005056a205be'))
ZARINPAL_SANDBOX = get_db_bool('zarinpal_sandbox', os.environ.get('ZARINPAL_SANDBOX', 'True') == 'True')
ZARINPAL_CALLBACK_URL = get_db_setting('zarinpal_callback_url', os.environ.get('ZARINPAL_CALLBACK_URL', 'http://localhost:3000/payment/verify/'))
ENABLE_PAYMENT = get_db_bool('enable_payment', True)

# -- قیمت لحظه‌ای --
LIVE_PRICE_PROVIDER = get_db_setting('live_price_provider', os.environ.get('LIVE_PRICE_PROVIDER', 'none'))
TWELVEDATA_API_KEY = get_db_setting('twelvedata_api_key', os.environ.get('TWELVEDATA_API_KEY', ''))
TWELVEDATA_BASE_URL = get_db_setting('twelvedata_base_url', os.environ.get('TWELVEDATA_BASE_URL', 'https://api.twelvedata.com'))
FINNHUB_API_KEY = get_db_setting('finnhub_api_key', os.environ.get('FINNHUB_API_KEY', ''))
FINNHUB_BASE_URL = get_db_setting('finnhub_base_url', os.environ.get('FINNHUB_BASE_URL', 'https://finnhub.io/api/v1'))
ALPHA_VANTAGE_API_KEY = get_db_setting('alphavantage_api_key', os.environ.get('ALPHA_VANTAGE_API_KEY', ''))

# -- CORS --
CORS_ALLOWED_ORIGINS = get_db_setting('cors_allowed_origins', 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173').split(',')

# -- ادمین --
ADMIN_PHONE_NUMBER = get_db_setting('admin_phone_number', os.environ.get('ADMIN_PHONE_NUMBER', '09155511393'))


# ============================================
# ✅ تنظیمات CORS (کامل و صحیح)
# ============================================
CORS_ALLOW_ALL_ORIGINS = True

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'x-consultation-id',
    'x-total-time',
    'cache-control',
]

CORS_EXPOSE_HEADERS = [
    'x-consultation-id',
    'x-total-time',
]

CORS_PREFLIGHT_MAX_AGE = 86400


# ============================================
# ✅ تنظیمات لاگ (بهینه‌شده - کاهش نویز)
# ============================================
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {asctime} {message}',
            'style': '{',
        },
        'ai_formatter': {
            'format': '🧠 {levelname} {asctime} [AI] {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
            'stream': sys.stdout,
        },
        'file': {
            'class': 'logging.FileHandler',
            'filename': os.path.join(BASE_DIR, 'logs', 'trading_journal.log'),
            'formatter': 'verbose',
            'encoding': 'utf-8',
        },
        'ai_file': {
            'class': 'logging.FileHandler',
            'filename': os.path.join(BASE_DIR, 'logs', 'ai_consultations.log'),
            'formatter': 'ai_formatter',
            'encoding': 'utf-8',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'WARNING',  # فقط هشدارها و خطاها (حذف لاگ‌های INFO اضافی)
    },
    'loggers': {
        # ======== لاگ‌های اصلی Django ========
        'django': {
            'handlers': ['console', 'file'],
            'level': 'WARNING',  # فقط خطاها و هشدارها
            'propagate': False,
        },
        'django.request': {
            'handlers': ['console', 'file'],
            'level': 'ERROR',   # فقط خطاهای سرور (۵xx)
            'propagate': False,
        },
        'django.server': {
            'handlers': ['console', 'file'],
            'level': 'ERROR',   # فقط خطاهای سرور
            'propagate': False,
        },
        'django.security': {
            'handlers': ['console', 'file'],
            'level': 'ERROR',
            'propagate': False,
        },

        # ======== لاگ‌های اپلیکیشن‌ها ========
        'apps.trading': {
            'handlers': ['console', 'ai_file', 'file'],
            'level': 'INFO',   # نمایش لاگ‌های مشاوره AI
            'propagate': False,
        },
        'apps.subscriptions': {
            'handlers': ['console', 'file'],
            'level': 'WARNING',  # فقط خطاهای اشتراک
            'propagate': False,
        },
        'apps.accounts': {
            'handlers': ['console', 'file'],
            'level': 'WARNING',
            'propagate': False,
        },
        'apps.admin_panel': {
            'handlers': ['console', 'file'],
            'level': 'WARNING',
            'propagate': False,
        },
        'apps.messaging': {
            'handlers': ['console', 'file'],
            'level': 'WARNING',
            'propagate': False,
        },

        # ======== کتابخانه‌های جانبی ========
        'requests': {
            'handlers': ['console', 'file'],
            'level': 'ERROR',
            'propagate': False,
        },
        'urllib3': {
            'handlers': ['console', 'file'],
            'level': 'ERROR',
            'propagate': False,
        },
        'celery': {
            'handlers': ['console', 'file'],
            'level': 'WARNING',
            'propagate': False,
        },
    },
}


# ============================================
# اپلیکیشن‌های نصب شده
# ============================================
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'rest_framework',
    'rest_framework_simplejwt',
    'apps.accounts',
    'apps.trading',
    'apps.subscriptions',
    'apps.messaging',
    'apps.admin_panel',
    'apps.import',  # ✅ اضافه شد
    'django_cleanup.apps.CleanupConfig',  # حتماً آخرین اپ باشد
]


# ============================================
# Middleware
# ============================================
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]


ROOT_URLCONF = 'trading_journal.urls'


# ============================================
# تنظیمات Template
# ============================================
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]


WSGI_APPLICATION = 'trading_journal.wsgi.application'


# ============================================
# دیتابیس
# ============================================
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.environ.get('DB_NAME', 'trading_journal'),
        'USER': os.environ.get('DB_USER', 'root'),
        'PASSWORD': os.environ.get('DB_PASSWORD', 'po879000'),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '3306'),
        'OPTIONS': {
            'charset': 'utf8mb4',
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
        }
    }
}


# ============================================
# رمزگذاری و احراز هویت
# ============================================
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 6,
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


AUTH_USER_MODEL = 'accounts.User'


# ============================================
# تنظیمات بین‌المللی
# ============================================
LANGUAGE_CODE = 'fa-ir'
TIME_ZONE = 'Asia/Tehran'
USE_I18N = True
USE_TZ = True


# ============================================
# فایل‌های استاتیک و مدیا
# ============================================
STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'static')


# ============================================
# ✅ تنظیمات مدیا (آپلود فایل)
# ============================================
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')


DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# ============================================
# تنظیمات REST Framework
# ============================================
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
    ),
    'DEFAULT_PARSER_CLASSES': (
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.MultiPartParser',
        'rest_framework.parsers.FormParser',
    ),
    'EXCEPTION_HANDLER': 'rest_framework.views.exception_handler',
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
    ),
}


# ============================================
# تنظیمات JWT
# ============================================
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': False,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
    'JTI_CLAIM': 'jti',
}


# ============================================
# تنظیمات زرین‌پال
# ============================================
ZARINPAL_MERCHANT_ID = os.environ.get('ZARINPAL_MERCHANT_ID', 'c9f6ca76-02cf-11e9-a61e-005056a205be')
ZARINPAL_SANDBOX = os.environ.get('ZARINPAL_SANDBOX', 'True') == 'True'
ZARINPAL_CALLBACK_URL = os.environ.get('ZARINPAL_CALLBACK_URL', 'http://localhost:3000/payment/verify/')


# ============================================
# تنظیمات پیامک (SMS)
# ============================================
SMS_API_KEY = os.environ.get('SMS_API_KEY', '')
SMS_SENDER_NUMBER = os.environ.get('SMS_SENDER_NUMBER', '3000****')
SMS_OTP_TEMPLATE = os.environ.get('SMS_OTP_TEMPLATE', 'verifycode')
SMS_ENABLED = bool(SMS_API_KEY)


# ============================================
# تنظیمات سرویس‌های قیمت لحظه‌ای
# ============================================
LIVE_PRICE_PROVIDER = os.environ.get('LIVE_PRICE_PROVIDER', 'none')
TWELVEDATA_API_KEY = os.environ.get('TWELVEDATA_API_KEY', '')
TWELVEDATA_BASE_URL = os.environ.get('TWELVEDATA_BASE_URL', 'https://api.twelvedata.com')
FINNHUB_API_KEY = os.environ.get('FINNHUB_API_KEY', '')
FINNHUB_BASE_URL = os.environ.get('FINNHUB_BASE_URL', 'https://finnhub.io/api/v1')
ALPHA_VANTAGE_API_KEY = os.environ.get('ALPHA_VANTAGE_API_KEY', '')


# ============================================
# ✅ تنظیمات آپلود تصویر
# ============================================
MAX_IMAGE_WIDTH = int(os.environ.get('MAX_IMAGE_WIDTH', 2000))
MAX_IMAGE_HEIGHT = int(os.environ.get('MAX_IMAGE_HEIGHT', 2000))
IMAGE_QUALITY = int(os.environ.get('IMAGE_QUALITY', 85))
MAX_IMAGE_SIZE_MB = int(os.environ.get('MAX_IMAGE_SIZE_MB', 5))
SHOW_SCREENSHOT_UPLOAD = os.environ.get('SHOW_SCREENSHOT_UPLOAD', 'True') == 'True'


# ============================================
# تنظیمات امنیتی اضافی (برای محیط تولید)
# ============================================
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

    LOGGING['handlers']['file']['level'] = 'WARNING'
    LOGGING['root']['level'] = 'WARNING'

    TEMPLATES[0]['OPTIONS']['loaders'] = [
        ('django.template.loaders.cached.Loader', [
            'django.template.loaders.filesystem.Loader',
            'django.template.loaders.app_directories.Loader',
        ]),
    ]