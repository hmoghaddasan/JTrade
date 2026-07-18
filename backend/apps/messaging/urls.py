# backend/apps/messaging/urls.py

from django.urls import path
from . import views

app_name = 'messaging'

urlpatterns = [
    # ============================================
    # پیام‌های کاربر (User)
    # ============================================
    path('', views.MessageListView.as_view(), name='message_list'),
    path('create/', views.MessageCreateView.as_view(), name='message_create'),
    path('<int:pk>/', views.MessageDetailView.as_view(), name='message_detail'),
    path('<int:pk>/reply/', views.MessageReplyView.as_view(), name='message_reply'),
    path('<int:pk>/mark-read/', views.MessageMarkReadView.as_view(), name='message_mark_read'),
    path('mark-all-read/', views.MessageMarkAllReadView.as_view(), name='message_mark_all_read'),
    path('unread-count/', views.UnreadMessagesCountView.as_view(), name='unread_count'),

    # ============================================
    # اطلاعات پشتیبانی
    # ============================================
    path('support-info/', views.SupportInfoView.as_view(), name='support_info'),
    path('support-info/update/', views.SupportInfoUpdateView.as_view(), name='support_info_update'),

    # ============================================
    # پیام‌های سیستم (عمومی)
    # ============================================
    path('system/public/', views.PublicSystemMessagesView.as_view(), name='public_system_messages'),

    # ============================================
    # پیام‌های سیستم (ادمین)
    # ============================================
    path('system/', views.SystemMessageAdminView.as_view(), name='system_messages_admin'),
    path('system/create/', views.SystemMessageCreateView.as_view(), name='system_message_create'),
    path('system/<int:pk>/', views.SystemMessageDetailView.as_view(), name='system_message_detail'),
    path('system/<int:pk>/update/', views.SystemMessageUpdateView.as_view(), name='system_message_update'),
    path('system/<int:pk>/delete/', views.SystemMessageDeleteView.as_view(), name='system_message_delete'),

    # ============================================
    # پیام‌های کاربران (ادمین)
    # ============================================
    path('admin/messages/', views.AdminMessageListView.as_view(), name='admin_messages'),
    path('admin/messages/<int:pk>/', views.AdminMessageDetailView.as_view(), name='admin_message_detail'),
    path('admin/messages/<int:pk>/reply/', views.AdminMessageReplyView.as_view(), name='admin_message_reply'),
    path('admin/messages/<int:pk>/delete/', views.AdminMessageDeleteView.as_view(), name='admin_message_delete'),

    # ============================================
    # ارسال پیامک گروهی (ادمین)
    # ============================================
    path('sms/send/', views.AdminSendSMSView.as_view(), name='admin_send_sms'),
    path('sms/history/', views.AdminSMSHistoryView.as_view(), name='admin_sms_history'),

    # ============================================
    # داشبورد
    # ============================================
    path('dashboard/', views.DashboardMessagesView.as_view(), name='dashboard_messages'),
]