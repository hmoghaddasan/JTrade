# backend/apps/trading/serializers.py

from rest_framework import serializers
from .models import CurrencyPair, TradeGroup, Trade, AIConsultation, AIPromptVersion, AIConsultationAnalytics, TradingRule, TradeRuleCheck


# ============================================
# سریالایزر جفت ارزها
# ============================================
class CurrencyPairSerializer(serializers.ModelSerializer):
    """سریالایزر برای جفت ارزها"""

    class Meta:
        model = CurrencyPair
        fields = [
            'id', 'symbol', 'base_currency', 'quote_currency',
            'pair_type', 'description', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


# ============================================
# سریالایزر گروه‌های ترید
# ============================================
class TradeGroupSerializer(serializers.ModelSerializer):
    """سریالایزر برای گروه‌های ترید - با user_id و trade_count"""

    trade_count = serializers.SerializerMethodField()
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    user_phone = serializers.CharField(source='user.phone_number', read_only=True)

    class Meta:
        model = TradeGroup
        fields = [
            'id',
            'group_name',
            'icon',
            'description',
            'user',
            'user_id',
            'user_phone',
            'is_active',
            'is_default',
            'created_by',
            'order_index',
            'created_at',
            'updated_at',
            'trade_count'
        ]
        read_only_fields = ['id', 'user', 'created_by', 'created_at', 'updated_at']

    def get_trade_count(self, obj):
        return obj.trades.filter(is_deleted=False).count()


# ============================================
# سریالایزر تریدها - لیست کامل
# ============================================
class TradeListSerializer(serializers.ModelSerializer):
    """
    سریالایزر برای لیست تریدها - اکنون تمام فیلدها را برمی‌گرداند
    """
    group_name = serializers.CharField(source='group.group_name', read_only=True, default=None)
    group_icon = serializers.CharField(source='group.icon', read_only=True, default=None)
    timeframes = serializers.SerializerMethodField()
    emotions = serializers.SerializerMethodField()
    rule_compliance = serializers.SerializerMethodField()

    class Meta:
        model = Trade
        fields = [
            'id', 'trade_date', 'day_of_week', 'month', 'time_ny',
            'symbol', 'trade_type', 'session_type', 'weekly_profile_note',
            'sleep_quality', 'food_status',
            'focus', 'calm', 'excited', 'fear', 'greed', 'relaxed',
            'happy', 'sad', 'energetic', 'tired', 'fomo', 'patience', 'contentment',
            'dominant_feeling',
            'bias', 'strategy_type',
            'timeframe_d', 'timeframe_h4', 'timeframe_h1', 'timeframe_m15',
            'timeframe_m5', 'timeframe_m1',
            'retirement_model',
            'weekly_news_printed', 'zero_hour_identified',
            'asian_range_identified', 'london_range_identified', 'judas_lo_identified',
            'key_levels_reviewed', 'smt_confirmed', 'bond_dxy_support',
            'checklist_extra',
            'entry_price', 'stop_loss',
            'take_profit_1', 'take_profit_2', 'take_profit_3',
            'close_price', 'tp_sl_hit',
            'risk_usd', 'risk_percent', 'risk_reward_ratio',
            'profit', 'execution_quality_score',
            'pre_trade_stress', 'entry_emotion_control',
            'reaction_to_profit', 'expectation_management',
            'emotion_after_losses',
            'mistake_code', 'mistake_weight',
            'stop_loss_adherence', 'strategy_adherence',
            'capital_management_adherence', 'over_trade',
            'post_trade_scan', 'entry_reason_written',
            'exit_reason_written', 'mistakes_recorded',
            'fvg', 'order_block', 'bos', 'choch', 'mss',
            'liquidity_sweep', 'poi', 'demand_zone', 'supply_zone',
            'screenshot',  # ✅ اضافه شد
            'group', 'group_name', 'group_icon',
            'created_at', 'updated_at',
            'timeframes', 'emotions', 'rule_compliance'
        ]

    def get_timeframes(self, obj):
        return obj.get_timeframes_used()

    def get_emotions(self, obj):
        return obj.get_emotions()

    def get_rule_compliance(self, obj):
        """محاسبه درصد پایبندی به قوانین"""
        checks = obj.rule_checks.all()
        if not checks:
            return None
        total = checks.count()
        checked = checks.filter(is_checked=True).count()
        return {
            'total': total,
            'checked': checked,
            'percentage': round((checked / total * 100), 1) if total > 0 else 0
        }


# ============================================
# سریالایزر جزئیات ترید
# ============================================
class TradeDetailSerializer(serializers.ModelSerializer):
    """سریالایزر برای جزئیات ترید"""

    group_name = serializers.CharField(source='group.group_name', read_only=True, default=None)
    group_icon = serializers.CharField(source='group.icon', read_only=True, default=None)
    timeframes = serializers.SerializerMethodField()
    emotions = serializers.SerializerMethodField()
    checklist_items = serializers.SerializerMethodField()
    rule_compliance = serializers.SerializerMethodField()
    rule_checks_detail = serializers.SerializerMethodField()

    class Meta:
        model = Trade
        fields = '__all__'  # شامل screenshot می‌شود

    def get_timeframes(self, obj):
        return obj.get_timeframes_used()

    def get_emotions(self, obj):
        return obj.get_emotions()

    def get_checklist_items(self, obj):
        return obj.get_checklist_items()

    def get_rule_compliance(self, obj):
        """محاسبه درصد پایبندی به قوانین"""
        checks = obj.rule_checks.all()
        if not checks:
            return None
        total = checks.count()
        checked = checks.filter(is_checked=True).count()
        return {
            'total': total,
            'checked': checked,
            'percentage': round((checked / total * 100), 1) if total > 0 else 0
        }

    def get_rule_checks_detail(self, obj):
        """دریافت جزئیات بررسی قوانین"""
        checks = obj.rule_checks.select_related('rule').all()
        return [{
            'rule_id': check.rule.id,
            'rule_text': check.rule.rule_text,
            'rule_category': check.rule.get_category_label(),
            'is_checked': check.is_checked,
        } for check in checks]


# ============================================
# سریالایزر ایجاد ترید (با قوانین و تصویر)
# ============================================
class TradeCreateSerializer(serializers.ModelSerializer):
    """سریالایزر برای ایجاد ترید - با فیلد rule_checks و پشتیبانی از تصویر"""
    rule_checks = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        write_only=True,
        help_text="لیست شناسه قوانین رعایت‌شده"
    )

    class Meta:
        model = Trade
        fields = '__all__'
        read_only_fields = ['id', 'user', 'created_at', 'updated_at', 'day_of_week', 'month']

    def validate_group(self, value):
        if not value:
            raise serializers.ValidationError("انتخاب دسته‌بندی اجباری است")
        return value

    def validate_rule_checks(self, value):
        """اعتبارسنجی قوانین اجباری"""
        if value is None:
            return []

        # دریافت قوانین اجباری کاربر
        user = self.context.get('request').user
        required_rules = TradingRule.objects.filter(user=user, is_active=True, is_required=True)
        required_rule_ids = set(required_rules.values_list('id', flat=True))
        checked_rule_ids = set(value)

        # بررسی اینکه همه قوانین اجباری بررسی شده‌اند
        missing_required = required_rule_ids - checked_rule_ids
        if missing_required:
            missing_texts = TradingRule.objects.filter(id__in=missing_required).values_list('rule_text', flat=True)
            raise serializers.ValidationError(
                f"قوانین اجباری زیر باید رعایت شوند: {', '.join(missing_texts)}"
            )

        return value


# ============================================
# سریالایزر ویرایش ترید
# ============================================
class TradeUpdateSerializer(serializers.ModelSerializer):
    """سریالایزر برای ویرایش ترید - با پشتیبانی از تصویر"""
    rule_checks = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        write_only=True,
        help_text="لیست شناسه قوانین رعایت‌شده"
    )

    class Meta:
        model = Trade
        fields = '__all__'
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']


# ============================================
# سریالایزرهای قوانین معاملاتی
# ============================================

class TradingRuleSerializer(serializers.ModelSerializer):
    """سریالایزر برای قوانین معاملاتی"""
    category_label = serializers.CharField(source='get_category_label', read_only=True)

    class Meta:
        model = TradingRule
        fields = [
            'id', 'rule_text', 'category', 'category_label',
            'is_active', 'is_required', 'order_index',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class TradeRuleCheckSerializer(serializers.ModelSerializer):
    """سریالایزر برای بررسی قوانین"""
    rule_text = serializers.CharField(source='rule.rule_text', read_only=True)
    rule_category = serializers.CharField(source='rule.get_category_label', read_only=True)

    class Meta:
        model = TradeRuleCheck
        fields = ['id', 'rule', 'rule_text', 'rule_category', 'is_checked', 'checked_at']


# ============================================
# سریالایزرهای AI Validator (موجود)
# ============================================

class AIConsultationInputSerializer(serializers.Serializer):
    """سریالایزر برای ورودی مشاوره AI - با فیلد model جدید"""
    symbol = serializers.CharField(max_length=20)
    direction = serializers.ChoiceField(choices=['Buy', 'Sell'])
    entry_price = serializers.DecimalField(max_digits=15, decimal_places=5)
    stop_loss = serializers.DecimalField(max_digits=15, decimal_places=5, required=False, allow_null=True)
    take_profit = serializers.DecimalField(max_digits=15, decimal_places=5, required=False, allow_null=True)
    market_condition = serializers.CharField(max_length=20, required=False, allow_null=True, allow_blank=True)
    emotion = serializers.CharField(max_length=20, required=False, allow_null=True, allow_blank=True)
    time_ny = serializers.TimeField(required=False, allow_null=True)
    user_question = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    model = serializers.CharField(max_length=50, required=False, allow_null=True, allow_blank=True)


class AIConsultationResponseSerializer(serializers.Serializer):
    """سریالایزر برای خروجی AI"""
    score = serializers.IntegerField(min_value=0, max_value=100)
    strengths = serializers.ListField(child=serializers.CharField())
    warnings = serializers.ListField(child=serializers.CharField())
    suggestion = serializers.CharField()
    tip = serializers.CharField()


class AIConsultationSerializer(serializers.ModelSerializer):
    """سریالایزر برای نمایش مشاوره AI"""
    trade_id = serializers.IntegerField(source='trade.id', read_only=True, allow_null=True)
    trade_symbol = serializers.CharField(source='trade.symbol', read_only=True, allow_null=True)
    user_name = serializers.CharField(source='user.full_name', read_only=True, allow_null=True)

    class Meta:
        model = AIConsultation
        fields = [
            'id', 'user', 'user_name', 'trade', 'trade_id', 'trade_symbol',
            'symbol', 'direction', 'entry_price', 'stop_loss', 'take_profit',
            'market_condition', 'emotion', 'time_ny', 'user_question',
            'ai_score', 'ai_response',
            'is_followed', 'trade_result',
            'feedback_score', 'feedback_helpfulness', 'feedback_comment', 'feedback_given_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at', 'feedback_given_at']


class AIConsultationFeedbackSerializer(serializers.Serializer):
    """سریالایزر برای ثبت بازخورد"""
    is_followed = serializers.ChoiceField(choices=['full', 'partial', 'none'])
    trade_result = serializers.ChoiceField(choices=['win', 'loss', 'breakeven'])
    feedback_score = serializers.IntegerField(min_value=1, max_value=5)
    feedback_helpfulness = serializers.ChoiceField(choices=['very_helpful', 'somewhat_helpful', 'little_helpful', 'not_helpful'])
    feedback_comment = serializers.CharField(required=False, allow_null=True, allow_blank=True)


class AIPromptVersionSerializer(serializers.ModelSerializer):
    """سریالایزر برای نسخه‌های پرامپت"""
    class Meta:
        model = AIPromptVersion
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'performance_score', 'usage_count']


class AIConsultationAnalyticsSerializer(serializers.ModelSerializer):
    """سریالایزر برای آمار تحلیلی"""
    class Meta:
        model = AIConsultationAnalytics
        fields = '__all__'


# ============================================
# سریالایزر گزارش قوانین
# ============================================

class RulesReportSerializer(serializers.Serializer):
    """سریالایزر برای گزارش قوانین"""
    total_rules = serializers.IntegerField()
    rules_by_category = serializers.DictField()
    overall_compliance = serializers.FloatField()
    rules_stats = serializers.ListField()
    compliance_by_category = serializers.DictField()