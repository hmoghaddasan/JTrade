# backend/apps/subscriptions/sms.py

from django.conf import settings
import requests
import json
import logging
from django.utils import timezone
from .models import SMSLog

logger = logging.getLogger(__name__)


class GhasedakSMS:
    """سرویس پیامک قاصدک"""

    def __init__(self):
        self.api_key = getattr(settings, 'SMS_API_KEY', '')
        self.sender = getattr(settings, 'SMS_SENDER_NUMBER', '')
        self.otp_template = getattr(settings, 'SMS_OTP_TEMPLATE', 'verifycode')
        self.base_url = 'https://gateway.ghasedak.me/rest/api/v1/WebService/'

    def _send_request(self, endpoint, method='POST', data=None, params=None):
        """ارسال درخواست به وب سرویس قاصدک"""
        if not self.api_key:
            logger.warning("SMS is disabled. API key not set.")
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
        """ارسال کد تایید"""
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

            logger.info(f"Sending SMS to {phone_number} with template {self.otp_template}")

            result = self._send_request('SendOtpWithParams', 'POST', data)

            if result.get('status') == 'success':
                sms_log.status = 'success'
                sms_log.response = json.dumps(result)
                sms_log.save()
                logger.info(f"SMS sent successfully to {phone_number}")
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
        """ارسال پیامک تکی"""
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

    def send_purchase_confirmation(self, phone_number, plan_name, end_date):
        """ارسال تایید خرید اشتراک"""
        message = (
            f"✅ خرید اشتراک با موفقیت انجام شد\n"
            f"📊 پلن: {plan_name}\n"
            f"📅 تاریخ انقضا: {end_date.strftime('%Y/%m/%d')}\n\n"
            f"با تشکر از اعتماد شما\n"
            f"ژورنال حرفه‌ای ترید"
        )
        return self.send_single_sms(phone_number, message)

    def send_admin_notification(self, message):
        """ارسال پیام به ادمین"""
        admin_phone = getattr(settings, 'ADMIN_PHONE_NUMBER', '')
        if admin_phone:
            return self.send_single_sms(admin_phone, message, client_reference_id='admin_notification')
        return {'status': 'error', 'error': 'Admin phone number not set'}

    def send_daily_report(self, total_amount, total_count):
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
            return self.send_single_sms(admin_phone, message, client_reference_id='daily_report')
        return {'status': 'error', 'error': 'Admin phone number not set'}

    def _clean_phone_number(self, phone_number):
        """پاکسازی شماره تلفن"""
        cleaned = ''.join(filter(str.isdigit, phone_number))
        if cleaned.startswith('0') and len(cleaned) == 11:
            return cleaned
        if cleaned.startswith('98'):
            return '0' + cleaned[2:]
        return cleaned


# ============================================
# توابع کمکی
# ============================================
def send_verification_sms(phone_number, code):
    sms = GhasedakSMS()
    return sms.send_verification_code(phone_number, code)


def send_purchase_confirmation(phone_number, plan_name, end_date):
    sms = GhasedakSMS()
    return sms.send_purchase_confirmation(phone_number, plan_name, end_date)


def send_admin_notification(message):
    sms = GhasedakSMS()
    return sms.send_admin_notification(message)


def send_daily_report(total_amount, total_count):
    sms = GhasedakSMS()
    return sms.send_daily_report(total_amount, total_count)