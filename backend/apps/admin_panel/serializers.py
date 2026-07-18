# serializers.py
from rest_framework import serializers
from django.utils import timezone
from django.db.models import Sum, Count, Q
from apps.accounts.models import User
from apps.subscriptions.models import SubscriptionPlan, UserSubscription, DiscountCode, Transaction
from apps.trading.models import Trade, TradeGroup
from apps.messaging.models import UserMessage, SystemMessage, SupportInfo
from .models import AdminActionLog


class AdminUserSerializer(serializers.ModelSerializer):
    """سریالایزر کاربر برای ادمین"""
    full_name = serializers.SerializerMethodField()
    subscription_status = serializers.SerializerMethodField()
    subscription_expiry = serializers.SerializerMethodField()
    total_trades = serializers.SerializerMethodField()
    total_profit = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'phone_number', 'first_name', 'last_name', 'full_name',
            'email', 'is_active', 'is_admin', 'is_verified',
            'created_at', 'last_login',
            'subscription_status', 'subscription_expiry',
            'total_trades', 'total_profit'
        ]

    def get_full_name(self, obj):
        return obj.get_full_name()

    def get_subscription_status(self, obj):
        return obj.has_active_subscription()

    def get_subscription_expiry(self, obj):
        expiry = obj.get_subscription_expiry()
        return expiry.isoformat() if expiry else None

    def get_total_trades(self, obj):
        return obj.trades.filter(is_deleted=False).count()

    def get_total_profit(self, obj):
        result = obj.trades.filter(is_deleted=False).aggregate(Sum('profit'))
        return float(result['profit__sum'] or 0)


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    """سریالایزر ویرایش کاربر توسط ادمین"""

    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'email', 'is_active',
            'is_admin', 'is_verified'
        ]


class AdminSubscriptionSerializer(serializers.ModelSerializer):
    """سریالایزر اشتراک برای ادمین"""
    user_phone = serializers.SerializerMethodField()
    user_name = serializers.SerializerMethodField()
    plan_name = serializers.SerializerMethodField()
    remaining_days = serializers.SerializerMethodField()

    class Meta:
        model = UserSubscription
        fields = [
            'id', 'user', 'user_phone', 'user_name',
            'plan', 'plan_name', 'start_date', 'end_date',
            'is_active', 'is_trial', 'trades_used', 'trades_limit',
            'remaining_days', 'payment_status', 'amount_paid',
            'created_at'
        ]

    def get_user_phone(self, obj):
        return obj.user.phone_number if obj.user else None

    def get_user_name(self, obj):
        return obj.user.get_full_name() if obj.user else None

    def get_plan_name(self, obj):
        return obj.plan.plan_name if obj.plan else None

    def get_remaining_days(self, obj):
        return obj.get_remaining_days()


class AdminPlanSerializer(serializers.ModelSerializer):
    """سریالایزر پلن برای ادمین"""
    active_subscriptions = serializers.SerializerMethodField()
    total_revenue = serializers.SerializerMethodField()

    class Meta:
        model = SubscriptionPlan
        fields = [
            'id', 'plan_name', 'plan_type', 'duration_days',
            'monthly_trades_limit', 'price', 'is_active',
            'description', 'active_subscriptions', 'total_revenue',
            'created_at'
        ]

    def get_active_subscriptions(self, obj):
        return obj.subscriptions.filter(is_active=True).count()

    def get_total_revenue(self, obj):
        result = obj.subscriptions.filter(
            payment_status='paid'
        ).aggregate(Sum('amount_paid'))
        return float(result['amount_paid__sum'] or 0)


class AdminDiscountSerializer(serializers.ModelSerializer):
    """سریالایزر کد تخفیف برای ادمین"""
    is_valid = serializers.SerializerMethodField()
    plan_name = serializers.SerializerMethodField()
    usage_percentage = serializers.SerializerMethodField()

    class Meta:
        model = DiscountCode
        fields = [
            'id', 'code', 'discount_percent', 'max_uses',
            'used_count', 'usage_percentage', 'plan', 'plan_name',
            'is_active', 'is_valid', 'expires_at', 'created_at'
        ]

    def get_is_valid(self, obj):
        return obj.is_valid()

    def get_plan_name(self, obj):
        return obj.plan.plan_name if obj.plan else 'همه پلن‌ها'

    def get_usage_percentage(self, obj):
        if obj.max_uses > 0:
            return round((obj.used_count / obj.max_uses) * 100, 2)
        return 0


class AdminDashboardSerializer(serializers.Serializer):
    """سریالایزر داشبورد ادمین"""
    total_users = serializers.IntegerField()
    active_users = serializers.IntegerField()
    new_users_today = serializers.IntegerField()
    total_subscriptions = serializers.IntegerField()
    active_subscriptions = serializers.IntegerField()
    total_trades = serializers.IntegerField()
    trades_today = serializers.IntegerField()
    total_revenue = serializers.FloatField()
    revenue_today = serializers.FloatField()
    pending_messages = serializers.IntegerField()
    expiring_subscriptions = serializers.IntegerField()


class AdminSalesReportSerializer(serializers.Serializer):
    """سریالایزر گزارش فروش"""
    period = serializers.CharField()
    total_sales = serializers.IntegerField()
    total_revenue = serializers.FloatField()
    average_price = serializers.FloatField()
    plan_breakdown = serializers.ListField()
    daily_data = serializers.ListField()


class AdminActionLogSerializer(serializers.ModelSerializer):
    """سریالایزر لاگ اقدامات ادمین"""
    admin_phone = serializers.SerializerMethodField()
    admin_name = serializers.SerializerMethodField()
    action_display = serializers.SerializerMethodField()

    class Meta:
        model = AdminActionLog
        fields = [
            'id', 'admin', 'admin_phone', 'admin_name',
            'action_type', 'action_display', 'target_model',
            'target_id', 'description', 'ip_address', 'created_at'
        ]

    def get_admin_phone(self, obj):
        return obj.admin.phone_number if obj.admin else None

    def get_admin_name(self, obj):
        return obj.admin.get_full_name() if obj.admin else None

    def get_action_display(self, obj):
        return dict(AdminActionLog.ACTION_TYPES).get(obj.action_type, obj.action_type)