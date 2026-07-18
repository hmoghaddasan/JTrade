from django.urls import path
from . import views

app_name = 'admin_panel'

urlpatterns = [
    # داشبورد
    path('dashboard/', views.AdminDashboardView.as_view(), name='admin_dashboard'),

    # مدیریت کاربران
    path('users/', views.AdminUserListView.as_view(), name='admin_users'),
    path('users/<int:pk>/', views.AdminUserDetailView.as_view(), name='admin_user_detail'),
    path('users/<int:pk>/update/', views.AdminUserUpdateView.as_view(), name='admin_user_update'),
    path('users/<int:pk>/toggle/', views.AdminUserToggleView.as_view(), name='admin_user_toggle'),
    path('users/<int:pk>/delete/', views.AdminUserDeleteView.as_view(), name='admin_user_delete'),

    # مدیریت اشتراک‌ها
    path('subscriptions/', views.AdminSubscriptionListView.as_view(), name='admin_subscriptions'),
    path('subscriptions/<int:pk>/', views.AdminSubscriptionDetailView.as_view(), name='admin_subscription_detail'),
    path('subscriptions/<int:pk>/extend/', views.AdminSubscriptionExtendView.as_view(),
         name='admin_subscription_extend'),
    path('subscriptions/<int:pk>/cancel/', views.AdminSubscriptionCancelView.as_view(),
         name='admin_subscription_cancel'),

    # مدیریت پلن‌ها
    path('plans/', views.AdminPlanListView.as_view(), name='admin_plans'),
    path('plans/create/', views.AdminPlanCreateView.as_view(), name='admin_plan_create'),
    path('plans/<int:pk>/', views.AdminPlanDetailView.as_view(), name='admin_plan_detail'),
    path('plans/<int:pk>/update/', views.AdminPlanUpdateView.as_view(), name='admin_plan_update'),
    path('plans/<int:pk>/delete/', views.AdminPlanDeleteView.as_view(), name='admin_plan_delete'),

    # مدیریت کدهای تخفیف
    path('discounts/', views.AdminDiscountListView.as_view(), name='admin_discounts'),
    path('discounts/create/', views.AdminDiscountCreateView.as_view(), name='admin_discount_create'),
    path('discounts/<int:pk>/', views.AdminDiscountDetailView.as_view(), name='admin_discount_detail'),
    path('discounts/<int:pk>/update/', views.AdminDiscountUpdateView.as_view(), name='admin_discount_update'),
    path('discounts/<int:pk>/delete/', views.AdminDiscountDeleteView.as_view(), name='admin_discount_delete'),

    # مدیریت پیام‌های کاربران
    path('messages/', views.AdminMessageListView.as_view(), name='admin_messages'),
    path('messages/<int:pk>/', views.AdminMessageDetailView.as_view(), name='admin_message_detail'),
    path('messages/<int:pk>/reply/', views.AdminMessageReplyView.as_view(), name='admin_message_reply'),
    path('messages/<int:pk>/delete/', views.AdminMessageDeleteView.as_view(), name='admin_message_delete'),

    # گزارشات فروش
    path('sales/report/', views.AdminSalesReportView.as_view(), name='admin_sales_report'),
    path('sales/export/', views.AdminSalesExportView.as_view(), name='admin_sales_export'),
    path('sales/monthly/', views.AdminMonthlySalesView.as_view(), name='admin_monthly_sales'),

    # تنظیمات
    path('settings/', views.AdminSettingsView.as_view(), name='admin_settings'),
    path('settings/update/', views.AdminSettingsUpdateView.as_view(), name='admin_settings_update'),

    # خروجی‌ها
    path('export/users-excel/', views.ExportUsersExcelView.as_view(), name='export_users_excel'),
    path('export/subscriptions-excel/', views.ExportSubscriptionsExcelView.as_view(),
         name='export_subscriptions_excel'),
    path('export/sales-excel/', views.ExportSalesExcelView.as_view(), name='export_sales_excel'),
]