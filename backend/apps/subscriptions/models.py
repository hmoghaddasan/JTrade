# backend/apps/subscriptions/models.py

from django.db import models
from django.utils import timezone
from django.conf import settings


class SMSLog(models.Model):
    """لاگ پیامک‌ها"""
    phone_number = models.CharField('شماره تلفن', max_length=15)
    message = models.TextField('متن پیام')
    status = models.CharField('وضعیت', max_length=20, default='pending')
    response = models.TextField('پاسخ', blank=True)
    created_at = models.DateTimeField('تاریخ ارسال', default=timezone.now)

    class Meta:
        verbose_name = 'لاگ پیامک'
        verbose_name_plural = 'لاگ‌های پیامک'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.phone_number} - {self.created_at}"


class SubscriptionPlan(models.Model):
    """پلن اشتراک"""
    PLAN_TYPES = [
        ('basic', 'پایه'),
        ('professional', 'حرفه‌ای'),
        ('vip', 'VIP'),
        ('admin', 'ادمین'),
    ]

    plan_name = models.CharField('نام پلن', max_length=50)
    plan_type = models.CharField('نوع پلن', max_length=20, choices=PLAN_TYPES, default='basic')
    duration_days = models.IntegerField('مدت زمان (روز)')
    monthly_trades_limit = models.IntegerField('محدودیت ترید ماهانه', default=0)
    monthly_ai_consultations_limit = models.IntegerField('محدودیت مشاوره AI ماهانه', default=0)
    price = models.DecimalField('قیمت', max_digits=10, decimal_places=2)
    is_active = models.BooleanField('فعال', default=True)
    description = models.TextField('توضیحات', blank=True)
    created_at = models.DateTimeField('تاریخ ثبت', default=timezone.now)
    updated_at = models.DateTimeField('آخرین ویرایش', auto_now=True)

    class Meta:
        verbose_name = 'پلن اشتراک'
        verbose_name_plural = 'پلن‌های اشتراک'
        ordering = ['price']

    def __str__(self):
        return f"{self.plan_name} - {self.duration_days} روز"


class DiscountCode(models.Model):
    """کد تخفیف"""
    code = models.CharField('کد', max_length=50, unique=True)
    discount_percent = models.DecimalField('درصد تخفیف', max_digits=5, decimal_places=2)
    max_uses = models.IntegerField('حداکثر استفاده', default=1)
    used_count = models.IntegerField('تعداد استفاده', default=0)
    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='discount_codes',
        verbose_name='پلن اختصاصی'
    )
    is_active = models.BooleanField('فعال', default=True)
    expires_at = models.DateTimeField('تاریخ انقضا', null=True, blank=True)
    created_at = models.DateTimeField('تاریخ ثبت', default=timezone.now)
    updated_at = models.DateTimeField('آخرین ویرایش', auto_now=True)

    class Meta:
        verbose_name = 'کد تخفیف'
        verbose_name_plural = 'کدهای تخفیف'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.code} - {self.discount_percent}%"

    def is_valid(self):
        """بررسی اعتبار کد"""
        if not self.is_active:
            return False
        if self.max_uses and self.used_count >= self.max_uses:
            return False
        if self.expires_at and self.expires_at < timezone.now():
            return False
        return True


class UserSubscription(models.Model):
    """اشتراک کاربر"""
    PAYMENT_STATUS = [
        ('pending', 'در انتظار پرداخت'),
        ('paid', 'پرداخت شده'),
        ('failed', 'ناموفق'),
        ('refunded', 'بازگشت وجه'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='user_subscriptions',
        verbose_name='کاربر'
    )
    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.CASCADE,
        related_name='subscriptions',
        verbose_name='پلن'
    )
    discount_code = models.ForeignKey(
        DiscountCode,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='used_subscriptions',
        verbose_name='کد تخفیف'
    )
    start_date = models.DateTimeField('تاریخ شروع')
    end_date = models.DateTimeField('تاریخ پایان')
    is_active = models.BooleanField('فعال', default=True)

    # تریدها
    trades_used = models.IntegerField('تریدهای استفاده شده', default=0)
    trades_limit = models.IntegerField('محدودیت ترید', default=0)

    # مشاوره AI
    ai_consultations_used = models.IntegerField('مشاوره‌های استفاده شده', default=0)
    ai_consultations_limit = models.IntegerField('محدودیت مشاوره AI', default=0)

    is_trial = models.BooleanField('آزمایشی', default=False)
    payment_status = models.CharField('وضعیت پرداخت', max_length=20, choices=PAYMENT_STATUS, default='pending')
    payment_reference = models.CharField('مرجع پرداخت', max_length=100, blank=True, null=True)
    amount_paid = models.DecimalField('مبلغ پرداختی', max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField('تاریخ ثبت', default=timezone.now)
    updated_at = models.DateTimeField('آخرین ویرایش', auto_now=True)

    class Meta:
        verbose_name = 'اشتراک کاربر'
        verbose_name_plural = 'اشتراک‌های کاربران'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.phone_number} - {self.plan.plan_name}"

    def get_remaining_days(self):
        """دریافت روزهای باقیمانده"""
        now = timezone.now()
        if self.end_date > now:
            return (self.end_date - now).days
        return 0

    def get_remaining_trades(self):
        """دریافت تعداد ترید باقیمانده"""
        if self.plan.plan_type == 'admin':
            return 999999
        return max(0, self.trades_limit - self.trades_used)

    def get_remaining_ai_consultations(self):
        """دریافت تعداد مشاوره AI باقیمانده"""
        if self.plan.plan_type == 'admin':
            return 999999
        return max(0, self.ai_consultations_limit - self.ai_consultations_used)

    def can_trade(self):
        """بررسی امکان ترید"""
        if self.plan.plan_type == 'admin':
            return self.is_active and self.end_date > timezone.now()
        return self.is_active and self.end_date > timezone.now() and self.get_remaining_trades() > 0

    def can_consult_ai(self):
        """بررسی امکان مشاوره AI"""
        if self.plan.plan_type == 'admin':
            return self.is_active and self.end_date > timezone.now()
        return self.is_active and self.end_date > timezone.now() and self.get_remaining_ai_consultations() > 0

    def use_trade(self):
        """استفاده از یک ترید (افزایش شمارنده)"""
        if self.plan.plan_type == 'admin':
            return True
        if self.can_trade():
            self.trades_used += 1
            self.save()
            return True
        return False

    def use_ai_consultation(self):
        """استفاده از یک مشاوره AI (افزایش شمارنده)"""
        if self.plan.plan_type == 'admin':
            return True
        if self.can_consult_ai():
            self.ai_consultations_used += 1
            self.save()
            return True
        return False


class Transaction(models.Model):
    """تراکنش مالی"""
    PAYMENT_METHODS = [
        ('zarinpal', 'زرین‌پال'),
        ('bank', 'بانک'),
        ('wallet', 'کیف پول'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='transactions',
        verbose_name='کاربر'
    )
    subscription = models.ForeignKey(
        UserSubscription,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transactions',
        verbose_name='اشتراک'
    )
    amount = models.DecimalField('مبلغ', max_digits=10, decimal_places=2)
    vat_amount = models.DecimalField('مالیات', max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField('مبلغ کل', max_digits=10, decimal_places=2)
    payment_method = models.CharField('روش پرداخت', max_length=20, choices=PAYMENT_METHODS, default='zarinpal')
    payment_status = models.CharField('وضعیت پرداخت', max_length=20, choices=UserSubscription.PAYMENT_STATUS,
                                      default='pending')
    payment_reference = models.CharField('مرجع پرداخت', max_length=100, blank=True, null=True)
    description = models.TextField('توضیحات', blank=True)
    created_at = models.DateTimeField('تاریخ ثبت', default=timezone.now)
    updated_at = models.DateTimeField('آخرین ویرایش', auto_now=True)

    class Meta:
        verbose_name = 'تراکنش'
        verbose_name_plural = 'تراکنش‌ها'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.phone_number} - {self.total_amount} تومان"

# توجه: کلاس SMSLog قبلاً تعریف شده، اما تکرار نشود
# اگر قبلاً در بالای فایل تعریف شده، این بخش را حذف کنید
# اما برای اطمینان، فقط یک بار تعریف می‌کنیم