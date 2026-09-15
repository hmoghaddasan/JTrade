# backend/apps/subscriptions/models.py

from django.db import models
from django.utils import timezone
from django.conf import settings
from django.db import transaction
from datetime import timedelta

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

    # ✅ فیلد جدید: توضیحات
    description = models.TextField(
        'توضیحات',
        blank=True,
        null=True,
        help_text='توضیحات و یادداشت‌های مربوط به کد تخفیف'
    )

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
        if self.max_uses <= 0:  # ✅ اگر max_uses صفر یا منفی باشد
            return False
        if self.used_count >= self.max_uses:
            return False
        if self.expires_at and self.expires_at < timezone.now():
            return False
        return True

    def use(self, user, subscription, discount_amount, final_amount):
        """
        ثبت استفاده از کد تخفیف توسط کاربر
        بازگشت: (success, message, usage_record)
        """
        if not self.is_valid():
            return False, 'کد تخفیف نامعتبر است', None

        # ثبت در جدول تاریخچه
        usage = DiscountCodeUsage.objects.create(
            discount_code=self,
            user=user,
            subscription=subscription,
            used_at=timezone.now(),
            discount_amount=discount_amount,
            final_amount=final_amount
        )

        self.used_count += 1

        # اگر به حداکثر استفاده رسید، غیرفعال کن
        if self.max_uses and self.used_count >= self.max_uses:
            self.is_active = False

        self.save()
        return True, 'کد تخفیف با موفقیت ثبت شد', usage


class DiscountCodeUsage(models.Model):
    """تاریخچه استفاده از کدهای تخفیف"""
    discount_code = models.ForeignKey(
        DiscountCode,
        on_delete=models.CASCADE,
        related_name='usages',
        verbose_name='کد تخفیف'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='discount_usages',
        verbose_name='کاربر'
    )
    subscription = models.ForeignKey(
        'UserSubscription',
        on_delete=models.CASCADE,
        related_name='discount_usages',
        verbose_name='اشتراک'
    )
    used_at = models.DateTimeField('زمان استفاده', default=timezone.now)
    discount_amount = models.DecimalField('مبلغ تخفیف', max_digits=10, decimal_places=2)
    final_amount = models.DecimalField('مبلغ نهایی', max_digits=10, decimal_places=2)

    class Meta:
        db_table = 'subscriptions_discountcode_usage'  # ✅ تطابق با SQL
        verbose_name = 'تاریخچه استفاده از تخفیف'
        verbose_name_plural = 'تاریخچه استفاده از تخفیف‌ها'
        ordering = ['-used_at']
        indexes = [
            models.Index(fields=['discount_code', 'user']),
            models.Index(fields=['used_at']),
        ]

    def __str__(self):
        return f"{self.discount_code.code} - {self.user.phone_number} - {self.used_at}"

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

# ============================================
# ✅ سیستم پرداخت کارت به کارت
# ============================================

class PaymentCard(models.Model):
    """
    کارت بانکی برای پرداخت کارت به کارت
    در پنل ادمین قابل مدیریت است.
    """
    card_number = models.CharField('شماره کارت', max_length=20)
    card_holder = models.CharField('نام صاحب کارت', max_length=100)
    bank_name = models.CharField('نام بانک', max_length=100)
    is_active = models.BooleanField('فعال', default=True)
    is_default = models.BooleanField('کارت پیش‌فرض', default=False)
    order_index = models.IntegerField('ترتیب نمایش', default=0)
    usage_count = models.IntegerField('تعداد استفاده', default=0)
    notes = models.TextField('یادداشت', blank=True)
    created_at = models.DateTimeField('تاریخ ثبت', default=timezone.now)
    updated_at = models.DateTimeField('آخرین ویرایش', auto_now=True)

    class Meta:
        db_table = 'subscriptions_paymentcard'
        verbose_name = 'کارت بانکی'
        verbose_name_plural = 'کارت‌های بانکی'
        ordering = ['order_index', '-created_at']
        indexes = [
            models.Index(fields=['is_active']),
            models.Index(fields=['is_default']),
            models.Index(fields=['order_index']),
        ]

    def __str__(self):
        return f"{self.card_holder} - {self.bank_name} - {self.card_number[-4:]}"

    from django.db import transaction

    # ...

    def save(self, *args, **kwargs):
        with transaction.atomic():
            if self.is_default:
                PaymentCard.objects.exclude(pk=self.pk).update(is_default=False)
            if not self.is_active:
                self.is_default = False
            super().save(*args, **kwargs)

            
    @classmethod
    def get_default(cls):
        """دریافت کارت پیش‌فرض"""
        return cls.objects.filter(is_active=True, is_default=True).first()

    @classmethod
    def get_random(cls):
        """انتخاب یک کارت رندوم از کارت‌های فعال"""
        import random
        cards = list(cls.objects.filter(is_active=True))
        if cards:
            return random.choice(cards)
        return None

    @classmethod
    def get_for_payment(cls, mode='random'):
        """
        انتخاب کارت بر اساس حالت:
        - random: رندوم از کارت‌های فعال
        - manual: پیش‌فرض (یا اولی)
        - default: کارت پیش‌فرض
        """
        if mode == 'default':
            return cls.get_default()
        elif mode == 'random':
            return cls.get_random()
        else:  # manual
            return cls.get_default() or cls.objects.filter(is_active=True).first()


class PaymentRequest(models.Model):
    """
    درخواست پرداخت کارت به کارت
    کاربر پلن انتخاب می‌کند → درخواست ثبت می‌شود → فیش ارسال می‌کند → ادمین تأیید/رد می‌کند → تمدید خودکار
    """
    STATUS_CHOICES = [
        ('pending_payment', 'در انتظار واریز'),
        ('awaiting_review', 'در انتظار بررسی'),
        ('approved', 'تأیید شده'),
        ('rejected', 'رد شده'),
        ('expired', 'منقضی شده'),
        ('canceled', 'لغو شده'),
    ]

    # ============================================
    # ارتباط‌ها
    # ============================================
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='payment_requests',
        verbose_name='کاربر'
    )
    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.PROTECT,
        related_name='payment_requests',
        verbose_name='پلن'
    )
    subscription = models.ForeignKey(
        'UserSubscription',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='payment_requests',
        verbose_name='اشتراک'
    )
    discount_code = models.ForeignKey(
        'DiscountCode',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='payment_requests',
        verbose_name='کد تخفیف'
    )

    # ============================================
    # کارت انتخاب‌شده (snapshot)
    # ============================================
    payment_card = models.ForeignKey(
        PaymentCard,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='payment_requests',
        verbose_name='کارت پرداخت'
    )
    destination_card_number = models.CharField('شماره کارت مقصد', max_length=20)
    destination_card_holder = models.CharField('نام صاحب کارت', max_length=100)
    destination_bank_name = models.CharField('نام بانک', max_length=100)

    # ============================================
    # مبلغ
    # ============================================
    unique_code = models.CharField('کد یکتا', max_length=30, unique=True)
    amount = models.DecimalField('مبلغ نهایی', max_digits=12, decimal_places=2)
    original_amount = models.DecimalField('مبلغ اصلی', max_digits=12, decimal_places=2)
    discount_amount = models.DecimalField('مبلغ تخفیف', max_digits=12, decimal_places=2, default=0)

    # ============================================
    # اطلاعات ثبت‌شده توسط کاربر
    # ============================================
    tracking_number = models.CharField('شماره پیگیری', max_length=50, blank=True)
    payer_name = models.CharField('نام واریزکننده', max_length=100, blank=True)
    payer_card_last4 = models.CharField('۴ رقم آخر کارت', max_length=4, blank=True)
    paid_at = models.DateTimeField('زمان واریز', null=True, blank=True)
    receipt_image = models.ImageField(
        'تصویر فیش',
        upload_to='payment_receipts/%Y/%m/',
        null=True, blank=True
    )
    user_note = models.TextField('یادداشت کاربر', blank=True)

    # ============================================
    # وضعیت
    # ============================================
    status = models.CharField(
        'وضعیت', max_length=20,
        choices=STATUS_CHOICES,
        default='pending_payment',
        db_index=True
    )
    reject_reason = models.TextField('دلیل رد', blank=True)

    # ============================================
    # زمان‌ها
    # ============================================
    created_at = models.DateTimeField('تاریخ ایجاد', default=timezone.now, db_index=True)
    expires_at = models.DateTimeField('مهلت پرداخت')
    submitted_at = models.DateTimeField('زمان ثبت فیش', null=True, blank=True)
    reviewed_at = models.DateTimeField('زمان بررسی', null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='reviewed_payment_requests',
        verbose_name='بررسی‌کننده'
    )

    # ============================================
    # اطلاع‌رسانی
    # ============================================
    admin_notified = models.BooleanField('اطلاع به ادمین', default=False)
    admin_notified_at = models.DateTimeField('زمان اطلاع به ادمین', null=True, blank=True)
    user_notified = models.BooleanField('اطلاع به کاربر', default=False)
    user_notified_at = models.DateTimeField('زمان اطلاع به کاربر', null=True, blank=True)
    reminder_sent_at = models.DateTimeField('زمان ارسال یادآوری', null=True, blank=True)

    class Meta:
        db_table = 'subscriptions_paymentrequest'
        verbose_name = 'درخواست پرداخت'
        verbose_name_plural = 'درخواست‌های پرداخت'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['unique_code']),
            models.Index(fields=['expires_at', 'status']),
        ]

    def __str__(self):
        return f"PR#{self.id} - {self.user.phone_number} - {self.get_status_display()}"

    # ============================================
    # متدهای کمکی
    # ============================================
    def is_expired(self):
        """آیا مهلت پرداخت تمام شده؟"""
        return self.status == 'pending_payment' and timezone.now() > self.expires_at

    def is_pending_payment(self):
        return self.status == 'pending_payment'

    def is_awaiting_review(self):
        return self.status == 'awaiting_review'

    def is_approved(self):
        return self.status == 'approved'

    def is_rejected(self):
        return self.status == 'rejected'

    def can_submit_receipt(self):
        """آیا کاربر می‌تواند فیش ثبت کند؟"""
        return self.status == 'pending_payment' and timezone.now() <= self.expires_at

    def can_cancel(self):
        """آیا کاربر می‌تواند لغو کند؟"""
        return self.status in ('pending_payment', 'awaiting_review')

    def get_remaining_seconds(self):
        """ثانیه‌های باقیمانده تا انقضا"""
        if self.status != 'pending_payment':
            return 0
        delta = self.expires_at - timezone.now()
        return max(0, int(delta.total_seconds()))

    # ============================================
    # تولید کد یکتا
    # ============================================
    @classmethod
    def generate_unique_code(cls):
        """تولید کد یکتای کوتاه برای درخواست پرداخت"""
        import uuid
        from datetime import datetime
        # PR-YYYYMMDD-XXXX (XXXX = 4 کاراکتر رندوم)
        timestamp = datetime.now().strftime('%Y%m%d')
        random_part = uuid.uuid4().hex[:6].upper()
        return f"PR-{timestamp}-{random_part}"

    # ============================================
    # Submit receipt
    # ============================================
    def submit_receipt(self, tracking_number, payer_name='', payer_card_last4='',
                       paid_at=None, receipt_image=None, user_note=''):
        """
        ثبت اطلاعات فیش توسط کاربر
        وضعیت از pending_payment به awaiting_review تغییر می‌کند
        """
        if not self.can_submit_receipt():
            return False, 'امکان ثبت فیش در این وضعیت وجود ندارد'

        self.tracking_number = tracking_number
        self.payer_name = payer_name
        self.payer_card_last4 = payer_card_last4
        self.paid_at = paid_at
        self.user_note = user_note
        if receipt_image:
            self.receipt_image = receipt_image
        self.status = 'awaiting_review'
        self.submitted_at = timezone.now()
        self.save()

        # افزایش شمارنده استفاده کارت
        if self.payment_card:
            self.payment_card.usage_count = models.F('usage_count') + 1
            self.payment_card.save(update_fields=['usage_count'])

        return True, 'اطلاعات فیش با موفقیت ثبت شد'

    # ============================================
    # Approve (ادمین)
    # ============================================
    @transaction.atomic
    def approve(self, admin_user):
        """
        تأیید درخواست توسط ادمین:
        1. تغییر وضعیت به approved
        2. تمدید خودکار اشتراک
        3. ارسال پیامک به کاربر
        """
        if self.status != 'awaiting_review':
            return False, 'فقط درخواست‌های در انتظار بررسی قابل تأیید هستند', None

        self.status = 'approved'
        self.reviewed_by = admin_user
        self.reviewed_at = timezone.now()
        self.save()

        # تمدید اشتراک
        subscription = self._renew_subscription()

        return True, 'پرداخت با موفقیت تأیید شد', subscription

    def _renew_subscription(self):
        """تمدید یا ایجاد اشتراک بر اساس این پرداخت"""
        user = self.user
        plan = self.plan

        # بررسی اشتراک فعال فعلی
        existing_subscription = UserSubscription.objects.filter(
            user=user,
            is_active=True,
            end_date__gt=timezone.now()
        ).order_by('-end_date').first()

        now = timezone.now()

        if existing_subscription and not self._should_create_new_subscription(existing_subscription):
            # تمدید اشتراک موجود
            existing_subscription.end_date += timedelta(days=plan.duration_days)
            existing_subscription.payment_status = 'paid'
            existing_subscription.payment_reference = self.unique_code
            existing_subscription.amount_paid = self.amount
            existing_subscription.is_active = True
            # افزایش محدودیت‌ها
            existing_subscription.trades_limit += plan.monthly_trades_limit
            existing_subscription.ai_consultations_limit += plan.monthly_ai_consultations_limit
            existing_subscription.save()

            self.subscription = existing_subscription
            self.save(update_fields=['subscription'])
            return existing_subscription
        else:
            # ایجاد اشتراک جدید
            subscription = UserSubscription.objects.create(
                user=user,
                plan=plan,
                discount_code=self.discount_code,
                start_date=now,
                end_date=now + timedelta(days=plan.duration_days),
                is_active=True,
                trades_limit=plan.monthly_trades_limit,
                ai_consultations_limit=plan.monthly_ai_consultations_limit,
                trades_used=0,
                ai_consultations_used=0,
                is_trial=False,
                payment_status='paid',
                payment_reference=self.unique_code,
                amount_paid=self.amount,
            )
            self.subscription = subscription
            self.save(update_fields=['subscription'])
            return subscription

    def _should_create_new_subscription(self, existing):
        """آیا باید اشتراک جدید ایجاد شود یا تمدید؟"""
        # اگر پلن کاربر با پلن جدید متفاوت است، اشتراک جدید بساز
        if existing.plan_id != self.plan_id:
            return True
        # در غیر این صورت، تمدید کن
        return False

    # ============================================
    # Reject (ادمین)
    # ============================================
    def reject(self, admin_user, reason):
        """رد درخواست توسط ادمین"""
        if self.status != 'awaiting_review':
            return False, 'فقط درخواست‌های در انتظار بررسی قابل رد هستند'

        self.status = 'rejected'
        self.reject_reason = reason
        self.reviewed_by = admin_user
        self.reviewed_at = timezone.now()
        self.save()

        return True, 'پرداخت رد شد'

    # ============================================
    # Cancel (کاربر)
    # ============================================
    def cancel(self):
        """لغو درخواست توسط کاربر"""
        if not self.can_cancel():
            return False, 'امکان لغو در این وضعیت وجود ندارد'

        self.status = 'canceled'
        self.save()
        return True, 'درخواست لغو شد'

    # ============================================
    # Expire (Celery Task)
    # ============================================
    def mark_as_expired(self):
        """علامت‌گذاری به عنوان منقضی"""
        if self.status != 'pending_payment':
            return False
        self.status = 'expired'
        self.save(update_fields=['status'])
        return True