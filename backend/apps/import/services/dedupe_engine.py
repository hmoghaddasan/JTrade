# backend/apps/import/services/dedupe_engine.py
from apps.trading.models import Trade
from datetime import timedelta
import datetime as dt


class DedupeEngine:
    """موتور تشخیص تریدهای تکراری"""

    @classmethod
    def is_duplicate(cls, user, trade_data):
        """
        بررسی تکراری بودن ترید بر اساس ترکیب:
        - symbol
        - trade_date (با بازه ۲ روز قبل و بعد)
        - time_ny (دقیقاً برابر – تحمل صفر)
        - entry_price (با ۲٪ تحمل)
        - trade_type
        """
        symbol = trade_data.get('symbol')
        trade_date = trade_data.get('trade_date')
        time_ny = trade_data.get('time_ny')
        entry_price = trade_data.get('entry_price')
        trade_type = trade_data.get('trade_type')

        # اگر هر کدام از فیلدهای کلیدی وجود نداشت، تکراری در نظر نگیر
        if not all([symbol, trade_date, entry_price, trade_type]):
            return False

        # تبدیل تاریخ به شیء تاریخ (اگر رشته است)
        if isinstance(trade_date, str):
            try:
                trade_date = dt.date.fromisoformat(trade_date)
            except:
                return False

        # بازه تاریخی: ۲ روز قبل تا ۲ روز بعد
        start_date = trade_date - timedelta(days=2)
        end_date = trade_date + timedelta(days=2)

        # جستجوی تریدهای مشابه در دیتابیس
        similar_trades = Trade.objects.filter(
            user=user,
            symbol=symbol,
            trade_type=trade_type,
            trade_date__range=[start_date, end_date],
            is_deleted=False
        )

        # تحمل قیمت ورود: ۲٪ اختلاف
        tolerance = abs(float(entry_price) * 0.02) if entry_price else 0.1

        for trade in similar_trades:
            if trade.entry_price is not None:
                price_diff = abs(float(trade.entry_price) - float(entry_price))
                if price_diff <= tolerance:
                    # ============================================
                    # ✅ بررسی دقیق زمان (تحمل صفر)
                    # ============================================
                    if time_ny and trade.time_ny:
                        # اگر زمان‌ها دقیقاً برابر نباشند، تکراری نیست
                        if trade.time_ny != time_ny:
                            continue
                    elif time_ny or trade.time_ny:
                        # اگر یکی زمان دارد و دیگری ندارد، تکراری نیست
                        continue

                    # اگر همه چیز یکسان بود، تکراری است
                    return True

        return False