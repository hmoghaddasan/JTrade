# backend/apps/subscriptions/tasks.py
"""
Celery Tasks برای سیستم پرداخت کارت به کارت
- منقضی کردن درخواست‌های گذشته
- ارسال یادآوری ۱۰ دقیقه قبل از انقضا
"""

import logging
from datetime import timedelta
from celery import shared_task
from django.utils import timezone
from django.db import transaction
from django.db.models import Q
# ============================================
# ✅ Import SmsService
# ============================================
try:
    from apps.sms.services import SmsService
    SMS_SERVICE_AVAILABLE = True
except ImportError:
    SMS_SERVICE_AVAILABLE = False
    SmsService = None

logger = logging.getLogger(__name__)


# ============================================
# ✅ ارسال پیامک ایمن
# ============================================
def _send_sms_safe(event_key, phone_number, context, user=None):
    """ارسال ایمن پیامک با try/except"""
    try:
        from apps.sms.services import SmsService
        sms_service = SmsService()
        return sms_service.send_event(
            event_key=event_key,
            phone_number=phone_number,
            context=context,
            user=user,
        )
    except Exception as e:
        logger.error(f"❌ Error sending SMS ({event_key}) to {phone_number}: {str(e)}")
        return None


# ============================================
# ۱. منقضی کردن درخواست‌های گذشته
# ============================================
@shared_task(name='subscriptions.expire_payment_requests')
def expire_payment_requests():
    """
    منقضی کردن درخواست‌های پرداخت که مهلت آن‌ها تمام شده
    - وضعیت: pending_payment → expired
    - پیامک به کاربر
    """
    from .models import PaymentRequest

    now = timezone.now()

    # یافتن درخواست‌های منقضی
    expired_requests = PaymentRequest.objects.filter(
        status='pending_payment',
        expires_at__lt=now
    )

    count = 0
    for payment_request in expired_requests:
        try:
            with transaction.atomic():
                success = payment_request.mark_as_expired()
                if success:
                    count += 1
                    logger.info(f"⏰ PaymentRequest #{payment_request.id} marked as expired")

                    # پیامک به کاربر
                    user_name = (
                            payment_request.user.get_full_name()
                            or payment_request.user.phone_number
                    )
                    _send_sms_safe(
                        event_key='payment_expired',
                        phone_number=payment_request.user.phone_number,
                        context={'user_name': user_name},
                        user=payment_request.user,
                    )
        except Exception as e:
            logger.error(f"❌ Error expiring PaymentRequest #{payment_request.id}: {str(e)}")

    logger.info(f"✅ Expired {count} payment requests")
    return {'expired_count': count}


# ============================================
# ۲. ارسال یادآوری قبل از انقضا
# ============================================
@shared_task(name='subscriptions.send_payment_reminders')
def send_payment_reminders():
    """
    ارسال یادآوری به کاربرانی که مهلت پرداختشان نزدیک است (۱۰ دقیقه)
    - فقط برای وضعیت pending_payment
    - فقط اگر یادآوری قبلاً ارسال نشده باشد
    """
    from .models import PaymentRequest
    from apps.accounts.models import SystemSetting

    now = timezone.now()
    reminder_minutes = SystemSetting.get_int('payment_request_reminder_minutes', 10)
    reminder_threshold = now + timedelta(minutes=reminder_minutes)

    # یافتن درخواست‌هایی که به زودی منقضی می‌شوند و یادآوری نگرفته‌اند
    requests_to_remind = PaymentRequest.objects.filter(
        status='pending_payment',
        expires_at__gt=now,
        expires_at__lte=reminder_threshold,
        reminder_sent_at__isnull=True,
    )

    count = 0
    for payment_request in requests_to_remind:
        try:
            user_name = (
                    payment_request.user.get_full_name()
                    or payment_request.user.phone_number
            )
            remaining_minutes = max(
                1, int((payment_request.expires_at - now).total_seconds() / 60)
            )

            # استفاده از قالب پیامک payment_request_created با هشدار یادآوری
            # (می‌توانید قالب جداگانه بسازید، فعلاً از همان استفاده می‌کنیم)
            _send_sms_safe(
                event_key='payment_request_created',
                phone_number=payment_request.user.phone_number,
                context={
                    'user_name': user_name,
                    'amount': f"{int(payment_request.amount):,}",
                    'card_number': payment_request.destination_card_number,
                    'deadline': f"{remaining_minutes} دقیقه دیگر",
                },
                user=payment_request.user,
            )

            payment_request.reminder_sent_at = now
            payment_request.save(update_fields=['reminder_sent_at'])
            count += 1

            logger.info(f"🔔 Reminder sent for PaymentRequest #{payment_request.id}")
        except Exception as e:
            logger.error(f"❌ Error sending reminder for #{payment_request.id}: {str(e)}")

    logger.info(f"✅ Sent {count} payment reminders")
    return {'reminder_count': count}
# tasks.py


# ============================================
# ۳. گزارش روزانه/ماهانه به ادمین
# ============================================
@shared_task(name='subscriptions.send_daily_sales_summary')
def send_daily_sales_summary():
    """
    ارسال گزارش سرجمع روز و ماه به ادمین
    - این Task باید هر شب ساعت ۲۳:۵۹ اجرا شود
    - از طریق CELERY_BEAT_SCHEDULE یا Management Command
    """
    from apps.accounts.models import SystemSetting
    from apps.subscriptions.models import Transaction, UserSubscription
    from django.db.models import Sum, Count

    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # آمار امروز
    today_stats = Transaction.objects.filter(
        payment_status='paid',
        created_at__gte=today_start,
    ).aggregate(count=Count('id'), amount=Sum('total_amount'))

    # آمار این ماه
    month_stats = Transaction.objects.filter(
        payment_status='paid',
        created_at__gte=month_start,
    ).aggregate(count=Count('id'), amount=Sum('total_amount'))

    today_count = today_stats['count'] or 0
    today_amount = float(today_stats['amount'] or 0)
    month_count = month_stats['count'] or 0
    month_amount = float(month_stats['amount'] or 0)

    # ارسال پیامک
    if SMS_SERVICE_AVAILABLE and SmsService:
        try:
            sms_service = SmsService()
            result = sms_service.send_admin_daily_summary(
                today_count=today_count,
                today_amount=today_amount,
                month_count=month_count,
                month_amount=month_amount,
            )
            logger.info(f"✅ Daily summary sent: {result}")
            return {
                'success': True,
                'today_count': today_count,
                'today_amount': today_amount,
                'month_count': month_count,
                'month_amount': month_amount,
            }
        except Exception as e:
            logger.error(f"❌ Error sending daily summary: {str(e)}")
            return {'success': False, 'error': str(e)}

    return {'success': False, 'error': 'sms_service_unavailable'}