# backend/apps/sms/services.py
"""
سرویس مرکزی پیامک - لایه‌ی اصلی مدیریت
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List

from django.conf import settings
from django.utils import timezone
from django.db import transaction

from apps.accounts.models import SystemSetting

from .models import SmsProviderConfig, SmsMessage, SmsInbox, SmsTemplate
from .providers import GhasedakProvider, SmsIrProvider, SmsResult, MessageStatus

logger = logging.getLogger(__name__)


class SmsService:
    """
    سرویس اصلی پیامک
    - خواندن تنظیمات از DB
    - انتخاب provider فعال
    - dispatch به provider مناسب
    - ذخیره لاگ در SmsMessage
    """

    def __init__(self):
        self.config = SmsProviderConfig.get_active()
        self._provider = None

    # ============================================
    # Provider Factory
    # ============================================
    def _get_provider(self):
        """ساخت نمونه provider فعال"""
        if self._provider is not None:
            return self._provider

        if not self.config:
            logger.warning("⚠️ هیچ provider فعالی تنظیم نشده")
            return None

        try:
            if self.config.provider == 'ghasedak':
                # برای قاصدک، template_name را از SmsTemplate می‌خوانیم (هر رویداد قالب خودش را دارد)
                # اما چون BaseSmsProvider به otp_template_name نیاز دارد، فعلاً یک مقدار پیش‌فرض می‌دهیم
                # و در متد send_otp، template_name را جایگزین می‌کنیم
                self._provider = GhasedakProvider(
                    api_key=self.config.api_key,
                    line_number=self.config.line_number,
                )
            elif self.config.provider == 'sms_ir':
                self._provider = SmsIrProvider(
                    api_key=self.config.api_key,
                    line_number=self.config.line_number,
                    otp_template_id=SystemSetting.get_int('smsir_verify_template_id', None),
                )
            else:
                logger.error(f"❌ Provider ناشناخته: {self.config.provider}")
                return None

            return self._provider
        except Exception as e:
            logger.error(f"❌ خطا در ساخت provider: {e}")
            return None

    # ============================================
    # Event Sender (هسته اصلی)
    # ============================================
    def send_event(
        self,
        event_key: str,
        phone_number: str,
        context: Dict[str, Any],
        user=None,
        related_object_type: str = '',
        related_object_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        ارسال پیام بر اساس رویداد
        - event_key: otp_login, welcome_trial, ...
        - context: {'code': '123456', 'user_name': 'علی', ...}
        """
        # بررسی provider
        if not self.config or not self.config.is_active:
            logger.warning(f"⚠️ هیچ provider فعالی نیست (event: {event_key})")
            return {'success': False, 'error': 'provider_not_configured'}

        # بررسی تنظیمات کلی
        if not SystemSetting.get_bool('enable_sms', True):
            logger.info("ℹ️ ارسال پیامک غیرفعال است (enable_sms=false)")
            return {'success': False, 'error': 'sms_disabled'}

        # دریافت قالب رویداد
        template = SmsTemplate.get_by_event(event_key)
        if not template:
            logger.error(f"❌ قالب رویداد '{event_key}' یافت نشد")
            return {'success': False, 'error': f'template_not_found:{event_key}'}

        # تعیین روش ارسال (OTP یا تکی)
        send_method = self.config.send_method  # پیش‌فرض provider

        # بررسی وجود قالب اختصاصی
        if self.config.provider == 'ghasedak' and not template.ghasedak_template:
            send_method = 'single'
        elif self.config.provider == 'sms_ir' and not template.smsir_template_id:
            send_method = 'single'

        # انتخاب و ارسال
        provider = self._get_provider()
        if not provider:
            return {'success': False, 'error': 'provider_init_failed'}

        # رندر متن نهایی
        if send_method == 'single':
            message_text = template.render_single(context)
        else:
            if self.config.provider == 'ghasedak':
                message_text = f"[قالب: {template.ghasedak_template}]"
            else:
                message_text = f"[قالب sms.ir: {template.smsir_template_id}]"

        # ایجاد رکورد در DB (pending)
        sms_record = SmsMessage.objects.create(
            provider=self.config.provider,
            send_method=send_method,
            phone_number=provider.clean_phone(phone_number),
            message=message_text,
            template_name=template.ghasedak_template if self.config.provider == 'ghasedak' else (str(template.smsir_template_id) or ''),
            event_key=event_key,
            user=user,
            related_object_type=related_object_type,
            related_object_id=related_object_id,
            status='pending',
        )

        # ارسال واقعی
        try:
            if send_method == 'single':
                result = provider.send_single(phone_number, message_text, client_reference_id=str(sms_record.id))
            else:
                # OTP
                if self.config.provider == 'ghasedak':
                    # نام قالب را از SmsTemplate جایگزین کن
                    provider.otp_template_name = template.ghasedak_template
                    # مقدار param1 از context
                    code = context.get(template.ghasedak_params[0] if template.ghasedak_params else 'code', '')
                    result = provider.send_otp(phone_number, code, client_reference_id=str(sms_record.id))
                else:  # sms_ir
                    code = context.get(template.smsir_params[0].lower() if template.smsir_params else 'code', '')
                    result = provider.send_otp(phone_number, code, client_reference_id=str(sms_record.id))
        except Exception as e:
            logger.exception(f"❌ خطا در ارسال پیامک: {e}")
            result = SmsResult(success=False, error_message=str(e), status=MessageStatus.FAILED)

        # به‌روزرسانی رکورد
        sms_record.response_data = result.raw_response or {}
        if result.success:
            sms_record.status = 'sent'
            sms_record.external_id = result.message_id or ''
            sms_record.pack_id = result.pack_id or ''
            sms_record.sent_at = timezone.now()
            sms_record.cost = result.cost
        else:
            sms_record.status = 'failed'
            sms_record.error_code = result.error_code
            sms_record.error_message = result.error_message or ''
        sms_record.save()

        logger.info(f"📤 [{event_key}] → {phone_number}: {'✅' if result.success else '❌'} {result.error_message or ''}")
        return result.to_dict()

    # ============================================
    # توابع کمکی برای رویدادهای مشخص
    # ============================================
    def send_otp_login(self, phone_number: str, code: str, user=None) -> Dict[str, Any]:
        """ارسال کد ورود OTP"""
        return self.send_event(
            event_key='otp_login',
            phone_number=phone_number,
            context={'code': code},
            user=user,
            related_object_type='otp',
        )

    def send_welcome_trial(self, user, trial_days: int, end_date) -> Dict[str, Any]:
        """ارسال پیام خوش‌آمد دوره آزمایشی"""
        return self.send_event(
            event_key='welcome_trial',
            phone_number=user.phone_number,
            context={
                'user_name': user.get_full_name() or user.phone_number,
                'trial_days': trial_days,
                'end_date': end_date.strftime('%Y/%m/%d') if end_date else '',
            },
            user=user,
            related_object_type='trial',
        )

    def send_subscription_renewed_by_user(self, user, plan_name: str, end_date, days: int, amount: float, subscription_id: int) -> Dict[str, Any]:
        """تمدید توسط کاربر"""
        return self.send_event(
            event_key='subscription_renewed_by_user',
            phone_number=user.phone_number,
            context={
                'user_name': user.get_full_name() or user.phone_number,
                'plan_name': plan_name,
                'end_date': end_date.strftime('%Y/%m/%d') if end_date else '',
                'days': days,
                'amount': f"{int(amount):,}",
            },
            user=user,
            related_object_type='subscription',
            related_object_id=subscription_id,
        )

    def send_subscription_renewed_by_admin(self, user, plan_name: str, end_date, days: int, reason: str = '', subscription_id: int = None) -> Dict[str, Any]:
        """تمدید توسط ادمین"""
        return self.send_event(
            event_key='subscription_renewed_by_admin',
            phone_number=user.phone_number,
            context={
                'user_name': user.get_full_name() or user.phone_number,
                'plan_name': plan_name,
                'end_date': end_date.strftime('%Y/%m/%d') if end_date else '',
                'days': days,
                'reason': reason or '🌹 با تشکر از اعتماد شما',
            },
            user=user,
            related_object_type='subscription',
            related_object_id=subscription_id,
        )

    def send_admin_reply(self, user, subject: str, message_id: int) -> Dict[str, Any]:
        """پاسخ ادمین به پیام کاربر"""
        return self.send_event(
            event_key='admin_reply',
            phone_number=user.phone_number,
            context={
                'user_name': user.get_full_name() or user.phone_number,
                'subject': subject,
            },
            user=user,
            related_object_type='usermessage',
            related_object_id=message_id,
        )

    def send_admin_single(self, user, message: str) -> Dict[str, Any]:
        """پیام تکی ادمین"""
        return self.send_event(
            event_key='admin_single',
            phone_number=user.phone_number,
            context={'message': message},
            user=user,
            related_object_type='admin_sms',
        )

    # ============================================
    # بررسی وضعیت پیام‌های pending
    # ============================================
    def check_pending_status(self, batch_size: int = 50) -> Dict[str, int]:
        """
        بررسی وضعیت پیام‌های pending
        - هر بار batch_size پیام را بررسی می‌کند
        """
        cutoff = timezone.now() - timedelta(minutes=2)
        pending = SmsMessage.objects.filter(
            status='sent',
            external_id__gt='',
            created_at__lt=cutoff,
        ).exclude(
            status__in=['delivered', 'failed', 'blacklist']
        ).order_by('created_at')[:batch_size]

        checked = 0
        delivered = 0
        failed = 0

        for msg in pending:
            # از provider همان پیام استفاده کن، نه provider فعال
            result = self._check_single_message(msg)
            checked += 1
            if result == 'delivered':
                delivered += 1
            elif result == 'failed':
                failed += 1

        return {'checked': checked, 'delivered': delivered, 'failed': failed}

    def _check_single_message(self, msg: SmsMessage) -> str:
        """بررسی وضعیت یک پیام"""
        try:
            if msg.provider == 'ghasedak':
                cfg = SmsProviderConfig.objects.get(provider='ghasedak')
                provider = GhasedakProvider(api_key=cfg.api_key, line_number=cfg.line_number)
            else:
                cfg = SmsProviderConfig.objects.get(provider='sms_ir')
                provider = SmsIrProvider(api_key=cfg.api_key, line_number=cfg.line_number)

            status = provider.check_status(msg.external_id)
            msg.last_checked_at = timezone.now()

            if status.status == MessageStatus.DELIVERED:
                msg.status = 'delivered'
                msg.delivered_at = status.delivered_at or timezone.now()
                msg.save()
                return 'delivered'
            elif status.status == MessageStatus.FAILED:
                msg.status = 'failed'
                msg.error_message = status.error_message or 'ناموفق'
                msg.save()
                return 'failed'
            else:
                msg.save()
                return 'pending'
        except Exception as e:
            logger.error(f"❌ خطا در بررسی وضعیت پیام {msg.id}: {e}")
            return 'error'

    # ============================================
    # دریافت Inbox
    # ============================================
    def fetch_inbox(self) -> Dict[str, int]:
        """
        دریافت پیام‌های جدید از provider فعال
        """
        if not self.config:
            return {'new': 0, 'error': 'no_provider'}

        provider = self._get_provider()
        if not provider:
            return {'new': 0, 'error': 'provider_init_failed'}

        try:
            messages = provider.get_inbox(page=1, page_size=50)
        except Exception as e:
            logger.error(f"❌ خطا در دریافت Inbox: {e}")
            return {'new': 0, 'error': str(e)}

        new_count = 0
        for msg in messages:
            if not msg.external_id:
                continue

            # چک تکراری
            exists = SmsInbox.objects.filter(
                provider=self.config.provider,
                external_id=msg.external_id,
            ).exists()
            if exists:
                continue

            # پیدا کردن کاربر مرتبط
            from apps.accounts.models import User
            user = User.objects.filter(phone_number=msg.from_number).first()

            SmsInbox.objects.create(
                provider=self.config.provider,
                line_number=msg.to_line,
                from_number=msg.from_number,
                message=msg.message,
                external_id=msg.external_id,
                user=user,
                received_at=msg.received_at,
                raw_data=msg.raw_data,
            )
            new_count += 1

        logger.info(f"📥 Inbox: {new_count} پیام جدید")
        return {'new': new_count, 'total': len(messages)}

    # ============================================
    # ابزارهای مدیریتی
    # ============================================
    def test_connection(self) -> Dict[str, Any]:
        """تست اتصال provider فعال"""
        provider = self._get_provider()
        if not provider:
            return {'success': False, 'error': 'provider_not_configured'}
        return provider.test_connection()

    def refresh_credit(self) -> Optional[int]:
        """بروزرسانی اعتبار provider فعال"""
        provider = self._get_provider()
        if not provider:
            return None
        credit = provider.get_credit()
        if credit and self.config:
            self.config.credit = credit.credit
            self.config.last_checked_at = timezone.now()
            self.config.save()
            return credit.credit
        return None