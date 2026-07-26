# backend/apps/subscriptions/payments.py

import requests
import json
import logging
from django.conf import settings
from decimal import Decimal

logger = logging.getLogger(__name__)


class ZarinpalPayment:
    """درگاه پرداخت زرین‌پال"""

    def __init__(self):
        self.merchant_id = settings.ZARINPAL_MERCHANT_ID
        self.sandbox = settings.ZARINPAL_SANDBOX
        self.callback_url = settings.ZARINPAL_CALLBACK_URL

        if self.sandbox:
            self.request_url = 'https://sandbox.zarinpal.com/pg/v4/payment/request.json'
            self.verify_url = 'https://sandbox.zarinpal.com/pg/v4/payment/verify.json'
            self.gateway_url = 'https://sandbox.zarinpal.com/pg/StartPay/'
        else:
            self.request_url = 'https://api.zarinpal.com/pg/v4/payment/request.json'
            self.verify_url = 'https://api.zarinpal.com/pg/v4/payment/verify.json'
            self.gateway_url = 'https://www.zarinpal.com/pg/StartPay/'

    def create_payment(self, amount, description, user, subscription):
        try:
            data = {
                'merchant_id': self.merchant_id,
                'amount': int(amount),
                'description': description,
                # ✅ این خط باید subscription_id را به callback_url اضافه کند
                'callback_url': f"{self.callback_url}?subscription_id={subscription.id}",
                'metadata': {
                    'mobile': user.phone_number,
                    'email': user.email or '',
                    'user_id': user.id,
                    'subscription_id': subscription.id
                }
            }

            logger.info(f"Creating payment request: {data}")

            response = requests.post(
                self.request_url,
                json=data,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )

            if response.status_code != 200:
                logger.error(f"Zarinpal HTTP error: {response.status_code} - {response.text[:200]}")
                return {
                    'status': False,
                    'message': f'خطا در ارتباط با درگاه پرداخت (کد {response.status_code})'
                }

            try:
                result = response.json()
            except json.JSONDecodeError as e:
                logger.error(f"Zarinpal JSON decode error: {str(e)} - Response: {response.text[:200]}")
                return {
                    'status': False,
                    'message': 'پاسخ نامعتبر از درگاه پرداخت'
                }

            logger.info(f"Zarinpal response: {result}")

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

        except requests.exceptions.ConnectionError as e:
            logger.error(f"Zarinpal connection error: {str(e)}")
            return {
                'status': False,
                'message': 'خطا در اتصال به درگاه پرداخت. لطفاً اتصال اینترنت را بررسی کنید.'
            }
        except requests.exceptions.Timeout as e:
            logger.error(f"Zarinpal timeout error: {str(e)}")
            return {
                'status': False,
                'message': 'زمان اتصال به درگاه پرداخت به پایان رسید. لطفاً دوباره تلاش کنید.'
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

            logger.info(f"Verifying payment: {data}")

            response = requests.post(
                self.verify_url,
                json=data,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )

            if response.status_code != 200:
                logger.error(f"Zarinpal verify HTTP error: {response.status_code} - {response.text[:200]}")
                return {
                    'status': False,
                    'message': f'خطا در تایید پرداخت (کد {response.status_code})'
                }

            try:
                result = response.json()
            except json.JSONDecodeError as e:
                logger.error(f"Zarinpal verify JSON decode error: {str(e)}")
                return {
                    'status': False,
                    'message': 'پاسخ نامعتبر از درگاه پرداخت'
                }

            logger.info(f"Zarinpal verify response: {result}")

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
        return ZarinpalPayment()

    @staticmethod
    def create_payment(amount, description, user, subscription):
        gateway = PaymentManager.get_payment_gateway()
        return gateway.create_payment(amount, description, user, subscription)

    @staticmethod
    def verify_payment(authority, amount):
        gateway = PaymentManager.get_payment_gateway()
        return gateway.verify_payment(authority, amount)