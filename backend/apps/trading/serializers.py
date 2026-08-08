# backend/apps/trading/serializers.py

import base64
import imghdr
from io import BytesIO
from PIL import Image
from django.conf import settings
from rest_framework import serializers
from .models import CurrencyPair, TradeGroup, Trade, AIConsultation, AIPromptVersion, AIConsultationAnalytics, TradingRule, TradeRuleCheck


class CurrencyPairSerializer(serializers.ModelSerializer):
    class Meta:
        model = CurrencyPair
        fields = ['id', 'symbol', 'base_currency', 'quote_currency', 'pair_type', 'description', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class TradeGroupSerializer(serializers.ModelSerializer):
    trade_count = serializers.SerializerMethodField()
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    user_phone = serializers.CharField(source='user.phone_number', read_only=True)

    class Meta:
        model = TradeGroup
        fields = ['id', 'group_name', 'icon', 'description', 'user', 'user_id', 'user_phone',
                  'is_active', 'is_default', 'created_by', 'order_index', 'created_at', 'updated_at', 'trade_count']
        read_only_fields = ['id', 'user', 'created_by', 'created_at', 'updated_at']

    def get_trade_count(self, obj):
        return obj.trades.filter(is_deleted=False).count()


class TradeListSerializer(serializers.ModelSerializer):
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
            'screenshot',
            'group', 'group_name', 'group_icon',
            'created_at', 'updated_at',
            'timeframes', 'emotions', 'rule_compliance'
        ]

    def get_timeframes(self, obj):
        return obj.get_timeframes_used()

    def get_emotions(self, obj):
        return obj.get_emotions()

    def get_rule_compliance(self, obj):
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


class TradeDetailSerializer(serializers.ModelSerializer):
    group_name = serializers.CharField(source='group.group_name', read_only=True, default=None)
    group_icon = serializers.CharField(source='group.icon', read_only=True, default=None)
    timeframes = serializers.SerializerMethodField()
    emotions = serializers.SerializerMethodField()
    checklist_items = serializers.SerializerMethodField()
    rule_compliance = serializers.SerializerMethodField()
    rule_checks_detail = serializers.SerializerMethodField()

    class Meta:
        model = Trade
        fields = '__all__'

    def get_timeframes(self, obj):
        return obj.get_timeframes_used()

    def get_emotions(self, obj):
        return obj.get_emotions()

    def get_checklist_items(self, obj):
        return obj.get_checklist_items()

    def get_rule_compliance(self, obj):
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
        checks = obj.rule_checks.select_related('rule').all()
        return [{
            'rule_id': check.rule.id,
            'rule_text': check.rule.rule_text,
            'rule_category': check.rule.get_category_label(),
            'is_checked': check.is_checked,
        } for check in checks]


class TradeCreateSerializer(serializers.ModelSerializer):
    rule_checks = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        write_only=True,
        help_text="لیست شناسه قوانین رعایت‌شده"
    )
    screenshot = serializers.CharField(
        required=False,
        allow_null=True,
        allow_blank=True,
        help_text="تصویر چارت به صورت Base64"
    )

    class Meta:
        model = Trade
        fields = '__all__'
        read_only_fields = ['id', 'user', 'created_at', 'updated_at', 'day_of_week', 'month']

    def validate_group(self, value):
        if not value:
            raise serializers.ValidationError("انتخاب دسته‌بندی اجباری است")
        return value

    def validate_screenshot(self, value):
        """
        کنترل کامل تصویر: فعال‌سازی، حجم، ابعاد، فرمت، resize و بهینه‌سازی
        """
        # 1️⃣ بررسی فعال بودن آپلود
        if not settings.SHOW_SCREENSHOT_UPLOAD:
            return None

        if value is None:
            return None

        if isinstance(value, (dict, list)):
            return None

        if not isinstance(value, str):
            try:
                value = str(value)
            except:
                return None

        if value.strip() == '':
            return None

        # استخراج داده Base64 (حذف header)
        if ',' in value:
            header, base64_data = value.split(',', 1)
            if 'image' not in header:
                raise serializers.ValidationError("فرمت فایل معتبر نیست. فقط تصاویر مجاز هستند.")
        else:
            base64_data = value

        # 2️⃣ بررسی حجم (حداکثر از .env)
        try:
            size_in_bytes = len(base64_data) * 3 // 4
            size_in_mb = size_in_bytes / (1024 * 1024)

            if size_in_mb > settings.MAX_IMAGE_SIZE_MB:
                raise serializers.ValidationError(
                    f"حجم تصویر باید کمتر از {settings.MAX_IMAGE_SIZE_MB} مگابایت باشد. "
                    f"(حجم فعلی: {size_in_mb:.2f} MB)"
                )
        except Exception as e:
            raise serializers.ValidationError(f"خطا در بررسی حجم تصویر: {str(e)}")

        # 3️⃣ بررسی فرمت و ابعاد
        try:
            image_data = base64.b64decode(base64_data)

            # تشخیص فرمت تصویر
            image_format = imghdr.what(None, image_data)
            if image_format not in ['jpeg', 'png', 'gif', 'webp']:
                raise serializers.ValidationError(
                    f"فرمت '{image_format}' پشتیبانی نمی‌شود. "
                    "فقط JPEG, PNG, GIF, WebP مجاز هستند."
                )

            # باز کردن تصویر با Pillow
            image = Image.open(BytesIO(image_data))
            original_width, original_height = image.size

            # 4️⃣ کنترل ابعاد و resize در صورت نیاز
            max_w = settings.MAX_IMAGE_WIDTH
            max_h = settings.MAX_IMAGE_HEIGHT

            if original_width > max_w or original_height > max_h:
                # نسبت‌های ابعاد را حفظ کن
                image.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)
                new_width, new_height = image.size
                print(f"🔄 تصویر از {original_width}x{original_height} به {new_width}x{new_height} تغییر اندازه داد.")

            # 5️⃣ ذخیره مجدد با کیفیت بهینه
            buffer = BytesIO()
            save_format = image.format or 'JPEG'
            if save_format.upper() == 'JPEG':
                image.save(buffer, format='JPEG', quality=settings.IMAGE_QUALITY, optimize=True)
            else:
                image.save(buffer, format=save_format, optimize=True)

            buffer.seek(0)
            new_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')

            # بازسازی header
            mime_type = f"image/{image_format.lower()}"
            if image_format.lower() == 'jpeg':
                mime_type = 'image/jpeg'
            new_value = f"data:{mime_type};base64,{new_base64}"

            # بستن تصویر
            image.close()

            # لاگ موفقیت
            print(f"✅ تصویر با موفقیت پردازش شد. حجم نهایی: {len(new_base64) * 3 // 4 / (1024*1024):.2f} MB")

            return new_value

        except base64.binascii.Error:
            raise serializers.ValidationError("داده Base64 نامعتبر است.")
        except Exception as e:
            raise serializers.ValidationError(f"خطا در پردازش تصویر: {str(e)}")

    def validate_rule_checks(self, value):
        if value is None:
            return []
        user = self.context.get('request').user
        required_rules = TradingRule.objects.filter(user=user, is_active=True, is_required=True)
        required_rule_ids = set(required_rules.values_list('id', flat=True))
        checked_rule_ids = set(value)
        missing_required = required_rule_ids - checked_rule_ids
        if missing_required:
            missing_texts = TradingRule.objects.filter(id__in=missing_required).values_list('rule_text', flat=True)
            raise serializers.ValidationError(
                f"قوانین اجباری زیر باید رعایت شوند: {', '.join(missing_texts)}"
            )
        return value


class TradeUpdateSerializer(serializers.ModelSerializer):
    rule_checks = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        write_only=True,
        help_text="لیست شناسه قوانین رعایت‌شده"
    )
    screenshot = serializers.CharField(
        required=False,
        allow_null=True,
        allow_blank=True,
        help_text="تصویر چارت به صورت Base64"
    )

    class Meta:
        model = Trade
        fields = '__all__'
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

    def to_internal_value(self, data):
        mutable_data = data.copy() if hasattr(data, 'copy') else data
        if isinstance(mutable_data, dict):
            screenshot_value = mutable_data.get('screenshot')
            if screenshot_value in (None, {}, []):
                mutable_data['screenshot'] = None
        return super().to_internal_value(mutable_data)

    def validate_screenshot(self, value):
        """همان کنترل کامل مانند TradeCreateSerializer"""
        # 1️⃣ بررسی فعال بودن آپلود
        if not settings.SHOW_SCREENSHOT_UPLOAD:
            return None

        if value is None:
            return None

        if isinstance(value, (dict, list)):
            return None

        if not isinstance(value, str):
            try:
                value = str(value)
            except:
                return None

        if value.strip() == '':
            return None

        # استخراج داده Base64
        if ',' in value:
            header, base64_data = value.split(',', 1)
            if 'image' not in header:
                raise serializers.ValidationError("فرمت فایل معتبر نیست. فقط تصاویر مجاز هستند.")
        else:
            base64_data = value

        # 2️⃣ بررسی حجم
        try:
            size_in_bytes = len(base64_data) * 3 // 4
            size_in_mb = size_in_bytes / (1024 * 1024)

            if size_in_mb > settings.MAX_IMAGE_SIZE_MB:
                raise serializers.ValidationError(
                    f"حجم تصویر باید کمتر از {settings.MAX_IMAGE_SIZE_MB} مگابایت باشد. "
                    f"(حجم فعلی: {size_in_mb:.2f} MB)"
                )
        except Exception as e:
            raise serializers.ValidationError(f"خطا در بررسی حجم تصویر: {str(e)}")

        # 3️⃣ بررسی فرمت و ابعاد
        try:
            image_data = base64.b64decode(base64_data)

            image_format = imghdr.what(None, image_data)
            if image_format not in ['jpeg', 'png', 'gif', 'webp']:
                raise serializers.ValidationError(
                    f"فرمت '{image_format}' پشتیبانی نمی‌شود. "
                    "فقط JPEG, PNG, GIF, WebP مجاز هستند."
                )

            image = Image.open(BytesIO(image_data))
            original_width, original_height = image.size

            max_w = settings.MAX_IMAGE_WIDTH
            max_h = settings.MAX_IMAGE_HEIGHT

            if original_width > max_w or original_height > max_h:
                image.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)
                new_width, new_height = image.size
                print(f"🔄 تصویر از {original_width}x{original_height} به {new_width}x{new_height} تغییر اندازه داد.")

            buffer = BytesIO()
            save_format = image.format or 'JPEG'
            if save_format.upper() == 'JPEG':
                image.save(buffer, format='JPEG', quality=settings.IMAGE_QUALITY, optimize=True)
            else:
                image.save(buffer, format=save_format, optimize=True)

            buffer.seek(0)
            new_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')

            mime_type = f"image/{image_format.lower()}"
            if image_format.lower() == 'jpeg':
                mime_type = 'image/jpeg'
            new_value = f"data:{mime_type};base64,{new_base64}"

            image.close()

            print(f"✅ تصویر با موفقیت پردازش شد. حجم نهایی: {len(new_base64) * 3 // 4 / (1024*1024):.2f} MB")

            return new_value

        except base64.binascii.Error:
            raise serializers.ValidationError("داده Base64 نامعتبر است.")
        except Exception as e:
            raise serializers.ValidationError(f"خطا در پردازش تصویر: {str(e)}")


# ===== سریالایزرهای دیگر (بدون تغییر) =====
class TradingRuleSerializer(serializers.ModelSerializer):
    category_label = serializers.CharField(source='get_category_label', read_only=True)

    class Meta:
        model = TradingRule
        fields = ['id', 'rule_text', 'category', 'category_label', 'is_active', 'is_required', 'order_index', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class TradeRuleCheckSerializer(serializers.ModelSerializer):
    rule_text = serializers.CharField(source='rule.rule_text', read_only=True)
    rule_category = serializers.CharField(source='rule.get_category_label', read_only=True)

    class Meta:
        model = TradeRuleCheck
        fields = ['id', 'rule', 'rule_text', 'rule_category', 'is_checked', 'checked_at']


class AIConsultationInputSerializer(serializers.Serializer):
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
    # ===== فیلدهای جدید =====
    session_type = serializers.CharField(max_length=20, required=False, allow_null=True, allow_blank=True)
    strategy_type = serializers.CharField(max_length=10, required=False, allow_null=True, allow_blank=True)
    timeframes = serializers.CharField(max_length=100, required=False, allow_null=True, allow_blank=True)
    risk_percent = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, allow_null=True)
    volume = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)



class AIConsultationResponseSerializer(serializers.Serializer):
    score = serializers.IntegerField(min_value=0, max_value=100)
    strengths = serializers.ListField(child=serializers.CharField())
    warnings = serializers.ListField(child=serializers.CharField())
    suggestion = serializers.CharField()
    tip = serializers.CharField()


class AIConsultationSerializer(serializers.ModelSerializer):
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
    is_followed = serializers.ChoiceField(choices=['full', 'partial', 'none'])
    trade_result = serializers.ChoiceField(choices=['win', 'loss', 'breakeven'])
    feedback_score = serializers.IntegerField(min_value=1, max_value=5)
    feedback_helpfulness = serializers.ChoiceField(choices=['very_helpful', 'somewhat_helpful', 'little_helpful', 'not_helpful'])
    feedback_comment = serializers.CharField(required=False, allow_null=True, allow_blank=True)


class AIPromptVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIPromptVersion
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'performance_score', 'usage_count']


class AIConsultationAnalyticsSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIConsultationAnalytics
        fields = '__all__'


class RulesReportSerializer(serializers.Serializer):
    total_rules = serializers.IntegerField()
    rules_by_category = serializers.DictField()
    overall_compliance = serializers.FloatField()
    rules_stats = serializers.ListField()
    compliance_by_category = serializers.DictField()