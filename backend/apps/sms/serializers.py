# backend/apps/sms/serializers.py
"""
سریالایزرهای سیستم پیامک
"""

from rest_framework import serializers

from .models import SmsProviderConfig, SmsMessage, SmsInbox, SmsTemplate, SmsErrorLog

# ============================================
# ۱. Provider Config
# ============================================
class SmsProviderConfigSerializer(serializers.ModelSerializer):
    """سریالایزر تنظیمات provider"""
    provider_display_full = serializers.SerializerMethodField()

    class Meta:
        model = SmsProviderConfig
        fields = [
            'id', 'provider', 'provider_display', 'provider_display_full',
            'is_active', 'is_configured',
            'api_key', 'line_number', 'send_method',
            'credit', 'last_checked_at', 'notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'credit', 'last_checked_at', 'created_at', 'updated_at']

    def get_provider_display_full(self, obj):
        icons = {'ghasedak': '📱 قاصدک', 'sms_ir': '📱 sms.ir'}
        return icons.get(obj.provider, obj.provider)


class SmsProviderTestSerializer(serializers.Serializer):
    """سریالایزر تست اتصال"""
    provider_id = serializers.IntegerField()


# ============================================
# ۲. Message (ارسالی)
# ============================================
class SmsMessageSerializer(serializers.ModelSerializer):
    """سریالایزر پیام ارسالی"""
    status_display = serializers.SerializerMethodField()
    provider_display = serializers.SerializerMethodField()
    send_method_display = serializers.SerializerMethodField()
    user_name = serializers.SerializerMethodField()
    user_phone = serializers.SerializerMethodField()
    created_at_fa = serializers.SerializerMethodField()
    sent_at_fa = serializers.SerializerMethodField()
    delivered_at_fa = serializers.SerializerMethodField()

    class Meta:
        model = SmsMessage
        fields = [
            'id', 'provider', 'provider_display', 'send_method', 'send_method_display',
            'phone_number', 'message', 'template_name', 'event_key',
            'external_id', 'pack_id',
            'status', 'status_display', 'error_code', 'error_message', 'cost',
            'response_data',
            'user', 'user_name', 'user_phone',
            'related_object_type', 'related_object_id',
            'created_at', 'created_at_fa',
            'sent_at', 'sent_at_fa',
            'delivered_at', 'delivered_at_fa',
            'last_checked_at',
        ]

    def get_status_display(self, obj):
        return obj.get_status_display()

    def get_provider_display(self, obj):
        return dict(SmsMessage.PROVIDER_CHOICES).get(obj.provider, obj.provider)

    def get_send_method_display(self, obj):
        return dict(SmsMessage.SEND_METHOD_CHOICES).get(obj.send_method, obj.send_method)

    def get_user_name(self, obj):
        return obj.user.get_full_name() if obj.user else None

    def get_user_phone(self, obj):
        return obj.user.phone_number if obj.user else None

    def get_created_at_fa(self, obj):
        return obj.created_at.strftime('%Y/%m/%d %H:%M') if obj.created_at else None

    def get_sent_at_fa(self, obj):
        return obj.sent_at.strftime('%Y/%m/%d %H:%M') if obj.sent_at else None

    def get_delivered_at_fa(self, obj):
        return obj.delivered_at.strftime('%Y/%m/%d %H:%M') if obj.delivered_at else None


class SmsSendSerializer(serializers.Serializer):
    """سریالایزر ارسال پیامک دستی از پنل ادمین"""
    message = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    phone_numbers = serializers.ListField(
        child=serializers.CharField(max_length=20),
        required=False,
        allow_empty=True,
    )
    user_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True,
    )
    send_to_all = serializers.BooleanField(default=False)
    use_template = serializers.BooleanField(default=False)
    template_event = serializers.CharField(max_length=50, required=False, allow_blank=True)
    context = serializers.DictField(required=False, default=dict)

    def validate(self, data):
        if not data.get('send_to_all') and not data.get('phone_numbers') and not data.get('user_ids'):
            raise serializers.ValidationError('حداقل یک گیرنده (شماره، کاربر یا همه) لازم است')

        if data.get('use_template'):
            if not data.get('template_event'):
                raise serializers.ValidationError('اگر از قالب استفاده می‌کنید، event_key الزامی است')
        else:
            if not data.get('message'):
                raise serializers.ValidationError('متن پیام الزامی است')

        return data


# ============================================
# ۳. Inbox (دریافتی)
# ============================================
class SmsInboxSerializer(serializers.ModelSerializer):
    """سریالایزر پیام دریافتی"""
    provider_display = serializers.SerializerMethodField()
    user_name = serializers.SerializerMethodField()
    received_at_fa = serializers.SerializerMethodField()

    class Meta:
        model = SmsInbox
        fields = [
            'id', 'provider', 'provider_display',
            'line_number', 'from_number', 'message',
            'external_id',
            'user', 'user_name',
            'is_read', 'is_flagged',
            'received_at', 'received_at_fa',
            'raw_data',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'raw_data']

    def get_provider_display(self, obj):
        return dict(SmsInbox.PROVIDER_CHOICES).get(obj.provider, obj.provider)

    def get_user_name(self, obj):
        return obj.user.get_full_name() if obj.user else None

    def get_received_at_fa(self, obj):
        return obj.received_at.strftime('%Y/%m/%d %H:%M') if obj.received_at else None


# ============================================
# ۴. Template (قالب)
# ============================================
class SmsTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SmsTemplate
        fields = [
            'id', 'event_key', 'event_name', 'description',
            'send_method',                    # 🆕
            'ghasedak_template', 'ghasedak_params',
            'smsir_template_id', 'smsir_params',
            'single_message', 'single_params',
            'is_active', 'is_system',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


# ============================================
# ۵. Dashboard / Statistics
# ============================================
class SmsStatsSerializer(serializers.Serializer):
    """سریالایزر آمار پیامک"""
    total_sent = serializers.IntegerField()
    total_delivered = serializers.IntegerField()
    total_failed = serializers.IntegerField()
    total_pending = serializers.IntegerField()
    today_sent = serializers.IntegerField()
    today_cost = serializers.IntegerField()
    inbox_unread = serializers.IntegerField()

# ============================================
# ۶. Error Log (لاگ خطاها)
# ============================================
class SmsErrorLogListSerializer(serializers.ModelSerializer):
    """سریالایزر خلاصه خطا (برای لیست)"""
    severity_display = serializers.SerializerMethodField()
    error_type_display = serializers.SerializerMethodField()
    provider_display = serializers.SerializerMethodField()
    created_at_fa = serializers.SerializerMethodField()

    class Meta:
        model = SmsErrorLog
        fields = [
            'id', 'provider', 'provider_display',
            'error_type', 'error_type_display',
            'error_code', 'error_message',
            'severity', 'severity_display',
            'sms_message', 'is_resolved',
            'admin_notified', 'admin_notified_at',
            'notified_via_provider',
            'created_at', 'created_at_fa',
        ]

    def get_severity_display(self, obj):
        return obj.get_severity_display()

    def get_error_type_display(self, obj):
        return obj.get_error_type_display()

    def get_provider_display(self, obj):
        return obj.get_provider_display()

    def get_created_at_fa(self, obj):
        return obj.created_at.strftime('%Y/%m/%d %H:%M') if obj.created_at else None


class SmsErrorLogSerializer(serializers.ModelSerializer):
    """سریالایزر کامل خطا (برای جزئیات)"""
    severity_display = serializers.SerializerMethodField()
    error_type_display = serializers.SerializerMethodField()
    provider_display = serializers.SerializerMethodField()
    resolved_by_name = serializers.SerializerMethodField()
    created_at_fa = serializers.SerializerMethodField()
    resolved_at_fa = serializers.SerializerMethodField()
    admin_notified_at_fa = serializers.SerializerMethodField()

    class Meta:
        model = SmsErrorLog
        fields = [
            'id', 'provider', 'provider_display',
            'error_type', 'error_type_display',
            'error_code', 'error_message',
            'severity', 'severity_display',
            'context',
            'sms_message',
            'is_resolved', 'resolved_at', 'resolved_at_fa',
            'resolved_by', 'resolved_by_name',
            'resolution_note',
            'admin_notified', 'admin_notified_at', 'admin_notified_at_fa',
            'notified_via_provider',
            'created_at', 'created_at_fa',
        ]
        read_only_fields = [
            'id', 'created_at', 'admin_notified', 'admin_notified_at',
            'resolved_at', 'resolved_by',
        ]

    def get_severity_display(self, obj):
        return obj.get_severity_display()

    def get_error_type_display(self, obj):
        return obj.get_error_type_display()

    def get_provider_display(self, obj):
        return obj.get_provider_display()

    def get_resolved_by_name(self, obj):
        if obj.resolved_by:
            return obj.resolved_by.get_full_name() or obj.resolved_by.phone_number
        return None

    def get_created_at_fa(self, obj):
        return obj.created_at.strftime('%Y/%m/%d %H:%M') if obj.created_at else None

    def get_resolved_at_fa(self, obj):
        return obj.resolved_at.strftime('%Y/%m/%d %H:%M') if obj.resolved_at else None

    def get_admin_notified_at_fa(self, obj):
        return obj.admin_notified_at.strftime('%Y/%m/%d %H:%M') if obj.admin_notified_at else None