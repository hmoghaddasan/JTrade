# backend/apps/sms/apps.py

from django.apps import AppConfig


class SmsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.sms'
    label = 'sms'                     # ← این خط جدید
    verbose_name = 'سیستم پیامک'