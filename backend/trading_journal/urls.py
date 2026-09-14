# backend/trading_journal/urls.py

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
# SMS URLs
from apps.sms import urls as sms_urls
from apps.sms import admin_urls as sms_admin_urls
from apps.sms import error_urls as sms_error_urls  # این را در ادامه می‌سازیم

# ✅ import کلاس‌های تنظیمات از admin_panel
from apps.admin_panel.views import (
    AdminSettingsListView,
    AdminSettingsUpdateView,
    AdminDashboardView,
    AdminUserListView,
    AdminUserDetailView,
    AdminUserUpdateView,
    AdminUserToggleView,
    AdminUserDeleteView,
    AdminUserSendSMSView,
    AdminSubscriptionListView,
    AdminSubscriptionDetailView,
    AdminSubscriptionExtendView,
    AdminSubscriptionCancelView,
    AdminSubscriptionGiftView,
    AdminSubscriptionPlanListView,
    AdminSubscriptionPlanDetailView,
    AdminTransactionListView,
    AdminSalesReportView,
    AdminSalesExportView,
    AdminDiscountListView,
    AdminDiscountDetailView,
    AdminDiscountDeleteView,
    AdminCurrencyPairListView,
    AdminCurrencyPairDetailView,
    AdminBrokerListView,
    AdminBrokerDetailView,
    AdminAIConsultationListView,
    AdminAIConsultationDetailView,
    AdminAIAnalyticsView,
    AdminTradeListView,
    AdminTradeDetailView,
    AdminTradeDeleteView,
    AdminTradesExportView,
    AdminMessageListView,
    AdminMessageDetailView,
    AdminMessageReplyView,
    AdminMessageDeleteView,
    AdminAppVersionListView,
    AdminAppVersionDetailView,
    AdminAppVersionDeleteView,
    AdminPortfolioListView,
    AdminPortfolioDetailView,
    ExportUsersExcelView,
    ExportSubscriptionsExcelView,
)

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
        'message': 'Server is running',
        'version': '1.11.2'
    })


urlpatterns = [
    # ============================================
    # مدیریت و احراز هویت
    # ============================================
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.accounts.urls')),

    # ============================================
    # ترید و اشتراک
    # ============================================
    path('api/trading/', include('apps.trading.urls')),
    path('api/subscription/', include('apps.subscriptions.urls')),

    # ============================================
    # پیام‌رسانی
    # ============================================
    path('api/messages/', include('apps.messaging.urls')),

    # ============================================
    # ✅ پنل ادمین - مسیرهای اصلی
    # ============================================
    path('api/admin/', include('apps.admin_panel.urls')),

    # ============================================
    # ✅ تنظیمات سیستم - مسیرهای مستقیم (با اولویت بالاتر)
    # ============================================
    # لیست تنظیمات
    path('api/admin/settings/', AdminSettingsListView.as_view(), name='admin_settings'),
    path('api/admin/settings-list/', AdminSettingsListView.as_view(), name='admin_settings_list'),

    # ذخیره تنظیمات (هر دو مسیر برای سازگاری)
    path('api/admin/settings/update/', AdminSettingsUpdateView.as_view(), name='admin_settings_update_old'),
    path('api/admin/settings-update/', AdminSettingsUpdateView.as_view(), name='admin_settings_update'),

    # ============================================
    # ✅ مسیرهای مستقیم ادمین (برای اطمینان از دسترسی)
    # ============================================
    # داشبورد
    path('api/admin/dashboard/', AdminDashboardView.as_view(), name='admin_dashboard_direct'),

    # کاربران
    path('api/admin/users/', AdminUserListView.as_view(), name='admin_users_direct'),
    path('api/admin/users/<int:pk>/', AdminUserDetailView.as_view(), name='admin_user_detail_direct'),
    path('api/admin/users/<int:pk>/update/', AdminUserUpdateView.as_view(), name='admin_user_update_direct'),
    path('api/admin/users/<int:pk>/toggle/', AdminUserToggleView.as_view(), name='admin_user_toggle_direct'),
    path('api/admin/users/<int:pk>/delete/', AdminUserDeleteView.as_view(), name='admin_user_delete_direct'),
    path('api/admin/users/send-sms/', AdminUserSendSMSView.as_view(), name='admin_user_send_sms_direct'),
    path('api/admin/users/export-excel/', ExportUsersExcelView.as_view(), name='export_users_excel_direct'),

    # اشتراک‌ها
    path('api/admin/subscriptions/', AdminSubscriptionListView.as_view(), name='admin_subscriptions_direct'),
    path('api/admin/subscriptions/<int:pk>/', AdminSubscriptionDetailView.as_view(),
         name='admin_subscription_detail_direct'),
    path('api/admin/subscriptions/<int:pk>/extend/', AdminSubscriptionExtendView.as_view(),
         name='admin_subscription_extend_direct'),
    path('api/admin/subscriptions/<int:pk>/cancel/', AdminSubscriptionCancelView.as_view(),
         name='admin_subscription_cancel_direct'),
    path('api/admin/subscriptions/gift/', AdminSubscriptionGiftView.as_view(), name='admin_subscription_gift_direct'),
    path('api/admin/subscriptions/export-excel/', ExportSubscriptionsExcelView.as_view(),
         name='export_subscriptions_excel_direct'),
    path('api/admin/subscription-plans/', AdminSubscriptionPlanListView.as_view(),
         name='admin_subscription_plans_direct'),
    path('api/admin/subscription-plans/<int:pk>/', AdminSubscriptionPlanDetailView.as_view(),
         name='admin_subscription_plan_detail_direct'),

    # مالی
    path('api/admin/transactions/', AdminTransactionListView.as_view(), name='admin_transactions_direct'),
    path('api/admin/sales/report/', AdminSalesReportView.as_view(), name='admin_sales_report_direct'),
    path('api/admin/sales/export/', AdminSalesExportView.as_view(), name='admin_sales_export_direct'),

    # تخفیف‌ها
    path('api/admin/discounts/', AdminDiscountListView.as_view(), name='admin_discounts_direct'),
    path('api/admin/discounts/<int:pk>/', AdminDiscountDetailView.as_view(), name='admin_discount_detail_direct'),
    path('api/admin/discounts/<int:pk>/delete/', AdminDiscountDeleteView.as_view(),
         name='admin_discount_delete_direct'),

    # نمادها
    path('api/admin/symbols/', AdminCurrencyPairListView.as_view(), name='admin_symbols_direct'),
    path('api/admin/symbols/<int:pk>/', AdminCurrencyPairDetailView.as_view(), name='admin_symbol_detail_direct'),

    # بروکرها
    path('api/admin/brokers/', AdminBrokerListView.as_view(), name='admin_brokers_direct'),
    path('api/admin/brokers/<int:pk>/', AdminBrokerDetailView.as_view(), name='admin_broker_detail_direct'),

    # مشاوره‌ها
    path('api/admin/consultations/', AdminAIConsultationListView.as_view(), name='admin_consultations_direct'),
    path('api/admin/consultations/<int:pk>/', AdminAIConsultationDetailView.as_view(),
         name='admin_consultation_detail_direct'),
    path('api/admin/consultations/analytics/', AdminAIAnalyticsView.as_view(),
         name='admin_consultation_analytics_direct'),

    # تریدها
    path('api/admin/trades/', AdminTradeListView.as_view(), name='admin_trades_direct'),
    path('api/admin/trades/<int:pk>/', AdminTradeDetailView.as_view(), name='admin_trade_detail_direct'),
    path('api/admin/trades/<int:pk>/delete/', AdminTradeDeleteView.as_view(), name='admin_trade_delete_direct'),
    path('api/admin/trades/export-excel/', AdminTradesExportView.as_view(), name='admin_trades_export_direct'),

    # پیام‌ها
    path('api/admin/messages/', AdminMessageListView.as_view(), name='admin_messages_direct'),
    path('api/admin/messages/<int:pk>/', AdminMessageDetailView.as_view(), name='admin_message_detail_direct'),
    path('api/admin/messages/<int:pk>/reply/', AdminMessageReplyView.as_view(), name='admin_message_reply_direct'),
    path('api/admin/messages/<int:pk>/delete/', AdminMessageDeleteView.as_view(), name='admin_message_delete_direct'),

    # نسخه‌ها
    path('api/admin/versions/', AdminAppVersionListView.as_view(), name='admin_versions_direct'),
    path('api/admin/versions/<int:pk>/', AdminAppVersionDetailView.as_view(), name='admin_version_detail_direct'),
    path('api/admin/versions/<int:pk>/delete/', AdminAppVersionDeleteView.as_view(),
         name='admin_version_delete_direct'),

    # پورتفولیوها
    path('api/admin/portfolios/', AdminPortfolioListView.as_view(), name='admin_portfolios_direct'),
    path('api/admin/portfolios/<int:pk>/', AdminPortfolioDetailView.as_view(), name='admin_portfolio_detail_direct'),

    # ============================================
    # سیستم
    # ============================================
    path('api/system/', include('apps.accounts.system_urls')),
    path('api/import/', include('apps.import.urls')),

    path('api/sms/', include('apps.sms.urls')),
    path('api/admin/sms/', include('apps.sms.admin_urls')),
    path('api/admin/sms/errors/', include('apps.sms.error_urls')),
    # ============================================
    # سلامت سنجی
    # ============================================
    path('health/', health_check, name='health_check'),

    # ============================================
    # مستندات API
    # ============================================
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
]

# ============================================
# در حالت DEBUG، مسیرهای فایل‌های مدیا و استاتیک
# ============================================
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

    # اضافه کردن مسیر debug toolbar
    try:
        import debug_toolbar

        urlpatterns = [
                          path('__debug__/', include(debug_toolbar.urls)),
                      ] + urlpatterns
    except ImportError:
        pass