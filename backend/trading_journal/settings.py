# settings.py
import os
from pathlib import Path
from decouple import config
from datetime import timedelta

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config('SECRET_KEY', default='django-insecure-key-for-development')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config('DEBUG', default=True, cast=bool)

ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1').split(',')

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third party apps
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',
    'drf_yasg',
    'celery',
    'django_celery_beat',

    # Local apps
    'apps.accounts',
    'apps.subscriptions',
    'apps.trading',
    'apps.messaging',
    'apps.admin_panel',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    # میان‌افزارهای سفارشی
    'apps.accounts.middleware.SingleSessionMiddleware',
    'apps.accounts.middleware.SubscriptionCheckMiddleware',
]

ROOT_URLCONF = 'trading_journal.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
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

# Database
# trading_journal/settings.py

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'trading_journal',
        'USER': 'root',
        'PASSWORD': 'po879000',
        'HOST': 'localhost',
        'PORT': '3306',
        'OPTIONS': {
            'charset': 'utf8mb4',
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
            'use_unicode': True,
        },
        'TEST': {
            'CHARSET': 'utf8mb4',
            'COLLATION': 'utf8mb4_unicode_ci',
        }
    }
}

# Cache
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': config('REDIS_URL', default='redis://localhost:6379/1'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# اضافه کردن این خط برای استفاده از مدل کاربر سفارشی
AUTH_USER_MODEL = 'accounts.User'

# Internationalization
LANGUAGE_CODE = 'fa'
TIME_ZONE = 'Asia/Tehran'
USE_I18N = True
USE_L10N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static']

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# CORS settings
CORS_ALLOWED_ORIGINS = config('CORS_ALLOWED_ORIGINS', default='http://localhost:3000,http://127.0.0.1:3000').split(',')
CORS_ALLOW_CREDENTIALS = True

# REST Framework settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.OrderingFilter',
        'rest_framework.filters.SearchFilter',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.MultiPartParser',
        'rest_framework.parsers.FormParser',
    ],
}

# JWT settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=24),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# Celery settings
CELERY_BROKER_URL = config('CELERY_BROKER_URL', default='redis://localhost:6379/0')
CELERY_RESULT_BACKEND = config('CELERY_RESULT_BACKEND', default='redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'Asia/Tehran'
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'

# Email settings
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='info@tradingjournal.com')

# SMS settings (Ghasedak)
SMS_API_KEY = config('SMS_API_KEY', default='')
SMS_SENDER = config('SMS_SENDER', default='')

# Payment settings (Zarinpal)
ZARINPAL_MERCHANT_ID = config('ZARINPAL_MERCHANT_ID', default='')
ZARINPAL_SANDBOX = config('ZARINPAL_SANDBOX', default=True, cast=bool)
ZARINPAL_CALLBACK_URL = config('ZARINPAL_CALLBACK_URL', default='http://localhost:3000/payment/callback/')

# Frontend settings
FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:3000')

# System settings
APP_NAME = config('APP_NAME', default='ژورنال حرفه‌ای ترید')
APP_VERSION = config('APP_VERSION', default='1.0.0')
TRIAL_DAYS = config('TRIAL_DAYS', default=7, cast=int)

# Font settings
DEFAULT_FONT = config('DEFAULT_FONT', default='Vazir')
FONT_SIZES = {
    'small': '12px',
    'normal': '14px',
    'medium': '16px',
    'large': '18px',
    'xlarge': '20px',
    'h1': '32px',
    'h2': '28px',
    'h3': '24px',
    'h4': '20px',
}

# Image paths
IMAGE_PATHS = {
    'logo': '/static/images/logo.png',
    'logo_dark': '/static/images/logo-dark.png',
    'favicon': '/static/images/favicon.ico',
    'background': '/static/images/background.jpg',
    'background_mobile': '/static/images/background-mobile.jpg',
    'trading_banner': '/static/images/trading-banner.jpg',
    'success_icon': '/static/images/success-icon.png',
    'warning_icon': '/static/images/warning-icon.png',
    'error_icon': '/static/images/error-icon.png',
    'chart_icon': '/static/images/chart-icon.png',
    'report_icon': '/static/images/report-icon.png',
    'trade_icon': '/static/images/trade-icon.png',
    'user_icon': '/static/images/user-icon.png',
}

# Image sizes
IMAGE_SIZES = {
    'logo': {'width': 200, 'height': 60},
    'logo_dark': {'width': 200, 'height': 60},
    'favicon': {'width': 32, 'height': 32},
    'background': {'width': 1920, 'height': 1080},
    'background_mobile': {'width': 768, 'height': 1024},
    'trading_banner': {'width': 1200, 'height': 400},
    'success_icon': {'width': 64, 'height': 64},
    'warning_icon': {'width': 64, 'height': 64},
    'error_icon': {'width': 64, 'height': 64},
    'chart_icon': {'width': 48, 'height': 48},
    'report_icon': {'width': 48, 'height': 48},
    'trade_icon': {'width': 48, 'height': 48},
    'user_icon': {'width': 48, 'height': 48},
}

# Color settings
COLORS = {
    'primary': '#1a237e',
    'primary_light': '#3949ab',
    'primary_dark': '#0d1442',
    'secondary': '#0d47a1',
    'secondary_light': '#1976d2',
    'secondary_dark': '#002171',
    'success': '#2e7d32',
    'warning': '#f57f17',
    'error': '#c62828',
    'info': '#00695c',
    'background': '#f5f5f5',
    'surface': '#ffffff',
    'text_primary': '#1a237e',
    'text_secondary': '#4a4a4a',
    'text_disabled': '#9e9e9e',
    'border': '#e0e0e0',
}

# Logging
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
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': BASE_DIR / 'logs/trading_journal.log',
            'maxBytes': 1024 * 1024 * 10,  # 10MB
            'backupCount': 10,
            'formatter': 'verbose',
        },
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file', 'console'],
            'level': 'INFO',
            'propagate': True,
        },
        'apps': {
            'handlers': ['file', 'console'],
            'level': 'INFO',
            'propagate': True,
        },
    },
}
