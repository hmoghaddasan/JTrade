# backend/apps/sms/providers/ghasedak.py
"""
Provider قاصدک - نسخه Django
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

    provider_name = 'ghasedak'
    DEFAULT_BASE_URL = 'https://gateway.ghasedak.me/rest/api/v1/WebService/'

    def _post(self, endpoint: str, payload: Dict) -> Dict:
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
                    return {'IsSuccess': False, 'Message': response.text[:200], 'StatusCode': response.status_code}
            return {'IsSuccess': False, 'Message': 'Empty', 'StatusCode': response.status_code}
        except requests.exceptions.RequestException as e:
            logger.error(f"[Ghasedak] Request error: {e}")
            return {'IsSuccess': False, 'Message': str(e), 'StatusCode': -2}

    def _get(self, endpoint: str, params: Dict = None) -> Dict:
        url = f"{self.base_url}{endpoint}"
        headers = {'apikey': self.api_key, 'Accept': 'application/json'}
        try:
            response = requests.get(url, headers=headers, params=params or {}, timeout=self.timeout, verify=self.verify_ssl)
            if response.status_code >= 400:
                logger.warning(f"[Ghasedak] GET {endpoint} → {response.status_code}: {response.text[:300]}")
            if response.text:
                try:
                    return response.json()
                except ValueError:
                    return {'IsSuccess': False, 'Message': response.text[:200], 'StatusCode': response.status_code}
            return {'IsSuccess': False, 'Message': 'Empty', 'StatusCode': response.status_code}
        except requests.exceptions.RequestException as e:
            logger.error(f"[Ghasedak] GET error: {e}")
            return {'IsSuccess': False, 'Message': str(e), 'StatusCode': -2}

    def send_single(self, mobile: str, message: str, client_reference_id: Optional[str] = None) -> SmsResult:
        payload = {
            'receptor': self.normalize_phone_for_api(mobile),
            'message': message,
            'lineNumber': self.line_number,
            'clientReferenceId': client_reference_id or '',
            'udh': False,
        }
        result = self._post('SendSingleSMS', payload)
        if result.get('IsSuccess') or result.get('isSuccess'):
            data = result.get('Data') or result.get('data') or {}
            items = data.get('Items') or data.get('items') or [] if isinstance(data, dict) else []
            message_id = str(items[0].get('MessageId') or items[0].get('messageId') or '') if items else ''
            return SmsResult(success=True, message_id=message_id, cost=data.get('Cost') if isinstance(data, dict) else None,
                             status=MessageStatus.SENT, raw_response=result)
        code = result.get('StatusCode') or result.get('statusCode')
        return SmsResult(success=False, error_code=code,
                         error_message=result.get('Message') or result.get('message') or 'خطای ناشناخته',
                         status=MessageStatus.FAILED, raw_response=result)

    def send_otp(self, mobile: str, code: str, client_reference_id: Optional[str] = None) -> SmsResult:
        if not self.otp_template_name:
            return SmsResult(success=False, error_message='قالب OTP تنظیم نشده', status=MessageStatus.FAILED)
        payload = {
            'receptors': [{'mobile': self.normalize_phone_for_api(mobile), 'clientReferenceId': client_reference_id or ''}],
            'templateName': self.otp_template_name,
            'param1': code,
            'udh': False,
            'isVoice': False,
        }
        result = self._post('SendOtpWithParams', payload)
        if result.get('IsSuccess') or result.get('isSuccess'):
            data = result.get('Data') or result.get('data') or {}
            items = data.get('Items') or data.get('items') or [] if isinstance(data, dict) else []
            message_id = str(items[0].get('MessageId') or items[0].get('messageId') or '') if items else ''
            return SmsResult(success=True, message_id=message_id, status=MessageStatus.SENT, raw_response=result)
        code_err = result.get('StatusCode') or result.get('statusCode')
        return SmsResult(success=False, error_code=code_err,
                         error_message=result.get('Message') or result.get('message') or 'خطای ناشناخته',
                         status=MessageStatus.FAILED, raw_response=result)

    def check_status(self, message_id: str) -> DeliveryStatus:
        result = self._get('GetSmsStatus', params={'messageId': message_id})
        if not (result.get('IsSuccess') or result.get('isSuccess')):
            return DeliveryStatus(message_id=message_id, status=MessageStatus.UNKNOWN,
                                  error_message=result.get('Message') or result.get('message'),
                                  raw_response=result)
        data = result.get('Data') or result.get('data') or {}
        items = data if isinstance(data, list) else [data]
        if not items:
            return DeliveryStatus(message_id=message_id, status=MessageStatus.UNKNOWN, raw_response=result)
        item = items[0]
        status_code = item.get('Status') or item.get('status')
        status_map = {0: MessageStatus.SENT, 1: MessageStatus.DELIVERED, 2: MessageStatus.FAILED,
                      3: MessageStatus.FAILED, 4: MessageStatus.PENDING, 5: MessageStatus.FAILED, 6: MessageStatus.SENT}
        return DeliveryStatus(message_id=message_id, status=status_map.get(status_code, MessageStatus.UNKNOWN),
                              raw_response=result)

    def get_inbox(self, page: int = 1, page_size: int = 50, since: Optional[datetime] = None) -> List[InboxMessage]:
        params = {'LineNumber': self.line_number, 'Page': page, 'PageSize': min(page_size, 100)}
        if since:
            params['FromDate'] = since.strftime('%Y-%m-%d')
        result = self._get('GetReceivedSmsesPaging', params=params)
        if not (result.get('IsSuccess') or result.get('isSuccess')):
            return []
        data = result.get('Data') or result.get('data') or {}
        items = data.get('Items') or data.get('items') or [] if isinstance(data, dict) else []
        inbox = []
        for item in items:
            try:
                received_at = item.get('ReceivedDate') or item.get('receivedDate')
                if isinstance(received_at, str):
                    try:
                        received_at = datetime.fromisoformat(received_at.replace('Z', '+00:00'))
                    except ValueError:
                        received_at = datetime.now()
                elif not isinstance(received_at, datetime):
                    received_at = datetime.now()
                inbox.append(InboxMessage(
                    external_id=str(item.get('MessageId') or item.get('messageId') or ''),
                    from_number=self.clean_phone(item.get('Sender') or item.get('sender') or ''),
                    to_line=str(item.get('LineNumber') or self.line_number),
                    message=item.get('Message') or item.get('message') or '',
                    received_at=received_at,
                    raw_data=item,
                ))
            except Exception as e:
                logger.error(f"[Ghasedak] Parse inbox error: {e}")
        return inbox

    def test_connection(self) -> Dict[str, Any]:
        try:
            result = self._post('SendSingleSMS', {
                'receptor': '09155511393',
                'message': 'تست اتصال',
                'lineNumber': self.line_number,
                'clientReferenceId': 'test',
                'udh': False,
            })
            if result.get('IsSuccess') or result.get('isSuccess'):
                return {'success': True, 'provider': self.provider_name, 'message': 'اتصال موفق'}
            return {'success': False, 'provider': self.provider_name,
                    'error_code': result.get('StatusCode'), 'error': result.get('Message'), 'raw': result}
        except Exception as e:
            return {'success': False, 'provider': self.provider_name, 'error': str(e)}