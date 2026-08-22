# backend/apps/accounts/signals.py

from django.db.models.signals import post_save, pre_save, post_delete
from django.dispatch import receiver
from django.utils import timezone
from django.conf import settings
import logging

from .models import (
    User,
    SystemSetting,
    SystemMessage,
    AppVersion,
    UserLoginLog,
    UserActivityLog
)
from apps.subscriptions.models import UserSubscription, SubscriptionPlan
from apps.trading.models import TradeGroup
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from apps.trading.models import DisciplineSettings


logger = logging.getLogger(__name__)


@receiver(pre_save, sender=User)
def user_pre_save(sender, instance, **kwargs):
    if instance.pk:
        try:
            old_user = User.objects.get(pk=instance.pk)
            if old_user.password != instance.password:
                instance.verification_code = None
                instance.verification_expiry = None
        except User.DoesNotExist:
            pass

    if instance.pk:
        try:
            old_user = User.objects.get(pk=instance.pk)
            if old_user.phone_number != instance.phone_number:
                instance.is_verified = False
        except User.DoesNotExist:
            pass


def _create_default_groups(user):
    """ایجاد دسته‌بندی‌های پیش‌فرض برای کاربر جدید"""
    default_groups = [
        {'name': 'فارکس', 'icon': '💱', 'description': 'تریدهای جفت ارزهای اصلی و فرعی'},
        {'name': 'کریپتو', 'icon': '₿', 'description': 'تریدهای ارز دیجیتال'},
        {'name': 'شاخص‌ها', 'icon': '📈', 'description': 'تریدهای شاخص‌های سهام'},
        {'name': 'کالاها', 'icon': '🏆', 'description': 'تریدهای کالاهای اساسی'},
    ]

    for idx, group_data in enumerate(default_groups):
        TradeGroup.objects.get_or_create(
            user=user,
            group_name=group_data['name'],
            defaults={
                'icon': group_data['icon'],
                'description': group_data['description'],
                'is_active': True,
                'is_default': False,
                'created_by': user,
                'order_index': idx
            }
        )
    logger.info(f"✅ Default groups created for user {user.phone_number}")


def _create_trial_subscription(user):
    """ایجاد اشتراک آزمایشی برای کاربر جدید"""
    if UserSubscription.objects.filter(user=user, is_active=True).exists():
        logger.info(f"User {user.phone_number} already has an active subscription, skipping trial.")
        return

    trial_days = SystemSetting.get_setting('trial_days', 7)
    try:
        trial_days = int(trial_days)
    except (ValueError, TypeError):
        trial_days = 7

    try:
        plan = SubscriptionPlan.objects.filter(
            plan_type='basic',
            is_active=True
        ).first()

        if not plan:
            plan = SubscriptionPlan.objects.filter(is_active=True).first()

        if not plan:
            logger.error("No active subscription plan found, cannot create trial subscription.")
            return

        start_date = timezone.now()
        end_date = start_date + timezone.timedelta(days=trial_days)

        UserSubscription.objects.create(
            user=user,
            plan=plan,
            start_date=start_date,
            end_date=end_date,
            is_active=True,
            is_trial=True,
            trades_limit=plan.monthly_trades_limit,
            ai_consultations_limit=plan.monthly_ai_consultations_limit,
            trades_used=0,
            ai_consultations_used=0,
            payment_status='paid',
            amount_paid=0
        )
        logger.info(f"✅ Trial subscription ({trial_days} days) created for user {user.phone_number}")
    except Exception as e:
        logger.error(f"❌ Error creating trial subscription: {str(e)}")


@receiver(post_save, sender=User)
def user_post_save(sender, instance, created, **kwargs):
    if created:
        logger.info(f"User created: {instance.phone_number}")

        # ✅ ایجاد اشتراک آزمایشی
        _create_trial_subscription(instance)

        # ✅ ایجاد دسته‌بندی‌های پیش‌فرض
        _create_default_groups(instance)

        sms_enabled = SystemSetting.get_setting('enable_sms', True)
        if sms_enabled:
            try:
                from apps.subscriptions.sms import send_welcome_sms
                send_welcome_sms(instance.phone_number, instance.first_name)
            except Exception as e:
                logger.error(f"Error sending welcome SMS: {str(e)}")
    else:
        logger.info(f"User updated: {instance.phone_number}")


@receiver(post_save, sender=UserLoginLog)
def user_login_log_post_save(sender, instance, created, **kwargs):
    if created:
        logger.info(f"User login: {instance.user.phone_number} from {instance.ip_address}")

        if instance.is_successful:
            try:
                UserActivityLog.objects.create(
                    user=instance.user,
                    action_type='login',
                    description=f'ورود از آی‌پی {instance.ip_address}',
                    ip_address=instance.ip_address,
                    user_agent=instance.user_agent
                )
            except Exception as e:
                logger.error(f"Error creating activity log: {str(e)}")


@receiver(post_save, sender=UserActivityLog)
def user_activity_log_post_save(sender, instance, created, **kwargs):
    if created:
        logger.info(f"User activity: {instance.user.phone_number} - {instance.action_type}")


@receiver(post_save, sender=SystemSetting)
def system_setting_post_save(sender, instance, created, **kwargs):
    if not created:
        logger.info(f"System setting updated: {instance.setting_key} = {instance.setting_value}")
    else:
        logger.info(f"System setting created: {instance.setting_key} = {instance.setting_value}")


@receiver(post_save, sender=SystemMessage)
def system_message_post_save(sender, instance, created, **kwargs):
    if created:
        logger.info(f"System message created: {instance.title}")
    else:
        logger.info(f"System message updated: {instance.title}")


@receiver(post_save, sender=AppVersion)
def app_version_post_save(sender, instance, created, **kwargs):
    if created:
        logger.info(f"New app version: {instance.version_number}")

        if instance.is_current:
            AppVersion.objects.filter(is_current=True).exclude(id=instance.id).update(is_current=False)


@receiver(post_delete, sender=User)
def user_post_delete(sender, instance, **kwargs):
    logger.info(f"User deleted: {instance.phone_number}")


@receiver(post_save, sender=User)
def create_default_settings(sender, instance, created, **kwargs):
    if created and instance.is_admin:
        default_settings = {
            'app_name': {'value': 'ژورنال حرفه‌ای ترید', 'type': 'string', 'description': 'نام برنامه'},
            'app_version': {'value': '1.0.0', 'type': 'string', 'description': 'نسخه فعلی برنامه'},
            'default_font': {'value': 'Vazir', 'type': 'string', 'description': 'فونت پیش‌فرض'},
            'trial_days': {'value': '7', 'type': 'integer', 'description': 'مدت زمان استفاده رایگان به روز'},
            'enable_sms': {'value': 'true', 'type': 'boolean', 'description': 'فعال/غیرفعال کردن ارسال پیامک'},
            'enable_payment': {'value': 'true', 'type': 'boolean', 'description': 'فعال/غیرفعال کردن پرداخت'},
            'maintenance_mode': {'value': 'false', 'type': 'boolean', 'description': 'حالت تعمیرات'},
            'debug_mode': {'value': 'true', 'type': 'boolean', 'description': 'حالت دیباگ'},
            'site_email': {'value': 'info@tradingjournal.com', 'type': 'string', 'description': 'ایمیل سایت'},
            'site_phone': {'value': '021-12345678', 'type': 'string', 'description': 'تلفن سایت'},
            'site_address': {'value': 'تهران، خیابان ولیعصر، پلاک ۱۲۳', 'type': 'text', 'description': 'آدرس سایت'},
            'logo_path': {'value': '/static/images/logo.png', 'type': 'string', 'description': 'مسیر لوگو'},
            'favicon_path': {'value': '/static/images/favicon.ico', 'type': 'string', 'description': 'مسیر آیکون'},
            'bg_image_path': {'value': '/static/images/background.jpg', 'type': 'string',
                              'description': 'مسیر تصویر پس‌زمینه'},
            'footer_text': {'value': 'تمامی حقوق محفوظ است.', 'type': 'string', 'description': 'متن فوتر'},
        }

        for key, data in default_settings.items():
            try:
                SystemSetting.objects.get_or_create(
                    setting_key=key,
                    defaults={
                        'setting_value': data['value'],
                        'setting_type': data['type'],
                        'description': data.get('description', ''),
                        'is_editable': True
                    }
                )
            except Exception as e:
                logger.error(f"Error creating default setting {key}: {str(e)}")


def log_user_logout(user, request=None):
    if user and user.is_authenticated:
        try:
            last_login = UserLoginLog.objects.filter(
                user=user,
                is_successful=True,
                logout_time__isnull=True
            ).order_by('-login_time').first()

            if last_login:
                last_login.logout_time = timezone.now()
                last_login.calculate_session_duration()

            UserActivityLog.objects.create(
                user=user,
                action_type='logout',
                description='خروج از سیستم',
                ip_address=request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0] if request else None,
                user_agent=request.META.get('HTTP_USER_AGENT', '') if request else None
            )

        except Exception as e:
            logger.error(f"Error logging user logout: {str(e)}")

@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_discipline_settings(sender, instance, created, **kwargs):
    """
    پس از ایجاد کاربر جدید، تنظیمات انضباطی پیش‌فرض را برای او ایجاد کن.
    """
    if created:
        DisciplineSettings.objects.get_or_create(user=instance)

