# utils.py
import random
import string
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
import hashlib
import hmac


def generate_verification_code():
    """تولید کد تایید ۶ رقمی"""
    return ''.join([str(random.randint(0, 9)) for _ in range(6)])


def generate_random_password(length=12):
    """تولید رمز عبور تصادفی"""
    characters = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(random.choice(characters) for _ in range(length))


def hash_token(token):
    """هش کردن توکن برای ذخیره امن"""
    return hashlib.sha256(token.encode()).hexdigest()


def verify_hmac(data, signature, secret):
    """تایید امضای HMAC"""
    computed = hmac.new(
        secret.encode('utf-8'),
        data.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(computed, signature)


def send_email_verification(email, code):
    """ارسال ایمیل تایید"""
    subject = 'کد تایید حساب کاربری'
    message = f'''
    سلام

    کد تایید حساب کاربری شما: {code}

    این کد تا ۵ دقیقه اعتبار دارد.

    با تشکر
    تیم پشتیبانی
    '''
    try:
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [email])
        return True
    except Exception as e:
        print(f"Error sending email: {str(e)}")
        return False


def get_client_ip(request):
    """دریافت IP کاربر"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def get_user_agent(request):
    """دریافت User-Agent کاربر"""
    return request.META.get('HTTP_USER_AGENT', '')