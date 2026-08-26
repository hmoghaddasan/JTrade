# backend/apps/trading/services/ai_provider.py

from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)


class AIProvider(ABC):
    """کلاس پایه برای تمام سرویس‌های AI"""

    PROVIDER_NAME = 'base'
    IS_ONLINE = False
    DISPLAY_NAME = 'Base Provider'

    @abstractmethod
    def generate(self, prompt: str, model: str, **kwargs) -> Optional[str]:
        """تولید پاسخ از مدل"""
        pass

    @abstractmethod
    def test_connection(self, model: str) -> bool:
        """تست اتصال به مدل"""
        pass

    @abstractmethod
    def get_available_models(self) -> list:
        """دریافت لیست مدل‌های موجود"""
        pass

    @property
    def provider_name(self) -> str:
        """نام سرویس‌دهنده"""
        return self.PROVIDER_NAME

    @property
    def is_online(self) -> bool:
        """آیا سرویس آنلاین است؟"""
        return self.IS_ONLINE

    def get_model_info(self, model_id: str) -> Optional[Dict]:
        """دریافت اطلاعات یک مدل (اختیاری - قابل override)"""
        return None