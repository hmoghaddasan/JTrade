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