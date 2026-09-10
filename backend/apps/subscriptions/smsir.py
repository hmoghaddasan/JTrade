# backend/apps/subscriptions/smsir.py

import http.client
import json
import ssl
import socket
import logging
from django.conf import settings
from datetime import datetime

logger = logging.getLogger(__name__)


class SMSIRService:
    """
    سرویس ارسال پیامک از طریق SMS.IR
    تمام پیام‌ها از طریق متد Bulk ارسال می‌شوند
    """

    def __init__(self):
        self.api_key = getattr(settings, 'SMSIR_API_KEY', '')
        self.line_number = getattr(settings, 'SMSIR_LINE_NUMBER', '')
        self.base_url = 'api.sms.ir'

        if not self.api_key or not self.line_number:
            logger.warning("SMS.IR credentials not configured")

    def _get_connection(self):
        """ایجاد اتصال SSL به سرور SMS.IR با تنظیم مستقیم IP"""

        def custom_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
            if host == self.base_url:
                return [(socket.AF_INET, socket.SOCK_STREAM, 6, '', ('185.211.56.44', port))]
            return socket.getaddrinfo(host, port, family, type, proto, flags)

        socket.getaddrinfo = custom_getaddrinfo

        context = ssl.create_default_context()
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE

        return http.client.HTTPSConnection(self.base_url, context=context)

    def send_sms(self, mobile, message):
        """
        ارسال پیامک تکی (Bulk)

        Args:
            mobile (str): شماره موبایل گیرنده
            message (str): متن پیامک

        Returns:
            dict: نتیجه ارسال
        """
        if not self.api_key or not self.line_number:
            return {
                'success': False,
                'error': 'SMS.IR credentials not configured'
            }

        payload = {
            "lineNumber": int(self.line_number),
            "messageText": message,
            "mobiles": [mobile],
            "sendDateTime": None
        }

        return self._send_request("/v1/send/bulk", payload)

    def send_bulk_sms(self, mobiles, message):
        """
        ارسال پیامک گروهی (یک متن به چند شماره)

        Args:
            mobiles (list): لیست شماره موبایل‌ها (حداکثر 100)
            message (str): متن پیامک

        Returns:
            dict: نتیجه ارسال
        """
        if not self.api_key or not self.line_number:
            return {
                'success': False,
                'error': 'SMS.IR credentials not configured'
            }

        if len(mobiles) > 100:
            return {
                'success': False,
                'error': 'تعداد شماره‌ها بیش از 100 عدد است'
            }

        payload = {
            "lineNumber": int(self.line_number),
            "messageText": message,
            "mobiles": mobiles,
            "sendDateTime": None
        }

        return self._send_request("/v1/send/bulk", payload)

    def send_like_to_like(self, mobiles, messages, send_datetime=None):
        """
        ارسال نظیر به نظیر (هر شماره متن مخصوص خود)

        Args:
            mobiles (list): لیست شماره موبایل‌ها
            messages (list): لیست متن‌های پیامک
            send_datetime (int, optional): زمان ارسال (UnixTime)

        Returns:
            dict: نتیجه ارسال
        """
        if not self.api_key or not self.line_number:
            return {
                'success': False,
                'error': 'SMS.IR credentials not configured'
            }

        if len(mobiles) > 100:
            return {
                'success': False,
                'error': 'تعداد شماره‌ها بیش از 100 عدد است'
            }

        if len(mobiles) != len(messages):
            return {
                'success': False,
                'error': 'تعداد شماره‌ها و متن‌ها باید برابر باشد'
            }

        payload = {
            "lineNumber": int(self.line_number),
            "messageTexts": messages,
            "mobiles": mobiles,
            "sendDateTime": send_datetime
        }

        return self._send_request("/v1/send/likeToLike", payload)

    def send_verification_code(self, mobile, code):
        """
        ارسال کد تایید با استفاده از متد Bulk

        Args:
            mobile (str): شماره موبایل گیرنده
            code (str): کد تایید

        Returns:
            dict: نتیجه ارسال
        """
        if not self.api_key or not self.line_number:
            return {
                'success': False,
                'error': 'SMS.IR credentials not configured'
            }

        message = (f"کد تایید شما: {code}"
                   f"ژورنال حرفه‌ای ترید")

        payload = {
            "lineNumber": int(self.line_number),
            "messageText": message,
            "mobiles": [mobile],
            "sendDateTime": None
        }

        return self._send_request("/v1/send/bulk", payload)

    def send_scheduled_sms(self, mobile, message, send_datetime):
        """
        ارسال پیامک زمانبندی شده

        Args:
            mobile (str): شماره موبایل گیرنده
            message (str): متن پیامک
            send_datetime (int): زمان ارسال (UnixTime)

        Returns:
            dict: نتیجه ارسال
        """
        if not self.api_key or not self.line_number:
            return {
                'success': False,
                'error': 'SMS.IR credentials not configured'
            }

        current_time = int(datetime.now().timestamp())
        if send_datetime and send_datetime < current_time:
            return {
                'success': False,
                'error': 'زمان ارسال باید در آینده باشد'
            }

        payload = {
            "lineNumber": int(self.line_number),
            "messageText": message,
            "mobiles": [mobile],
            "sendDateTime": send_datetime
        }

        return self._send_request("/v1/send/bulk", payload)

    def delete_scheduled_sms(self, pack_id):
        """
        حذف پیامک زمانبندی شده

        Args:
            pack_id (str): شناسه مجموعه ارسال

        Returns:
            dict: نتیجه حذف
        """
        if not self.api_key:
            return {
                'success': False,
                'error': 'SMS.IR credentials not configured'
            }

        headers = {
            "Accept": "application/json",
            "X-API-KEY": self.api_key
        }

        try:
            conn = self._get_connection()
            conn.request(
                method="DELETE",
                url=f"/v1/send/scheduled/{pack_id}",
                headers=headers
            )

            response = conn.getresponse()
            response_data = response.read().decode('utf-8')
            conn.close()

            if response.status == 200:
                result = json.loads(response_data)
                if result.get('status') == 1:
                    return {
                        'success': True,
                        'data': result.get('data', {})
                    }
                else:
                    return {
                        'success': False,
                        'error': result.get('message', 'Unknown error'),
                        'status_code': result.get('status')
                    }
            else:
                return {
                    'success': False,
                    'error': f'HTTP {response.status}',
                    'response': response_data
                }

        except Exception as e:
            logger.error(f"SMS.IR delete scheduled error: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    def get_credit(self):
        """
        دریافت میزان اعتبار موجود

        Returns:
            dict: شامل اعتبار موجود
        """
        if not self.api_key:
            return {
                'success': False,
                'error': 'SMS.IR credentials not configured'
            }

        headers = {
            "Accept": "application/json",
            "X-API-KEY": self.api_key
        }

        try:
            conn = self._get_connection()
            conn.request(
                method="GET",
                url="/v1/credit",
                headers=headers
            )

            response = conn.getresponse()
            response_data = response.read().decode('utf-8')
            conn.close()

            if response.status == 200:
                result = json.loads(response_data)
                if result.get('status') == 1:
                    return {
                        'success': True,
                        'credit': result.get('data', 0)
                    }
                else:
                    return {
                        'success': False,
                        'error': result.get('message', 'Unknown error'),
                        'status_code': result.get('status')
                    }
            else:
                return {
                    'success': False,
                    'error': f'HTTP {response.status}',
                    'response': response_data
                }

        except Exception as e:
            logger.error(f"SMS.IR credit error: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    def get_line_numbers(self):
        """
        دریافت لیست خطوط

        Returns:
            dict: لیست خطوط
        """
        if not self.api_key:
            return {
                'success': False,
                'error': 'SMS.IR credentials not configured'
            }

        headers = {
            "Accept": "application/json",
            "X-API-KEY": self.api_key
        }

        try:
            conn = self._get_connection()
            conn.request(
                method="GET",
                url="/v1/line-numbers",
                headers=headers
            )

            response = conn.getresponse()
            response_data = response.read().decode('utf-8')
            conn.close()

            if response.status == 200:
                result = json.loads(response_data)
                if result.get('status') == 1:
                    return {
                        'success': True,
                        'lines': result.get('data', [])
                    }
                else:
                    return {
                        'success': False,
                        'error': result.get('message', 'Unknown error'),
                        'status_code': result.get('status')
                    }
            else:
                return {
                    'success': False,
                    'error': f'HTTP {response.status}',
                    'response': response_data
                }

        except Exception as e:
            logger.error(f"SMS.IR line numbers error: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    def _send_request(self, endpoint, payload):
        """
        ارسال درخواست به API SMS.IR

        Args:
            endpoint (str): آدرس endpoint
            payload (dict): داده‌های ارسالی

        Returns:
            dict: نتیجه درخواست
        """
        json_data = json.dumps(payload, ensure_ascii=False)

        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-API-KEY": self.api_key
        }

        try:
            conn = self._get_connection()
            conn.request(
                method="POST",
                url=endpoint,
                body=json_data.encode('utf-8'),
                headers=headers
            )

            response = conn.getresponse()
            response_data = response.read().decode('utf-8')
            conn.close()

            if response.status == 200:
                result = json.loads(response_data)
                if result.get('status') == 1:
                    data = result.get('data', {})
                    return {
                        'success': True,
                        'pack_id': data.get('packId'),
                        'message_ids': data.get('messageIds', []),
                        'cost': data.get('cost', 0),
                        'response': result
                    }
                else:
                    # خطاهای سرویس با کد وضعیت
                    error_messages = {
                        10: 'کلید وب سرویس نامعتبر است',
                        11: 'کلید وب سرویس غیرفعال است',
                        12: 'کلید وب سرویس محدود به IPهای تعریف شده می‌باشد',
                        13: 'حساب کاربری غیر فعال است',
                        14: 'حساب کاربری در حالت تعلیق قرار دارد',
                        20: 'تعداد درخواست بیشتر از حد مجاز است',
                        101: 'شماره خط نامعتبر می‌باشد',
                        102: 'اعتبار کافی نمی‌باشد',
                        103: 'درخواست شما دارای متن(های) خالی است',
                        104: 'درخواست شما دارای موبایل(های) نادرست است',
                        105: 'تعداد موبایل ها بیشتر از حد مجاز (100عدد) می‌باشد',
                        106: 'تعداد متن ها بیشتر از حد مجاز (100عدد) می‌باشد',
                        107: 'لیست موبایل ها خالی می‌باشد',
                        108: 'لیست متن ها خالی می‌باشد',
                        109: 'زمان ارسال نامعتبر می‌باشد',
                        113: 'قالب یافت نشد',
                        114: 'طول رشته مقدار پارامتر، بیش از حد مجاز (25 کاراکتر) می‌باشد',
                        115: 'شماره موبایل(ها) در لیست سیاه سامانه می‌باشند',
                    }
                    error_msg = error_messages.get(result.get('status'), result.get('message', 'Unknown error'))
                    return {
                        'success': False,
                        'error': error_msg,
                        'status_code': result.get('status'),
                        'response': response_data
                    }
            else:
                return {
                    'success': False,
                    'error': f'HTTP {response.status}',
                    'response': response_data
                }

        except Exception as e:
            logger.error(f"SMS.IR request error: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }


# ============================================
# نمونه استفاده مستقیم
# ============================================
if __name__ == "__main__":
    import json

    service = SMSIRService()

    # تست ارسال پیامک
    result = service.send_sms("09155511393", "پیام تست از سامانه JTrade")
    print(json.dumps(result, indent=2, ensure_ascii=False))

    # تست ارسال کد تایید
    result = service.send_verification_code("09155511393", "123456")
    print(json.dumps(result, indent=2, ensure_ascii=False))