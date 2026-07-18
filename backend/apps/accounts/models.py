# apps/accounts/models.py

from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.utils import timezone
import json


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
        # فیلدهای اجباری برای سوپر یوزر
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

    # فیلدهای وضعیت
    is_active = models.BooleanField('فعال', default=True)
    is_admin = models.BooleanField('مدیر', default=False)
    is_verified = models.BooleanField('تایید شده', default=False)

    # فیلدهای تایید
    verification_code = models.CharField('کد تایید', max_length=10, blank=True, null=True)
    verification_expiry = models.DateTimeField('انقضای کد تایید', blank=True, null=True)

    # فیلدهای توکن
    login_token = models.CharField('توکن ورود', max_length=255, blank=True, null=True)
    login_token_expiry = models.DateTimeField('انقضای توکن ورود', blank=True, null=True)

    # فیلدهای زمانی
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
        """برای سازگاری با Django Admin"""
        return self.is_admin

    def has_perm(self, perm, obj=None):
        return self.is_admin

    def has_module_perms(self, app_label):
        return self.is_admin

    def get_active_subscription(self):
        """دریافت اشتراک فعال کاربر"""
        from apps.subscriptions.models import UserSubscription
        return self.user_subscriptions.filter(
            is_active=True,
            end_date__gt=timezone.now()
        ).first()

    def has_active_subscription(self):
        """بررسی وجود اشتراک فعال"""
        return self.get_active_subscription() is not None

    def get_remaining_trades(self):
        """دریافت تعداد ترید باقیمانده"""
        subscription = self.get_active_subscription()
        if not subscription:
            return 0
        return max(0, subscription.trades_limit - subscription.trades_used)

    def can_trade(self):
        """بررسی امکان انجام ترید جدید"""
        subscription = self.get_active_subscription()
        if not subscription:
            return False
        return self.get_remaining_trades() > 0

    def get_subscription_expiry(self):
        """دریافت تاریخ انقضای اشتراک"""
        subscription = self.get_active_subscription()
        if not subscription:
            return None
        return subscription.end_date


class SystemSetting(models.Model):
    """تنظیمات سیستم"""
    setting_key = models.CharField('کلید تنظیم', max_length=100, unique=True)
    setting_value = models.TextField('مقدار تنظیم', blank=True, null=True)
    setting_type = models.CharField('نوع تنظیم', max_length=20, default='string')
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
        """دریافت مقدار یک تنظیم با مدیریت نوع"""
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
        """تنظیم مقدار یک تنظیم"""
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


class SystemMessage(models.Model):
    """پیام‌های سیستم"""
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
        """دریافت پیام‌های فعال سیستم"""
        now = timezone.now()
        return cls.objects.filter(
            is_active=True
        ).filter(
            models.Q(start_date__isnull=True) | models.Q(start_date__lte=now)
        ).filter(
            models.Q(end_date__isnull=True) | models.Q(end_date__gte=now)
        )


class AppVersion(models.Model):
    """نسخه‌های نرم‌افزار"""
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
        """دریافت نسخه جاری"""
        return cls.objects.filter(is_current=True).first()

    @classmethod
    def get_recent_versions(cls, limit=15):
        """دریافت آخرین نسخه‌ها"""
        return cls.objects.all().order_by('-release_date')[:limit]


class UserLoginLog(models.Model):
    """لاگ ورود کاربران"""
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
        """محاسبه مدت زمان جلسه"""
        if self.logout_time and self.login_time:
            delta = self.logout_time - self.login_time
            self.session_duration = int(delta.total_seconds())
            self.save(update_fields=['session_duration'])
        return self.session_duration


class UserActivityLog(models.Model):
    """لاگ فعالیت‌های کاربران"""
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