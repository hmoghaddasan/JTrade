# backend/apps/sms/admin.py
"""
ثبت مدل‌ها در Django Admin
"""

from django.contrib import admin
from .models import SmsProviderConfig, SmsMessage, SmsInbox, SmsTemplate


@admin.register(SmsProviderConfig)
class SmsProviderConfigAdmin(admin.ModelAdmin):
    list_display = ('provider', 'provider_display', 'is_active', 'is_configured', 'line_number', 'credit', 'last_checked_at')
    list_filter = ('provider', 'is_active', 'is_configured')
    search_fields = ('provider', 'line_number', 'api_key')
    readonly_fields = ('credit', 'last_checked_at', 'created_at', 'updated_at')


@admin.register(SmsMessage)
class SmsMessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'phone_number', 'provider', 'event_key', 'status', 'cost', 'created_at')
    list_filter = ('provider', 'status', 'send_method', 'event_key')
    search_fields = ('phone_number', 'external_id', 'message')
    readonly_fields = ('created_at', 'sent_at', 'delivered_at', 'last_checked_at', 'response_data')
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)


@admin.register(SmsInbox)
class SmsInboxAdmin(admin.ModelAdmin):
    list_display = ('id', 'from_number', 'provider', 'is_read', 'is_flagged', 'received_at')
    list_filter = ('provider', 'is_read', 'is_flagged')
    search_fields = ('from_number', 'message')
    readonly_fields = ('created_at', 'raw_data')
    date_hierarchy = 'received_at'
    ordering = ('-received_at',)


@admin.register(SmsTemplate)
class SmsTemplateAdmin(admin.ModelAdmin):
    list_display = ('event_key', 'event_name', 'ghasedak_template', 'smsir_template_id', 'is_active', 'is_system')
    list_filter = ('is_active', 'is_system')
    search_fields = ('event_key', 'event_name', 'ghasedak_template')
    readonly_fields = ('created_at', 'updated_at')