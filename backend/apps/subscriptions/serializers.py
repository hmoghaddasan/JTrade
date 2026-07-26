# backend/apps/subscriptions/serializers.py

from rest_framework import serializers
from .models import SubscriptionPlan, UserSubscription, DiscountCode


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = ['id', 'plan_name', 'plan_type', 'duration_days',
                  'monthly_trades_limit', 'price', 'is_active', 'description']


class DiscountCodeSerializer(serializers.ModelSerializer):
    is_valid = serializers.BooleanField(read_only=True)

    class Meta:
        model = DiscountCode
        fields = ['id', 'code', 'discount_percent', 'max_uses', 'used_count',
                  'is_active', 'expires_at', 'is_valid']


class UserSubscriptionSerializer(serializers.ModelSerializer):
    plan_name = serializers.CharField(source='plan.plan_name', read_only=True)
    plan_type = serializers.CharField(source='plan.plan_type', read_only=True)
    remaining_days = serializers.SerializerMethodField()
    remaining_trades = serializers.SerializerMethodField()
    can_trade = serializers.SerializerMethodField()

    class Meta:
        model = UserSubscription
        fields = ['id', 'plan_name', 'plan_type', 'start_date', 'end_date',
                  'is_active', 'trades_used', 'trades_limit', 'is_trial',
                  'payment_status', 'amount_paid', 'remaining_days',
                  'remaining_trades', 'can_trade']

    def get_remaining_days(self, obj):
        return obj.get_remaining_days()

    def get_remaining_trades(self, obj):
        return obj.get_remaining_trades()

    def get_can_trade(self, obj):
        return obj.can_trade()