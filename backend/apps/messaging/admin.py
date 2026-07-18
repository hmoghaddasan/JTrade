# backend/apps/messaging/admin.py

from django.contrib import admin
from django.utils.html import format_html
from .models import UserMessage, SystemMessage, SupportInfo, SMSLog


@admin.register(UserMessage)
class UserMessageAdmin(admin.ModelAdmin):
    list_display = ['subject', 'user', 'is_read', 'is_read_by_admin', 'is_replied', 'has_new_reply', 'created_at']
    list_filter = ['is_read', 'is_read_by_admin', 'is_replied', 'has_new_reply']
    search_fields = ['user__phone_number', 'user__first_name', 'user__last_name', 'subject', 'message']
    ordering = ['-created_at']
    raw_id_fields = ['user', 'replied_by']
    readonly_fields = ['created_at', 'updated_at']

    fieldsets = (
        ('اطلاعات پیام', {
            'fields': ('user', 'subject', 'message')
        }),
        ('وضعیت', {
            'fields': ('is_read', 'is_read_by_admin', 'is_replied', 'has_new_reply', 'reply_message', 'reply_date',
                       'replied_by')
        }),
        ('تاریخ', {
            'fields': ('created_at', 'updated_at')
        }),
    )

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs


@admin.register(SystemMessage)
class SystemMessageAdmin(admin.ModelAdmin):
    list_display = ['title', 'is_active', 'is_global', 'start_date', 'end_date']
    list_filter = ['is_active', 'is_global']
    search_fields = ['title', 'message']
    ordering = ['-created_at']

    fieldsets = (
        ('اطلاعات پیام', {
            'fields': ('message_key', 'title', 'message')
        }),
        ('تنظیمات نمایش', {
            'fields': ('is_active', 'is_global', 'start_date', 'end_date')
        }),
        ('تاریخ', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(SupportInfo)
class SupportInfoAdmin(admin.ModelAdmin):
    list_display = ['title', 'is_active']
    fieldsets = (
        ('اطلاعات اصلی', {
            'fields': ('title', 'description')
        }),
        ('اطلاعات تماس', {
            'fields': ('phone', 'email', 'address', 'working_hours')
        }),
        ('وضعیت', {
            'fields': ('is_active',)
        }),
    )


@admin.register(SMSLog)
class SMSLogAdmin(admin.ModelAdmin):
    list_display = ['phone_number', 'message_preview', 'status', 'is_bulk', 'created_at']
    list_filter = ['status', 'is_bulk']
    search_fields = ['phone_number', 'message']
    ordering = ['-created_at']

    def message_preview(self, obj):
        return obj.message[:50] + '...' if len(obj.message) > 50 else obj.message

    message_preview.short_description = 'متن پیام'