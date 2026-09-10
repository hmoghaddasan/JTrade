# backend/apps/subscriptions/sms.py

from django.conf import settings
import requests
import json
import logging
from django.utils import timezone
from .models import SMSLog
from .smsir import SMSIRService

logger = logging.getLogger(__name__)


class GhasedakSMS:
    """سرویس پیامک قاصدک"""

    def __init__(self):
        self.api_key = getattr(settings, 'SMS_API_KEY', '')
        self.sender = getattr(settings, 'SMS_SENDER_NUMBER', '')
        self.otp_template = getattr(settings, 'SMS_OTP_TEMPLATE', 'verifycode')
        self.base_url = 'https://gateway.ghasedak.me/rest/api/v1/WebService/'
        self.enabled = bool(self.api_key)

    def _send_request(self, endpoint, method='POST', data=None, params=None):
        """ارسال درخواست به وب سرویس قاصدک"""
        if not self.enabled:
            logger.warning("Ghasedak SMS is not configured")
            return {'status': 'disabled', 'message': 'SMS service is disabled'}

        url = f"{self.base_url}{endpoint}"
        headers = {
            'ApiKey': self.api_key,
            'Content-Type': 'application/json'
        }

        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=10)
            else:
                response = requests.post(url, headers=headers, json=data, timeout=10)

            response.raise_for_status()
            result = response.json()

            if result.get('IsSuccess'):
                return {'status': 'success', 'data': result.get('Data')}
            else:
                error_msg = result.get('Message', 'خطا در ارسال پیامک')
                logger.error(f"SMS error: {error_msg}")
                return {'status': 'failed', 'error': error_msg, 'data': result}

        except requests.exceptions.RequestException as e:
            logger.error(f"SMS request exception: {str(e)}")
            return {'status': 'error', 'error': str(e)}

    def send_verification_code(self, phone_number, code):
        """ارسال کد تایید با قاصدک"""
        if not self.enabled:
            return {'status': 'error', 'error': 'Ghasedak SMS is disabled'}

        phone_number = self._clean_phone_number(phone_number)

        sms_log = SMSLog.objects.create(
            phone_number=phone_number,
            message=f"کد تایید: {code}",
            status='pending'
        )

        try:
            data = {
                'receptors': [
                    {
                        'mobile': phone_number,
                        'clientReferenceId': str(sms_log.id)
                    }
                ],
                'templateName': self.otp_template,
                'param1': code,
                'udh': False,
                'isVoice': False
            }

            result = self._send_request('SendOtpWithParams', 'POST', data)

            if result.get('status') == 'success':
                sms_log.status = 'success'
                sms_log.response = json.dumps(result)
                sms_log.save()
                return {'status': 'success', 'data': result.get('data')}
            else:
                sms_log.status = 'failed'
                sms_log.response = json.dumps(result)
                sms_log.save()
                return result

        except Exception as e:
            logger.error(f"Send verification SMS exception: {str(e)}")
            sms_log.status = 'failed'
            sms_log.response = str(e)
            sms_log.save()
            return {'status': 'error', 'error': str(e)}

    def send_single_sms(self, phone_number, message, client_reference_id=None):
        """ارسال پیامک تکی با قاصدک"""
        if not self.enabled:
            return {'status': 'error', 'error': 'Ghasedak SMS is disabled'}

        phone_number = self._clean_phone_number(phone_number)

        sms_log = SMSLog.objects.create(
            phone_number=phone_number,
            message=message,
            status='pending'
        )

        try:
            data = {
                'receptor': phone_number,
                'message': message,
                'lineNumber': self.sender,
                'clientReferenceId': client_reference_id or str(sms_log.id),
                'udh': False
            }

            result = self._send_request('SendSingleSMS', 'POST', data)

            if result.get('status') == 'success':
                sms_log.status = 'success'
                sms_log.response = json.dumps(result)
                sms_log.save()
            else:
                sms_log.status = 'failed'
                sms_log.response = json.dumps(result)
                sms_log.save()

            return result

        except Exception as e:
            logger.error(f"Send single SMS exception: {str(e)}")
            sms_log.status = 'failed'
            sms_log.response = str(e)
            sms_log.save()
            return {'status': 'error', 'error': str(e)}

    def _clean_phone_number(self, phone_number):
        """پاکسازی شماره تلفن"""
        cleaned = ''.join(filter(str.isdigit, phone_number))
        if cleaned.startswith('0') and len(cleaned) == 11:
            return cleaned
        if cleaned.startswith('98'):
            return '0' + cleaned[2:]
        return cleaned


# ============================================
# ✅ SMS Manager - مدیریت هر دو سرویس
# ============================================
class SMSManager:
    """
    مدیریت ارسال پیامک با استفاده از سرویس‌های مختلف
    """

    def __init__(self):
        self.provider = getattr(settings, 'SMS_PROVIDER', 'both')
        self.ghasedak = GhasedakSMS()
        self.smsir = SMSIRService()

        # لاگ برای دیباگ
        logger.info(f"SMS Manager initialized with provider: {self.provider}")
        logger.info(f"SMS.IR configured: {bool(self.smsir.api_key)}")
        logger.info(f"Ghasedak configured: {self.ghasedak.enabled}")

    def send_sms(self, mobile, message, provider=None):
        """
        ارسال پیامک با سرویس مشخص

        Args:
            mobile (str): شماره موبایل
            message (str): متن پیامک
            provider (str, optional): 'ghasedak', 'smsir', یا None (هر دو)

        Returns:
            dict: نتیجه ارسال
        """
        if not provider:
            provider = self.provider

        results = []

        if provider in ['ghasedak', 'both']:
            if self.ghasedak.enabled:
                try:
                    result = self.ghasedak.send_single_sms(mobile, message)
                    results.append({'provider': 'ghasedak', 'result': result})
                    logger.info(f"Ghasedak result: {result}")
                except Exception as e:
                    logger.error(f"Ghasedak error: {str(e)}")
                    results.append({'provider': 'ghasedak', 'result': {'success': False, 'error': str(e)}})
            else:
                results.append(
                    {'provider': 'ghasedak', 'result': {'success': False, 'error': 'Ghasedak not configured'}})

        if provider in ['smsir', 'both']:
            try:
                result = self.smsir.send_sms(mobile, message)
                results.append({'provider': 'smsir', 'result': result})
                logger.info(f"SMS.IR result: {result}")
            except Exception as e:
                logger.error(f"SMS.IR error: {str(e)}")
                results.append({'provider': 'smsir', 'result': {'success': False, 'error': str(e)}})

        if provider == 'both':
            success = any(r['result'].get('success', False) for r in results)
            return {
                'success': success,
                'results': results
            }

        return results[0]['result'] if results else {'success': False, 'error': 'No provider available'}

    def send_verification_code(self, mobile, code, provider=None):
        """
        ارسال کد تایید

        Args:
            mobile (str): شماره موبایل
            code (str): کد تایید
            provider (str, optional): 'ghasedak', 'smsir', یا None (هر دو)

        Returns:
            dict: نتیجه ارسال
        """
        if not provider:
            provider = self.provider

        results = []

        if provider in ['ghasedak', 'both']:
            if self.ghasedak.enabled:
                try:
                    result = self.ghasedak.send_verification_code(mobile, code)
                    results.append({'provider': 'ghasedak', 'result': result})
                    logger.info(f"Ghasedak verification result: {result}")
                except Exception as e:
                    logger.error(f"Ghasedak verification error: {str(e)}")
                    results.append({'provider': 'ghasedak', 'result': {'success': False, 'error': str(e)}})
            else:
                results.append(
                    {'provider': 'ghasedak', 'result': {'success': False, 'error': 'Ghasedak not configured'}})

        if provider in ['smsir', 'both']:
            try:
                # ✅ استفاده از متد Bulk برای ارسال کد تایید
                result = self.smsir.send_verification_code(mobile, code)
                results.append({'provider': 'smsir', 'result': result})
                logger.info(f"SMS.IR verification result: {result}")
            except Exception as e:
                logger.error(f"SMS.IR verification error: {str(e)}")
                results.append({'provider': 'smsir', 'result': {'success': False, 'error': str(e)}})

        logger.info(f"Verification SMS results: {results}")

        if provider == 'both':
            success = any(r['result'].get('success', False) for r in results)
            return {
                'success': success,
                'results': results
            }

        return results[0]['result'] if results else {'success': False, 'error': 'No provider available'}

    def send_bulk_sms(self, mobiles, message, provider='smsir'):
        """ارسال پیامک گروهی (فقط SMS.IR)"""
        if provider == 'smsir':
            return self.smsir.send_bulk_sms(mobiles, message)
        else:
            return {'success': False, 'error': 'Bulk SMS only supported by SMS.IR'}

    def send_like_to_like(self, mobiles, messages, send_datetime=None, provider='smsir'):
        """ارسال نظیر به نظیر (فقط SMS.IR)"""
        if provider == 'smsir':
            return self.smsir.send_like_to_like(mobiles, messages, send_datetime)
        else:
            return {'success': False, 'error': 'Like-to-like only supported by SMS.IR'}

    def send_scheduled_sms(self, mobile, message, send_datetime, provider='smsir'):
        """ارسال پیامک زمانبندی شده (فقط SMS.IR)"""
        if provider == 'smsir':
            return self.smsir.send_scheduled_sms(mobile, message, send_datetime)
        else:
            return {'success': False, 'error': 'Scheduled SMS only supported by SMS.IR'}

    def delete_scheduled_sms(self, pack_id, provider='smsir'):
        """حذف پیامک زمانبندی شده (فقط SMS.IR)"""
        if provider == 'smsir':
            return self.smsir.delete_scheduled_sms(pack_id)
        else:
            return {'success': False, 'error': 'Delete scheduled only supported by SMS.IR'}

    def get_credit(self, provider='smsir'):
        """دریافت اعتبار (فقط SMS.IR)"""
        if provider == 'smsir':
            return self.smsir.get_credit()
        else:
            return {'success': False, 'error': 'Credit check only supported by SMS.IR'}


# ============================================
# ✅ ایجاد نمونه از SMSManager
# ============================================
sms_manager = SMSManager()


# ============================================
# توابع کمکی (سازگار با کدهای قبلی)
# ============================================
def send_verification_sms(phone_number, code):
    """ارسال کد تایید با استفاده از هر دو سرویس"""
    return sms_manager.send_verification_code(phone_number, code)


def send_purchase_confirmation(phone_number, plan_name, end_date):
    """ارسال تایید خرید اشتراک"""
    message = (
        f"✅ خرید اشتراک با موفقیت انجام شد\n"
        f"📊 پلن: {plan_name}\n"
        f"📅 تاریخ انقضا: {end_date.strftime('%Y/%m/%d')}\n\n"
        f"با تشکر از اعتماد شما\n"
        f"ژورنال حرفه‌ای ترید"
    )
    return sms_manager.send_sms(phone_number, message)


def send_admin_notification(message):
    """ارسال پیام به ادمین"""
    admin_phone = getattr(settings, 'ADMIN_PHONE_NUMBER', '')
    if admin_phone:
        return sms_manager.send_sms(admin_phone, message)
    return {'success': False, 'error': 'Admin phone number not set'}


def send_daily_report(total_amount, total_count):
    """ارسال گزارش روزانه به ادمین"""
    admin_phone = getattr(settings, 'ADMIN_PHONE_NUMBER', '')
    if admin_phone:
        message = (
            f"📊 گزارش فروش روزانه\n"
            f"━━━━━━━━━━━━━━━\n"
            f"💰 مجموع فروش: {total_amount:,.0f} تومان\n"
            f"📦 تعداد تراکنش‌ها: {total_count}\n"
            f"📅 تاریخ: {timezone.now().strftime('%Y/%m/%d')}\n"
            f"━━━━━━━━━━━━━━━\n"
            f"ژورنال حرفه‌ای ترید"
        )
        return sms_manager.send_sms(admin_phone, message)
    return {'success': False, 'error': 'Admin phone number not set'}