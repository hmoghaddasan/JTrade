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
    pass  # اگر dotenv نصب نبود، از متغیرهای سیستم استفاده کن

# ============================================
# کلیدهای امنیتی و تنظیمات پایه
# ============================================
SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-7!@#$%^&*()_+QWERTYUIOP{}|ASDFGHJKL:"ZXCVBNM<>?1234567890')

DEBUG = os.environ.get('DEBUG', 'True') == 'True'

ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1,0.0.0.0').split(',')

# ============================================
# تنظیمات دوره آزمایشی
# ============================================
TRIAL_DAYS = 7  # تعداد روزهای آزمایشی
TRIAL_TRADES_LIMIT = 10  # محدودیت ترید در دوره آزمایشی
TRIAL_AI_CONSULTATIONS_LIMIT = 5  # محدودیت مشاوره AI در دوره آزمایشی

# ============================================
# تنظیمات لاگ - اصلاح شده برای پشتیبانی از یونیکد
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
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': True,
        },
        'apps': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
            'propagate': True,
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

    # پکیج‌های شخص ثالث
    'corsheaders',
    'rest_framework',
    'rest_framework_simplejwt',

    # اپلیکیشن‌های پروژه
    'apps.accounts',
    'apps.trading',
    'apps.subscriptions',
    'apps.messaging',
    'apps.admin_panel',
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

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ============================================
# تنظیمات AI (Ollama)
# ============================================
OLLAMA_URL = os.environ.get('OLLAMA_URL', 'http://localhost:11434/api/generate')
OLLAMA_MODEL = os.environ.get('OLLAMA_MODEL', 'llama3.1:8b')

# ============================================
# تنظیمات CORS
# ============================================
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

CORS_ALLOW_ALL_ORIGINS = DEBUG

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
]

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

ADMIN_PHONE_NUMBER = os.environ.get('ADMIN_PHONE_NUMBER', '09155511393')

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

# ============================================
# ✅ تنظیمات Alpha Vantage (قیمت لحظه‌ای) – اصلاح‌شده
# ============================================
ALPHA_VANTAGE_API_KEY = os.environ.get('ALPHA_VANTAGE_API_KEY', '')