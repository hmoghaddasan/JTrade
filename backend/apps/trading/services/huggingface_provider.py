# backend/apps/trading/services/huggingface_provider.py

import requests
import logging
from typing import Optional
from django.conf import settings
from .ai_provider import AIProvider

logger = logging.getLogger(__name__)


class HuggingFaceProvider(AIProvider):
    """ارائه‌دهنده HuggingFace Inference API"""

    PROVIDER_NAME = 'huggingface'
    IS_ONLINE = True
    DISPLAY_NAME = 'HuggingFace'

    MODELS = [
        {'id': 'microsoft/phi-2', 'name': 'Phi-2', 'rank': 1, 'free': True},
        {'id': 'meta-llama/Llama-2-7b-chat-hf', 'name': 'Llama 2 7B', 'rank': 2, 'free': True},
    ]

    def __init__(self):
        self.api_key = getattr(settings, 'HUGGINGFACE_API_KEY', '') or ''
        self.base_url = getattr(settings, 'HUGGINGFACE_BASE_URL', 'https://api-inference.huggingface.co/models')

    @property
    def provider_name(self) -> str:
        return self.PROVIDER_NAME

    @property
    def is_online(self) -> bool:
        return bool(self.api_key)

    def get_available_models(self) -> list:
        if not self.api_key:
            return []

        models = []
        for model in self.MODELS:
            if self.test_connection(model['id']):
                models.append({
                    'id': model['id'],
                    'name': model['name'],
                    'provider': self.PROVIDER_NAME,
                    'display_name': self.DISPLAY_NAME,
                    'rank': model['rank'],
                    'free': model['free'],
                    'online': True,
                    'category': 'online',
                    'category_label': '🟢 آنلاین',
                    'cooldown': 10,
                    'pricing': {'input': 0, 'output': 0},
                })
        return models

    def test_connection(self, model: str) -> bool:
        if not self.api_key:
            return False
        try:
            url = f"{self.base_url}/{model}"
            headers = {'Authorization': f'Bearer {self.api_key}'}
            payload = {'inputs': 'سلام'}
            response = requests.post(url, headers=headers, json=payload, timeout=5)
            return response.status_code in [200, 503]
        except Exception:
            return False

    def generate(self, prompt: str, model: str, **kwargs) -> Optional[str]:
        if not self.api_key:
            return None
        try:
            url = f"{self.base_url}/{model}"
            headers = {'Authorization': f'Bearer {self.api_key}'}
            payload = {
                'inputs': prompt,
                'parameters': {
                    'temperature': kwargs.get('temperature', 0.6),
                    'max_new_tokens': kwargs.get('max_tokens', 500),
                    'return_full_text': False,
                }
            }
            response = requests.post(url, headers=headers, json=payload, timeout=60)
            if response.status_code == 503:
                logger.warning(f"⏳ HuggingFace model '{model}' is loading")
                return None
            response.raise_for_status()
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                return data[0].get('generated_text', '')
            elif isinstance(data, dict) and 'generated_text' in data:
                return data['generated_text']
            return None
        except Exception as e:
            logger.error(f"❌ HuggingFace error: {str(e)}")
            return None