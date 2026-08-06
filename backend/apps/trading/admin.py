# backend/apps/trading/admin.py

from django.contrib import admin
from django.utils.html import format_html
from .models import (
    CurrencyPair, TradeGroup, Trade, TradeAnalytics,
    AIConsultation, AIPromptVersion, AIConsultationAnalytics,
    TradingRule, TradeRuleCheck
)


@admin.register(CurrencyPair)
class CurrencyPairAdmin(admin.ModelAdmin):
    list_display = ['symbol', 'base_currency', 'quote_currency', 'pair_type', 'is_active']
    list_filter = ['pair_type', 'is_active']
    search_fields = ['symbol', 'description']
    ordering = ['symbol']


@admin.register(TradeGroup)
class TradeGroupAdmin(admin.ModelAdmin):
    list_display = ['group_name', 'user', 'is_active', 'is_default', 'trade_count']
    list_filter = ['is_active', 'is_default']
    search_fields = ['group_name', 'user__phone_number']
    raw_id_fields = ['user', 'created_by']

    def trade_count(self, obj):
        return obj.trades.filter(is_deleted=False).count()

    trade_count.short_description = 'تعداد تریدها'


@admin.register(Trade)
class TradeAdmin(admin.ModelAdmin):
    list_display = ['symbol', 'trade_type', 'trade_date', 'user', 'profit', 'execution_quality_score']
    list_filter = ['trade_type', 'trade_date', 'bias', 'strategy_type']
    search_fields = ['symbol', 'user__phone_number']
    raw_id_fields = ['user', 'group']
    ordering = ['-trade_date']


@admin.register(TradeAnalytics)
class TradeAnalyticsAdmin(admin.ModelAdmin):
    list_display = ['trade', 'user', 'analysis_date', 'setup_quality_score', 'execution_score']
    raw_id_fields = ['trade', 'user']
    ordering = ['-analysis_date']


@admin.register(TradingRule)
class TradingRuleAdmin(admin.ModelAdmin):
    list_display = ['rule_text_short', 'user', 'category', 'is_active', 'is_required', 'order_index']
    list_filter = ['category', 'is_active', 'is_required']
    search_fields = ['rule_text', 'user__phone_number']
    raw_id_fields = ['user']
    ordering = ['category', 'order_index']

    def rule_text_short(self, obj):
        return obj.rule_text[:50] + '...' if len(obj.rule_text) > 50 else obj.rule_text

    rule_text_short.short_description = 'متن قانون'


@admin.register(TradeRuleCheck)
class TradeRuleCheckAdmin(admin.ModelAdmin):
    list_display = ['trade', 'rule', 'is_checked', 'checked_at']
    list_filter = ['is_checked', 'checked_at']
    search_fields = ['trade__symbol', 'rule__rule_text']
    raw_id_fields = ['trade', 'rule']


@admin.register(AIConsultation)
class AIConsultationAdmin(admin.ModelAdmin):
    list_display = ['symbol', 'direction', 'user', 'ai_score', 'created_at']
    list_filter = ['direction', 'ai_score']
    search_fields = ['symbol', 'user__phone_number']
    raw_id_fields = ['user', 'trade']


@admin.register(AIPromptVersion)
class AIPromptVersionAdmin(admin.ModelAdmin):
    list_display = ['version', 'status', 'performance_score', 'usage_count', 'created_at']
    list_filter = ['status']
    search_fields = ['version', 'description']


@admin.register(AIConsultationAnalytics)
class AIConsultationAnalyticsAdmin(admin.ModelAdmin):
    list_display = ['date', 'total_consultations', 'total_feedback', 'avg_score', 'success_rate']
    list_filter = ['date']
# admin.py
