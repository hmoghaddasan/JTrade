from rest_framework import status, generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.db import transaction
from django.conf import settings
import logging

from .models import SubscriptionPlan, UserSubscription, DiscountCode, Transaction, SMSLog
from .serializers import (
    SubscriptionPlanSerializer,
    UserSubscriptionSerializer,
    DiscountCodeSerializer,
    PurchaseSubscriptionSerializer,
    VerifyPaymentSerializer,
    ValidateDiscountSerializer,
    ExtendSubscriptionSerializer,
    TransactionSerializer,
    SMSLogSerializer,
    CreateTrialSubscriptionSerializer
)
from .payments import ZarinpalPayment
from .sms import send_purchase_confirmation, send_admin_purchase_notification

logger = logging.getLogger(__name__)


class SubscriptionPlanListView(generics.ListAPIView):
    """لیست پلن‌های اشتراک"""
    permission_classes = [permissions.AllowAny]
    queryset = SubscriptionPlan.objects.filter(is_active=True)
    serializer_class = SubscriptionPlanSerializer


class SubscriptionPlanDetailView(generics.RetrieveAPIView):
    """جزئیات یک پلن"""
    permission_classes = [permissions.AllowAny]
    queryset = SubscriptionPlan.objects.filter(is_active=True)
    serializer_class = SubscriptionPlanSerializer


class CurrentSubscriptionView(APIView):
    """دریافت اشتراک فعلی کاربر"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        subscription = request.user.get_active_subscription()
        if subscription:
            serializer = UserSubscriptionSerializer(subscription)
            return Response({
                'has_subscription': True,
                'data': serializer.data,
                'remaining_days': subscription.get_remaining_days(),
                'remaining_trades': request.user.get_remaining_trades()
            })
        return Response({
            'has_subscription': False,
            'message': 'اشتراک فعالی ندارید'
        })


class SubscriptionHistoryView(APIView):
    """تاریخچه اشتراک‌های کاربر"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        subscriptions = request.user.user_subscriptions.all().order_by('-created_at')
        serializer = UserSubscriptionSerializer(subscriptions, many=True)
        return Response(serializer.data)


class PurchaseSubscriptionView(APIView):
    """خرید اشتراک جدید"""
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        serializer = PurchaseSubscriptionSerializer(data=request.data)
        if serializer.is_valid():
            plan_id = serializer.validated_data['plan_id']
            discount_code = serializer.validated_data.get('discount_code')

            try:
                plan = SubscriptionPlan.objects.get(id=plan_id, is_active=True)
            except SubscriptionPlan.DoesNotExist:
                return Response(
                    {'error': 'پلن انتخاب شده یافت نشد'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # بررسی کد تخفیف
            discount = None
            if discount_code:
                try:
                    discount = DiscountCode.objects.get(
                        code=discount_code,
                        is_active=True
                    )
                    if not discount.is_valid():
                        return Response(
                            {'error': 'کد تخفیف منقضی شده است'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    if discount.plan and discount.plan.id != plan_id:
                        return Response(
                            {'error': 'این کد تخفیف برای این پلن قابل استفاده نیست'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                except DiscountCode.DoesNotExist:
                    return Response(
                        {'error': 'کد تخفیف نامعتبر است'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # محاسبه قیمت
            price = plan.price
            vat = price * 0.10  # 10% مالیات
            total = price + vat

            if discount:
                discount_amount = (total * discount.discount_percent) / 100
                total = total - discount_amount

            # ایجاد اشتراک موقت
            subscription = UserSubscription.objects.create(
                user=request.user,
                plan=plan,
                start_date=timezone.now(),
                end_date=timezone.now() + timezone.timedelta(days=plan.duration_days),
                is_active=False,
                trades_limit=plan.monthly_trades_limit,
                is_trial=False,
                payment_status='pending',
                amount_paid=total,
                discount_code=discount
            )

            # ایجاد تراکنش
            transaction_obj = Transaction.objects.create(
                user=request.user,
                subscription=subscription,
                amount=price,
                vat_amount=vat,
                total_amount=total,
                payment_method='zarinpal',
                payment_status='pending',
                description=f'خرید اشتراک {plan.plan_name}'
            )

            # پرداخت با زرین‌پال
            payment = ZarinpalPayment()
            result = payment.create_payment(
                amount=total,
                description=f'خرید اشتراک {plan.plan_name}',
                user=request.user,
                subscription=subscription
            )

            if result['status']:
                # ذخیره مرجع پرداخت
                subscription.payment_reference = result['authority']
                subscription.save()
                transaction_obj.payment_reference = result['authority']
                transaction_obj.save()

                return Response({
                    'payment_url': result['payment_url'],
                    'authority': result['authority'],
                    'subscription_id': subscription.id,
                    'transaction_id': transaction_obj.id,
                    'amount': float(total),
                    'plan_name': plan.plan_name,
                    'discount_applied': discount is not None,
                    'discount_percent': float(discount.discount_percent) if discount else 0
                })
            else:
                subscription.delete()
                transaction_obj.delete()
                return Response(
                    {'error': result.get('message', 'خطا در ایجاد پرداخت')},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class VerifyPaymentView(APIView):
    """تایید پرداخت زرین‌پال"""
    permission_classes = [permissions.AllowAny]

    @transaction.atomic
    def post(self, request):
        serializer = VerifyPaymentSerializer(data=request.data)
        if serializer.is_valid():
            authority = serializer.validated_data['authority']
            status_param = serializer.validated_data['status']

            # یافتن اشتراک
            try:
                subscription = UserSubscription.objects.get(
                    payment_reference=authority,
                    payment_status='pending'
                )
                transaction_obj = Transaction.objects.get(
                    payment_reference=authority,
                    payment_status='pending'
                )
            except (UserSubscription.DoesNotExist, Transaction.DoesNotExist):
                return Response(
                    {'error': 'پرداخت یافت نشد'},
                    status=status.HTTP_404_NOT_FOUND
                )

            if status_param == 'OK':
                # تایید پرداخت با زرین‌پال
                payment = ZarinpalPayment()
                result = payment.verify_payment(
                    authority=authority,
                    amount=subscription.amount_paid
                )

                if result['status']:
                    # فعال‌سازی اشتراک
                    subscription.is_active = True
                    subscription.payment_status = 'paid'
                    subscription.start_date = timezone.now()
                    subscription.end_date = timezone.now() + timezone.timedelta(
                        days=subscription.plan.duration_days
                    )
                    subscription.save()

                    # به‌روزرسانی تراکنش
                    transaction_obj.payment_status = 'paid'
                    transaction_obj.save()

                    # به‌روزرسانی کد تخفیف
                    if subscription.discount_code:
                        discount = subscription.discount_code
                        discount.used_count += 1
                        discount.save()

                    # ارسال پیامک تایید
                    try:
                        send_purchase_confirmation(
                            subscription.user.phone_number,
                            subscription.plan.plan_name,
                            subscription.end_date
                        )
                        send_admin_purchase_notification(
                            subscription.user,
                            subscription.plan,
                            subscription.amount_paid
                        )
                    except Exception as e:
                        logger.error(f"Error sending SMS: {str(e)}")

                    return Response({
                        'status': 'success',
                        'message': 'پرداخت با موفقیت انجام شد',
                        'subscription': UserSubscriptionSerializer(subscription).data,
                        'remaining_days': subscription.get_remaining_days()
                    })
                else:
                    subscription.payment_status = 'failed'
                    subscription.save()
                    transaction_obj.payment_status = 'failed'
                    transaction_obj.save()
                    return Response({
                        'status': 'failed',
                        'error': result.get('message', 'خطا در تایید پرداخت')
                    }, status=status.HTTP_400_BAD_REQUEST)
            else:
                subscription.payment_status = 'failed'
                subscription.save()
                transaction_obj.payment_status = 'failed'
                transaction_obj.save()
                return Response({
                    'status': 'cancelled',
                    'message': 'پرداخت توسط کاربر لغو شد'
                }, status=status.HTTP_400_BAD_REQUEST)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ValidateDiscountView(APIView):
    """اعتبارسنجی کد تخفیف"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ValidateDiscountSerializer(data=request.data)
        if serializer.is_valid():
            code = serializer.validated_data['code']
            plan_id = serializer.validated_data.get('plan_id')

            try:
                discount = DiscountCode.objects.get(
                    code=code,
                    is_active=True
                )

                if not discount.is_valid():
                    return Response({
                        'valid': False,
                        'error': 'کد تخفیف منقضی شده است'
                    })

                if plan_id and discount.plan_id and discount.plan_id != plan_id:
                    return Response({
                        'valid': False,
                        'error': 'این کد تخفیف برای این پلن قابل استفاده نیست'
                    })

                # محاسبه تخفیف
                if plan_id:
                    try:
                        plan = SubscriptionPlan.objects.get(id=plan_id)
                        price = plan.price
                        vat = price * 0.10
                        total = price + vat
                        discount_amount = (total * discount.discount_percent) / 100
                        final_price = total - discount_amount
                    except SubscriptionPlan.DoesNotExist:
                        final_price = None
                else:
                    final_price = None

                return Response({
                    'valid': True,
                    'discount_percent': float(discount.discount_percent),
                    'message': f'{discount.discount_percent}% تخفیف',
                    'final_price': float(final_price) if final_price else None
                })

            except DiscountCode.DoesNotExist:
                return Response({
                    'valid': False,
                    'error': 'کد تخفیف نامعتبر است'
                })

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SubscriptionStatusView(APIView):
    """وضعیت کلی اشتراک کاربر"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        subscription = request.user.get_active_subscription()

        if subscription:
            return Response({
                'has_active_subscription': True,
                'plan_name': subscription.plan.plan_name,
                'plan_type': subscription.plan.plan_type,
                'start_date': subscription.start_date,
                'end_date': subscription.end_date,
                'remaining_days': subscription.get_remaining_days(),
                'trades_used': subscription.trades_used,
                'trades_limit': subscription.trades_limit,
                'remaining_trades': subscription.trades_limit - subscription.trades_used,
                'is_trial': subscription.is_trial,
                'payment_status': subscription.payment_status,
                'discount_percent': subscription.discount_code.discount_percent if subscription.discount_code else 0
            })
        else:
            # بررسی اشتراک منقضی شده
            expired = request.user.user_subscriptions.filter(
                is_active=True,
                end_date__lte=timezone.now()
            ).order_by('-end_date').first()

            return Response({
                'has_active_subscription': False,
                'expired': expired is not None,
                'expired_date': expired.end_date if expired else None,
                'message': 'اشتراک فعالی ندارید'
            })


class ExtendSubscriptionView(APIView):
    """تمدید اشتراک فعلی"""
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        serializer = ExtendSubscriptionSerializer(data=request.data)
        if serializer.is_valid():
            current_subscription = request.user.get_active_subscription()

            if not current_subscription:
                # اگر اشتراک فعال نیست، خرید جدید
                return Response(
                    {'error': 'اشتراک فعالی برای تمدید وجود ندارد. لطفاً اشتراک جدید خریداری کنید.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            plan_id = serializer.validated_data.get('plan_id')
            discount_code = serializer.validated_data.get('discount_code')

            # اگر پلن جدید انتخاب شده، از آن استفاده کن
            if plan_id:
                try:
                    plan = SubscriptionPlan.objects.get(id=plan_id, is_active=True)
                except SubscriptionPlan.DoesNotExist:
                    return Response(
                        {'error': 'پلن انتخاب شده یافت نشد'},
                        status=status.HTTP_404_NOT_FOUND
                    )
            else:
                plan = current_subscription.plan

            # بررسی کد تخفیف
            discount = None
            if discount_code:
                try:
                    discount = DiscountCode.objects.get(
                        code=discount_code,
                        is_active=True
                    )
                    if not discount.is_valid():
                        return Response(
                            {'error': 'کد تخفیف منقضی شده است'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    if discount.plan and discount.plan.id != plan.id:
                        return Response(
                            {'error': 'این کد تخفیف برای این پلن قابل استفاده نیست'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                except DiscountCode.DoesNotExist:
                    return Response(
                        {'error': 'کد تخفیف نامعتبر است'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # محاسبه قیمت
            price = plan.price
            vat = price * 0.10
            total = price + vat

            if discount:
                discount_amount = (total * discount.discount_percent) / 100
                total = total - discount_amount

            # ایجاد اشتراک جدید
            new_subscription = UserSubscription.objects.create(
                user=request.user,
                plan=plan,
                start_date=timezone.now(),
                end_date=timezone.now() + timezone.timedelta(days=plan.duration_days),
                is_active=False,
                trades_limit=plan.monthly_trades_limit,
                is_trial=False,
                payment_status='pending',
                amount_paid=total,
                discount_code=discount
            )

            # ایجاد تراکنش
            transaction_obj = Transaction.objects.create(
                user=request.user,
                subscription=new_subscription,
                amount=price,
                vat_amount=vat,
                total_amount=total,
                payment_method='zarinpal',
                payment_status='pending',
                description=f'تمدید اشتراک {plan.plan_name}'
            )

            # پرداخت
            payment = ZarinpalPayment()
            result = payment.create_payment(
                amount=total,
                description=f'تمدید اشتراک {plan.plan_name}',
                user=request.user,
                subscription=new_subscription
            )

            if result['status']:
                new_subscription.payment_reference = result['authority']
                new_subscription.save()
                transaction_obj.payment_reference = result['authority']
                transaction_obj.save()

                return Response({
                    'payment_url': result['payment_url'],
                    'authority': result['authority'],
                    'subscription_id': new_subscription.id,
                    'transaction_id': transaction_obj.id,
                    'amount': float(total),
                    'plan_name': plan.plan_name,
                    'discount_applied': discount is not None,
                    'discount_percent': float(discount.discount_percent) if discount else 0
                })
            else:
                new_subscription.delete()
                transaction_obj.delete()
                return Response(
                    {'error': result.get('message', 'خطا در ایجاد پرداخت')},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CreateTrialSubscriptionView(APIView):
    """ایجاد اشتراک آزمایشی (داخلی)"""
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        serializer = CreateTrialSubscriptionSerializer(data=request.data)
        if serializer.is_valid():
            subscription = serializer.save()
            return Response({
                'message': 'اشتراک آزمایشی با موفقیت ایجاد شد',
                'subscription': UserSubscriptionSerializer(subscription).data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)