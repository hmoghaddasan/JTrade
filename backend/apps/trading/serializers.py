# serializers.py
from rest_framework import serializers
from django.utils import timezone
from .models import CurrencyPair, TradeGroup, Trade, TradeAnalytics


class CurrencyPairSerializer(serializers.ModelSerializer):
    """سریالایزر جفت ارز"""

    class Meta:
        model = CurrencyPair
        fields = ['id', 'symbol', 'base_currency', 'quote_currency', 'pair_type', 'description', 'is_active']


class TradeGroupSerializer(serializers.ModelSerializer):
    """سریالایزر گروه ترید"""
    trade_count = serializers.SerializerMethodField()

    class Meta:
        model = TradeGroup
        fields = ['id', 'group_name', 'description', 'is_active', 'trade_count', 'created_at']

    def get_trade_count(self, obj):
        return obj.trades.filter(is_deleted=False).count()


class TradeListSerializer(serializers.ModelSerializer):
    """سریالایزر لیست تریدها (خلاصه)"""
    group_name = serializers.SerializerMethodField()
    profit_display = serializers.SerializerMethodField()
    timeframes_used = serializers.SerializerMethodField()

    class Meta:
        model = Trade
        fields = [
            'id', 'trade_date', 'day_of_week', 'symbol', 'trade_type',
            'entry_price', 'close_price', 'profit', 'profit_display',
            'tp_sl_hit', 'group', 'group_name', 'timeframes_used',
            'execution_quality_score', 'created_at'
        ]

    def get_group_name(self, obj):
        return obj.group.group_name if obj.group else 'بدون گروه'

    def get_profit_display(self, obj):
        if obj.profit is not None:
            return f"{obj.profit:+,.2f}"
        return '-'

    def get_timeframes_used(self, obj):
        return obj.get_timeframes_used()


class TradeDetailSerializer(serializers.ModelSerializer):
    """سریالایزر جزئیات کامل ترید"""
    group_name = serializers.SerializerMethodField()
    timeframes_used = serializers.SerializerMethodField()
    emotions = serializers.SerializerMethodField()
    profit_display = serializers.SerializerMethodField()
    risk_reward_display = serializers.SerializerMethodField()

    class Meta:
        model = Trade
        fields = '__all__'

    def get_group_name(self, obj):
        return obj.group.group_name if obj.group else 'بدون گروه'

    def get_timeframes_used(self, obj):
        return obj.get_timeframes_used()

    def get_emotions(self, obj):
        return obj.get_emotions()

    def get_profit_display(self, obj):
        if obj.profit is not None:
            return f"{obj.profit:+,.2f}"
        return '-'

    def get_risk_reward_display(self, obj):
        if obj.risk_reward_ratio is not None:
            return f"1:{obj.risk_reward_ratio:.2f}"
        return '-'


class TradeCreateSerializer(serializers.ModelSerializer):
    """سریالایزر ایجاد ترید جدید"""

    class Meta:
        model = Trade
        fields = '__all__'
        read_only_fields = ['user', 'day_of_week', 'created_at', 'updated_at']

    def validate(self, data):
        # اعتبارسنجی تاریخ
        if 'trade_date' in data and data['trade_date'] > timezone.now().date():
            raise serializers.ValidationError('تاریخ معامله نمی‌تواند در آینده باشد')

        # اعتبارسنجی قیمت‌ها
        if data.get('entry_price') and data.get('stop_loss'):
            if data['trade_type'] == 'Buy' and data['entry_price'] >= data['stop_loss']:
                raise serializers.ValidationError('برای ترید Buy، قیمت ورود باید کمتر از حد ضرر باشد')
            if data['trade_type'] == 'Sell' and data['entry_price'] <= data['stop_loss']:
                raise serializers.ValidationError('برای ترید Sell، قیمت ورود باید بیشتر از حد ضرر باشد')

        # اعتبارسنجی ریسک
        if data.get('risk_percent') and data['risk_percent'] > 100:
            raise serializers.ValidationError('درصد ریسک نمی‌تواند بیشتر از ۱۰۰ باشد')

        return data

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        # محاسبه روز هفته
        if 'trade_date' in validated_data:
            validated_data['day_of_week'] = validated_data['trade_date'].strftime('%A')
            validated_data['month'] = validated_data['trade_date'].month
        return super().create(validated_data)


class TradeUpdateSerializer(serializers.ModelSerializer):
    """سریالایزر به‌روزرسانی ترید"""

    class Meta:
        model = Trade
        fields = '__all__'
        read_only_fields = ['user', 'day_of_week', 'created_at', 'updated_at']

    def update(self, instance, validated_data):
        # به‌روزرسانی روز هفته در صورت تغییر تاریخ
        if 'trade_date' in validated_data:
            validated_data['day_of_week'] = validated_data['trade_date'].strftime('%A')
            validated_data['month'] = validated_data['trade_date'].month
        return super().update(instance, validated_data)


class TradeAnalyticsSerializer(serializers.ModelSerializer):
    """سریالایزر تحلیل ترید"""
    trade_details = TradeDetailSerializer(source='trade', read_only=True)

    class Meta:
        model = TradeAnalytics
        fields = '__all__'
        read_only_fields = ['created_at']