# backend/apps/sms/providers/ghasedak.py
"""
پیاده‌سازی provider قاصدک
مستندات: https://doc.ghasedak.me/

روش‌های ارسال (فقط دو روش جدید):
1. SendSingleSMS — ارسال پیام تکی (با سرشماره)
2. SendOtpSms — ارسال OTP با پارامترهای نام‌دار (روش جدید)

⚠️ متد SendOtpWithParams (روش قدیمی) کاملاً حذف شده است.
"""

import requests
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any

from .base import (
    BaseSmsProvider, SmsResult, DeliveryStatus, InboxMessage,
    CreditInfo, MessageStatus,
)

logger = logging.getLogger(__name__)


class GhasedakProvider(BaseSmsProvider):
    """Provider قاصدک"""

    provider_name = 'ghasedak'
    DEFAULT_BASE_URL = 'https://gateway.ghasedak.me/rest/api/v1/WebService/'

    # ============================================
    # Helper: HTTP Request
    # ============================================
    def _post(self, endpoint: str, payload: Dict) -> Dict:
        """ارسال درخواست POST"""
        url = f"{self.base_url}{endpoint}"
        headers = {
            'apikey': self.api_key,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        }
        try:
            response = requests.post(
                url, headers=headers, json=payload,
                timeout=self.timeout, verify=self.verify_ssl,
            )
            if response.status_code >= 400:
                logger.warning(f"[Ghasedak] {endpoint} → {response.status_code}: {response.text[:300]}")
            if response.text:
                try:
                    return response.json()
                except ValueError:
                    return {
                        'isSuccess': False,
                        'IsSuccess': False,
                        'message': f'Non-JSON response ({response.status_code}): {response.text[:200]}',
                        'statusCode': response.status_code,
                        'StatusCode': response.status_code,
                    }
            return {
                'isSuccess': False,
                'IsSuccess': False,
                'message': 'Empty response',
                'statusCode': response.status_code,
                'StatusCode': response.status_code,
            }
        except requests.exceptions.Timeout:
            logger.error(f"[Ghasedak] Timeout on {endpoint}")
            return {'isSuccess': False, 'IsSuccess': False, 'message': 'Timeout', 'statusCode': -1, 'StatusCode': -1}
        except requests.exceptions.RequestException as e:
            logger.error(f"[Ghasedak] Request error: {e}")
            return {'isSuccess': False, 'IsSuccess': False, 'message': str(e), 'statusCode': -2, 'StatusCode': -2}

    def _get(self, endpoint: str, params: Dict = None) -> Dict:
        """ارسال درخواست GET"""
        url = f"{self.base_url}{endpoint}"
        headers = {
            'apikey': self.api_key,
            'Accept': 'application/json',
        }
        try:
            response = requests.get(
                url, headers=headers, params=params or {},
                timeout=self.timeout, verify=self.verify_ssl,
            )
            if response.status_code >= 400:
                logger.warning(f"[Ghasedak] GET {endpoint} → {response.status_code}: {response.text[:300]}")
            if response.text:
                try:
                    return response.json()
                except ValueError:
                    return {
                        'isSuccess': False,
                        'IsSuccess': False,
                        'message': f'Non-JSON response ({response.status_code}): {response.text[:200]}',
                        'statusCode': response.status_code,
                        'StatusCode': response.status_code,
                    }
            return {
                'isSuccess': False,
                'IsSuccess': False,
                'message': 'Empty response',
                'statusCode': response.status_code,
                'StatusCode': response.status_code,
            }
        except requests.exceptions.RequestException as e:
            logger.error(f"[Ghasedak] GET error: {e}")
            return {'isSuccess': False, 'IsSuccess': False, 'message': str(e), 'statusCode': -2, 'StatusCode': -2}

    # ============================================
    # 1. ارسال تکی (SendSingleSMS)
    # ============================================
    def send_single(
        self, mobile: str, message: str, client_reference_id: Optional[str] = None
    ) -> SmsResult:
        """ارسال پیامک تکی با متن آزاد (با سرشماره)"""
        payload = {
            'receptor': self.normalize_phone_for_api(mobile),
            'message': message,
            'lineNumber': self.line_number,
            'clientReferenceId': client_reference_id or '',
            'udh': False,
        }
        result = self._post('SendSingleSMS', payload)

        if result.get('isSuccess') or result.get('IsSuccess'):
            data = result.get('data') or result.get('Data') or {}
            items = data.get('items') or data.get('Items') or [] if isinstance(data, dict) else []
            message_id = ''
            if items:
                message_id = str(items[0].get('messageId') or items[0].get('MessageId') or '')

            return SmsResult(
                success=True,
                message_id=message_id,
                cost=data.get('totalCost') or data.get('TotalCost') if isinstance(data, dict) else None,
                status=MessageStatus.SENT,
                raw_response=result,
            )
        else:
            code = result.get('statusCode') or result.get('StatusCode')
            return SmsResult(
                success=False,
                error_code=code,
                error_message=result.get('message') or result.get('Message') or 'خطای ناشناخته',
                status=MessageStatus.FAILED,
                raw_response=result,
            )

    # ============================================
    # 2. ارسال OTP (تک پارامتر - سازگاری با کد قدیمی)
    # ============================================
    def send_otp(
        self, mobile: str, code: str, client_reference_id: Optional[str] = None
    ) -> SmsResult:
        """
        ارسال تک پارامتر (سازگاری با کدهای قدیمی)
        این متد به send_otp_multi با یک پارامتر نام‌دار نگاشت می‌شود.
        """
        return self.send_otp_multi(
            mobile=mobile,
            params=[{'name': 'Code', 'value': str(code)}],
            client_reference_id=client_reference_id,
        )

    # ============================================
    # 3. ارسال OTP با پارامترهای نام‌دار (روش جدید: SendOtpSms)
    # ============================================
    def send_otp_multi(
        self, mobile: str, params: List[Dict[str, str]], client_reference_id: str = None
    ) -> SmsResult:
        """
        ارسال OTP با پارامترهای نام‌دار — روش جدید قاصدک (SendOtpSms)

        params: لیست دیکشنری با ساختار:
            [{'name': 'Code', 'value': '1234'}, ...]

        نام‌های پارامتر باید دقیقاً مطابق قالب پنل قاصدک باشد.

        ⚠️ فقط پارامترهای دارای مقدار ارسال می‌شوند؛ پارامترهای خالی حذف می‌گردند.
        """
        if not self.otp_template_name:
            return SmsResult(
                success=False,
                error_message='قالب OTP (otp_template_name) تنظیم نشده',
                status=MessageStatus.FAILED,
            )

        # ✅ فقط پارامترهایی که مقدار دارند را در inputs قرار بده
        inputs = []
        empty_params = []
        for p in params:
            name = p.get('name', '')
            value = p.get('value', '')

            if not name:
                continue

            # بررسی مقدار خالی (None، ''، 'None'، 'null')
            is_empty = (
                value is None
                or str(value).strip() == ''
                or str(value).strip().lower() in ('none', 'null', 'undefined')
            )

            if is_empty:
                empty_params.append(name)
                logger.warning(
                    f"⚠️ [Ghasedak] پارامتر {name} مقدار خالی دارد و حذف شد "
                    f"(value={value!r})"
                )
                continue

            inputs.append({
                'param': str(name),
                'value': str(value),
            })

        # ✅ اگر هیچ پارامتر معتبری نبود، خطا برگردان
        if not inputs:
            error_msg = (
                f"هیچ پارامتر معتبری برای ارسال وجود ندارد. "
                f"پارامترهای خالی: {empty_params}"
            )
            logger.error(f"❌ [Ghasedak] {error_msg}")
            return SmsResult(
                success=False,
                error_message=error_msg,
                status=MessageStatus.FAILED,
                raw_response={'empty_params': empty_params},
            )

        payload = {
            'receptors': [
                {
                    'mobile': self.normalize_phone_for_api(mobile),
                    'clientReferenceId': client_reference_id or '',
                }
            ],
            'templateName': self.otp_template_name,
            'inputs': inputs,
            'isVoice': False,
        }

        logger.info(f"📤 [Ghasedak] send_otp_multi (SendOtpSms) payload: {payload}")
        result = self._post('SendOtpSms', payload)

        if result.get('isSuccess') or result.get('IsSuccess'):
            data = result.get('data') or result.get('Data') or {}
            items = data.get('items') or data.get('Items') or [] if isinstance(data, dict) else []
            message_id = ''
            if items:
                message_id = str(items[0].get('messageId') or items[0].get('MessageId') or '')

            return SmsResult(
                success=True,
                message_id=message_id,
                cost=data.get('totalCost') or data.get('TotalCost') if isinstance(data, dict) else None,
                status=MessageStatus.SENT,
                raw_response=result,
            )
        else:
            code_err = result.get('statusCode') or result.get('StatusCode')
            return SmsResult(
                success=False,
                error_code=code_err,
                error_message=result.get('message') or result.get('Message') or 'خطای ناشناخته',
                status=MessageStatus.FAILED,
                raw_response=result,
            )

    # ============================================
    # 4. بررسی وضعیت (GetSmsStatus)
    # ============================================
    def check_status(self, message_id: str) -> DeliveryStatus:
        """بررسی وضعیت تحویل پیام"""
        result = self._get('GetSmsStatus', params={'messageId': message_id})

        if not (result.get('isSuccess') or result.get('IsSuccess')):
            return DeliveryStatus(
                message_id=message_id,
                status=MessageStatus.UNKNOWN,
                error_message=result.get('message') or result.get('Message') or 'خطا در دریافت وضعیت',
                raw_response=result,
            )

        data = result.get('data') or result.get('Data') or {}
        items = data if isinstance(data, list) else [data]
        if not items:
            return DeliveryStatus(
                message_id=message_id,
                status=MessageStatus.UNKNOWN,
                raw_response=result,
            )

        item = items[0]
        status_code = item.get('status') or item.get('Status')

        status_map = {
            0: MessageStatus.SENT,
            1: MessageStatus.DELIVERED,
            2: MessageStatus.FAILED,
            3: MessageStatus.FAILED,
            4: MessageStatus.PENDING,
            5: MessageStatus.FAILED,
            6: MessageStatus.SENT,
        }

        return DeliveryStatus(
            message_id=message_id,
            status=status_map.get(status_code, MessageStatus.UNKNOWN),
            error_code=item.get('errorCode') or item.get('ErrorCode'),
            error_message=item.get('errorMessage') or item.get('ErrorMessage'),
            raw_response=result,
        )

    # ============================================
    # 5. دریافت پیام‌های ورودی (GetReceivedSmsesPaging)
    # ============================================
    def get_inbox(
        self, page: int = 1, page_size: int = 50, since: Optional[datetime] = None
    ) -> List[InboxMessage]:
        """دریافت پیام‌های ورودی"""
        params = {
            'LineNumber': self.line_number,
            'Page': page,
            'PageSize': min(page_size, 100),
        }
        if since:
            params['FromDate'] = since.strftime('%Y-%m-%d')

        result = self._get('GetReceivedSmsesPaging', params=params)

        if not (result.get('isSuccess') or result.get('IsSuccess')):
            logger.warning(f"[Ghasedak] Inbox fetch failed: {result.get('message')}")
            return []

        data = result.get('data') or result.get('Data') or {}
        items = data.get('items') or data.get('Items') or [] if isinstance(data, dict) else []

        inbox_messages = []
        for item in items:
            try:
                received_at = item.get('receivedDate') or item.get('ReceivedDate')
                if isinstance(received_at, str):
                    try:
                        received_at = datetime.fromisoformat(received_at.replace('Z', '+00:00'))
                    except ValueError:
                        received_at = datetime.now()
                elif not isinstance(received_at, datetime):
                    received_at = datetime.now()

                inbox_messages.append(InboxMessage(
                    external_id=str(item.get('messageId') or item.get('MessageId') or ''),
                    from_number=self.clean_phone(item.get('sender') or item.get('Sender') or ''),
                    to_line=str(item.get('lineNumber') or item.get('LineNumber') or self.line_number),
                    message=item.get('message') or item.get('Message') or '',
                    received_at=received_at,
                    raw_data=item,
                ))
            except Exception as e:
                logger.error(f"[Ghasedak] Error parsing inbox item: {e}")

        return inbox_messages

    # ============================================
    # 6. دریافت اعتبار
    # ============================================
    def get_credit(self) -> Optional[CreditInfo]:
        """قاصدک endpoint مستقیم اعتبار ندارد"""
        return None

    # ============================================
    # 7. تست اتصال
    # ============================================
    def test_connection(self) -> Dict[str, Any]:
        """تست اتصال با ارسال یک درخواست ساده"""
        try:
            result = self._post('SendSingleSMS', {
                'receptor': '09155511393',
                'message': 'تست اتصال JTrade',
                'lineNumber': self.line_number,
                'clientReferenceId': 'test_connection',
                'udh': False,
            })
            if result.get('isSuccess') or result.get('IsSuccess'):
                return {'success': True, 'provider': self.provider_name, 'message': 'اتصال موفق'}
            return {
                'success': False, 'provider': self.provider_name,
                'error_code': result.get('statusCode') or result.get('StatusCode'),
                'error': result.get('message') or result.get('Message'),
                'raw': result,
            }
        except Exception as e:
            return {'success': False, 'provider': self.provider_name, 'error': str(e)}