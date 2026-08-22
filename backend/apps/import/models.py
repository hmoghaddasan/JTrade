from django.db import models
from django.conf import settings
from django.utils import timezone


class ImportMapping(models.Model):
    """
    نگاشت ستون‌های CSV به فیلدهای مدل Trade برای هر کاربر و کارگزار
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='import_mappings',
        verbose_name='کاربر'
    )
    broker_name = models.CharField(
        'نام کارگزار',
        max_length=100,
        blank=True,
        help_text='نام کارگزاری که این mapping برای آن ذخیره شده (مثلاً MetaTrader 4)'
    )
    column_mapping = models.JSONField(
        'نگاشت ستون‌ها',
        default=dict,
        help_text='دیکشنری نگاشت: {"filed_model": "نام_ستون_در_CSV"}'
    )
    is_default = models.BooleanField('پیش‌فرض', default=False)
    created_at = models.DateTimeField('تاریخ ثبت', auto_now_add=True)
    updated_at = models.DateTimeField('آخرین ویرایش', auto_now=True)

    class Meta:
        verbose_name = 'نگاشت CSV'
        verbose_name_plural = 'نگاشت‌های CSV'
        unique_together = [['user', 'broker_name']]
        ordering = ['-is_default', 'broker_name']
        indexes = [
            models.Index(fields=['user', 'broker_name']),
            models.Index(fields=['user', 'is_default']),
        ]

    def __str__(self):
        return f"{self.user.phone_number} - {self.broker_name or 'پیش‌فرض'}"


class ImportLog(models.Model):
    """
    ثبت تاریخچه واردات (audit trail)
    """
    STATUS_CHOICES = [
        ('pending', 'در انتظار'),
        ('processing', 'در حال پردازش'),
        ('completed', 'تکمیل‌شده'),
        ('failed', 'خطا'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='import_logs',
        verbose_name='کاربر'
    )
    source = models.CharField(
        'منبع',
        max_length=50,
        choices=[('api', 'API همگام‌سازی'), ('csv', 'آپلود CSV')],
        default='csv'
    )
    file_name = models.CharField('نام فایل', max_length=255, blank=True)
    file_size = models.IntegerField('حجم فایل (بایت)', default=0)
    status = models.CharField('وضعیت', max_length=20, choices=STATUS_CHOICES, default='pending')
    trades_imported = models.IntegerField('تعداد تریدهای واردشده', default=0)
    trades_skipped = models.IntegerField('تعداد تریدهای تکراری', default=0)
    errors = models.JSONField('خطاها', default=list)
    warnings = models.JSONField('هشدارها', default=list)
    started_at = models.DateTimeField('زمان شروع', auto_now_add=True)
    completed_at = models.DateTimeField('زمان پایان', null=True, blank=True)

    class Meta:
        verbose_name = 'لاگ واردات'
        verbose_name_plural = 'لاگ‌های واردات'
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['user', 'started_at']),
            models.Index(fields=['user', 'status']),
        ]

    def __str__(self):
        return f"{self.user.phone_number} - {self.source} - {self.started_at.strftime('%Y-%m-%d %H:%M')}"

    def mark_completed(self, imported, skipped, errors=None, warnings=None):
        self.status = 'completed'
        self.trades_imported = imported
        self.trades_skipped = skipped
        if errors is not None:
            self.errors = errors
        if warnings is not None:
            self.warnings = warnings
        self.completed_at = timezone.now()
        self.save()

    def mark_failed(self, error_message):
        self.status = 'failed'
        self.errors.append(str(error_message))
        self.completed_at = timezone.now()
        self.save()