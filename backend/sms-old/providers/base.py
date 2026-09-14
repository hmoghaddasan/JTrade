# backend/apps/sms/providers/base.py
"""
کلاس پایه providers پیامک
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field, asdict
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
import logging

logger = logging.getLogger(__name__)


# ============================================
# Enums
# ============================================
class MessageStatus(str, Enum):
    PENDING = 'pending'
    SENT = 'sent'
    DELIVERED = 'delivered'
    FAILED = 'failed'
    BLACKLIST = 'blacklist'
    UNKNOWN = 'unknown'


# ============================================
# Result Dataclasses
# ============================================
@dataclass
class SmsResult:
    """نتیجه ارسال پیامک"""
    success: bool
    message_id: Optional[str] = None
    pack_id: Optional[str] = None
    cost: Optional[int] = None
    status: MessageStatus = MessageStatus.PENDING
    error_code: Optional[int] = None
    error_message: Optional[str] = None
    raw_response: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self):
        d = asdict(self)
        d['status'] = self.status.value
        return d


@dataclass
class DeliveryStatus:
    """وضعیت تحویل پیام"""
    message_id: str
    status: MessageStatus
    delivered_at: Optional[datetime] = None
    error_code: Optional[int] = None
    error_message: Optional[str] = None
    raw_response: Dict[str, Any] = field(default_factory=dict)


@dataclass
class InboxMessage:
    """پیام دریافتی"""
    external_id: str
    from_number: str
    to_line: str
    message: str
    received_at: datetime
    raw_data: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CreditInfo:
    """اطلاعات اعتبار"""
    credit: int
    currency: str = 'IRR'


# ============================================
# Base Provider
# ============================================
class BaseSmsProvider(ABC):
    """کلاس پایه providers"""

    provider_name: str = 'base'
    DEFAULT_BASE_URL: str = ''

    def __init__(
        self,
        api_key: str,
        line_number: str,
        base_url: Optional[str] = None,
        otp_template_name: Optional[str] = None,
        otp_template_id: Optional[int] = None,
        timeout: int = 15,
        verify_ssl: bool = True,
    ):
        self.api_key = api_key
        self.line_number = line_number
        self.base_url = base_url or self.DEFAULT_BASE_URL
        self.otp_template_name = otp_template_name
        self.otp_template_id = otp_template_id
        self.timeout = timeout
        self.verify_ssl = verify_ssl
        self._validate_config()

    def _validate_config(self):
        if not self.api_key:
            raise ValueError(f"[{self.provider_name}] api_key الزامی است")
        if not self.line_number:
            raise ValueError(f"[{self.provider_name}] line_number الزامی است")

    # ---------- Abstract Methods ----------
    @abstractmethod
    def send_single(self, mobile: str, message: str, client_reference_id: Optional[str] = None) -> SmsResult:
        ...

    @abstractmethod
    def send_otp(self, mobile: str, code: str, client_reference_id: Optional[str] = None) -> SmsResult:
        ...

    @abstractmethod
    def check_status(self, message_id: str) -> DeliveryStatus:
        ...

    @abstractmethod
    def get_inbox(self, page: int = 1, page_size: int = 50, since: Optional[datetime] = None) -> List[InboxMessage]:
        ...

    # ---------- Optional Methods ----------
    def get_credit(self) -> Optional[CreditInfo]:
        return None

    def test_connection(self) -> Dict[str, Any]:
        try:
            credit = self.get_credit()
            return {
                'success': True,
                'provider': self.provider_name,
                'credit': credit.credit if credit else None,
            }
        except Exception as e:
            return {
                'success': False,
                'provider': self.provider_name,
                'error': str(e),
            }

    # ---------- Helpers ----------
    @staticmethod
    def clean_phone(mobile: str) -> str:
        cleaned = ''.join(filter(str.isdigit, str(mobile)))
        if cleaned.startswith('98') and len(cleaned) == 12:
            return '0' + cleaned[2:]
        if cleaned.startswith('9') and len(cleaned) == 10:
            return '0' + cleaned
        if cleaned.startswith('0') and len(cleaned) == 11:
            return cleaned
        return cleaned

    @staticmethod
    def normalize_phone_for_api(mobile: str) -> str:
        cleaned = BaseSmsProvider.clean_phone(mobile)
        if cleaned.startswith('0'):
            return cleaned[1:]
        return cleaned