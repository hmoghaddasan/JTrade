# backend/apps/trading/services/gapgpt_provider.py

import requests
import json
import logging
from typing import Optional, List, Dict, Any
from django.conf import settings
from .ai_provider import AIProvider

logger = logging.getLogger(__name__)


class GapGPTProvider(AIProvider):
    """
    ارائه‌دهنده سرویس Gapgpt.app (سازگار با OpenAI API)
    """

    PROVIDER_NAME = 'gapgpt'
    IS_ONLINE = True
    DISPLAY_NAME = '🌐 Gapgpt.app (آنلاین)'

    # ✅ لیست کامل مدل‌های Gapgpt.app (۳۶ مدل)
    MODELS = [
        # ===== رایگان =====
        {'id': 'GapGPT 5.6 Lite', 'name': 'GapGPT 5.6 Lite', 'rank': 1, 'category': 'free', 'active': True},

        # ===== اقتصادی =====
        {'id': 'GPT-5.6 Luna', 'name': 'GPT-5.6 Luna', 'rank': 2, 'category': 'economic', 'active': True},
        {'id': 'DeepSeek V4 Flash', 'name': 'DeepSeek V4 Flash', 'rank': 3, 'category': 'economic', 'active': True},
        {'id': 'Gemini 3.5 Flash Lite', 'name': 'Gemini 3.5 Flash Lite', 'rank': 4, 'category': 'economic',
         'active': True},
        {'id': 'GPT-5.4 nano', 'name': 'GPT-5.4 nano', 'rank': 5, 'category': 'economic', 'active': True},
        {'id': 'GPT-5.4 mini', 'name': 'GPT-5.4 mini', 'rank': 6, 'category': 'economic', 'active': True},

        # ===== میان‌رده =====
        {'id': 'Grok 4.1 Fast', 'name': 'Grok 4.1 Fast', 'rank': 7, 'category': 'mid', 'active': True},
        {'id': 'Claude 4.5 Haiku', 'name': 'Claude 4.5 Haiku', 'rank': 8, 'category': 'mid', 'active': True},
        {'id': 'Gemini 3.7 Flash', 'name': 'Gemini 3.7 Flash', 'rank': 9, 'category': 'mid', 'active': True},
        {'id': 'DeepSeek', 'name': 'DeepSeek', 'rank': 10, 'category': 'mid', 'active': True},
        {'id': 'GPT-5.6 Terra', 'name': 'GPT-5.6 Terra', 'rank': 11, 'category': 'mid', 'active': True},

        # ===== حرفه‌ای =====
        {'id': 'GapGPT 5.6', 'name': 'GapGPT 5.6', 'rank': 12, 'category': 'premium', 'active': True},
        {'id': 'Claude 4.6 Sonnet', 'name': 'Claude 4.6 Sonnet', 'rank': 13, 'category': 'premium', 'active': True},
        {'id': 'Claude 5 Sonnet', 'name': 'Claude 5 Sonnet', 'rank': 14, 'category': 'premium', 'active': True},
        {'id': 'Gemini 3.1 Pro', 'name': 'Gemini 3.1 Pro', 'rank': 15, 'category': 'premium', 'active': True},
        {'id': 'Grok 4.3', 'name': 'Grok 4.3', 'rank': 16, 'category': 'premium', 'active': True},
        {'id': 'DeepSeek V4 Pro', 'name': 'DeepSeek V4 Pro', 'rank': 17, 'category': 'premium', 'active': True},
        {'id': 'GPT-5.4', 'name': 'GPT-5.4', 'rank': 18, 'category': 'premium', 'active': True},
        {'id': 'GPT-5.4 Pro', 'name': 'GPT-5.4 Pro', 'rank': 19, 'category': 'premium', 'active': True},

        # ===== VIP =====
        {'id': 'GPT-5.6 Sol', 'name': 'GPT-5.6 Sol', 'rank': 20, 'category': 'vip', 'active': True},
        {'id': 'Claude Fable 5', 'name': 'Claude Fable 5', 'rank': 21, 'category': 'vip', 'active': True},
        {'id': 'Claude Opus 5', 'name': 'Claude Opus 5', 'rank': 22, 'category': 'vip', 'active': True},
        {'id': 'o4-mini', 'name': 'o4-mini', 'rank': 23, 'category': 'vip', 'active': True},
        {'id': 'o4-mini-high', 'name': 'o4-mini-high', 'rank': 24, 'category': 'vip', 'active': True},
        {'id': 'DeepSeek R1', 'name': 'DeepSeek R1', 'rank': 25, 'category': 'vip', 'active': True},
        {'id': 'Grok 4.6', 'name': 'Grok 4.6', 'rank': 26, 'category': 'vip', 'active': True},
        {'id': 'Gemini 2.5 pro', 'name': 'Gemini 2.5 pro', 'rank': 27, 'category': 'vip', 'active': True},
        {'id': 'o3', 'name': 'o3', 'rank': 28, 'category': 'vip', 'active': True},
        {'id': 'o3 pro', 'name': 'o3 pro', 'rank': 29, 'category': 'vip', 'active': True},
        {'id': 'Perplexity', 'name': 'Perplexity', 'rank': 30, 'category': 'vip', 'active': True},
        {'id': 'Qwen 3', 'name': 'Qwen 3', 'rank': 31, 'category': 'vip', 'active': True},
        {'id': 'Qwen 3 Max', 'name': 'Qwen 3 Max', 'rank': 32, 'category': 'vip', 'active': True},
        {'id': 'Minimax M2', 'name': 'Minimax M2', 'rank': 33, 'category': 'vip', 'active': True},
        {'id': 'GLM 5', 'name': 'GLM 5', 'rank': 34, 'category': 'vip', 'active': True},
        {'id': 'Kimi 2.5', 'name': 'Kimi 2.5', 'rank': 35, 'category': 'vip', 'active': True},
        {'id': 'Kimi K3', 'name': 'Kimi K3', 'rank': 36, 'category': 'vip', 'active': True},
    ]

    CATEGORY_PRICING = {
        'free': {'input': 0, 'output': 0},
        'economic': {'input': 0.20, 'output': 1.00},
        'mid': {'input': 0.50, 'output': 2.50},
        'premium': {'input': 1.50, 'output': 8.00},
        'vip': {'input': 3.00, 'output': 15.00},
    }

    COOLDOWN = {
        'free': 10,
        'economic': 5,
        'mid': 15,
        'premium': 30,
        'vip': 60,
    }

    CATEGORY_LABELS = {
        'free': '🟢 رایگان',
        'economic': '🟢 اقتصادی',
        'mid': '🟡 میان‌رده',
        'premium': '🟠 حرفه‌ای',
        'vip': '🔴 VIP',
    }

    def __init__(self):
        from apps.accounts.models import SystemSetting

        # ✅ خواندن تنظیمات از دیتابیس
        self.api_key = SystemSetting.get_setting('gapgpt_api_key', '') or ''
        self.base_url = SystemSetting.get_setting('gapgpt_base_url', 'https://api.gapgpt.app/v1')
        self.default_model = SystemSetting.get_setting('gapgpt_default_model', 'GapGPT 5.6 Lite')

        # ✅ لاگ برای دیباگ
        logger.info(f"🔑 [GapGPT] API Key موجود: {'✅ بله' if self.api_key else '❌ خیر'}")
        logger.info(f"🔑 [GapGPT] API Key length: {len(self.api_key)}")
        logger.info(f"🔑 [GapGPT] Base URL: {self.base_url}")

    @property
    def provider_name(self) -> str:
        return self.PROVIDER_NAME

    @property
    def is_online(self) -> bool:
        return bool(self.api_key)

    def get_available_models(self) -> list:
        """دریافت لیست مدل‌های Gapgpt.app"""
        logger.info(f"🔍 [GapGPT] get_available_models called, API Key: {'✅ موجود' if self.api_key else '❌ وجود ندارد'}")

        if not self.api_key:
            logger.warning("⚠️ Gapgpt.app API Key تنظیم نشده است")
            return []

        available_models = []

        for model in self.MODELS:
            if not model.get('active', True):
                continue

            logger.info(f"🔄 [GapGPT] Testing model: {model['id']}")

            if self.test_connection(model['id']):
                category = model['category']
                available_models.append({
                    'id': model['id'],
                    'name': model['name'],
                    'provider': self.PROVIDER_NAME,
                    'display_name': self.DISPLAY_NAME,
                    'rank': model['rank'],
                    'category': category,
                    'category_label': self.CATEGORY_LABELS.get(category, category),
                    'free': category == 'free',
                    'online': True,
                    'cooldown': self.COOLDOWN.get(category, 10),
                    'pricing': self.CATEGORY_PRICING.get(category, {'input': 0, 'output': 0}),
                })
                logger.info(f"✅ [GapGPT] Model {model['id']} is available")
            else:
                logger.warning(f"❌ [GapGPT] Model {model['id']} is NOT available")

        available_models.sort(key=lambda x: x['rank'])
        logger.info(f"✅ [GapGPT] Total {len(available_models)} models available")
        return available_models

    def get_all_models(self) -> list:
        """دریافت لیست کامل مدل‌ها (بدون تست اتصال)"""
        models = []
        for model in self.MODELS:
            if not model.get('active', True):
                continue
            category = model['category']
            models.append({
                'id': model['id'],
                'name': model['name'],
                'provider': self.PROVIDER_NAME,
                'display_name': self.DISPLAY_NAME,
                'rank': model['rank'],
                'category': category,
                'category_label': self.CATEGORY_LABELS.get(category, category),
                'free': category == 'free',
                'online': True,
                'cooldown': self.COOLDOWN.get(category, 10),
            })
        models.sort(key=lambda x: x['rank'])
        return models

    def get_model_info(self, model_id: str) -> Optional[Dict]:
        """دریافت اطلاعات کامل یک مدل"""
        for model in self.MODELS:
            if model['id'] == model_id:
                category = model['category']
                return {
                    **model,
                    'pricing': self.CATEGORY_PRICING.get(category, {'input': 0, 'output': 0}),
                    'cooldown': self.COOLDOWN.get(category, 10),
                    'category_label': self.CATEGORY_LABELS.get(category, category),
                    'display_name': self.DISPLAY_NAME,
                }
        return None

    def test_connection(self, model: str) -> bool:
        """تست اتصال به Gapgpt.app API"""
        if not self.api_key:
            logger.warning(f"⚠️ [GapGPT] Cannot test {model}: No API Key")
            return False

        try:
            url = f"{self.base_url}/chat/completions"
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json',
            }
            payload = {
                'model': model,
                'messages': [{'role': 'user', 'content': 'سلام'}],
                'max_tokens': 5,
            }

            logger.info(f"📡 [GapGPT] Testing connection to {url} with model {model}")

            response = requests.post(url, headers=headers, json=payload, timeout=5)

            logger.info(f"📡 [GapGPT] Response status: {response.status_code}")

            if response.status_code == 200:
                logger.info(f"✅ Gapgpt.app model '{model}' is available")
                return True
            else:
                logger.warning(f"⚠️ Gapgpt.app model '{model}' returned status {response.status_code}")
                logger.warning(f"⚠️ Response body: {response.text[:200]}")
                return False

        except requests.exceptions.ConnectionError as e:
            logger.error(f"🔌 [GapGPT] Connection error: {str(e)}")
            return False
        except requests.exceptions.Timeout as e:
            logger.error(f"⏰ [GapGPT] Timeout: {str(e)}")
            return False
        except Exception as e:
            logger.error(f"❌ [GapGPT] Test failed: {str(e)}")
            return False

    def generate(self, prompt: str, model: str, **kwargs) -> Optional[str]:
        """تولید پاسخ با Gapgpt.app API"""
        if not self.api_key:
            logger.error("❌ Gapgpt.app API Key تنظیم نشده است")
            return None

        try:
            url = f"{self.base_url}/chat/completions"
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json',
            }
            payload = {
                'model': model or self.default_model,
                'messages': [{'role': 'user', 'content': prompt}],
                'temperature': kwargs.get('temperature', 0.6),
                'max_tokens': kwargs.get('max_tokens', 2000),
            }

            logger.info(f"🔄 Calling Gapgpt.app with model: {model or self.default_model}")

            response = requests.post(
                url,
                headers=headers,
                json=payload,
                timeout=kwargs.get('timeout', 60)
            )
            response.raise_for_status()

            data = response.json()
            if 'choices' in data and len(data['choices']) > 0:
                text = data['choices'][0]['message']['content']
                return text

            logger.error(f"❌ Gapgpt.app response format invalid: {data}")
            return None

        except requests.exceptions.Timeout:
            logger.error(f"⏰ Gapgpt.app timeout for model {model}")
            return None
        except requests.exceptions.HTTPError as e:
            logger.error(f"❌ Gapgpt.app HTTP error: {str(e)}")
            if hasattr(e, 'response') and e.response:
                logger.error(f"📝 Gapgpt.app response: {e.response.text[:500]}")
            return None
        except Exception as e:
            logger.error(f"❌ Gapgpt.app error: {str(e)}")
            return None