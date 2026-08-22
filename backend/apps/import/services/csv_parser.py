import csv
import io
import re
from datetime import datetime
from decimal import Decimal


class CSVParser:
    """
    پارسر CSV با قابلیت تشخیص خودکار ستون‌ها و نگاشت هوشمند
    """

    # فیلدهای مدل Trade و نام‌های ستون‌های رایج در CSV کارگزاران مختلف
    COMMON_FIELD_MAPPINGS = {
        'trade_date': ['Date', 'OpenTime', 'CloseTime', 'Time', 'TradeDate', 'Open Date', 'Close Date', 'datetime'],
        'symbol': ['Symbol', 'Instrument', 'Pair', 'Currency', 'Asset', 'Name'],
        'trade_type': ['Type', 'Side', 'Direction', 'Action', 'Order Type'],
        'entry_price': ['OpenPrice', 'Price', 'Entry', 'Open', 'AvgPrice'],
        'close_price': ['ClosePrice', 'Exit', 'Close', 'Last'],
        'stop_loss': ['SL', 'StopLoss', 'Stop Loss', 'S/L'],
        'take_profit': ['TP', 'TakeProfit', 'Take Profit', 'T/P'],
        'profit': ['Profit', 'NetProfit', 'P/L', 'PL', 'GrossProfit', 'Realized P/L'],
        'volume': ['Volume', 'Lots', 'Size', 'Quantity', 'Amount'],
        'commission': ['Commission', 'Fee', 'Brokerage'],
        'swap': ['Swap', 'Rollover', 'Swap Rate'],
        'comment': ['Comment', 'Note', 'Description', 'Reason'],
        'magic': ['Magic', 'MagicNumber', 'ExpertID'],
        'ticket': ['Ticket', 'OrderID', 'ID', 'TradeID'],
    }

    @classmethod
    def parse_csv_content(cls, csv_content, delimiter=','):
        """
        پارس کردن محتوای CSV و برگرداندن لیست دیکشنری‌ها
        """
        try:
            # تشخیص delimiter
            if delimiter is None:
                sample = csv_content[:1024]
                if ';' in sample and ',' not in sample:
                    delimiter = ';'
                elif '\t' in sample and ',' not in sample:
                    delimiter = '\t'
                else:
                    delimiter = ','

            # خواندن CSV
            reader = csv.DictReader(io.StringIO(csv_content), delimiter=delimiter)
            headers = reader.fieldnames or []
            rows = list(reader)

            return {
                'headers': headers,
                'rows': rows,
                'total_rows': len(rows),
                'delimiter': delimiter,
            }
        except Exception as e:
            raise ValueError(f"خطا در پارس CSV: {str(e)}")

    @classmethod
    def detect_broker(cls, headers):
        """
        تشخیص کارگزار بر اساس هدرهای CSV
        """
        headers_lower = [h.lower() for h in headers]
        headers_str = ' '.join(headers_lower)

        # الگوهای تشخیص
        patterns = {
            'MetaTrader 4': ['ticket', 'open time', 'close time', 'type', 'size', 'symbol', 'profit'],
            'MetaTrader 5': ['ticket', 'time', 'type', 'volume', 'symbol', 'profit', 'commission'],
            'TradingView': ['date', 'symbol', 'side', 'quantity', 'price', 'pl'],
            'Interactive Brokers': ['date/time', 'symbol', 'action', 'quantity', 'price', 'proceeds'],
            'Binance': ['date(utc)', 'pair', 'side', 'price', 'executed', 'amount', 'fee'],
            'Coinbase': ['timestamp', 'trade id', 'product', 'side', 'size', 'price', 'fee'],
        }

        for broker, keywords in patterns.items():
            matched = all(k in headers_str for k in keywords)
            if matched:
                return broker

        return None

    @classmethod
    def build_suggested_mapping(cls, headers):
        """
        ساخت نگاشت پیشنهادی بر اساس هدرهای موجود
        """
        mapping = {}
        headers_lower = [h.lower() for h in headers]

        for field, possible_names in cls.COMMON_FIELD_MAPPINGS.items():
            for name in possible_names:
                name_lower = name.lower()
                for idx, header in enumerate(headers_lower):
                    if name_lower in header or header in name_lower:
                        mapping[field] = headers[idx]
                        break
                if field in mapping:
                    break

        return mapping

    @classmethod
    def normalize_value(cls, value, field_type):
        """
        تبدیل مقدار به نوع مناسب بر اساس فیلد
        """
        if not value or value.strip() == '':
            return None

        value = value.strip()

        if field_type in ('trade_date', 'date'):
            # تلاش برای parse تاریخ
            formats = ['%Y-%m-%d', '%Y/%m/%d', '%d-%m-%Y', '%d/%m/%Y', '%m/%d/%Y', '%Y%m%d']
            for fmt in formats:
                try:
                    return datetime.strptime(value, fmt).date()
                except:
                    continue
            # اگر شامل زمان بود
            try:
                dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
                return dt.date()
            except:
                pass
            # بازگشت به عنوان رشته
            return value

        elif field_type in ('entry_price', 'close_price', 'stop_loss', 'take_profit', 'profit', 'volume', 'commission', 'swap'):
            # تبدیل به Decimal
            try:
                # حذف کاما و کاراکترهای غیرعددی به جز نقطه
                cleaned = re.sub(r'[^\d.\-]', '', value)
                return Decimal(cleaned)
            except:
                return None

        elif field_type == 'trade_type':
            # تشخیص Buy/Sell
            if value.lower() in ('buy', 'b', 'long', '1', 'خرید'):
                return 'Buy'
            elif value.lower() in ('sell', 's', 'short', '0', 'فروش'):
                return 'Sell'
            return value

        else:
            return value