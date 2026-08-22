# backend/apps/trading/admin.py

from django.contrib import admin
from django.utils.html import format_html
from .models import (
    Broker,  # ✅ جدید
    CurrencyPair, TradeGroup, Trade, TradeAnalytics,
    AIConsultation, AIPromptVersion, AIConsultationAnalytics,
    TradingRule, TradeRuleCheck,
    DisciplineSettings, DailyDisciplineState,
    DisciplineViolation, Reflection, DailyHabit
)


# ============================================
# ✅ ثبت مدل بروکر در پنل ادمین
# ============================================
@admin.register(Broker)
class BrokerAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'is_active', 'order_index', 'trade_count']
    list_filter = ['category', 'is_active']
    search_fields = ['name']
    ordering = ['category', 'order_index', 'name']
    fields = ['name', 'category', 'is_active', 'order_index']
    list_editable = ['is_active', 'order_index']

    def trade_count(self, obj):
        return obj.trades.filter(is_deleted=False).count()

    trade_count.short_description = 'تعداد تریدها'


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
    list_display = ['symbol', 'trade_type', 'trade_date', 'user', 'broker', 'profit',
                    'execution_quality_score']  # ✅ broker اضافه شد
    list_filter = ['trade_type', 'trade_date', 'bias', 'strategy_type', 'broker']  # ✅ broker اضافه شد
    search_fields = ['symbol', 'user__phone_number', 'broker__name']  # ✅ broker اضافه شد
    raw_id_fields = ['user', 'group', 'broker']  # ✅ broker اضافه شد
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


# ============================================
# ✅ ثبت مدل‌های انضباطی
# ============================================

@admin.register(DisciplineSettings)
class DisciplineSettingsAdmin(admin.ModelAdmin):
    list_display = ['user', 'max_trades_per_day', 'daily_loss_limit', 'cooldown_consecutive_losses', 'is_active']
    list_filter = ['is_active', 'checklist_required']
    search_fields = ['user__phone_number', 'user__first_name', 'user__last_name']
    raw_id_fields = ['user']
    fieldsets = (
        ('کاربر', {'fields': ('user', 'is_active')}),
        ('محدودیت‌های روزانه',
         {'fields': ('max_trades_per_day', 'daily_loss_limit', 'max_loss_per_trade', 'max_contract_size')}),
        ('کول‌داون', {
            'fields': ('cooldown_consecutive_losses', 'cooldown_duration_minutes', 'cooldown_after_daily_loss',
                       'cooldown_after_max_trades', 'manual_cooldown_minutes')}),
        ('چک‌لیست و عادات', {'fields': ('pre_trade_checklist_items', 'checklist_required', 'daily_habits')}),
        ('تنظیمات پیشرفته', {'fields': ('tiltmeter_weights',)}),
    )
    readonly_fields = ['created_at', 'updated_at']


@admin.register(DailyDisciplineState)
class DailyDisciplineStateAdmin(admin.ModelAdmin):
    list_display = ['user', 'date', 'trades_today', 'daily_loss', 'tiltmeter_score', 'compliance_rate',
                    'is_cooldown_active']
    list_filter = ['date', 'is_cooldown_active', 'is_locked_until_end_of_day']
    search_fields = ['user__phone_number']
    raw_id_fields = ['user']
    readonly_fields = ['date', 'created_at', 'updated_at']


@admin.register(DisciplineViolation)
class DisciplineViolationAdmin(admin.ModelAdmin):
    list_display = ['user', 'violation_type', 'trade', 'severity', 'is_resolved', 'created_at']
    list_filter = ['violation_type', 'severity', 'is_resolved']
    search_fields = ['user__phone_number', 'description']
    raw_id_fields = ['user', 'trade']
    readonly_fields = ['created_at']


@admin.register(Reflection)
class ReflectionAdmin(admin.ModelAdmin):
    list_display = ['user', 'trade', 'followed_plan', 'quality_score', 'created_at']
    list_filter = ['followed_plan', 'quality_score']
    search_fields = ['user__phone_number', 'learned_lesson']
    raw_id_fields = ['user', 'trade']
    readonly_fields = ['created_at']


@admin.register(DailyHabit)
class DailyHabitAdmin(admin.ModelAdmin):
    list_display = ['user', 'habit_name', 'is_done', 'date']
    list_filter = ['is_done', 'date']
    search_fields = ['user__phone_number', 'habit_name']
    raw_id_fields = ['user']
    readonly_fields = ['created_at']