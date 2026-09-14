# backend/apps/sms/tasks.py
"""
Celery tasks برای سیستم پیامک
- این task‌ها فقط زمانی اجرا می‌شوند که Celery + Redis راه‌اندازی شده باشند
- برای محیط توسعه، از management commands استفاده کنید
"""

import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name='sms.check_pending_status', bind=True, max_retries=3)
def check_pending_status_task(self, batch_size: int = 50):
    """
    بررسی وضعیت پیام‌های pending
    اجرا: هر ۵ دقیقه (در Celery Beat)
    """
    try:
        from .services import SmsService
        service = SmsService()
        result = service.check_pending_status(batch_size=batch_size)
        logger.info(f"✅ check_pending_status: {result}")
        return result
    except Exception as e:
        logger.exception(f"❌ check_pending_status_task error: {e}")
        raise self.retry(exc=e, countdown=60)


@shared_task(name='sms.fetch_inbox', bind=True, max_retries=3)
def fetch_inbox_task(self):
    """
    دریافت پیام‌های جدید از provider
    اجرا: هر ۵ دقیقه (در Celery Beat)
    """
    try:
        from .services import SmsService
        service = SmsService()
        result = service.fetch_inbox()
        logger.info(f"✅ fetch_inbox: {result}")
        return result
    except Exception as e:
        logger.exception(f"❌ fetch_inbox_task error: {e}")
        raise self.retry(exc=e, countdown=60)