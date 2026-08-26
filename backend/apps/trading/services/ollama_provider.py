# backend/apps/trading/services/ollama_provider.py

import requests
import json
import logging
from typing import Optional
from django.conf import settings
from .ai_provider import AIProvider

logger = logging.getLogger(__name__)


class OllamaProvider(AIProvider):
    """ارائه‌دهنده Ollama (محلی)"""

    PROVIDER_NAME = 'ollama'
    IS_ONLINE = False
    DISPLAY_NAME = 'Ollama (محلی)'

    def __init__(self):
        self.base_url = getattr(settings, 'OLLAMA_URL', 'http://localhost:11434/api/generate')
        self.base_url_no_api = self.base_url.replace('/api/generate', '')
        if self.base_url_no_api == self.base_url:
            self.base_url_no_api = 'http://localhost:11434'

    @property
    def provider_name(self) -> str:
        return self.PROVIDER_NAME

    @property
    def is_online(self) -> bool:
        return False

    def get_available_models(self) -> list:
        """دریافت لیست مدل‌های Ollama از طریق /api/tags"""
        try:
            tags_url = f"{self.base_url_no_api}/api/tags"
            logger.info(f"🔄 Fetching Ollama models from: {tags_url}")
            response = requests.get(tags_url, timeout=5)

            if response.status_code == 200:
                data = response.json()
                models = []
                for model in data.get('models', []):
                    model_name = model.get('name', '')
                    if model_name:
                        models.append({
                            'id': model_name,
                            'name': model_name,
                            'provider': self.PROVIDER_NAME,
                            'display_name': self.DISPLAY_NAME,
                            'rank': 100,
                            'free': True,
                            'online': False,
                            'category': 'local',
                            'category_label': '🟣 محلی',
                            'cooldown': 5,
                            'pricing': {'input': 0, 'output': 0},
                        })
                models.sort(key=lambda x: x['name'])
                logger.info(f"✅ Found {len(models)} Ollama models")
                return models
            else:
                logger.warning(f"⚠️ Ollama returned status {response.status_code}")
                return []

        except requests.exceptions.ConnectionError:
            logger.warning("⚠️ Ollama is not running")
            return []
        except Exception as e:
            logger.error(f"❌ Error fetching Ollama models: {str(e)}")
            return []

    def test_connection(self, model: str) -> bool:
        """تست اتصال به Ollama"""
        try:
            payload = {
                "model": model,
                "prompt": "سلام",
                "stream": False,
                "options": {"temperature": 0.6}
            }
            response = requests.post(self.base_url, json=payload, timeout=5)
            return response.status_code == 200
        except Exception:
            return False

    def generate(self, prompt: str, model: str, **kwargs) -> Optional[str]:
        """تولید پاسخ با Ollama"""
        try:
            payload = {
                "model": model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": kwargs.get('temperature', 0.6),
                    "max_tokens": kwargs.get('max_tokens', 2000),
                }
            }

            timeout = kwargs.get('timeout', 600)
            response = requests.post(self.base_url, json=payload, timeout=timeout + 30)
            response.raise_for_status()

            result = response.json()
            return result.get('response', '')

        except requests.exceptions.Timeout:
            logger.error(f"⏰ Ollama timeout for model {model}")
            return None
        except requests.exceptions.HTTPError as e:
            logger.error(f"❌ Ollama HTTP error: {str(e)}")
            if hasattr(e, 'response') and e.response:
                logger.error(f"📝 Ollama response: {e.response.text[:500]}")
            return None
        except Exception as e:
            logger.error(f"❌ Ollama error: {str(e)}")
            return None