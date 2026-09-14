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
import logging

logger = logging.getLogger(__name__)

# ============================================
# ✅ Import SmsService (سیستم جدید پیامک)
# ============================================
try:
    from apps.sms.services import SmsService
    SMS_SERVICE_AVAILABLE = True
except ImportError as e:
    logger.error(f"❌ Failed to import SmsService: {str(e)}")
    SMS_SERVICE_AVAILABLE = False
    SmsService = None


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
                {'error': 'پلن انتخابی یافت نشد.'},
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
                        {'error': 'کد تخفیف نامعتبر است.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                discount_percent = float(discount.discount_percent)
            except DiscountCode.DoesNotExist:
                return Response(
                    {'error': 'کد تخفیف یافت نشد.'},
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
            ai_consultations_limit=plan.monthly_ai_consultations_limit,
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
# تایید پرداخت (اصلاح‌شده با SmsService جدید)
# ============================================
class VerifyPaymentView(APIView):
    """تایید پرداخت"""
    permission_classes = [AllowAny]

    @transaction.atomic
    def get(self, request):
        # ============================================
        # ✅ لاگ کامل برای عیب‌یابی
        # ============================================
        print("=" * 80)
        print("🔍 VerifyPaymentView called!")
        print(f"📥 Full URL: {request.build_absolute_uri()}")
        print(f"📥 Query params (GET): {dict(request.GET)}")
        print(f"📥 Request headers: {dict(request.headers)}")
        print("=" * 80)

        authority = request.GET.get('authority') or request.GET.get('Authority')
        status_param = request.GET.get('status') or request.GET.get('Status')
        subscription_id = request.GET.get('subscription_id') or request.GET.get('subscription_id')

        print(f"🔑 Extracted Authority: {authority}")
        print(f"🔑 Extracted Status: {status_param}")
        print(f"🔑 Extracted subscription_id: {subscription_id}")

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

            # ✅ ثبت استفاده از کد تخفیف در جدول تاریخچه
            if subscription.discount_code:
                discount = subscription.discount_code

                original_price = float(subscription.plan.price)
                final_price = float(subscription.amount_paid)
                vat_amount = final_price - (final_price / 1.1)
                discount_amount = original_price - (final_price - vat_amount)

                success, message, usage = discount.use(
                    user=subscription.user,
                    subscription=subscription,
                    discount_amount=discount_amount,
                    final_amount=final_price - vat_amount
                )

                if success:
                    logger.info(f"✅ Discount code {discount.code} used by user {subscription.user.id}")
                else:
                    logger.warning(f"⚠️ Failed to use discount code {discount.code}: {message}")

            # ============================================
            # 🆕 ارسال پیامک تمدید به کاربر با SmsService جدید
            # ============================================
            if SMS_SERVICE_AVAILABLE and SmsService:
                try:
                    sms_service = SmsService()
                    sms_service.send_subscription_renewed_by_user(
                        user=subscription.user,
                        plan_name=subscription.plan.plan_name,
                        end_date=subscription.end_date,
                        days=subscription.plan.duration_days,
                        amount=float(subscription.amount_paid),
                        subscription_id=subscription.id,
                    )
                    logger.info(f"✅ Subscription renewed SMS sent to {subscription.user.phone_number}")
                except Exception as e:
                    logger.error(f"❌ Error sending subscription renewal SMS: {str(e)}")
            else:
                logger.warning("⚠️ SmsService در دسترس نیست - پیامک تمدید ارسال نشد")

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
                'error': 'کد تخفیف را وارد کنید.'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            discount = DiscountCode.objects.get(code=code)

            if not discount.is_valid():
                if not discount.is_active:
                    error_msg = 'کد تخفیف غیرفعال شده است.'
                elif discount.max_uses <= 0:
                    error_msg = 'کد تخفیف معتبر نیست (تعداد استفاده مجاز صفر است).'
                elif discount.used_count >= discount.max_uses:
                    error_msg = 'کد تخفیف به پایان رسیده است (تعداد استفاده کامل شد).'
                elif discount.expires_at and discount.expires_at < timezone.now():
                    error_msg = 'کد تخفیف منقضی شده است.'
                else:
                    error_msg = 'کد تخفیف نامعتبر است.'

                return Response({
                    'success': False,
                    'error': error_msg
                }, status=status.HTTP_400_BAD_REQUEST)

            if discount.plan and plan_id:
                try:
                    plan = SubscriptionPlan.objects.get(id=plan_id)
                    if discount.plan != plan:
                        return Response({
                            'success': False,
                            'error': 'این کد تخفیف برای این پلن معتبر نیست.'
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
                'error': 'کد تخفیف یافت نشد.'
            }, status=status.HTTP_404_NOT_FOUND)


# ============================================
# وضعیت اشتراک
# ============================================
class SubscriptionStatusView(APIView):
    """دریافت وضعیت اشتراک کاربر"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if user.is_admin:
            return Response({
                'has_subscription': True,
                'is_active': True,
                'is_expired': False,
                'is_near_expiry': False,
                'remaining_days': 36500,
                'remaining_trades': 99999,
                'remaining_ai_consultations': 99999,
                'ai_consultations_limit': 99999,
                'ai_consultations_used': 0,
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
            'remaining_ai_consultations': remaining_ai,
            'ai_consultations_limit': subscription.ai_consultations_limit,
            'ai_consultations_used': subscription.ai_consultations_used,
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
    """تمدید اشتراک (فقط محاسبه قیمت - پرداخت در PurchaseSubscriptionView)"""
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
                'ai_consultations_limit': plan.monthly_ai_consultations_limit,
                'discount_percent': discount_percent
            },
            'message': 'درخواست تمدید ثبت شد'
        })


# ============================================
# ✅ سیستم پرداخت کارت به کارت
# ============================================

from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import PaymentCard, PaymentRequest
from .serializers import (
    PaymentCardPublicSerializer,
    PaymentRequestUserSerializer,
    CreatePaymentRequestSerializer,
    SubmitReceiptSerializer,
)
from apps.accounts.models import SystemSetting


# ---------- Helper: ارسال پیامک ----------
def _send_sms_safe(event_key, phone_number, context, user=None):
    """ارسال ایمن پیامک با try/except"""
    if not SMS_SERVICE_AVAILABLE or not SmsService:
        logger.warning(f"⚠️ SmsService در دسترس نیست - رویداد {event_key} ارسال نشد")
        return None
    try:
        sms_service = SmsService()
        result = sms_service.send_event(
            event_key=event_key,
            phone_number=phone_number,
            context=context,
            user=user,
        )
        logger.info(f"✅ SMS sent ({event_key}) to {phone_number}: {result}")
        return result
    except Exception as e:
        logger.error(f"❌ Error sending SMS ({event_key}): {str(e)}")
        return None


# ============================================
# ۱. لیست کارت‌های بانکی (برای کاربر)
# ============================================
class PaymentCardListView(generics.ListAPIView):
    """
    لیست کارت‌های بانکی فعال
    - کاربر عادی: فقط کارت‌های فعال
    - کارت پیش‌فرض در ابتدای لیست
    """
    serializer_class = PaymentCardPublicSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PaymentCard.objects.filter(is_active=True).order_by('-is_default', 'order_index')


# ============================================
# ۲. ایجاد درخواست پرداخت (کاربر)
# ============================================
class CreatePaymentRequestView(APIView):
    """
    ایجاد درخواست پرداخت کارت به کارت

    Workflow:
    1. کاربر پلن انتخاب می‌کند
    2. درخواست ثبت می‌شود با وضعیت 'pending_payment'
    3. یک کارت (طبق تنظیمات) انتخاب و اطلاعات آن snapshot می‌شود
    4. مهلت پرداخت (طبق تنظیمات) تعیین می‌شود
    5. پیامک به کاربر ارسال می‌شود
    """
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        # بررسی فعال بودن پرداخت کارت به کارت
        if not SystemSetting.get_bool('payment_card_to_card_enabled', True):
            return Response(
                {'error': 'پرداخت کارت به کارت در حال حاضر غیرفعال است'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = CreatePaymentRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        plan_id = data['plan_id']
        discount_code_str = data.get('discount_code', '').strip()
        card_id = data.get('card_id')

        # بررسی پلن
        try:
            plan = SubscriptionPlan.objects.get(id=plan_id, is_active=True)
        except SubscriptionPlan.DoesNotExist:
            return Response(
                {'error': 'پلن انتخابی یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )

        # بررسی حداکثر درخواست فعال
        max_active = SystemSetting.get_int('payment_request_max_active_per_user', 1)
        active_requests = PaymentRequest.objects.filter(
            user=request.user,
            status__in=['pending_payment', 'awaiting_review']
        ).count()
        if active_requests >= max_active:
            return Response(
                {'error': f'شما حداکثر {max_active} درخواست پرداخت فعال دارید. ابتدا آن‌ها را تکمیل کنید.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # محاسبه مبلغ
        original_price = float(plan.price)
        discount = None
        discount_percent = 0
        discount_amount = 0

        if discount_code_str:
            try:
                discount = DiscountCode.objects.get(code=discount_code_str, is_active=True)
                if not discount.is_valid():
                    return Response(
                        {'error': 'کد تخفیف نامعتبر یا منقضی شده است'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                # بررسی تطابق با پلن
                if discount.plan and discount.plan_id != plan.id:
                    return Response(
                        {'error': 'این کد تخفیف برای این پلن معتبر نیست'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                discount_percent = float(discount.discount_percent)
                discount_amount = original_price * (discount_percent / 100)
            except DiscountCode.DoesNotExist:
                return Response(
                    {'error': 'کد تخفیف یافت نشد'},
                    status=status.HTTP_404_NOT_FOUND
                )

        final_amount = original_price - discount_amount

        # انتخاب کارت پرداخت
        selection_mode = SystemSetting.get('payment_card_selection_mode', 'random')
        payment_card = None

        if card_id and selection_mode == 'manual':
            # انتخاب دستی توسط کاربر
            try:
                payment_card = PaymentCard.objects.get(id=card_id, is_active=True)
            except PaymentCard.DoesNotExist:
                return Response(
                    {'error': 'کارت انتخابی یافت نشد یا غیرفعال است'},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            # انتخاب خودکار طبق تنظیمات
            payment_card = PaymentCard.get_for_payment(mode=selection_mode)

        if not payment_card:
            return Response(
                {'error': 'هیچ کارت فعالی برای پرداخت موجود نیست. لطفاً با پشتیبانی تماس بگیرید.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        # مهلت پرداخت
        timeout_hours = SystemSetting.get_int('payment_request_timeout_hours', 2)
        expires_at = timezone.now() + timedelta(hours=timeout_hours)

        # ایجاد درخواست
        payment_request = PaymentRequest.objects.create(
            user=request.user,
            plan=plan,
            discount_code=discount,
            payment_card=payment_card,
            destination_card_number=payment_card.card_number,
            destination_card_holder=payment_card.card_holder,
            destination_bank_name=payment_card.bank_name,
            unique_code=PaymentRequest.generate_unique_code(),
            amount=final_amount,
            original_amount=original_price,
            discount_amount=discount_amount,
            status='pending_payment',
            expires_at=expires_at,
        )

        # ارسال پیامک به کاربر (اختیاری - می‌تواند خطا بدهد)
        user_name = request.user.get_full_name() or request.user.phone_number
        _send_sms_safe(
            event_key='payment_request_created',
            phone_number=request.user.phone_number,
            context={
                'user_name': user_name,
                'amount': f"{int(final_amount):,}",
                'card_number': payment_card.card_number,
                'deadline': expires_at.strftime('%H:%M'),
            },
            user=request.user,
        )

        # لاگ اقدام
        try:
            from apps.admin_panel.models import AdminActionLog  # فقط برای سازگاری
        except ImportError:
            pass

        logger.info(f"✅ PaymentRequest #{payment_request.id} created for user {request.user.id}")

        return Response({
            'success': True,
            'payment_request': PaymentRequestUserSerializer(
                payment_request, context={'request': request}
            ).data,
            'message': 'درخواست پرداخت با موفقیت ثبت شد',
        }, status=status.HTTP_201_CREATED)


# ============================================
# ۳. جزئیات درخواست پرداخت (کاربر)
# ============================================
class PaymentRequestDetailView(generics.RetrieveAPIView):
    """جزئیات یک درخواست پرداخت - فقط برای صاحب درخواست"""
    permission_classes = [IsAuthenticated]
    serializer_class = PaymentRequestUserSerializer

    def get_queryset(self):
        return PaymentRequest.objects.filter(user=self.request.user)


# ============================================
# ۴. لیست درخواست‌های کاربر
# ============================================
class UserPaymentRequestListView(generics.ListAPIView):
    """لیست درخواست‌های پرداخت کاربر جاری"""
    permission_classes = [IsAuthenticated]
    serializer_class = PaymentRequestUserSerializer

    def get_queryset(self):
        queryset = PaymentRequest.objects.filter(user=self.request.user)

        # فیلتر بر اساس وضعیت
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        return queryset.order_by('-created_at')


# ============================================
# ۵. درخواست‌های فعال کاربر (برای بنر بالای صفحه)
# ============================================
class ActivePaymentRequestsView(APIView):
    """
    دریافت درخواست‌های فعال کاربر برای نمایش در بنر
    شامل: pending_payment, awaiting_review
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        active_requests = PaymentRequest.objects.filter(
            user=request.user,
            status__in=['pending_payment', 'awaiting_review']
        ).order_by('-created_at')

        data = PaymentRequestUserSerializer(
            active_requests, many=True, context={'request': request}
        ).data

        return Response({
            'count': len(data),
            'requests': data,
        })


# ============================================
# ۶. ثبت فیش توسط کاربر
# ============================================
class SubmitPaymentReceiptView(APIView):
    """
    ثبت اطلاعات فیش توسط کاربر
    - دریافت شماره پیگیری، نام واریزکننده، ۴ رقم آخر کارت، تصویر فیش (اختیاری)
    - وضعیت: pending_payment → awaiting_review
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    @transaction.atomic
    def post(self, request, pk):
        try:
            payment_request = PaymentRequest.objects.get(
                id=pk,
                user=request.user
            )
        except PaymentRequest.DoesNotExist:
            return Response(
                {'error': 'درخواست پرداخت یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )

        # بررسی وضعیت
        if not payment_request.can_submit_receipt():
            if payment_request.status == 'expired':
                return Response(
                    {'error': 'مهلت پرداخت این درخواست به پایان رسیده است'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if payment_request.status == 'awaiting_review':
                return Response(
                    {'error': 'اطلاعات فیش قبلاً ثبت شده است'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            return Response(
                {'error': 'امکان ثبت فیش در وضعیت فعلی وجود ندارد'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = SubmitReceiptSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        # بررسی الزامی بودن تصویر فیش
        receipt_image = request.FILES.get('receipt_image')
        if SystemSetting.get_bool('payment_receipt_image_required', False) and not receipt_image:
            return Response(
                {'error': 'ارسال تصویر فیش الزامی است'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # ثبت فیش
        success, message = payment_request.submit_receipt(
            tracking_number=data['tracking_number'],
            payer_name=data.get('payer_name', ''),
            payer_card_last4=data.get('payer_card_last4', ''),
            paid_at=data.get('paid_at'),
            receipt_image=receipt_image,
            user_note=data.get('user_note', ''),
        )

        if not success:
            return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)

        # اطلاع به ادمین‌ها (پیامک)
        _notify_admins_new_payment(payment_request)

        # پیامک به کاربر
        user_name = request.user.get_full_name() or request.user.phone_number
        _send_sms_safe(
            event_key='payment_awaiting_review',
            phone_number=request.user.phone_number,
            context={'user_name': user_name},
            user=request.user,
        )

        logger.info(f"✅ Receipt submitted for PaymentRequest #{payment_request.id}")

        return Response({
            'success': True,
            'payment_request': PaymentRequestUserSerializer(
                payment_request, context={'request': request}
            ).data,
            'message': 'اطلاعات فیش با موفقیت ثبت شد. پس از بررسی، نتیجه به شما اطلاع داده می‌شود.',
        })


# ============================================
# ۷. لغو درخواست توسط کاربر
# ============================================
class CancelPaymentRequestView(APIView):
    """لغو درخواست پرداخت توسط کاربر"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            payment_request = PaymentRequest.objects.get(
                id=pk,
                user=request.user
            )
        except PaymentRequest.DoesNotExist:
            return Response(
                {'error': 'درخواست پرداخت یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )

        success, message = payment_request.cancel()
        if not success:
            return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'success': True,
            'message': message,
        })


# ============================================
# ✅ Helper: اطلاع به ادمین‌ها
# ============================================
def _notify_admins_new_payment(payment_request):
    """اطلاع‌رسانی به ادمین‌ها هنگام ثبت فیش جدید"""
    if not SMS_SERVICE_AVAILABLE or not SmsService:
        return

    # دریافت لیست ادمین‌ها
    notify_all = SystemSetting.get_bool('payment_admin_notify_all', True)
    notify_phone = SystemSetting.get('payment_admin_notify_phone', '')

    admin_phones = []

    if notify_all:
        from apps.accounts.models import User
        admin_phones = list(
            User.objects.filter(is_admin=True, is_active=True)
            .exclude(phone_number='')
            .values_list('phone_number', flat=True)
        )
    elif notify_phone:
        admin_phones = [notify_phone]
    else:
        # اگر هیچ تنظیمی نبود، به ادمین اصلی
        admin_phone = SystemSetting.get('admin_phone_number', '')
        if admin_phone:
            admin_phones = [admin_phone]

    if not admin_phones:
        logger.warning("⚠️ هیچ شماره ادمینی برای اطلاع‌رسانی یافت نشد")
        return

    user_name = payment_request.user.get_full_name() or payment_request.user.phone_number
    tracking = payment_request.tracking_number or '-'

    for phone in admin_phones:
        _send_sms_safe(
            event_key='payment_admin_new_request',
            phone_number=phone,
            context={
                'user_name': user_name,
                'amount': f"{int(payment_request.amount):,}",
                'tracking_number': tracking,
                'request_id': str(payment_request.id),
            },
        )

    payment_request.admin_notified = True
    payment_request.admin_notified_at = timezone.now()
    payment_request.save(update_fields=['admin_notified', 'admin_notified_at'])