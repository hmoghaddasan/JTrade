# validators.py
import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _


def validate_iran_phone_number(value):
    """اعتبارسنجی شماره تلفن ایران"""
    pattern = r'^09\d{9}$'
    if not re.match(pattern, value):
        raise ValidationError(
            _('شماره تلفن باید با 09 شروع شده و 11 رقم باشد'),
            code='invalid_phone'
        )
    return value


def validate_password_strength(value):
    """اعتبارسنجی قدرت رمز عبور"""
    if len(value) < 8:
        raise ValidationError(
            _('رمز عبور باید حداقل ۸ کاراکتر باشد'),
            code='password_too_short'
        )

    if not re.search(r'[A-Z]', value):
        raise ValidationError(
            _('رمز عبور باید حداقل یک حرف بزرگ داشته باشد'),
            code='password_no_uppercase'
        )

    if not re.search(r'[a-z]', value):
        raise ValidationError(
            _('رمز عبور باید حداقل یک حرف کوچک داشته باشد'),
            code='password_no_lowercase'
        )

    if not re.search(r'\d', value):
        raise ValidationError(
            _('رمز عبور باید حداقل یک عدد داشته باشد'),
            code='password_no_digit'
        )

    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', value):
        raise ValidationError(
            _('رمز عبور باید حداقل یک کاراکتر ویژه داشته باشد'),
            code='password_no_special'
        )

    return value