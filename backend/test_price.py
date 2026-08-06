# backend/test_price.py
import os
import django

# تنظیمات جنگو را بارگذاری کن
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'trading_journal.settings')
django.setup()

from apps.trading.ai_service import AIService

if __name__ == "__main__":
    success, msg, price = AIService.test_connection('EURUSD')
    print(msg)
    if success:
        print(f"قیمت: {price}")