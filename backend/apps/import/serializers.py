from rest_framework import serializers
from .models import ImportMapping, ImportLog


class ImportMappingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImportMapping
        fields = ['id', 'broker_name', 'column_mapping', 'is_default', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class ImportLogSerializer(serializers.ModelSerializer):
    user_phone = serializers.CharField(source='user.phone_number', read_only=True)

    class Meta:
        model = ImportLog
        fields = [
            'id', 'user', 'user_phone', 'source', 'file_name', 'file_size',
            'status', 'trades_imported', 'trades_skipped', 'errors', 'warnings',
            'started_at', 'completed_at'
        ]
        read_only_fields = ['id', 'user', 'started_at', 'completed_at']


class CSVPreviewSerializer(serializers.Serializer):
    """
    سریالایزر برای پیش‌نمایش داده‌های CSV قبل از Import
    """
    headers = serializers.ListField(child=serializers.CharField())
    rows = serializers.ListField(child=serializers.DictField())
    detected_broker = serializers.CharField(required=False, allow_null=True)
    suggested_mapping = serializers.DictField(required=False)
    total_rows = serializers.IntegerField()


class ImportRequestSerializer(serializers.Serializer):
    """
    سریالایزر درخواست Import
    """
    column_mapping = serializers.DictField(
        child=serializers.CharField(),
        help_text="نگاشت ستون‌ها: {'trade_date': 'Date', 'symbol': 'Symbol', ...}"
    )
    broker_name = serializers.CharField(required=False, allow_blank=True)
    save_mapping = serializers.BooleanField(default=False, help_text="آیا این mapping برای آینده ذخیره شود؟")
    preview_only = serializers.BooleanField(default=False, help_text="فقط پیش‌نمایش، بدون ذخیره‌سازی")
    portfolio_id = serializers.IntegerField(required=False, allow_null=True, help_text="شناسه پورتفولیو برای اختصاص به تریدها")
    group_id = serializers.IntegerField(required=False, allow_null=True, help_text="شناسه گروه پیش‌فرض")