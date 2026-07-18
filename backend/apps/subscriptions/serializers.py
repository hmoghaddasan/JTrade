# serializers.py
from rest_framework import serializers
from django.utils import timezone
from .models import SubscriptionPlan, UserSubscription, DiscountCode, Transaction, SMSLog


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    """سریالایزر پلن اشتراک"""
    price_display = serializers.SerializerMethodField()
    duration_display = serializers.SerializerMethodField()

    class Meta:
        model = SubscriptionPlan
        fields = [
            'id', 'plan_name', 'plan_type', 'duration_days',
            'monthly_trades_limit', 'price', 'price_display',
            'duration_display', 'is_active', 'description'
        ]

    def get_price_display(self, obj):
        return f"{obj.price:,.0f} تومان"

    def get_duration_display(self, obj):
        if obj.duration_days >= 30:
            months = obj.duration_days // 30
            return f"{months} ماهه"
        return f"{obj.duration_days} روزه"


class DiscountCodeSerializer(serializers.ModelSerializer):
    """سریالایزر کد تخفیف"""
    is_valid = serializers.SerializerMethodField()

    class Meta:
        model = DiscountCode
        fields = [
            'id', 'code', 'discount_percent', 'max_uses',
            'used_count', 'plan', 'is_active', 'expires_at',
            'is_valid', 'created_at'
        ]

    def get_is_valid(self, obj):
        return obj.is_valid()


class UserSubscriptionSerializer(serializers.ModelSerializer):
    """سریالایزر اشتراک کاربر"""
    plan_name = serializers.SerializerMethodField()
    plan_type = serializers.SerializerMethodField()
    remaining_days = serializers.SerializerMethodField()
    remaining_trades = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()
    discount_percent = serializers.SerializerMethodField()

    class Meta:
        model = UserSubscription
        fields = [
            'id', 'user', 'plan', 'plan_name', 'plan_type',
            'start_date', 'end_date', 'is_active', 'is_trial',
            'trades_used', 'trades_limit', 'remaining_trades',
            'remaining_days', 'is_expired', 'payment_status',
            'amount_paid', 'discount_percent', 'created_at'
        ]

    def get_plan_name(self, obj):
        return obj.plan.plan_name if obj.plan else None

    def get_plan_type(self, obj):
        return obj.plan.plan_type if obj.plan else None

    def get_remaining_days(self, obj):
        return obj.get_remaining_days()

    def get_remaining_trades(self, obj):
        return obj.get_remaining_trades()

    def get_is_expired(self, obj):
        return obj.end_date < timezone.now() if obj.end_date else True

    def get_discount_percent(self, obj):
        if obj.discount_code:
            return obj.discount_code.discount_percent
        return 0


class PurchaseSubscriptionSerializer(serializers.Serializer):
    """سریالایزر خرید اشتراک"""
    plan_id = serializers.IntegerField()
    discount_code = serializers.CharField(max_length=50, required=False, allow_blank=True)


class VerifyPaymentSerializer(serializers.Serializer):
    """سریالایزر تایید پرداخت"""
    authority = serializers.CharField(max_length=100)
    status = serializers.CharField(max_length=10)


class ValidateDiscountSerializer(serializers.Serializer):
    """سریالایزر اعتبارسنجی کد تخفیف"""
    code = serializers.CharField(max_length=50)
    plan_id = serializers.IntegerField(required=False)


class ExtendSubscriptionSerializer(serializers.Serializer):
    """سریالایزر تمدید اشتراک"""
    plan_id = serializers.IntegerField(required=False)
    discount_code = serializers.CharField(max_length=50, required=False, allow_blank=True)


class TransactionSerializer(serializers.ModelSerializer):
    """سریالایزر تراکنش"""
    user_phone = serializers.SerializerMethodField()
    plan_name = serializers.SerializerMethodField()

    class Meta:
        model = Transaction
        fields = [
            'id', 'user', 'user_phone', 'subscription', 'plan_name',
            'amount', 'vat_amount', 'total_amount', 'payment_method',
            'payment_status', 'payment_reference', 'description',
            'created_at'
        ]

    def get_user_phone(self, obj):
        return obj.user.phone_number if obj.user else None

    def get_plan_name(self, obj):
        if obj.subscription and obj.subscription.plan:
            return obj.subscription.plan.plan_name
        return None


class SMSLogSerializer(serializers.ModelSerializer):
    """سریالایزر لاگ پیامک"""

    class Meta:
        model = SMSLog
        fields = ['id', 'phone_number', 'message', 'status', 'response', 'created_at']


class CreateTrialSubscriptionSerializer(serializers.Serializer):
    """سریالایزر ایجاد اشتراک آزمایشی"""
    user_id = serializers.IntegerField()
    plan_id = serializers.IntegerField()
    is_trial = serializers.BooleanField(default=True)

    def create(self, validated_data):
        user = validated_data.get('user_id')
        plan = validated_data.get('plan_id')
        is_trial = validated_data.get('is_trial', True)

        # دریافت کاربر و پلن
        from django.contrib.auth import get_user_model
        User = get_user_model()

        try:
            user_obj = User.objects.get(id=user)
            plan_obj = SubscriptionPlan.objects.get(id=plan)
        except (User.DoesNotExist, SubscriptionPlan.DoesNotExist):
            raise serializers.ValidationError('کاربر یا پلن یافت نشد')

        # ایجاد اشتراک
        subscription = UserSubscription.objects.create(
            user=user_obj,
            plan=plan_obj,
            start_date=timezone.now(),
            end_date=timezone.now() + timezone.timedelta(days=plan_obj.duration_days),
            is_active=True,
            trades_used=0,
            trades_limit=plan_obj.monthly_trades_limit,
            is_trial=is_trial,
            payment_status='paid',
            amount_paid=0
        )

        return subscription