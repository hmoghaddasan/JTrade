from django.db.models import Q
from apps.trading.models import Trade


class DedupeEngine:
    """
    تشخیص تریدهای تکراری بر اساس فیلدهای کلیدی
    """

    @classmethod
    def is_duplicate(cls, user, trade_data):
        """
        بررسی اینکه آیا تریدی با این داده‌ها قبلاً برای کاربر ثبت شده است.
        معیارها: تاریخ، نماد، قیمت ورود، قیمت خروج، سود (با تلورانس کوچک)
        """
        trade_date = trade_data.get('trade_date')
        symbol = trade_data.get('symbol')
        entry_price = trade_data.get('entry_price')
        close_price = trade_data.get('close_price')
        profit = trade_data.get('profit')

        if not trade_date or not symbol:
            return False

        # ساخت Query
        query = Q(user=user, is_deleted=False, trade_date=trade_date, symbol=symbol)

        if entry_price is not None:
            # تلورانس 0.1%
            tolerance = abs(entry_price) * 0.001 if entry_price else 0.001
            query &= Q(entry_price__range=(entry_price - tolerance, entry_price + tolerance))

        if close_price is not None:
            tolerance = abs(close_price) * 0.001 if close_price else 0.001
            query &= Q(close_price__range=(close_price - tolerance, close_price + tolerance))

        if profit is not None:
            tolerance = abs(profit) * 0.01 if profit else 0.01
            query &= Q(profit__range=(profit - tolerance, profit + tolerance))

        return Trade.objects.filter(query).exists()

    @classmethod
    def find_duplicates_bulk(cls, user, trade_list):
        """
        پیدا کردن تریدهای تکراری در یک لیست از داده‌ها
        بازگشت لیست ایندکس‌های تکراری
        """
        duplicates = []
        for idx, trade_data in enumerate(trade_list):
            if cls.is_duplicate(user, trade_data):
                duplicates.append(idx)
        return duplicates