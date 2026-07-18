# models.py
from django.db import models
from django.utils import timezone
from django.conf import settings


class AdminActionLog(models.Model):
    """لاگ اقدامات ادمین"""
    ACTION_TYPES = [
        ('create', 'ایجاد'),
        ('update', 'ویرایش'),
        ('delete', 'حذف'),
        ('view', 'مشاهده'),
        ('export', 'خروجی'),
        ('send_sms', 'ارسال پیامک'),
        ('extend_subscription', 'تمدید اشتراک'),
        ('toggle_user', 'تغییر وضعیت کاربر'),
    ]

    admin = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='admin_actions',
        verbose_name='ادمین'
    )
    action_type = models.CharField('نوع اقدام', max_length=20, choices=ACTION_TYPES)
    target_model = models.CharField('مدل هدف', max_length=50)
    target_id = models.IntegerField('آیدی هدف', null=True, blank=True)
    description = models.TextField('توضیحات')
    ip_address = models.CharField('آی‌پی', max_length=45, blank=True)
    created_at = models.DateTimeField('تاریخ', default=timezone.now)

    class Meta:
        verbose_name = 'لاگ اقدام ادمین'
        verbose_name_plural = 'لاگ‌های اقدام ادمین'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.admin.phone_number} - {self.action_type} - {self.created_at}"