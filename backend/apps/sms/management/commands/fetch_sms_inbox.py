# backend/apps/sms/management/commands/fetch_sms_inbox.py
"""
دریافت پیام‌های جدید از provider
اجرا در production (cron):
    */5 * * * * cd /path/to/backend && python manage.py fetch_sms_inbox
"""

from django.core.management.base import BaseCommand
from apps.sms.services import SmsService


class Command(BaseCommand):
    help = 'دریافت پیام‌های جدید از provider فعال'

    def handle(self, *args, **options):
        self.stdout.write('📥 دریافت پیام‌های جدید...')

        try:
            service = SmsService()
            result = service.fetch_inbox()
            self.stdout.write(self.style.SUCCESS(
                f'✅ {result.get("new", 0)} پیام جدید از {result.get("total", 0)} پیام'
            ))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ خطا: {e}'))