# backend/apps/subscriptions/admin_views.py
"""
API Views ادمین برای مدیریت پرداخت‌های کارت به کارت
مسیر پایه: /api/admin/payment-requests/ و /api/admin/payment-cards/
"""

from rest_framework import status, generics, permissions, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.utils import timezone
from django.db.models import Q, Sum, Count
from django.shortcuts import get_object_or_404
from datetime import timedelta
import logging

from apps.accounts.permissions import IsAdminUser
from apps.accounts.models import SystemSetting
from apps.admin_panel.models import AdminActionLog
from .models import PaymentCard, PaymentRequest, UserSubscription
from .serializers import (
    PaymentCardSerializer,
    PaymentRequestSerializer,
    ApprovePaymentRequestSerializer,
    RejectPaymentRequestSerializer,
)

logger = logging.getLogger(__name__)


# ============================================
# ✅ Helper: ارسال پیامک
# ============================================
def _send_sms_safe(event_key, phone_number, context, user=None):
    """ارسال ایمن پیامک"""
    try:
        from apps.sms.services import SmsService
        sms_service = SmsService()
        return sms_service.send_event(
            event_key=event_key,
            phone_number=phone_number,
            context=context,
            user=user,
        )
    except Exception as e:
        logger.error(f"❌ Error sending SMS ({event_key}): {str(e)}")
        return None


# ============================================
# ۱. لیست و ایجاد کارت‌ها (ادمین)
# ============================================
class AdminPaymentCardListView(generics.ListCreateAPIView):
    """لیست و ایجاد کارت بانکی"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = PaymentCardSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['card_number', 'card_holder', 'bank_name']
    ordering_fields = ['order_index', 'created_at', 'usage_count']
    ordering = ['order_index', '-created_at']

    def get_queryset(self):
        queryset = PaymentCard.objects.all()
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        return queryset

    def perform_create(self, serializer):
        card = serializer.save()
        AdminActionLog.objects.create(
            admin=self.request.user,
            action_type='create',
            target_model='PaymentCard',
            target_id=card.id,
            description=f'ایجاد کارت بانکی {card.card_holder} - {card.bank_name}'
        )


class AdminPaymentCardDetailView(generics.RetrieveUpdateDestroyAPIView):
    """جزئیات، ویرایش و حذف کارت"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = PaymentCardSerializer
    queryset = PaymentCard.objects.all()

    def perform_update(self, serializer):
        card = serializer.save()
        AdminActionLog.objects.create(
            admin=self.request.user,
            action_type='update',
            target_model='PaymentCard',
            target_id=card.id,
            description=f'به‌روزرسانی کارت {card.card_holder}'
        )

    def perform_destroy(self, instance):
        if instance.payment_requests.exists():
            raise Exception('این کارت در درخواست‌های پرداخت استفاده شده است. فقط می‌توانید آن را غیرفعال کنید.')

        AdminActionLog.objects.create(
            admin=self.request.user,
            action_type='delete',
            target_model='PaymentCard',
            target_id=instance.id,
            description=f'حذف کارت {instance.card_holder}'
        )
        instance.delete()


class AdminPaymentCardSetDefaultView(APIView):
    """تنظیم کارت به عنوان پیش‌فرض"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def post(self, request, pk):
        try:
            card = PaymentCard.objects.get(id=pk)
            if not card.is_active:
                return Response(
                    {'error': 'کارت غیرفعال را نمی‌توان به عنوان پیش‌فرض تنظیم کرد'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            card.is_default = True
            card.save()

            AdminActionLog.objects.create(
                admin=request.user,
                action_type='update',
                target_model='PaymentCard',
                target_id=card.id,
                description=f'تنظیم کارت {card.card_holder} به عنوان پیش‌فرض'
            )

            return Response({
                'message': f'کارت {card.card_holder} به عنوان پیش‌فرض تنظیم شد',
                'card': PaymentCardSerializer(card).data,
            })
        except PaymentCard.DoesNotExist:
            return Response({'error': 'کارت یافت نشد'}, status=status.HTTP_404_NOT_FOUND)


class AdminPaymentCardToggleView(APIView):
    """فعال/غیرفعال کردن کارت"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def post(self, request, pk):
        try:
            card = PaymentCard.objects.get(id=pk)
            card.is_active = not card.is_active
            if not card.is_active:
                card.is_default = False
            card.save()

            AdminActionLog.objects.create(
                admin=request.user,
                action_type='update',
                target_model='PaymentCard',
                target_id=card.id,
                description=f'{"فعال" if card.is_active else "غیرفعال"} کردن کارت {card.card_holder}'
            )

            return Response({
                'message': f'کارت {"فعال" if card.is_active else "غیرفعال"} شد',
                'is_active': card.is_active,
            })
        except PaymentCard.DoesNotExist:
            return Response({'error': 'کارت یافت نشد'}, status=status.HTTP_404_NOT_FOUND)


# ============================================
# ۲. لیست و جزئیات درخواست‌های پرداخت (ادمین)
# ============================================
class AdminPaymentRequestListView(generics.ListAPIView):
    """لیست درخواست‌های پرداخت با فیلترهای پیشرفته"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = PaymentRequestSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['user__phone_number', 'user__first_name', 'user__last_name',
                     'tracking_number', 'unique_code', 'payer_name']
    ordering_fields = ['created_at', 'amount', 'status', 'submitted_at', 'reviewed_at']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = PaymentRequest.objects.all().select_related('user', 'plan', 'payment_card', 'reviewed_by')

        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        card_id = self.request.query_params.get('card_id')
        if card_id:
            queryset = queryset.filter(payment_card_id=card_id)

        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)

        plan_id = self.request.query_params.get('plan_id')
        if plan_id:
            queryset = queryset.filter(plan_id=plan_id)

        reviewed_by = self.request.query_params.get('reviewed_by')
        if reviewed_by:
            queryset = queryset.filter(reviewed_by_id=reviewed_by)

        date_from = self.request.query_params.get('date_from')
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
        date_to = self.request.query_params.get('date_to')
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)

        min_amount = self.request.query_params.get('min_amount')
        if min_amount:
            queryset = queryset.filter(amount__gte=min_amount)
        max_amount = self.request.query_params.get('max_amount')
        if max_amount:
            queryset = queryset.filter(amount__lte=max_amount)

        return queryset


class AdminPaymentRequestDetailView(generics.RetrieveAPIView):
    """جزئیات کامل درخواست پرداخت"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = PaymentRequestSerializer
    queryset = PaymentRequest.objects.all()


# ============================================
# ۳. تأیید پرداخت (ادمین)
# ============================================
class AdminPaymentRequestApproveView(APIView):
    """
    تأیید پرداخت توسط ادمین
    - تمدید خودکار اشتراک
    - پیامک به کاربر
    - ✅ پیامک به ادمین (جدید)
    """
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def post(self, request, pk):
        try:
            payment_request = PaymentRequest.objects.get(id=pk)
        except PaymentRequest.DoesNotExist:
            return Response({'error': 'درخواست یافت نشد'}, status=status.HTTP_404_NOT_FOUND)

        serializer = ApprovePaymentRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        note = serializer.validated_data.get('note', '')

        # تأیید
        success, message, subscription = payment_request.approve(admin_user=request.user)
        if not success:
            return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)

        # لاگ ادمین
        AdminActionLog.objects.create(
            admin=request.user,
            action_type='update',
            target_model='PaymentRequest',
            target_id=payment_request.id,
            description=f'تأیید پرداخت #{payment_request.id} - کاربر {payment_request.user.phone_number} - مبلغ {payment_request.amount}' + (f' - {note}' if note else '')
        )

        user_name = payment_request.user.get_full_name() or payment_request.user.phone_number
        end_date_str = subscription.end_date.strftime('%Y/%m/%d') if subscription and subscription.end_date else '-'

        # ============================================
        # ✅ پیامک به کاربر: تأیید پرداخت
        # ============================================
        _send_sms_safe(
            event_key='payment_approved',
            phone_number=payment_request.user.phone_number,
            context={
                'user_name': user_name,
                'plan_name': payment_request.plan.plan_name,
                'end_date': end_date_str,
                'param1': user_name,
                'param2': payment_request.plan.plan_name,
                'param3': end_date_str,
            },
            user=payment_request.user,
        )

        # ============================================
        # ✅ پیامک به ادمین: تأیید پرداخت کارت به کارت
        # ============================================
        admin_phone = SystemSetting.get('admin_phone_number', '')
        if admin_phone:
            _send_sms_safe(
                event_key='admin_payment_approved',
                phone_number=admin_phone,
                context={
                    'user_name': user_name,
                    'amount': f"{int(payment_request.amount):,}",
                    'method': 'کارت به کارت',
                    'new_end_date': end_date_str,
                    'param1': user_name,
                    'param2': f"{int(payment_request.amount):,}",
                    'param3': 'کارت به کارت',
                    'param4': end_date_str,
                },
            )
        else:
            logger.warning("⚠️ شماره ادمین برای اطلاع تأیید پرداخت تنظیم نشده")

        # علامت‌گذاری کاربر اطلاع‌رسانی شده
        payment_request.user_notified = True
        payment_request.user_notified_at = timezone.now()
        payment_request.save(update_fields=['user_notified', 'user_notified_at'])

        logger.info(f"✅ PaymentRequest #{payment_request.id} approved by {request.user.phone_number}")

        return Response({
            'success': True,
            'message': message,
            'subscription_id': subscription.id if subscription else None,
            'new_end_date': end_date_str,
        })


# ============================================
# ۴. رد پرداخت (ادمین)
# ============================================
class AdminPaymentRequestRejectView(APIView):
    """رد پرداخت توسط ادمین"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def post(self, request, pk):
        try:
            payment_request = PaymentRequest.objects.get(id=pk)
        except PaymentRequest.DoesNotExist:
            return Response({'error': 'درخواست یافت نشد'}, status=status.HTTP_404_NOT_FOUND)

        serializer = RejectPaymentRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        reason = serializer.validated_data['reason']

        success, message = payment_request.reject(admin_user=request.user, reason=reason)
        if not success:
            return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)

        AdminActionLog.objects.create(
            admin=request.user,
            action_type='update',
            target_model='PaymentRequest',
            target_id=payment_request.id,
            description=f'رد پرداخت #{payment_request.id} - کاربر {payment_request.user.phone_number} - دلیل: {reason}'
        )

        user_name = payment_request.user.get_full_name() or payment_request.user.phone_number

        _send_sms_safe(
            event_key='payment_rejected',
            phone_number=payment_request.user.phone_number,
            context={
                'user_name': user_name,
                'reason': reason,
                'param1': user_name,
                'param2': reason,
            },
            user=payment_request.user,
        )

        payment_request.user_notified = True
        payment_request.user_notified_at = timezone.now()
        payment_request.save(update_fields=['user_notified', 'user_notified_at'])

        logger.info(f"❌ PaymentRequest #{payment_request.id} rejected by {request.user.phone_number}")

        return Response({
            'success': True,
            'message': message,
        })


# ============================================
# ۵. آمار پرداخت‌ها (ادمین)
# ============================================
class AdminPaymentRequestStatsView(APIView):
    """آمار کامل پرداخت‌های کارت به کارت"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get(self, request):
        now = timezone.now()
        today = now.date()

        all_requests = PaymentRequest.objects.all()

        stats = {
            'total': all_requests.count(),
            'by_status': {},
            'total_amount_approved': 0,
            'total_amount_pending': 0,
            'today_count': 0,
            'today_amount': 0,
            'this_month_count': 0,
            'this_month_amount': 0,
        }

        for status_code, status_label in PaymentRequest.STATUS_CHOICES:
            count = all_requests.filter(status=status_code).count()
            stats['by_status'][status_code] = {
                'label': status_label,
                'count': count,
            }

        approved_sum = all_requests.filter(status='approved').aggregate(Sum('amount'))['amount__sum'] or 0
        pending_sum = all_requests.filter(
            status__in=['pending_payment', 'awaiting_review']
        ).aggregate(Sum('amount'))['amount__sum'] or 0

        stats['total_amount_approved'] = float(approved_sum)
        stats['total_amount_pending'] = float(pending_sum)

        today_stats = all_requests.filter(created_at__date=today).aggregate(
            count=Count('id'),
            amount=Sum('amount')
        )
        stats['today_count'] = today_stats['count'] or 0
        stats['today_amount'] = float(today_stats['amount'] or 0)

        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        month_stats = all_requests.filter(created_at__gte=month_start).aggregate(
            count=Count('id'),
            amount=Sum('amount')
        )
        stats['this_month_count'] = month_stats['count'] or 0
        stats['this_month_amount'] = float(month_stats['amount'] or 0)

        cards_stats = []
        for card in PaymentCard.objects.all():
            card_requests = all_requests.filter(payment_card=card)
            approved_amount = card_requests.filter(status='approved').aggregate(Sum('amount'))['amount__sum'] or 0
            cards_stats.append({
                'id': card.id,
                'card_holder': card.card_holder,
                'bank_name': card.bank_name,
                'card_number_last4': card.card_number[-4:] if card.card_number else '',
                'is_active': card.is_active,
                'is_default': card.is_default,
                'usage_count': card_requests.count(),
                'total_amount': float(approved_amount),
            })

        stats['cards'] = cards_stats

        return Response(stats)