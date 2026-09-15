# backend/trading_journal/celery.py
"""
تنظیمات Celery برای پروژه JTrade (Trading Journal)

نکات مهم:
1. تمام تنظیمات از settings.py خوانده می‌شوند (namespace='CELERY')
2. ماژول‌های task با include اعلام شده‌اند
3. timezone = 'Asia/Tehran' است
4. این فایل هم روی لوکال (Windows) و هم روی سرور (Linux/Docker) کار می‌کند
"""

import os
import django
from celery import Celery

# ============================================
# تنظیم Django settings module
# ============================================
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'trading_journal.settings')


# ============================================
# ✅ لیست ماژول‌های task
# ============================================
# این‌ها را در پارامتر include قرار می‌دهیم تا Celery خودش
# بعد از راه‌اندازی Django، آن‌ها را import کند.
TASK_MODULES = [
    'apps.sms.tasks',
    'apps.subscriptions.tasks',
    'apps.accounts.tasks',
    'apps.trading.tasks',
]


# ============================================
# ساخت نمونه Celery با include
# ============================================
# ✅ نکته کلیدی: استفاده از include به‌جای importlib
# این کار از خطای "Apps aren't loaded yet" جلوگیری می‌کند.
app = Celery(
    'trading_journal',
    include=TASK_MODULES,
)

# ============================================
# بارگذاری تنظیمات از settings.py
# ============================================
app.config_from_object('django.conf:settings', namespace='CELERY')

# ============================================
# ✅ کشف خودکار تسک‌ها (روش استاندارد)
# ============================================
app.autodiscover_tasks()


# ============================================
# ✅ تنظیمات اضافی
# ============================================
app.conf.update(
    # Timezone
    timezone='Asia/Tehran',
    enable_utc=False,

    # Celery 6 Compatibility
    broker_connection_retry_on_startup=True,

    # Task Processing
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_time_limit=600,
    task_soft_time_limit=540,
    result_expires=86400,

    # Queues
    task_default_queue='celery',
    task_default_exchange='celery',
    task_default_routing_key='celery',

    # Worker Logging
    worker_hijack_root_logger=False,
    worker_redirect_stdouts_level='INFO',

    # Beat Scheduler
    beat_scheduler='celery.beat:PersistentScheduler',
)


# ============================================
# ✅ تسک دیباگ
# ============================================
@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')