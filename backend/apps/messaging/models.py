# backend/apps/messaging/models.py

from django.db import models
from django.utils import timezone
from django.conf import settings


class UserMessage(models.Model):
    """پیام‌های کاربران - سیستم پیام‌رسانی مشابه آپ‌چت"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='messages',
        verbose_name='کاربر'
    )
    subject = models.CharField('موضوع', max_length=200)
    message = models.TextField('متن پیام')
    is_read = models.BooleanField('خوانده شده توسط کاربر', default=False)
    is_read_by_admin = models.BooleanField('خوانده شده توسط ادمین', default=False)
    is_replied = models.BooleanField('پاسخ داده شده', default=False)
    reply_message = models.TextField('پاسخ', blank=True)
    reply_date = models.DateTimeField('تاریخ پاسخ', null=True, blank=True)
    replied_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='replied_messages',
        verbose_name='پاسخ دهنده'
    )
    has_new_reply = models.BooleanField('پاسخ جدید', default=False)
    created_at = models.DateTimeField('تاریخ ثبت', default=timezone.now)
    updated_at = models.DateTimeField('آخرین ویرایش', auto_now=True)

    class Meta:
        verbose_name = 'پیام کاربر'
        verbose_name_plural = 'پیام‌های کاربران'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['is_read_by_admin']),
            models.Index(fields=['has_new_reply']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.user.phone_number} - {self.subject[:30]}"

    def mark_as_read(self):
        """علامت‌گذاری به عنوان خوانده شده توسط کاربر"""
        if not self.is_read:
            self.is_read = True
            self.save(update_fields=['is_read'])

    def mark_as_read_by_admin(self):
        """علامت‌گذاری به عنوان خوانده شده توسط ادمین"""
        if not self.is_read_by_admin:
            self.is_read_by_admin = True
            self.save(update_fields=['is_read_by_admin'])

    def mark_new_reply_as_read(self):
        """علامت‌گذاری پاسخ جدید به عنوان خوانده شده"""
        if self.has_new_reply:
            self.has_new_reply = False
            self.save(update_fields=['has_new_reply'])

    def reply(self, reply_message, admin_user):
        """پاسخ به پیام"""
        self.reply_message = reply_message
        self.is_replied = True
        self.reply_date = timezone.now()
        self.replied_by = admin_user
        self.has_new_reply = True
        self.save(update_fields=['reply_message', 'is_replied', 'reply_date', 'replied_by', 'has_new_reply'])


class SystemMessage(models.Model):
    """پیام‌های سیستم (برای نمایش در صفحه اول)"""
    message_key = models.CharField('کلید پیام', max_length=100, blank=True)
    title = models.CharField('عنوان', max_length=200)
    message = models.TextField('متن پیام')
    is_active = models.BooleanField('فعال', default=True)
    is_global = models.BooleanField('عمومی', default=True)
    start_date = models.DateTimeField('تاریخ شروع', null=True, blank=True)
    end_date = models.DateTimeField('تاریخ پایان', null=True, blank=True)
    created_at = models.DateTimeField('تاریخ ثبت', default=timezone.now)
    updated_at = models.DateTimeField('آخرین ویرایش', auto_now=True)

    class Meta:
        verbose_name = 'پیام سیستم'
        verbose_name_plural = 'پیام‌های سیستم'
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    @classmethod
    def get_active_messages(cls):
        """دریافت پیام‌های فعال"""
        now = timezone.now()
        return cls.objects.filter(
            is_active=True
        ).filter(
            models.Q(start_date__isnull=True) | models.Q(start_date__lte=now)
        ).filter(
            models.Q(end_date__isnull=True) | models.Q(end_date__gte=now)
        )


class SupportInfo(models.Model):
    """اطلاعات پشتیبانی (قابل ویرایش توسط ادمین)"""
    title = models.CharField('عنوان', max_length=200, default='ارتباط با پشتیبانی')
    description = models.TextField('توضیحات', blank=True)
    phone = models.CharField('تلفن', max_length=20, blank=True)
    email = models.EmailField('ایمیل', blank=True)
    address = models.TextField('آدرس', blank=True)
    working_hours = models.CharField('ساعات کاری', max_length=100, blank=True)
    is_active = models.BooleanField('فعال', default=True)
    created_at = models.DateTimeField('تاریخ ثبت', default=timezone.now)
    updated_at = models.DateTimeField('آخرین ویرایش', auto_now=True)

    class Meta:
        verbose_name = 'اطلاعات پشتیبانی'
        verbose_name_plural = 'اطلاعات پشتیبانی'

    def __str__(self):
        return self.title

    @classmethod
    def get_active_info(cls):
        """دریافت اطلاعات فعال پشتیبانی"""
        return cls.objects.filter(is_active=True).first()


class SMSLog(models.Model):
    """لاگ پیامک‌های ارسال شده"""
    phone_number = models.CharField('شماره تلفن', max_length=15)
    message = models.TextField('متن پیام')
    status = models.CharField('وضعیت', max_length=20, default='pending')
    response = models.TextField('پاسخ', blank=True)
    sent_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sent_sms_logs',
        verbose_name='ارسال کننده'
    )
    is_bulk = models.BooleanField('ارسال گروهی', default=False)
    recipients_count = models.IntegerField('تعداد گیرندگان', default=0)
    created_at = models.DateTimeField('تاریخ ارسال', default=timezone.now)

    class Meta:
        verbose_name = 'لاگ پیامک'
        verbose_name_plural = 'لاگ‌های پیامک'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.phone_number} - {self.created_at}"