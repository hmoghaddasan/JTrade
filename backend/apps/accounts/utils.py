# backend/apps/accounts/utils.py

import os
import json
from django.conf import settings


def get_setting(key, default=None):
    """
    دریافت تنظیم از دیتابیس با fallback به settings.py و env
    اولویت: دیتابیس > settings.py > env
    """
    try:
        from .models import SystemSetting
        value = SystemSetting.get_setting(key)
        if value is not None:
            return value
    except Exception:
        pass

    # Fallback به settings.py
    try:
        return getattr(settings, key.upper(), default)
    except Exception:
        pass

    # Fallback به env
    return os.environ.get(key.upper(), default)


def get_int_setting(key, default=0):
    """دریافت تنظیم عددی"""
    try:
        return int(get_setting(key, default))
    except (ValueError, TypeError):
        return default


def get_bool_setting(key, default=False):
    """دریافت تنظیم بولی"""
    value = get_setting(key, default)
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.lower() in ('true', '1', 'yes', 'on')
    return bool(value)


def get_float_setting(key, default=0.0):
    """دریافت تنظیم اعشاری"""
    try:
        return float(get_setting(key, default))
    except (ValueError, TypeError):
        return default


def get_json_setting(key, default=None):
    """دریافت تنظیم JSON"""
    try:
        value = get_setting(key, default)
        if isinstance(value, (dict, list)):
            return value
        if isinstance(value, str):
            return json.loads(value)
        return default
    except (json.JSONDecodeError, TypeError):
        return default


def reload_settings():
    """
    بارگذاری مجدد تنظیمات از دیتابیس
    (برای استفاده در صورت تغییر تنظیمات بدون ریستارت)
    """
    from .models import SystemSetting
    settings_dict = {}
    for setting in SystemSetting.objects.all():
        settings_dict[setting.setting_key] = setting.setting_value
    return settings_dict