# admin.py
from django.contrib import admin
from django.utils.html import format_html
from .models import SubscriptionPlan, UserSubscription, DiscountCode, Transaction, SMSLog


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ['plan_name', 'plan_type', 'duration_days', 'monthly_trades_limit', 'price', 'is_active']
    list_filter = ['plan_type', 'is_active']
    search_fields = ['plan_name', 'description']
    ordering = ['price']


@admin.register(DiscountCode)
class DiscountCodeAdmin(admin.ModelAdmin):
    list_display = ['code', 'discount_percent', 'max_uses', 'used_count', 'is_active', 'expires_at', 'is_valid_status']
    list_filter = ['is_active', 'plan']
    search_fields = ['code']
    ordering = ['-created_at']

    def is_valid_status(self, obj):
        return format_html(
            '<span style="color: {};">{}</span>',
            'green' if obj.is_valid() else 'red',
            '✓' if obj.is_valid() else '✗'
        )

    is_valid_status.short_description = 'اعتبار'


@admin.register(UserSubscription)
class UserSubscriptionAdmin(admin.ModelAdmin):
    list_display = ['user', 'plan', 'start_date', 'end_date', 'is_active', 'payment_status', 'is_trial']
    list_filter = ['is_active', 'payment_status', 'is_trial', 'plan']
    search_fields = ['user__phone_number', 'user__first_name', 'user__last_name']
    ordering = ['-created_at']
    raw_id_fields = ['user', 'plan']


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ['user', 'total_amount', 'payment_status', 'payment_method', 'created_at']
    list_filter = ['payment_status', 'payment_method']
    search_fields = ['user__phone_number', 'payment_reference']
    ordering = ['-created_at']
    raw_id_fields = ['user', 'subscription']


@admin.register(SMSLog)
class SMSLogAdmin(admin.ModelAdmin):
    list_display = ['phone_number', 'message_preview', 'status', 'created_at']
    list_filter = ['status']
    search_fields = ['phone_number', 'message']
    ordering = ['-created_at']

    def message_preview(self, obj):
        return obj.message[:50] + '...' if len(obj.message) > 50 else obj.message

    message_preview.short_description = 'متن پیام'