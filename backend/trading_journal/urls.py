# backend/trading_journal/urls.py

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

# مستندات API
schema_view = get_schema_view(
    openapi.Info(
        title="Trading Journal API",
        default_version='v1',
        description="API documentation for Trading Journal Application",
        terms_of_service="https://www.tradingjournal.com/terms/",
        contact=openapi.Contact(email="info@tradingjournal.com"),
        license=openapi.License(name="BSD License"),
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)


def health_check(request):
    """سلامت سنجی سرور"""
    return JsonResponse({
        'status': 'ok',
        'message': 'Server is running'
    })


urlpatterns = [
    # مدیریت و احراز هویت
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.accounts.urls')),

    # ترید و اشتراک
    path('api/trading/', include('apps.trading.urls')),
    path('api/subscription/', include('apps.subscriptions.urls')),

    # پیام‌رسانی و ادمین
    path('api/messages/', include('apps.messaging.urls')),
    path('api/admin/', include('apps.admin_panel.urls')),

    # تنظیمات سیستم
    path('api/system/', include('apps.accounts.system_urls')),

    # سلامت سنجی
    path('health/', health_check, name='health_check'),

    # مستندات API
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
]

# در حالت DEBUG، مسیرهای فایل‌های مدیا و استاتیک را اضافه کن
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)