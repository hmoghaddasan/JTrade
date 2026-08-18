# analytics.py
# backend/apps/trading/analytics.py

import math
import numpy as np
from django.db.models import Sum, Avg, Count, Q
from decimal import Decimal
from datetime import datetime, timedelta
from .models import Trade, Portfolio


class AdvancedMetricsCalculator:
    """
    کلاس محاسبه شاخص‌های حرفه‌ای معاملاتی
    شامل: Sharpe Ratio, Sortino Ratio, Profit Factor, Max Drawdown, Kelly Criterion
    """

    def __init__(self, user, portfolio_id=None, start_date=None, end_date=None):
        """
        مقداردهی اولیه با فیلترهای کاربر
        """
        self.user = user
        self.portfolio_id = portfolio_id
        self.start_date = start_date
        self.end_date = end_date
        self.trades = self._get_trades()

    def _get_trades(self):
        """
        دریافت تریدهای فیلتر شده
        """
        trades = Trade.objects.filter(
            user=self.user,
            is_deleted=False,
            profit__isnull=False
        )

        if self.portfolio_id:
            trades = trades.filter(portfolio_id=self.portfolio_id)

        if self.start_date:
            trades = trades.filter(trade_date__gte=self.start_date)

        if self.end_date:
            trades = trades.filter(trade_date__lte=self.end_date)

        return trades

    def _get_profits(self):
        """
        دریافت لیست سود/زیان تریدها
        """
        return [float(t.profit) for t in self.trades if t.profit is not None]

    def _get_negative_profits(self):
        """
        دریافت لیست سود/زیان منفی برای محاسبه سورتینو
        """
        return [float(t.profit) for t in self.trades if t.profit is not None and t.profit < 0]

    def _get_risk_free_rate(self):
        """
        نرخ بدون ریسک (میانگین نرخ بهره آمریکا - تقریبی)
        """
        # در حالت واقعی می‌توان از تنظیمات سیستم یا API دریافت کرد
        return 0.03  # ۳ درصد سالانه

    def calculate_sharpe_ratio(self, periods=252):
        """
        محاسبه نسبت شارپ (Sharpe Ratio)
        (بازده متوسط - نرخ بدون ریسک) / انحراف معیار بازده‌ها
        """
        profits = self._get_profits()
        if len(profits) < 2:
            return None, 'داده‌های کافی برای محاسبه وجود ندارد (حداقل ۲ ترید)'

        # محاسبه بازده روزانه (با فرض اینکه هر ترید یک روزه است)
        # برای ساده‌سازی، از سود/زیان استفاده می‌کنیم
        avg_return = sum(profits) / len(profits)
        returns = [(p / abs(p) if p != 0 else 0) * 0.01 for p in profits]  # نرمال‌سازی

        std_dev = np.std(returns) if len(returns) > 1 else 0

        if std_dev == 0:
            return None, 'انحراف معیار صفر است (همه تریدها یکسان هستند)'

        # نرخ بدون ریسک روزانه
        risk_free_daily = self._get_risk_free_rate() / periods

        # شارپ = (میانگین بازده - نرخ بدون ریسک) / انحراف معیار
        annualized_return = avg_return * periods
        sharpe = (annualized_return - self._get_risk_free_rate()) / (std_dev * math.sqrt(periods))

        return round(sharpe, 2), self._get_sharpe_interpretation(sharpe)

    def _get_sharpe_interpretation(self, sharpe):
        """
        تفسیر نسبت شارپ
        """
        if sharpe is None:
            return 'داده‌های کافی نیست'
        if sharpe < 0:
            return '⚠️ عملکرد ضعیف – بازده کمتر از نرخ بدون ریسک'
        if sharpe < 1:
            return '🟡 قابل قبول – بازده ریسک را توجیه می‌کند'
        if sharpe < 2:
            return '🟢 خوب – عملکرد مناسبی دارید'
        if sharpe < 3:
            return '🌟 عالی – عملکرد بسیار خوب adjusted to risk'
        return '🏆 استثنایی – بازده بسیار بالا نسبت به ریسک'

    def calculate_sortino_ratio(self, periods=252):
        """
        محاسبه نسبت سورتینو (Sortino Ratio)
        (بازده متوسط - نرخ بدون ریسک) / انحراف معیار بازده‌های منفی
        """
        profits = self._get_profits()
        if len(profits) < 2:
            return None, 'داده‌های کافی برای محاسبه وجود ندارد (حداقل ۲ ترید)'

        negative_profits = self._get_negative_profits()
        if len(negative_profits) < 1:
            return None, 'هیچ ضرری وجود ندارد – نمی‌توان سورتینو را محاسبه کرد'

        avg_return = sum(profits) / len(profits)
        returns = [(p / abs(p) if p != 0 else 0) * 0.01 for p in profits]

        # انحراف معیار بازده‌های منفی
        negative_returns = [r for r, p in zip(returns, profits) if p < 0]
        downside_deviation = np.std(negative_returns) if len(negative_returns) > 1 else 0

        if downside_deviation == 0:
            return None, 'انحراف معیار منفی صفر است'

        risk_free_daily = self._get_risk_free_rate() / periods
        annualized_return = avg_return * periods
        sortino = (annualized_return - self._get_risk_free_rate()) / (downside_deviation * math.sqrt(periods))

        return round(sortino, 2), self._get_sortino_interpretation(sortino)

    def _get_sortino_interpretation(self, sortino):
        """
        تفسیر نسبت سورتینو
        """
        if sortino is None:
            return 'داده‌های کافی نیست'
        if sortino < 0:
            return '⚠️ عملکرد ضعیف – ریسک نزولی بالا'
        if sortino < 1:
            return '🟡 قابل قبول – نیاز به بهبود مدیریت ریسک نزولی'
        if sortino < 2:
            return '🟢 خوب – مدیریت ریسک نزولی مناسب'
        if sortino < 3:
            return '🌟 عالی – عملکرد عالی در برابر ریسک نزولی'
        return '🏆 استثنایی – حفاظت عالی در برابر ضررها'

    def calculate_calmar_ratio(self):
        """
        محاسبه نسبت کالمار (Calmar Ratio)
        بازده سالانه / حداکثر افت
        """
        profits = self._get_profits()
        if len(profits) < 2:
            return None, 'داده‌های کافی برای محاسبه وجود ندارد (حداقل ۲ ترید)'

        # محاسبه بازده سالانه (تخمینی)
        total_return = sum(profits)
        avg_return = total_return / len(profits)
        annualized_return = avg_return * 252  # فرض ۲۵۲ روز معاملاتی در سال

        # محاسبه حداکثر افت
        max_drawdown = self.calculate_max_drawdown()
        if max_drawdown is None or max_drawdown == 0:
            return None, 'حداکثر افت صفر است – نمی‌توان کالمار را محاسبه کرد'

        calmar = annualized_return / abs(max_drawdown)

        return round(calmar, 2), self._get_calmar_interpretation(calmar)

    def _get_calmar_interpretation(self, calmar):
        """
        تفسیر نسبت کالمار
        """
        if calmar is None:
            return 'داده‌های کافی نیست'
        if calmar < 0:
            return '⚠️ عملکرد ضعیف'
        if calmar < 1:
            return '🟡 قابل قبول'
        if calmar < 2:
            return '🟢 خوب – بازده مناسب در برابر ریسک نزولی'
        return '🌟 عالی – بازده عالی در برابر ریسک نزولی'

    def calculate_profit_factor(self):
        """
        محاسبه فاکتور سود (Profit Factor)
        سود کل / ضرر کل
        """
        total_profit = self.trades.filter(profit__gt=0).aggregate(Sum('profit'))['profit__sum'] or 0
        total_loss = abs(self.trades.filter(profit__lt=0).aggregate(Sum('profit'))['profit__sum'] or 0)

        if total_loss == 0:
            if total_profit > 0:
                return 999, '✅ سود کل بدون هیچ ضرری!'
            return None, 'هیچ تریدی با سود یا ضرر یافت نشد'

        profit_factor = total_profit / total_loss
        return round(profit_factor, 2), self._get_profit_factor_interpretation(profit_factor)

    def _get_profit_factor_interpretation(self, pf):
        """
        تفسیر فاکتور سود
        """
        if pf is None:
            return 'داده‌های کافی نیست'
        if pf < 1:
            return '⚠️ ضرردهنده – کل ضررها بیشتر از سودهاست'
        if pf < 1.2:
            return '🟡 نیاز به بهبود – سود اندکی بیشتر از ضرر'
        if pf < 1.5:
            return '🟢 خوب – استراتژی نسبتاً پایدار'
        if pf < 2:
            return '🌟 عالی – استراتژی سودآور و پایدار'
        if pf < 3:
            return '🏆 بسیار عالی – لبه معاملاتی قوی'
        return '👑 استثنایی – عملکرد فوق‌العاده'

    def calculate_max_drawdown(self):
        """
        محاسبه حداکثر افت (Max Drawdown)
        بزرگترین کاهش از اوج به کف
        """
        profits = self._get_profits()
        if len(profits) < 2:
            return None

        cumulative = []
        running_sum = 0
        for p in profits:
            running_sum += p
            cumulative.append(running_sum)

        peak = cumulative[0]
        max_drawdown = 0

        for value in cumulative:
            if value > peak:
                peak = value
            drawdown = (peak - value) / abs(peak) if peak != 0 else 0
            if drawdown > max_drawdown:
                max_drawdown = drawdown

        return round(max_drawdown * 100, 2)  # درصد

    def calculate_average_rr(self):
        """
        محاسبه میانگین نسبت ریسک به ریوارد (Average R/R)
        """
        trades_with_rr = self.trades.filter(
            risk_reward_ratio__isnull=False
        )
        if not trades_with_rr.exists():
            return None

        avg_rr = trades_with_rr.aggregate(Avg('risk_reward_ratio'))['risk_reward_ratio__avg']
        return round(avg_rr, 2) if avg_rr else None

    def calculate_expectancy(self):
        """
        محاسبه امید ریاضی (Expectancy)
        (میانگین سود × نرخ برد) - (میانگین ضرر × نرخ ضرر)
        """
        profits = self._get_profits()
        if len(profits) < 2:
            return None

        win_profits = [p for p in profits if p > 0]
        loss_profits = [p for p in profits if p < 0]

        if not win_profits or not loss_profits:
            return None

        total_trades = len(profits)
        win_count = len(win_profits)
        loss_count = len(loss_profits)

        win_rate = win_count / total_trades
        loss_rate = loss_count / total_trades

        avg_win = sum(win_profits) / win_count
        avg_loss = abs(sum(loss_profits) / loss_count)

        expectancy = (avg_win * win_rate) - (avg_loss * loss_rate)
        return round(expectancy, 2)

    def calculate_kelly_criterion(self):
        """
        محاسبه معیار کلی (Kelly Criterion)
        f* = (p × R - (1-p)) / R
        که p = نرخ برد، R = نسبت میانگین سود به میانگین ضرر
        """
        profits = self._get_profits()
        if len(profits) < 5:
            return None, 'برای محاسبه کلی حداقل به ۵ ترید نیاز است'

        win_profits = [p for p in profits if p > 0]
        loss_profits = [p for p in profits if p < 0]

        if not win_profits or not loss_profits:
            return None, 'برای محاسبه کلی به حداقل یک ترید سود و یک ترید ضرر نیاز است'

        total_trades = len(profits)
        win_count = len(win_profits)
        loss_count = len(loss_profits)

        p = win_count / total_trades  # نرخ برد
        avg_win = sum(win_profits) / win_count
        avg_loss = abs(sum(loss_profits) / loss_count)

        if avg_loss == 0:
            return None, 'میانگین ضرر صفر است'

        R = avg_win / avg_loss  # نسبت سود به ضرر

        if R == 0:
            return None, 'نسبت سود به ضرر صفر است'

        # کلی کامل
        kelly_full = (p * R - (1 - p)) / R

        # کلی فرکشنال (۲۵٪ برای استفاده عملی)
        kelly_fractional = kelly_full * 0.25

        # محدود کردن به بازه ۰ تا ۰.۳
        kelly_fractional = max(0, min(0.3, kelly_fractional))

        return round(kelly_fractional, 3), self._get_kelly_interpretation(kelly_fractional)

    def _get_kelly_interpretation(self, kelly):
        """
        تفسیر معیار کلی
        """
        if kelly is None:
            return 'داده‌های کافی نیست'
        if kelly <= 0:
            return '⚠️ سیستم معاملاتی شما دارای لبه منفی است – بهتر است معامله نکنید'
        if kelly < 0.05:
            return '🟡 محافظه‌کارانه – ریسک بسیار پایین (۵٪ یا کمتر از سرمایه)'
        if kelly < 0.15:
            return '🟢 متعادل – اندازه پوزیشن مناسب (۱۵-۵٪ از سرمایه)'
        if kelly < 0.25:
            return '🌟 نسبتاً جسورانه – اندازه پوزیشن بالا (۲۵-۱۵٪ از سرمایه)'
        return '⚠️ جسورانه – اندازه پوزیشن بیش از حد بالا (بیش از ۲۵٪ از سرمایه)'

    def calculate_win_rate(self):
        """
        محاسبه نرخ برد
        """
        total = self.trades.count()
        if total == 0:
            return 0
        wins = self.trades.filter(profit__gt=0).count()
        return round((wins / total) * 100, 1)

    def calculate_total_profit(self):
        """
        محاسبه سود کل
        """
        return float(self.trades.aggregate(Sum('profit'))['profit__sum'] or 0)

    def calculate_total_trades(self):
        """
        محاسبه تعداد کل تریدها
        """
        return self.trades.count()

    def calculate_recovery_factor(self):
        """
        محاسبه فاکتور بازیابی (Recovery Factor)
        سود کل / حداکثر افت
        """
        total_profit = self.calculate_total_profit()
        max_drawdown = self.calculate_max_drawdown()

        if max_drawdown is None or max_drawdown == 0:
            return None

        max_drawdown_abs = abs(max_drawdown / 100)  # تبدیل درصد به اعشار
        if max_drawdown_abs == 0:
            return None

        recovery_factor = total_profit / max_drawdown_abs
        return round(recovery_factor, 2)

    def get_all_metrics(self):
        """
        دریافت تمام شاخص‌ها به صورت یکجا
        """
        sharpe, sharpe_desc = self.calculate_sharpe_ratio()
        sortino, sortino_desc = self.calculate_sortino_ratio()
        calmar, calmar_desc = self.calculate_calmar_ratio()
        profit_factor, pf_desc = self.calculate_profit_factor()
        max_drawdown = self.calculate_max_drawdown()
        kelly, kelly_desc = self.calculate_kelly_criterion()
        avg_rr = self.calculate_average_rr()
        expectancy = self.calculate_expectancy()
        win_rate = self.calculate_win_rate()
        total_profit = self.calculate_total_profit()
        total_trades = self.calculate_total_trades()
        recovery_factor = self.calculate_recovery_factor()

        return {
            'total_trades': total_trades,
            'total_profit': total_profit,
            'win_rate': win_rate,
            'sharpe_ratio': sharpe,
            'sharpe_desc': sharpe_desc,
            'sortino_ratio': sortino,
            'sortino_desc': sortino_desc,
            'calmar_ratio': calmar,
            'calmar_desc': calmar_desc,
            'profit_factor': profit_factor,
            'profit_factor_desc': pf_desc,
            'max_drawdown': max_drawdown,
            'kelly_criterion': kelly,
            'kelly_desc': kelly_desc,
            'avg_rr': avg_rr,
            'expectancy': expectancy,
            'recovery_factor': recovery_factor,
        }

    def get_trend_data(self, days=90):
        """
        دریافت داده‌های روند شاخص‌ها در بازه زمانی مشخص
        برای نمایش نمودار روند Sharpe و Sortino
        """
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=days)

        # گروه‌بندی تریدها بر اساس روز
        trend_data = []

        current_date = start_date
        while current_date <= end_date:
            day_trades = self.trades.filter(trade_date=current_date)
            if day_trades.exists():
                # محاسبه شاخص‌ها برای این روز
                temp_calc = AdvancedMetricsCalculator(
                    self.user,
                    portfolio_id=self.portfolio_id,
                    start_date=current_date,
                    end_date=current_date
                )
                sharpe, _ = temp_calc.calculate_sharpe_ratio()
                sortino, _ = temp_calc.calculate_sortino_ratio()
                pf, _ = temp_calc.calculate_profit_factor()

                trend_data.append({
                    'date': current_date.isoformat(),
                    'sharpe_ratio': sharpe,
                    'sortino_ratio': sortino,
                    'profit_factor': pf,
                    'total_trades': day_trades.count(),
                    'total_profit': float(day_trades.aggregate(Sum('profit'))['profit__sum'] or 0),
                })

            current_date += timedelta(days=1)

        return trend_data


class MetricsCache:
    """
    کلاس مدیریت کش شاخص‌ها برای کاهش بار محاسباتی
    """
    _cache = {}

    @classmethod
    def get_cache_key(cls, user_id, portfolio_id=None, start_date=None, end_date=None):
        """
        تولید کلید کش
        """
        key = f"metrics_{user_id}"
        if portfolio_id:
            key += f"_{portfolio_id}"
        if start_date:
            key += f"_{start_date}"
        if end_date:
            key += f"_{end_date}"
        return key

    @classmethod
    def get_cached_metrics(cls, key):
        """
        دریافت شاخص‌ها از کش
        """
        if key in cls._cache:
            data, timestamp = cls._cache[key]
            # کش برای ۵ دقیقه معتبر است
            if (datetime.now() - timestamp).seconds < 300:
                return data
        return None

    @classmethod
    def set_cached_metrics(cls, key, data):
        """
        ذخیره شاخص‌ها در کش
        """
        cls._cache[key] = (data, datetime.now())

    @classmethod
    def clear_cache(cls, user_id=None):
        """
        پاک کردن کش
        """
        if user_id:
            keys_to_delete = [k for k in cls._cache.keys() if str(user_id) in k]
            for k in keys_to_delete:
                del cls._cache[k]
        else:
            cls._cache.clear()