# apps/accounts/apps.py

from django.apps import AppConfig

class AccountsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.accounts'
    verbose_name = 'مدیریت کاربران'

    def ready(self):
        """
        بارگذاری سیگنال‌ها هنگام راه‌اندازی اپلیکیشن
        این متد باعث می‌شود سیگنال‌های موجود در signals.py فعال شوند
        """
        import apps.accounts.signals