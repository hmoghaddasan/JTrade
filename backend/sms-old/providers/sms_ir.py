# backend/apps/sms/providers/sms_ir.py
"""
Provider sms.ir - نسخه Django
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


class SmsIrProvider(BaseSmsProvider):

    provider_name = 'sms_ir'
    DEFAULT_BASE_URL = 'https://api.sms.ir/v1/'

    ERROR_CODES = {
        10: 'کلید وب سرویس نامعتبر است', 11: 'کلید وب سرویس غیرفعال است',
        12: 'کلید وب سرویس محدود به IPهای تعریف شده می‌باشد', 13: 'حساب کاربری غیر فعال است',
        14: 'حساب کاربری در حالت تعلیق قرار دارد', 20: 'تعداد درخواست بیشتر از حد مجاز است',
        101: 'شماره خط نامعتبر می‌باشد', 102: 'اعتبار کافی نمی‌باشد',
        103: 'درخواست دارای متن خالی است', 104: 'درخواست دارای موبایل نادرست است',
        105: 'تعداد موبایل ها بیشتر از حد مجاز', 106: 'تعداد متن ها بیشتر از حد مجاز',
        107: 'لیست موبایل ها خالی است', 108: 'لیست متن ها خالی است',
        109: 'زمان ارسال نامعتبر است', 113: 'قالب یافت نشد',
        114: 'طول مقدار پارامتر بیش از حد مجاز', 115: 'شماره در لیست سیاه است',
        116: 'متغیرهای ارسالی اشتباه می‌باشد',
    }

    def _post(self, endpoint: str, payload: Dict) -> Dict:
        url = f"{self.base_url}{endpoint}"
        headers = {'Content-Type': 'application/json', 'Accept': 'application/json', 'X-API-KEY': self.api_key}
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=self.timeout, verify=self.verify_ssl)
            if response.status_code >= 400:
                logger.warning(f"[SmsIr] {endpoint} → {response.status_code}: {response.text[:300]}")
            return response.json() if response.text else {}
        except requests.exceptions.RequestException as e:
            logger.error(f"[SmsIr] Request error: {e}")
            return {'status': -1, 'message': str(e)}

    def _get(self, endpoint: str, params: Dict = None) -> Dict:
        url = f"{self.base_url}{endpoint}"
        headers = {'Accept': 'application/json', 'X-API-KEY': self.api_key}
        try:
            response = requests.get(url, headers=headers, params=params or {}, timeout=self.timeout, verify=self.verify_ssl)
            if response.status_code >= 400:
                logger.warning(f"[SmsIr] GET {endpoint} → {response.status_code}: {response.text[:300]}")
            return response.json() if response.text else {}
        except requests.exceptions.RequestException as e:
            logger.error(f"[SmsIr] GET error: {e}")
            return {'status': -1, 'message': str(e)}

    def send_single(self, mobile: str, message: str, client_reference_id: Optional[str] = None) -> SmsResult:
        payload = {
            'lineNumber': int(self.line_number),
            'messageText': message,
            'mobiles': [self.normalize_phone_for_api(mobile)],
            'sendDateTime': None,
        }
        result = self._post('send/bulk', payload)
        if result.get('status') == 1:
            data = result.get('data', {})
            message_ids = data.get('messageIds') or []
            return SmsResult(success=True,
                             message_id=str(message_ids[0]) if message_ids else None,
                             pack_id=str(data.get('packId')) if data.get('packId') else None,
                             cost=data.get('cost'), status=MessageStatus.SENT, raw_response=result)
        code = result.get('status')
        return SmsResult(success=False, error_code=code,
                         error_message=result.get('message') or self.ERROR_CODES.get(code, 'خطای ناشناخته'),
                         status=MessageStatus.FAILED, raw_response=result)

    def send_otp(self, mobile: str, code: str, client_reference_id: Optional[str] = None) -> SmsResult:
        if not self.otp_template_id:
            return SmsResult(success=False, error_message='قالب OTP تنظیم نشده', status=MessageStatus.FAILED)
        payload = {
            'mobile': self.normalize_phone_for_api(mobile),
            'templateId': int(self.otp_template_id),
            'parameters': [{'name': 'CODE', 'value': str(code)}],
        }
        result = self._post('send/verify', payload)
        if result.get('status') == 1:
            data = result.get('data', {})
            return SmsResult(success=True,
                             message_id=str(data.get('messageId')) if data.get('messageId') else None,
                             cost=data.get('cost'), status=MessageStatus.SENT, raw_response=result)
        code_err = result.get('status')
        return SmsResult(success=False, error_code=code_err,
                         error_message=result.get('message') or self.ERROR_CODES.get(code_err, 'خطای ناشناخته'),
                         status=MessageStatus.FAILED, raw_response=result)

    def check_status(self, message_id: str) -> DeliveryStatus:
        result = self._get(f'send/{message_id}')
        if result.get('status') != 1:
            return DeliveryStatus(message_id=message_id, status=MessageStatus.UNKNOWN,
                                  error_message=result.get('message', 'خطا در دریافت وضعیت'), raw_response=result)
        data = result.get('data', {})
        delivery_state = data.get('deliveryState')
        status_map = {1: MessageStatus.DELIVERED, 2: MessageStatus.SENT, 3: MessageStatus.FAILED,
                      4: MessageStatus.PENDING, 5: MessageStatus.FAILED}
        delivered_at = data.get('deliveryDateTime') or data.get('sendDateTime')
        if isinstance(delivered_at, str):
            try:
                delivered_at = datetime.fromisoformat(delivered_at.replace('Z', '+00:00'))
            except ValueError:
                delivered_at = None
        return DeliveryStatus(message_id=message_id,
                              status=status_map.get(delivery_state, MessageStatus.UNKNOWN),
                              delivered_at=delivered_at, raw_response=result)

    def get_inbox(self, page: int = 1, page_size: int = 50, since: Optional[datetime] = None) -> List[InboxMessage]:
        params = {'page': page, 'size': min(page_size, 100)}
        if since:
            params['fromDate'] = int(since.timestamp())
        result = self._get('receive/live', params=params)
        if result.get('status') != 1:
            return []
        data = result.get('data', {})
        items = data if isinstance(data, list) else (data.get('items', []) if isinstance(data, dict) else [])
        inbox = []
        for item in items:
            try:
                received_at = item.get('receivedDateTime') or item.get('receiveDateTime')
                if isinstance(received_at, str):
                    try:
                        received_at = datetime.fromisoformat(received_at.replace('Z', '+00:00'))
                    except ValueError:
                        received_at = datetime.now()
                elif isinstance(received_at, (int, float)):
                    received_at = datetime.fromtimestamp(received_at)
                else:
                    received_at = datetime.now()
                inbox.append(InboxMessage(
                    external_id=str(item.get('id') or item.get('messageId') or ''),
                    from_number=self.clean_phone(str(item.get('mobile') or item.get('sender') or '')),
                    to_line=str(item.get('lineNumber') or self.line_number),
                    message=item.get('messageText') or item.get('message') or '',
                    received_at=received_at,
                    raw_data=item,
                ))
            except Exception as e:
                logger.error(f"[SmsIr] Parse inbox error: {e}")
        return inbox

    def get_credit(self) -> Optional[CreditInfo]:
        result = self._get('credit')
        if result.get('status') == 1:
            return CreditInfo(credit=int(result.get('data') or 0))
        return None

    def test_connection(self) -> Dict[str, Any]:
        try:
            credit = self.get_credit()
            if credit is not None:
                return {'success': True, 'provider': self.provider_name, 'credit': credit.credit, 'message': 'اتصال موفق'}
            return {'success': False, 'provider': self.provider_name, 'error': 'دریافت اعتبار ناموفق'}
        except Exception as e:
            return {'success': False, 'provider': self.provider_name, 'error': str(e)}