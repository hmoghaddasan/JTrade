# backend/test_alpha_vantage.py

import os
import sys
import django
import requests
import json

# تنظیم محیط Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'trading_journal.settings')
django.setup()

from django.conf import settings
from apps.trading.ai_service import AIService


def test_alpha_vantage_direct():
    """تست مستقیم API Alpha Vantage"""

    # ============================================
    # ۱- بررسی وجود API Key در settings
    # ============================================
    api_key = getattr(settings, 'ALPHA_VANTAGE_API_KEY', '')

    print("=" * 60)
    print("📊 تست Alpha Vantage API")
    print("=" * 60)
    print(f"🔑 API Key موجود است: {'✅ بله' if api_key else '❌ خیر'}")
    print(f"🔑 API Key: {api_key[:10]}{'...' if api_key else ''}")
    print("=" * 60)

    if not api_key:
        print("❌ API Key یافت نشد! لطفاً آن را در فایل .env تنظیم کنید.")
        print("   ALPHA_VANTAGE_API_KEY=your_api_key_here")
        return

    # ============================================
    # ۲- تست دریافت قیمت لحظه‌ای برای نمادهای مختلف
    # ============================================
    symbols_to_test = ['EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD', 'XAUUSD', 'USOIL']

    print("\n📊 تست دریافت قیمت لحظه‌ای برای نمادهای مختلف:")
    print("-" * 60)

    for symbol in symbols_to_test:
        try:
            print(f"\n🔄 در حال دریافت قیمت {symbol}...")
            price = AIService.get_live_price(symbol)

            if price:
                print(f"✅ {symbol}: {price:.5f}")
            else:
                print(f"❌ {symbol}: قیمت دریافت نشد (خطا یا محدودیت)")

        except Exception as e:
            print(f"❌ {symbol}: خطا - {str(e)}")

    # ============================================
    # ۳- تست مستقیم با Requests
    # ============================================
    print("\n" + "=" * 60)
    print("📡 تست مستقیم با Requests (بدون Django)")
    print("=" * 60)

    url = "https://www.alphavantage.co/query"
    params = {
        'function': 'CURRENCY_EXCHANGE_RATE',
        'from_currency': 'EUR',
        'to_currency': 'USD',
        'apikey': api_key
    }

    try:
        print(f"\n🔄 ارسال درخواست به Alpha Vantage...")
        print(f"📤 URL: {url}")
        print(f"📤 Params: {params}")

        response = requests.get(url, params=params, timeout=10)

        print(f"\n📥 Status Code: {response.status_code}")
        print(f"📥 Response Headers: {dict(response.headers)}")

        data = response.json()
        print(f"\n📄 Response Body:")
        print(json.dumps(data, indent=2, ensure_ascii=False))

        if 'Realtime Currency Exchange Rate' in data:
            rate = data['Realtime Currency Exchange Rate']
            print("\n✅ قیمت دریافت شد:")
            print(f"   از: {rate.get('1. From_Currency Code')}")
            print(f"   به: {rate.get('3. To_Currency Code')}")
            print(f"   قیمت: {rate.get('5. Exchange Rate')}")
            print(f"   تاریخ: {rate.get('6. Last Refreshed')}")
        elif 'Note' in data:
            print(f"\n⚠️ پیام از Alpha Vantage: {data['Note']}")
        elif 'Information' in data:
            print(f"\nℹ️ اطلاعات: {data['Information']}")
        else:
            print(f"\n❌ پاسخ نامشخص: {data}")

    except requests.exceptions.Timeout:
        print("❌ خطای Timeout - درخواست به Alpha Vantage بیش از ۱۰ ثانیه طول کشید")
    except requests.exceptions.ConnectionError:
        print("❌ خطای Connection - اتصال به Alpha Vantage برقرار نشد")
    except Exception as e:
        print(f"❌ خطای غیرمنتظره: {str(e)}")

    # ============================================
    # ۴- تست محدودیت درخواست (Rate Limit)
    # ============================================
    print("\n" + "=" * 60)
    print("📊 تست محدودیت درخواست (Rate Limit)")
    print("=" * 60)

    print("\n🔄 ارسال ۵ درخواست متوالی (بررسی محدودیت)...")

    for i in range(5):
        try:
            response = requests.get(url, params=params, timeout=10)
            data = response.json()

            if 'Note' in data:
                print(f"⚠️ درخواست {i + 1}: محدودیت - {data['Note'][:50]}...")
                break
            elif 'Realtime Currency Exchange Rate' in data:
                rate = data['Realtime Currency Exchange Rate']
                print(f"✅ درخواست {i + 1}: قیمت {rate.get('5. Exchange Rate')}")
            else:
                print(f"❌ درخواست {i + 1}: پاسخ نامشخص")

        except Exception as e:
            print(f"❌ درخواست {i + 1}: خطا - {str(e)}")

    print("\n" + "=" * 60)
    print("✅ تست به پایان رسید")
    print("=" * 60)


if __name__ == '__main__':
    test_alpha_vantage_direct()