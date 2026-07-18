# apps/accounts/middleware.py

from django.shortcuts import redirect
from django.urls import reverse
from django.utils import timezone
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from django.http import JsonResponse
from django.contrib.auth import get_user_model
import jwt
import logging

from .models import SystemSetting

logger = logging.getLogger(__name__)
User = get_user_model()


class SingleSessionMiddleware:
    """میان‌افزار مدیریت تک‌جلسه‌ای کاربر"""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # پردازش درخواست
        response = self.get_response(request)
        return response

    def process_view(self, request, view_func, view_args, view_kwargs):
        # اگر کاربر احراز هویت شده و توکن دارد
        if hasattr(request, 'user') and request.user.is_authenticated:
            token = request.META.get('HTTP_AUTHORIZATION', '').replace('Bearer ', '')
            if token and hasattr(request.user, 'login_token'):
                # بررسی اینکه توکن جاری با توکن ذخیره شده مطابقت دارد
                if token != request.user.login_token:
                    # توکن قبلی باطل شده است
                    return JsonResponse(
                        {'error': 'جلسه شما در دستگاه دیگری فعال شده است'},
                        status=401
                    )

                # بررسی انقضای توکن
                if request.user.login_token_expiry and request.user.login_token_expiry < timezone.now():
                    request.user.login_token = None
                    request.user.login_token_expiry = None
                    request.user.save(update_fields=['login_token', 'login_token_expiry'])
                    return JsonResponse(
                        {'error': 'نشست شما منقضی شده است'},
                        status=401
                    )

        return None


class SubscriptionCheckMiddleware:
    """میان‌افزار بررسی اشتراک کاربر"""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        return response

    def process_view(self, request, view_func, view_args, view_kwargs):
        # مسیرهای استثنا (نیاز به بررسی اشتراک ندارند)
        exempt_paths = [
            '/api/auth/login/',
            '/api/auth/register/',
            '/api/auth/verify/',
            '/api/auth/refresh/',
            '/api/auth/subscription/status/',
            '/api/auth/subscription/check/',
            '/api/auth/profile/',
            '/api/system/messages/',
            '/api/system/version/',
            '/api/system/versions/',
            '/admin/',
            '/api/subscription/plans/',
            '/api/subscription/purchase/',
            '/api/subscription/verify-payment/',
            '/api/trading/currency-pairs/',
            '/api/messages/support-info/',
            '/api/messages/system/public/',
            '/health/',
            '/swagger/',
            '/redoc/',
        ]

        # اگر کاربر احراز هویت شده باشد
        if hasattr(request, 'user') and request.user.is_authenticated:
            # بررسی اینکه آیا کاربر ادمین است (با استفاده از attribute سفارشی)
            is_admin = hasattr(request.user, 'is_admin') and request.user.is_admin

            # اگر کاربر ادمین است، نیازی به بررسی اشتراک ندارد
            if is_admin:
                return None

            # بررسی اینکه آیا درخواست API است
            is_api_request = request.path.startswith('/api/')

            # اگر مسیر در لیست استثنا نیست
            if request.path not in exempt_paths:
                # بررسی وجود اشتراک فعال
                has_subscription = hasattr(request.user,
                                           'has_active_subscription') and request.user.has_active_subscription()

                if not has_subscription:
                    # اگر اشتراک ندارد
                    if is_api_request:
                        # برای API، خطا برمی‌گردانیم
                        return JsonResponse(
                            {'error': 'اشتراک فعالی ندارید. لطفاً اشتراک خود را تمدید کنید.'},
                            status=403
                        )
                    else:
                        # برای صفحات HTML، مقداردهی در request
                        request.no_active_subscription = True

        return None


class MaintenanceModeMiddleware:
    """میان‌افزار حالت تعمیرات"""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        maintenance_mode = SystemSetting.get_setting('maintenance_mode', False)

        if maintenance_mode:
            # بررسی اینکه کاربر ادمین است
            is_admin = hasattr(request.user, 'is_admin') and request.user.is_admin

            # اگر کاربر ادمین نیست و درخواست API است
            if not is_admin and request.path.startswith('/api/'):
                return JsonResponse(
                    {'error': 'سیستم در حال تعمیرات است، لطفاً بعداً مراجعه کنید'},
                    status=503
                )

        response = self.get_response(request)
        return response


class RequestLoggingMiddleware:
    """میان‌افزار لاگ‌گیری درخواست‌ها"""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # لاگ درخواست
        if request.path.startswith('/api/'):
            logger.info(
                f"Request: {request.method} {request.path} "
                f"User: {getattr(request.user, 'phone_number', 'Anonymous')} "
                f"IP: {self.get_client_ip(request)}"
            )

        response = self.get_response(request)
        return response

    def get_client_ip(self, request):
        """دریافت IP کاربر"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class AuthTokenMiddleware:
    """میان‌افزار اعتبارسنجی توکن برای درخواست‌های غیر API"""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # اگر کاربر احراز هویت نشده و توکن در کوکی یا هدر وجود دارد
        if not request.user.is_authenticated:
            token = request.META.get('HTTP_AUTHORIZATION', '').replace('Bearer ', '')
            if token:
                try:
                    # اعتبارسنجی توکن
                    access_token = AccessToken(token)
                    user_id = access_token.payload.get('user_id')

                    if user_id:
                        try:
                            user = User.objects.get(id=user_id, is_active=True)
                            request.user = user
                        except User.DoesNotExist:
                            pass
                except (InvalidToken, TokenError) as e:
                    logger.warning(f"Invalid token: {str(e)}")

        response = self.get_response(request)
        return response