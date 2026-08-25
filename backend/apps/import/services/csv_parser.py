# backend/apps/import/services/csv_parser.py
import csv
import io
import re
from datetime import datetime
from dateutil import parser as date_parser
from apps.trading.models import CurrencyPair


class CSVParser:
    """پارس و نرمال‌ساز فایل‌های CSV برای ایمپورت ترید"""

    # ============================================================
    # ۱. پارس اصلی CSV
    # ============================================================
    @classmethod
    def parse_csv_content(cls, content):
        """خواندن محتوای CSV و استخراج هدر و ردیف‌ها"""
        try:
            sniffer = csv.Sniffer()
            dialect = sniffer.sniff(content[:1024])
            reader = csv.reader(io.StringIO(content), dialect)

            rows = list(reader)
            if not rows:
                return {'headers': [], 'rows': [], 'total_rows': 0}

            headers = rows[0]
            data_rows = rows[1:] if len(rows) > 1 else []

            dict_rows = []
            for row in data_rows:
                if len(row) == len(headers):
                    dict_rows.append({headers[i]: row[i].strip() for i in range(len(headers))})
                else:
                    row_dict = {}
                    for i, header in enumerate(headers):
                        row_dict[header] = row[i].strip() if i < len(row) else ''
                    dict_rows.append(row_dict)

            return {
                'headers': headers,
                'rows': dict_rows,
                'total_rows': len(dict_rows),
            }
        except Exception as e:
            raise ValueError(f"خطا در خواندن فایل CSV: {str(e)}")

    # ============================================================
    # ۲. تشخیص کارگزار از روی هدرها
    # ============================================================
    @classmethod
    def detect_broker(cls, headers):
        """تشخیص کارگزار بر اساس نام ستون‌ها"""
        headers_lower = [h.lower() for h in headers]
        header_str = ' '.join(headers_lower)

        brokers = {
            'MetaTrader 4': ['ticket', 'open_time', 'close_time', 'type', 'lots', 'symbol', 'profit'],
            'MetaTrader 5': ['ticket', 'time', 'type', 'volume', 'symbol', 'profit'],
            'TradingView': ['symbol', 'side', 'qty', 'fill price', 'commission', 'closing time'],
            'Binance': ['symbol', 'side', 'price', 'qty', 'commission', 'realized profit'],
            'Bybit': ['symbol', 'side', 'price', 'qty', 'fee', 'pnl'],
            'IC Markets': ['ticket', 'open_time', 'close_time', 'type', 'volume', 'symbol', 'profit'],
            'Exness': ['ticket', 'open_time', 'close_time', 'type', 'volume', 'symbol', 'profit'],
            'OKX': ['symbol', 'side', 'price', 'qty', 'fee', 'pnl'],
            'KuCoin': ['symbol', 'side', 'price', 'qty', 'fee', 'pnl'],
            'Gate.io': ['symbol', 'side', 'price', 'qty', 'fee', 'pnl'],
            'Bitget': ['symbol', 'side', 'price', 'qty', 'fee', 'pnl'],
            'Coinbase': ['symbol', 'side', 'price', 'qty', 'fee', 'pnl'],
        }

        best_match = None
        best_score = 0

        for broker, keywords in brokers.items():
            score = sum(1 for kw in keywords if kw in header_str)
            if score > best_score:
                best_score = score
                best_match = broker

        return best_match if best_score >= 2 else None

    # ============================================================
    # ۳. ساخت نگاشت پیشنهادی (با اضافه شدن time_ny)
    # ============================================================
    @classmethod
    def build_suggested_mapping(cls, headers):
        """ساخت نگاشت پیشنهادی بر اساس نام ستون‌ها"""
        mapping = {}
        headers_lower = {h.lower(): h for h in headers}

        field_map = {
            'trade_date': ['trade date', 'open_time', 'opening_time', 'date', 'time', 'closing time', 'close_time'],
            'time_ny': ['time', 'open time', 'closing time', 'hour', 'time_ny', 'open_time', 'closing_time'],
            'symbol': ['symbol', 'pair', 'instrument'],
            'trade_type': ['type', 'side', 'direction', 'order type'],
            'entry_price': ['open price', 'opening price', 'price', 'fill price'],
            'closing_price': ['close price', 'closing price', 'exit price'],
            'stop_loss': ['stop loss', 'sl', 'stop'],
            'take_profit': ['take profit', 'tp', 'profit target'],
            'profit': ['profit', 'pnl', 'realized profit', 'net profit'],
            'commission': ['commission', 'fee', 'commission usd'],
            'swap': ['swap', 'rollover', 'overnight'],
            'lots': ['lots', 'volume', 'qty', 'quantity', 'size'],
            'ticket': ['ticket', 'order id', 'id', 'order number'],
            'close_reason': ['close reason', 'exit reason', 'reason'],
            'bias': ['bias', 'direction', 'market bias'],
            'strategy_type': ['strategy', 'strategy type'],
        }

        for field, keywords in field_map.items():
            for kw in keywords:
                for header, original in headers_lower.items():
                    if kw in header:
                        mapping[field] = original
                        break
                if field in mapping:
                    break

        return mapping

    # ============================================================
    # ۴. نرمال‌سازی مقدار بر اساس نوع فیلد (با اضافه شدن time_ny)
    # ============================================================
    @classmethod
    def normalize_value(cls, value, field_name):
        """نرمال‌سازی یک مقدار بر اساس نام فیلد مدل"""
        if value is None or str(value).strip() == '':
            return None

        value = str(value).strip()

        if field_name in ['trade_date', 'opening_time_utc', 'closing_time_utc']:
            return cls.normalize_date(value)
        elif field_name == 'time_ny':
            return cls.normalize_time(value)
        elif field_name == 'symbol':
            return cls.normalize_symbol(value)
        elif field_name == 'trade_type':
            return cls.normalize_trade_type(value)
        elif field_name in ['entry_price', 'closing_price', 'stop_loss', 'take_profit']:
            # قیمت‌ها با دقت ۵ رقم اعشار (بدون گرد کردن)
            return cls.normalize_decimal(value, field_name)
        elif field_name in ['profit', 'profit_usd', 'commission_usd', 'swap_usd', 'risk_percent', 'risk_reward_ratio']:
            # فیلدهای مالی با ۲ رقم اعشار
            return cls.normalize_decimal(value, field_name, decimal_places=2)
        elif field_name == 'lots':
            # حجم معامله با ۲ رقم اعشار
            return cls.normalize_decimal(value, field_name, decimal_places=2)
        elif field_name == 'ticket':
            return cls.normalize_integer(value)
        elif field_name == 'bias':
            return cls.normalize_bias(value)
        elif field_name == 'strategy_type':
            return cls.normalize_strategy(value)
        elif field_name in ['stop_loss_adherence', 'strategy_adherence',
                            'capital_management_adherence', 'over_trade',
                            'post_trade_scan', 'entry_reason_written',
                            'exit_reason_written', 'mistakes_recorded',
                            'food_status', 'focus', 'calm', 'excited',
                            'fear', 'greed', 'relaxed', 'happy', 'sad',
                            'energetic', 'tired', 'fomo', 'patience',
                            'contentment', 'weekly_news_printed',
                            'zero_hour_identified', 'asian_range_identified',
                            'london_range_identified', 'judas_lo_identified',
                            'key_levels_reviewed', 'smt_confirmed',
                            'bond_dxy_support']:
            return cls.normalize_boolean(value)
        elif field_name == 'sleep_quality':
            return cls.normalize_sleep_quality(value)
        elif field_name in ['pre_trade_stress', 'entry_emotion_control']:
            return cls.normalize_stress_level(value)
        elif field_name == 'expectation_management':
            return cls.normalize_expectation_management(value)
        else:
            return value

    # ============================================================
    # ۵. نرمال‌سازهای اختصاصی
    # ============================================================

    # ----- ۵-۱. تاریخ -----
    @classmethod
    def normalize_date(cls, value):
        """تبدیل هر فرمت تاریخ به YYYY-MM-DD با اولویت Regex و لاگ دیباگ"""
        if not value:
            print(f"❌ normalize_date: value is None or empty")
            return None

        value = str(value).strip()
        print(f"🔍 normalize_date: input value = '{value}'")

        # ۱. استخراج سریع با Regex
        # YYYY-MM-DD
        match = re.search(r'(\d{4}-\d{2}-\d{2})', value)
        if match:
            result = match.group(1)
            print(f"✅ normalize_date: extracted YYYY-MM-DD = '{result}'")
            return result

        # YYYY/MM/DD
        match = re.search(r'(\d{4}/\d{2}/\d{2})', value)
        if match:
            result = match.group(1).replace('/', '-')
            print(f"✅ normalize_date: extracted YYYY/MM/DD = '{result}'")
            return result

        # DD-MM-YYYY
        match = re.search(r'(\d{2}-\d{2}-\d{4})', value)
        if match:
            parts = match.group(1).split('-')
            result = f"{parts[2]}-{parts[1]}-{parts[0]}"
            print(f"✅ normalize_date: extracted DD-MM-YYYY = '{result}'")
            return result

        # DD/MM/YYYY
        match = re.search(r'(\d{2}/\d{2}/\d{4})', value)
        if match:
            parts = match.group(1).split('/')
            result = f"{parts[2]}-{parts[1]}-{parts[0]}"
            print(f"✅ normalize_date: extracted DD/MM/YYYY = '{result}'")
            return result

        # ۲. استفاده از dateutil.parser
        try:
            dt = date_parser.parse(value, fuzzy=False)
            result = dt.date().isoformat()
            print(f"✅ normalize_date: parsed with dateutil = '{result}'")
            return result
        except Exception as e:
            print(f"⚠️ normalize_date: dateutil failed - {e}")

        # ۳. امتحان فرمت‌های خاص
        formats = [
            '%Y-%m-%dT%H:%M:%S.%f',   # 2025-06-30T01:37:01.328000
            '%Y-%m-%dT%H:%M:%S',      # 2025-06-30T01:37:01
            '%Y-%m-%d %H:%M:%S',      # 2025-06-30 01:37:01
            '%Y/%m/%d %H:%M:%S',      # 2025/06/30 01:37:01
            '%Y-%m-%d',               # 2025-06-30
            '%Y/%m/%d',               # 2025/06/30
            '%d-%m-%Y',               # 30-06-2025
            '%d/%m/%Y',               # 30/06/2025
            '%m/%d/%Y',               # 06/30/2025
            '%Y%m%d',                 # 20250630
        ]
        for fmt in formats:
            try:
                dt = datetime.strptime(value, fmt)
                result = dt.date().isoformat()
                print(f"✅ normalize_date: parsed with format '{fmt}' = '{result}'")
                return result
            except ValueError:
                continue

        # ۴. بررسی Unix Timestamp
        try:
            num = int(float(value))
            if len(str(num)) == 10:  # ثانیه
                dt = datetime.fromtimestamp(num)
                result = dt.date().isoformat()
                print(f"✅ normalize_date: parsed as Unix timestamp (seconds) = '{result}'")
                return result
            elif len(str(num)) == 13:  # میلی‌ثانیه
                dt = datetime.fromtimestamp(num / 1000)
                result = dt.date().isoformat()
                print(f"✅ normalize_date: parsed as Unix timestamp (milliseconds) = '{result}'")
                return result
        except Exception as e:
            print(f"⚠️ normalize_date: Unix timestamp failed - {e}")

        print(f"❌ normalize_date: ALL methods failed for '{value}'")
        return None

    # ----- ۵-۲. زمان -----
    @classmethod
    def normalize_time(cls, value):
        """استخراج زمان (HH:MM:SS) از یک رشته تاریخ-زمان"""
        if not value:
            return None

        value = str(value).strip()
        print(f"🔍 normalize_time: input value = '{value}'")

        # ۱. استخراج با Regex برای فرمت‌های استاندارد
        # الگوی HH:MM:SS با میلی‌ثانیه اختیاری
        match = re.search(r'(\d{2}:\d{2}:\d{2})(?:\.\d+)?', value)
        if match:
            result = match.group(1)
            print(f"✅ normalize_time: extracted HH:MM:SS = '{result}'")
            return result

        # ۲. استفاده از dateutil.parser برای استخراج زمان
        try:
            dt = date_parser.parse(value, fuzzy=False)
            result = dt.time().isoformat()  # HH:MM:SS
            print(f"✅ normalize_time: parsed with dateutil = '{result}'")
            return result
        except (ValueError, TypeError, OverflowError) as e:
            print(f"⚠️ normalize_time: dateutil failed - {e}")

        print(f"❌ normalize_time: ALL methods failed for '{value}'")
        return None

    # ----- ۵-۳. نماد -----
    _valid_symbols_cache = None

    @classmethod
    def _get_valid_symbols(cls):
        if cls._valid_symbols_cache is None:
            cls._valid_symbols_cache = list(
                CurrencyPair.objects.filter(is_active=True)
                .values_list('symbol', flat=True)
            )
            print(f"📊 Valid symbols loaded: {len(cls._valid_symbols_cache)} symbols")
        return cls._valid_symbols_cache

    @classmethod
    def normalize_symbol(cls, value):
        """نرمال‌سازی نماد و تطبیق با دیتابیس"""
        if not value:
            print(f"❌ normalize_symbol: value is None or empty")
            return None

        symbol = str(value).strip().upper()
        print(f"🔍 normalize_symbol: input = '{symbol}'")

        # حذف کاراکترهای غیرمجاز
        clean_symbol = re.sub(r'[^A-Z0-9]', '', symbol)
        print(f"🔍 normalize_symbol: cleaned = '{clean_symbol}'")

        valid_symbols = cls._get_valid_symbols()
        if not valid_symbols:
            print(f"⚠️ normalize_symbol: No valid symbols in database")
            return clean_symbol

        if clean_symbol in valid_symbols:
            print(f"✅ normalize_symbol: exact match = '{clean_symbol}'")
            return clean_symbol

        # تطابق پیشوند
        for valid in valid_symbols:
            if clean_symbol.startswith(valid) or valid.startswith(clean_symbol):
                print(f"✅ normalize_symbol: prefix match = '{valid}' (from '{clean_symbol}')")
                return valid

        # تطابق جزئی
        for valid in valid_symbols:
            if clean_symbol in valid:
                print(f"✅ normalize_symbol: partial match = '{valid}' (from '{clean_symbol}')")
                return valid

        print(f"⚠️ normalize_symbol: no match found, returning '{clean_symbol}'")
        return clean_symbol

    # ----- ۵-۴. نوع ترید -----
    @classmethod
    def normalize_trade_type(cls, value):
        if not value:
            return None
        v = str(value).strip().lower()
        if v in ['buy', 'b', 'long', '1', 'yes', 'true']:
            return 'Buy'
        elif v in ['sell', 's', 'short', '0', 'no', 'false']:
            return 'Sell'
        return None

    # ----- ۵-۵. اعداد اعشاری با گرد کردن -----
    @classmethod
    def normalize_decimal(cls, value, field_name=None, decimal_places=None):
        """
        نرمال‌سازی اعداد اعشاری با گرد کردن به تعداد اعشار مشخص
        اگر decimal_places مشخص نشده باشد، از روی نام فیلد تصمیم‌گیری می‌شود
        """
        if not value:
            return None

        value = str(value).strip()
        value = re.sub(r'[^\d.,\-]', '', value)
        if not value:
            return None

        if ',' in value:
            parts = value.split(',')
            if len(parts) == 2 and parts[1].isdigit():
                value = value.replace(',', '.')
            else:
                value = value.replace(',', '')

        try:
            num = float(value)
        except ValueError:
            return None

        # اگر تعداد اعشار مشخص نشده، از روی نام فیلد تشخیص بده
        if decimal_places is None:
            if field_name in ['profit', 'profit_usd', 'commission_usd', 'swap_usd', 'risk_percent', 'risk_reward_ratio', 'lots']:
                decimal_places = 2
            else:
                # برای قیمت‌ها (entry_price و ...) که دقت بیشتری نیاز دارند
                decimal_places = 5

        # گرد کردن به تعداد اعشار مشخص
        rounded = round(num, decimal_places)
        return rounded

    # ----- ۵-۶. اعداد صحیح -----
    @classmethod
    def normalize_integer(cls, value):
        if not value:
            return None
        value = str(value).strip()
        value = re.sub(r'[^\d]', '', value)
        if not value:
            return None
        try:
            return int(value)
        except ValueError:
            return None

    # ----- ۵-۷. بولی -----
    @classmethod
    def normalize_boolean(cls, value):
        if not value:
            return False
        v = str(value).strip().lower()
        true_values = ['true', 'yes', '1', 'y', 't', 'بله', 'فعال', 'done', 'ok', 'on']
        false_values = ['false', 'no', '0', 'n', 'f', 'خیر', 'غیرفعال', 'not', 'off']
        if v in true_values:
            return True
        elif v in false_values:
            return False
        return False

    # ----- ۵-۸. بایاس -----
    @classmethod
    def normalize_bias(cls, value):
        if not value:
            return 'Neutral'
        v = str(value).strip().lower()
        if v in ['bullish', 'bull', 'long', 'up', 'صعودی', 'بازار صعودی']:
            return 'Bullish'
        elif v in ['bearish', 'bear', 'short', 'down', 'نزولی', 'بازار نزولی']:
            return 'Bearish'
        else:
            return 'Neutral'

    # ----- ۵-۹. استراتژی -----
    @classmethod
    def normalize_strategy(cls, value):
        if not value:
            return None
        v = str(value).strip().upper()
        if 'LTP' in v:
            return 'LTP'
        elif 'ITP' in v:
            return 'ITP'
        elif 'STP' in v:
            return 'STP'
        return None

    # ----- ۵-۱۰. کیفیت خواب -----
    @classmethod
    def normalize_sleep_quality(cls, value):
        if not value:
            return None
        v = str(value).strip().lower()
        if v in ['good', 'خوب', 'عالی', 'great', 'excellent']:
            return 'خوب'
        elif v in ['medium', 'average', 'متوسط', 'normal']:
            return 'متوسط'
        elif v in ['bad', 'poor', 'بد', 'ضعیف']:
            return 'بد'
        return None

    # ----- ۵-۱۱. سطح استرس -----
    @classmethod
    def normalize_stress_level(cls, value):
        if not value:
            return 'متوسط'
        v = str(value).strip().lower()
        if v in ['low', 'کم', 'low stress']:
            return 'کم'
        elif v in ['medium', 'average', 'متوسط', 'normal']:
            return 'متوسط'
        elif v in ['high', 'زیاد', 'high stress']:
            return 'زیاد'
        return 'متوسط'

    # ----- ۵-۱۲. مدیریت انتظار -----
    @classmethod
    def normalize_expectation_management(cls, value):
        if not value:
            return 'متوسط'
        v = str(value).strip().lower()
        if v in ['weak', 'ضعیف', 'bad']:
            return 'ضعیف'
        elif v in ['medium', 'average', 'متوسط', 'normal']:
            return 'متوسط'
        elif v in ['good', 'خوب', 'great']:
            return 'خوب'
        return 'متوسط'

    # ============================================================
    # ۶. نرمال‌سازی احساسات از ردیف کامل
    # ============================================================
    @classmethod
    def extract_emotions_from_row(cls, row):
        """استخراج احساسات از ستون‌های مختلف در صورت وجود"""
        emotions = {}
        emotion_keywords = {
            'focus': ['focus', 'تمرکز', 'concentrate'],
            'calm': ['calm', 'آرام', 'relaxed'],
            'excited': ['excited', 'هیجان', 'energetic'],
            'fear': ['fear', 'ترس', 'anxious'],
            'greed': ['greed', 'طمع', 'greedy'],
            'relaxed': ['relaxed', 'ریلکس', 'chill'],
            'happy': ['happy', 'خوشحال', 'joyful'],
            'sad': ['sad', 'غمگین', 'depressed'],
            'energetic': ['energetic', 'پرانرژی'],
            'tired': ['tired', 'خسته', 'fatigue'],
            'fomo': ['fomo', 'fear of missing out'],
            'patience': ['patience', 'صبر', 'patient'],
            'contentment': ['contentment', 'قناعت', 'content'],
        }

        for key, value in row.items():
            key_lower = key.lower()
            for emotion, keywords in emotion_keywords.items():
                if any(kw in key_lower for kw in keywords):
                    emotions[emotion] = cls.normalize_boolean(value)
                    break

        return emotions

    # ============================================================
    # ۷. نرمال‌سازی کامل یک ردیف بر اساس نگاشت (با لاگ)
    # ============================================================
    @classmethod
    def normalize_row(cls, row, column_mapping):
        """نرمال‌سازی یک ردیف کامل بر اساس نگاشت ستون‌ها"""
        print(f"🔍 normalize_row: processing row: {row}")
        print(f"🔍 normalize_row: column_mapping: {column_mapping}")

        normalized = {}

        for model_field, csv_column in column_mapping.items():
            if not csv_column:
                continue
            raw_value = row.get(csv_column)
            if raw_value is None or str(raw_value).strip() == '':
                print(f"⚠️ normalize_row: {model_field} = '{csv_column}' is empty or None")
                continue

            print(f"🔍 normalize_row: mapping {model_field} <- '{csv_column}' = '{raw_value}'")
            normalized[model_field] = cls.normalize_value(raw_value, model_field)
            print(f"✅ normalize_row: normalized {model_field} = '{normalized.get(model_field)}'")

        emotions = cls.extract_emotions_from_row(row)
        normalized.update(emotions)

        print(f"📦 normalize_row: final normalized row: {normalized}")
        return normalized