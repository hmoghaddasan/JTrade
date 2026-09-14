# backend/trading_journal/celery.py

import os
from celery import Celery
from celery.schedules import crontab

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'trading_journal.settings')

app = Celery('trading_journal')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django app configs.
app.autodiscover_tasks()


# ============================================
# ✅ Celery Beat Schedule
# ============================================
app.conf.beat_schedule = {

    # ============================================
    # 📱 سیستم پیامک (SMS)
    # ============================================
    'check-pending-sms-status': {
        'task': 'apps.sms.tasks.check_pending_status',
        'schedule': crontab(minute='*/5'),  # هر ۵ دقیقه
    },
    'fetch-sms-inbox': {
        'task': 'apps.sms.tasks.fetch_inbox',
        'schedule': crontab(minute='*/5'),  # هر ۵ دقیقه
    },

    # ============================================
    # 💳 سیستم پرداخت کارت به کارت
    # ============================================
    'expire-payment-requests': {
        'task': 'subscriptions.expire_payment_requests',
        'schedule': crontab(minute='*/5'),  # هر ۵ دقیقه
    },
    'send-payment-reminders': {
        'task': 'subscriptions.send_payment_reminders',
        'schedule': crontab(minute='*/5'),  # هر ۵ دقیقه
    },
}


# ============================================
# ✅ تنظیمات اضافی (Timezone)
# ============================================
app.conf.timezone = 'Asia/Tehran'
app.conf.enable_utc = True


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')