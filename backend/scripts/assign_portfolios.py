# backend/scripts/assign_portfolios.py

import os
import sys
import django

# ✅ تنظیم مسیر پروژه
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'trading_journal.settings')
django.setup()

from apps.accounts.models import User
from apps.trading.models import Trade, Portfolio
from django.db import transaction

def assign_portfolios():
    print("=" * 60)
    print("🔄 شروع نسبت‌دادن تریدهای بدون پورتفولیو...")
    print("=" * 60)

    total_assigned = 0
    total_users = 0

    for user in User.objects.all():
        trades_without_portfolio = Trade.objects.filter(user=user, portfolio__isnull=True)
        count = trades_without_portfolio.count()

        if count == 0:
            continue

        print(f"\n👤 کاربر: {user.phone_number} - {user.get_full_name()}")
        print(f"   📊 تعداد تریدهای بدون پورتفولیو: {count}")

        default_portfolio = Portfolio.objects.filter(user=user, is_default=True).first()

        if not default_portfolio:
            default_portfolio = Portfolio.objects.create(
                user=user,
                name='پورتفولیو اصلی',
                icon='📊',
                is_default=True,
                is_active=True,
                initial_balance=0
            )
            print(f"   ✅ پورتفولیو پیش‌فرض ساخته شد: {default_portfolio.name} (ID: {default_portfolio.id})")
        else:
            print(f"   ✅ پورتفولیو پیش‌فرض موجود: {default_portfolio.name} (ID: {default_portfolio.id})")

        with transaction.atomic():
            updated = trades_without_portfolio.update(portfolio=default_portfolio)
            total_assigned += updated

        print(f"   ✅ {updated} ترید به پورتفولیو پیش‌فرض نسبت داده شد")
        total_users += 1

    print("\n" + "=" * 60)
    print(f"✅ عملیات کامل شد!")
    print(f"   - تعداد کاربران تحت تأثیر: {total_users}")
    print(f"   - تعداد تریدهای نسبت‌داده‌شده: {total_assigned}")
    print("=" * 60)

if __name__ == "__main__":
    assign_portfolios()