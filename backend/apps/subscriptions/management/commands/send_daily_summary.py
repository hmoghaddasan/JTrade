from django.core.management.base import BaseCommand
from apps.subscriptions.tasks import send_daily_sales_summary


class Command(BaseCommand):
    help = 'ارسال گزارش فروش روزانه به ادمین'

    def handle(self, *args, **options):
        result = send_daily_sales_summary()
        self.stdout.write(self.style.SUCCESS(f'Result: {result}'))