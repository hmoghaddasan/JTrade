from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
import logging

from .models import UserMessage
from apps.accounts.models import User

logger = logging.getLogger(__name__)


@receiver(post_save, sender=UserMessage)
def user_message_post_save(sender, instance, created, **kwargs):
    """بعد از ایجاد پیام جدید"""
    if created:
        logger.info(f"New message from {instance.user.phone_number}: {instance.subject}")

        # در صورت نیاز، ارسال نوتیفیکیشن به ادمین
        # می‌توان ایمیل یا پیامک برای ادمین ارسال کرد