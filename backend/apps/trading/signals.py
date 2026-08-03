# backend/apps/trading/signals.py

from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Trade, AIConsultation
from apps.subscriptions.models import UserSubscription
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Trade)
def update_trade_usage(sender, instance, created, **kwargs):
    """بروزرسانی تعداد تریدهای استفاده شده هنگام ایجاد ترید جدید"""
    if created and instance.user:
        try:
            subscription = UserSubscription.objects.filter(
                user=instance.user,
                is_active=True
            ).latest('created_at')
            subscription.use_trade()
            logger.info(f"✅ Trade used: {instance.user.phone_number}")
        except UserSubscription.DoesNotExist:
            logger.warning(f"⚠️ No active subscription for trade: {instance.user.phone_number}")
        except Exception as e:
            logger.error(f"❌ Error updating trade usage: {str(e)}")


@receiver(post_save, sender=AIConsultation)
def update_ai_consultation_usage(sender, instance, created, **kwargs):
    """بروزرسانی تعداد مشاوره‌های استفاده شده هنگام دریافت مشاوره جدید"""
    if created and instance.user:
        try:
            subscription = UserSubscription.objects.filter(
                user=instance.user,
                is_active=True
            ).latest('created_at')
            subscription.use_ai_consultation()
            logger.info(f"✅ AI consultation used: {instance.user.phone_number}")
        except UserSubscription.DoesNotExist:
            logger.warning(f"⚠️ No active subscription for AI: {instance.user.phone_number}")
        except Exception as e:
            logger.error(f"❌ Error updating AI consultation usage: {str(e)}")