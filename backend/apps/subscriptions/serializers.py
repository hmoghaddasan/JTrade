# backend/apps/subscriptions/serializers.py

from rest_framework import serializers
from .models import SubscriptionPlan, UserSubscription, DiscountCode


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    """سریالایزر پلن‌های اشتراک با تمام فیلدها"""

    class Meta:
        model = SubscriptionPlan
        fields = [
            'id', 'plan_name', 'plan_type', 'duration_days',
            'monthly_trades_limit', 'monthly_ai_consultations_limit',  # ✅ فیلد مشاوره اضافه شد
            'price', 'is_active', 'description'
        ]


class DiscountCodeSerializer(serializers.ModelSerializer):
    is_valid = serializers.BooleanField(read_only=True)

    class Meta:
        model = DiscountCode
        fields = [
            'id', 'code', 'discount_percent', 'max_uses', 'used_count',
            'is_active', 'expires_at', 'is_valid'
        ]


class UserSubscriptionSerializer(serializers.ModelSerializer):
    plan_name = serializers.CharField(source='plan.plan_name', read_only=True)
    plan_type = serializers.CharField(source='plan.plan_type', read_only=True)
    remaining_days = serializers.SerializerMethodField()
    remaining_trades = serializers.SerializerMethodField()
    remaining_ai_consultations = serializers.SerializerMethodField()
    can_trade = serializers.SerializerMethodField()
    can_consult_ai = serializers.SerializerMethodField()
    is_trade_limit_reached = serializers.SerializerMethodField()
    is_ai_limit_reached = serializers.SerializerMethodField()

    class Meta:
        model = UserSubscription
        fields = [
            'id', 'plan_name', 'plan_type', 'start_date', 'end_date',
            'is_active', 'trades_used', 'trades_limit', 'remaining_trades',
            'ai_consultations_used', 'ai_consultations_limit', 'remaining_ai_consultations',
            'can_trade', 'can_consult_ai',
            'is_trade_limit_reached', 'is_ai_limit_reached',
            'is_trial', 'payment_status', 'amount_paid',
            'remaining_days'
        ]

    def get_remaining_days(self, obj):
        return obj.get_remaining_days()

    def get_remaining_trades(self, obj):
        return obj.get_remaining_trades()

    def get_remaining_ai_consultations(self, obj):
        return obj.get_remaining_ai_consultations()

    def get_can_trade(self, obj):
        return obj.can_trade()

    def get_can_consult_ai(self, obj):
        return obj.can_consult_ai()

    def get_is_trade_limit_reached(self, obj):
        return obj.get_remaining_trades() <= 0

    def get_is_ai_limit_reached(self, obj):
        return obj.get_remaining_ai_consultations() <= 0


# ============================================
# ✅ سیستم پرداخت کارت به کارت
# ============================================

from .models import PaymentCard, PaymentRequest


# ---------- PaymentCard ----------
class PaymentCardSerializer(serializers.ModelSerializer):
    """سریالایزر کارت بانکی"""
    card_number_masked = serializers.SerializerMethodField()

    class Meta:
        model = PaymentCard
        fields = [
            'id', 'card_number', 'card_number_masked',
            'card_holder', 'bank_name',
            'is_active', 'is_default', 'order_index',
            'usage_count', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['usage_count', 'created_at', 'updated_at']

    def get_card_number_masked(self, obj):
        """نمایش ماسک‌شده شماره کارت"""
        if not obj.card_number or len(obj.card_number) < 8:
            return obj.card_number
        return f"{obj.card_number[:4]}-****-****-{obj.card_number[-4:]}"


class PaymentCardPublicSerializer(serializers.ModelSerializer):
    """سریالایزر عمومی کارت (برای کاربر) - بدون فیلدهای حساس"""
    card_number_formatted = serializers.SerializerMethodField()

    class Meta:
        model = PaymentCard
        fields = ['id', 'card_number', 'card_number_formatted', 'card_holder', 'bank_name']

    def get_card_number_formatted(self, obj):
        """نمایش شماره کارت با خط تیره (4-4-4-4)"""
        if not obj.card_number or len(obj.card_number) != 16:
            return obj.card_number
        return '-'.join([
            obj.card_number[0:4],
            obj.card_number[4:8],
            obj.card_number[8:12],
            obj.card_number[12:16],
        ])


# ---------- PaymentRequest ----------
class PaymentRequestSerializer(serializers.ModelSerializer):
    """سریالایزر کامل درخواست پرداخت (برای ادمین)"""
    user_phone = serializers.CharField(source='user.phone_number', read_only=True)
    user_name = serializers.SerializerMethodField()
    plan_name = serializers.CharField(source='plan.plan_name', read_only=True)
    status_display = serializers.SerializerMethodField()
    reviewed_by_name = serializers.SerializerMethodField()
    created_at_fa = serializers.SerializerMethodField()
    expires_at_fa = serializers.SerializerMethodField()
    submitted_at_fa = serializers.SerializerMethodField()
    reviewed_at_fa = serializers.SerializerMethodField()
    remaining_seconds = serializers.SerializerMethodField()
    receipt_image_url = serializers.SerializerMethodField()

    class Meta:
        model = PaymentRequest
        fields = [
            'id', 'unique_code',
            'user', 'user_phone', 'user_name',
            'plan', 'plan_name',
            'subscription', 'discount_code',
            'payment_card',
            'destination_card_number', 'destination_card_holder', 'destination_bank_name',
            'amount', 'original_amount', 'discount_amount',
            'tracking_number', 'payer_name', 'payer_card_last4', 'paid_at',
            'receipt_image', 'receipt_image_url', 'user_note',
            'status', 'status_display', 'reject_reason',
            'created_at', 'created_at_fa',
            'expires_at', 'expires_at_fa', 'remaining_seconds',
            'submitted_at', 'submitted_at_fa',
            'reviewed_at', 'reviewed_at_fa', 'reviewed_by', 'reviewed_by_name',
            'admin_notified', 'user_notified',
        ]
        read_only_fields = [
            'id', 'unique_code', 'user', 'plan', 'subscription',
            'amount', 'original_amount', 'discount_amount',
            'destination_card_number', 'destination_card_holder', 'destination_bank_name',
            'status', 'reviewed_by', 'reviewed_at',
            'created_at', 'expires_at',
        ]

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.phone_number

    def get_status_display(self, obj):
        return obj.get_status_display()

    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by:
            return obj.reviewed_by.get_full_name() or obj.reviewed_by.phone_number
        return None

    def get_created_at_fa(self, obj):
        return obj.created_at.strftime('%Y/%m/%d %H:%M') if obj.created_at else None

    def get_expires_at_fa(self, obj):
        return obj.expires_at.strftime('%Y/%m/%d %H:%M') if obj.expires_at else None

    def get_submitted_at_fa(self, obj):
        return obj.submitted_at.strftime('%Y/%m/%d %H:%M') if obj.submitted_at else None

    def get_reviewed_at_fa(self, obj):
        return obj.reviewed_at.strftime('%Y/%m/%d %H:%M') if obj.reviewed_at else None

    def get_remaining_seconds(self, obj):
        return obj.get_remaining_seconds()

    def get_receipt_image_url(self, obj):
        if obj.receipt_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.receipt_image.url)
            return obj.receipt_image.url
        return None


class PaymentRequestUserSerializer(serializers.ModelSerializer):
    """سریالایزر درخواست پرداخت برای کاربر (بدون اطلاعات ادمین)"""
    plan_name = serializers.CharField(source='plan.plan_name', read_only=True)
    plan_type = serializers.CharField(source='plan.plan_type', read_only=True)
    status_display = serializers.SerializerMethodField()
    remaining_seconds = serializers.SerializerMethodField()
    created_at_fa = serializers.SerializerMethodField()
    expires_at_fa = serializers.SerializerMethodField()
    receipt_image_url = serializers.SerializerMethodField()

    class Meta:
        model = PaymentRequest
        fields = [
            'id', 'unique_code',
            'plan', 'plan_name', 'plan_type',
            'destination_card_number', 'destination_card_holder', 'destination_bank_name',
            'amount', 'original_amount', 'discount_amount',
            'tracking_number', 'payer_name', 'payer_card_last4', 'paid_at',
            'receipt_image', 'receipt_image_url', 'user_note',
            'status', 'status_display', 'reject_reason',
            'created_at', 'created_at_fa',
            'expires_at', 'expires_at_fa', 'remaining_seconds',
            'submitted_at',
        ]
        read_only_fields = [
            'id', 'unique_code', 'plan', 'amount', 'original_amount', 'discount_amount',
            'destination_card_number', 'destination_card_holder', 'destination_bank_name',
            'status', 'created_at', 'expires_at',
        ]

    def get_status_display(self, obj):
        return obj.get_status_display()

    def get_remaining_seconds(self, obj):
        return obj.get_remaining_seconds()

    def get_created_at_fa(self, obj):
        return obj.created_at.strftime('%Y/%m/%d %H:%M') if obj.created_at else None

    def get_expires_at_fa(self, obj):
        return obj.expires_at.strftime('%Y/%m/%d %H:%M') if obj.expires_at else None

    def get_receipt_image_url(self, obj):
        if obj.receipt_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.receipt_image.url)
            return obj.receipt_image.url
        return None


# ---------- Input Serializers ----------
class CreatePaymentRequestSerializer(serializers.Serializer):
    """سریالایزر ورودی برای ایجاد درخواست پرداخت"""
    plan_id = serializers.IntegerField(required=True)
    discount_code = serializers.CharField(required=False, allow_blank=True, max_length=50)
    payment_method = serializers.ChoiceField(
        choices=['card_to_card'],
        default='card_to_card',
        required=False
    )
    card_id = serializers.IntegerField(required=False, allow_null=True)  # فقط در حالت manual


class SubmitReceiptSerializer(serializers.Serializer):
    """سریالایزر ورودی برای ثبت فیش"""
    tracking_number = serializers.CharField(max_length=50, required=True)
    payer_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    payer_card_last4 = serializers.CharField(max_length=4, required=False, allow_blank=True)
    paid_at = serializers.DateTimeField(required=False, allow_null=True)
    user_note = serializers.CharField(required=False, allow_blank=True, max_length=1000)

    def validate_tracking_number(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError('شماره پیگیری الزامی است')
        return value.strip()

    def validate_payer_card_last4(self, value):
        if value and not value.isdigit():
            raise serializers.ValidationError('۴ رقم آخر کارت باید عدد باشد')
        if value and len(value) != 4:
            raise serializers.ValidationError('۴ رقم آخر کارت باید دقیقاً ۴ رقم باشد')
        return value


class ApprovePaymentRequestSerializer(serializers.Serializer):
    """سریالایزر تأیید پرداخت توسط ادمین"""
    note = serializers.CharField(required=False, allow_blank=True, max_length=500)


class RejectPaymentRequestSerializer(serializers.Serializer):
    """سریالایزر رد پرداخت توسط ادمین"""
    reason = serializers.CharField(max_length=500, required=True)

    def validate_reason(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError('دلیل رد الزامی است')
        return value.strip()