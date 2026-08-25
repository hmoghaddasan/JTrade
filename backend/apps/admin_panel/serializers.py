# backend/apps/admin_panel/serializers.py

# backend/apps/admin_panel/serializers.py

from rest_framework import serializers
from django.utils import timezone
from django.db.models import Sum, Count, Q
from django.contrib.auth import get_user_model
from apps.accounts.models import SystemSetting, AppVersion
from apps.subscriptions.models import SubscriptionPlan, UserSubscription, DiscountCode, Transaction, DiscountCodeUsage
from apps.trading.models import Trade, TradeGroup, CurrencyPair, AIConsultation, AIPromptVersion, Portfolio  # ✅ Portfolio اضافه شد
from apps.messaging.models import UserMessage, SystemMessage, SupportInfo
from .models import AdminActionLog
from apps.trading.models import Trade, TradeGroup, CurrencyPair, AIConsultation, AIPromptVersion, Portfolio, Broker


User = get_user_model()

# ================================
# ۱. مدیریت کاربران
# ================================
class AdminUserSerializer(serializers.ModelSerializer):
    """سریالایزر کامل کاربر برای ادمین"""
    full_name = serializers.SerializerMethodField()
    subscription_status = serializers.SerializerMethodField()
    subscription_expiry = serializers.SerializerMethodField()
    subscription_plan = serializers.SerializerMethodField()
    remaining_days = serializers.SerializerMethodField()
    remaining_trades = serializers.SerializerMethodField()
    remaining_ai = serializers.SerializerMethodField()
    total_trades = serializers.SerializerMethodField()
    total_profit = serializers.SerializerMethodField()
    total_consultations = serializers.SerializerMethodField()
    created_at_fa = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'phone_number', 'first_name', 'last_name', 'full_name',
            'email', 'is_active', 'is_admin', 'is_verified',
            'created_at', 'created_at_fa', 'last_login',
            'subscription_status', 'subscription_expiry', 'subscription_plan',
            'remaining_days', 'remaining_trades', 'remaining_ai',
            'total_trades', 'total_profit', 'total_consultations'
        ]

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.phone_number

    def get_subscription_status(self, obj):
        try:
            sub = obj.user_subscriptions.filter(is_active=True).first()
            if sub and sub.end_date:
                return sub.end_date > timezone.now()
            return False
        except:
            return False

    def get_subscription_expiry(self, obj):
        try:
            sub = obj.user_subscriptions.filter(is_active=True).first()
            if sub and sub.end_date:
                return sub.end_date.isoformat()
            return None
        except:
            return None

    def get_subscription_plan(self, obj):
        try:
            sub = obj.user_subscriptions.filter(is_active=True).first()
            if sub and sub.plan:
                return sub.plan.plan_name
            return None
        except:
            return None

    def get_remaining_days(self, obj):
        try:
            sub = obj.user_subscriptions.filter(is_active=True).first()
            if sub and sub.end_date:
                remaining = (sub.end_date - timezone.now()).days
                return max(0, remaining)
            return 0
        except:
            return 0

    def get_remaining_trades(self, obj):
        try:
            sub = obj.user_subscriptions.filter(is_active=True).first()
            if sub:
                return max(0, sub.trades_limit - sub.trades_used)
            return 0
        except:
            return 0

    def get_remaining_ai(self, obj):
        try:
            sub = obj.user_subscriptions.filter(is_active=True).first()
            if sub:
                return max(0, sub.ai_consultations_limit - sub.ai_consultations_used)
            return 0
        except:
            return 0

    def get_total_trades(self, obj):
        try:
            return obj.trades.filter(is_deleted=False).count()
        except:
            return 0

    def get_total_profit(self, obj):
        try:
            result = obj.trades.filter(is_deleted=False).aggregate(Sum('profit'))
            return float(result['profit__sum'] or 0)
        except:
            return 0.0

    def get_total_consultations(self, obj):
        try:
            return obj.ai_consultations.count()
        except:
            return 0

    def get_created_at_fa(self, obj):
        try:
            return obj.created_at.strftime('%Y/%m/%d %H:%M') if obj.created_at else None
        except:
            return None


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    """سریالایزر ویرایش کاربر توسط ادمین"""
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'is_active', 'is_admin', 'is_verified']


class AdminUserDetailSerializer(AdminUserSerializer):
    """جزئیات کامل کاربر با اطلاعات بیشتر"""
    subscriptions = serializers.SerializerMethodField()
    recent_trades = serializers.SerializerMethodField()
    recent_consultations = serializers.SerializerMethodField()
    messages = serializers.SerializerMethodField()

    class Meta(AdminUserSerializer.Meta):
        fields = AdminUserSerializer.Meta.fields + [
            'subscriptions', 'recent_trades', 'recent_consultations', 'messages'
        ]

    def get_subscriptions(self, obj):
        from apps.subscriptions.serializers import UserSubscriptionSerializer
        subs = obj.user_subscriptions.all().order_by('-created_at')[:5]
        return UserSubscriptionSerializer(subs, many=True).data

    def get_recent_trades(self, obj):
        from apps.trading.serializers import TradeListSerializer
        trades = obj.trades.filter(is_deleted=False).order_by('-created_at')[:10]
        return TradeListSerializer(trades, many=True).data

    def get_recent_consultations(self, obj):
        from apps.trading.serializers import AIConsultationSerializer
        cons = obj.ai_consultations.all().order_by('-created_at')[:10]
        return AIConsultationSerializer(cons, many=True).data

    def get_messages(self, obj):
        from apps.messaging.serializers import UserMessageSerializer
        msgs = obj.messages.all().order_by('-created_at')[:10]
        return UserMessageSerializer(msgs, many=True).data


# ================================
# ۲. مدیریت اشتراک‌ها
# ================================
class AdminSubscriptionSerializer(serializers.ModelSerializer):
    """سریالایزر اشتراک برای ادمین"""
    user_phone = serializers.SerializerMethodField()
    user_name = serializers.SerializerMethodField()
    plan_name = serializers.SerializerMethodField()
    plan_type = serializers.SerializerMethodField()
    remaining_days = serializers.SerializerMethodField()
    remaining_trades = serializers.SerializerMethodField()
    remaining_ai = serializers.SerializerMethodField()
    created_at_fa = serializers.SerializerMethodField()
    end_date_fa = serializers.SerializerMethodField()

    class Meta:
        model = UserSubscription
        fields = [
            'id', 'user', 'user_phone', 'user_name',
            'plan', 'plan_name', 'plan_type',
            'start_date', 'end_date', 'end_date_fa',
            'is_active', 'is_trial',
            'trades_used', 'trades_limit', 'remaining_trades',
            'ai_consultations_used', 'ai_consultations_limit', 'remaining_ai',
            'remaining_days', 'payment_status', 'amount_paid',
            'created_at', 'created_at_fa'
        ]

    def get_user_phone(self, obj):
        return obj.user.phone_number if obj.user else None

    def get_user_name(self, obj):
        return obj.user.get_full_name() if obj.user else None

    def get_plan_name(self, obj):
        return obj.plan.plan_name if obj.plan else None

    def get_plan_type(self, obj):
        return obj.plan.plan_type if obj.plan else None

    def get_remaining_days(self, obj):
        return obj.get_remaining_days()

    def get_remaining_trades(self, obj):
        return obj.get_remaining_trades()

    def get_remaining_ai(self, obj):
        return obj.get_remaining_ai_consultations()

    def get_created_at_fa(self, obj):
        return obj.created_at.strftime('%Y/%m/%d %H:%M') if obj.created_at else None

    def get_end_date_fa(self, obj):
        return obj.end_date.strftime('%Y/%m/%d') if obj.end_date else None


class AdminSubscriptionExtendSerializer(serializers.Serializer):
    """سریالایزر تمدید اشتراک"""
    additional_days = serializers.IntegerField(min_value=1, max_value=365, required=True)
    reason = serializers.CharField(max_length=200, required=False, allow_blank=True)


class AdminSubscriptionGiftSerializer(serializers.Serializer):
    """سریالایزر هدیه گروهی"""
    days = serializers.IntegerField(min_value=1, max_value=365, required=True)
    user_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text="لیست آیدی کاربران - در صورت خالی بودن، به همه کاربران فعال داده می‌شود"
    )
    only_active = serializers.BooleanField(default=True, help_text="فقط به کاربران با اشتراک فعال")
    reason = serializers.CharField(max_length=200, required=False, allow_blank=True)


# ================================
# ۳. مدیریت مالی
# ================================
class AdminTransactionSerializer(serializers.ModelSerializer):
    """سریالایزر تراکنش برای ادمین"""
    user_phone = serializers.SerializerMethodField()
    user_name = serializers.SerializerMethodField()
    plan_name = serializers.SerializerMethodField()
    created_at_fa = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()

    class Meta:
        model = Transaction
        fields = [
            'id', 'user', 'user_phone', 'user_name',
            'subscription', 'plan_name',
            'amount', 'vat_amount', 'total_amount',
            'payment_method', 'payment_status', 'status_display',
            'payment_reference', 'description',
            'created_at', 'created_at_fa'
        ]

    def get_user_phone(self, obj):
        return obj.user.phone_number if obj.user else None

    def get_user_name(self, obj):
        return obj.user.get_full_name() if obj.user else None

    def get_plan_name(self, obj):
        if obj.subscription and obj.subscription.plan:
            return obj.subscription.plan.plan_name
        return None

    def get_created_at_fa(self, obj):
        return obj.created_at.strftime('%Y/%m/%d %H:%M') if obj.created_at else None

    def get_status_display(self, obj):
        status_map = {
            'pending': 'در انتظار',
            'paid': 'پرداخت شده',
            'failed': 'خطا',
            'refunded': 'بازگشت داده شده',
            'canceled': 'لغو شده',
        }
        return status_map.get(obj.payment_status, obj.payment_status)


class AdminSalesReportSerializer(serializers.Serializer):
    """سریالایزر گزارش فروش"""
    period = serializers.CharField()
    total_sales = serializers.IntegerField()
    total_revenue = serializers.FloatField()
    average_price = serializers.FloatField()
    plan_breakdown = serializers.ListField()
    daily_data = serializers.ListField()
    monthly_data = serializers.ListField()


# ================================
# ۴. مدیریت کدهای تخفیف
# ================================
class AdminDiscountSerializer(serializers.ModelSerializer):
    """سریالایزر کد تخفیف برای ادمین"""
    is_valid = serializers.SerializerMethodField()
    plan_name = serializers.SerializerMethodField()
    usage_percentage = serializers.SerializerMethodField()
    created_at_fa = serializers.SerializerMethodField()
    expires_at_fa = serializers.SerializerMethodField()
    used_by = serializers.SerializerMethodField()

    class Meta:
        model = DiscountCode
        fields = [
            'id', 'code', 'description', 'discount_percent', 'max_uses',
            'used_count', 'usage_percentage', 'plan', 'plan_name',
            'is_active', 'is_valid', 'expires_at', 'expires_at_fa',
            'created_at', 'created_at_fa', 'used_by'
        ]

    def get_is_valid(self, obj):
        return obj.is_valid()

    def get_plan_name(self, obj):
        return obj.plan.plan_name if obj.plan else 'همه پلن‌ها'

    def get_usage_percentage(self, obj):
        if obj.max_uses > 0:
            return round((obj.used_count / obj.max_uses) * 100, 2)
        return 0

    def get_created_at_fa(self, obj):
        return obj.created_at.strftime('%Y/%m/%d %H:%M') if obj.created_at else None

    def get_expires_at_fa(self, obj):
        return obj.expires_at.strftime('%Y/%m/%d') if obj.expires_at else 'نامحدود'

    def get_used_by(self, obj):
        try:
            usages = DiscountCodeUsage.objects.filter(discount_code=obj).select_related('user')
            return [{
                'user_id': u.user_id,
                'phone': u.user.phone_number,
                'user_name': u.user.get_full_name(),
                'used_at': u.used_at.strftime('%Y/%m/%d %H:%M'),
                'discount_amount': float(u.discount_amount),
                'final_amount': float(u.final_amount)
            } for u in usages[:20]]
        except:
            return []


# ================================
# ۵. مدیریت نمادها (جفت ارزها)
# ================================
class AdminCurrencyPairSerializer(serializers.ModelSerializer):
    """سریالایزر جفت ارز برای ادمین"""
    pair_type_display = serializers.SerializerMethodField()
    created_at_fa = serializers.SerializerMethodField()

    class Meta:
        model = CurrencyPair
        fields = [
            'id', 'symbol', 'base_currency', 'quote_currency',
            'pair_type', 'pair_type_display', 'description',
            'is_active', 'created_at', 'created_at_fa'
        ]

    def get_pair_type_display(self, obj):
        return dict(CurrencyPair.PAIR_TYPES).get(obj.pair_type, obj.pair_type)

    def get_created_at_fa(self, obj):
        return obj.created_at.strftime('%Y/%m/%d %H:%M') if obj.created_at else None


# ================================
# ۶. مدیریت مشاوره‌های AI
# ================================
class AdminAIConsultationSerializer(serializers.ModelSerializer):
    """سریالایزر مشاوره AI برای ادمین"""
    user_phone = serializers.SerializerMethodField()
    user_name = serializers.SerializerMethodField()
    direction_display = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    emotion_display = serializers.SerializerMethodField()
    market_condition_display = serializers.SerializerMethodField()
    created_at_fa = serializers.SerializerMethodField()
    feedback_score_display = serializers.SerializerMethodField()

    class Meta:
        model = AIConsultation
        fields = [
            'id', 'user', 'user_phone', 'user_name',
            'symbol', 'direction', 'direction_display',
            'entry_price', 'stop_loss', 'take_profit',
            'market_condition', 'market_condition_display',
            'emotion', 'emotion_display',
            'time_ny', 'user_question',
            'session_type', 'strategy_type', 'timeframes',
            'risk_percent', 'volume',
            'status', 'status_display',
            'ai_score', 'ai_response',
            'model_used',
            'is_followed', 'trade_result',
            'feedback_score', 'feedback_score_display',
            'feedback_helpfulness', 'feedback_comment',
            'created_at', 'created_at_fa',
            'live_price', 'price_warning', 'price_diff_percent'
        ]

    def get_user_phone(self, obj):
        return obj.user.phone_number if obj.user else None

    def get_user_name(self, obj):
        return obj.user.get_full_name() if obj.user else None

    def get_direction_display(self, obj):
        return dict(AIConsultation.DIRECTION_CHOICES).get(obj.direction, obj.direction)

    def get_status_display(self, obj):
        return dict(AIConsultation.STATUS_CHOICES).get(obj.status, obj.status)

    def get_emotion_display(self, obj):
        return dict(AIConsultation.EMOTION_CHOICES).get(obj.emotion, obj.emotion)

    def get_market_condition_display(self, obj):
        return dict(AIConsultation.MARKET_CONDITION_CHOICES).get(obj.market_condition, obj.market_condition)

    def get_feedback_score_display(self, obj):
        if obj.feedback_score:
            return f"{'⭐' * obj.feedback_score}"
        return None

    def get_created_at_fa(self, obj):
        return obj.created_at.strftime('%Y/%m/%d %H:%M') if obj.created_at else None


class AdminAIAnalyticsSerializer(serializers.Serializer):
    """سریالایزر تحلیل عملکرد AI"""
    model_name = serializers.CharField()
    total_consultations = serializers.IntegerField()
    avg_score = serializers.FloatField()
    avg_feedback = serializers.FloatField()
    success_rate = serializers.FloatField()
    most_common_symbol = serializers.CharField()
    usage_percentage = serializers.FloatField()


# ================================
# ۷. مدیریت نسخه نرم‌افزار
# ================================
class AdminAppVersionSerializer(serializers.ModelSerializer):
    """سریالایزر نسخه نرم‌افزار برای ادمین"""
    created_at_fa = serializers.SerializerMethodField()
    release_date_fa = serializers.SerializerMethodField()
    is_current_display = serializers.SerializerMethodField()

    class Meta:
        model = AppVersion
        fields = [
            'id', 'version_number', 'release_date', 'release_date_fa',
            'release_notes', 'is_current', 'is_current_display',
            'created_at', 'created_at_fa'
        ]

    def get_created_at_fa(self, obj):
        return obj.created_at.strftime('%Y/%m/%d %H:%M') if obj.created_at else None

    def get_release_date_fa(self, obj):
        return obj.release_date.strftime('%Y/%m/%d %H:%M') if obj.release_date else None

    def get_is_current_display(self, obj):
        return '✅ نسخه فعلی' if obj.is_current else ''


# ================================
# ۸. مدیریت تنظیمات سیستم
# ================================
class AdminSystemSettingSerializer(serializers.ModelSerializer):
    """سریالایزر تنظیمات سیستم برای ادمین"""
    category = serializers.SerializerMethodField()
    type_display = serializers.SerializerMethodField()
    is_sensitive = serializers.SerializerMethodField()

    class Meta:
        model = SystemSetting
        fields = [
            'id', 'setting_key', 'setting_value',
            'setting_type', 'type_display', 'description',
            'is_editable', 'is_sensitive', 'category',
            'created_at', 'updated_at'
        ]

    def get_category(self, obj):
        categories = {
            'app_name': 'عمومی',
            'app_version': 'عمومی',
            'default_font': 'عمومی',
            'primary_color': 'عمومی',
            'secondary_color': 'عمومی',
            'site_email': 'سایت',
            'site_phone': 'سایت',
            'site_address': 'سایت',
            'footer_text': 'سایت',
            'logo_path': 'ظاهر',
            'favicon_path': 'ظاهر',
            'bg_image_path': 'ظاهر',
            'max_trades_per_day': 'ترید',
            'min_trade_interval': 'ترید',
            'trial_days': 'ترید',
            'trial_trades_limit': 'ترید',
            'trial_ai_consultations_limit': 'ترید',
            'ai_model': 'هوش مصنوعی',
            'ai_temperature': 'هوش مصنوعی',
            'ai_timeout': 'هوش مصنوعی',
            'ollama_url': 'هوش مصنوعی',
            'ollama_available_models': 'هوش مصنوعی',
            'max_image_width': 'تصاویر',
            'max_image_height': 'تصاویر',
            'image_quality': 'تصاویر',
            'max_image_size_mb': 'تصاویر',
            'show_screenshot_upload': 'تصاویر',
            'sms_enabled': 'پیامک',
            'sms_api_key': 'پیامک',
            'sms_sender_number': 'پیامک',
            'sms_otp_template': 'پیامک',
            'zarinpal_merchant_id': 'پرداخت',
            'zarinpal_sandbox': 'پرداخت',
            'zarinpal_callback_url': 'پرداخت',
            'enable_payment': 'پرداخت',
            'live_price_provider': 'قیمت لحظه‌ای',
            'twelvedata_api_key': 'قیمت لحظه‌ای',
            'twelvedata_base_url': 'قیمت لحظه‌ای',
            'finnhub_api_key': 'قیمت لحظه‌ای',
            'finnhub_base_url': 'قیمت لحظه‌ای',
            'alphavantage_api_key': 'قیمت لحظه‌ای',
            'secret_key': 'امنیت',
            'debug': 'امنیت',
            'allowed_hosts': 'امنیت',
            'db_name': 'دیتابیس',
            'db_user': 'دیتابیس',
            'db_password': 'دیتابیس',
            'db_host': 'دیتابیس',
            'db_port': 'دیتابیس',
            'cors_allowed_origins': 'CORS',
            'admin_phone_number': 'ادمین',
        }
        return categories.get(obj.setting_key, 'متفرقه')

    def get_type_display(self, obj):
        type_map = {
            'string': 'رشته',
            'integer': 'عدد صحیح',
            'boolean': 'بولی',
            'text': 'متن طولانی',
            'float': 'عدد اعشاری',
            'json': 'JSON',
        }
        return type_map.get(obj.setting_type, obj.setting_type)

    def get_is_sensitive(self, obj):
        sensitive_keys = [
            'secret_key', 'db_password', 'sms_api_key',
            'twelvedata_api_key', 'finnhub_api_key', 'alphavantage_api_key',
            'zarinpal_merchant_id'
        ]
        return obj.setting_key in sensitive_keys


# ================================
# ۹. مدیریت پیام‌های کاربران
# ================================
class AdminUserMessageSerializer(serializers.ModelSerializer):
    """سریالایزر پیام کاربر برای ادمین"""
    user_phone = serializers.SerializerMethodField()
    user_name = serializers.SerializerMethodField()
    replied_by_phone = serializers.SerializerMethodField()
    created_at_fa = serializers.SerializerMethodField()
    reply_date_fa = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()

    class Meta:
        model = UserMessage
        fields = [
            'id', 'user', 'user_phone', 'user_name',
            'subject', 'message',
            'is_read', 'is_replied', 'has_new_reply',
            'reply_message', 'reply_date', 'reply_date_fa',
            'replied_by', 'replied_by_phone',
            'created_at', 'created_at_fa',
            'status_display'
        ]

    def get_user_phone(self, obj):
        return obj.user.phone_number if obj.user else None

    def get_user_name(self, obj):
        return obj.user.get_full_name() if obj.user else None

    def get_replied_by_phone(self, obj):
        return obj.replied_by.phone_number if obj.replied_by else None

    def get_created_at_fa(self, obj):
        return obj.created_at.strftime('%Y/%m/%d %H:%M') if obj.created_at else None

    def get_reply_date_fa(self, obj):
        return obj.reply_date.strftime('%Y/%m/%d %H:%M') if obj.reply_date else None

    def get_status_display(self, obj):
        if obj.is_replied:
            return '✅ پاسخ داده شده'
        elif obj.is_read:
            return '📖 خوانده شده'
        return '🆕 جدید'


class AdminMessageReplySerializer(serializers.Serializer):
    """سریالایزر پاسخ به پیام"""
    reply_message = serializers.CharField(max_length=5000, required=True)
    send_sms = serializers.BooleanField(default=True, help_text="آیا پیامک نیز ارسال شود؟")


# ================================
# ۱۰. مدیریت تریدها (ادمین)
# ================================
class AdminTradeSerializer(serializers.ModelSerializer):
    """سریالایزر ترید برای ادمین"""
    user_phone = serializers.SerializerMethodField()
    user_name = serializers.SerializerMethodField()
    group_name = serializers.SerializerMethodField()
    trade_type_display = serializers.SerializerMethodField()
    created_at_fa = serializers.SerializerMethodField()
    profit_display = serializers.SerializerMethodField()

    class Meta:
        model = Trade
        fields = [
            'id', 'user', 'user_phone', 'user_name',
            'group', 'group_name',
            'trade_date', 'day_of_week', 'time_ny',
            'symbol', 'trade_type', 'trade_type_display',
            'session_type', 'strategy_type',
            'entry_price', 'stop_loss', 'take_profit_1', 'take_profit_2',
            'risk_usd', 'risk_percent', 'risk_reward_ratio',
            'close_price', 'tp_sl_hit', 'profit', 'profit_display',
            'execution_quality_score',
            'created_at', 'created_at_fa'
        ]

    def get_user_phone(self, obj):
        return obj.user.phone_number if obj.user else None

    def get_user_name(self, obj):
        return obj.user.get_full_name() if obj.user else None

    def get_group_name(self, obj):
        return obj.group.group_name if obj.group else None

    def get_trade_type_display(self, obj):
        return dict(Trade.TRADE_TYPES).get(obj.trade_type, obj.trade_type)

    def get_created_at_fa(self, obj):
        return obj.created_at.strftime('%Y/%m/%d %H:%M') if obj.created_at else None

    def get_profit_display(self, obj):
        if obj.profit is None:
            return '—'
        color = 'green' if obj.profit > 0 else 'red' if obj.profit < 0 else 'gray'
        return {'value': float(obj.profit), 'color': color}


# ================================
# ۱۱. لاگ اقدامات ادمین
# ================================
class AdminActionLogSerializer(serializers.ModelSerializer):
    """سریالایزر لاگ اقدامات ادمین"""
    admin_phone = serializers.SerializerMethodField()
    admin_name = serializers.SerializerMethodField()
    action_display = serializers.SerializerMethodField()
    created_at_fa = serializers.SerializerMethodField()

    class Meta:
        model = AdminActionLog
        fields = [
            'id', 'admin', 'admin_phone', 'admin_name',
            'action_type', 'action_display',
            'target_model', 'target_id', 'description',
            'ip_address', 'created_at', 'created_at_fa'
        ]

    def get_admin_phone(self, obj):
        return obj.admin.phone_number if obj.admin else None

    def get_admin_name(self, obj):
        return obj.admin.get_full_name() if obj.admin else None

    def get_action_display(self, obj):
        return dict(AdminActionLog.ACTION_TYPES).get(obj.action_type, obj.action_type)

    def get_created_at_fa(self, obj):
        return obj.created_at.strftime('%Y/%m/%d %H:%M') if obj.created_at else None


# ================================
# ۱۲. مدیریت پلن‌های اشتراک - جدید
# ================================
# ================================
# ۱۲. مدیریت پلن‌های اشتراک - جدید
# ================================
# ================================
# ۱۲. مدیریت پلن‌های اشتراک - جدید
# ================================
# ================================
# ۱۲. مدیریت پلن‌های اشتراک - جدید
# ================================
class AdminSubscriptionPlanSerializer(serializers.ModelSerializer):
    """سریالایزر پلن اشتراک برای ادمین"""
    plan_type_display = serializers.SerializerMethodField()
    price_display = serializers.SerializerMethodField()
    created_at_fa = serializers.SerializerMethodField()
    updated_at_fa = serializers.SerializerMethodField()
    total_subscribers = serializers.SerializerMethodField()
    active_subscribers = serializers.SerializerMethodField()
    total_revenue = serializers.SerializerMethodField()

    class Meta:
        model = SubscriptionPlan
        fields = [
            'id', 'plan_name', 'plan_type', 'plan_type_display',
            'duration_days', 'monthly_trades_limit', 'monthly_ai_consultations_limit',
            'price', 'price_display', 'is_active', 'description',
            'total_subscribers', 'active_subscribers', 'total_revenue',
            'created_at', 'created_at_fa', 'updated_at', 'updated_at_fa'
        ]

    def get_plan_type_display(self, obj):
        type_map = {
            'basic': 'پایه',
            'professional': 'حرفه‌ای',
            'vip': 'VIP',
        }
        return type_map.get(obj.plan_type, obj.plan_type)

    def get_price_display(self, obj):
        return f"{int(obj.price):,} تومان" if obj.price else "رایگان"

    def get_created_at_fa(self, obj):
        return obj.created_at.strftime('%Y/%m/%d %H:%M') if obj.created_at else None

    def get_updated_at_fa(self, obj):
        return obj.updated_at.strftime('%Y/%m/%d %H:%M') if obj.updated_at else None

    def get_total_subscribers(self, obj):
        # ✅ استفاده از related_name صحیح: subscriptions
        return obj.subscriptions.count()

    def get_active_subscribers(self, obj):
        return obj.subscriptions.filter(
            is_active=True,
            end_date__gt=timezone.now()
        ).count()

    def get_total_revenue(self, obj):
        result = obj.subscriptions.filter(
            payment_status='paid'
        ).aggregate(Sum('amount_paid'))
        return float(result['amount_paid__sum'] or 0)

# ================================
# مدیریت پورتفولیوها (ادمین)
# ================================
class AdminPortfolioSerializer(serializers.ModelSerializer):
    user_phone = serializers.CharField(source='user.phone_number', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    total_trades = serializers.SerializerMethodField()
    total_profit = serializers.SerializerMethodField()
    current_balance = serializers.SerializerMethodField()
    created_at_fa = serializers.SerializerMethodField()

    class Meta:
        model = Portfolio
        fields = [
            'id', 'user', 'user_phone', 'user_name',
            'name', 'description', 'icon', 'initial_balance',
            'is_active', 'is_default',
            'total_trades', 'total_profit', 'current_balance',
            'created_at', 'created_at_fa', 'updated_at'
        ]

    def get_total_trades(self, obj):
        return obj.get_total_trades()

    def get_total_profit(self, obj):
        return float(obj.get_total_profit())

    def get_current_balance(self, obj):
        return float(obj.get_current_balance())

    def get_created_at_fa(self, obj):
        return obj.created_at.strftime('%Y/%m/%d %H:%M') if obj.created_at else None

# ================================
# مدیریت بروکرها (کارگزاران) - جدید
# ================================
class AdminBrokerSerializer(serializers.ModelSerializer):
    """سریالایزر بروکر برای ادمین"""
    category_display = serializers.SerializerMethodField()
    trades_count = serializers.SerializerMethodField()
    created_at_fa = serializers.SerializerMethodField()
    updated_at_fa = serializers.SerializerMethodField()

    class Meta:
        model = Broker
        fields = [
            'id', 'name', 'category', 'category_display',
            'is_active', 'order_index',
            'trades_count',
            'created_at', 'created_at_fa',
            'updated_at', 'updated_at_fa'
        ]

    def get_category_display(self, obj):
        return obj.get_category_label()

    def get_trades_count(self, obj):
        return obj.trades.count()

    def get_created_at_fa(self, obj):
        return obj.created_at.strftime('%Y/%m/%d %H:%M') if obj.created_at else None

    def get_updated_at_fa(self, obj):
        return obj.updated_at.strftime('%Y/%m/%d %H:%M') if obj.updated_at else None

