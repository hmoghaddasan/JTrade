# backend/apps/trading/discipline_serializers.py

from rest_framework import serializers
from .models import (
    DisciplineSettings, DailyDisciplineState,
    DisciplineViolation, Reflection, DailyHabit
)


class DisciplineSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = DisciplineSettings
        fields = [
            'id', 'max_trades_per_day', 'daily_loss_limit',
            'max_loss_per_trade', 'max_contract_size',
            'cooldown_consecutive_losses', 'cooldown_duration_minutes',
            'cooldown_after_daily_loss', 'cooldown_after_max_trades',
            'manual_cooldown_minutes',
            'pre_trade_checklist_items', 'checklist_required',
            'daily_habits', 'tiltmeter_weights',
            'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class DailyDisciplineStateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyDisciplineState
        fields = [
            'id', 'date', 'trades_today', 'daily_loss',
            'consecutive_losses', 'is_locked_until_end_of_day',
            'is_cooldown_active', 'cooldown_until', 'cooldown_reason',
            'tiltmeter_score', 'compliance_rate',
            'habits_completed', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'date', 'created_at', 'updated_at']


class DisciplineStatusSerializer(serializers.Serializer):
    """سریالایزر وضعیت روزانه برای ویجت"""
    date = serializers.DateField()
    trades_today = serializers.IntegerField()
    daily_loss = serializers.FloatField()
    consecutive_losses = serializers.IntegerField()
    is_locked = serializers.BooleanField()
    is_cooldown_active = serializers.BooleanField()
    cooldown_remaining = serializers.IntegerField()
    cooldown_reason = serializers.CharField()
    tiltmeter_score = serializers.FloatField()
    compliance_rate = serializers.FloatField()
    max_trades_per_day = serializers.IntegerField()
    daily_loss_limit = serializers.FloatField()
    max_loss_per_trade = serializers.FloatField()
    max_contract_size = serializers.FloatField()
    cooldown_consecutive_losses = serializers.IntegerField()
    cooldown_duration_minutes = serializers.IntegerField()
    checklist_items = serializers.ListField(child=serializers.CharField())
    habits = serializers.ListField(child=serializers.CharField())
    habits_completed = serializers.ListField(child=serializers.CharField())


class DisciplineCheckSerializer(serializers.Serializer):
    """سریالایزر بررسی مجاز بودن ترید"""
    allowed = serializers.BooleanField()
    message = serializers.CharField()
    warnings = serializers.ListField(child=serializers.CharField())


class DisciplineViolationSerializer(serializers.ModelSerializer):
    violation_type_label = serializers.CharField(source='get_violation_type_display', read_only=True)

    class Meta:
        model = DisciplineViolation
        fields = [
            'id', 'violation_type', 'violation_type_label',
            'description', 'severity', 'is_resolved',
            'trade_id', 'created_at', 'resolved_at',
        ]
        read_only_fields = ['id', 'created_at']


class ReflectionSerializer(serializers.ModelSerializer):
    trade_symbol = serializers.CharField(source='trade.symbol', read_only=True)
    trade_date = serializers.DateField(source='trade.trade_date', read_only=True)

    class Meta:
        model = Reflection
        fields = [
            'id', 'trade', 'trade_symbol', 'trade_date',
            'followed_plan', 'learned_lesson', 'emotion_after',
            'improvement_note', 'quality_score',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def validate_quality_score(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("امتیاز کیفیت باید بین ۱ تا ۵ باشد")
        return value


class ReflectionCreateSerializer(serializers.Serializer):
    """سریالایزر ایجاد بازتاب"""
    trade_id = serializers.IntegerField()
    followed_plan = serializers.BooleanField(default=True)
    learned_lesson = serializers.CharField(required=False, allow_blank=True)
    emotion_after = serializers.CharField(required=False, allow_blank=True)
    improvement_note = serializers.CharField(required=False, allow_blank=True)
    quality_score = serializers.IntegerField(default=3)


class DailyHabitSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyHabit
        fields = ['id', 'habit_name', 'habit_description', 'is_done', 'date', 'created_at']
        read_only_fields = ['id', 'date', 'created_at']


class DailyHabitStatusSerializer(serializers.Serializer):
    habits = serializers.ListField(child=serializers.CharField())
    completed = serializers.ListField(child=serializers.CharField())
    progress = serializers.FloatField()


class DisciplineLeakReportSerializer(serializers.Serializer):
    """سریالایزر گزارش نشت انضباط"""
    total_trades = serializers.IntegerField()
    disciplined_trades = serializers.IntegerField()
    undisciplined_trades = serializers.IntegerField()
    discipline_cost = serializers.FloatField()
    disciplined_profit = serializers.FloatField()
    undisciplined_profit = serializers.FloatField()
    violations_by_type = serializers.ListField()
    compliance_rate = serializers.FloatField()
    recommendations = serializers.ListField(child=serializers.CharField())


class DisciplineHeatmapItemSerializer(serializers.Serializer):
    date = serializers.CharField()
    compliance = serializers.FloatField()
    tiltmeter = serializers.FloatField()
    color = serializers.ChoiceField(choices=['green', 'yellow', 'red'])
    label = serializers.CharField()
    trades = serializers.IntegerField()
    daily_loss = serializers.FloatField()
    is_locked = serializers.BooleanField()