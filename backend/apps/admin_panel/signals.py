from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.utils import timezone
import logging

from apps.accounts.models import User
from apps.subscriptions.models import UserSubscription, Transaction

logger = logging.getLogger(__name__)


@receiver(post_save, sender=User)
def user_post_save_admin(sender, instance, created, **kwargs):
    """بعد از ایجاد یا ویرایش کاربر"""
    if created:
        logger.info(f"New user registered: {instance.phone_number}")


@receiver(post_save, sender=Transaction)
def transaction_post_save_admin(sender, instance, created, **kwargs):
    """بعد از ایجاد تراکنش جدید"""
    if created and instance.payment_status == 'paid':
        logger.info(f"New payment: {instance.user.phone_number} - {instance.total_amount}")