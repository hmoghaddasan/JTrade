# backend/apps/admin_panel/views.py

from rest_framework import status, generics, permissions, filters, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.decorators import action
from django.utils import timezone
from django.db.models import Q, Sum, Count, Avg, Max, Min
from django.db.models.functions import TruncDate, TruncMonth, TruncDay, ExtractWeekDay
from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import csv
import io
import json
from datetime import datetime, timedelta
import logging

from apps.accounts.models import User, SystemSetting, AppVersion
from apps.subscriptions.models import SubscriptionPlan, UserSubscription, DiscountCode, Transaction, DiscountCodeUsage
from apps.trading.models import Trade, TradeGroup, CurrencyPair, AIConsultation, AIPromptVersion, AIConsultationAnalytics, Portfolio, Broker
from apps.messaging.models import UserMessage, SystemMessage, SupportInfo
from apps.accounts.permissions import IsAdminUser
from apps.subscriptions.sms import GhasedakSMS
from .models import AdminActionLog
from .serializers import (
    AdminUserSerializer, AdminUserUpdateSerializer, AdminUserDetailSerializer,
    AdminSubscriptionSerializer, AdminSubscriptionExtendSerializer, AdminSubscriptionGiftSerializer,
    AdminTransactionSerializer, AdminSalesReportSerializer,
    AdminDiscountSerializer,
    AdminCurrencyPairSerializer,
    AdminAIConsultationSerializer, AdminAIAnalyticsSerializer,
    AdminAppVersionSerializer,
    AdminSystemSettingSerializer,
    AdminUserMessageSerializer, AdminMessageReplySerializer,
    AdminTradeSerializer,
    AdminActionLogSerializer,
    AdminSubscriptionPlanSerializer,
    AdminPortfolioSerializer,
    AdminBrokerSerializer,
)

logger = logging.getLogger(__name__)


# ================================
# ۱. داشبورد ادمین (توسعه‌یافته)
# ================================
class AdminDashboardView(APIView):
    """داشبورد کامل ادمین با نمودارها و آمار"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get(self, request):
        now = timezone.now()
        today = now.date()
        start_of_day = timezone.make_aware(datetime.combine(today, datetime.min.time()))
        start_of_week = start_of_day - timedelta(days=7)
        start_of_month = start_of_day - timedelta(days=30)

        # ======== آمار کاربران ========
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        new_users_today = User.objects.filter(created_at__gte=start_of_day).count()
        new_users_week = User.objects.filter(created_at__gte=start_of_week).count()
        new_users_month = User.objects.filter(created_at__gte=start_of_month).count()

        # ======== آمار اشتراک‌ها ========
        total_subscriptions = UserSubscription.objects.count()
        active_subscriptions = UserSubscription.objects.filter(
            is_active=True,
            end_date__gt=now
        ).count()
        trial_subscriptions = UserSubscription.objects.filter(is_trial=True, is_active=True).count()
        expired_subscriptions = UserSubscription.objects.filter(
            is_active=False,
            end_date__lt=now
        ).count()
        expiring_soon = UserSubscription.objects.filter(
            is_active=True,
            end_date__gt=now,
            end_date__lte=now + timedelta(days=7)
        ).count()
        expiring_today = UserSubscription.objects.filter(
            is_active=True,
            end_date__date=today
        ).count()

        # ======== آمار تریدها ========
        total_trades = Trade.objects.filter(is_deleted=False).count()
        trades_today = Trade.objects.filter(
            is_deleted=False,
            created_at__gte=start_of_day
        ).count()
        trades_week = Trade.objects.filter(
            is_deleted=False,
            created_at__gte=start_of_week
        ).count()

        profit_stats = Trade.objects.filter(is_deleted=False).aggregate(
            total_profit=Sum('profit'),
            avg_profit=Avg('profit'),
            max_profit=Max('profit'),
            min_profit=Min('profit')
        )
        winning_trades = Trade.objects.filter(is_deleted=False, profit__gt=0).count()
        losing_trades = Trade.objects.filter(is_deleted=False, profit__lt=0).count()

        # ======== آمار مشاوره‌های AI ========
        total_consultations = AIConsultation.objects.count()
        consultations_today = AIConsultation.objects.filter(created_at__gte=start_of_day).count()
        avg_ai_score = AIConsultation.objects.aggregate(avg=Avg('ai_score'))['avg'] or 0
        completed_consultations = AIConsultation.objects.filter(status='completed').count()
        failed_consultations = AIConsultation.objects.filter(status='failed').count()

        # ======== آمار مالی ========
        total_revenue = Transaction.objects.filter(
            payment_status='paid'
        ).aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        revenue_today = Transaction.objects.filter(
            payment_status='paid',
            created_at__gte=start_of_day
        ).aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        revenue_week = Transaction.objects.filter(
            payment_status='paid',
            created_at__gte=start_of_week
        ).aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        revenue_month = Transaction.objects.filter(
            payment_status='paid',
            created_at__gte=start_of_month
        ).aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        pending_payments = Transaction.objects.filter(payment_status='pending').count()

        # ======== پیام‌های خوانده نشده ========
        pending_messages = UserMessage.objects.filter(is_read=False).count()
        unreplied_messages = UserMessage.objects.filter(is_replied=False, is_read=True).count()

        # ======== آمار روزهای هفته (برای نمودار) ========
        day_stats = Trade.objects.filter(
            is_deleted=False,
            created_at__gte=start_of_month
        ).extra(
            select={'day': "DAYNAME(created_at)"}
        ).values('day').annotate(
            count=Count('id'),
            profit=Sum('profit')
        ).order_by('day')

        # ======== آمار ماهانه (برای نمودار) ========
        monthly_stats = Trade.objects.filter(
            is_deleted=False,
            created_at__gte=start_of_month - timedelta(days=180)
        ).extra(
            select={'month': "DATE_FORMAT(created_at, '%%Y-%%m')"}
        ).values('month').annotate(
            count=Count('id'),
            total_profit=Sum('profit'),
            positive_profit=Sum('profit', filter=Q(profit__gt=0))
        ).order_by('month')

        # ======== بهترین نمادها - نسخه ساده ========
        top_symbols_data = Trade.objects.filter(
            is_deleted=False
        ).values('symbol').annotate(
            count=Count('id'),
            profit=Sum('profit')
        ).order_by('-profit')[:10]

        top_symbols = []
        for item in top_symbols_data:
            symbol_trades = Trade.objects.filter(is_deleted=False, symbol=item['symbol'])
            win_count = symbol_trades.filter(profit__gt=0).count()
            item['win_rate'] = (win_count / item['count'] * 100) if item['count'] > 0 else 0
            top_symbols.append(item)

        # ======== لاگ‌های اخیر ========
        recent_logs = AdminActionLog.objects.all().order_by('-created_at')[:20]

        # ======== نسخه فعلی ========
        current_version = AppVersion.objects.filter(is_current=True).first()

        return Response({
            'users': {
                'total': total_users,
                'active': active_users,
                'new_today': new_users_today,
                'new_week': new_users_week,
                'new_month': new_users_month,
            },
            'subscriptions': {
                'total': total_subscriptions,
                'active': active_subscriptions,
                'trial': trial_subscriptions,
                'expired': expired_subscriptions,
                'expiring_soon': expiring_soon,
                'expiring_today': expiring_today,
            },
            'trades': {
                'total': total_trades,
                'today': trades_today,
                'week': trades_week,
                'winning': winning_trades,
                'losing': losing_trades,
                'win_rate': round((winning_trades / total_trades * 100), 1) if total_trades > 0 else 0,
                'total_profit': float(profit_stats['total_profit'] or 0),
                'avg_profit': float(profit_stats['avg_profit'] or 0),
                'max_profit': float(profit_stats['max_profit'] or 0),
                'min_profit': float(profit_stats['min_profit'] or 0),
            },
            'consultations': {
                'total': total_consultations,
                'today': consultations_today,
                'completed': completed_consultations,
                'failed': failed_consultations,
                'avg_score': round(avg_ai_score, 1),
                'completion_rate': round((completed_consultations / total_consultations * 100), 1) if total_consultations > 0 else 0,
            },
            'finance': {
                'total_revenue': float(total_revenue),
                'revenue_today': float(revenue_today),
                'revenue_week': float(revenue_week),
                'revenue_month': float(revenue_month),
                'pending_payments': pending_payments,
            },
            'messages': {
                'pending': pending_messages,
                'unreplied': unreplied_messages,
            },
            'charts': {
                'day_stats': list(day_stats),
                'monthly_stats': list(monthly_stats),
                'top_symbols': top_symbols,
            },
            'recent_logs': AdminActionLogSerializer(recent_logs, many=True).data,
            'current_version': AdminAppVersionSerializer(current_version).data if current_version else None,
        })


# ================================
# ۲. مدیریت کاربران (توسعه کامل)
# ================================
class AdminUserListView(generics.ListAPIView):
    """لیست کاربران با فیلترهای پیشرفته"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = AdminUserSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['phone_number', 'first_name', 'last_name', 'email']
    ordering_fields = ['created_at', 'last_login', 'id', 'phone_number']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = User.objects.all()

        # فیلتر بر اساس وضعیت
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        is_admin = self.request.query_params.get('is_admin')
        if is_admin is not None:
            queryset = queryset.filter(is_admin=is_admin.lower() == 'true')

        is_verified = self.request.query_params.get('is_verified')
        if is_verified is not None:
            queryset = queryset.filter(is_verified=is_verified.lower() == 'true')

        # فیلتر بر اساس اشتراک فعال
        has_subscription = self.request.query_params.get('has_subscription')
        if has_subscription is not None:
            if has_subscription.lower() == 'true':
                queryset = queryset.filter(
                    user_subscriptions__is_active=True,
                    user_subscriptions__end_date__gt=timezone.now()
                ).distinct()
            else:
                queryset = queryset.exclude(
                    user_subscriptions__is_active=True,
                    user_subscriptions__end_date__gt=timezone.now()
                ).distinct()

        # فیلتر بر اساس تاریخ ثبت
        date_from = self.request.query_params.get('date_from')
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
        date_to = self.request.query_params.get('date_to')
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)

        return queryset


class AdminUserDetailView(generics.RetrieveAPIView):
    """جزئیات کامل کاربر"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = AdminUserDetailSerializer
    queryset = User.objects.all()


class AdminUserUpdateView(generics.UpdateAPIView):
    """ویرایش کاربر"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = AdminUserUpdateSerializer
    queryset = User.objects.all()

    def perform_update(self, serializer):
        user = self.get_object()
        serializer.save()
        AdminActionLog.objects.create(
            admin=self.request.user,
            action_type='update',
            target_model='User',
            target_id=user.id,
            description=f'به‌روزرسانی کاربر {user.phone_number}'
        )


class AdminUserToggleView(APIView):
    """فعال/غیرفعال کردن کاربر"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def post(self, request, pk):
        try:
            user = User.objects.get(id=pk)
            user.is_active = not user.is_active
            user.save()

            AdminActionLog.objects.create(
                admin=request.user,
                action_type='toggle_user',
                target_model='User',
                target_id=user.id,
                description=f'تغییر وضعیت کاربر {user.phone_number} به {"فعال" if user.is_active else "غیرفعال"}'
            )

            return Response({
                'message': f'وضعیت کاربر با موفقیت تغییر کرد',
                'is_active': user.is_active
            })
        except User.DoesNotExist:
            return Response({'error': 'کاربر یافت نشد'}, status=status.HTTP_404_NOT_FOUND)


class AdminUserDeleteView(APIView):
    """حذف کاربر (با بررسی اشتراک‌های فعال)"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def delete(self, request, pk):
        try:
            user = User.objects.get(id=pk)
            if user.is_admin:
                return Response(
                    {'error': 'امکان حذف کاربر ادمین وجود ندارد'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # بررسی اشتراک‌های فعال
            if user.user_subscriptions.filter(is_active=True).exists():
                return Response(
                    {'error': 'این کاربر دارای اشتراک فعال است. ابتدا اشتراک را لغو کنید.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            user.delete()
            AdminActionLog.objects.create(
                admin=request.user,
                action_type='delete',
                target_model='User',
                target_id=pk,
                description=f'حذف کاربر {user.phone_number}'
            )
            return Response({'message': 'کاربر با موفقیت حذف شد'})
        except User.DoesNotExist:
            return Response({'error': 'کاربر یافت نشد'}, status=status.HTTP_404_NOT_FOUND)


class AdminUserSendSMSView(APIView):
    """ارسال پیامک به کاربر (تکی یا گروهی)"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def post(self, request):
        user_ids = request.data.get('user_ids', [])
        message_text = request.data.get('message', '')
        send_to_all = request.data.get('send_to_all', False)

        if not message_text:
            return Response(
                {'error': 'متن پیامک الزامی است'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if send_to_all:
            users = User.objects.filter(is_active=True)
        elif user_ids:
            users = User.objects.filter(id__in=user_ids, is_active=True)
        else:
            return Response(
                {'error': 'حداقل یک کاربر یا گزینه ارسال به همه را انتخاب کنید'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not users.exists():
            return Response(
                {'error': 'کاربری برای ارسال پیامک یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )

        sms = GhasedakSMS()
        sent_count = 0
        failed_count = 0
        errors = []

        for user in users:
            if user.phone_number:
                try:
                    result = sms.send_sms(user.phone_number, message_text)
                    if result.get('success'):
                        sent_count += 1
                    else:
                        failed_count += 1
                        errors.append(f"{user.phone_number}: {result.get('error', 'خطا')}")
                except Exception as e:
                    failed_count += 1
                    errors.append(f"{user.phone_number}: {str(e)}")

            # ثبت لاگ
            AdminActionLog.objects.create(
                admin=request.user,
                action_type='send_sms',
                target_model='User',
                target_id=user.id,
                description=f'ارسال پیامک به {user.phone_number}'
            )

        return Response({
            'sent_count': sent_count,
            'failed_count': failed_count,
            'total_count': users.count(),
            'errors': errors[:10] if errors else [],
            'message': f'پیامک به {sent_count} کاربر ارسال شد.' + (f' {failed_count} خطا' if failed_count else '')
        })


# ================================
# ۳. مدیریت اشتراک‌ها (توسعه کامل)
# ================================
class AdminSubscriptionListView(generics.ListAPIView):
    """لیست اشتراک‌ها با فیلترهای پیشرفته"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = AdminSubscriptionSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['user__phone_number', 'user__first_name', 'user__last_name']
    ordering_fields = ['created_at', 'end_date', 'start_date', 'amount_paid']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = UserSubscription.objects.all()

        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        is_trial = self.request.query_params.get('is_trial')
        if is_trial is not None:
            queryset = queryset.filter(is_trial=is_trial.lower() == 'true')

        payment_status = self.request.query_params.get('payment_status')
        if payment_status:
            queryset = queryset.filter(payment_status=payment_status)

        plan_id = self.request.query_params.get('plan_id')
        if plan_id:
            queryset = queryset.filter(plan_id=plan_id)

        date_from = self.request.query_params.get('date_from')
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
        date_to = self.request.query_params.get('date_to')
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)

        return queryset


class AdminSubscriptionDetailView(generics.RetrieveAPIView):
    """جزئیات اشتراک"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = AdminSubscriptionSerializer
    queryset = UserSubscription.objects.all()


class AdminSubscriptionExtendView(APIView):
    """تمدید اشتراک به صورت دستی"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def post(self, request, pk):
        try:
            subscription = UserSubscription.objects.get(id=pk)
            additional_days = request.data.get('additional_days', 30)
            reason = request.data.get('reason', '')

            if additional_days <= 0:
                return Response(
                    {'error': 'تعداد روز باید بزرگتر از صفر باشد'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            subscription.end_date = subscription.end_date + timedelta(days=additional_days)
            subscription.is_active = True
            subscription.save()

            AdminActionLog.objects.create(
                admin=request.user,
                action_type='extend_subscription',
                target_model='UserSubscription',
                target_id=subscription.id,
                description=f'تمدید اشتراک کاربر {subscription.user.phone_number} به مدت {additional_days} روز' +
                           (f' - {reason}' if reason else '')
            )

            return Response({
                'message': 'اشتراک با موفقیت تمدید شد',
                'new_end_date': subscription.end_date,
                'remaining_days': subscription.get_remaining_days()
            })
        except UserSubscription.DoesNotExist:
            return Response({'error': 'اشتراک یافت نشد'}, status=status.HTTP_404_NOT_FOUND)


class AdminSubscriptionGiftView(APIView):
    """هدیه گروهی (افزودن روز به اشتراک‌های کاربران)"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def post(self, request):
        serializer = AdminSubscriptionGiftSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        days = serializer.validated_data['days']
        user_ids = serializer.validated_data.get('user_ids', [])
        only_active = serializer.validated_data.get('only_active', True)
        reason = serializer.validated_data.get('reason', '')

        # فیلتر اشتراک‌ها
        queryset = UserSubscription.objects.filter(is_active=True)
        if only_active:
            queryset = queryset.filter(end_date__gt=timezone.now())

        if user_ids:
            queryset = queryset.filter(user_id__in=user_ids)

        if not queryset.exists():
            return Response(
                {'error': 'هیچ اشتراکی برای هدیه یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )

        count = 0
        for subscription in queryset:
            subscription.end_date = subscription.end_date + timedelta(days=days)
            subscription.save()
            count += 1

        AdminActionLog.objects.create(
            admin=request.user,
            action_type='extend_subscription',
            target_model='UserSubscription',
            description=f'هدیه گروهی {days} روز به {count} کاربر' + (f' - {reason}' if reason else '')
        )

        return Response({
            'message': f'{days} روز به {count} اشتراک اضافه شد',
            'count': count,
            'days': days
        })


class AdminSubscriptionCancelView(APIView):
    """لغو اشتراک"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def post(self, request, pk):
        try:
            subscription = UserSubscription.objects.get(id=pk)
            subscription.is_active = False
            subscription.save()

            AdminActionLog.objects.create(
                admin=request.user,
                action_type='update',
                target_model='UserSubscription',
                target_id=subscription.id,
                description=f'لغو اشتراک کاربر {subscription.user.phone_number}'
            )
            return Response({'message': 'اشتراک با موفقیت لغو شد'})
        except UserSubscription.DoesNotExist:
            return Response({'error': 'اشتراک یافت نشد'}, status=status.HTTP_404_NOT_FOUND)


# ================================
# ۴. مدیریت مالی (تراکنش‌ها و گزارشات)
# ================================
class AdminTransactionListView(generics.ListAPIView):
    """لیست تراکنش‌ها با فیلترهای پیشرفته"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = AdminTransactionSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['user__phone_number', 'user__first_name', 'user__last_name', 'payment_reference']
    ordering_fields = ['created_at', 'total_amount']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = Transaction.objects.all()

        payment_status = self.request.query_params.get('payment_status')
        if payment_status:
            queryset = queryset.filter(payment_status=payment_status)

        payment_method = self.request.query_params.get('payment_method')
        if payment_method:
            queryset = queryset.filter(payment_method=payment_method)

        date_from = self.request.query_params.get('date_from')
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
        date_to = self.request.query_params.get('date_to')
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)

        min_amount = self.request.query_params.get('min_amount')
        if min_amount:
            queryset = queryset.filter(total_amount__gte=min_amount)
        max_amount = self.request.query_params.get('max_amount')
        if max_amount:
            queryset = queryset.filter(total_amount__lte=max_amount)

        return queryset


class AdminSalesReportView(APIView):
    """گزارش فروش کامل با نمودار"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get(self, request):
        period = request.query_params.get('period', 'monthly')
        now = timezone.now()

        if period == 'daily':
            start_date = now - timedelta(days=30)
            group_by = TruncDate('created_at')
        elif period == 'monthly':
            start_date = now - timedelta(days=365)
            group_by = TruncMonth('created_at')
        elif period == 'yearly':
            start_date = now - timedelta(days=365 * 5)
            group_by = TruncMonth('created_at')
        else:
            start_date = now - timedelta(days=30)
            group_by = TruncDate('created_at')

        transactions = Transaction.objects.filter(
            payment_status='paid',
            created_at__gte=start_date
        )

        total_sales = transactions.count()
        total_revenue = transactions.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        avg_price = transactions.aggregate(Avg('total_amount'))['total_amount__avg'] or 0

        # تفکیک بر اساس پلن
        plan_breakdown = []
        plans = SubscriptionPlan.objects.filter(is_active=True)
        for plan in plans:
            plan_transactions = transactions.filter(subscription__plan=plan)
            count = plan_transactions.count()
            if count > 0:
                revenue = plan_transactions.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
                plan_breakdown.append({
                    'plan_name': plan.plan_name,
                    'count': count,
                    'revenue': float(revenue),
                    'percentage': round((count / total_sales * 100), 2) if total_sales > 0 else 0
                })

        # داده‌های روزانه/ماهانه
        daily_data = transactions.annotate(
            date=group_by
        ).values('date').annotate(
            count=Count('id'),
            revenue=Sum('total_amount')
        ).order_by('date')

        # داده‌های ماهانه
        monthly_data = transactions.annotate(
            month=TruncMonth('created_at')
        ).values('month').annotate(
            count=Count('id'),
            revenue=Sum('total_amount')
        ).order_by('month')

        return Response({
            'period': period,
            'total_sales': total_sales,
            'total_revenue': float(total_revenue),
            'average_price': float(avg_price),
            'plan_breakdown': plan_breakdown,
            'daily_data': list(daily_data),
            'monthly_data': list(monthly_data)
        })


class AdminSalesExportView(APIView):
    """خروجی اکسل فروش"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get(self, request):
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        transactions = Transaction.objects.filter(payment_status='paid')
        if start_date:
            transactions = transactions.filter(created_at__date__gte=start_date)
        if end_date:
            transactions = transactions.filter(created_at__date__lte=end_date)

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            'تاریخ', 'کاربر', 'پلن', 'مبلغ', 'مالیات', 'مبلغ کل', 'مرجع پرداخت', 'وضعیت'
        ])

        for t in transactions:
            writer.writerow([
                t.created_at.strftime('%Y/%m/%d %H:%M'),
                t.user.phone_number,
                t.subscription.plan.plan_name if t.subscription and t.subscription.plan else '-',
                float(t.amount),
                float(t.vat_amount),
                float(t.total_amount),
                t.payment_reference or '-',
                t.payment_status
            ])

        response = HttpResponse(output.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="sales_report_{datetime.now().strftime("%Y%m%d")}.csv"'
        return response


# ================================
# ۵. مدیریت کدهای تخفیف (توسعه کامل)
# ================================
class AdminDiscountListView(generics.ListCreateAPIView):
    """لیست و ایجاد کد تخفیف"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = AdminDiscountSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code']
    ordering_fields = ['created_at', 'discount_percent', 'used_count']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = DiscountCode.objects.all()
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        return queryset

    def perform_create(self, serializer):
        discount = serializer.save()
        AdminActionLog.objects.create(
            admin=self.request.user,
            action_type='create',
            target_model='DiscountCode',
            target_id=discount.id,
            description=f'ایجاد کد تخفیف {discount.code}'
        )


class AdminDiscountDetailView(generics.RetrieveUpdateAPIView):
    """جزئیات و ویرایش کد تخفیف"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = AdminDiscountSerializer
    queryset = DiscountCode.objects.all()


class AdminDiscountDeleteView(APIView):
    """حذف کد تخفیف"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def delete(self, request, pk):
        try:
            discount = DiscountCode.objects.get(id=pk)
            code = discount.code
            discount.delete()
            AdminActionLog.objects.create(
                admin=request.user,
                action_type='delete',
                target_model='DiscountCode',
                target_id=pk,
                description=f'حذف کد تخفیف {code}'
            )
            return Response({'message': 'کد تخفیف با موفقیت حذف شد'})
        except DiscountCode.DoesNotExist:
            return Response({'error': 'کد تخفیف یافت نشد'}, status=status.HTTP_404_NOT_FOUND)


# ================================
# ۶. مدیریت نمادها (جفت ارزها) - جدید
# ================================
class AdminCurrencyPairListView(generics.ListCreateAPIView):
    """لیست و ایجاد نماد"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = AdminCurrencyPairSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['symbol', 'description']
    ordering_fields = ['symbol', 'pair_type', 'is_active']
    ordering = ['symbol']

    def get_queryset(self):
        queryset = CurrencyPair.objects.all()
        pair_type = self.request.query_params.get('pair_type')
        if pair_type:
            queryset = queryset.filter(pair_type=pair_type)
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        return queryset

    def perform_create(self, serializer):
        symbol = serializer.save()
        AdminActionLog.objects.create(
            admin=self.request.user,
            action_type='create',
            target_model='CurrencyPair',
            target_id=symbol.id,
            description=f'ایجاد نماد {symbol.symbol}'
        )


class AdminCurrencyPairDetailView(generics.RetrieveUpdateDestroyAPIView):
    """جزئیات، ویرایش و حذف نماد"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = AdminCurrencyPairSerializer
    queryset = CurrencyPair.objects.all()

    def perform_update(self, serializer):
        symbol = serializer.save()
        AdminActionLog.objects.create(
            admin=self.request.user,
            action_type='update',
            target_model='CurrencyPair',
            target_id=symbol.id,
            description=f'به‌روزرسانی نماد {symbol.symbol}'
        )

    def perform_destroy(self, instance):
        AdminActionLog.objects.create(
            admin=self.request.user,
            action_type='delete',
            target_model='CurrencyPair',
            target_id=instance.id,
            description=f'حذف نماد {instance.symbol}'
        )
        instance.delete()


# ================================
# ۷. مدیریت مشاوره‌های AI - جدید
# ================================
class AdminAIConsultationListView(generics.ListAPIView):
    """لیست مشاوره‌ها با فیلترهای پیشرفته"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = AdminAIConsultationSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['user__phone_number', 'symbol', 'user_question']
    ordering_fields = ['created_at', 'ai_score', 'feedback_score']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = AIConsultation.objects.all()

        # فیلتر بر اساس وضعیت
        status = self.request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status)

        # فیلتر بر اساس نماد
        symbol = self.request.query_params.get('symbol')
        if symbol:
            queryset = queryset.filter(symbol__icontains=symbol)

        # فیلتر بر اساس کاربر
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)

        # فیلتر بر اساس مدل
        model_used = self.request.query_params.get('model_used')
        if model_used:
            queryset = queryset.filter(model_used=model_used)

        # فیلتر بر اساس بازخورد
        has_feedback = self.request.query_params.get('has_feedback')
        if has_feedback is not None:
            if has_feedback.lower() == 'true':
                queryset = queryset.filter(feedback_score__isnull=False)
            else:
                queryset = queryset.filter(feedback_score__isnull=True)

        # فیلتر بر اساس تاریخ
        date_from = self.request.query_params.get('date_from')
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
        date_to = self.request.query_params.get('date_to')
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)

        return queryset


class AdminAIConsultationDetailView(generics.RetrieveAPIView):
    """جزئیات کامل مشاوره"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = AdminAIConsultationSerializer
    queryset = AIConsultation.objects.all()


class AdminAIAnalyticsView(APIView):
    """تحلیل عملکرد AI - جدید"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get(self, request):
        consultations = AIConsultation.objects.all()

        # تحلیل بر اساس مدل
        model_analytics = []
        models = consultations.values_list('model_used', flat=True).distinct()

        for model in models:
            if not model:
                continue
            model_cons = consultations.filter(model_used=model)
            total = model_cons.count()
            if total == 0:
                continue

            completed = model_cons.filter(status='completed').count()
            with_feedback = model_cons.filter(feedback_score__isnull=False).count()
            avg_score = model_cons.aggregate(avg=Avg('ai_score'))['avg'] or 0
            avg_feedback = model_cons.filter(feedback_score__isnull=False).aggregate(avg=Avg('feedback_score'))['avg'] or 0

            # محاسبه نرخ موفقیت (بر اساس بازخورد مثبت)
            positive_feedback = model_cons.filter(feedback_score__gte=4).count()
            success_rate = (positive_feedback / with_feedback * 100) if with_feedback > 0 else 0

            # نمادهای پرکاربرد
            top_symbol = model_cons.values('symbol').annotate(count=Count('id')).order_by('-count').first()

            model_analytics.append({
                'model_name': model,
                'total_consultations': total,
                'completed_count': completed,
                'avg_score': round(avg_score, 1),
                'avg_feedback': round(avg_feedback, 2),
                'success_rate': round(success_rate, 1),
                'most_common_symbol': top_symbol['symbol'] if top_symbol else '-',
                'usage_percentage': round((total / consultations.count() * 100), 1) if consultations.count() > 0 else 0
            })

        # آمار کلی بازخورد
        feedback_stats = consultations.filter(feedback_score__isnull=False).aggregate(
            avg=Avg('feedback_score'),
            count=Count('id'),
            score_5=Count('id', filter=Q(feedback_score=5)),
            score_4=Count('id', filter=Q(feedback_score=4)),
            score_3=Count('id', filter=Q(feedback_score=3)),
            score_2=Count('id', filter=Q(feedback_score=2)),
            score_1=Count('id', filter=Q(feedback_score=1)),
        )

        # توزیع امتیازات
        score_distribution = {
            '1': feedback_stats['score_1'] or 0,
            '2': feedback_stats['score_2'] or 0,
            '3': feedback_stats['score_3'] or 0,
            '4': feedback_stats['score_4'] or 0,
            '5': feedback_stats['score_5'] or 0,
        }

        return Response({
            'total_consultations': consultations.count(),
            'total_with_feedback': feedback_stats['count'] or 0,
            'overall_avg_score': round(consultations.aggregate(avg=Avg('ai_score'))['avg'] or 0, 1),
            'overall_avg_feedback': round(feedback_stats['avg'] or 0, 2),
            'model_analytics': model_analytics,
            'feedback_distribution': score_distribution,
            'feedback_helpfulness': {
                'very_helpful': consultations.filter(feedback_helpfulness='very_helpful').count(),
                'somewhat_helpful': consultations.filter(feedback_helpfulness='somewhat_helpful').count(),
                'little_helpful': consultations.filter(feedback_helpfulness='little_helpful').count(),
                'not_helpful': consultations.filter(feedback_helpfulness='not_helpful').count(),
            }
        })


# ================================
# ۸. مدیریت نسخه نرم‌افزار - جدید
# ================================
class AdminAppVersionListView(generics.ListCreateAPIView):
    """لیست و ایجاد نسخه"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = AdminAppVersionSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['version_number']
    ordering_fields = ['release_date', 'version_number']
    ordering = ['-release_date']

    def get_queryset(self):
        return AppVersion.objects.all()

    def perform_create(self, serializer):
        version = serializer.save()
        # اگر current است، بقیه را غیرفعال کن
        if version.is_current:
            AppVersion.objects.exclude(id=version.id).update(is_current=False)

        AdminActionLog.objects.create(
            admin=self.request.user,
            action_type='create',
            target_model='AppVersion',
            target_id=version.id,
            description=f'ایجاد نسخه {version.version_number}'
        )


class AdminAppVersionDetailView(generics.RetrieveUpdateAPIView):
    """جزئیات و ویرایش نسخه"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = AdminAppVersionSerializer
    queryset = AppVersion.objects.all()

    def perform_update(self, serializer):
        version = serializer.save()
        if version.is_current:
            AppVersion.objects.exclude(id=version.id).update(is_current=False)

        AdminActionLog.objects.create(
            admin=self.request.user,
            action_type='update',
            target_model='AppVersion',
            target_id=version.id,
            description=f'به‌روزرسانی نسخه {version.version_number}'
        )


class AdminAppVersionDeleteView(APIView):
    """حذف نسخه"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def delete(self, request, pk):
        try:
            version = AppVersion.objects.get(id=pk)
            if version.is_current:
                return Response(
                    {'error': 'امکان حذف نسخه فعلی وجود ندارد. ابتدا نسخه دیگری را فعال کنید.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            version.delete()
            AdminActionLog.objects.create(
                admin=request.user,
                action_type='delete',
                target_model='AppVersion',
                target_id=pk,
                description=f'حذف نسخه {version.version_number}'
            )
            return Response({'message': 'نسخه با موفقیت حذف شد'})
        except AppVersion.DoesNotExist:
            return Response({'error': 'نسخه یافت نشد'}, status=status.HTTP_404_NOT_FOUND)


# ================================
# ۹. مدیریت پلن‌های اشتراک - جدید
# ================================
class AdminSubscriptionPlanListView(generics.ListCreateAPIView):
    """لیست و ایجاد پلن اشتراک"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = AdminSubscriptionPlanSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['plan_name', 'description']
    ordering_fields = ['price', 'duration_days', 'created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = SubscriptionPlan.objects.all()
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        plan_type = self.request.query_params.get('plan_type')
        if plan_type:
            queryset = queryset.filter(plan_type=plan_type)
        return queryset

    def perform_create(self, serializer):
        plan = serializer.save()
        AdminActionLog.objects.create(
            admin=self.request.user,
            action_type='create',
            target_model='SubscriptionPlan',
            target_id=plan.id,
            description=f'ایجاد پلن {plan.plan_name}'
        )


class AdminSubscriptionPlanDetailView(generics.RetrieveUpdateDestroyAPIView):
    """جزئیات، ویرایش و حذف پلن اشتراک"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = AdminSubscriptionPlanSerializer
    queryset = SubscriptionPlan.objects.all()

    def perform_update(self, serializer):
        plan = serializer.save()
        AdminActionLog.objects.create(
            admin=self.request.user,
            action_type='update',
            target_model='SubscriptionPlan',
            target_id=plan.id,
            description=f'به‌روزرسانی پلن {plan.plan_name}'
        )

    def perform_destroy(self, instance):
        # بررسی وجود اشتراک فعال برای این پلن
        if instance.user_subscriptions.filter(is_active=True).exists():
            return Response(
                {'error': 'این پلن دارای اشتراک فعال است. ابتدا اشتراک‌ها را غیرفعال کنید.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        AdminActionLog.objects.create(
            admin=self.request.user,
            action_type='delete',
            target_model='SubscriptionPlan',
            target_id=instance.id,
            description=f'حذف پلن {instance.plan_name}'
        )
        instance.delete()


# ================================
# ۹. مدیریت تنظیمات سیستم - نسخه نهایی با ViewSet + پشتیبانی از روش قبلی
# ================================

# ===== قسمت ۱: ViewSet جدید برای تنظیمات =====
class SystemSettingViewSet(viewsets.ModelViewSet):
    """
    ViewSet برای مدیریت تنظیمات سیستم
    """
    queryset = SystemSetting.objects.all()
    serializer_class = AdminSystemSettingSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['setting_key', 'description']
    ordering_fields = ['setting_key']
    ordering = ['setting_key']

    @action(detail=False, methods=['put', 'post', 'patch'], url_path='update')
    def update_settings(self, request):
        """
        به‌روزرسانی دسته‌ای تنظیمات
        پشتیبانی از PUT, POST, PATCH
        """
        data = request.data
        updated = []
        errors = []
        created = []

        logger.info("=" * 60)
        logger.info("📥 RECEIVED SETTINGS UPDATE (ViewSet)")
        logger.info(f"📥 Method: {request.method}")
        logger.info(f"📥 All keys: {list(data.keys())}")
        logger.info(f"📥 gapgpt_api_key: {data.get('gapgpt_api_key', 'NOT FOUND')}")
        logger.info("=" * 60)

        for key, value in data.items():
            try:
                # تبدیل boolean به string
                if isinstance(value, bool):
                    value = str(value).lower()

                try:
                    setting = SystemSetting.objects.get(setting_key=key)
                    if setting.is_editable:
                        setting.setting_value = str(value)
                        setting.save()
                        updated.append(key)
                        logger.info(f"✅ Updated setting: {key} = {value}")
                    else:
                        errors.append(f"{key}: قابل ویرایش نیست")
                except SystemSetting.DoesNotExist:
                    # اگر تنظیم وجود ندارد، ایجاد کن
                    setting = SystemSetting.objects.create(
                        setting_key=key,
                        setting_value=str(value),
                        setting_type='string',
                        description=f'تنظیم {key}',
                        is_editable=True
                    )
                    created.append(key)
                    logger.info(f"✅ Created setting: {key} = {value}")

            except Exception as e:
                errors.append(f"{key}: {str(e)}")
                logger.error(f"❌ Error updating {key}: {str(e)}")

        # ثبت لاگ
        try:
            AdminActionLog.objects.create(
                admin=request.user,
                action_type='update',
                target_model='SystemSetting',
                description=f'به‌روزرسانی {len(updated)} تنظیم، ایجاد {len(created)} تنظیم جدید'
            )
        except Exception as e:
            logger.error(f"❌ Error creating AdminActionLog: {str(e)}")

        return Response({
            'message': f'{len(updated)} تنظیم به‌روزرسانی و {len(created)} تنظیم جدید ایجاد شد',
            'updated': updated,
            'created': created,
            'errors': errors if errors else None,
            'method': request.method
        })


# ===== قسمت ۲: کلاس قبلی برای لیست تنظیمات =====
class AdminSettingsListView(generics.ListAPIView):
    """لیست تنظیمات سیستم"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = AdminSystemSettingSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['setting_key', 'description']
    ordering_fields = ['setting_key']
    ordering = ['setting_key']

    def get_queryset(self):
        return SystemSetting.objects.all()


# ===== قسمت ۳: کلاس پشتیبان برای سازگاری با مسیر قبلی =====
@method_decorator(csrf_exempt, name='dispatch')
class AdminSettingsUpdateView(APIView):
    """به‌روزرسانی تنظیمات (دسته‌ای) - نسخه پشتیبان برای سازگاری"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def put(self, request):
        return self._update_settings(request)

    def post(self, request):
        return self._update_settings(request)

    def patch(self, request):
        return self._update_settings(request)

    def _update_settings(self, request):
        """هسته اصلی به‌روزرسانی تنظیمات - نسخه پشتیبان"""
        data = request.data
        updated = []
        errors = []
        created = []

        logger.info("=" * 60)
        logger.info("📥 RECEIVED SETTINGS UPDATE (Fallback)")
        logger.info(f"📥 Method: {request.method}")
        logger.info(f"📥 All keys: {list(data.keys())}")
        logger.info(f"📥 gapgpt_api_key: {data.get('gapgpt_api_key', 'NOT FOUND')}")
        logger.info("=" * 60)

        for key, value in data.items():
            try:
                # تبدیل boolean به string
                if isinstance(value, bool):
                    value = str(value).lower()

                try:
                    setting = SystemSetting.objects.get(setting_key=key)
                    if setting.is_editable:
                        setting.setting_value = str(value)
                        setting.save()
                        updated.append(key)
                        logger.info(f"✅ Updated setting: {key} = {value}")
                    else:
                        errors.append(f"{key}: قابل ویرایش نیست")
                except SystemSetting.DoesNotExist:
                    # اگر تنظیم وجود ندارد، ایجاد کن
                    setting = SystemSetting.objects.create(
                        setting_key=key,
                        setting_value=str(value),
                        setting_type='string',
                        description=f'تنظیم {key}',
                        is_editable=True
                    )
                    created.append(key)
                    logger.info(f"✅ Created setting: {key} = {value}")

            except Exception as e:
                errors.append(f"{key}: {str(e)}")
                logger.error(f"❌ Error updating {key}: {str(e)}")

        # ثبت لاگ
        try:
            AdminActionLog.objects.create(
                admin=request.user,
                action_type='update',
                target_model='SystemSetting',
                description=f'به‌روزرسانی {len(updated)} تنظیم، ایجاد {len(created)} تنظیم جدید'
            )
        except Exception as e:
            logger.error(f"❌ Error creating AdminActionLog: {str(e)}")

        return Response({
            'message': f'{len(updated)} تنظیم به‌روزرسانی و {len(created)} تنظیم جدید ایجاد شد',
            'updated': updated,
            'created': created,
            'errors': errors if errors else None,
            'method': request.method
        })


# ================================
# ۱۰. مدیریت پیام‌های کاربران - توسعه کامل
# ================================
class AdminMessageListView(generics.ListAPIView):
    """لیست پیام‌های کاربران"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = AdminUserMessageSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['user__phone_number', 'subject', 'message']
    ordering_fields = ['created_at', 'is_read', 'is_replied']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = UserMessage.objects.all()

        is_read = self.request.query_params.get('is_read')
        if is_read is not None:
            queryset = queryset.filter(is_read=is_read.lower() == 'true')

        is_replied = self.request.query_params.get('is_replied')
        if is_replied is not None:
            queryset = queryset.filter(is_replied=is_replied.lower() == 'true')

        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)

        date_from = self.request.query_params.get('date_from')
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
        date_to = self.request.query_params.get('date_to')
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)

        return queryset


class AdminMessageDetailView(generics.RetrieveAPIView):
    """جزئیات پیام"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = AdminUserMessageSerializer
    queryset = UserMessage.objects.all()


class AdminMessageReplyView(APIView):
    """پاسخ به پیام کاربر"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def post(self, request, pk):
        try:
            message = UserMessage.objects.get(id=pk)
            serializer = AdminMessageReplySerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            reply = serializer.validated_data['reply_message']
            send_sms = serializer.validated_data.get('send_sms', True)

            message.reply(reply, admin=request.user)

            AdminActionLog.objects.create(
                admin=request.user,
                action_type='update',
                target_model='UserMessage',
                target_id=message.id,
                description=f'پاسخ به پیام کاربر {message.user.phone_number}'
            )

            # ارسال پیامک
            if send_sms:
                try:
                    sms = GhasedakSMS()
                    sms.send_sms(
                        message.user.phone_number,
                        f"پاسخ به پیام شما در ژورنال ترید:\n{reply[:200]}"
                    )
                except Exception as e:
                    logger.error(f"Error sending reply SMS: {str(e)}")

            return Response({
                'message': 'پاسخ با موفقیت ارسال شد',
                'reply': reply
            })
        except UserMessage.DoesNotExist:
            return Response({'error': 'پیام یافت نشد'}, status=status.HTTP_404_NOT_FOUND)


class AdminMessageDeleteView(APIView):
    """حذف پیام کاربر"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def delete(self, request, pk):
        try:
            message = UserMessage.objects.get(id=pk)
            message.delete()
            AdminActionLog.objects.create(
                admin=request.user,
                action_type='delete',
                target_model='UserMessage',
                target_id=pk,
                description=f'حذف پیام کاربر {message.user.phone_number}'
            )
            return Response({'message': 'پیام با موفقیت حذف شد'})
        except UserMessage.DoesNotExist:
            return Response({'error': 'پیام یافت نشد'}, status=status.HTTP_404_NOT_FOUND)


# ================================
# ۱۱. مدیریت تریدها (ادمین) - جدید
# ================================
class AdminTradeListView(generics.ListAPIView):
    """لیست تریدها با فیلترهای پیشرفته"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = AdminTradeSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['user__phone_number', 'symbol']
    ordering_fields = ['trade_date', 'profit', 'created_at']
    ordering = ['-trade_date']

    def get_queryset(self):
        queryset = Trade.objects.filter(is_deleted=False)

        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)

        symbol = self.request.query_params.get('symbol')
        if symbol:
            queryset = queryset.filter(symbol__icontains=symbol)

        trade_type = self.request.query_params.get('trade_type')
        if trade_type:
            queryset = queryset.filter(trade_type=trade_type)

        date_from = self.request.query_params.get('date_from')
        if date_from:
            queryset = queryset.filter(trade_date__gte=date_from)
        date_to = self.request.query_params.get('date_to')
        if date_to:
            queryset = queryset.filter(trade_date__lte=date_to)

        min_profit = self.request.query_params.get('min_profit')
        if min_profit:
            queryset = queryset.filter(profit__gte=min_profit)
        max_profit = self.request.query_params.get('max_profit')
        if max_profit:
            queryset = queryset.filter(profit__lte=max_profit)

        return queryset


class AdminTradeDetailView(generics.RetrieveAPIView):
    """جزئیات کامل ترید"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = AdminTradeSerializer
    queryset = Trade.objects.filter(is_deleted=False)


class AdminTradeDeleteView(APIView):
    """حذف ترید (ادمین)"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def delete(self, request, pk):
        try:
            trade = Trade.objects.get(id=pk)
            trade.is_deleted = True
            trade.save()
            AdminActionLog.objects.create(
                admin=request.user,
                action_type='delete',
                target_model='Trade',
                target_id=pk,
                description=f'حذف ترید {trade.symbol} از کاربر {trade.user.phone_number}'
            )
            return Response({'message': 'ترید با موفقیت حذف شد'})
        except Trade.DoesNotExist:
            return Response({'error': 'ترید یافت نشد'}, status=status.HTTP_404_NOT_FOUND)


class AdminTradesExportView(APIView):
    """خروجی اکسل تریدها"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get(self, request):
        trades = Trade.objects.filter(is_deleted=False)

        user_id = request.query_params.get('user_id')
        if user_id:
            trades = trades.filter(user_id=user_id)

        date_from = request.query_params.get('date_from')
        if date_from:
            trades = trades.filter(trade_date__gte=date_from)
        date_to = request.query_params.get('date_to')
        if date_to:
            trades = trades.filter(trade_date__lte=date_to)

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            'تاریخ', 'کاربر', 'نماد', 'نوع', 'دسته‌بندی', 'قیمت ورود', 'قیمت خروج',
            'حد ضرر', 'حد سود', 'R:R', 'سود/زیان', 'کیفیت اجرا'
        ])

        for trade in trades:
            writer.writerow([
                trade.trade_date,
                trade.user.phone_number,
                trade.symbol,
                trade.trade_type,
                trade.group.group_name if trade.group else '-',
                trade.entry_price,
                trade.close_price,
                trade.stop_loss,
                trade.take_profit_1,
                trade.risk_reward_ratio,
                trade.profit,
                trade.execution_quality_score
            ])

        response = HttpResponse(output.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="trades_export_{datetime.now().strftime("%Y%m%d")}.csv"'
        return response


# ================================
# ۱۲. خروجی‌های اکسل عمومی
# ================================
class ExportUsersExcelView(APIView):
    """خروجی اکسل کاربران"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get(self, request):
        users = User.objects.all()
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            'شماره تلفن', 'نام', 'نام خانوادگی', 'ایمیل',
            'تایید شده', 'فعال', 'ادمین', 'اشتراک فعال', 'تاریخ ثبت'
        ])

        for user in users:
            writer.writerow([
                user.phone_number,
                user.first_name,
                user.last_name,
                user.email,
                'بله' if user.is_verified else 'خیر',
                'بله' if user.is_active else 'خیر',
                'بله' if user.is_admin else 'خیر',
                'بله' if user.has_active_subscription() else 'خیر',
                user.created_at.strftime('%Y/%m/%d')
            ])

        response = HttpResponse(output.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="users_export_{datetime.now().strftime("%Y%m%d")}.csv"'
        return response


class ExportSubscriptionsExcelView(APIView):
    """خروجی اکسل اشتراک‌ها"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get(self, request):
        subscriptions = UserSubscription.objects.all()
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            'کاربر', 'پلن', 'تاریخ شروع', 'تاریخ پایان', 'روزهای باقیمانده',
            'فعال', 'آزمایشی', 'وضعیت پرداخت', 'مبلغ'
        ])

        for sub in subscriptions:
            writer.writerow([
                sub.user.phone_number,
                sub.plan.plan_name if sub.plan else '-',
                sub.start_date.strftime('%Y/%m/%d'),
                sub.end_date.strftime('%Y/%m/%d'),
                sub.get_remaining_days(),
                'بله' if sub.is_active else 'خیر',
                'بله' if sub.is_trial else 'خیر',
                sub.payment_status,
                float(sub.amount_paid)
            ])

        response = HttpResponse(output.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="subscriptions_export_{datetime.now().strftime("%Y%m%d")}.csv"'
        return response


# ================================
# مدیریت پورتفولیوها (ادمین)
# ================================
class AdminPortfolioListView(generics.ListCreateAPIView):
    """لیست و ایجاد پورتفولیو برای ادمین"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = AdminPortfolioSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'user__phone_number', 'user__first_name', 'user__last_name']
    ordering_fields = ['created_at', 'name']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = Portfolio.objects.all().select_related('user')
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        return queryset


class AdminPortfolioDetailView(generics.RetrieveUpdateDestroyAPIView):
    """جزئیات، ویرایش و حذف پورتفولیو برای ادمین"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = AdminPortfolioSerializer
    queryset = Portfolio.objects.all()


# ================================
# مدیریت بروکرها (کارگزاران) - جدید
# ================================
class AdminBrokerListView(generics.ListCreateAPIView):
    """لیست و ایجاد بروکر"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = AdminBrokerSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['name', 'category', 'order_index']
    ordering = ['category', 'order_index', 'name']

    def get_queryset(self):
        queryset = Broker.objects.all()
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        return queryset

    def perform_create(self, serializer):
        broker = serializer.save()
        AdminActionLog.objects.create(
            admin=self.request.user,
            action_type='create',
            target_model='Broker',
            target_id=broker.id,
            description=f'ایجاد بروکر {broker.name}'
        )


class AdminBrokerDetailView(generics.RetrieveUpdateDestroyAPIView):
    """جزئیات، ویرایش و حذف بروکر"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = AdminBrokerSerializer
    queryset = Broker.objects.all()

    def perform_update(self, serializer):
        broker = serializer.save()
        AdminActionLog.objects.create(
            admin=self.request.user,
            action_type='update',
            target_model='Broker',
            target_id=broker.id,
            description=f'به‌روزرسانی بروکر {broker.name}'
        )

    def perform_destroy(self, instance):
        AdminActionLog.objects.create(
            admin=self.request.user,
            action_type='delete',
            target_model='Broker',
            target_id=instance.id,
            description=f'حذف بروکر {instance.name}'
        )
        instance.delete()