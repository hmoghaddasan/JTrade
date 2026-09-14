# backend/apps/sms/management/commands/check_sms_status.py
"""
بررسی وضعیت پیام‌های pending
اجرا در production (cron):
    */5 * * * * cd /path/to/backend && python manage.py check_sms_status
اجرا در ویندوز (Task Scheduler): همین دستور
"""

from django.core.management.base import BaseCommand
from apps.sms.services import SmsService


class Command(BaseCommand):
    help = 'بررسی وضعیت پیام‌های pending و به‌روزرسانی آن‌ها'

    def add_arguments(self, parser):
        parser.add_argument(
            '--batch-size',
            type=int,
            default=50,
            help='تعداد پیام‌ها در هر اجرا (پیش‌فرض: 50)',
        )

    def handle(self, *args, **options):
        batch_size = options['batch_size']
        self.stdout.write(f'🔍 بررسی وضعیت {batch_size} پیام pending...')

        try:
            service = SmsService()
            result = service.check_pending_status(batch_size=batch_size)
            self.stdout.write(self.style.SUCCESS(
                f'✅ نتیجه: بررسی‌شده={result.get("checked", 0)}, '
                f'تحویل‌شده={result.get("delivered", 0)}, '
                f'ناموفق={result.get("failed", 0)}'
            ))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ خطا: {e}'))