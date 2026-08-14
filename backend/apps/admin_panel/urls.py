# backend/apps/admin_panel/urls.py

from django.urls import path
from . import views

app_name = 'admin_panel'

urlpatterns = [
    # ===== داشبورد =====
    path('dashboard/', views.AdminDashboardView.as_view(), name='admin_dashboard'),

    # ===== مدیریت کاربران =====
    path('users/', views.AdminUserListView.as_view(), name='admin_users'),
    path('users/<int:pk>/', views.AdminUserDetailView.as_view(), name='admin_user_detail'),
    path('users/<int:pk>/update/', views.AdminUserUpdateView.as_view(), name='admin_user_update'),
    path('users/<int:pk>/toggle/', views.AdminUserToggleView.as_view(), name='admin_user_toggle'),
    path('users/<int:pk>/delete/', views.AdminUserDeleteView.as_view(), name='admin_user_delete'),
    path('users/send-sms/', views.AdminUserSendSMSView.as_view(), name='admin_user_send_sms'),
    path('users/export-excel/', views.ExportUsersExcelView.as_view(), name='export_users_excel'),

    # ===== مدیریت اشتراک‌ها =====
    path('subscriptions/', views.AdminSubscriptionListView.as_view(), name='admin_subscriptions'),
    path('subscriptions/<int:pk>/', views.AdminSubscriptionDetailView.as_view(), name='admin_subscription_detail'),
    path('subscriptions/<int:pk>/extend/', views.AdminSubscriptionExtendView.as_view(), name='admin_subscription_extend'),
    path('subscriptions/<int:pk>/cancel/', views.AdminSubscriptionCancelView.as_view(), name='admin_subscription_cancel'),
    path('subscriptions/gift/', views.AdminSubscriptionGiftView.as_view(), name='admin_subscription_gift'),
    path('subscriptions/export-excel/', views.ExportSubscriptionsExcelView.as_view(), name='export_subscriptions_excel'),

    # ===== مدیریت مالی =====
    path('transactions/', views.AdminTransactionListView.as_view(), name='admin_transactions'),
    path('sales/report/', views.AdminSalesReportView.as_view(), name='admin_sales_report'),
    path('sales/export/', views.AdminSalesExportView.as_view(), name='admin_sales_export'),

    # ===== مدیریت کدهای تخفیف =====
    path('discounts/', views.AdminDiscountListView.as_view(), name='admin_discounts'),
    path('discounts/<int:pk>/', views.AdminDiscountDetailView.as_view(), name='admin_discount_detail'),
    path('discounts/<int:pk>/delete/', views.AdminDiscountDeleteView.as_view(), name='admin_discount_delete'),

    # ===== مدیریت نمادها (جفت ارزها) =====
    path('symbols/', views.AdminCurrencyPairListView.as_view(), name='admin_symbols'),
    path('symbols/<int:pk>/', views.AdminCurrencyPairDetailView.as_view(), name='admin_symbol_detail'),

    # ===== مدیریت مشاوره‌های AI =====
    path('consultations/', views.AdminAIConsultationListView.as_view(), name='admin_consultations'),
    path('consultations/<int:pk>/', views.AdminAIConsultationDetailView.as_view(), name='admin_consultation_detail'),
    path('consultations/analytics/', views.AdminAIAnalyticsView.as_view(), name='admin_consultation_analytics'),

    # ===== مدیریت نسخه نرم‌افزار =====
    path('versions/', views.AdminAppVersionListView.as_view(), name='admin_versions'),
    path('versions/<int:pk>/', views.AdminAppVersionDetailView.as_view(), name='admin_version_detail'),
    path('versions/<int:pk>/delete/', views.AdminAppVersionDeleteView.as_view(), name='admin_version_delete'),

    # ===== مدیریت پیام‌های کاربران =====
    path('messages/', views.AdminMessageListView.as_view(), name='admin_messages'),
    path('messages/<int:pk>/', views.AdminMessageDetailView.as_view(), name='admin_message_detail'),
    path('messages/<int:pk>/reply/', views.AdminMessageReplyView.as_view(), name='admin_message_reply'),
    path('messages/<int:pk>/delete/', views.AdminMessageDeleteView.as_view(), name='admin_message_delete'),

    # ===== مدیریت تریدها (ادمین) =====
    path('trades/', views.AdminTradeListView.as_view(), name='admin_trades'),
    path('trades/<int:pk>/', views.AdminTradeDetailView.as_view(), name='admin_trade_detail'),
    path('trades/<int:pk>/delete/', views.AdminTradeDeleteView.as_view(), name='admin_trade_delete'),
    path('trades/export-excel/', views.AdminTradesExportView.as_view(), name='export_trades_excel'),

    # ===== تنظیمات سیستم =====
    path('settings/', views.AdminSettingsListView.as_view(), name='admin_settings'),
    path('settings/update/', views.AdminSettingsUpdateView.as_view(), name='admin_settings_update'),
]