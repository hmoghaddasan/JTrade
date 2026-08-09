# backend/test_live_price.py

"""
فایل تست قیمت لحظه‌ای برای پروژه JTrade
این فایل به‌صورت مستقل اجرا می‌شود و اتصال به سرویس‌های مختلف را تست می‌کند.
"""

import os
import sys
import json
import requests
from pathlib import Path
from dotenv import load_dotenv

# ============================================
# بارگذاری متغیرهای محیطی از .env
# ============================================
BASE_DIR = Path(__file__).resolve().parent
env_path = BASE_DIR / '.env'
if env_path.exists():
    load_dotenv(env_path)
    print(f"✅ فایل .env از مسیر {env_path} بارگذاری شد.")
else:
    print(f"⚠️ فایل .env در مسیر {env_path} پیدا نشد. از متغیرهای سیستم استفاده می‌شود.")

# ============================================
# خواندن تنظیمات از محیط
# ============================================
LIVE_PRICE_PROVIDER = os.environ.get('LIVE_PRICE_PROVIDER', 'none').lower()
TWELVEDATA_API_KEY = os.environ.get('TWELVEDATA_API_KEY', '')
TWELVEDATA_BASE_URL = os.environ.get('TWELVEDATA_BASE_URL', 'https://api.twelvedata.com')
FINNHUB_API_KEY = os.environ.get('FINNHUB_API_KEY', '')
FINNHUB_BASE_URL = os.environ.get('FINNHUB_BASE_URL', 'https://finnhub.io/api/v1')
ALPHA_VANTAGE_API_KEY = os.environ.get('ALPHA_VANTAGE_API_KEY', '')


# ============================================
# توابع دریافت قیمت از هر سرویس
# ============================================

def get_price_twelvedata(symbol):
    """دریافت قیمت از Twelve Data"""
    if not TWELVEDATA_API_KEY:
        return None, "❌ Twelve Data API Key تنظیم نشده است"

    try:
        formatted_symbol = symbol
        if '/' not in symbol:
            if symbol.endswith('USD') and len(symbol) > 3:
                base = symbol[:-3]
                formatted_symbol = f"{base}/USD"
            elif len(symbol) == 6:
                formatted_symbol = f"{symbol[:3]}/{symbol[3:]}"

        url = f"{TWELVEDATA_BASE_URL}/price"
        params = {
            'symbol': formatted_symbol,
            'apikey': TWELVEDATA_API_KEY
        }
        print(f"📤 Twelve Data: {url}?symbol={formatted_symbol}")

        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        if 'price' in data and data['price']:
            price = float(data['price'])
            return price, f"✅ موفق: قیمت {symbol} = {price:.4f} (Twelve Data)"
        else:
            return None, f"⚠️ پاسخ نامعتبر: {data}"

    except requests.exceptions.RequestException as e:
        return None, f"❌ خطا در Twelve Data: {str(e)}"
    except Exception as e:
        return None, f"❌ خطای غیرمنتظره در Twelve Data: {str(e)}"


def get_price_finnhub(symbol):
    """دریافت قیمت از Finnhub"""
    if not FINNHUB_API_KEY:
        return None, "❌ Finnhub API Key تنظیم نشده است"

    try:
        formatted_symbol = symbol
        if len(symbol) == 6:
            formatted_symbol = f"OANDA:{symbol}"
        elif symbol.endswith('USD'):
            formatted_symbol = f"BINANCE:{symbol}"
        elif symbol in ['XAUUSD', 'XAGUSD', 'XPDUSD', 'XPTUSD']:
            formatted_symbol = f"OANDA:{symbol}"

        url = f"{FINNHUB_BASE_URL}/quote"
        params = {
            'symbol': formatted_symbol,
            'token': FINNHUB_API_KEY
        }
        print(f"📤 Finnhub: {url}?symbol={formatted_symbol}")

        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        if 'c' in data and data['c']:
            price = float(data['c'])
            return price, f"✅ موفق: قیمت {symbol} = {price:.4f} (Finnhub)"
        else:
            return None, f"⚠️ پاسخ نامعتبر: {data}"

    except requests.exceptions.RequestException as e:
        return None, f"❌ خطا در Finnhub: {str(e)}"
    except Exception as e:
        return None, f"❌ خطای غیرمنتظره در Finnhub: {str(e)}"


def get_price_alphavantage(symbol):
    """دریافت قیمت از Alpha Vantage"""
    if not ALPHA_VANTAGE_API_KEY:
        return None, "❌ Alpha Vantage API Key تنظیم نشده است"

    try:
        if symbol in ['XAUUSD', 'XAGUSD', 'XPDUSD', 'XPTUSD']:
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
                'apikey': ALPHA_VANTAGE_API_KEY
            }
            print(
                f"📤 Alpha Vantage (کالا): {url}?function=CURRENCY_EXCHANGE_RATE&from_currency={commodity}&to_currency=USD")

        elif symbol in ['USOIL', 'UKOIL']:
            function = 'WTI' if symbol == 'USOIL' else 'BRENT'
            url = "https://www.alphavantage.co/query"
            params = {
                'function': function,
                'apikey': ALPHA_VANTAGE_API_KEY
            }
            print(f"📤 Alpha Vantage (نفت): {url}?function={function}")

        else:
            if symbol.endswith('USD'):
                from_currency = symbol[:-3]
                to_currency = 'USD'
            elif len(symbol) == 6:
                from_currency = symbol[:3]
                to_currency = symbol[3:]
            else:
                return None, f"⚠️ نماد {symbol} قابل تشخیص نیست"

            url = "https://www.alphavantage.co/query"
            params = {
                'function': 'CURRENCY_EXCHANGE_RATE',
                'from_currency': from_currency,
                'to_currency': to_currency,
                'apikey': ALPHA_VANTAGE_API_KEY
            }
            print(
                f"📤 Alpha Vantage: {url}?function=CURRENCY_EXCHANGE_RATE&from_currency={from_currency}&to_currency={to_currency}")

        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        if 'Realtime Currency Exchange Rate' in data:
            price = data['Realtime Currency Exchange Rate']['5. Exchange Rate']
            return float(price), f"✅ موفق: قیمت {symbol} = {float(price):.4f} (Alpha Vantage)"
        elif 'data' in data and len(data['data']) > 0:
            price = float(data['data'][0]['value'])
            return price, f"✅ موفق: قیمت {symbol} = {price:.4f} (Alpha Vantage)"
        else:
            return None, f"⚠️ پاسخ نامعتبر: {data}"

    except requests.exceptions.RequestException as e:
        return None, f"❌ خطا در Alpha Vantage: {str(e)}"
    except Exception as e:
        return None, f"❌ خطای غیرمنتظره در Alpha Vantage: {str(e)}"


def get_price(symbol):
    """دریافت قیمت از provider تنظیم‌شده در .env"""
    print("\n" + "=" * 60)
    print(f"🔍 تست قیمت لحظه‌ای برای نماد: {symbol}")
    print("=" * 60)
    print(f"📋 Provider تنظیم‌شده: {LIVE_PRICE_PROVIDER}")
    print(f"📋 Twelve Data API Key: {'✅ موجود' if TWELVEDATA_API_KEY else '❌ وجود ندارد'}")
    print(f"📋 Finnhub API Key: {'✅ موجود' if FINNHUB_API_KEY else '❌ وجود ندارد'}")
    print(f"📋 Alpha Vantage API Key: {'✅ موجود' if ALPHA_VANTAGE_API_KEY else '❌ وجود ندارد'}")
    print("-" * 60)

    if LIVE_PRICE_PROVIDER == 'none':
        print("⚠️ دریافت قیمت لحظه‌ای غیرفعال است (LIVE_PRICE_PROVIDER=none)")
        return None, "غیرفعال"

    if LIVE_PRICE_PROVIDER == 'twelvedata':
        return get_price_twelvedata(symbol)
    elif LIVE_PRICE_PROVIDER == 'finnhub':
        return get_price_finnhub(symbol)
    elif LIVE_PRICE_PROVIDER == 'alphavantage':
        return get_price_alphavantage(symbol)
    else:
        return None, f"❌ Provider '{LIVE_PRICE_PROVIDER}' نامعتبر است. مقادیر مجاز: twelvedata, finnhub, alphavantage, none"


def test_all_providers(symbol):
    """تست همه providerها به‌طور همزمان برای مقایسه"""
    print("\n" + "=" * 60)
    print(f"🔍 تست همه سرویس‌ها برای نماد: {symbol}")
    print("=" * 60)

    results = {}

    price, msg = get_price_twelvedata(symbol)
    results['twelvedata'] = {'price': price, 'msg': msg}

    price, msg = get_price_finnhub(symbol)
    results['finnhub'] = {'price': price, 'msg': msg}

    price, msg = get_price_alphavantage(symbol)
    results['alphavantage'] = {'price': price, 'msg': msg}

    print("\n" + "-" * 60)
    print("📊 خلاصه نتایج:")
    for provider, result in results.items():
        status = "✅" if result['price'] else "❌"
        price_str = f"{result['price']:.4f}" if result['price'] else "ندارد"
        print(f"  {status} {provider}: {price_str} - {result['msg'][:50]}...")

    return results


# ============================================
# تابع اصلی
# ============================================
def main():
    import argparse

    parser = argparse.ArgumentParser(description='تست قیمت لحظه‌ای از سرویس‌های مختلف')
    parser.add_argument('symbol', nargs='?', default='EURUSD',
                        help='نماد مورد نظر (پیش‌فرض: EURUSD)')
    parser.add_argument('--all', action='store_true',
                        help='تست همه سرویس‌ها به‌طور همزمان')
    parser.add_argument('--provider', choices=['twelvedata', 'finnhub', 'alphavantage'],
                        help='انتخاب سرویس خاص (پیش‌فرض: از .env استفاده می‌شود)')

    args = parser.parse_args()
    symbol = args.symbol.upper()

    # اگر provider خاصی مشخص شده، متغیر سراسری را تغییر بده
    if args.provider:
        global LIVE_PRICE_PROVIDER
        LIVE_PRICE_PROVIDER = args.provider
        print(f"🔧 استفاده از provider: {LIVE_PRICE_PROVIDER} (از پارامتر)")

    if args.all:
        test_all_providers(symbol)
    else:
        price, msg = get_price(symbol)
        print("\n" + "-" * 60)
        if price:
            print(f"✅ قیمت نهایی: {price:.4f}")
        else:
            print(f"❌ نتیجه: {msg}")
        print("=" * 60)


if __name__ == "__main__":
    main()