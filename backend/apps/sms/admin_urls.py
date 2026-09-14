# backend/apps/sms/admin_urls.py
"""
URLهای ادمین سیستم پیامک
همه زیر /api/admin/sms/
"""

from django.urls import path
from . import admin_views as views

app_name = 'sms_admin'

urlpatterns = [
    # ===== Providers =====
    path('providers/', views.AdminProviderListView.as_view(), name='providers_list'),
    path('providers/<int:pk>/', views.AdminProviderDetailView.as_view(), name='provider_detail'),
    path('providers/<int:pk>/activate/', views.AdminProviderActivateView.as_view(), name='provider_activate'),
    path('providers/<int:pk>/test/', views.AdminProviderTestView.as_view(), name='provider_test'),
    path('providers/<int:pk>/refresh-credit/', views.AdminProviderRefreshCreditView.as_view(), name='provider_refresh_credit'),

    # ===== Messages (ارسالی) =====
    path('messages/', views.AdminMessageListView.as_view(), name='messages_list'),
    path('messages/<int:pk>/', views.AdminMessageDetailView.as_view(), name='message_detail'),
    path('messages/<int:pk>/check-status/', views.AdminMessageCheckStatusView.as_view(), name='message_check_status'),
    path('messages/bulk-check/', views.AdminMessageBulkCheckView.as_view(), name='messages_bulk_check'),

    # ===== Inbox (دریافتی) =====
    path('inbox/', views.AdminInboxListView.as_view(), name='inbox_list'),
    path('inbox/<int:pk>/', views.AdminInboxDetailView.as_view(), name='inbox_detail'),
    path('inbox/<int:pk>/mark-read/', views.AdminInboxMarkReadView.as_view(), name='inbox_mark_read'),
    path('inbox/<int:pk>/flag/', views.AdminInboxFlagView.as_view(), name='inbox_flag'),
    path('inbox/fetch/', views.AdminInboxFetchView.as_view(), name='inbox_fetch'),
    path('inbox/bulk-mark-read/', views.AdminInboxBulkMarkReadView.as_view(), name='inbox_bulk_mark_read'),

    # ===== Send =====
    path('send/', views.AdminSendSmsView.as_view(), name='send_sms'),

    # ===== Templates =====
    path('templates/', views.AdminTemplateListView.as_view(), name='templates_list'),
    path('templates/<int:pk>/', views.AdminTemplateDetailView.as_view(), name='template_detail'),

    # ===== Stats =====
    path('stats/', views.AdminSmsStatsView.as_view(), name='stats'),
]