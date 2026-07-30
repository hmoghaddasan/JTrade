# backend/apps/trading/serializers.py

from rest_framework import serializers
from .models import CurrencyPair, TradeGroup, Trade


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
            'user_id',  # ✅ اضافه شد - برای فیلتر کردن در فرانت‌اند
            'user_phone',  # ✅ اضافه شد - برای نمایش در صورت نیاز
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
        """دریافت تعداد تریدهای این گروه"""
        return obj.trades.filter(is_deleted=False).count()


# ============================================
# سریالایزر تریدها
# ============================================
class TradeListSerializer(serializers.ModelSerializer):
    """سریالایزر برای لیست تریدها"""

    group_name = serializers.CharField(source='group.group_name', read_only=True, default=None)
    group_icon = serializers.CharField(source='group.icon', read_only=True, default=None)

    class Meta:
        model = Trade
        fields = [
            'id', 'trade_date', 'symbol', 'trade_type',
            'entry_price', 'close_price', 'profit',
            'group', 'group_name', 'group_icon',
            'created_at'
        ]


class TradeDetailSerializer(serializers.ModelSerializer):
    """سریالایزر برای جزئیات ترید"""

    group_name = serializers.CharField(source='group.group_name', read_only=True, default=None)
    group_icon = serializers.CharField(source='group.icon', read_only=True, default=None)
    timeframes = serializers.SerializerMethodField()
    emotions = serializers.SerializerMethodField()
    checklist_items = serializers.SerializerMethodField()

    class Meta:
        model = Trade
        fields = '__all__'

    def get_timeframes(self, obj):
        return obj.get_timeframes_used()

    def get_emotions(self, obj):
        return obj.get_emotions()

    def get_checklist_items(self, obj):
        return obj.get_checklist_items()


class TradeCreateSerializer(serializers.ModelSerializer):
    """سریالایزر برای ایجاد ترید"""

    class Meta:
        model = Trade
        fields = '__all__'
        read_only_fields = ['id', 'user', 'created_at', 'updated_at', 'day_of_week', 'month']

    def validate_group(self, value):
        """اعتبارسنجی گروه"""
        if not value:
            raise serializers.ValidationError("انتخاب دسته‌بندی اجباری است")
        return value


class TradeUpdateSerializer(serializers.ModelSerializer):
    """سریالایزر برای ویرایش ترید"""

    class Meta:
        model = Trade
        fields = '__all__'
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']