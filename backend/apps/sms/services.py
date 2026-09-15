# backend/apps/sms/services.py
"""
سرویس مرکزی پیامک - نسخه نهایی نهایی

قوانین:
1. نام پارامترها در ghasedak_params/smsir_params دقیقاً همان نام‌های پنل provider هستند.
   مقدار مستقیماً از context[نام_پارامتر] خوانده می‌شود.
2. برای قالب‌های send_method='single' (admin_single, admin_bulk) از SendSingleSMS (سرشماره) استفاده می‌شود.
3. برای قالب‌های send_method='otp' از SendOtpSms (قالب) استفاده می‌شود.
4. برای otp_login، اگر مقدار پارامتر خالی بود، کد تصادفی تولید می‌شود.
"""

import logging
from datetime import timedelta
from typing import Optional, Dict, Any, List

from django.utils import timezone
from apps.accounts.models import SystemSetting

from .models import SmsProviderConfig, SmsMessage, SmsInbox, SmsTemplate
from .providers import GhasedakProvider, SmsIrProvider, SmsResult, MessageStatus
from .error_service import SmsErrorService

logger = logging.getLogger(__name__)


class SmsService:
    """
    سرویس اصلی پیامک
    """

    def __init__(self):
        self.config = SmsProviderConfig.get_active()
        self._provider = None
        self.error_service = SmsErrorService()

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
            self.error_service.log_error(
                provider=self.config.provider if self.config else 'unknown',
                error_code=None,
                error_message=f'خطا در مقداردهی provider: {str(e)}',
                context={'operation': 'init_provider'},
            )
            return None

    # ============================================
    # ✅ ساخت لیست پارامترها برای provider (OTP)
    # ============================================
    def _build_provider_params(self, template: SmsTemplate, context: Dict[str, Any]) -> List[Dict[str, str]]:
        """
        ساخت لیست [{'name': ..., 'value': ...}] برای ارسال به provider.

        ⚠️ نکته کلیدی:
        نام پارامترها در ghasedak_params/smsir_params دقیقاً همان نام‌هایی هستند
        که در پنل provider (قاصدک/sms.ir) تعریف شده‌اند.
        به همین دلیل مقدار را مستقیماً از context[نام_پارامتر] می‌خوانیم.

        مثال:
        - ghasedak_params = ["param1"], context = {"param1": "123456"}
          → inputs = [{"param": "param1", "value": "123456"}]
        - ghasedak_params = ["user_name"], context = {"user_name": "علی"}
          → inputs = [{"param": "user_name", "value": "علی"}]
        """
        if self.config.provider == 'ghasedak':
            param_names = template.ghasedak_params or []
        else:
            param_names = template.smsir_params or []

        is_otp_login = template.event_key == 'otp_login'

        parameters = []
        for pname in param_names:
            # ✅ مقدار را مستقیماً با همان نام پارامتر از context بخوان
            value = context.get(pname, '')

            # ✅ اگر مقدار پیدا نشد، case-insensitive جستجو کن
            if value in (None, ''):
                for k, v in context.items():
                    if k.lower() == pname.lower() and v not in (None, ''):
                        value = v
                        logger.debug(f"✅ case-insensitive match برای {pname}: {value}")
                        break

            # ✅ اگر مقدار هنوز خالی است و این قالب otp_login است، کد تصادفی تولید کن
            if (value is None or str(value).strip() == '') and is_otp_login:
                import random
                value = str(random.randint(100000, 999999))
                logger.warning(
                    f"⚠️ [send_event] مقدار پارامتر '{pname}' خالی بود؛ "
                    f"یک کد تصادفی تولید شد: {value}"
                )

            parameters.append({
                'name': pname,
                'value': str(value) if value is not None else '',
            })

        logger.info(f"📊 [build_params] provider={self.config.provider}, params={parameters}")
        return parameters

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
        priority: str = 'normal',
    ) -> Dict[str, Any]:
        """ارسال پیام بر اساس رویداد"""

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

        # ✅ نوع ارسال از تنظیمات ادمین در قالب
        send_method = template.send_method or 'single'
        logger.info(f"📋 [{event_key}] → send_method = {send_method}")

        # انتخاب provider
        provider = self._get_provider()
        if not provider:
            return {'success': False, 'error': 'provider_init_failed'}

        # ============================================
        # ✅ رندر متن نهایی (برای ذخیره در DB)
        # ============================================
        if send_method == 'single':
            # ارسال تکی با متن آزاد (با سرشماره)
            message_text = template.render_single(context)
            if not message_text or not message_text.strip():
                logger.warning(f"⚠️ [{event_key}] متن پیام خالی است! (single_message خالی یا render ناموفق)")
                message_text = context.get('message', '') or '[متن خالی]'
            logger.info(f"📝 [{event_key}] متن تکی نهایی: {message_text[:100]}...")
        else:
            # ارسال OTP با قالب provider
            if self.config.provider == 'ghasedak':
                message_text = f"[قالب: {template.ghasedak_template}]"
            else:
                message_text = f"[قالب sms.ir: {template.smsir_template_id}]"

        # ایجاد رکورد در DB
        sms_record = SmsMessage.objects.create(
            provider=self.config.provider,
            send_method=send_method,
            phone_number=provider.clean_phone(phone_number),
            message=message_text,
            template_name=(
                template.ghasedak_template
                if self.config.provider == 'ghasedak'
                else (str(template.smsir_template_id) or '')
            ),
            event_key=event_key,
            priority=priority,
            user=user,
            related_object_type=related_object_type,
            related_object_id=related_object_id,
            status='pending',
        )

        # ============================================
        # ✅ ارسال واقعی
        # ============================================
        try:
            if send_method == 'single':
                # ===== ارسال تکی (با سرشماره) =====
                # این حالت برای admin_single و admin_bulk استفاده می‌شود
                logger.info(f"📤 [{event_key}] ارسال تکی با سرشماره → {phone_number}")
                result = provider.send_single(
                    phone_number, message_text,
                    client_reference_id=str(sms_record.id)
                )
            else:
                # ===== ارسال OTP (با قالب provider) =====
                parameters = self._build_provider_params(template, context)

                if not any(p['value'] for p in parameters):
                    logger.error(
                        f"❌ [send_event] هیچ پارامتری مقدار نگرفت! "
                        f"event={event_key}, params={parameters}, context={context}"
                    )
                else:
                    logger.info(f"📤 [{event_key}] پارامترهای OTP: {parameters}")

                if self.config.provider == 'ghasedak':
                    provider.otp_template_name = template.ghasedak_template
                    logger.info(
                        f"📤 [{event_key}] OTP قاصدک (SendOtpSms) | "
                        f"template={template.ghasedak_template} | "
                        f"params={parameters}"
                    )
                    result = provider.send_otp_multi(
                        phone_number, parameters,
                        client_reference_id=str(sms_record.id)
                    )
                else:  # sms_ir
                    provider.otp_template_id = template.smsir_template_id
                    logger.info(
                        f"📤 [{event_key}] OTP sms.ir (send/verify) | "
                        f"template_id={template.smsir_template_id} | "
                        f"params={parameters}"
                    )
                    result = provider.send_otp_multi(
                        phone_number, parameters,
                        client_reference_id=str(sms_record.id)
                    )

        except Exception as e:
            logger.exception(f"❌ خطا در ارسال پیامک: {e}")
            result = SmsResult(
                success=False,
                error_message=str(e),
                status=MessageStatus.FAILED
            )
            self.error_service.log_error(
                provider=self.config.provider,
                error_code=None,
                error_message=str(e),
                sms_message=sms_record,
                context={
                    'event_key': event_key,
                    'phone': phone_number,
                    'send_method': send_method,
                    'operation': 'send_event',
                },
            )

        # ============================================
        # به‌روزرسانی رکورد
        # ============================================
        sms_record.response_data = result.raw_response or {}
        if result.success:
            sms_record.status = 'sent'
            sms_record.external_id = result.message_id or ''
            sms_record.pack_id = result.pack_id or ''
            sms_record.sent_at = timezone.now()
            sms_record.cost = result.cost
            sms_record.save()
            logger.info(f"✅ [{event_key}] → {phone_number} (msg_id: {result.message_id})")
        else:
            sms_record.status = 'failed'
            sms_record.error_code = result.error_code
            sms_record.error_message = result.error_message or ''
            sms_record.save()
            self.error_service.log_error(
                provider=self.config.provider,
                error_code=result.error_code,
                error_message=result.error_message or 'خطای نامشخص',
                sms_message=sms_record,
                context={
                    'event_key': event_key,
                    'phone': phone_number,
                    'send_method': send_method,
                    'operation': 'send_event',
                },
            )
            logger.warning(f"❌ [{event_key}] → {phone_number}: {result.error_message}")

        return result.to_dict()

    # ============================================
    # توابع کمکی برای رویدادهای مشخص
    # ============================================

    def send_otp_login(self, phone_number: str, code: str, user=None) -> Dict[str, Any]:
        """
        ارسال OTP ورود.
        context را با چند نام ممکن پر می‌کنیم تا با هر قالبی کار کند.
        """
        return self.send_event(
            event_key='otp_login',
            phone_number=phone_number,
            context={
                'code': code,       # برای قالب‌هایی که پارامترشان 'code' است
                'param1': code,     # برای قالب قاصدک Verify با %param1%
                'PARAM1': code,     # برای sms.ir
                'Code': code,       # برای قالب قاصدک با %Code%
            },
            user=user,
            related_object_type='otp',
            priority='high',
        )

    def send_welcome_trial(self, user, trial_days: int, end_date) -> Dict[str, Any]:
        user_name = user.get_full_name() or user.phone_number
        end_date_str = end_date.strftime('%Y/%m/%d') if end_date else ''

        return self.send_event(
            event_key='welcome_trial',
            phone_number=user.phone_number,
            context={
                'user_name': user_name,
                'trial_days': trial_days,
                'end_date': end_date_str,
                # معادل‌ها (در صورتی که کسی از param1 استفاده کرد)
                'param1': user_name,
                'param2': trial_days,
                'param3': end_date_str,
            },
            user=user,
            related_object_type='trial',
        )

    def send_subscription_renewed_by_user(
        self, user, plan_name: str, end_date, days: int,
        amount: float, subscription_id: int
    ) -> Dict[str, Any]:
        user_name = user.get_full_name() or user.phone_number
        end_date_str = end_date.strftime('%Y/%m/%d') if end_date else ''
        amount_str = f"{int(amount):,}"

        return self.send_event(
            event_key='subscription_renewed_by_user',
            phone_number=user.phone_number,
            context={
                'user_name': user_name,
                'plan_name': plan_name,
                'end_date': end_date_str,
                'days': days,
                'amount': amount_str,
                'param1': user_name,
                'param2': plan_name,
                'param3': amount_str,
                'param4': end_date_str,
                'param5': days,
            },
            user=user,
            related_object_type='subscription',
            related_object_id=subscription_id,
        )

    def send_subscription_renewed_by_admin(
        self, user, plan_name: str, end_date, days: int,
        reason: str = '', subscription_id: int = None
    ) -> Dict[str, Any]:
        user_name = user.get_full_name() or user.phone_number
        end_date_str = end_date.strftime('%Y/%m/%d') if end_date else ''
        reason_text = reason or '🌹 با تشکر از اعتماد شما'

        return self.send_event(
            event_key='subscription_renewed_by_admin',
            phone_number=user.phone_number,
            context={
                'user_name': user_name,
                'plan_name': plan_name,
                'end_date': end_date_str,
                'days': days,
                'reason': reason_text,
                'param1': user_name,
                'param2': plan_name,
                'param3': days,
                'param4': end_date_str,
                'param5': reason_text,
            },
            user=user,
            related_object_type='subscription',
            related_object_id=subscription_id,
        )

    def send_admin_reply(self, user, subject: str, message_id: int) -> Dict[str, Any]:
        user_name = user.get_full_name() or user.phone_number
        return self.send_event(
            event_key='admin_reply',
            phone_number=user.phone_number,
            context={
                'user_name': user_name,
                'subject': subject,
                'param1': user_name,
                'param2': subject,
            },
            user=user,
            related_object_type='usermessage',
            related_object_id=message_id,
        )

    def send_admin_single(self, user, message: str) -> Dict[str, Any]:
        """ارسال پیام تکی از طرف ادمین (با سرشماره)"""
        return self.send_event(
            event_key='admin_single',
            phone_number=user.phone_number,
            context={'message': message},
            user=user,
            related_object_type='admin_sms',
        )

    def send_admin_bulk(self, user, message: str) -> Dict[str, Any]:
        """ارسال پیام گروهی از طرف ادمین (با سرشماره)"""
        return self.send_event(
            event_key='admin_bulk',
            phone_number=user.phone_number,
            context={'message': message},
            user=user,
            related_object_type='admin_bulk',
        )

    def send_admin_alert(self, provider, error_type, error_code, error_message, admin_phone=None):
        from .models import SmsErrorLog
        log = SmsErrorLog.objects.create(
            provider=provider,
            error_type=error_type,
            error_code=str(error_code) if error_code else '',
            error_message=error_message,
            severity='critical',
        )
        self.error_service._send_alert_to_admin(log)
        return {'success': True, 'log_id': log.id}
    # ============================================
    # ✅ متدهای جدید برای پیامک‌های ادمین
    # ============================================

    def send_admin_payment_new_gateway(self, user, plan_name: str, amount: float, admin_phone: str = None):
        """
        اطلاع به ادمین: پرداخت جدید از درگاه بانکی
        فقط به شماره admin_phone یا ADMIN_PHONE_NUMBER ارسال می‌شود.
        """
        phone = admin_phone or SystemSetting.get('admin_phone_number', '')
        if not phone:
            logger.warning("⚠️ شماره ادمین برای اطلاع پرداخت درگاه تنظیم نشده")
            return {'success': False, 'error': 'no_admin_phone'}

        user_name = user.get_full_name() or user.phone_number
        amount_str = f"{int(amount):,}"

        return self.send_event(
            event_key='admin_payment_new_gateway',
            phone_number=phone,
            context={
                'user_name': user_name,
                'plan_name': plan_name,
                'amount': amount_str,
                'param1': user_name,
                'param2': plan_name,
                'param3': amount_str,
            },
            related_object_type='admin_alert',
        )

    def send_admin_payment_approved(
        self, user, amount: float, method: str, new_end_date: str, admin_phone: str = None
    ):
        """
        اطلاع به ادمین: تأیید یک پرداخت (کارت به کارت یا درگاه)
        method: 'card_to_card' یا 'gateway'
        """
        phone = admin_phone or SystemSetting.get('admin_phone_number', '')
        if not phone:
            logger.warning("⚠️ شماره ادمین برای اطلاع تأیید پرداخت تنظیم نشده")
            return {'success': False, 'error': 'no_admin_phone'}

        user_name = user.get_full_name() or user.phone_number
        amount_str = f"{int(amount):,}"
        method_fa = 'کارت به کارت' if method == 'card_to_card' else 'درگاه بانکی'

        return self.send_event(
            event_key='admin_payment_approved',
            phone_number=phone,
            context={
                'user_name': user_name,
                'amount': amount_str,
                'method': method_fa,
                'new_end_date': new_end_date,
                'param1': user_name,
                'param2': amount_str,
                'param3': method_fa,
                'param4': new_end_date,
            },
            related_object_type='admin_alert',
        )

    def send_admin_daily_summary(
        self,
        today_count: int,
        today_amount: float,
        month_count: int,
        month_amount: float,
        admin_phone: str = None,
    ):
        """
        ارسال گزارش سرجمع روز و ماه به ادمین
        """
        phone = admin_phone or SystemSetting.get('admin_phone_number', '')
        if not phone:
            logger.warning("⚠️ شماره ادمین برای گزارش روزانه تنظیم نشده")
            return {'success': False, 'error': 'no_admin_phone'}

        return self.send_event(
            event_key='admin_daily_summary',
            phone_number=phone,
            context={
                'today_count': str(today_count),
                'today_amount': f"{int(today_amount):,}",
                'month_count': str(month_count),
                'month_amount': f"{int(month_amount):,}",
                'param1': str(today_count),
                'param2': f"{int(today_amount):,}",
                'param3': str(month_count),
                'param4': f"{int(month_amount):,}",
            },
            related_object_type='admin_alert',
        )
    
    # ============================================
    # بررسی وضعیت و اینباکس
    # ============================================
    def check_pending_status(self, batch_size: int = 50) -> Dict[str, int]:
        cutoff = timezone.now() - timedelta(minutes=2)
        pending = SmsMessage.objects.filter(
            status='sent', external_id__gt='', created_at__lt=cutoff,
        ).exclude(status__in=['delivered', 'failed', 'blacklist']).order_by('created_at')[:batch_size]

        checked = delivered = failed = 0
        for msg in pending:
            r = self._check_single_message(msg)
            checked += 1
            if r == 'delivered':
                delivered += 1
            elif r == 'failed':
                failed += 1
        return {'checked': checked, 'delivered': delivered, 'failed': failed}

    def _check_single_message(self, msg):
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
            logger.error(f"❌ خطا در بررسی وضعیت: {e}")
            return 'error'

    def fetch_inbox(self):
        if not self.config:
            return {'new': 0, 'error': 'no_provider'}
        provider = self._get_provider()
        if not provider:
            return {'new': 0, 'error': 'provider_init_failed'}
        try:
            messages = provider.get_inbox(page=1, page_size=50)
        except Exception as e:
            return {'new': 0, 'error': str(e)}
        new_count = 0
        for msg in messages:
            if not msg.external_id:
                continue
            if SmsInbox.objects.filter(provider=self.config.provider, external_id=msg.external_id).exists():
                continue
            from apps.accounts.models import User
            user = User.objects.filter(phone_number=msg.from_number).first()
            SmsInbox.objects.create(
                provider=self.config.provider, line_number=msg.to_line,
                from_number=msg.from_number, message=msg.message,
                external_id=msg.external_id, user=user,
                received_at=msg.received_at, raw_data=msg.raw_data,
            )
            new_count += 1
        return {'new': new_count, 'total': len(messages)}

    def test_connection(self):
        provider = self._get_provider()
        if not provider:
            return {'success': False, 'error': 'provider_not_configured'}
        return provider.test_connection()

    def refresh_credit(self):
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

    def get_stats(self):
        from django.db.models import Count, Sum, Q
        today = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        stats = SmsMessage.objects.aggregate(
            total=Count('id'),
            delivered=Count('id', filter=Q(status='delivered')),
            failed=Count('id', filter=Q(status='failed')),
            pending=Count('id', filter=Q(status__in=['pending', 'sent'])),
            total_cost=Sum('cost'),
        )
        today_stats = SmsMessage.objects.filter(created_at__gte=today).aggregate(
            today_sent=Count('id'), today_cost=Sum('cost'),
        )
        unread_inbox = SmsInbox.objects.filter(is_read=False).count()
        return {
            'total_sent': stats['total'] or 0,
            'total_delivered': stats['delivered'] or 0,
            'total_failed': stats['failed'] or 0,
            'total_pending': stats['pending'] or 0,
            'total_cost': stats['total_cost'] or 0,
            'today_sent': today_stats['today_sent'] or 0,
            'today_cost': today_stats['today_cost'] or 0,
            'inbox_unread': unread_inbox,
        }