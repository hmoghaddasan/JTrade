# backend/apps/sms/error_service.py
"""
سرویس مدیریت خطاهای پیامک
- ذخیره خطاها در DB
- اطلاع‌رسانی به ادمین از طریق provider دیگر
"""

import logging
from datetime import timedelta
from typing import Optional, Dict, Any

from django.conf import settings
from django.utils import timezone

from apps.accounts.models import SystemSetting, User

from .models import SmsErrorLog, SmsProviderConfig, SmsMessage

logger = logging.getLogger(__name__)


# ============================================
# نگاشت کد خطا به نوع و شدت
# ============================================
GHSEDAK_ERROR_MAP = {
    400: ('api_error', 'medium'),
    401: ('auth_error', 'critical'),
    403: ('auth_error', 'high'),
    404: ('api_error', 'high'),
    418: ('credit_low', 'critical'),
    428: ('api_error', 'medium'),
    500: ('api_error', 'high'),
    503: ('network_error', 'high'),
}

SMSIR_ERROR_MAP = {
    10: ('auth_error', 'critical'),
    11: ('auth_error', 'critical'),
    12: ('config_error', 'high'),
    13: ('config_error', 'high'),
    14: ('config_error', 'high'),
    20: ('rate_limit', 'medium'),
    101: ('config_error', 'high'),
    102: ('credit_low', 'critical'),
    103: ('template_error', 'medium'),
    104: ('config_error', 'medium'),
    113: ('template_error', 'high'),
    114: ('template_error', 'medium'),
    115: ('api_error', 'medium'),
    116: ('template_error', 'high'),
}


def classify_error(provider: str, error_code, error_message: str) -> Dict[str, str]:
    """تعیین نوع و شدت خطا"""
    error_type = 'unknown'
    severity = 'medium'

    try:
        code = int(error_code) if error_code else 0
        if provider == 'ghasedak':
            error_type, severity = GHSEDAK_ERROR_MAP.get(code, ('unknown', 'medium'))
        elif provider == 'sms_ir':
            error_type, severity = SMSIR_ERROR_MAP.get(code, ('unknown', 'medium'))
    except (ValueError, TypeError):
        pass

    # اگر پیام حاوی کلمات کلیدی خاص بود
    msg_lower = (error_message or '').lower()
    if 'credit' in msg_lower or 'اعتبار' in error_message:
        error_type = 'credit_low'
        severity = 'critical'
    elif 'authorization' in msg_lower or 'unauthorized' in msg_lower or 'کلید' in error_message:
        error_type = 'auth_error'
        severity = 'critical'
    elif 'timeout' in msg_lower:
        error_type = 'network_error'
        severity = 'medium'

    return {'error_type': error_type, 'severity': severity}


class SmsErrorService:
    """سرویس مدیریت خطا"""

    def log_error(
        self,
        provider: str,
        error_code,
        error_message: str,
        sms_message: Optional[SmsMessage] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> SmsErrorLog:
        """
        ذخیره خطا در DB + اطلاع‌رسانی به ادمین در صورت لزوم
        """
        classified = classify_error(provider, error_code, error_message)

        log = SmsErrorLog.objects.create(
            provider=provider,
            error_type=classified['error_type'],
            error_code=str(error_code) if error_code else '',
            error_message=error_message or 'خطای نامشخص',
            severity=classified['severity'],
            context=context or {},
            sms_message=sms_message,
        )

        logger.warning(f"⚠️ [SmsError] {provider} | {classified['error_type']} ({classified['severity']}): {error_message}")

        # اطلاع به ادمین (اگر severity کافی بود)
        self._maybe_notify_admin(log)

        return log

    def _maybe_notify_admin(self, log: SmsErrorLog):
        """اطلاع به ادمین در صورت رعایت شرایط"""
        # چک فعال بودن هشدار
        if not SystemSetting.get_bool('sms_admin_alert_enabled', True):
            return

        # چک حداقل شدت
        min_severity = SystemSetting.get_setting('sms_alert_min_severity', 'high')
        severity_order = {'low': 0, 'medium': 1, 'high': 2, 'critical': 3}
        if severity_order.get(log.severity, 1) < severity_order.get(min_severity, 2):
            return

        # چک cooldown (جلوگیری از اسپم)
        cooldown_min = SystemSetting.get_int('sms_alert_cooldown_minutes', 15)
        recent = SmsErrorLog.objects.filter(
            provider=log.provider,
            admin_notified=True,
            admin_notified_at__gt=timezone.now() - timedelta(minutes=cooldown_min),
        ).exists()
        if recent:
            logger.info(f"⏳ هشدار در cooldown است ({cooldown_min} دقیقه)")
            return

        # ارسال هشدار
        self._send_alert_to_admin(log)

    def _send_alert_to_admin(self, log: SmsErrorLog):
        """ارسال هشدار به ادمین از طریق provider دیگر"""
        admin_phone = SystemSetting.get_setting('admin_phone_number', '')
        if not admin_phone:
            logger.warning("⚠️ شماره ادمین تنظیم نشده")
            return

        # پیدا کردن provider دوم (fallback)
        use_fallback = SystemSetting.get_bool('sms_alert_use_fallback_provider', True)
        alert_provider = None

        if use_fallback:
            fallback = SmsProviderConfig.objects.filter(
                is_active=False, is_configured=True
            ).exclude(provider=log.provider).first()
            if fallback:
                alert_provider = fallback
        else:
            alert_provider = SmsProviderConfig.get_active()

        if not alert_provider:
            logger.warning("⚠️ هیچ provider جایگزینی برای ارسال هشدار نیست")
            return

        # رندر متن هشدار
        from .models import SmsTemplate
        template = SmsTemplate.get_by_event('admin_alert')
        if not template:
            logger.error("❌ قالب 'admin_alert' یافت نشد")
            return

        context = {
            'provider': log.get_provider_display(),
            'error_type': log.get_error_type_display(),
            'error_code': log.error_code or '-',
            'error_message': (log.error_message[:100] + '...') if len(log.error_message) > 100 else log.error_message,
            'time': timezone.now().strftime('%Y/%m/%d %H:%M'),
        }

        # ارسال با provider جایگزین
        try:
            from .providers import GhasedakProvider, SmsIrProvider
            if alert_provider.provider == 'ghasedak':
                provider = GhasedakProvider(
                    api_key=alert_provider.api_key,
                    line_number=alert_provider.line_number,
                )
            else:
                provider = SmsIrProvider(
                    api_key=alert_provider.api_key,
                    line_number=alert_provider.line_number,
                )

            message_text = template.render_single(context)
            result = provider.send_single(admin_phone, message_text)

            if result.success:
                log.admin_notified = True
                log.admin_notified_at = timezone.now()
                log.notified_via_provider = alert_provider.provider
                log.save()
                logger.info(f"✅ هشدار به ادمین ارسال شد از طریق {alert_provider.provider}")
            else:
                logger.error(f"❌ خطا در ارسال هشدار: {result.error_message}")

        except Exception as e:
            logger.exception(f"❌ خطا در ارسال هشدار به ادمین: {e}")