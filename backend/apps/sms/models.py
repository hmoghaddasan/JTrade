# backend/apps/sms/models.py
"""
مدل‌های سیستم پیامک JTrade
- ۵ مدل: SmsProviderConfig, SmsMessage, SmsInbox, SmsTemplate, SmsErrorLog
- از IntForeignKey برای FK به users استفاده می‌کنیم تا با int بودن users.id سازگار باشد
"""

from django.db import models
from django.utils import timezone
from django.conf import settings

from .fields import IntForeignKey


# ============================================
# ۱. تنظیمات provider
# ============================================
class SmsProviderConfig(models.Model):
    """تنظیمات هر provider پیامک (قاصدک / sms.ir)"""

    PROVIDER_CHOICES = [
        ('ghasedak', 'قاصدک'),
        ('sms_ir', 'sms.ir'),
    ]

    SEND_METHOD_CHOICES = [
        ('single', 'ارسال تکی (بدون قالب)'),
        ('otp', 'ارسال با قالب (OTP)'),
    ]

    provider = models.CharField(
        'ارائه‌دهنده', max_length=20,
        choices=PROVIDER_CHOICES, unique=True
    )
    provider_display = models.CharField('نام نمایشی', max_length=50, blank=True)
    is_active = models.BooleanField('فعال', default=False)
    is_configured = models.BooleanField('تنظیم شده', default=False)

    api_key = models.CharField('کلید API', max_length=255, blank=True)
    line_number = models.CharField('شماره خط', max_length=30, blank=True)

    send_method = models.CharField(
        'روش ارسال پیش‌فرض', max_length=20,
        choices=SEND_METHOD_CHOICES, default='otp'
    )

    credit = models.IntegerField('اعتبار (ریال)', null=True, blank=True)
    last_checked_at = models.DateTimeField('آخرین بررسی', null=True, blank=True)

    notes = models.TextField('یادداشت', blank=True)

    created_at = models.DateTimeField('تاریخ ثبت', auto_now_add=True)
    updated_at = models.DateTimeField('آخرین ویرایش', auto_now=True)

    class Meta:
        db_table = 'sms_provider_config'
        verbose_name = 'تنظیمات پیامک'
        verbose_name_plural = 'تنظیمات پیامک'
        ordering = ['provider']

    def __str__(self):
        status = '✅' if self.is_active else '⚪'
        return f"{status} {self.provider_display or self.provider}"

    def save(self, *args, **kwargs):
        # اگر این provider فعال می‌شود، بقیه را غیرفعال کن
        if self.is_active:
            SmsProviderConfig.objects.exclude(pk=self.pk).update(is_active=False)
        # اگر نام نمایشی خالی است، از get_provider_display استفاده کن
        if not self.provider_display:
            self.provider_display = self.get_provider_display()
        super().save(*args, **kwargs)

    @classmethod
    def get_active(cls):
        """دریافت provider فعال"""
        return cls.objects.filter(is_active=True, is_configured=True).first()

    @classmethod
    def activate(cls, provider_name):
        """فعال‌سازی یک provider"""
        cls.objects.update(is_active=False)
        config = cls.objects.get(provider=provider_name)
        config.is_active = True
        config.save()
        return config


# ============================================
# ۲. پیام‌های ارسالی
# ============================================
class SmsMessage(models.Model):
    """پیام‌های ارسالی"""

    PROVIDER_CHOICES = [
        ('ghasedak', 'قاصدک'),
        ('sms_ir', 'sms.ir'),
    ]

    SEND_METHOD_CHOICES = [
        ('single', 'تکی'),
        ('otp', 'OTP'),
    ]

    STATUS_CHOICES = [
        ('pending', 'در انتظار'),
        ('sent', 'ارسال شده'),
        ('delivered', 'تحویل شده'),
        ('failed', 'ناموفق'),
        ('blacklist', 'لیست سیاه'),
        ('unknown', 'نامشخص'),
    ]

    PRIORITY_CHOICES = [
        ('normal', 'عادی'),
        ('high', 'بالا'),
        ('critical', 'بحرانی'),
    ]

    provider = models.CharField('ارائه‌دهنده', max_length=20, choices=PROVIDER_CHOICES)
    send_method = models.CharField('روش ارسال', max_length=20, choices=SEND_METHOD_CHOICES, default='otp')

    phone_number = models.CharField('شماره گیرنده', max_length=20, db_index=True)
    message = models.TextField('متن پیام')

    template_name = models.CharField('نام قالب', max_length=100, blank=True)
    event_key = models.CharField('کلید رویداد', max_length=50, blank=True, db_index=True)

    priority = models.CharField('اولویت', max_length=20, choices=PRIORITY_CHOICES, default='normal')
    alert_sent = models.BooleanField('هشدار ارسال شد', default=False)
    alert_sent_via = models.CharField('هشدار از طریق', max_length=20, blank=True, null=True)

    external_id = models.CharField('شناسه در provider', max_length=100, blank=True, db_index=True)
    pack_id = models.CharField('شناسه مجموعه', max_length=100, blank=True)

    status = models.CharField('وضعیت', max_length=20, choices=STATUS_CHOICES, default='pending', db_index=True)
    error_code = models.IntegerField('کد خطا', null=True, blank=True)
    error_message = models.TextField('پیام خطا', blank=True)
    cost = models.IntegerField('هزینه (ریال)', null=True, blank=True)
    response_data = models.JSONField('پاسخ خام provider', default=dict, blank=True)

    user = IntForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='sms_messages',
        verbose_name='کاربر'
    )
    related_object_type = models.CharField('نوع شیء مرتبط', max_length=50, blank=True)
    related_object_id = models.IntegerField('شناسه شیء مرتبط', null=True, blank=True)

    created_at = models.DateTimeField('تاریخ ایجاد', auto_now_add=True, db_index=True)
    sent_at = models.DateTimeField('تاریخ ارسال', null=True, blank=True)
    delivered_at = models.DateTimeField('تاریخ تحویل', null=True, blank=True)
    last_checked_at = models.DateTimeField('آخرین بررسی وضعیت', null=True, blank=True)

    class Meta:
        db_table = 'sms_message'
        verbose_name = 'پیام ارسالی'
        verbose_name_plural = 'پیام‌های ارسالی'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['provider', 'status']),
            models.Index(fields=['user']),
            models.Index(fields=['related_object_type', 'related_object_id']),
        ]

    def __str__(self):
        return f"{self.phone_number} - {self.get_status_display()}"

    @property
    def is_pending(self):
        return self.status == 'pending'

    @property
    def can_check_status(self):
        """آیا می‌توان وضعیت را بررسی کرد؟"""
        if self.status in ('delivered', 'failed', 'blacklist'):
            return False
        if not self.external_id:
            return False
        return True


# ============================================
# ۳. پیام‌های دریافتی
# ============================================
class SmsInbox(models.Model):
    """پیام‌های دریافتی"""

    PROVIDER_CHOICES = [
        ('ghasedak', 'قاصدک'),
        ('sms_ir', 'sms.ir'),
    ]

    provider = models.CharField('ارائه‌دهنده', max_length=20, choices=PROVIDER_CHOICES)
    line_number = models.CharField('خط اختصاصی', max_length=30, blank=True)
    from_number = models.CharField('شماره فرستنده', max_length=20, db_index=True)
    message = models.TextField('متن پیام')

    external_id = models.CharField('شناسه یکتا در provider', max_length=100)

    user = IntForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='sms_inbox',
        verbose_name='کاربر مرتبط'
    )

    is_read = models.BooleanField('خوانده شده', default=False, db_index=True)
    is_flagged = models.BooleanField('علامت‌گذاری', default=False, db_index=True)

    received_at = models.DateTimeField('زمان دریافت', db_index=True)
    raw_data = models.JSONField('داده خام', default=dict, blank=True)

    created_at = models.DateTimeField('تاریخ ثبت', auto_now_add=True)

    class Meta:
        db_table = 'sms_inbox'
        verbose_name = 'پیام دریافتی'
        verbose_name_plural = 'پیام‌های دریافتی'
        ordering = ['-received_at']
        constraints = [
            models.UniqueConstraint(fields=['provider', 'external_id'], name='unique_external_id')
        ]

    def __str__(self):
        return f"{self.from_number} - {self.received_at}"


# ============================================
# ۴. قالب‌های پیامک (سه‌گانه)
# ============================================
class SmsTemplate(models.Model):
    """
    قالب‌های پیامک - برای هر رویداد سه نسخه:
    - قاصدک (OTP با قالب)
    - sms.ir (Verify با template_id)
    - متن تکی (بدون قالب)
    """

    event_key = models.CharField('کلید رویداد', max_length=50, unique=True)
    event_name = models.CharField('نام رویداد', max_length=100)
    description = models.TextField('توضیحات', blank=True)
    SEND_METHOD_CHOICES = [
        ('single', 'ارسال تکی (متن ساده)'),
        ('otp', 'ارسال OTP (با قالب provider)'),
    ]
    send_method = models.CharField(
        'نوع ارسال',
        max_length=20,
        choices=SEND_METHOD_CHOICES,
        default='single',
        help_text='single: متن ساده | otp: قالب provider'
    )
    # قاصدک
    ghasedak_template = models.CharField('نام قالب قاصدک', max_length=100, blank=True)
    ghasedak_params = models.JSONField('پارامترهای قاصدک', default=list, blank=True)

    # sms.ir
    smsir_template_id = models.IntegerField('شناسه قالب sms.ir', null=True, blank=True)
    smsir_params = models.JSONField('پارامترهای sms.ir', default=list, blank=True)

    # متن تکی
    single_message = models.TextField('متن تکی', blank=True)
    single_params = models.JSONField('پارامترهای متن تکی', default=list, blank=True)

    is_active = models.BooleanField('فعال', default=True)
    is_system = models.BooleanField('قالب سیستمی', default=False)

    created_at = models.DateTimeField('تاریخ ثبت', auto_now_add=True)
    updated_at = models.DateTimeField('آخرین ویرایش', auto_now=True)

    class Meta:
        db_table = 'sms_template'
        verbose_name = 'قالب پیامک'
        verbose_name_plural = 'قالب‌های پیامک'
        ordering = ['event_key']

    def __str__(self):
        return f"{self.event_name} ({self.event_key})"

    @classmethod
    def get_by_event(cls, event_key):
        """دریافت قالب با کلید رویداد"""
        try:
            return cls.objects.get(event_key=event_key, is_active=True)
        except cls.DoesNotExist:
            return None

    def render_single(self, context: dict) -> str:
        """رندر متن تکی با متغیرها"""
        text = self.single_message or ''
        for key, value in (context or {}).items():
            text = text.replace(f'{{{key}}}', str(value))
        return text

    def get_ghasedak_params(self, context: dict) -> list:
        """استخراج پارامترهای قاصدک از context"""
        params = []
        for p in (self.ghasedak_params or []):
            params.append(context.get(p, ''))
        return params

    def get_smsir_params(self, context: dict) -> list:
        """استخراج پارامترهای sms.ir از context"""
        result = []
        for p in (self.smsir_params or []):
            # sms.ir پارامترها با نام بزرگ مثل CODE
            key = p.lower() if p.isupper() else p
            result.append({'name': p, 'value': str(context.get(key, ''))})
        return result


# ============================================
# ۵. لاگ خطاها
# ============================================
class SmsErrorLog(models.Model):
    """
    لاگ خطاهای سیستم پیامک
    - هر خطا از providers در اینجا ذخیره می‌شود
    - ادمین می‌تواند در پنل، خطاهای تاریخی را ببیند
    """

    PROVIDER_CHOICES = [
        ('ghasedak', 'قاصدک'),
        ('sms_ir', 'sms.ir'),
    ]

    ERROR_TYPE_CHOICES = [
        ('api_error', 'خطای API'),
        ('network_error', 'خطای شبکه'),
        ('credit_low', 'کمبود اعتبار'),
        ('config_error', 'خطای تنظیمات'),
        ('template_error', 'خطای قالب'),
        ('auth_error', 'خطای احراز هویت'),
        ('rate_limit', 'محدودیت نرخ'),
        ('unknown', 'نامشخص'),
    ]

    SEVERITY_CHOICES = [
        ('low', 'پایین'),
        ('medium', 'متوسط'),
        ('high', 'بالا'),
        ('critical', 'بحرانی'),
    ]

    provider = models.CharField('ارائه‌دهنده', max_length=20, choices=PROVIDER_CHOICES)
    error_type = models.CharField('نوع خطا', max_length=50, choices=ERROR_TYPE_CHOICES, default='unknown')
    error_code = models.CharField('کد خطا', max_length=50, blank=True, null=True)
    error_message = models.TextField('پیام خطا')
    severity = models.CharField('شدت', max_length=20, choices=SEVERITY_CHOICES, default='medium')

    context = models.JSONField('اطلاعات اضافی', default=dict, blank=True)

    sms_message = models.ForeignKey(
        'SmsMessage',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='error_logs',
        verbose_name='پیام مرتبط',
    )

    is_resolved = models.BooleanField('برطرف شده', default=False)
    resolved_at = models.DateTimeField('زمان برطرف', null=True, blank=True)
    resolved_by = IntForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='resolved_sms_errors',
        verbose_name='برطرف‌کننده',
    )
    resolution_note = models.TextField('یادداشت برطرف‌سازی', blank=True)

    admin_notified = models.BooleanField('اطلاع به ادمین', default=False)
    admin_notified_at = models.DateTimeField('زمان اطلاع', null=True, blank=True)
    notified_via_provider = models.CharField('اطلاع از طریق', max_length=20, blank=True, null=True)

    created_at = models.DateTimeField('تاریخ ثبت', auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'sms_error_log'
        verbose_name = 'خطای پیامک'
        verbose_name_plural = 'خطاهای پیامک'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['provider', 'created_at']),
            models.Index(fields=['severity']),
            models.Index(fields=['error_type']),
            models.Index(fields=['is_resolved']),
        ]

    def __str__(self):
        return f"[{self.get_severity_display()}] {self.provider} - {self.error_type} - {self.created_at}"

    def resolve(self, user, note=''):
        """برطرف کردن خطا"""
        self.is_resolved = True
        self.resolved_at = timezone.now()
        self.resolved_by = user
        self.resolution_note = note
        self.save()

