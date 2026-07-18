import requests
import json
from django.conf import settings
from django.urls import reverse
import logging

logger = logging.getLogger(__name__)


class ZarinpalPayment:
    """درگاه پرداخت زرین‌پال"""

    def __init__(self):
        self.merchant_id = settings.ZARINPAL_MERCHANT_ID
        self.sandbox = settings.ZARINPAL_SANDBOX
        self.callback_url = settings.ZARINPAL_CALLBACK_URL

        if self.sandbox:
            self.request_url = 'https://sandbox.zarinpal.com/pg/rest/WebGate/PaymentRequest.json'
            self.verify_url = 'https://sandbox.zarinpal.com/pg/rest/WebGate/PaymentVerification.json'
            self.gateway_url = 'https://sandbox.zarinpal.com/pg/StartPay/'
        else:
            self.request_url = 'https://api.zarinpal.com/pg/v4/payment/request.json'
            self.verify_url = 'https://api.zarinpal.com/pg/v4/payment/verify.json'
            self.gateway_url = 'https://www.zarinpal.com/pg/StartPay/'

    def create_payment(self, amount, description, user, subscription):
        """ایجاد درخواست پرداخت"""
        try:
            data = {
                'merchant_id': self.merchant_id,
                'amount': int(amount),
                'description': description,
                'callback_url': self.callback_url,
                'metadata': {
                    'mobile': user.phone_number,
                    'email': user.email or '',
                    'user_id': user.id,
                    'subscription_id': subscription.id
                }
            }

            response = requests.post(
                self.request_url,
                json=data,
                headers={'Content-Type': 'application/json'}
            )

            result = response.json()

            if result.get('data', {}).get('code') == 100:
                authority = result['data']['authority']
                payment_url = f"{self.gateway_url}{authority}"

                return {
                    'status': True,
                    'authority': authority,
                    'payment_url': payment_url
                }
            else:
                error_message = result.get('errors', {}).get('message', 'خطا در ایجاد پرداخت')
                logger.error(f"Zarinpal payment error: {error_message}")
                return {
                    'status': False,
                    'message': error_message
                }

        except Exception as e:
            logger.error(f"Zarinpal payment exception: {str(e)}")
            return {
                'status': False,
                'message': str(e)
            }

    def verify_payment(self, authority, amount):
        """تایید پرداخت"""
        try:
            data = {
                'merchant_id': self.merchant_id,
                'authority': authority,
                'amount': int(amount)
            }

            response = requests.post(
                self.verify_url,
                json=data,
                headers={'Content-Type': 'application/json'}
            )

            result = response.json()

            if result.get('data', {}).get('code') == 100:
                ref_id = result['data']['ref_id']
                return {
                    'status': True,
                    'ref_id': ref_id,
                    'message': 'پرداخت با موفقیت تایید شد'
                }
            else:
                error_message = result.get('errors', {}).get('message', 'خطا در تایید پرداخت')
                return {
                    'status': False,
                    'message': error_message
                }

        except Exception as e:
            logger.error(f"Zarinpal verify exception: {str(e)}")
            return {
                'status': False,
                'message': str(e)
            }


class PaymentManager:
    """مدیریت پرداخت‌ها"""

    @staticmethod
    def get_payment_gateway():
        """دریافت درگاه پرداخت فعال"""
        # در آینده می‌توان درگاه‌های دیگر را اضافه کرد
        return ZarinpalPayment()

    @staticmethod
    def create_payment(amount, description, user, subscription):
        """ایجاد پرداخت"""
        gateway = PaymentManager.get_payment_gateway()
        return gateway.create_payment(amount, description, user, subscription)

    @staticmethod
    def verify_payment(authority, amount):
        """تایید پرداخت"""
        gateway = PaymentManager.get_payment_gateway()
        return gateway.verify_payment(authority, amount)