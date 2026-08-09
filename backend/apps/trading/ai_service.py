# backend/apps/trading/ai_service.py

import json
import requests
import logging
import re
from datetime import datetime
from django.db.models import Avg, Count, Sum, Q, Max, Min
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
    ALPHA_VANTAGE_API_KEY = getattr(settings, 'ALPHA_VANTAGE_API_KEY', '')
    TWELVEDATA_API_KEY = getattr(settings, 'TWELVEDATA_API_KEY', '')
    TWELVEDATA_BASE_URL = getattr(settings, 'TWELVEDATA_BASE_URL', 'https://api.twelvedata.com')
    FINNHUB_API_KEY = getattr(settings, 'FINNHUB_API_KEY', '')
    FINNHUB_BASE_URL = getattr(settings, 'FINNHUB_BASE_URL', 'https://finnhub.io/api/v1')

    @classmethod
    def get_user_detailed_analytics(cls, user, symbol=None, user_input=None):
        """
        استخراج داده‌های تحلیلی دقیق کاربر برای استفاده در پرامپت
        شامل مقایسه با تریدهای مشابه و تحلیل الگوهای رفتاری
        """
        trades = Trade.objects.filter(user=user, is_deleted=False)

        total_trades = trades.count()
        if total_trades == 0:
            return None

        # ===== آمار کلی =====
        win_count = trades.filter(profit__gt=0).count()
        loss_count = trades.filter(profit__lt=0).count()
        breakeven_count = trades.filter(profit=0).count()
        total_profit = trades.aggregate(total=Sum('profit'))['total'] or 0
        total_loss = trades.filter(profit__lt=0).aggregate(total=Sum('profit'))['total'] or 0
        avg_rr = trades.filter(risk_reward_ratio__isnull=False).aggregate(avg=Avg('risk_reward_ratio'))['avg'] or 0
        avg_quality = trades.filter(execution_quality_score__isnull=False).aggregate(avg=Avg('execution_quality_score'))['avg'] or 0
        avg_profit_per_trade = trades.aggregate(avg=Avg('profit'))['avg'] or 0

        win_rate = (win_count / total_trades * 100) if total_trades > 0 else 0
        profit_factor = (total_profit / abs(total_loss)) if total_loss and abs(total_loss) > 0 else 0

        # ===== آمار نماد =====
        symbol_trades = trades.filter(symbol=symbol) if symbol else None
        symbol_stats = None
        if symbol_trades and symbol_trades.count() > 0:
            symbol_win = symbol_trades.filter(profit__gt=0).count()
            symbol_stats = {
                'count': symbol_trades.count(),
                'win_rate': (symbol_win / symbol_trades.count() * 100) if symbol_trades.count() > 0 else 0,
                'total_profit': symbol_trades.aggregate(total=Sum('profit'))['total'] or 0,
                'avg_rr': symbol_trades.filter(risk_reward_ratio__isnull=False).aggregate(avg=Avg('risk_reward_ratio'))['avg'] or 0,
                'avg_quality': symbol_trades.filter(execution_quality_score__isnull=False).aggregate(avg=Avg('execution_quality_score'))['avg'] or 0,
                'avg_profit': symbol_trades.aggregate(avg=Avg('profit'))['avg'] or 0,
                'win_count': symbol_win,
                'loss_count': symbol_trades.filter(profit__lt=0).count(),
            }

        # ===== آمار روز هفته =====
        today = datetime.now()
        day_of_week = today.strftime('%A')
        day_trades = trades.filter(day_of_week=day_of_week)
        day_stats = None
        if day_trades and day_trades.count() > 0:
            day_win = day_trades.filter(profit__gt=0).count()
            day_stats = {
                'count': day_trades.count(),
                'win_rate': (day_win / day_trades.count() * 100) if day_trades.count() > 0 else 0,
                'total_profit': day_trades.aggregate(total=Sum('profit'))['total'] or 0,
                'avg_rr': day_trades.filter(risk_reward_ratio__isnull=False).aggregate(avg=Avg('risk_reward_ratio'))['avg'] or 0,
                'win_count': day_win,
                'loss_count': day_trades.filter(profit__lt=0).count(),
            }

        # ===== آمار احساسات غالب =====
        emotion_aggregated = {}
        all_emotions = trades.exclude(dominant_feeling='').values_list('dominant_feeling', flat=True)
        for em in all_emotions:
            emotion_aggregated[em] = emotion_aggregated.get(em, 0) + 1

        most_common_emotion = max(emotion_aggregated.items(), key=lambda x: x[1])[0] if emotion_aggregated else None

        emotion_stats = None
        if most_common_emotion:
            emotion_trades = trades.filter(dominant_feeling=most_common_emotion)
            if emotion_trades.count() > 0:
                emotion_win = emotion_trades.filter(profit__gt=0).count()
                emotion_stats = {
                    'emotion': most_common_emotion,
                    'count': emotion_trades.count(),
                    'win_rate': (emotion_win / emotion_trades.count() * 100) if emotion_trades.count() > 0 else 0,
                    'total_profit': emotion_trades.aggregate(total=Sum('profit'))['total'] or 0,
                    'avg_rr': emotion_trades.filter(risk_reward_ratio__isnull=False).aggregate(avg=Avg('risk_reward_ratio'))['avg'] or 0,
                }

        # ===== آمار احساس فعلی کاربر (از ورودی) =====
        current_emotion = user_input.get('emotion') if user_input else None
        current_emotion_stats = None
        if current_emotion:
            current_emotion_trades = trades.filter(dominant_feeling=current_emotion)
            if current_emotion_trades.count() > 0:
                ce_win = current_emotion_trades.filter(profit__gt=0).count()
                current_emotion_stats = {
                    'emotion': current_emotion,
                    'count': current_emotion_trades.count(),
                    'win_rate': (ce_win / current_emotion_trades.count() * 100) if current_emotion_trades.count() > 0 else 0,
                    'total_profit': current_emotion_trades.aggregate(total=Sum('profit'))['total'] or 0,
                }

        # ===== آمار پایبندی به چک‌لیست =====
        smt_rate = 0
        key_levels_rate = 0
        checklist_compliance = 0
        if total_trades > 0:
            smt_rate = (trades.filter(smt_confirmed=True).count() / total_trades * 100)
            key_levels_rate = (trades.filter(key_levels_reviewed=True).count() / total_trades * 100)
            checklist_items = ['smt_confirmed', 'key_levels_reviewed', 'bond_dxy_support', 'weekly_news_printed',
                               'zero_hour_identified', 'asian_range_identified', 'london_range_identified',
                               'judas_lo_identified']
            total_checks = sum(1 for t in trades for item in checklist_items if getattr(t, item, False))
            checklist_compliance = (total_checks / (total_trades * len(checklist_items)) * 100) if total_trades > 0 else 0

        # ===== بهترین ساعت معاملاتی =====
        hour_stats = None
        if total_trades > 0:
            hourly = trades.exclude(time_ny__isnull=True).values('time_ny__hour').annotate(
                count=Count('id'),
                win_rate=Count('id', filter=Q(profit__gt=0)) * 100.0 / Count('id'),
                total_profit=Sum('profit')
            ).order_by('-win_rate').first()
            if hourly:
                hour_stats = {
                    'hour': int(hourly['time_ny__hour']),
                    'win_rate': round(hourly['win_rate'], 1),
                    'total_profit': round(hourly['total_profit'] or 0, 2),
                }

        # ===== بهترین استراتژی =====
        strategy_trades = trades.exclude(strategy_type__isnull=True).exclude(strategy_type='')
        strategy_stats = None
        if strategy_trades.count() > 0:
            best_strategy = strategy_trades.values('strategy_type').annotate(
                count=Count('id'),
                win_rate=Count('id', filter=Q(profit__gt=0)) * 100.0 / Count('id'),
                total_profit=Sum('profit')
            ).order_by('-win_rate').first()
            if best_strategy:
                strategy_stats = {
                    'best': best_strategy['strategy_type'],
                    'win_rate': round(best_strategy['win_rate'], 1),
                    'total_profit': round(best_strategy['total_profit'] or 0, 2),
                    'count': best_strategy['count'],
                }

        # ===== بهترین جلسه =====
        session_trades = trades.exclude(session_type__isnull=True).exclude(session_type='')
        session_stats = None
        if session_trades.count() > 0:
            best_session = session_trades.values('session_type').annotate(
                count=Count('id'),
                win_rate=Count('id', filter=Q(profit__gt=0)) * 100.0 / Count('id'),
                total_profit=Sum('profit')
            ).order_by('-win_rate').first()
            if best_session:
                session_stats = {
                    'best': best_session['session_type'],
                    'win_rate': round(best_session['win_rate'], 1),
                    'total_profit': round(best_session['total_profit'] or 0, 2),
                    'count': best_session['count'],
                }

        # ===== تریدهای مشابه (مقایسه) =====
        similar_trades = None
        if symbol and symbol_trades and symbol_trades.count() > 0 and user_input:
            entry = user_input.get('entry_price')
            direction = user_input.get('direction')
            if entry:
                entry_float = float(entry)
                similar = symbol_trades.filter(
                    trade_type=direction,
                    entry_price__gte=entry_float * 0.85,
                    entry_price__lte=entry_float * 1.15
                )
                if similar.count() > 0:
                    similar_win = similar.filter(profit__gt=0).count()
                    similar_loss = similar.filter(profit__lt=0).count()
                    similar_breakeven = similar.filter(profit=0).count()
                    similar_trades = {
                        'count': similar.count(),
                        'win_rate': (similar_win / similar.count() * 100) if similar.count() > 0 else 0,
                        'win_count': similar_win,
                        'loss_count': similar_loss,
                        'breakeven_count': similar_breakeven,
                        'avg_profit': similar.aggregate(avg=Avg('profit'))['avg'] or 0,
                        'avg_rr': similar.filter(risk_reward_ratio__isnull=False).aggregate(avg=Avg('risk_reward_ratio'))['avg'] or 0,
                        'avg_quality': similar.filter(execution_quality_score__isnull=False).aggregate(avg=Avg('execution_quality_score'))['avg'] or 0,
                        'max_profit': similar.aggregate(max=Max('profit'))['max'] or 0,
                        'min_profit': similar.aggregate(min=Min('profit'))['min'] or 0,
                    }

        return {
            'total_trades': total_trades,
            'win_rate': round(win_rate, 1),
            'total_profit': round(total_profit, 2),
            'profit_factor': round(profit_factor, 2),
            'avg_rr': round(avg_rr, 2),
            'avg_quality': round(avg_quality, 1),
            'avg_profit_per_trade': round(avg_profit_per_trade, 2),
            'win_count': win_count,
            'loss_count': loss_count,
            'breakeven_count': breakeven_count,
            'symbol_stats': symbol_stats,
            'day_stats': day_stats,
            'emotion_stats': emotion_stats,
            'current_emotion_stats': current_emotion_stats,
            'most_common_emotion': most_common_emotion,
            'smt_rate': round(smt_rate, 1),
            'key_levels_rate': round(key_levels_rate, 1),
            'checklist_compliance': round(checklist_compliance, 1),
            'hour_stats': hour_stats,
            'strategy_stats': strategy_stats,
            'session_stats': session_stats,
            'similar_trades': similar_trades,
        }

    @classmethod
    def build_prompt(cls, user_analytics, user_input):
        """ساخت پرامپت پیشرفته با تأکید بر تحلیل داده‌های واقعی کاربر"""
        best_prompt = AIPromptVersion.objects.filter(status='active').order_by('-performance_score').first()
        if not best_prompt:
            best_prompt = AIPromptVersion.objects.filter(version='default').first()
            if not best_prompt:
                best_prompt = AIPromptVersion.objects.create(
                    version='default',
                    prompt_template=cls.get_advanced_prompt_template(),
                    status='active'
                )

        analytics_text = cls._format_analytics_for_prompt(user_analytics)
        user_condition_text = cls._format_user_conditions(user_input)

        prompt = best_prompt.prompt_template.format(
            analytics=analytics_text or "کاربر هنوز سابقه معاملاتی ثبت نکرده است.",
            user_conditions=user_condition_text,
            user_question=user_input.get('user_question', 'آیا این معامله مناسب است؟')
        )

        return prompt

    @classmethod
    def _format_analytics_for_prompt(cls, analytics):
        """فرمت‌سازی داده‌های تحلیلی برای پرامپت با جزئیات بیشتر"""
        if not analytics:
            return "کاربر هنوز سابقه معاملاتی ثبت نکرده است."

        lines = []
        lines.append("📊 **خلاصه عملکرد کلی شما:**")
        lines.append(f"- کل تریدها: {analytics['total_trades']} (سود: {analytics['win_count']} | زیان: {analytics['loss_count']} | مساوی: {analytics['breakeven_count']})")
        lines.append(f"- نرخ برد کلی: {analytics['win_rate']}%")
        lines.append(f"- سود کل: ${analytics['total_profit']}")
        lines.append(f"- میانگین سود هر ترید: ${analytics['avg_profit_per_trade']}")
        lines.append(f"- فاکتور سود (نسبت سود به زیان): {analytics['profit_factor']}")
        lines.append(f"- میانگین نسبت ریسک به ریوارد (R:R): {analytics['avg_rr']}")
        lines.append(f"- میانگین کیفیت اجرا: {analytics['avg_quality']}/۱۰")

        if analytics.get('symbol_stats'):
            s = analytics['symbol_stats']
            lines.append("")
            lines.append(f"📈 **عملکرد شما در نماد {analytics.get('symbol', 'این نماد')}:**")
            lines.append(f"- تعداد ترید: {s['count']}")
            lines.append(f"- نرخ برد: {s['win_rate']:.1f}% (سود: {s['win_count']} | زیان: {s['loss_count']})")
            lines.append(f"- سود کل: ${s['total_profit']}")
            lines.append(f"- میانگین سود هر ترید: ${s['avg_profit']:.2f}")
            lines.append(f"- میانگین R:R: {s['avg_rr']:.2f}")

        if analytics.get('similar_trades'):
            sim = analytics['similar_trades']
            lines.append("")
            lines.append(f"🔍 **مقایسه با تریدهای مشابه شما (قیمت نزدیک به {analytics.get('symbol', 'این نماد')}):**")
            lines.append(f"- تعداد تریدهای مشابه: {sim['count']}")
            lines.append(f"- نرخ برد: {sim['win_rate']:.1f}% (سود: {sim['win_count']} | زیان: {sim['loss_count']} | مساوی: {sim['breakeven_count']})")
            lines.append(f"- میانگین سود: ${sim['avg_profit']:.2f}")
            lines.append(f"- بیشترین سود: ${sim.get('max_profit', 0):.2f}")
            lines.append(f"- بیشترین زیان: ${sim.get('min_profit', 0):.2f}")
            lines.append(f"- میانگین R:R: {sim['avg_rr']:.2f}")
            lines.append(f"- میانگین کیفیت اجرا: {sim.get('avg_quality', 0):.1f}/۱۰")

            if sim['win_rate'] > 60:
                lines.append(f"✅ **نتیجه‌گیری**: بر اساس {sim['count']} ترید مشابه با نرخ برد {sim['win_rate']:.1f}%، این معامله پتانسیل خوبی دارد.")
            elif sim['win_rate'] > 40:
                lines.append(f"⚠️ **نتیجه‌گیری**: بر اساس {sim['count']} ترید مشابه با نرخ برد {sim['win_rate']:.1f}%، احتیاط توصیه می‌شود.")
            else:
                lines.append(f"❌ **نتیجه‌گیری**: بر اساس {sim['count']} ترید مشابه با نرخ برد {sim['win_rate']:.1f}%، این معامله ریسک بالایی دارد.")

        if analytics.get('day_stats'):
            d = analytics['day_stats']
            lines.append("")
            lines.append(f"📅 **عملکرد شما در روزهای مشابه ({datetime.now().strftime('%A')}):**")
            lines.append(f"- تعداد ترید: {d['count']}")
            lines.append(f"- نرخ برد: {d['win_rate']:.1f}% (سود: {d['win_count']} | زیان: {d['loss_count']})")
            lines.append(f"- سود کل: ${d['total_profit']}")

        if analytics.get('emotion_stats'):
            e = analytics['emotion_stats']
            lines.append("")
            lines.append(f"🧠 **عملکرد شما در حالت احساسی غالب ({e['emotion']}):**")
            lines.append(f"- تعداد ترید: {e['count']}")
            lines.append(f"- نرخ برد: {e['win_rate']:.1f}%")
            lines.append(f"- سود کل: ${e['total_profit']}")

        if analytics.get('current_emotion_stats'):
            ce = analytics['current_emotion_stats']
            lines.append("")
            lines.append(f"🎯 **عملکرد شما با احساس فعلی ({ce['emotion']}):**")
            lines.append(f"- تعداد ترید: {ce['count']}")
            lines.append(f"- نرخ برد: {ce['win_rate']:.1f}%")
            lines.append(f"- سود کل: ${ce['total_profit']}")

        if analytics.get('strategy_stats'):
            st = analytics['strategy_stats']
            lines.append("")
            lines.append(f"📋 **بهترین استراتژی شما:**")
            lines.append(f"- نوع: {st['best']}")
            lines.append(f"- نرخ برد: {st['win_rate']}%")
            lines.append(f"- سود کل: ${st['total_profit']}")
            lines.append(f"- تعداد ترید: {st['count']}")

        if analytics.get('hour_stats'):
            h = analytics['hour_stats']
            lines.append("")
            lines.append(f"⏰ **بهترین ساعت معاملاتی شما:**")
            lines.append(f"- ساعت: {h['hour']}:۰۰")
            lines.append(f"- نرخ برد: {h['win_rate']}%")
            lines.append(f"- سود کل: ${h['total_profit']}")

        lines.append("")
        lines.append("📊 **پایبندی به قوانین معاملاتی:**")
        lines.append(f"- پایبندی به SMT: {analytics.get('smt_rate', 0)}%")
        lines.append(f"- پایبندی به سطوح کلیدی: {analytics.get('key_levels_rate', 0)}%")
        lines.append(f"- پایبندی کلی به چک‌لیست: {analytics.get('checklist_compliance', 0)}%")

        if analytics.get('most_common_emotion'):
            lines.append(f"- احساس غالب شما در معاملات: {analytics['most_common_emotion']}")

        return "\n".join(lines)

    @classmethod
    def _format_user_conditions(cls, user_input):
        """فرمت‌سازی شرایط فعلی کاربر"""
        lines = []
        lines.append(f"- **نماد معاملاتی:** {user_input.get('symbol', 'نامشخص')}")
        lines.append(f"- **جهت معامله:** {user_input.get('direction', 'نامشخص')}")
        lines.append(f"- **قیمت ورود:** {user_input.get('entry_price', 'نامشخص')}")

        if user_input.get('stop_loss'):
            lines.append(f"- **حد ضرر:** {user_input['stop_loss']}")
            sl = float(user_input['stop_loss'])
            entry = float(user_input.get('entry_price', 1))
            risk_pips = abs(sl - entry)
            lines.append(f"  - فاصله حد ضرر تا ورود: {risk_pips:.4f}")
        if user_input.get('take_profit'):
            lines.append(f"- **حد سود:** {user_input['take_profit']}")
            tp = float(user_input['take_profit'])
            entry = float(user_input.get('entry_price', 1))
            reward_pips = abs(tp - entry)
            lines.append(f"  - فاصله حد سود تا ورود: {reward_pips:.4f}")

        if user_input.get('stop_loss') and user_input.get('take_profit') and user_input.get('entry_price'):
            entry = float(user_input['entry_price'])
            sl = float(user_input['stop_loss'])
            tp = float(user_input['take_profit'])
            risk = abs(entry - sl)
            reward = abs(tp - entry)
            if risk > 0:
                rr = reward / risk
                lines.append(f"- **نسبت R:R محاسبه‌شده:** {rr:.2f}")

        if user_input.get('volume'):
            lines.append(f"- **حجم معامله (لات):** {user_input['volume']}")

        if user_input.get('risk_percent'):
            lines.append(f"- **درصد ریسک از سرمایه:** {user_input['risk_percent']}%")

        if user_input.get('session_type'):
            lines.append(f"- **نوع جلسه:** {user_input['session_type']}")

        if user_input.get('strategy_type'):
            lines.append(f"- **نوع استراتژی:** {user_input['strategy_type']}")

        if user_input.get('timeframes'):
            lines.append(f"- **تایم‌فریم‌های استفاده‌شده:** {user_input['timeframes']}")

        if user_input.get('price_warning'):
            lines.append(f"- ⚠️ **هشدار قیمت:** {user_input['price_warning']}")

        market_condition = user_input.get('market_condition')
        if market_condition:
            condition_map = {'trending': 'رونددار', 'ranging': 'رنج', 'neutral': 'خنثی', 'volatile': 'پرنوسان'}
            lines.append(f"- **وضعیت بازار:** {condition_map.get(market_condition, market_condition)}")

        emotion = user_input.get('emotion')
        if emotion:
            emotion_map = {'calm': 'آرام', 'excited': 'هیجان', 'fear': 'ترس', 'greed': 'طمع',
                           'patient': 'صبر', 'stress': 'استرس', 'confident': 'بااعتمادبه‌نفس', 'uncertain': 'مردد'}
            lines.append(f"- **احساسات فعلی:** {emotion_map.get(emotion, emotion)}")

        if user_input.get('time_ny'):
            lines.append(f"- **ساعت (به وقت نیویورک):** {user_input['time_ny']}")

        if user_input.get('user_question'):
            lines.append(f"- **سوال کاربر:** {user_input['user_question']}")

        return "\n".join(lines)

    @classmethod
    # backend/apps/trading/ai_service.py
    # فقط بخش‌های اصلاح‌شده نمایش داده می‌شود. کل فایل را در ادامه کامل می‌دهم.

    @classmethod
    def get_advanced_prompt_template(cls):
        return """
    شما یک مشاور معاملاتی حرفه‌ای و تحلیلگر ارشد بازارهای مالی با بیش از ۱۵ سال تجربه هستید.
    شما باید بر اساس **داده‌های واقعی تاریخچه معاملاتی کاربر** و **شرایط فعلی**، تحلیلی عمیق و کاربردی ارائه دهید.
    پاسخ شما باید به‌گونه‌ای باشد که کاربر بتواند از آن برای تصمیم‌گیری بهتر استفاده کند.

    **مهم:** شما باید از داده‌های تاریخی کاربر برای نتیجه‌گیری استفاده کنید و تحلیل خود را بر اساس آن‌ها بنا کنید.

    ---

    📊 **داده‌های تاریخچه کاربر (از معاملات واقعی):**
    {analytics}

    📝 **شرایط فعلی کاربر برای معامله جدید:**
    {user_conditions}

    ---

    🔍 **تحلیل جامع خود را بر اساس موارد زیر ارائه دهید:**

    **۱. امتیاز اعتبار (۰-۱۰۰)**
    - بر اساس شباهت این معامله به معاملات موفق قبلی کاربر محاسبه کنید.
    - به مواردی مانند: نماد، جهت، محدوده قیمت، نوع استراتژی، احساسات مشابه توجه کنید.
    - توضیح دهید چرا این امتیاز را داده‌اید.

    **۲. نقاط قوت این تصمیم (حداقل ۳ مورد)**
    - بر اساس داده‌های تاریخچه کاربر، چه عواملی این معامله را تقویت می‌کنند؟
    - اگر تریدهای مشابه قبلی موفق بوده‌اند، به آن اشاره کنید.
    - به پایبندی کاربر به قوانین و استراتژی اشاره کنید.

    **۳. هشدارها و نقاط ضعف (حداقل ۳ مورد)**
    - بر اساس الگوهای رفتاری کاربر، چه ریسک‌هایی وجود دارد؟
    - آیا احساسات فعلی کاربر در گذشته باعث ضرر شده است؟
    - نسبت R:R محاسبه‌شده را ارزیابی کنید.

    **۴. پیشنهاد عملی برای مدیریت معامله**
    - **حد ضرر پیشنهادی:** بر اساس تحلیل تکنیکال و داده‌های کاربر
    - **حد سود پیشنهادی:** بر اساس سطوح کلیدی و نسبت ریسک به ریوارد مناسب
    - **اندازه پوزیشن:** بر اساس تاریخچه کاربر و میزان ریسک‌پذیری او
    - **زمان‌بندی:** بهترین زمان برای ورود/خروج بر اساس ساعت‌های موفق کاربر

    **۵. تحلیل روانشناختی**
    - احساسات فعلی کاربر را با عملکرد گذشته‌اش مقایسه کنید.
    - آیا این احساسات در گذشته باعث ضرر شده‌اند؟
    - توصیه‌های عملی برای مدیریت احساسات ارائه دهید.

    **۶. یک نکته انگیزشی یا آموزشی**
    - بر اساس شرایط کاربر، یک نکته کاربردی و انگیزشی ارائه دهید.

    ---

    **سوال کاربر:** {user_question}

    ---

    **⚠️ ساختار پاسخ (بسیار مهم - دقیقاً به همین شکل بنویسید):**

    **امتیاز:** [عدد ۰-۱۰۰] – [دلیل مختصر بر اساس داده‌های کاربر]

    **نقاط قوت:**
    - [مورد ۱ با ارجاع به داده‌های کاربر]
    - [مورد ۲ با ارجاع به داده‌های کاربر]
    - [مورد ۳ با ارجاع به داده‌های کاربر]

    **هشدارها:**
    - [مورد ۱ با ارجاع به داده‌های کاربر]
    - [مورد ۲ با ارجاع به داده‌های کاربر]
    - [مورد ۳ با ارجاع به داده‌های کاربر]

    **پیشنهاد:**
    - حد ضرر: [مقدار پیشنهادی با دلیل]
    - حد سود: [مقدار پیشنهادی با دلیل]
    - اندازه پوزیشن: [پیشنهاد بر اساس تاریخچه کاربر]
    - زمان‌بندی: [پیشنهاد بر اساس بهترین ساعت‌های معاملاتی کاربر]

    **تحلیل روانشناختی:** [تحلیل کامل بر اساس داده‌های احساسی کاربر]

    **نکته:** [نکته آموزشی یا انگیزشی مرتبط با شرایط کاربر]

    **توجه:** هر بخش را دقیقاً با همان عنوان (به صورت **bold**) و با یک خط فاصله از بخش قبلی جدا کنید. جملات هر بخش را کامل و با نقطه تمام کنید.
    """

    @classmethod
    def call_ollama(cls, prompt, model=None):
        """ارسال درخواست به Ollama و دریافت پاسخ (غیراستریم)"""
        model = model or cls.OLLAMA_MODEL
        try:
            payload = {
                "model": model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.6,
                    "max_tokens": 2000,
                }
            }

            response = requests.post(cls.OLLAMA_URL, json=payload, timeout=180)
            response.raise_for_status()

            result = response.json()
            response_text = result.get('response', '')

            if not response_text or len(response_text.strip()) < 30:
                return cls._get_empty_response_error()

            return response_text

        except requests.exceptions.Timeout:
            logger.error("Ollama timeout")
            return cls._get_connection_error_response("⏰ زمان پاسخگویی به پایان رسید. لطفاً دوباره تلاش کنید.")
        except requests.exceptions.ConnectionError:
            logger.error("Ollama connection error")
            return cls._get_connection_error_response("🔌 اتصال به سرویس AI برقرار نشد. لطفاً مطمئن شوید که Ollama در حال اجراست.")
        except requests.exceptions.HTTPError as e:
            logger.error(f"Ollama HTTP error: {str(e)}")
            if "404" in str(e):
                return cls._get_connection_error_response(f"❌ مدل '{model}' در Ollama موجود نیست. لطفاً مدل را با 'ollama pull {model}' نصب کنید.")
            return cls._get_connection_error_response(f"❌ خطا در ارتباط با سرویس AI: {str(e)}")
        except Exception as e:
            logger.error(f"Ollama error: {str(e)}")
            return cls._get_connection_error_response(f"❌ خطا در ارتباط با سرویس AI: {str(e)}")

    @classmethod
    def call_ollama_stream(cls, prompt, model=None):
        """ارسال درخواست به Ollama با استریم"""
        model = model or cls.OLLAMA_MODEL
        try:
            payload = {
                "model": model,
                "prompt": prompt,
                "stream": True,
                "options": {
                    "temperature": 0.6,
                    "max_tokens": 2000,
                }
            }

            response = requests.post(cls.OLLAMA_URL, json=payload, stream=True, timeout=300)
            response.raise_for_status()

            has_content = False
            for line in response.iter_lines():
                if line:
                    try:
                        data = json.loads(line.decode('utf-8'))
                        if 'response' in data and data['response']:
                            has_content = True
                            yield data['response']
                        if data.get('done', False):
                            break
                    except json.JSONDecodeError:
                        continue

            if not has_content:
                yield cls._get_empty_response_error()

        except requests.exceptions.Timeout:
            yield cls._get_connection_error_response("⏰ زمان پاسخگویی به پایان رسید. لطفاً دوباره تلاش کنید.")
        except requests.exceptions.ConnectionError:
            yield cls._get_connection_error_response("🔌 اتصال به سرویس AI برقرار نشد. لطفاً مطمئن شوید که Ollama در حال اجراست.")
        except requests.exceptions.HTTPError as e:
            logger.error(f"Ollama HTTP error: {str(e)}")
            if "404" in str(e):
                yield cls._get_connection_error_response(f"❌ مدل '{model}' در Ollama موجود نیست. لطفاً مدل را با 'ollama pull {model}' نصب کنید.")
            yield cls._get_connection_error_response(f"❌ خطا در ارتباط با سرویس AI: {str(e)}")
        except Exception as e:
            logger.error(f"Ollama error: {str(e)}")
            yield cls._get_connection_error_response(f"❌ خطا در ارتباط با سرویس AI: {str(e)}")

    @classmethod
    def _get_connection_error_response(cls, message):
        """ساخت پاسخ خطای اتصال با ساختار قابل parse"""
        return f"""
❌ خطای اتصال به سرویس هوش مصنوعی

{message}

لطفاً موارد زیر را بررسی کنید:
1. آیا Ollama در حال اجراست؟ (دستور: ollama serve)
2. آیا مدل مناسب نصب شده است؟ (دستور: ollama pull llama3.1:8b)
3. آیا آدرس Ollama صحیح است؟ (پیش‌فرض: http://localhost:11434)

امتیاز: ۰ – عدم دسترسی به سرویس AI

نقاط قوت:
- اطلاعاتی موجود نیست

هشدارها:
- ⚠️ سرویس هوش مصنوعی در دسترس نیست
- ⚠️ امکان ارائه تحلیل دقیق وجود ندارد

پیشنهاد:
- لطفاً اتصال به Ollama را بررسی کنید و دوباره تلاش کنید.

تحلیل روانشناختی: تحلیل روانشناختی در دسترس نیست.

نکته: همیشه قبل از معامله، شرایط بازار را به‌صورت دستی بررسی کنید.
"""

    @classmethod
    def _get_empty_response_error(cls):
        """ساخت پاسخ خطای پاسخ خالی"""
        return """
❌ پاسخ نامعتبر از سرویس هوش مصنوعی

سرویس AI پاسخی ارسال نکرده است. لطفاً دوباره تلاش کنید.

امتیاز: ۰ – پاسخ نامعتبر

نقاط قوت:
- اطلاعاتی موجود نیست

هشدارها:
- ⚠️ پاسخ AI نامعتبر است
- ⚠️ امکان ارائه تحلیل دقیق وجود ندارد

پیشنهاد:
- لطفاً دوباره تلاش کنید. در صورت تکرار، با پشتیبانی تماس بگیرید.

تحلیل روانشناختی: تحلیل روانشناختی در دسترس نیست.

نکته: همیشه قبل از معامله، شرایط بازار را به‌صورت دستی بررسی کنید.
"""

    @classmethod
    def parse_ai_response(cls, response_text, analytics=None, user_input=None):
        """Parse پاسخ AI و استخراج اطلاعات ساختاریافته با بهبود تشخیص بخش‌ها و Fallback"""
        result = {
            'score': 0,
            'strengths': [],
            'warnings': [],
            'suggestion': 'پیشنهادی موجود نیست.',
            'tip': 'همیشه به مدیریت ریسک توجه کنید.',
            'psychology': 'تحلیل روانشناختی موجود نیست.',
            'suggested_sl': None,
            'suggested_tp': None,
            'suggested_position': None,
            'suggested_timing': None,
            'is_connection_error': False,
        }

        # بررسی خطای اتصال
        if '❌ خطای اتصال به سرویس هوش مصنوعی' in response_text or '❌ پاسخ نامعتبر از سرویس هوش مصنوعی' in response_text:
            result['is_connection_error'] = True
            result['score'] = 0
            result['warnings'] = ['⚠️ سرویس هوش مصنوعی در دسترس نیست']
            result['suggestion'] = 'لطفاً اتصال به Ollama را بررسی کنید.'
            return result

        if not response_text or not response_text.strip():
            return result

        try:
            lines = response_text.strip().split('\n')
            current_section = None
            section_content = []

            for i, line in enumerate(lines):
                line = line.strip()
                if not line:
                    continue

                # ===== تشخیص بخش‌ها با الگوهای مختلف =====
                if re.search(r'امتیاز\s*:', line, re.IGNORECASE):
                    parts = line.split(':', 1)
                    if len(parts) > 1:
                        score_part = parts[1].strip()
                        score_match = re.search(r'(\d+)', score_part)
                        if score_match:
                            result['score'] = min(100, max(0, int(score_match.group(1))))
                    current_section = 'score'
                    continue

                if re.search(r'نقاط\s*قوت\s*:', line, re.IGNORECASE):
                    current_section = 'strengths'
                    section_content = []
                    continue

                if re.search(r'هشدارها\s*:', line, re.IGNORECASE):
                    current_section = 'warnings'
                    section_content = []
                    continue

                if re.search(r'پیشنهاد\s*:', line, re.IGNORECASE):
                    current_section = 'suggestion'
                    section_content = []
                    # اگر در همان خط متن وجود دارد
                    if ':' in line and len(line.split(':', 1)[1].strip()) > 1:
                        suggestion_text = line.split(':', 1)[1].strip()
                        if suggestion_text and len(suggestion_text) > 5:
                            result['suggestion'] = suggestion_text
                    continue

                if re.search(r'تحلیل\s*روانشناختی\s*:', line, re.IGNORECASE):
                    current_section = 'psychology'
                    section_content = []
                    if ':' in line and len(line.split(':', 1)[1].strip()) > 1:
                        psych_text = line.split(':', 1)[1].strip()
                        if psych_text and len(psych_text) > 5:
                            result['psychology'] = psych_text
                    continue

                if re.search(r'نکته\s*:', line, re.IGNORECASE):
                    current_section = 'tip'
                    section_content = []
                    if ':' in line and len(line.split(':', 1)[1].strip()) > 1:
                        tip_text = line.split(':', 1)[1].strip()
                        if tip_text and len(tip_text) > 5:
                            result['tip'] = tip_text
                    continue

                # ===== جمع‌آوری محتوای هر بخش =====
                if current_section == 'strengths':
                    if line.startswith('-') or line.startswith('•') or re.match(r'^\d+\.', line):
                        item = re.sub(r'^[-•\d.]+', '', line).strip()
                        if item and len(item) > 3:
                            result['strengths'].append(item)
                    elif section_content and len(line) > 5:
                        # ادامه متن قبلی
                        if result['strengths']:
                            result['strengths'][-1] += ' ' + line

                elif current_section == 'warnings':
                    if line.startswith('-') or line.startswith('•') or re.match(r'^\d+\.', line):
                        item = re.sub(r'^[-•\d.]+', '', line).strip()
                        if item and len(item) > 3:
                            result['warnings'].append(item)
                    elif section_content and len(line) > 5:
                        if result['warnings']:
                            result['warnings'][-1] += ' ' + line

                elif current_section == 'suggestion':
                    if line.startswith('-') or line.startswith('•') or re.match(r'^\d+\.', line):
                        clean_line = re.sub(r'^[-•\d.]+', '', line).strip()
                        if 'حد ضرر' in line or 'حد ضرر:' in line:
                            val = clean_line.split(':', 1)[1].strip() if ':' in clean_line else clean_line
                            result['suggested_sl'] = val
                        elif 'حد سود' in line or 'حد سود:' in line:
                            val = clean_line.split(':', 1)[1].strip() if ':' in clean_line else clean_line
                            result['suggested_tp'] = val
                        elif 'اندازه پوزیشن' in line or 'پوزیشن' in line:
                            val = clean_line.split(':', 1)[1].strip() if ':' in clean_line else clean_line
                            result['suggested_position'] = val
                        elif 'زمان‌بندی' in line or 'زمان' in line:
                            val = clean_line.split(':', 1)[1].strip() if ':' in clean_line else clean_line
                            result['suggested_timing'] = val
                        else:
                            if clean_line and len(clean_line) > 3:
                                if result['suggestion'] == 'پیشنهادی موجود نیست.':
                                    result['suggestion'] = clean_line
                                else:
                                    result['suggestion'] += ' ' + clean_line
                    elif len(line) > 5 and not line.startswith('تحلیل') and not line.startswith('نکته'):
                        if result['suggestion'] == 'پیشنهادی موجود نیست.':
                            result['suggestion'] = line
                        else:
                            result['suggestion'] += ' ' + line

                elif current_section == 'psychology':
                    if len(line) > 5 and not line.startswith('نکته'):
                        if result['psychology'] == 'تحلیل روانشناختی موجود نیست.':
                            result['psychology'] = line
                        else:
                            result['psychology'] += ' ' + line

                elif current_section == 'tip':
                    if len(line) > 5 and not line.startswith('تحلیل'):
                        if result['tip'] == 'همیشه به مدیریت ریسک توجه کنید.':
                            result['tip'] = line
                        else:
                            result['tip'] += ' ' + line

            # ===== اگر هیچ داده‌ای استخراج نشد، از کل متن برای استخراج اولیه استفاده کن =====
            if not result['strengths'] and not result['warnings'] and len(response_text) > 100:
                # استخراج جملات کلیدی
                sentences = re.split(r'[.!\n]', response_text)
                for sent in sentences[:15]:
                    sent = sent.strip()
                    if len(sent) < 10:
                        continue
                    if 'قوت' in sent or 'مزیت' in sent or 'خوب' in sent or 'موفق' in sent:
                        if len(result['strengths']) < 5:
                            result['strengths'].append(sent[:120])
                    elif 'هشدار' in sent or 'خطر' in sent or 'ضعف' in sent or 'ریسک' in sent:
                        if len(result['warnings']) < 5:
                            result['warnings'].append(sent[:120])
                    elif 'پیشنهاد' in sent or 'توصیه' in sent or 'بهتر' in sent or 'مناسب' in sent:
                        if result['suggestion'] == 'پیشنهادی موجود نیست.':
                            result['suggestion'] = sent[:150]

            # ===== اگر امتیاز صفر است و محتوایی وجود دارد، امتیاز را از متن تشخیص بده =====
            if result['score'] == 0 and (result['strengths'] or result['warnings'] or len(response_text) > 50):
                # تشخیص از کلمات کلیدی
                text_lower = response_text.lower()
                if 'عالی' in text_lower or 'بسیار خوب' in text_lower:
                    result['score'] = 75
                elif 'خوب' in text_lower or 'مناسب' in text_lower:
                    result['score'] = 65
                elif 'متوسط' in text_lower:
                    result['score'] = 50
                elif 'ضعیف' in text_lower or 'نامناسب' in text_lower:
                    result['score'] = 25
                elif 'خطر' in text_lower or 'هشدار' in text_lower:
                    result['score'] = 35
                else:
                    result['score'] = 45

        except Exception as e:
            logger.error(f"Error parsing AI response: {str(e)}")
            # در صورت خطای parsing، از متن کامل به عنوان پیشنهاد استفاده کن
            if len(response_text) > 50:
                result['suggestion'] = response_text[:200]

        # ===== Fallback برای بخش‌های خالی =====
        if result.get('psychology') == 'تحلیل روانشناختی موجود نیست.' or not result.get('psychology'):
            result['psychology'] = cls._generate_psychological_fallback(analytics, user_input)

        if result.get('suggestion') == 'پیشنهادی موجود نیست.' or not result.get('suggestion'):
            result['suggestion'] = cls._generate_suggestion_fallback(analytics, user_input)

        # اگر امتیاز صفر است ولی بخش‌های دیگر پر هستند، تخمین بزن
        if result['score'] == 0 and (result['strengths'] or result['warnings']):
            result['score'] = 50  # مقدار متوسط

        return result

    # ===== متدهای Fallback برای تحلیل روانشناختی و پیشنهاد عملی =====

    @classmethod
    def _generate_psychological_fallback(cls, analytics, user_input):
        """
        تولید تحلیل روانشناختی خودکار بر اساس داده‌های کاربر
        """
        emotion = user_input.get('emotion') if user_input else None
        if not emotion:
            return "تحلیل روانشناختی موجود نیست."

        # دریافت عملکرد با احساس مشابه از analytics
        emotion_stats = analytics.get('current_emotion_stats') if analytics else None
        if emotion_stats and emotion_stats.get('count', 0) > 0:
            win_rate = emotion_stats.get('win_rate', 0)
            count = emotion_stats.get('count', 0)
            if win_rate >= 60:
                return f"✅ شما در حالت '{emotion}' عملکرد خوبی داشته‌اید (نرخ برد {win_rate:.1f}% در {count} ترید). این احساس برای شما مفید بوده است. سعی کنید این حالت را حفظ کنید."
            elif win_rate >= 40:
                return f"⚖️ شما در حالت '{emotion}' عملکرد متوسطی داشته‌اید (نرخ برد {win_rate:.1f}% در {count} ترید). سعی کنید با تمرکز بیشتر و مدیریت احساسات، عملکرد خود را بهبود دهید."
            else:
                return f"⚠️ شما در حالت '{emotion}' عملکرد ضعیفی داشته‌اید (نرخ برد {win_rate:.1f}% در {count} ترید). توصیه می‌شود قبل از معامله، آرامش خود را بازیابی کنید و از تصمیمات عجولانه بپرهیزید."
        else:
            return f"ℹ️ شما سابقه‌ای در حالت '{emotion}' ندارید. به احساسات خود توجه کنید و از تصمیمات عجولانه بپرهیزید. احساس '{emotion}' می‌تواند بر کیفیت تصمیم‌گیری تأثیر بگذارد."

    @classmethod
    def _generate_suggestion_fallback(cls, analytics, user_input):
        """
        تولید پیشنهاد عملی خودکار بر اساس داده‌های ورودی و تاریخچه کاربر
        """
        if not user_input:
            return "پیشنهادی موجود نیست. لطفاً داده‌های خود را تکمیل کنید."

        entry = user_input.get('entry_price')
        sl = user_input.get('stop_loss')
        tp = user_input.get('take_profit')
        risk_percent = user_input.get('risk_percent')
        volume = user_input.get('volume')

        suggestions = []

        # محاسبه R:R
        if entry and sl and tp:
            try:
                entry = float(entry)
                sl = float(sl)
                tp = float(tp)
                risk = abs(entry - sl)
                reward = abs(tp - entry)
                if risk > 0:
                    rr = reward / risk
                    if rr < 1:
                        suggestions.append(f"⚠️ نسبت R:R شما ({rr:.2f}) کمتر از ۱ است. پیشنهاد می‌شود حد سود را به {entry + (risk * 2):.4f} افزایش دهید (R:R=2).")
                    elif rr < 2:
                        suggestions.append(f"📊 نسبت R:R شما ({rr:.2f}) قابل قبول است. برای بهبود، می‌توانید حد سود را به {entry + (risk * 2.5):.4f} افزایش دهید (R:R=2.5).")
                    else:
                        suggestions.append(f"✅ نسبت R:R شما ({rr:.2f}) عالی است. همین سطح را حفظ کنید.")
            except:
                pass

        # پیشنهاد اندازه پوزیشن
        if risk_percent:
            try:
                risk_percent = float(risk_percent)
                if risk_percent > 2:
                    suggestions.append(f"⚠️ درصد ریسک شما ({risk_percent}%) بالاست. پیشنهاد می‌شود حجم معامله را کاهش دهید تا ریسک به ۱-۲٪ برسد.")
                elif risk_percent < 0.5:
                    suggestions.append(f"📊 درصد ریسک شما ({risk_percent}%) پایین است. می‌توانید حجم معامله را افزایش دهید تا ریسک به حدود ۱٪ برسد.")
                else:
                    suggestions.append(f"✅ درصد ریسک شما ({risk_percent}%) در محدوده مناسب است.")
            except:
                pass

        # استفاده از بهترین ساعت معاملاتی از analytics
        if analytics and analytics.get('hour_stats'):
            hour = analytics['hour_stats'].get('hour')
            if hour is not None:
                suggestions.append(f"⏰ بهترین ساعت معاملاتی شما {hour}:۰۰ است. سعی کنید معاملات خود را در این ساعت انجام دهید.")

        # استفاده از بهترین استراتژی
        if analytics and analytics.get('strategy_stats'):
            best_strategy = analytics['strategy_stats'].get('best')
            if best_strategy:
                suggestions.append(f"📋 بهترین استراتژی شما {best_strategy} است. استفاده از این استراتژی می‌تواند شانس موفقیت را افزایش دهد.")

        # استفاده از مقایسه تریدهای مشابه
        if analytics and analytics.get('similar_trades'):
            sim = analytics['similar_trades']
            if sim.get('count', 0) > 0:
                win_rate = sim.get('win_rate', 0)
                if win_rate >= 60:
                    suggestions.append(f"📈 بر اساس {sim['count']} ترید مشابه با نرخ برد {win_rate:.1f}%، این معامله پتانسیل خوبی دارد.")
                elif win_rate >= 40:
                    suggestions.append(f"⚠️ بر اساس {sim['count']} ترید مشابه با نرخ برد {win_rate:.1f}%، احتیاط توصیه می‌شود.")
                else:
                    suggestions.append(f"❌ بر اساس {sim['count']} ترید مشابه با نرخ برد {win_rate:.1f}%، این معامله ریسک بالایی دارد.")

        if not suggestions:
            return "پیشنهادی موجود نیست. لطفاً داده‌های خود را تکمیل کنید."

        return "\n".join(suggestions)

    @classmethod
    def validate_prices_with_live(cls, user_input):
        """اعتبارسنجی قیمت‌های وارد شده با قیمت لحظه‌ای"""
        symbol = user_input.get('symbol')
        entry_price = user_input.get('entry_price')

        if not symbol or not entry_price:
            return True, ""

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

    @classmethod
    def validate_trade_logic(cls, user_input):
        """اعتبارسنجی منطق معامله"""
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

        market_condition = user_input.get('market_condition')
        if market_condition == 'volatile':
            warnings.append('⚠️ بازار در حالت پرنوسان قرار دارد. ریسک معامله بالاتر است.')

        return {
            'errors': errors,
            'warnings': warnings,
            'info': info,
            'is_valid': len(errors) == 0
        }

    # ===== متدهای دریافت قیمت لحظه‌ای =====
    @classmethod
    def get_live_price(cls, symbol):
        provider = cls.LIVE_PRICE_PROVIDER.lower()
        if provider == 'none':
            return None
        if provider == 'twelvedata':
            return cls._get_price_from_twelvedata(symbol)
        elif provider == 'finnhub':
            return cls._get_price_from_finnhub(symbol)
        elif provider == 'alphavantage':
            return cls._get_price_from_alphavantage(symbol)
        else:
            logger.warning(f"⚠️ Provider '{provider}' نامعتبر است.")
            return None

    @classmethod
    def _get_price_from_twelvedata(cls, symbol):
        if not cls.TWELVEDATA_API_KEY:
            logger.warning("⚠️ Twelve Data API Key تنظیم نشده است")
            return None
        try:
            formatted_symbol = cls._format_symbol_for_twelvedata(symbol)
            url = f"{cls.TWELVEDATA_BASE_URL}/price"
            params = {'symbol': formatted_symbol, 'apikey': cls.TWELVEDATA_API_KEY}
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            if 'price' in data and data['price']:
                return float(data['price'])
            return None
        except Exception as e:
            logger.error(f"❌ Twelve Data error: {str(e)}")
            return None

    @classmethod
    def _get_price_from_finnhub(cls, symbol):
        if not cls.FINNHUB_API_KEY:
            logger.warning("⚠️ Finnhub API Key تنظیم نشده است")
            return None
        try:
            formatted_symbol = cls._format_symbol_for_finnhub(symbol)
            url = f"{cls.FINNHUB_BASE_URL}/quote"
            params = {'symbol': formatted_symbol, 'token': cls.FINNHUB_API_KEY}
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            if 'c' in data and data['c']:
                return float(data['c'])
            return None
        except Exception as e:
            logger.error(f"❌ Finnhub error: {str(e)}")
            return None

    @classmethod
    def _get_price_from_alphavantage(cls, symbol):
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
            return None
        except Exception as e:
            logger.error(f"❌ Alpha Vantage error: {str(e)}")
            return None

    @classmethod
    def _format_symbol_for_twelvedata(cls, symbol):
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
        if len(symbol) == 6:
            return f"OANDA:{symbol}"
        if symbol.endswith('USD'):
            return f"BINANCE:{symbol}"
        if symbol in ['XAUUSD', 'XAGUSD', 'XPDUSD', 'XPTUSD']:
            return f"OANDA:{symbol}"
        return symbol

    @classmethod
    def _parse_symbol_av(cls, symbol):
        if symbol.endswith('USD'):
            return symbol[:-3], 'USD'
        if len(symbol) == 6:
            return symbol[:3], symbol[3:]
        return None, None

    @classmethod
    def _get_commodity_price_av(cls, symbol):
        try:
            commodity_map = {'XAUUSD': 'XAU', 'XAGUSD': 'XAG', 'XPDUSD': 'XPD', 'XPTUSD': 'XPT'}
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
        try:
            function = 'WTI' if symbol == 'USOIL' else 'BRENT'
            url = "https://www.alphavantage.co/query"
            params = {'function': function, 'apikey': cls.ALPHA_VANTAGE_API_KEY}
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            if 'data' in data and len(data['data']) > 0:
                return float(data['data'][0]['value'])
            return None
        except Exception as e:
            logger.error(f"❌ Oil price error: {str(e)}")
            return None

    # ===== متدهای اصلی مشاوره =====

    @classmethod
    def get_consultation(cls, user, user_input):
        """دریافت مشاوره کامل با تحلیل عمیق تاریخچه کاربر"""
        # اعتبارسنجی قیمت
        is_valid, price_message = cls.validate_prices_with_live(user_input)
        if price_message and not price_message.startswith('✅'):
            user_input['price_warning'] = price_message

        # اعتبارسنجی منطق معامله
        validation = cls.validate_trade_logic(user_input)
        if not validation['is_valid']:
            return {
                'error': 'invalid_trade_logic',
                'message': '\n'.join(validation['errors'])
            }

        analytics = cls.get_user_detailed_analytics(user, user_input.get('symbol'), user_input)
        prompt = cls.build_prompt(analytics, user_input)

        model = user_input.get('model') or None
        response_text = cls.call_ollama(prompt, model=model)
        parsed_response = cls.parse_ai_response(response_text, analytics, user_input)

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
            session_type=user_input.get('session_type'),
            strategy_type=user_input.get('strategy_type'),
            timeframes=user_input.get('timeframes'),
            risk_percent=user_input.get('risk_percent'),
            volume=user_input.get('volume'),
            comparison_stats=analytics.get('similar_trades') if analytics else None,
            ai_score=parsed_response.get('score', 0),
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
        """دریافت مشاوره به صورت استریم با تحلیل عمیق تاریخچه کاربر"""
        # اعتبارسنجی قیمت
        is_valid, price_message = cls.validate_prices_with_live(user_input)
        if price_message and not price_message.startswith('✅'):
            user_input['price_warning'] = price_message

        # اعتبارسنجی منطق معامله
        validation = cls.validate_trade_logic(user_input)
        if not validation['is_valid']:
            return {
                'error': 'invalid_trade_logic',
                'message': '\n'.join(validation['errors'])
            }

        analytics = cls.get_user_detailed_analytics(user, user_input.get('symbol'), user_input)
        prompt = cls.build_prompt(analytics, user_input)

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
            session_type=user_input.get('session_type'),
            strategy_type=user_input.get('strategy_type'),
            timeframes=user_input.get('timeframes'),
            risk_percent=user_input.get('risk_percent'),
            volume=user_input.get('volume'),
            comparison_stats=analytics.get('similar_trades') if analytics else None,
            ai_score=50,
            ai_response={},
            prompt_used=prompt,
        )

        def generate():
            full_response = ""
            has_content = False
            for chunk in cls.call_ollama_stream(prompt, model=model):
                full_response += chunk
                has_content = True
                yield chunk

            if not has_content:
                error_msg = cls._get_empty_response_error()
                for line in error_msg.split('\n'):
                    yield line + '\n'
                full_response = error_msg

            parsed = cls.parse_ai_response(full_response, analytics, user_input)
            consultation.ai_score = parsed.get('score', 0)
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
    """سرویس مدیریت بازخوردهای AI"""

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

            total_score = (best_prompt.performance_score * best_prompt.usage_count + prompt_score) / (best_prompt.usage_count + 1)
            best_prompt.performance_score = max(0, min(100, total_score))
            best_prompt.save()

        except Exception as e:
            logger.error(f"Error updating prompt performance: {str(e)}")


class AIAnalyticsService:
    """سرویس آمار تحلیلی برای توسعه‌دهنده"""

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