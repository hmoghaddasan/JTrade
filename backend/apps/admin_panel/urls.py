# backend/apps/admin_panel/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# ✅ Import admin_views از subscriptions برای پرداخت کارت به کارت
from apps.subscriptions import admin_views as payment_admin_views

app_name = 'admin_panel'

# ===== ایجاد Router برای ViewSet تنظیمات =====
router = DefaultRouter()
router.register(r'settings', views.SystemSettingViewSet, basename='settings')

urlpatterns = [
    # ===== داشبورد =====
    path('dashboard/', views.AdminDashboardView.as_view(), name='admin_dashboard'),

    # ===== کاربران =====
    path('users/', views.AdminUserListView.as_view(), name='admin_users'),
    path('users/<int:pk>/', views.AdminUserDetailView.as_view(), name='admin_user_detail'),
    path('users/<int:pk>/update/', views.AdminUserUpdateView.as_view(), name='admin_user_update'),
    path('users/<int:pk>/toggle/', views.AdminUserToggleView.as_view(), name='admin_user_toggle'),
    path('users/<int:pk>/delete/', views.AdminUserDeleteView.as_view(), name='admin_user_delete'),
    path('users/send-sms/', views.AdminUserSendSMSView.as_view(), name='admin_user_send_sms'),
    path('users/export-excel/', views.ExportUsersExcelView.as_view(), name='export_users_excel'),

    # ===== اشتراک‌ها =====
    path('subscriptions/', views.AdminSubscriptionListView.as_view(), name='admin_subscriptions'),
    path('subscriptions/<int:pk>/', views.AdminSubscriptionDetailView.as_view(), name='admin_subscription_detail'),
    path('subscriptions/<int:pk>/extend/', views.AdminSubscriptionExtendView.as_view(), name='admin_subscription_extend'),
    path('subscriptions/<int:pk>/cancel/', views.AdminSubscriptionCancelView.as_view(), name='admin_subscription_cancel'),
    path('subscriptions/gift/', views.AdminSubscriptionGiftView.as_view(), name='admin_subscription_gift'),
    path('subscriptions/export-excel/', views.ExportSubscriptionsExcelView.as_view(), name='export_subscriptions_excel'),
    path('subscription-plans/', views.AdminSubscriptionPlanListView.as_view(), name='admin_subscription_plans'),
    path('subscription-plans/<int:pk>/', views.AdminSubscriptionPlanDetailView.as_view(), name='admin_subscription_plan_detail'),

    # ===== مالی =====
    path('transactions/', views.AdminTransactionListView.as_view(), name='admin_transactions'),
    path('sales/report/', views.AdminSalesReportView.as_view(), name='admin_sales_report'),
    path('sales/export/', views.AdminSalesExportView.as_view(), name='admin_sales_export'),

    # ============================================
    # ✅ سیستم پرداخت کارت به کارت
    # ============================================

    # ----- کارت‌های بانکی -----
    path('payment-cards/',
         payment_admin_views.AdminPaymentCardListView.as_view(),
         name='admin_payment_card_list'),
    path('payment-cards/<int:pk>/',
         payment_admin_views.AdminPaymentCardDetailView.as_view(),
         name='admin_payment_card_detail'),
    path('payment-cards/<int:pk>/set-default/',
         payment_admin_views.AdminPaymentCardSetDefaultView.as_view(),
         name='admin_payment_card_set_default'),
    path('payment-cards/<int:pk>/toggle/',
         payment_admin_views.AdminPaymentCardToggleView.as_view(),
         name='admin_payment_card_toggle'),

    # ----- درخواست‌های پرداخت -----
    path('payment-requests/',
         payment_admin_views.AdminPaymentRequestListView.as_view(),
         name='admin_payment_request_list'),
    path('payment-requests/stats/',
         payment_admin_views.AdminPaymentRequestStatsView.as_view(),
         name='admin_payment_request_stats'),
    path('payment-requests/<int:pk>/',
         payment_admin_views.AdminPaymentRequestDetailView.as_view(),
         name='admin_payment_request_detail'),
    path('payment-requests/<int:pk>/approve/',
         payment_admin_views.AdminPaymentRequestApproveView.as_view(),
         name='admin_payment_request_approve'),
    path('payment-requests/<int:pk>/reject/',
         payment_admin_views.AdminPaymentRequestRejectView.as_view(),
         name='admin_payment_request_reject'),

    # ===== تخفیف‌ها =====
    path('discounts/', views.AdminDiscountListView.as_view(), name='admin_discounts'),
    path('discounts/<int:pk>/', views.AdminDiscountDetailView.as_view(), name='admin_discount_detail'),
    path('discounts/<int:pk>/delete/', views.AdminDiscountDeleteView.as_view(), name='admin_discount_delete'),

    # ===== نمادها =====
    path('symbols/', views.AdminCurrencyPairListView.as_view(), name='admin_symbols'),
    path('symbols/<int:pk>/', views.AdminCurrencyPairDetailView.as_view(), name='admin_symbol_detail'),

    # ===== بروکرها =====
    path('brokers/', views.AdminBrokerListView.as_view(), name='admin_brokers'),
    path('brokers/<int:pk>/', views.AdminBrokerDetailView.as_view(), name='admin_broker_detail'),

    # ===== مشاوره‌ها =====
    path('consultations/', views.AdminAIConsultationListView.as_view(), name='admin_consultations'),
    path('consultations/<int:pk>/', views.AdminAIConsultationDetailView.as_view(), name='admin_consultation_detail'),
    path('consultations/analytics/', views.AdminAIAnalyticsView.as_view(), name='admin_consultation_analytics'),

    # ===== تریدها =====
    path('trades/', views.AdminTradeListView.as_view(), name='admin_trades'),
    path('trades/<int:pk>/', views.AdminTradeDetailView.as_view(), name='admin_trade_detail'),
    path('trades/<int:pk>/delete/', views.AdminTradeDeleteView.as_view(), name='admin_trade_delete'),
    path('trades/export-excel/', views.AdminTradesExportView.as_view(), name='admin_trades_export'),

    # ===== پیام‌ها =====
    path('messages/', views.AdminMessageListView.as_view(), name='admin_messages'),
    path('messages/<int:pk>/', views.AdminMessageDetailView.as_view(), name='admin_message_detail'),
    path('messages/<int:pk>/reply/', views.AdminMessageReplyView.as_view(), name='admin_message_reply'),
    path('messages/<int:pk>/delete/', views.AdminMessageDeleteView.as_view(), name='admin_message_delete'),

    # ===== نسخه‌ها =====
    path('versions/', views.AdminAppVersionListView.as_view(), name='admin_versions'),
    path('versions/<int:pk>/', views.AdminAppVersionDetailView.as_view(), name='admin_version_detail'),
    path('versions/<int:pk>/delete/', views.AdminAppVersionDeleteView.as_view(), name='admin_version_delete'),

    # ===== پورتفولیوها =====
    path('portfolios/', views.AdminPortfolioListView.as_view(), name='admin_portfolios'),
    path('portfolios/<int:pk>/', views.AdminPortfolioDetailView.as_view(), name='admin_portfolio_detail'),

    # ============================================
    # ✅ تنظیمات سیستم - مسیرهای اصلی
    # ============================================
    path('settings-list/', views.AdminSettingsListView.as_view(), name='admin_settings_list'),
    path('settings-update/', views.AdminSettingsUpdateView.as_view(), name='admin_settings_update'),

    # ============================================
    # ✅ مسیرهای Router (برای ViewSet)
    # ============================================
    path('', include(router.urls)),
]