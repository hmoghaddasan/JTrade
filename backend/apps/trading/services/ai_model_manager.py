# backend/apps/trading/services/ai_model_manager.py

import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from .ai_provider import AIProvider
from .gemini_provider import GeminiProvider
from .openrouter_provider import OpenRouterProvider
from .huggingface_provider import HuggingFaceProvider
from .ollama_provider import OllamaProvider
from .gapgpt_provider import GapGPTProvider

logger = logging.getLogger(__name__)


@dataclass
class ModelInfo:
    """اطلاعات یک مدل AI"""
    id: str
    name: str
    provider: str
    rank: int
    free: bool
    online: bool
    available: bool = True
    display_name: str = ''
    category: str = ''
    category_label: str = ''
    cooldown: int = 10
    pricing: Dict = None

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'provider': self.provider,
            'display_name': self.display_name or self.provider,
            'rank': self.rank,
            'free': self.free,
            'online': self.online,
            'available': self.available,
            'category': self.category,
            'category_label': self.category_label,
            'cooldown': self.cooldown,
            'pricing': self.pricing or {},
        }


class AIModelManager:
    """مدیریت مدل‌های هوش مصنوعی از سرویس‌های مختلف"""

    _instance = None
    _providers: List[AIProvider] = []
    _models: List[ModelInfo] = []
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if not self._initialized:
            self._providers = self._init_providers()
            self._initialized = True

    def _init_providers(self) -> List[AIProvider]:
        """ایجاد نمونه از تمام ارائه‌دهندگان"""
        providers = []

        # ===== ارائه‌دهندگان آنلاین =====
        try:
            providers.append(GapGPTProvider())
        except Exception as e:
            logger.error(f"❌ Error initializing GapGPTProvider: {str(e)}")

        try:
            providers.append(GeminiProvider())
        except Exception as e:
            logger.error(f"❌ Error initializing GeminiProvider: {str(e)}")

        try:
            providers.append(OpenRouterProvider())
        except Exception as e:
            logger.error(f"❌ Error initializing OpenRouterProvider: {str(e)}")

        try:
            providers.append(HuggingFaceProvider())
        except Exception as e:
            logger.error(f"❌ Error initializing HuggingFaceProvider: {str(e)}")

        # ===== ارائه‌دهندگان محلی =====
        try:
            providers.append(OllamaProvider())
        except Exception as e:
            logger.error(f"❌ Error initializing OllamaProvider: {str(e)}")

        return providers

    def _get_provider_mode(self) -> str:
        """دریافت حالت ارائه‌دهنده از تنظیمات"""
        from apps.accounts.models import SystemSetting
        try:
            mode = SystemSetting.get_setting('ai_provider_mode', 'hybrid')
            return mode
        except:
            return 'hybrid'

    def refresh_models(self) -> List[Dict[str, Any]]:
        """بازخوانی لیست مدل‌ها از تمام ارائه‌دهندگان"""
        logger.info("🔄 Refreshing AI models from all providers...")

        all_models = []
        provider_mode = self._get_provider_mode()
        logger.info(f"📌 Provider mode: {provider_mode}")

        # ===== تعیین ترتیب ارائه‌دهندگان بر اساس حالت =====
        provider_order = []
        online_providers = []
        offline_providers = []

        for provider in self._providers:
            if provider.is_online:
                online_providers.append(provider)
            else:
                offline_providers.append(provider)

        if provider_mode == 'online':
            provider_order = online_providers
            logger.info("📌 Only online providers (Gapgpt.app)")
        elif provider_mode == 'offline':
            provider_order = offline_providers
            logger.info("📌 Only offline providers (Ollama)")
        else:  # hybrid
            provider_order = online_providers + offline_providers
            logger.info("📌 Hybrid mode: online first, then offline")

        for provider in provider_order:
            try:
                models = provider.get_available_models()
                provider_name = provider.provider_name
                display_name = getattr(provider, 'DISPLAY_NAME', provider_name)

                for model in models:
                    all_models.append(ModelInfo(
                        id=model['id'],
                        name=model.get('name', model['id']),
                        provider=provider_name,
                        display_name=model.get('display_name', display_name),
                        rank=model.get('rank', 50),
                        free=model.get('free', True),
                        online=model.get('online', False),
                        available=True,
                        category=model.get('category', ''),
                        category_label=model.get('category_label', ''),
                        cooldown=model.get('cooldown', 10),
                        pricing=model.get('pricing', {}),
                    ))
                logger.info(f"✅ {provider_name}: {len(models)} models available")
            except Exception as e:
                logger.error(f"❌ Error getting models from {provider.provider_name}: {str(e)}")

        all_models.sort(key=lambda x: (0 if x.online else 1, x.rank))

        self._models = all_models
        logger.info(f"✅ Total {len(all_models)} AI models available")

        if not all_models:
            logger.warning("⚠️ No models found, adding fallback models")
            all_models.append(ModelInfo(
                id='llama3.1:8b',
                name='Llama 3.1 8B',
                provider='ollama',
                display_name='Ollama (محلی)',
                rank=100,
                free=True,
                online=False,
                available=True,
                category='local',
                category_label='🟣 محلی',
                cooldown=5,
                pricing={'input': 0, 'output': 0},
            ))
            all_models.append(ModelInfo(
                id='GapGPT 5.6 Lite',
                name='GapGPT 5.6 Lite',
                provider='gapgpt',
                display_name='Gapgpt.app (آنلاین)',
                rank=1,
                free=True,
                online=True,
                available=True,
                category='free',
                category_label='🟢 رایگان',
                cooldown=10,
                pricing={'input': 0, 'output': 0},
            ))
            self._models = all_models

        return [m.to_dict() for m in all_models]

    def get_available_models(self, include_offline: bool = True) -> List[Dict[str, Any]]:
        """دریافت لیست مدل‌های موجود"""
        if not self._models:
            return self.refresh_models()

        result = [m.to_dict() for m in self._models if m.available]

        if not include_offline:
            result = [m for m in result if m['online']]

        return result

    def get_model(self, model_id: str) -> Optional[ModelInfo]:
        """دریافت اطلاعات یک مدل خاص"""
        for model in self._models:
            if model.id == model_id:
                return model
        return None

    def get_provider(self, model_id: str) -> Optional[AIProvider]:
        """دریافت ارائه‌دهنده مربوط به یک مدل"""
        model = self.get_model(model_id)
        if not model:
            return None

        for provider in self._providers:
            if provider.provider_name == model.provider:
                return provider
        return None

    def generate(self, prompt: str, model_id: str, **kwargs) -> Optional[str]:
        """تولید پاسخ با استفاده از مدل مشخص"""
        provider = self.get_provider(model_id)
        if not provider:
            logger.error(f"❌ Provider for model '{model_id}' not found")
            return None

        logger.info(f"🔄 Generating with model: {model_id} via {provider.provider_name}")
        return provider.generate(prompt, model_id, **kwargs)

    def test_model(self, model_id: str) -> bool:
        """تست یک مدل خاص"""
        provider = self.get_provider(model_id)
        if not provider:
            return False
        return provider.test_connection(model_id)

    def get_model_info(self, model_id: str) -> Optional[Dict]:
        """دریافت اطلاعات کامل یک مدل"""
        model = self.get_model(model_id)
        if not model:
            return None

        provider = self.get_provider(model_id)
        if provider and hasattr(provider, 'get_model_info'):
            info = provider.get_model_info(model_id)
            if info:
                return info

        return model.to_dict()

    def get_model_cooldown(self, model_id: str) -> int:
        """دریافت کول‌داون یک مدل خاص"""
        info = self.get_model_info(model_id)
        return info.get('cooldown', 10) if info else 10

    def estimate_cost(self, model_id: str, input_tokens: int = 2000, output_tokens: int = 1000) -> Dict:
        """تخمین هزینه یک مشاوره با مدل مشخص"""
        info = self.get_model_info(model_id)
        if not info:
            return {'error': 'مدل یافت نشد'}

        pricing = info.get('pricing', {})
        input_cost = (pricing.get('input', 0) / 1_000_000) * input_tokens
        output_cost = (pricing.get('output', 0) / 1_000_000) * output_tokens

        usd_total = input_cost + output_cost
        rial_total = usd_total * 58000

        return {
            'model': model_id,
            'input_tokens': input_tokens,
            'output_tokens': output_tokens,
            'total_tokens': input_tokens + output_tokens,
            'cost_usd': round(usd_total, 6),
            'cost_rial': round(rial_total, 0),
            'cooldown': info.get('cooldown', 10),
            'category': info.get('category', 'unknown'),
            'category_label': info.get('category_label', ''),
        }


# نمونه Singleton
model_manager = AIModelManager()