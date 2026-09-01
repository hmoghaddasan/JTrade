# backend/apps/accounts/serializers.py

from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.utils import timezone
import re
from datetime import datetime  # ✅ اضافه شد

from .models import User, SystemMessage, AppVersion


class PhoneNumberSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=15)

    def validate_phone_number(self, value):
        pattern = r'^09\d{9}$'
        if not re.match(pattern, value):
            raise serializers.ValidationError('شماره تلفن باید با 09 شروع شده و 11 رقم باشد')
        return value


class UserRegisterSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=15)
    password = serializers.CharField(write_only=True, min_length=6)
    first_name = serializers.CharField(max_length=50, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=50, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)

    def validate_phone_number(self, value):
        pattern = r'^09\d{9}$'
        if not re.match(pattern, value):
            raise serializers.ValidationError('شماره تلفن باید با 09 شروع شده و 11 رقم باشد')
        return value

    def validate_password(self, value):
        try:
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(e.messages)
        return value


class VerifyCodeSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=15)
    code = serializers.CharField(max_length=10)

    def validate_phone_number(self, value):
        pattern = r'^09\d{9}$'
        if not re.match(pattern, value):
            raise serializers.ValidationError('شماره تلفن نامعتبر است')
        return value

    def validate_code(self, value):
        if not value.isdigit():
            raise serializers.ValidationError('کد تایید باید عددی باشد')
        return value


class UserLoginSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=15)
    password = serializers.CharField(write_only=True)

    def validate_phone_number(self, value):
        pattern = r'^09\d{9}$'
        if not re.match(pattern, value):
            raise serializers.ValidationError('شماره تلفن نامعتبر است')
        return value


class UserProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'phone_number', 'first_name', 'last_name', 'full_name',
            'email', 'is_verified', 'is_admin', 'is_active',
            'created_at', 'last_login'
        ]

    def get_full_name(self, obj):
        return obj.get_full_name()


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """سریالایزر برای به‌روزرسانی پروفایل کاربر"""

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email']

    def validate_email(self, value):
        if value and User.objects.filter(email=value).exclude(id=self.instance.id).exists():
            raise serializers.ValidationError('این ایمیل قبلاً ثبت شده است')
        return value


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    subscription_status = serializers.SerializerMethodField()
    remaining_trades = serializers.SerializerMethodField()
    subscription_expiry = serializers.SerializerMethodField()
    remaining_days = serializers.SerializerMethodField()
    plan_name = serializers.SerializerMethodField()
    plan_type = serializers.SerializerMethodField()
    is_admin = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'phone_number', 'first_name', 'last_name', 'full_name',
            'email', 'is_verified', 'is_admin', 'is_active',
            'created_at', 'last_login',
            'subscription_status', 'remaining_trades',
            'subscription_expiry', 'remaining_days',
            'plan_name', 'plan_type'
        ]

    def get_full_name(self, obj):
        return obj.get_full_name()

    def get_subscription_status(self, obj):
        return obj.has_active_subscription()

    def get_remaining_trades(self, obj):
        return obj.get_remaining_trades()

    def get_subscription_expiry(self, obj):
        expiry = obj.get_subscription_expiry()
        return expiry.isoformat() if expiry else None

    def get_remaining_days(self, obj):
        expiry = obj.get_subscription_expiry()
        if expiry:
            diff = expiry - timezone.now()
            return max(0, diff.days)
        return 0

    def get_plan_name(self, obj):
        if obj.is_admin:
            return 'ادمین'
        subscription = obj.get_active_subscription()
        return subscription.plan.plan_name if subscription else None

    def get_plan_type(self, obj):
        if obj.is_admin:
            return 'admin'
        subscription = obj.get_active_subscription()
        return subscription.plan.plan_type if subscription else None


class SubscriptionStatusSerializer(serializers.Serializer):
    has_subscription = serializers.BooleanField()
    plan_name = serializers.CharField(required=False, allow_null=True)
    plan_type = serializers.CharField(required=False, allow_null=True)
    start_date = serializers.DateTimeField(required=False, allow_null=True)
    end_date = serializers.DateTimeField(required=False, allow_null=True)
    remaining_days = serializers.IntegerField(required=False)
    remaining_trades = serializers.IntegerField(required=False)
    remaining_ai_consultations = serializers.IntegerField(required=False)
    trades_limit = serializers.IntegerField(required=False)
    trades_used = serializers.IntegerField(required=False)
    ai_consultations_limit = serializers.IntegerField(required=False)
    ai_consultations_used = serializers.IntegerField(required=False)
    is_trial = serializers.BooleanField(required=False)
    expired = serializers.BooleanField(required=False)
    is_admin = serializers.BooleanField(required=False)
    message = serializers.CharField(required=False, allow_blank=True)


class SystemMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemMessage
        fields = ['id', 'message_key', 'title', 'message', 'is_active', 'start_date', 'end_date', 'created_at']


# ============================================
# ✅ اصلاح شده - با تاریخ شمسی
# ============================================
class AppVersionSerializer(serializers.ModelSerializer):
    """سریالایزر برای نسخه‌های نرم‌افزار با تاریخ شمسی"""
    release_date_persian = serializers.SerializerMethodField()
    release_date_gregorian = serializers.SerializerMethodField()

    class Meta:
        model = AppVersion
        fields = [
            'id',
            'version_number',
            'release_date',
            'release_date_gregorian',
            'release_date_persian',
            'release_notes',
            'is_current',
            'created_at',
            'updated_at'
        ]

    def get_release_date_persian(self, obj):
        """تبدیل تاریخ میلادی به شمسی با فرمت ۱۴۰۳/۰۲/۱۵"""
        if not obj.release_date:
            return None

        try:
            import jdatetime
            # تبدیل datetime به jdatetime
            if isinstance(obj.release_date, datetime):
                jalali_date = jdatetime.datetime.fromgregorian(datetime=obj.release_date)
                return jalali_date.strftime('%Y/%m/%d')
            else:
                # اگر string است، ابتدا به datetime تبدیل کن
                from dateutil import parser
                dt = parser.parse(str(obj.release_date))
                jalali_date = jdatetime.datetime.fromgregorian(datetime=dt)
                return jalali_date.strftime('%Y/%m/%d')
        except Exception as e:
            # اگر کتابخانه jdatetime نصب نبود، از فرمت جایگزین استفاده کن
            try:
                # تبدیل ساده به تاریخ شمسی (بدون کتابخانه)
                from datetime import datetime as dt
                if isinstance(obj.release_date, str):
                    date_obj = dt.strptime(obj.release_date, '%Y-%m-%d')
                else:
                    date_obj = obj.release_date
                return date_obj.strftime('%Y/%m/%d')
            except:
                return str(obj.release_date)

    def get_release_date_gregorian(self, obj):
        """تاریخ میلادی با فرمت خوانا"""
        if not obj.release_date:
            return None
        try:
            if isinstance(obj.release_date, datetime):
                return obj.release_date.strftime('%Y-%m-%d')
            else:
                from dateutil import parser
                dt = parser.parse(str(obj.release_date))
                return dt.strftime('%Y-%m-%d')
        except:
            return str(obj.release_date)


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=6)
    confirm_password = serializers.CharField(write_only=True, min_length=6)

    def validate_old_password(self, value):
        user = self.context.get('user')
        if not user or not user.check_password(value):
            raise serializers.ValidationError('رمز عبور فعلی صحیح نیست')
        return value

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'رمز عبور جدید و تایید آن مطابقت ندارند'})

        try:
            validate_password(data['new_password'])
        except ValidationError as e:
            raise serializers.ValidationError({'new_password': e.messages})

        return data


class ForgotPasswordSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=15)

    def validate_phone_number(self, value):
        pattern = r'^09\d{9}$'
        if not re.match(pattern, value):
            raise serializers.ValidationError('شماره تلفن نامعتبر است')

        if not User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError('کاربری با این شماره تلفن یافت نشد')

        return value


class ResetPasswordSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=15)
    code = serializers.CharField(max_length=10)
    new_password = serializers.CharField(write_only=True, min_length=6)
    confirm_password = serializers.CharField(write_only=True, min_length=6)

    def validate_phone_number(self, value):
        pattern = r'^09\d{9}$'
        if not re.match(pattern, value):
            raise serializers.ValidationError('شماره تلفن نامعتبر است')
        return value

    def validate_code(self, value):
        if not value.isdigit():
            raise serializers.ValidationError('کد تایید باید عددی باشد')
        return value

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'رمز عبور جدید و تایید آن مطابقت ندارند'})

        try:
            validate_password(data['new_password'])
        except ValidationError as e:
            raise serializers.ValidationError({'new_password': e.messages})

        return data