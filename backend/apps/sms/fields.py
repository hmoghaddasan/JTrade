# backend/apps/sms/fields.py
from django.db import models


class IntForeignKey(models.ForeignKey):
    """
    ForeignKey که به صورت int ساخته می‌شود (نه bigint)
    برای سازگاری با جدول users که int است.
    """
    def db_type(self, connection):
        return 'int'