# backend/apps/messaging/serializers.py

from rest_framework import serializers
from django.utils import timezone
from .models import UserMessage, SystemMessage, SupportInfo, SMSLog


class UserMessageSerializer(serializers.ModelSerializer):
    """سریالایزر پیام کاربر"""
    user_phone = serializers.SerializerMethodField()
    user_name = serializers.SerializerMethodField()
    created_at_display = serializers.SerializerMethodField()
    reply_date_display = serializers.SerializerMethodField()
    replied_by_name = serializers.SerializerMethodField()

    class Meta:
        model = UserMessage
        fields = [
            'id', 'user', 'user_phone', 'user_name',
            'subject', 'message', 'is_read', 'is_read_by_admin',
            'is_replied', 'reply_message', 'reply_date', 'reply_date_display',
            'replied_by', 'replied_by_name', 'has_new_reply',
            'created_at', 'created_at_display', 'updated_at'
        ]
        read_only_fields = ['user', 'created_at', 'updated_at']

    def get_user_phone(self, obj):
        return obj.user.phone_number if obj.user else None

    def get_user_name(self, obj):
        return obj.user.get_full_name() if obj.user else None

    def get_created_at_display(self, obj):
        return obj.created_at.strftime('%Y/%m/%d %H:%M')

    def get_reply_date_display(self, obj):
        if obj.reply_date:
            return obj.reply_date.strftime('%Y/%m/%d %H:%M')
        return None

    def get_replied_by_name(self, obj):
        if obj.replied_by:
            return obj.replied_by.get_full_name()
        return None


class UserMessageCreateSerializer(serializers.ModelSerializer):
    """سریالایزر ایجاد پیام جدید"""

    class Meta:
        model = UserMessage
        fields = ['subject', 'message']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class UserMessageReplySerializer(serializers.Serializer):
    """سریالایزر پاسخ به پیام"""
    reply_message = serializers.CharField(max_length=1000)


class UserMessageListSerializer(serializers.ModelSerializer):
    """سریالایزر لیست پیام‌ها برای کاربر"""
    user_phone = serializers.SerializerMethodField()
    reply_preview = serializers.SerializerMethodField()

    class Meta:
        model = UserMessage
        fields = [
            'id', 'subject', 'message', 'is_read', 'is_replied',
            'reply_message', 'reply_date', 'has_new_reply',
            'user_phone', 'reply_preview', 'created_at'
        ]

    def get_user_phone(self, obj):
        return obj.user.phone_number if obj.user else None

    def get_reply_preview(self, obj):
        if obj.reply_message:
            return obj.reply_message[:100] + '...' if len(obj.reply_message) > 100 else obj.reply_message
        return None


class SystemMessageSerializer(serializers.ModelSerializer):
    """سریالایزر پیام سیستم"""
    is_active_display = serializers.SerializerMethodField()

    class Meta:
        model = SystemMessage
        fields = [
            'id', 'message_key', 'title', 'message', 'is_active',
            'is_global', 'start_date', 'end_date', 'created_at',
            'is_active_display'
        ]
        read_only_fields = ['created_at']

    def get_is_active_display(self, obj):
        return 'فعال' if obj.is_active else 'غیرفعال'


class SystemMessageCreateSerializer(serializers.ModelSerializer):
    """سریالایزر ایجاد پیام سیستم"""

    class Meta:
        model = SystemMessage
        fields = '__all__'
        read_only_fields = ['created_at']


class SupportInfoSerializer(serializers.ModelSerializer):
    """سریالایزر اطلاعات پشتیبانی"""

    class Meta:
        model = SupportInfo
        fields = '__all__'


class SMSLogSerializer(serializers.ModelSerializer):
    """سریالایزر لاگ پیامک"""
    sent_by_phone = serializers.SerializerMethodField()
    sent_by_name = serializers.SerializerMethodField()

    class Meta:
        model = SMSLog
        fields = [
            'id', 'phone_number', 'message', 'status', 'response',
            'sent_by', 'sent_by_phone', 'sent_by_name',
            'is_bulk', 'recipients_count', 'created_at'
        ]

    def get_sent_by_phone(self, obj):
        return obj.sent_by.phone_number if obj.sent_by else None

    def get_sent_by_name(self, obj):
        return obj.sent_by.get_full_name() if obj.sent_by else None


class SendSMSBulkSerializer(serializers.Serializer):
    """سریالایزر ارسال پیامک گروهی"""
    message = serializers.CharField(max_length=500)
    user_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text="لیست آیدی کاربران (در صورت خالی بودن، به همه کاربران فعال ارسال می‌شود)"
    )
    send_to_all_active = serializers.BooleanField(default=False)


class UnreadMessagesCountSerializer(serializers.Serializer):
    """سریالایزر تعداد پیام‌های خوانده نشده"""
    unread_count = serializers.IntegerField()
    has_unread_replies = serializers.BooleanField()