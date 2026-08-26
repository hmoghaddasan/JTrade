# backend/apps/trading/tasks.py

import threading
import logging
import traceback
from django.db import transaction
from .models import AIConsultation, AIPromptVersion
from .ai_service import AIService

logger = logging.getLogger(__name__)


def process_consultation(consultation_id, user_input):
    consultation = None
    try:
        logger.info(f"🚀 [START] Processing consultation {consultation_id}")

        # ===== ۱. دریافت مشاوره =====
        consultation = AIConsultation.objects.get(id=consultation_id)
        logger.info(f"📊 [STEP 1] Consultation {consultation_id} retrieved")

        # ===== ۲. تغییر وضعیت به processing =====
        consultation.status = 'processing'
        consultation.save(update_fields=['status'])
        logger.info(f"🔄 [STEP 2] Status changed to 'processing'")

        # ===== ۳. دریافت آنالیتیکس =====
        analytics = AIService.get_user_detailed_analytics(
            consultation.user,
            consultation.symbol,
            {
                'entry_price': consultation.entry_price,
                'direction': consultation.direction,
                'stop_loss': consultation.stop_loss,
                'take_profit': consultation.take_profit,
                'market_condition': consultation.market_condition,
                'emotion': consultation.emotion,
                'time_ny': consultation.time_ny,
                'user_question': consultation.user_question,
                'session_type': consultation.session_type,
                'strategy_type': consultation.strategy_type,
                'timeframes': consultation.timeframes,
                'risk_percent': consultation.risk_percent,
                'volume': consultation.volume,
                'model': consultation.model_used,
            }
        )
        logger.info(f"✅ [STEP 3] Analytics fetched")

        # ===== ۴. ساخت پرامپت =====
        prompt = AIService.build_prompt(analytics, {
            'entry_price': consultation.entry_price,
            'direction': consultation.direction,
            'stop_loss': consultation.stop_loss,
            'take_profit': consultation.take_profit,
            'market_condition': consultation.market_condition,
            'emotion': consultation.emotion,
            'time_ny': consultation.time_ny,
            'user_question': consultation.user_question,
            'session_type': consultation.session_type,
            'strategy_type': consultation.strategy_type,
            'timeframes': consultation.timeframes,
            'risk_percent': consultation.risk_percent,
            'volume': consultation.volume,
            'model': consultation.model_used,
            'symbol': consultation.symbol,
        })
        consultation.prompt_used = prompt
        consultation.save(update_fields=['prompt_used'])
        logger.info(f"✅ [STEP 4] Prompt built, length: {len(prompt)}")

        # ===== ۵. فراخوانی AI با انتخاب provider مناسب =====
        model = consultation.model_used or AIService.OLLAMA_MODEL
        logger.info(f"🔄 [STEP 5] Original model from consultation: {model}")

        # ✅ اگر mode online است و مدل llama3.1:8b است، به o4-mini تغییر کن
        try:
            mode = AIService._get_provider_mode()
            if mode == 'online' and model == 'llama3.1:8b':
                model = 'o4-mini'
                logger.info(f"🔄 [STEP 5] Changed model to {model} because mode is online")
        except Exception as e:
            logger.warning(f"⚠️ [STEP 5] Could not check provider mode: {str(e)}")

        logger.info(f"🔄 [STEP 5] Calling AI with model: {model}, timeout: {AIService.OLLAMA_TIMEOUT}s")

        try:
            # ✅ اصلاح: استفاده از model_name به جای model
            response_text = AIService.get_ai_response(prompt, model_name=model)

            # بررسی اینکه آیا پاسخ خطای اتصال است
            if response_text and '❌ خطای اتصال به سرویس هوش مصنوعی' in response_text:
                logger.error(f"❌ [STEP 5] AI returned connection error")
                logger.error(f"📝 [STEP 5] Full error: {response_text[:500]}")
                consultation.status = 'failed'
                consultation.ai_response = {
                    'error': response_text,
                    'score': 0,
                    'strengths': [],
                    'warnings': ['⚠️ سرویس هوش مصنوعی در دسترس نیست'],
                    'suggestion': 'لطفاً اتصال به سرویس AI را بررسی کنید.',
                    'tip': 'همیشه به مدیریت ریسک توجه کنید.',
                    'psychology': 'تحلیل روانشناختی موجود نیست.',
                    'is_connection_error': True,
                }
                consultation.save(update_fields=['status', 'ai_response'])
                logger.info(f"❌ Consultation {consultation_id} marked as 'failed'")
                return

            logger.info(f"✅ [STEP 5] AI responded, length: {len(response_text)}")

            # ✅ نمایش ۵۰۰ کاراکتر اول پاسخ برای دیباگ
            logger.info(f"📝 [STEP 5] Response preview: {response_text[:500]}...")

        except Exception as e:
            logger.error(f"❌ [STEP 5] AI call failed: {str(e)}")
            logger.error(f"❌ [STEP 5] Full traceback: {traceback.format_exc()}")
            consultation.status = 'failed'
            consultation.ai_response = {
                'error': str(e),
                'score': 0,
                'strengths': [],
                'warnings': ['⚠️ خطا در ارتباط با AI'],
                'suggestion': 'لطفاً دوباره تلاش کنید.',
                'tip': 'همیشه به مدیریت ریسک توجه کنید.',
                'psychology': 'تحلیل روانشناختی موجود نیست.',
                'is_connection_error': True,
            }
            consultation.save(update_fields=['status', 'ai_response'])
            logger.info(f"❌ Consultation {consultation_id} marked as 'failed'")
            return

        # ===== ۶. بررسی خطا بودن پاسخ =====
        if '❌ خطای اتصال به سرویس هوش مصنوعی' in response_text or '❌ پاسخ نامعتبر' in response_text:
            logger.error(f"❌ [STEP 6] AI returned error response")
            logger.error(f"📝 [STEP 6] Full error response: {response_text}")
            consultation.status = 'failed'
            consultation.ai_response = {
                'error': response_text,
                'score': 0,
                'strengths': [],
                'warnings': ['⚠️ سرویس هوش مصنوعی در دسترس نیست'],
                'suggestion': 'لطفاً اتصال به سرویس AI را بررسی کنید.',
                'tip': 'همیشه به مدیریت ریسک توجه کنید.',
                'psychology': 'تحلیل روانشناختی موجود نیست.',
                'is_connection_error': True,
            }
            consultation.save(update_fields=['status', 'ai_response'])
            logger.info(f"❌ Consultation {consultation_id} marked as 'failed'")
            return

        # ===== ۷. پردازش پاسخ سالم =====
        parsed_response = AIService.parse_ai_response(
            response_text,
            analytics,
            {
                'entry_price': consultation.entry_price,
                'direction': consultation.direction,
                'stop_loss': consultation.stop_loss,
                'take_profit': consultation.take_profit,
                'market_condition': consultation.market_condition,
                'emotion': consultation.emotion,
                'time_ny': consultation.time_ny,
                'user_question': consultation.user_question,
                'session_type': consultation.session_type,
                'strategy_type': consultation.strategy_type,
                'timeframes': consultation.timeframes,
                'risk_percent': consultation.risk_percent,
                'volume': consultation.volume,
                'model': consultation.model_used,
                'symbol': consultation.symbol,
            }
        )
        logger.info(f"✅ [STEP 7] Response parsed, score: {parsed_response.get('score', 0)}")

        # ===== ۸. ذخیره نتیجه و تغییر وضعیت به completed =====
        consultation.ai_score = parsed_response.get('score', 0)
        consultation.ai_response = parsed_response
        consultation.status = 'completed'
        consultation.save(update_fields=['ai_score', 'ai_response', 'status'])
        logger.info(f"✅ [DONE] Consultation {consultation_id} completed successfully! Status: {consultation.status}")

        # ===== ۹. کاهش اعتبار اشتراک (اختیاری) =====
        try:
            from apps.subscriptions.models import UserSubscription
            subscription = UserSubscription.objects.filter(
                user=consultation.user,
                is_active=True
            ).latest('created_at')
            subscription.ai_consultations_used += 1
            subscription.save(update_fields=['ai_consultations_used'])
            logger.info(f"✅ Usage counted: {subscription.ai_consultations_used}")
        except Exception as e:
            logger.warning(f"⚠️ Could not update subscription usage: {str(e)}")

        # ===== ۱۰. به‌روزرسانی آمار پرامپت =====
        try:
            best_prompt = AIPromptVersion.objects.filter(status='active').order_by('-performance_score').first()
            if best_prompt:
                best_prompt.usage_count += 1
                best_prompt.save()
        except Exception as e:
            logger.error(f"⚠️ Error updating prompt stats: {str(e)}")

    except AIConsultation.DoesNotExist:
        logger.error(f"❌ [FATAL] Consultation {consultation_id} not found")
        return

    except Exception as e:
        logger.error(f"❌ [FATAL] Error processing consultation {consultation_id}:")
        logger.error(f"   - Error: {str(e)}")
        logger.error(f"   - Traceback: {traceback.format_exc()}")

        try:
            if consultation is None:
                consultation = AIConsultation.objects.get(id=consultation_id)
            consultation.status = 'failed'
            consultation.ai_response = {
                'error': str(e),
                'score': 0,
                'strengths': [],
                'warnings': ['⚠️ خطا در پردازش مشاوره'],
                'suggestion': 'لطفاً دوباره تلاش کنید.',
                'tip': 'همیشه به مدیریت ریسک توجه کنید.',
                'psychology': 'تحلیل روانشناختی موجود نیست.',
                'is_connection_error': True,
            }
            consultation.save(update_fields=['status', 'ai_response'])
            logger.info(f"❌ Consultation {consultation_id} marked as 'failed'")
        except Exception as inner_e:
            logger.error(f"❌ [CRITICAL] Failed to save error status: {str(inner_e)}")


def start_consultation_task(consultation_id, user_input):
    logger.info(f"🚀 [TASK START] Starting background task for consultation {consultation_id}")
    thread = threading.Thread(
        target=process_consultation,
        args=(consultation_id, user_input),
        daemon=True,
        name=f"OllamaWorker-{consultation_id}"
    )
    thread.start()
    logger.info(f"✅ [TASK STARTED] Thread '{thread.name}' started")