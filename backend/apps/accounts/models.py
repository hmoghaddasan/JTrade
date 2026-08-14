# backend/apps/accounts/models.py

from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.utils import timezone
import json
from types import SimpleNamespace


class UserManager(BaseUserManager):
    def create_user(self, phone_number, password=None, **extra_fields):
        if not phone_number:
            raise ValueError('شماره تلفن الزامی است')

        user = self.model(phone_number=phone_number, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, phone_number, password=None, **extra_fields):
        extra_fields.setdefault('is_admin', True)
        extra_fields.setdefault('is_verified', True)
        extra_fields.setdefault('is_active', True)
        return self.create_user(phone_number, password, **extra_fields)

    def create_admin(self, phone_number, password=None, **extra_fields):
        return self.create_superuser(phone_number, password, **extra_fields)


class User(AbstractBaseUser):
    phone_number = models.CharField('شماره تلفن', max_length=15, unique=True, db_index=True)
    first_name = models.CharField('نام', max_length=50, blank=True)
    last_name = models.CharField('نام خانوادگی', max_length=50, blank=True)
    email = models.EmailField('ایمیل', max_length=100, blank=True)

    is_active = models.BooleanField('فعال', default=True)
    is_admin = models.BooleanField('مدیر', default=False)
    is_verified = models.BooleanField('تایید شده', default=False)

    verification_code = models.CharField('کد تایید', max_length=10, blank=True, null=True)
    verification_expiry = models.DateTimeField('انقضای کد تایید', blank=True, null=True)

    login_token = models.CharField('توکن ورود', max_length=255, blank=True, null=True)
    login_token_expiry = models.DateTimeField('انقضای توکن ورود', blank=True, null=True)

    created_at = models.DateTimeField('تاریخ ثبت', default=timezone.now)
    updated_at = models.DateTimeField('آخرین ویرایش', auto_now=True)
    last_login = models.DateTimeField('آخرین ورود', blank=True, null=True)

    objects = UserManager()

    USERNAME_FIELD = 'phone_number'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    class Meta:
        verbose_name = 'کاربر'
        verbose_name_plural = 'کاربران'
        ordering = ['-created_at']
        db_table = 'users'

    def __str__(self):
        return f"{self.get_full_name()} ({self.phone_number})"

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def is_staff(self):
        return self.is_admin

    def has_perm(self, perm, obj=None):
        return self.is_admin

    def has_module_perms(self, app_label):
        return self.is_admin

    def get_active_subscription(self):
        """دریافت اشتراک فعال کاربر"""
        from apps.subscriptions.models import SubscriptionPlan

        # اگر کاربر ادمین است، یک اشتراک نامحدود مجازی ایجاد کن
        if self.is_admin:
            virtual_plan = SimpleNamespace(
                plan_name='ادمین',
                plan_type='admin',
                duration_days=36500,
                monthly_trades_limit=99999,
                is_active=True
            )

            virtual_subscription = SimpleNamespace(
                plan=virtual_plan,
                start_date=timezone.now(),
                end_date=timezone.now() + timezone.timedelta(days=36500),
                is_active=True,
                trades_used=0,
                trades_limit=99999,
                is_trial=False,
                payment_status='paid',
                amount_paid=0,
                get_remaining_days=lambda: 36500,
                get_remaining_trades=lambda: 99999,
                can_trade=lambda: True
            )
            return virtual_subscription

        return self.user_subscriptions.filter(
            is_active=True,
            end_date__gt=timezone.now()
        ).first()

    def has_active_subscription(self):
        """بررسی وجود اشتراک فعال"""
        if self.is_admin:
            return True
        return self.get_active_subscription() is not None

    def get_remaining_trades(self):
        """دریافت تعداد ترید باقیمانده"""
        if self.is_admin:
            return 99999
        subscription = self.get_active_subscription()
        if not subscription:
            return 0
        return max(0, subscription.trades_limit - subscription.trades_used)

    def can_trade(self):
        """بررسی امکان انجام ترید جدید"""
        if self.is_admin:
            return True
        subscription = self.get_active_subscription()
        if not subscription:
            return False
        return self.get_remaining_trades() > 0

    def get_subscription_expiry(self):
        """دریافت تاریخ انقضای اشتراک"""
        if self.is_admin:
            return timezone.now() + timezone.timedelta(days=36500)
        subscription = self.get_active_subscription()
        if not subscription:
            return None
        return subscription.end_date


class SystemSetting(models.Model):
    """تنظیمات سیستم - قابل ویرایش در پنل ادمین"""
    SETTING_TYPES = [
        ('string', 'رشته'),
        ('integer', 'عدد صحیح'),
        ('boolean', 'بولی'),
        ('text', 'متن طولانی'),
        ('float', 'عدد اعشاری'),
        ('json', 'JSON'),
    ]

    setting_key = models.CharField('کلید تنظیم', max_length=100, unique=True)
    setting_value = models.TextField('مقدار تنظیم', blank=True, null=True)
    setting_type = models.CharField('نوع تنظیم', max_length=20, choices=SETTING_TYPES, default='string')
    description = models.TextField('توضیحات', blank=True)
    is_editable = models.BooleanField('قابل ویرایش', default=True)
    created_at = models.DateTimeField('تاریخ ثبت', default=timezone.now)
    updated_at = models.DateTimeField('آخرین ویرایش', auto_now=True)

    class Meta:
        verbose_name = 'تنظیم سیستم'
        verbose_name_plural = 'تنظیمات سیستم'
        ordering = ['setting_key']
        db_table = 'system_settings'

    def __str__(self):
        return f"{self.setting_key} = {self.setting_value}"

    @classmethod
    def get_setting(cls, key, default=None):
        """دریافت مقدار تنظیم از دیتابیس"""
        try:
            setting = cls.objects.get(setting_key=key)
            value = setting.setting_value

            if value is None:
                return default

            if setting.setting_type == 'boolean':
                if isinstance(value, bool):
                    return value
                return value.lower() in ('true', '1', 'yes', 'on', 't')
            elif setting.setting_type == 'integer':
                try:
                    return int(value)
                except (ValueError, TypeError):
                    return default
            elif setting.setting_type == 'float':
                try:
                    return float(value)
                except (ValueError, TypeError):
                    return default
            elif setting.setting_type == 'json':
                try:
                    return json.loads(value)
                except (json.JSONDecodeError, TypeError):
                    return default
            else:
                return value

        except cls.DoesNotExist:
            return default

    @classmethod
    def set_setting(cls, key, value, setting_type='string', description='', is_editable=True):
        """تنظیم یا ایجاد مقدار در دیتابیس"""
        setting, created = cls.objects.get_or_create(
            setting_key=key,
            defaults={
                'setting_value': str(value) if value is not None else '',
                'setting_type': setting_type,
                'description': description,
                'is_editable': is_editable
            }
        )

        if not created:
            setting.setting_value = str(value) if value is not None else ''
            setting.setting_type = setting_type
            setting.description = description or setting.description
            setting.is_editable = is_editable
            setting.save()

        return setting

    @classmethod
    def get(cls, key, default=None):
        """نام مستعار برای get_setting (سازگاری با کدهای جدید)"""
        return cls.get_setting(key, default)

    @classmethod
    def set(cls, key, value, setting_type='string', description='', is_editable=True):
        """نام مستعار برای set_setting (سازگاری با کدهای جدید)"""
        return cls.set_setting(key, value, setting_type, description, is_editable)

    @classmethod
    def get_bool(cls, key, default=False):
        """دریافت تنظیم بولی"""
        return cls.get_setting(key, default) in (True, 'true', 'True', '1', 'yes', 'on', 't')

    @classmethod
    def get_int(cls, key, default=0):
        """دریافت تنظیم عددی"""
        try:
            return int(cls.get_setting(key, default))
        except (ValueError, TypeError):
            return default

    @classmethod
    def set_setting(cls, key, value, setting_type='string', description='', is_editable=True):
        """تنظیم یا ایجاد مقدار در دیتابیس"""
        setting, created = cls.objects.get_or_create(
            setting_key=key,
            defaults={
                'setting_value': str(value) if value is not None else '',
                'setting_type': setting_type,
                'description': description,
                'is_editable': is_editable
            }
        )

        if not created:
            setting.setting_value = str(value) if value is not None else ''
            setting.setting_type = setting_type
            setting.description = description or setting.description
            setting.is_editable = is_editable
            setting.save()

        return setting

    @classmethod
    def get(cls, key, default=None):
        """نام مستعار برای get_setting (سازگاری با کدهای جدید)"""
        return cls.get_setting(key, default)

    @classmethod
    def set(cls, key, value, setting_type='string', description='', is_editable=True):
        """نام مستعار برای set_setting (سازگاری با کدهای جدید)"""
        return cls.set_setting(key, value, setting_type, description, is_editable)

    @classmethod
    def get_bool(cls, key, default=False):
        """دریافت تنظیم بولی"""
        return cls.get_setting(key, default) in (True, 'true', 'True', '1', 'yes', 'on', 't')

    @classmethod
    def get_int(cls, key, default=0):
        """دریافت تنظیم عددی"""
        try:
            return int(cls.get_setting(key, default))
        except (ValueError, TypeError):
            return default


class SystemMessage(models.Model):
    message_key = models.CharField('کلید پیام', max_length=100, blank=True)
    title = models.CharField('عنوان', max_length=200)
    message = models.TextField('متن پیام')
    is_active = models.BooleanField('فعال', default=True)
    start_date = models.DateTimeField('تاریخ شروع', blank=True, null=True)
    end_date = models.DateTimeField('تاریخ پایان', blank=True, null=True)
    created_at = models.DateTimeField('تاریخ ثبت', default=timezone.now)
    updated_at = models.DateTimeField('آخرین ویرایش', auto_now=True)

    class Meta:
        verbose_name = 'پیام سیستم'
        verbose_name_plural = 'پیام‌های سیستم'
        ordering = ['-created_at']
        db_table = 'system_messages'

    def __str__(self):
        return self.title

    @classmethod
    def get_active_messages(cls):
        now = timezone.now()
        return cls.objects.filter(
            is_active=True
        ).filter(
            models.Q(start_date__isnull=True) | models.Q(start_date__lte=now)
        ).filter(
            models.Q(end_date__isnull=True) | models.Q(end_date__gte=now)
        )


class AppVersion(models.Model):
    version_number = models.CharField('شماره نسخه', max_length=20)
    release_date = models.DateTimeField('تاریخ انتشار')
    release_notes = models.TextField('یادداشت‌های انتشار')
    is_current = models.BooleanField('نسخه جاری', default=False)
    created_at = models.DateTimeField('تاریخ ثبت', default=timezone.now)
    updated_at = models.DateTimeField('آخرین ویرایش', auto_now=True)

    class Meta:
        verbose_name = 'نسخه نرم‌افزار'
        verbose_name_plural = 'نسخه‌های نرم‌افزار'
        ordering = ['-release_date']
        db_table = 'app_versions'

    def __str__(self):
        return self.version_number

    @classmethod
    def get_current_version(cls):
        return cls.objects.filter(is_current=True).first()

    @classmethod
    def get_recent_versions(cls, limit=15):
        return cls.objects.all().order_by('-release_date')[:limit]


class UserLoginLog(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='login_logs',
        verbose_name='کاربر'
    )
    ip_address = models.CharField('آی‌پی', max_length=45, blank=True, null=True)
    user_agent = models.TextField('مرورگر', blank=True, null=True)
    login_time = models.DateTimeField('زمان ورود', default=timezone.now)
    logout_time = models.DateTimeField('زمان خروج', blank=True, null=True)
    session_duration = models.IntegerField('مدت جلسه (ثانیه)', default=0)
    is_successful = models.BooleanField('موفق', default=True)
    error_message = models.TextField('پیام خطا', blank=True, null=True)

    class Meta:
        verbose_name = 'لاگ ورود'
        verbose_name_plural = 'لاگ‌های ورود'
        ordering = ['-login_time']
        db_table = 'user_login_logs'
        indexes = [
            models.Index(fields=['user', 'login_time']),
            models.Index(fields=['is_successful']),
        ]

    def __str__(self):
        return f"{self.user.phone_number} - {self.login_time}"

    def calculate_session_duration(self):
        if self.logout_time and self.login_time:
            delta = self.logout_time - self.login_time
            self.session_duration = int(delta.total_seconds())
            self.save(update_fields=['session_duration'])
        return self.session_duration


class UserActivityLog(models.Model):
    ACTION_TYPES = [
        ('login', 'ورود'),
        ('logout', 'خروج'),
        ('trade_create', 'ایجاد ترید'),
        ('trade_update', 'ویرایش ترید'),
        ('trade_delete', 'حذف ترید'),
        ('profile_update', 'ویرایش پروفایل'),
        ('subscription_purchase', 'خرید اشتراک'),
        ('message_send', 'ارسال پیام'),
        ('report_view', 'مشاهده گزارش'),
        ('export', 'خروجی گرفتن'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='activity_logs',
        verbose_name='کاربر'
    )
    action_type = models.CharField('نوع اقدام', max_length=30, choices=ACTION_TYPES)
    description = models.TextField('توضیحات', blank=True)
    ip_address = models.CharField('آی‌پی', max_length=45, blank=True, null=True)
    user_agent = models.TextField('مرورگر', blank=True, null=True)
    created_at = models.DateTimeField('تاریخ', default=timezone.now)

    class Meta:
        verbose_name = 'لاگ فعالیت'
        verbose_name_plural = 'لاگ‌های فعالیت'
        ordering = ['-created_at']
        db_table = 'user_activity_logs'
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['action_type']),
        ]

    def __str__(self):
        return f"{self.user.phone_number} - {self.action_type} - {self.created_at}"