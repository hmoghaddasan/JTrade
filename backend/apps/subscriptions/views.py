# backend/apps/subscriptions/views.py

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from datetime import timedelta
from django.db import transaction
from .models import SubscriptionPlan, UserSubscription, DiscountCode
from .serializers import SubscriptionPlanSerializer, UserSubscriptionSerializer
from .payments import PaymentManager
from .sms import send_purchase_confirmation, send_admin_notification
import logging

logger = logging.getLogger(__name__)


# ============================================
# پلن‌های اشتراک
# ============================================
class SubscriptionPlanListView(generics.ListAPIView):
    queryset = SubscriptionPlan.objects.filter(is_active=True)
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [AllowAny]


class SubscriptionPlanDetailView(generics.RetrieveAPIView):
    queryset = SubscriptionPlan.objects.filter(is_active=True)
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [AllowAny]


# ============================================
# اشتراک کاربر
# ============================================
class CurrentSubscriptionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if user.is_admin:
            return Response({
                'plan_name': 'ادمین',
                'plan_type': 'admin',
                'is_admin': True,
                'message': 'کاربر ادمین - دسترسی نامحدود'
            })

        subscription = UserSubscription.objects.filter(
            user=request.user,
            is_active=True
        ).first()

        if subscription:
            serializer = UserSubscriptionSerializer(subscription)
            return Response(serializer.data)
        return Response(
            {'message': 'هیچ اشتراک فعالی یافت نشد'},
            status=status.HTTP_404_NOT_FOUND
        )


class SubscriptionHistoryView(generics.ListAPIView):
    serializer_class = UserSubscriptionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserSubscription.objects.filter(
            user=self.request.user
        ).order_by('-created_at')


# ============================================
# خرید اشتراک
# ============================================
class PurchaseSubscriptionView(APIView):
    """خرید اشتراک جدید"""
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        plan_id = request.data.get('plan_id')
        discount_code = request.data.get('discount_code', '')

        # اعتبارسنجی پلن
        try:
            plan = SubscriptionPlan.objects.get(id=plan_id, is_active=True)
        except SubscriptionPlan.DoesNotExist:
            return Response(
                {'error': 'پلن انتخابی یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )

        # اعتبارسنجی کد تخفیف
        discount = None
        discount_percent = 0
        if discount_code:
            try:
                discount = DiscountCode.objects.get(code=discount_code, is_active=True)
                if not discount.is_valid():
                    return Response(
                        {'error': 'کد تخفیف نامعتبر است'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                discount_percent = float(discount.discount_percent)
            except DiscountCode.DoesNotExist:
                return Response(
                    {'error': 'کد تخفیف یافت نشد'},
                    status=status.HTTP_404_NOT_FOUND
                )

        # محاسبه قیمت
        vat_percent = 10
        price = float(plan.price)
        if discount:
            price = price * (1 - discount_percent / 100)

        vat_amount = price * (vat_percent / 100)
        total_amount = price + vat_amount

        # ایجاد اشتراک
        start_date = timezone.now()
        end_date = start_date + timedelta(days=plan.duration_days)

        subscription = UserSubscription.objects.create(
            user=request.user,
            plan=plan,
            discount_code=discount,
            start_date=start_date,
            end_date=end_date,
            is_active=False,
            trades_limit=plan.monthly_trades_limit,
            ai_consultations_limit=plan.monthly_ai_consultations_limit,  # ✅ اضافه شد
            is_trial=False,
            payment_status='pending',
            amount_paid=total_amount
        )

        # ایجاد پرداخت
        description = f"خرید اشتراک {plan.plan_name} - {plan.duration_days} روزه"
        payment = PaymentManager.create_payment(
            amount=total_amount,
            description=description,
            user=request.user,
            subscription=subscription
        )

        if payment.get('status'):
            return Response({
                'success': True,
                'subscription_id': subscription.id,
                'authority': payment.get('authority'),
                'payment_url': payment.get('payment_url'),
                'amount': total_amount,
                'vat': vat_amount,
                'price': price,
                'message': 'درخواست پرداخت ایجاد شد'
            })
        else:
            subscription.delete()
            return Response({
                'success': False,
                'error': payment.get('message', 'خطا در ایجاد پرداخت')
            }, status=status.HTTP_400_BAD_REQUEST)


# ============================================
# تایید پرداخت
# ============================================
class VerifyPaymentView(APIView):
    """تایید پرداخت"""
    permission_classes = [AllowAny]

    @transaction.atomic
    def get(self, request):
        print("=" * 60)
        print("🔍 VerifyPaymentView called!")
        print(f"📥 Full URL: {request.build_absolute_uri()}")
        print(f"📥 Query params: {dict(request.query_params)}")
        print("=" * 60)

        authority = request.query_params.get('Authority')
        status_param = request.query_params.get('Status')
        subscription_id = request.query_params.get('subscription_id')

        if status_param != 'OK':
            return Response({
                'success': False,
                'message': 'پرداخت توسط کاربر لغو شد'
            }, status=status.HTTP_400_BAD_REQUEST)

        if not authority:
            return Response({
                'success': False,
                'message': 'کد Authority یافت نشد'
            }, status=status.HTTP_400_BAD_REQUEST)

        if not subscription_id:
            return Response({
                'success': False,
                'message': 'شناسه اشتراک یافت نشد'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            subscription = UserSubscription.objects.get(
                id=subscription_id,
                payment_status='pending'
            )
        except UserSubscription.DoesNotExist:
            return Response({
                'success': False,
                'message': 'اشتراک یافت نشد'
            }, status=status.HTTP_404_NOT_FOUND)

        verification = PaymentManager.verify_payment(
            authority=authority,
            amount=subscription.amount_paid
        )

        if verification.get('status'):
            subscription.is_active = True
            subscription.payment_status = 'paid'
            subscription.payment_reference = verification.get('ref_id')
            subscription.save()

            if subscription.discount_code:
                subscription.discount_code.used_count += 1
                subscription.discount_code.save()

            try:
                send_purchase_confirmation(
                    subscription.user.phone_number,
                    subscription.plan.plan_name,
                    subscription.end_date
                )
            except Exception as e:
                logger.error(f"Error sending purchase confirmation SMS: {str(e)}")

            try:
                admin_message = (
                    f"🛒 خرید جدید\n"
                    f"کاربر: {subscription.user.get_full_name()} ({subscription.user.phone_number})\n"
                    f"پلن: {subscription.plan.plan_name}\n"
                    f"مبلغ: {subscription.amount_paid:,.0f} تومان\n"
                    f"تاریخ: {timezone.now().strftime('%Y/%m/%d %H:%M')}"
                )
                send_admin_notification(admin_message)
            except Exception as e:
                logger.error(f"Error sending admin notification: {str(e)}")

            return Response({
                'success': True,
                'message': 'پرداخت با موفقیت تایید شد',
                'ref_id': verification.get('ref_id')
            })
        else:
            subscription.payment_status = 'failed'
            subscription.save()
            return Response({
                'success': False,
                'message': verification.get('message', 'خطا در تایید پرداخت')
            }, status=status.HTTP_400_BAD_REQUEST)


# ============================================
# کد تخفیف
# ============================================
class ValidateDiscountView(APIView):
    """اعتبارسنجی کد تخفیف"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        code = request.data.get('code')
        plan_id = request.data.get('plan_id')

        if not code:
            return Response({
                'success': False,
                'error': 'کد تخفیف را وارد کنید'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            discount = DiscountCode.objects.get(code=code, is_active=True)
            if not discount.is_valid():
                return Response({
                    'success': False,
                    'error': 'کد تخفیف منقضی شده یا استفاده شده است'
                }, status=status.HTTP_400_BAD_REQUEST)

            if discount.plan and plan_id:
                try:
                    plan = SubscriptionPlan.objects.get(id=plan_id)
                    if discount.plan != plan:
                        return Response({
                            'success': False,
                            'error': 'این کد تخفیف برای این پلن معتبر نیست'
                        }, status=status.HTTP_400_BAD_REQUEST)
                except SubscriptionPlan.DoesNotExist:
                    pass

            return Response({
                'success': True,
                'discount_percent': float(discount.discount_percent),
                'message': f'کد تخفیف {discount.discount_percent}% معتبر است'
            })

        except DiscountCode.DoesNotExist:
            return Response({
                'success': False,
                'error': 'کد تخفیف یافت نشد'
            }, status=status.HTTP_404_NOT_FOUND)


# ============================================
# وضعیت اشتراک (اصلاح‌شده)
# ============================================
class SubscriptionStatusView(APIView):
    """دریافت وضعیت اشتراک کاربر"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # اگر کاربر ادمین است
        if user.is_admin:
            return Response({
                'has_subscription': True,
                'is_active': True,
                'is_expired': False,
                'is_near_expiry': False,
                'remaining_days': 36500,
                'remaining_trades': 99999,
                'remaining_ai_consultations': 99999,   # ✅ اضافه شد
                'ai_consultations_limit': 99999,       # ✅ اضافه شد
                'ai_consultations_used': 0,            # ✅ اضافه شد
                'plan_name': 'ادمین',
                'plan_type': 'admin',
                'start_date': timezone.now(),
                'end_date': timezone.now() + timezone.timedelta(days=36500),
                'trades_limit': 99999,
                'trades_used': 0,
                'is_trial': False,
                'payment_status': 'paid',
                'is_admin': True,
                'message': 'کاربر ادمین - دسترسی نامحدود'
            })

        subscription = UserSubscription.objects.filter(
            user=user,
            is_active=True
        ).first()

        if not subscription:
            return Response({
                'has_subscription': False,
                'is_active': False,
                'message': 'هیچ اشتراک فعالی یافت نشد'
            })

        remaining_days = subscription.get_remaining_days()
        remaining_trades = subscription.get_remaining_trades()
        remaining_ai = subscription.get_remaining_ai_consultations()

        is_expired = subscription.end_date < timezone.now()
        is_active = subscription.is_active and not is_expired

        warning_days = 3
        is_near_expiry = remaining_days <= warning_days and remaining_days > 0

        return Response({
            'has_subscription': True,
            'is_active': is_active,
            'is_expired': is_expired,
            'is_near_expiry': is_near_expiry,
            'remaining_days': remaining_days,
            'remaining_trades': remaining_trades,
            'remaining_ai_consultations': remaining_ai,   # ✅ اضافه شد
            'ai_consultations_limit': subscription.ai_consultations_limit,  # ✅ اضافه شد
            'ai_consultations_used': subscription.ai_consultations_used,    # ✅ اضافه شد
            'plan_name': subscription.plan.plan_name,
            'plan_type': subscription.plan.plan_type,
            'start_date': subscription.start_date,
            'end_date': subscription.end_date,
            'trades_limit': subscription.trades_limit,
            'trades_used': subscription.trades_used,
            'is_trial': subscription.is_trial,
            'payment_status': subscription.payment_status,
            'is_admin': False
        })


# ============================================
# تمدید اشتراک
# ============================================
class ExtendSubscriptionView(APIView):
    """تمدید اشتراک"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        plan_id = request.data.get('plan_id')
        discount_code = request.data.get('discount_code', '')

        try:
            plan = SubscriptionPlan.objects.get(id=plan_id, is_active=True)
        except SubscriptionPlan.DoesNotExist:
            return Response(
                {'error': 'پلن انتخابی یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )

        vat_percent = 10
        price = float(plan.price)

        discount_percent = 0
        if discount_code:
            try:
                discount = DiscountCode.objects.get(code=discount_code, is_active=True)
                if discount.is_valid():
                    discount_percent = float(discount.discount_percent)
                    price = price * (1 - discount_percent / 100)
            except DiscountCode.DoesNotExist:
                pass

        vat_amount = price * (vat_percent / 100)
        total_amount = price + vat_amount

        return Response({
            'success': True,
            'payment_data': {
                'plan': plan.plan_name,
                'plan_id': plan.id,
                'price': float(plan.price),
                'discounted_price': price,
                'vat': vat_amount,
                'total': total_amount,
                'duration_days': plan.duration_days,
                'trades_limit': plan.monthly_trades_limit,
                'ai_consultations_limit': plan.monthly_ai_consultations_limit,  # ✅ اضافه شد
                'discount_percent': discount_percent
            },
            'message': 'درخواست تمدید ثبت شد'
        })