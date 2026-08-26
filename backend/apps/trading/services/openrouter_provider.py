# backend/apps/trading/services/openrouter_provider.py

import requests
import logging
from typing import Optional
from django.conf import settings
from .ai_provider import AIProvider

logger = logging.getLogger(__name__)


class OpenRouterProvider(AIProvider):
    """ارائه‌دهنده OpenRouter API"""

    PROVIDER_NAME = 'openrouter'
    IS_ONLINE = True
    DISPLAY_NAME = 'OpenRouter'

    MODELS = [
        {'id': 'google/gemini-2.0-flash-exp:free', 'name': 'Gemini 2.0 Flash (Free)', 'rank': 1, 'free': True},
        {'id': 'mistralai/mistral-7b-instruct:free', 'name': 'Mistral 7B (Free)', 'rank': 2, 'free': True},
    ]

    def __init__(self):
        self.api_key = getattr(settings, 'OPENROUTER_API_KEY', '') or ''
        self.base_url = getattr(settings, 'OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1')

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
            url = f"{self.base_url}/chat/completions"
            headers = {'Authorization': f'Bearer {self.api_key}', 'Content-Type': 'application/json'}
            payload = {'model': model, 'messages': [{'role': 'user', 'content': 'سلام'}], 'max_tokens': 5}
            response = requests.post(url, headers=headers, json=payload, timeout=5)
            return response.status_code == 200
        except Exception:
            return False

    def generate(self, prompt: str, model: str, **kwargs) -> Optional[str]:
        if not self.api_key:
            return None
        try:
            url = f"{self.base_url}/chat/completions"
            headers = {'Authorization': f'Bearer {self.api_key}', 'Content-Type': 'application/json'}
            payload = {
                'model': model,
                'messages': [{'role': 'user', 'content': prompt}],
                'temperature': kwargs.get('temperature', 0.6),
                'max_tokens': kwargs.get('max_tokens', 2000),
            }
            response = requests.post(url, headers=headers, json=payload, timeout=60)
            response.raise_for_status()
            data = response.json()
            if 'choices' in data and len(data['choices']) > 0:
                return data['choices'][0]['message']['content']
            return None
        except Exception as e:
            logger.error(f"❌ OpenRouter error: {str(e)}")
            return None