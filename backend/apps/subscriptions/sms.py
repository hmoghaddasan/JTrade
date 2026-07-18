# sms.py
import requests
import json
from django.conf import settings
import logging
from .models import SMSLog

logger = logging.getLogger(__name__)


class GhasedakSMS:
    """سرویس پیامک قاصدک"""

    def __init__(self):
        self.api_key = settings.SMS_API_KEY
        self.sender = settings.SMS_SENDER
        self.base_url = 'https://api.ghasedak.me/v2/'

    def send_sms(self, phone_number, message):
        """ارسال پیامک"""
        try:
            # اگر پیامک غیرفعال است
            if not settings.SMS_API_KEY:
                logger.warning("SMS is disabled. API key not set.")
                return {'status': 'disabled', 'message': 'SMS service is disabled'}

            # ذخیره در لاگ
            sms_log = SMSLog.objects.create(
                phone_number=phone_number,
                message=message,
                status='pending'
            )

            # ارسال پیامک
            url = f"{self.base_url}send/simple"
            data = {
                'receptor': phone_number,
                'message': message,
                'sender': self.sender
            }

            response = requests.post(
                url,
                data=data,
                headers={
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'apikey': self.api_key
                }
            )

            result = response.json()

            if result.get('result', {}).get('code') == 200:
                sms_log.status = 'success'
                sms_log.response = json.dumps(result)
                sms_log.save()
                return {'status': 'success', 'data': result}
            else:
                sms_log.status = 'failed'
                sms_log.response = json.dumps(result)
                sms_log.save()
                logger.error(f"SMS error: {result}")
                return {'status': 'failed', 'error': result}

        except Exception as e:
            logger.error(f"SMS exception: {str(e)}")
            return {'status': 'error', 'error': str(e)}

    def send_verification_code(self, phone_number, code):
        """ارسال کد تایید"""
        message = f"""
        کد تایید شما: {code}

        این کد تا ۵ دقیقه اعتبار دارد.

        ژورنال حرفه‌ای ترید
        """
        return self.send_sms(phone_number, message)

    def send_purchase_confirmation(self, phone_number, plan_name, end_date):
        """ارسال تایید خرید"""
        message = f"""
        خرید شما با موفقیت انجام شد.

        پلن: {plan_name}
        تاریخ انقضا: {end_date.strftime('%Y/%m/%d')}

        با تشکر از اعتماد شما
        ژورنال حرفه‌ای ترید
        """
        return self.send_sms(phone_number, message)

    def send_welcome_sms(self, phone_number, name=''):
        """ارسال پیام خوش‌آمدگویی"""
        message = f"""
        {name} عزیز، به ژورنال حرفه‌ای ترید خوش آمدید.

        شما میتوانید از امکانات پیشرفته این نرم‌افزار برای ثبت و تحلیل تریدهای خود استفاده کنید.

        موفق باشید.
        """
        return self.send_sms(phone_number, message)

    def send_admin_notification(self, phone_number, user_info, plan_name, amount):
        """ارسال پیام به ادمین برای خرید جدید"""
        message = f"""
        خرید جدید در سیستم:

        کاربر: {user_info}
        پلن: {plan_name}
        مبلغ: {amount:,.0f} تومان

        تاریخ: {__import__('django.utils.timezone').now().strftime('%Y/%m/%d %H:%M')}
        """
        return self.send_sms(phone_number, message)


# توابع کمکی
def send_verification_sms(phone_number, code):
    """ارسال کد تایید"""
    sms = GhasedakSMS()
    return sms.send_verification_code(phone_number, code)


def send_purchase_confirmation(phone_number, plan_name, end_date):
    """ارسال تایید خرید"""
    sms = GhasedakSMS()
    return sms.send_purchase_confirmation(phone_number, plan_name, end_date)


def send_welcome_sms(phone_number, name=''):
    """ارسال پیام خوش‌آمدگویی"""
    sms = GhasedakSMS()
    return sms.send_welcome_sms(phone_number, name)


def send_admin_purchase_notification(user, plan, amount):
    """ارسال پیام به ادمین"""
    sms = GhasedakSMS()
    admin_phone = settings.ADMIN_PHONE_NUMBER if hasattr(settings, 'ADMIN_PHONE_NUMBER') else ''
    if admin_phone:
        user_info = f"{user.get_full_name()} ({user.phone_number})"
        return sms.send_admin_notification(admin_phone, user_info, plan.plan_name, amount)
    return {'status': 'error', 'error': 'Admin phone number not set'}