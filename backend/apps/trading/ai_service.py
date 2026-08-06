# backend/apps/trading/ai_service.py

import json
import requests
import logging
from datetime import datetime
from django.db.models import Avg, Count, Sum, Q
from django.conf import settings
from .models import Trade, AIConsultation, AIPromptVersion
from apps.accounts.models import User

logger = logging.getLogger(__name__)


class AIService:
    """
    سرویس یکپارچه‌سازی با Ollama برای مشاوره معاملاتی
    """

    OLLAMA_URL = getattr(settings, 'OLLAMA_URL', 'http://localhost:11434/api/generate')
    OLLAMA_MODEL = getattr(settings, 'OLLAMA_MODEL', 'llama3.1:8b')

    # ===== تنظیمات سرویس‌های قیمت =====
    LIVE_PRICE_PROVIDER = getattr(settings, 'LIVE_PRICE_PROVIDER', 'none')

    # Alpha Vantage
    ALPHA_VANTAGE_API_KEY = getattr(settings, 'ALPHA_VANTAGE_API_KEY', '')

    # Twelve Data
    TWELVEDATA_API_KEY = getattr(settings, 'TWELVEDATA_API_KEY', '')
    TWELVEDATA_BASE_URL = getattr(settings, 'TWELVEDATA_BASE_URL', 'https://api.twelvedata.com')

    # Finnhub
    FINNHUB_API_KEY = getattr(settings, 'FINNHUB_API_KEY', '')
    FINNHUB_BASE_URL = getattr(settings, 'FINNHUB_BASE_URL', 'https://finnhub.io/api/v1')

    @classmethod
    def get_user_analytics(cls, user, symbol=None):
        """استخراج داده‌های تحلیلی کاربر برای استفاده در پرامپت"""
        trades = Trade.objects.filter(user=user, is_deleted=False)

        total_trades = trades.count()
        if total_trades == 0:
            return None

        win_count = trades.filter(profit__gt=0).count()
        loss_count = trades.filter(profit__lt=0).count()
        total_profit = trades.aggregate(total=Sum('profit'))['total'] or 0
        total_loss = trades.filter(profit__lt=0).aggregate(total=Sum('profit'))['total'] or 0
        avg_rr = trades.filter(risk_reward_ratio__isnull=False).aggregate(avg=Avg('risk_reward_ratio'))['avg'] or 0
        avg_quality = \
        trades.filter(execution_quality_score__isnull=False).aggregate(avg=Avg('execution_quality_score'))['avg'] or 0

        win_rate = (win_count / total_trades * 100) if total_trades > 0 else 0
        profit_factor = (total_profit / abs(total_loss)) if total_loss and abs(total_loss) > 0 else 0

        symbol_trades = trades.filter(symbol=symbol) if symbol else None
        symbol_stats = None
        if symbol_trades and symbol_trades.count() > 0:
            symbol_win_count = symbol_trades.filter(profit__gt=0).count()
            symbol_stats = {
                'count': symbol_trades.count(),
                'win_rate': (symbol_win_count / symbol_trades.count() * 100),
                'total_profit': symbol_trades.aggregate(total=Sum('profit'))['total'] or 0,
                'avg_rr': symbol_trades.filter(risk_reward_ratio__isnull=False).aggregate(avg=Avg('risk_reward_ratio'))[
                              'avg'] or 0,
            }

        today = datetime.now()
        day_of_week = today.strftime('%A')
        day_trades = trades.filter(day_of_week=day_of_week)
        day_stats = None
        if day_trades and day_trades.count() > 0:
            day_win_count = day_trades.filter(profit__gt=0).count()
            day_stats = {
                'count': day_trades.count(),
                'win_rate': (day_win_count / day_trades.count() * 100),
                'total_profit': day_trades.aggregate(total=Sum('profit'))['total'] or 0,
            }

        last_emotion = trades.exclude(dominant_feeling='').values('dominant_feeling').last()
        emotion_stats = None
        if last_emotion and last_emotion.get('dominant_feeling'):
            emotion = last_emotion['dominant_feeling']
            emotion_trades = trades.filter(dominant_feeling=emotion)
            if emotion_trades.count() > 0:
                emotion_win_count = emotion_trades.filter(profit__gt=0).count()
                emotion_stats = {
                    'emotion': emotion,
                    'count': emotion_trades.count(),
                    'win_rate': (emotion_win_count / emotion_trades.count() * 100),
                    'total_profit': emotion_trades.aggregate(total=Sum('profit'))['total'] or 0,
                }

        smt_rate = 0
        key_levels_rate = 0
        if total_trades > 0:
            smt_rate = (trades.filter(smt_confirmed=True).count() / total_trades * 100)
            key_levels_rate = (trades.filter(key_levels_reviewed=True).count() / total_trades * 100)

        hour_stats = None
        if total_trades > 0:
            hourly = trades.exclude(time_ny__isnull=True).values('time_ny__hour').annotate(
                count=Count('id'),
                win_rate=Count('id', filter=Q(profit__gt=0)) * 100.0 / Count('id')
            ).order_by('-win_rate').first()
            if hourly:
                hour_stats = {
                    'hour': int(hourly['time_ny__hour']),
                    'win_rate': round(hourly['win_rate'], 1),
                }

        return {
            'total_trades': total_trades,
            'win_rate': round(win_rate, 1),
            'total_profit': round(total_profit, 2),
            'profit_factor': round(profit_factor, 2),
            'avg_rr': round(avg_rr, 2),
            'avg_quality': round(avg_quality, 1),
            'symbol_stats': symbol_stats,
            'day_stats': day_stats,
            'emotion_stats': emotion_stats,
            'smt_rate': round(smt_rate, 1),
            'key_levels_rate': round(key_levels_rate, 1),
            'hour_stats': hour_stats,
        }

    @classmethod
    def build_prompt(cls, user_analytics, user_input):
        """ساخت پرامپت برای ارسال به Ollama"""
        best_prompt = AIPromptVersion.objects.filter(status='active').order_by('-performance_score').first()
        if not best_prompt:
            best_prompt = AIPromptVersion.objects.filter(version='default').first()
            if not best_prompt:
                best_prompt = AIPromptVersion.objects.create(
                    version='default',
                    prompt_template=cls.get_default_prompt_template(),
                    status='active'
                )

        analytics_text = cls._format_analytics(user_analytics)
        user_condition_text = cls._format_user_conditions(user_input)

        prompt = best_prompt.prompt_template.format(
            analytics=analytics_text or "کاربر هنوز سابقه معاملاتی ثبت نکرده است.",
            user_conditions=user_condition_text,
            user_question=user_input.get('user_question', 'آیا این معامله مناسب است؟')
        )

        return prompt

    @classmethod
    def _format_analytics(cls, analytics):
        if not analytics:
            return "کاربر هنوز سابقه معاملاتی ثبت نکرده است."

        lines = []
        lines.append(f"- کل تریدها: {analytics['total_trades']}")
        lines.append(f"- نرخ برد کلی: {analytics['win_rate']}%")
        lines.append(f"- سود کل: ${analytics['total_profit']}")
        lines.append(f"- فاکتور سود: {analytics['profit_factor']}")
        lines.append(f"- میانگین R:R: {analytics['avg_rr']}")
        lines.append(f"- میانگین کیفیت اجرا: {analytics['avg_quality']}/۱۰")

        if analytics.get('symbol_stats'):
            s = analytics['symbol_stats']
            lines.append(
                f"- عملکرد این نماد: {s['count']} ترید، نرخ برد {s['win_rate']:.1f}%، سود ${s['total_profit']}")

        if analytics.get('day_stats'):
            d = analytics['day_stats']
            lines.append(
                f"- عملکرد امروز (همان روز هفته): {d['count']} ترید، نرخ برد {d['win_rate']:.1f}%، سود ${d['total_profit']}")

        if analytics.get('emotion_stats'):
            e = analytics['emotion_stats']
            lines.append(
                f"- عملکرد با احساس {e['emotion']}: {e['count']} ترید، نرخ برد {e['win_rate']:.1f}%، سود ${e['total_profit']}")

        lines.append(f"- پایبندی به SMT: {analytics.get('smt_rate', 0)}%")
        lines.append(f"- پایبندی به سطوح کلیدی: {analytics.get('key_levels_rate', 0)}%")

        if analytics.get('hour_stats'):
            h = analytics['hour_stats']
            lines.append(f"- بهترین ساعت معاملاتی: {h['hour']}:۰۰ با نرخ برد {h['win_rate']}%")

        return "\n".join(lines)

    @classmethod
    def _format_user_conditions(cls, user_input):
        lines = []
        lines.append(f"- نماد: {user_input.get('symbol', 'نامشخص')}")
        lines.append(f"- جهت: {user_input.get('direction', 'نامشخص')}")
        lines.append(f"- قیمت فعلی: {user_input.get('entry_price', 'نامشخص')}")

        if user_input.get('stop_loss'):
            lines.append(f"- حد ضرر: {user_input['stop_loss']}")
        if user_input.get('take_profit'):
            lines.append(f"- حد سود: {user_input['take_profit']}")

        # ✅ هشدار قیمت
        if user_input.get('price_warning'):
            lines.append(f"- ⚠️ هشدار: {user_input['price_warning']}")

        market_condition = user_input.get('market_condition')
        if market_condition:
            condition_map = {'trending': 'رونددار', 'ranging': 'رنج', 'neutral': 'خنثی', 'volatile': 'پرنوسان'}
            lines.append(f"- وضعیت بازار: {condition_map.get(market_condition, market_condition)}")

        emotion = user_input.get('emotion')
        if emotion:
            emotion_map = {'calm': 'آرام', 'excited': 'هیجان', 'fear': 'ترس', 'greed': 'طمع',
                           'patient': 'صبر', 'stress': 'استرس', 'confident': 'بااعتمادبه‌نفس', 'uncertain': 'مردد'}
            lines.append(f"- احساسات فعلی: {emotion_map.get(emotion, emotion)}")

        if user_input.get('time_ny'):
            lines.append(f"- ساعت (به وقت نیویورک): {user_input['time_ny']}")

        if user_input.get('user_question'):
            lines.append(f"- سوال کاربر: {user_input['user_question']}")

        return "\n".join(lines)

    @classmethod
    def get_default_prompt_template(cls):
        return """
شما یک مشاور معاملاتی حرفه‌ای با تجربه هستید. بر اساس داده‌های واقعی یک تریدر،
به سوال کاربر پاسخ دهید. لطفاً پاسخ خود را به فارسی بنویسید.

📊 داده‌های تاریخچه کاربر:
{analytics}

📝 شرایط فعلی کاربر:
{user_conditions}

🔍 لطفاً تحلیل زیر را ارائه دهید:

۱. امتیاز اعتبار (۰-۱۰۰) برای این ترید با توضیح مختصر

۲. نقاط قوت این تصمیم (حداقل ۲ مورد، بر اساس داده‌های کاربر)

۳. هشدارها و نقاط ضعف (حداقل ۲ مورد، بر اساس داده‌های کاربر)

۴. پیشنهاد عملی برای مدیریت معامله (مشخص و قابل اجرا)

۵. یک نکته انگیزشی یا آموزشی مرتبط با شرایط کاربر

سوال کاربر: {user_question}

پاسخ خود را به صورت زیر ساختار دهید:
امتیاز: [عدد]
نقاط قوت:
- [مورد ۱]
- [مورد ۲]
هشدارها:
- [مورد ۱]
- [مورد ۲]
پیشنهاد: [پیشنهاد عملی]
نکته: [نکته آموزشی]
"""

    @classmethod
    def call_ollama(cls, prompt, model=None):
        """
        ارسال درخواست به Ollama و دریافت پاسخ (غیراستریم)
        model: نام مدل انتخابی توسط کاربر (اختیاری)
        """
        model = model or cls.OLLAMA_MODEL
        try:
            payload = {
                "model": model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "max_tokens": 800,
                }
            }

            response = requests.post(cls.OLLAMA_URL, json=payload, timeout=120)
            response.raise_for_status()

            result = response.json()
            return result.get('response', '')

        except requests.exceptions.Timeout:
            logger.error("Ollama timeout")
            return "⏰ متأسفانه زمان پاسخگویی به پایان رسید. لطفاً دوباره تلاش کنید."
        except requests.exceptions.ConnectionError:
            logger.error("Ollama connection error")
            return "🔌 اتصال به سرویس AI برقرار نشد. لطفاً مطمئن شوید که Ollama در حال اجراست."
        except Exception as e:
            logger.error(f"Ollama error: {str(e)}")
            return f"❌ خطا در ارتباط با سرویس AI: {str(e)}"

    @classmethod
    def call_ollama_stream(cls, prompt, model=None):
        """
        ارسال درخواست به Ollama با استریم و بازگرداندن ژنراتور
        model: نام مدل انتخابی توسط کاربر (اختیاری)
        """
        model = model or cls.OLLAMA_MODEL
        try:
            payload = {
                "model": model,
                "prompt": prompt,
                "stream": True,
                "options": {
                    "temperature": 0.7,
                    "max_tokens": 800,
                }
            }

            response = requests.post(cls.OLLAMA_URL, json=payload, stream=True, timeout=300)
            response.raise_for_status()

            for line in response.iter_lines():
                if line:
                    try:
                        data = json.loads(line.decode('utf-8'))
                        if 'response' in data:
                            yield data['response']
                        if data.get('done', False):
                            break
                    except json.JSONDecodeError:
                        continue

        except requests.exceptions.Timeout:
            yield "⏰ متأسفانه زمان پاسخگویی به پایان رسید. لطفاً دوباره تلاش کنید."
        except requests.exceptions.ConnectionError:
            yield "🔌 اتصال به سرویس AI برقرار نشد. لطفاً مطمئن شوید که Ollama در حال اجراست."
        except Exception as e:
            logger.error(f"Ollama error: {str(e)}")
            yield f"❌ خطا در ارتباط با سرویس AI: {str(e)}"

    @classmethod
    def parse_ai_response(cls, response_text):
        result = {
            'score': 50,
            'strengths': [],
            'warnings': [],
            'suggestion': 'پیشنهادی موجود نیست.',
            'tip': 'همیشه به مدیریت ریسک توجه کنید.',
        }

        try:
            lines = response_text.strip().split('\n')

            for line in lines:
                if 'امتیاز:' in line or 'امتیاز :' in line:
                    parts = line.split(':')
                    if len(parts) > 1:
                        score_text = parts[1].strip()
                        score_num = ''.join([c for c in score_text if c.isdigit()])
                        if score_num:
                            result['score'] = min(100, max(0, int(score_num)))
                    break

            strengths_section = False
            for line in lines:
                if 'نقاط قوت:' in line or 'نقاط قوت :' in line:
                    strengths_section = True
                    continue
                if strengths_section:
                    if 'هشدارها:' in line or 'هشدارها :' in line or 'پیشنهاد:' in line or 'نکته:' in line:
                        strengths_section = False
                    elif line.strip().startswith('-') or line.strip().startswith('•'):
                        result['strengths'].append(line.strip().lstrip('-• '))

            warnings_section = False
            for line in lines:
                if 'هشدارها:' in line or 'هشدارها :' in line:
                    warnings_section = True
                    continue
                if warnings_section:
                    if 'پیشنهاد:' in line or 'پیشنهاد :' in line or 'نکته:' in line:
                        warnings_section = False
                    elif line.strip().startswith('-') or line.strip().startswith('•'):
                        result['warnings'].append(line.strip().lstrip('-• '))

            for i, line in enumerate(lines):
                if 'پیشنهاد:' in line or 'پیشنهاد :' in line:
                    suggestion_text = line.split(':', 1)[1].strip()
                    for j in range(i + 1, min(i + 5, len(lines))):
                        if 'نکته:' in lines[j] or 'نکته :' in lines[j]:
                            break
                        if lines[j].strip() and not lines[j].strip().startswith('-'):
                            suggestion_text += ' ' + lines[j].strip()
                    result['suggestion'] = suggestion_text
                    break

            for i, line in enumerate(lines):
                if 'نکته:' in line or 'نکته :' in line:
                    tip_text = line.split(':', 1)[1].strip()
                    for j in range(i + 1, min(i + 5, len(lines))):
                        if lines[j].strip() and not lines[j].strip().startswith('-'):
                            tip_text += ' ' + lines[j].strip()
                    result['tip'] = tip_text
                    break

            if result['tip'] == 'همیشه به مدیریت ریسک توجه کنید.' and response_text:
                sentences = response_text.split('.')
                if len(sentences) > 1:
                    last_sentence = sentences[-2].strip() if len(sentences) >= 2 else sentences[-1].strip()
                    if len(last_sentence) > 10:
                        result['tip'] = last_sentence

        except Exception as e:
            logger.error(f"Error parsing AI response: {str(e)}")

        return result

    # ============================================
    # دریافت قیمت لحظه‌ای با انتخاب provider
    # ============================================
    @classmethod
    def get_live_price(cls, symbol):
        """
        دریافت قیمت لحظه‌ای از سرویس انتخاب‌شده توسط ادمین
        اگر provider برابر 'none' باشد، قیمت دریافت نمی‌شود
        """
        provider = cls.LIVE_PRICE_PROVIDER.lower()

        # ✅ اگر provider برابر 'none' باشد، قیمت دریافت نمی‌شود
        if provider == 'none':
            logger.info("ℹ️ دریافت قیمت لحظه‌ای غیرفعال است (LIVE_PRICE_PROVIDER=none)")
            return None

        if provider == 'twelvedata':
            return cls._get_price_from_twelvedata(symbol)
        elif provider == 'finnhub':
            return cls._get_price_from_finnhub(symbol)
        elif provider == 'alphavantage':
            return cls._get_price_from_alphavantage(symbol)
        else:
            logger.warning(f"⚠️ Provider '{provider}' نامعتبر است. قیمت لحظه‌ای دریافت نمی‌شود.")
            return None

    # ============================================
    # پیاده‌سازی سرویس‌ها
    # ============================================
    @classmethod
    def _get_price_from_twelvedata(cls, symbol):
        """دریافت قیمت از Twelve Data"""
        if not cls.TWELVEDATA_API_KEY:
            logger.warning("⚠️ Twelve Data API Key تنظیم نشده است")
            return None

        try:
            formatted_symbol = cls._format_symbol_for_twelvedata(symbol)

            url = f"{cls.TWELVEDATA_BASE_URL}/price"
            params = {
                'symbol': formatted_symbol,
                'apikey': cls.TWELVEDATA_API_KEY,
            }
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            if 'price' in data and data['price']:
                return float(data['price'])
            else:
                logger.warning(f"⚠️ Twelve Data: قیمت برای {symbol} یافت نشد. پاسخ: {data}")
                return None

        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Twelve Data error: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"❌ Twelve Data error: {str(e)}")
            return None

    @classmethod
    def _get_price_from_finnhub(cls, symbol):
        """دریافت قیمت از Finnhub"""
        if not cls.FINNHUB_API_KEY:
            logger.warning("⚠️ Finnhub API Key تنظیم نشده است")
            return None

        try:
            formatted_symbol = cls._format_symbol_for_finnhub(symbol)

            url = f"{cls.FINNHUB_BASE_URL}/quote"
            params = {
                'symbol': formatted_symbol,
                'token': cls.FINNHUB_API_KEY,
            }
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            if 'c' in data and data['c']:
                return float(data['c'])
            else:
                logger.warning(f"⚠️ Finnhub: قیمت برای {symbol} یافت نشد. پاسخ: {data}")
                return None

        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Finnhub error: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"❌ Finnhub error: {str(e)}")
            return None

    @classmethod
    def _get_price_from_alphavantage(cls, symbol):
        """دریافت قیمت از Alpha Vantage (همان متد قبلی)"""
        if not cls.ALPHA_VANTAGE_API_KEY:
            logger.warning("⚠️ Alpha Vantage API Key تنظیم نشده است")
            return None

        try:
            if symbol in ['XAUUSD', 'XAGUSD', 'XPDUSD', 'XPTUSD']:
                return cls._get_commodity_price_av(symbol)
            if symbol in ['USOIL', 'UKOIL']:
                return cls._get_oil_price_av(symbol)

            from_symbol, to_symbol = cls._parse_symbol_av(symbol)
            if not from_symbol or not to_symbol:
                return None

            url = "https://www.alphavantage.co/query"
            params = {
                'function': 'CURRENCY_EXCHANGE_RATE',
                'from_currency': from_symbol,
                'to_currency': to_symbol,
                'apikey': cls.ALPHA_VANTAGE_API_KEY
            }
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            if 'Realtime Currency Exchange Rate' in data:
                price = data['Realtime Currency Exchange Rate']['5. Exchange Rate']
                return float(price)
            else:
                if 'Information' in data:
                    logger.warning(f"⚠️ Alpha Vantage rate limit: {data['Information']}")
                else:
                    logger.error(f"❌ Alpha Vantage error: {data.get('Note', 'Unknown error')}")
                return None

        except Exception as e:
            logger.error(f"❌ Alpha Vantage error: {str(e)}")
            return None

    # ===== متدهای کمکی =====
    @classmethod
    def _format_symbol_for_twelvedata(cls, symbol):
        """تبدیل نماد به فرمت Twelve Data (مثلاً EURUSD -> EUR/USD)"""
        if '/' in symbol:
            return symbol
        if symbol.endswith('USD') and len(symbol) > 3:
            base = symbol[:-3]
            return f"{base}/USD"
        if len(symbol) == 6:
            return f"{symbol[:3]}/{symbol[3:]}"
        return symbol

    @classmethod
    def _format_symbol_for_finnhub(cls, symbol):
        """تبدیل نماد به فرمت Finnhub"""
        if len(symbol) == 6:
            return f"OANDA:{symbol}"
        if symbol.endswith('USD'):
            return f"BINANCE:{symbol}"
        if symbol in ['XAUUSD', 'XAGUSD', 'XPDUSD', 'XPTUSD']:
            return f"OANDA:{symbol}"
        return symbol

    @classmethod
    def _parse_symbol_av(cls, symbol):
        """تبدیل نماد به from_currency و to_currency برای Alpha Vantage"""
        if symbol.endswith('USD'):
            return symbol[:-3], 'USD'
        if symbol == 'EURUSD':
            return 'EUR', 'USD'
        if symbol == 'GBPUSD':
            return 'GBP', 'USD'
        if symbol == 'USDJPY':
            return 'USD', 'JPY'
        if symbol == 'BTCUSD':
            return 'BTC', 'USD'
        if symbol == 'ETHUSD':
            return 'ETH', 'USD'
        if len(symbol) == 6:
            return symbol[:3], symbol[3:]
        return None, None

    @classmethod
    def _get_commodity_price_av(cls, symbol):
        """دریافت قیمت کامودیتی از Alpha Vantage"""
        try:
            commodity_map = {
                'XAUUSD': 'XAU',
                'XAGUSD': 'XAG',
                'XPDUSD': 'XPD',
                'XPTUSD': 'XPT'
            }
            commodity = commodity_map.get(symbol, symbol)
            url = "https://www.alphavantage.co/query"
            params = {
                'function': 'CURRENCY_EXCHANGE_RATE',
                'from_currency': commodity,
                'to_currency': 'USD',
                'apikey': cls.ALPHA_VANTAGE_API_KEY
            }
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            if 'Realtime Currency Exchange Rate' in data:
                price = data['Realtime Currency Exchange Rate']['5. Exchange Rate']
                return float(price)
            return None
        except Exception as e:
            logger.error(f"❌ Commodity price error: {str(e)}")
            return None

    @classmethod
    def _get_oil_price_av(cls, symbol):
        """دریافت قیمت نفت از Alpha Vantage"""
        try:
            function = 'WTI' if symbol == 'USOIL' else 'BRENT'
            url = "https://www.alphavantage.co/query"
            params = {
                'function': function,
                'apikey': cls.ALPHA_VANTAGE_API_KEY
            }
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            if 'data' in data and len(data['data']) > 0:
                return float(data['data'][0]['value'])
            return None
        except Exception as e:
            logger.error(f"❌ Oil price error: {str(e)}")
            return None

    # ============================================
    # اعتبارسنجی قیمت با قیمت لحظه‌ای (اصلاح‌شده)
    # ============================================
    @classmethod
    def validate_prices_with_live(cls, user_input):
        """
        اعتبارسنجی قیمت‌های وارد شده با قیمت لحظه‌ای
        اگر provider برابر 'none' باشد، هشدار عدم دسترسی داده می‌شود
        """
        symbol = user_input.get('symbol')
        entry_price = user_input.get('entry_price')

        if not symbol or not entry_price:
            return True, ""

        # ✅ اگر قیمت لحظه‌ای غیرفعال است، پیام مناسب برگردان
        if cls.LIVE_PRICE_PROVIDER.lower() == 'none':
            return True, "ℹ️ دریافت قیمت لحظه‌ای غیرفعال است. لطفاً قیمت را خودتان بررسی کنید."

        live_price = cls.get_live_price(symbol)
        if live_price is None:
            return True, "⚠️ قیمت لحظه‌ای در دسترس نیست. لطفاً قیمت را خودتان بررسی کنید."

        entry = float(entry_price)
        deviation_percent = abs(entry - live_price) / live_price * 100

        if deviation_percent > 20:
            return True, f"⚠️ قیمت وارد شده ({entry}) بیش از ۲۰% با قیمت لحظه‌ای ({live_price:.4f}) تفاوت دارد."
        elif deviation_percent > 10:
            return True, f"⚠️ قیمت وارد شده ({entry}) حدود {deviation_percent:.1f}% با قیمت لحظه‌ای ({live_price:.4f}) تفاوت دارد."

        return True, f"✅ قیمت وارد شده با قیمت لحظه‌ای ({live_price:.4f}) منطبق است."

    # ============================================
    # تست اتصال به سرویس قیمت (جدید)
    # ============================================
    @classmethod
    def test_connection(cls, symbol='EURUSD'):
        """
        تست اتصال به provider فعال و دریافت قیمت برای یک نماد نمونه
        بازگشت: (success, message, price)
        """
        provider = cls.LIVE_PRICE_PROVIDER.lower()

        # ✅ اگر provider برابر 'none' باشد
        if provider == 'none':
            return False, "ℹ️ دریافت قیمت لحظه‌ای غیرفعال است (LIVE_PRICE_PROVIDER=none). برای فعال‌سازی، مقدار را به twelvedata, finnhub یا alphavantage تغییر دهید.", None

        price = cls.get_live_price(symbol)

        if price is not None:
            return True, f"✅ اتصال به {provider} موفق. قیمت {symbol}: {price}", price
        else:
            return False, f"❌ اتصال به {provider} ناموفق. لطفاً کلید API و تنظیمات را بررسی کنید.", None

    @classmethod
    def validate_trade_logic(cls, user_input):
        """اعتبارسنجی منطق معامله (قوانین بدیهی)"""
        direction = user_input.get('direction')
        entry_price = user_input.get('entry_price')
        stop_loss = user_input.get('stop_loss')
        take_profit = user_input.get('take_profit')

        errors = []
        warnings = []
        info = []

        if entry_price and stop_loss:
            entry = float(entry_price)
            sl = float(stop_loss)

            if direction == 'Buy' and sl >= entry:
                errors.append('⛔ در ترید خرید، حد ضرر باید پایین‌تر از قیمت ورود باشد.')
            elif direction == 'Sell' and sl <= entry:
                errors.append('⛔ در ترید فروش، حد ضرر باید بالاتر از قیمت ورود باشد.')
            else:
                risk_distance = abs(entry - sl)
                info.append(f'📊 فاصله حد ضرر تا ورود: {risk_distance:.4f}')

        if entry_price and take_profit:
            entry = float(entry_price)
            tp = float(take_profit)

            if direction == 'Buy' and tp <= entry:
                errors.append('⛔ در ترید خرید، حد سود باید بالاتر از قیمت ورود باشد.')
            elif direction == 'Sell' and tp >= entry:
                errors.append('⛔ در ترید فروش، حد سود باید پایین‌تر از قیمت ورود باشد.')

        if stop_loss and take_profit and entry_price:
            sl = float(stop_loss)
            tp = float(take_profit)
            entry = float(entry_price)

            if direction == 'Buy':
                risk = entry - sl
                reward = tp - entry
            else:
                risk = sl - entry
                reward = entry - tp

            if risk > 0 and reward > 0:
                rr = reward / risk
                if rr < 1:
                    warnings.append(f'⚠️ نسبت R:R شما {rr:.2f} است. پیشنهاد می‌شود حداقل 1:1 باشد.')
                elif rr >= 3:
                    info.append(f'🎯 نسبت R:R عالی! ({rr:.2f})')
                else:
                    info.append(f'📊 نسبت R:R: {rr:.2f}')
            else:
                if not errors:
                    warnings.append('⚠️ محاسبه R:R نامعتبر است. لطفاً مقادیر را بررسی کنید.')

        market_condition = user_input.get('market_condition')
        if market_condition == 'volatile':
            warnings.append('⚠️ بازار در حالت پرنوسان قرار دارد. ریسک معامله بالاتر است.')

        return {
            'errors': errors,
            'warnings': warnings,
            'info': info,
            'is_valid': len(errors) == 0
        }

    @classmethod
    def get_consultation(cls, user, user_input):
        # ✅ اعتبارسنجی قیمت با قیمت لحظه‌ای (هشدار)
        is_valid, price_message = cls.validate_prices_with_live(user_input)

        # اگر پیام هشدار وجود دارد، آن را به user_input اضافه کن
        if price_message and not price_message.startswith('✅'):
            user_input['price_warning'] = price_message

        # ✅ اعتبارسنجی منطق معامله
        validation = cls.validate_trade_logic(user_input)
        if not validation['is_valid']:
            return {
                'error': 'invalid_trade_logic',
                'message': '\n'.join(validation['errors'])
            }

        analytics = cls.get_user_analytics(user, user_input.get('symbol'))
        prompt = cls.build_prompt(analytics, user_input)

        # ✅ دریافت مدل انتخابی کاربر (اگر ارسال شده باشد)
        model = user_input.get('model') or None

        response_text = cls.call_ollama(prompt, model=model)
        parsed_response = cls.parse_ai_response(response_text)

        consultation = AIConsultation.objects.create(
            user=user,
            symbol=user_input.get('symbol'),
            direction=user_input.get('direction'),
            entry_price=user_input.get('entry_price'),
            stop_loss=user_input.get('stop_loss'),
            take_profit=user_input.get('take_profit'),
            market_condition=user_input.get('market_condition'),
            emotion=user_input.get('emotion'),
            time_ny=user_input.get('time_ny'),
            user_question=user_input.get('user_question'),
            ai_score=parsed_response['score'],
            ai_response=parsed_response,
            prompt_used=prompt,
        )

        try:
            best_prompt = AIPromptVersion.objects.filter(status='active').order_by('-performance_score').first()
            if best_prompt:
                best_prompt.usage_count += 1
                best_prompt.save()
        except Exception as e:
            logger.error(f"Error updating prompt stats: {str(e)}")

        return consultation

    @classmethod
    def get_consultation_stream(cls, user, user_input):
        """
        دریافت مشاوره به صورت استریم (برای نمایش تدریجی به کاربر)
        با اعتبارسنجی کامل قیمت و منطق معامله
        """
        # ✅ اعتبارسنجی قیمت با قیمت لحظه‌ای (هشدار)
        is_valid, price_message = cls.validate_prices_with_live(user_input)

        # اگر پیام هشدار وجود دارد، آن را به user_input اضافه کن
        if price_message and not price_message.startswith('✅'):
            user_input['price_warning'] = price_message

        # ✅ اعتبارسنجی منطق معامله
        validation = cls.validate_trade_logic(user_input)
        if not validation['is_valid']:
            return {
                'error': 'invalid_trade_logic',
                'message': '\n'.join(validation['errors'])
            }

        analytics = cls.get_user_analytics(user, user_input.get('symbol'))
        prompt = cls.build_prompt(analytics, user_input)

        # ✅ دریافت مدل انتخابی کاربر (اگر ارسال شده باشد)
        model = user_input.get('model') or None

        consultation = AIConsultation.objects.create(
            user=user,
            symbol=user_input.get('symbol'),
            direction=user_input.get('direction'),
            entry_price=user_input.get('entry_price'),
            stop_loss=user_input.get('stop_loss'),
            take_profit=user_input.get('take_profit'),
            market_condition=user_input.get('market_condition'),
            emotion=user_input.get('emotion'),
            time_ny=user_input.get('time_ny'),
            user_question=user_input.get('user_question'),
            ai_score=50,
            ai_response={},
            prompt_used=prompt,
        )

        def generate():
            full_response = ""
            for chunk in cls.call_ollama_stream(prompt, model=model):
                full_response += chunk
                yield chunk

            parsed = cls.parse_ai_response(full_response)
            consultation.ai_score = parsed['score']
            consultation.ai_response = parsed
            consultation.save()

            try:
                best_prompt = AIPromptVersion.objects.filter(status='active').order_by('-performance_score').first()
                if best_prompt:
                    best_prompt.usage_count += 1
                    best_prompt.save()
            except Exception as e:
                logger.error(f"Error updating prompt stats: {str(e)}")

        return consultation, generate


class AIFeedbackService:
    """
    سرویس مدیریت بازخوردهای AI
    """

    @classmethod
    def save_feedback(cls, consultation_id, user, feedback_data):
        try:
            consultation = AIConsultation.objects.get(id=consultation_id, user=user)

            consultation.is_followed = feedback_data.get('is_followed')
            consultation.trade_result = feedback_data.get('trade_result')
            consultation.feedback_score = feedback_data.get('feedback_score')
            consultation.feedback_helpfulness = feedback_data.get('feedback_helpfulness')
            consultation.feedback_comment = feedback_data.get('feedback_comment', '')
            consultation.feedback_given_at = datetime.now()
            consultation.save()

            cls._update_prompt_performance(consultation)

            return consultation

        except AIConsultation.DoesNotExist:
            raise ValueError("مشاوره یافت نشد")

    @classmethod
    def _update_prompt_performance(cls, consultation):
        try:
            best_prompt = AIPromptVersion.objects.filter(status='active').order_by('-performance_score').first()
            if not best_prompt:
                return

            feedback_score = consultation.feedback_score or 3

            if consultation.trade_result == 'win':
                trade_bonus = 20
            elif consultation.trade_result == 'loss':
                trade_bonus = -10
            else:
                trade_bonus = 0

            prompt_score = (feedback_score / 5 * 70) + trade_bonus

            total_score = (best_prompt.performance_score * best_prompt.usage_count + prompt_score) / (
                        best_prompt.usage_count + 1)
            best_prompt.performance_score = max(0, min(100, total_score))
            best_prompt.save()

        except Exception as e:
            logger.error(f"Error updating prompt performance: {str(e)}")


class AIAnalyticsService:
    """
    سرویس آمار تحلیلی برای توسعه‌دهنده
    """

    @classmethod
    def get_admin_dashboard(cls):
        from datetime import datetime, timedelta

        today = datetime.now()
        last_month = today - timedelta(days=30)

        consultations = AIConsultation.objects.all()
        feedbacks = consultations.exclude(feedback_score__isnull=True)

        total_consultations = consultations.count()
        total_feedback = feedbacks.count()
        avg_score = consultations.aggregate(avg=Avg('ai_score'))['avg'] or 0
        avg_feedback_score = feedbacks.aggregate(avg=Avg('feedback_score'))['avg'] or 0

        success_count = feedbacks.filter(trade_result='win', is_followed__in=['full', 'partial']).count()
        success_rate = (success_count / total_feedback * 100) if total_feedback > 0 else 0

        symbol_stats = consultations.values('symbol').annotate(
            count=Count('id'),
            avg_score=Avg('ai_score')
        ).order_by('-count')[:10]

        daily_stats = consultations.filter(
            created_at__gte=last_month
        ).extra(
            {'day': "DATE(created_at)"}
        ).values('day').annotate(
            count=Count('id'),
            avg_score=Avg('ai_score'),
            avg_feedback=Avg('feedback_score')
        ).order_by('day')

        best_prompt = AIPromptVersion.objects.filter(
            status='active'
        ).order_by('-performance_score').first()

        recent_feedback = feedbacks.order_by('-feedback_given_at')[:20]

        return {
            'total_consultations': total_consultations,
            'total_feedback': total_feedback,
            'feedback_rate': round(total_feedback / total_consultations * 100, 1) if total_consultations > 0 else 0,
            'avg_score': round(avg_score, 1),
            'avg_feedback_score': round(avg_feedback_score, 2),
            'success_rate': round(success_rate, 1),
            'symbol_stats': list(symbol_stats),
            'daily_stats': list(daily_stats),
            'best_prompt': best_prompt,
            'recent_feedback': recent_feedback,
        }