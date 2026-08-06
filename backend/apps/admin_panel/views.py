from rest_framework import status, generics, permissions, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.db.models import Q, Sum, Count, Avg
from django.db.models.functions import TruncDate, TruncMonth
from django.shortcuts import get_object_or_404
from django.http import HttpResponse
import csv
import io
from datetime import datetime, timedelta
import logging

from apps.accounts.models import User
from apps.accounts.serializers import UserSerializer
from apps.subscriptions.models import SubscriptionPlan, UserSubscription, DiscountCode, Transaction
from apps.subscriptions.serializers import SubscriptionPlanSerializer
from apps.trading.models import Trade, TradeGroup
from apps.messaging.models import UserMessage, SystemMessage, SupportInfo
from apps.messaging.serializers import SystemMessageSerializer, SupportInfoSerializer

from .models import AdminActionLog
from .serializers import (
    AdminUserSerializer,
    AdminUserUpdateSerializer,
    AdminSubscriptionSerializer,
    AdminPlanSerializer,
    AdminDiscountSerializer,
    AdminDashboardSerializer,
    AdminSalesReportSerializer,
    AdminActionLogSerializer
)
from apps.accounts.permissions import IsAdminUser

logger = logging.getLogger(__name__)


# ============ داشبورد ادمین ============
class AdminDashboardView(APIView):
    """داشبورد اصلی ادمین"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get(self, request):
        now = timezone.now()
        today = now.date()
        start_of_day = timezone.make_aware(datetime.combine(today, datetime.min.time()))

        # آمار کاربران
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        new_users_today = User.objects.filter(created_at__gte=start_of_day).count()

        # آمار اشتراک‌ها
        total_subscriptions = UserSubscription.objects.count()
        active_subscriptions = UserSubscription.objects.filter(
            is_active=True,
            end_date__gt=now
        ).count()

        # اشتراک‌های در حال انقضا (کمتر از 7 روز)
        expiring_soon = UserSubscription.objects.filter(
            is_active=True,
            end_date__gt=now,
            end_date__lte=now + timedelta(days=7)
        ).count()

        # آمار تریدها
        total_trades = Trade.objects.filter(is_deleted=False).count()
        trades_today = Trade.objects.filter(
            is_deleted=False,
            created_at__gte=start_of_day
        ).count()

        # آمار مالی
        total_revenue = Transaction.objects.filter(
            payment_status='paid'
        ).aggregate(Sum('total_amount'))['total_amount__sum'] or 0

        revenue_today = Transaction.objects.filter(
            payment_status='paid',
            created_at__gte=start_of_day
        ).aggregate(Sum('total_amount'))['total_amount__sum'] or 0

        # پیام‌های خوانده نشده
        pending_messages = UserMessage.objects.filter(
            is_read=False
        ).count()

        # لاگ‌های اخیر
        recent_logs = AdminActionLog.objects.all().order_by('-created_at')[:10]

        return Response({
            'total_users': total_users,
            'active_users': active_users,
            'new_users_today': new_users_today,
            'total_subscriptions': total_subscriptions,
            'active_subscriptions': active_subscriptions,
            'expiring_subscriptions': expiring_soon,
            'total_trades': total_trades,
            'trades_today': trades_today,
            'total_revenue': float(total_revenue),
            'revenue_today': float(revenue_today),
            'pending_messages': pending_messages,
            'recent_logs': AdminActionLogSerializer(recent_logs, many=True).data
        })


# ============ مدیریت کاربران ============
class AdminUserListView(generics.ListAPIView):
    """لیست کاربران (ادمین)"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = AdminUserSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['phone_number', 'first_name', 'last_name', 'email']
    ordering_fields = ['created_at', 'last_login', 'id']
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

        return queryset


class AdminUserDetailView(generics.RetrieveAPIView):
    """جزئیات کاربر (ادمین)"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = AdminUserSerializer
    queryset = User.objects.all()


class AdminUserUpdateView(generics.UpdateAPIView):
    """ویرایش کاربر (ادمین)"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = AdminUserUpdateSerializer
    queryset = User.objects.all()

    def perform_update(self, serializer):
        user = self.get_object()
        serializer.save()

        # ثبت لاگ
        AdminActionLog.objects.create(
            admin=self.request.user,
            action_type='update',
            target_model='User',
            target_id=user.id,
            description=f'به‌روزرسانی کاربر {user.phone_number}'
        )


class AdminUserToggleView(APIView):
    """فعال/غیرفعال کردن کاربر (ادمین)"""
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
            return Response(
                {'error': 'کاربر یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )


class AdminUserDeleteView(APIView):
    """حذف کاربر (ادمین)"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def delete(self, request, pk):
        try:
            user = User.objects.get(id=pk)

            if user.is_admin:
                return Response(
                    {'error': 'امکان حذف کاربر ادمین وجود ندارد'},
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
            return Response(
                {'error': 'کاربر یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )


# ============ مدیریت اشتراک‌ها ============
class AdminSubscriptionListView(generics.ListAPIView):
    """لیست اشتراک‌ها (ادمین)"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = AdminSubscriptionSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['user__phone_number', 'user__first_name', 'user__last_name']
    ordering_fields = ['created_at', 'end_date', 'start_date']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = UserSubscription.objects.all()

        # فیلتر بر اساس وضعیت
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        is_trial = self.request.query_params.get('is_trial')
        if is_trial is not None:
            queryset = queryset.filter(is_trial=is_trial.lower() == 'true')

        payment_status = self.request.query_params.get('payment_status')
        if payment_status:
            queryset = queryset.filter(payment_status=payment_status)

        return queryset


class AdminSubscriptionDetailView(generics.RetrieveAPIView):
    """جزئیات اشتراک (ادمین)"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = AdminSubscriptionSerializer
    queryset = UserSubscription.objects.all()


class AdminSubscriptionExtendView(APIView):
    """تمدید اشتراک (ادمین)"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def post(self, request, pk):
        try:
            subscription = UserSubscription.objects.get(id=pk)
            additional_days = request.data.get('additional_days', 30)

            # تمدید
            subscription.end_date = subscription.end_date + timedelta(days=additional_days)
            subscription.is_active = True
            subscription.save()

            AdminActionLog.objects.create(
                admin=request.user,
                action_type='extend_subscription',
                target_model='UserSubscription',
                target_id=subscription.id,
                description=f'تمدید اشتراک کاربر {subscription.user.phone_number} به مدت {additional_days} روز'
            )

            return Response({
                'message': 'اشتراک با موفقیت تمدید شد',
                'new_end_date': subscription.end_date,
                'remaining_days': subscription.get_remaining_days()
            })
        except UserSubscription.DoesNotExist:
            return Response(
                {'error': 'اشتراک یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )


class AdminSubscriptionCancelView(APIView):
    """لغو اشتراک (ادمین)"""
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
            return Response(
                {'error': 'اشتراک یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )


# ============ مدیریت پلن‌ها ============
class AdminPlanListView(generics.ListCreateAPIView):
    """لیست و ایجاد پلن (ادمین)"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = AdminPlanSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['plan_name']
    ordering_fields = ['price', 'duration_days']
    ordering = ['price']

    def get_queryset(self):
        return SubscriptionPlan.objects.all()

    def perform_create(self, serializer):
        plan = serializer.save()
        AdminActionLog.objects.create(
            admin=self.request.user,
            action_type='create',
            target_model='SubscriptionPlan',
            target_id=plan.id,
            description=f'ایجاد پلن جدید {plan.plan_name}'
        )


class AdminPlanDetailView(generics.RetrieveUpdateAPIView):
    """جزئیات و ویرایش پلن (ادمین)"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = AdminPlanSerializer
    queryset = SubscriptionPlan.objects.all()


class AdminPlanCreateView(generics.CreateAPIView):
    """ایجاد پلن جدید (ادمین)"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = AdminPlanSerializer

    def perform_create(self, serializer):
        plan = serializer.save()
        AdminActionLog.objects.create(
            admin=self.request.user,
            action_type='create',
            target_model='SubscriptionPlan',
            target_id=plan.id,
            description=f'ایجاد پلن جدید {plan.plan_name}'
        )


class AdminPlanUpdateView(generics.UpdateAPIView):
    """به‌روزرسانی پلن (ادمین)"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = AdminPlanSerializer
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


class AdminPlanDeleteView(APIView):
    """حذف پلن (ادمین)"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def delete(self, request, pk):
        try:
            plan = SubscriptionPlan.objects.get(id=pk)
            plan_name = plan.plan_name

            # بررسی وجود اشتراک‌های فعال
            if plan.subscriptions.filter(is_active=True).exists():
                return Response(
                    {'error': 'این پلن دارای اشتراک فعال است و قابل حذف نمی‌باشد'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            plan.delete()

            AdminActionLog.objects.create(
                admin=request.user,
                action_type='delete',
                target_model='SubscriptionPlan',
                target_id=pk,
                description=f'حذف پلن {plan_name}'
            )

            return Response({'message': 'پلن با موفقیت حذف شد'})
        except SubscriptionPlan.DoesNotExist:
            return Response(
                {'error': 'پلن یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )


# ============ مدیریت کدهای تخفیف ============
class AdminDiscountListView(generics.ListCreateAPIView):
    """لیست و ایجاد کد تخفیف (ادمین)"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = AdminDiscountSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code']
    ordering_fields = ['created_at', 'discount_percent']
    ordering = ['-created_at']

    def get_queryset(self):
        return DiscountCode.objects.all()

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
    """جزئیات و ویرایش کد تخفیف (ادمین)"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = AdminDiscountSerializer
    queryset = DiscountCode.objects.all()


class AdminDiscountCreateView(generics.CreateAPIView):
    """ایجاد کد تخفیف جدید (ادمین)"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = AdminDiscountSerializer

    def perform_create(self, serializer):
        discount = serializer.save()
        AdminActionLog.objects.create(
            admin=self.request.user,
            action_type='create',
            target_model='DiscountCode',
            target_id=discount.id,
            description=f'ایجاد کد تخفیف {discount.code}'
        )


class AdminDiscountUpdateView(generics.UpdateAPIView):
    """به‌روزرسانی کد تخفیف (ادمین)"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = AdminDiscountSerializer
    queryset = DiscountCode.objects.all()

    def perform_update(self, serializer):
        discount = serializer.save()
        AdminActionLog.objects.create(
            admin=self.request.user,
            action_type='update',
            target_model='DiscountCode',
            target_id=discount.id,
            description=f'به‌روزرسانی کد تخفیف {discount.code}'
        )


class AdminDiscountDeleteView(APIView):
    """حذف کد تخفیف (ادمین)"""
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

            return Response({'message': 'کد تخفیف با موفقیت حذف شد.'})
        except DiscountCode.DoesNotExist:
            return Response(
                {'error': 'کد تخفیف یافت نشد.'},
                status=status.HTTP_404_NOT_FOUND
            )


# ============ مدیریت پیام‌های کاربران ============
class AdminMessageListView(generics.ListAPIView):
    """لیست پیام‌های کاربران (ادمین)"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = AdminUserSerializer  # از سریالایزر مناسب استفاده کنید
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['user__phone_number', 'subject', 'message']
    ordering_fields = ['created_at', 'is_read']
    ordering = ['-created_at']

    def get_queryset(self):
        return UserMessage.objects.all()


class AdminMessageDetailView(generics.RetrieveAPIView):
    """جزئیات پیام (ادمین)"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = AdminUserSerializer  # از سریالایزر مناسب استفاده کنید
    queryset = UserMessage.objects.all()


class AdminMessageReplyView(APIView):
    """پاسخ به پیام کاربر (ادمین)"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def post(self, request, pk):
        try:
            message = UserMessage.objects.get(id=pk)
            reply = request.data.get('reply_message')

            if not reply:
                return Response(
                    {'error': 'متن پاسخ الزامی است'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            message.reply(reply)

            AdminActionLog.objects.create(
                admin=request.user,
                action_type='update',
                target_model='UserMessage',
                target_id=message.id,
                description=f'پاسخ به پیام کاربر {message.user.phone_number}'
            )

            # ارسال پیامک به کاربر
            try:
                from apps.subscriptions.sms import GhasedakSMS
                sms = GhasedakSMS()
                sms.send_sms(
                    message.user.phone_number,
                    f"پاسخ به پیام شما:\n{reply[:200]}"
                )
            except Exception as e:
                logger.error(f"Error sending reply SMS: {str(e)}")

            return Response({
                'message': 'پاسخ با موفقیت ارسال شد',
                'reply': reply
            })
        except UserMessage.DoesNotExist:
            return Response(
                {'error': 'پیام یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )


class AdminMessageDeleteView(APIView):
    """حذف پیام کاربر (ادمین)"""
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
            return Response(
                {'error': 'پیام یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )


# ============ گزارشات فروش ============
class AdminSalesReportView(APIView):
    """گزارش فروش (ادمین)"""
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
        else:  # yearly
            start_date = now - timedelta(days=365 * 5)
            group_by = TruncMonth('created_at')

        # دریافت تراکنش‌های پرداخت شده
        transactions = Transaction.objects.filter(
            payment_status='paid',
            created_at__gte=start_date
        )

        # اطلاعات کلی
        total_sales = transactions.count()
        total_revenue = transactions.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        avg_price = transactions.aggregate(Avg('total_amount'))['total_amount__avg'] or 0

        # تفکیک بر اساس پلن
        plan_breakdown = []
        plans = SubscriptionPlan.objects.all()
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

        return Response({
            'period': period,
            'total_sales': total_sales,
            'total_revenue': float(total_revenue),
            'average_price': float(avg_price),
            'plan_breakdown': plan_breakdown,
            'daily_data': list(daily_data)
        })


class AdminSalesExportView(APIView):
    """خروجی گزارش فروش (ادمین)"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get(self, request):
        # دریافت داده‌ها
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        transactions = Transaction.objects.filter(payment_status='paid')

        if start_date:
            transactions = transactions.filter(created_at__gte=start_date)
        if end_date:
            transactions = transactions.filter(created_at__lte=end_date)

        # ایجاد فایل CSV
        output = io.StringIO()
        writer = csv.writer(output)

        # هدر
        writer.writerow([
            'تاریخ', 'کاربر', 'پلن', 'مبلغ', 'مالیات', 'مبلغ کل', 'وضعیت'
        ])

        # داده‌ها
        for t in transactions:
            writer.writerow([
                t.created_at.strftime('%Y/%m/%d %H:%M'),
                t.user.phone_number,
                t.subscription.plan.plan_name if t.subscription and t.subscription.plan else '-',
                float(t.amount),
                float(t.vat_amount),
                float(t.total_amount),
                t.payment_status
            ])

        response = HttpResponse(output.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="sales_report.csv"'
        return response


class AdminMonthlySalesView(APIView):
    """گزارش فروش ماهانه (ادمین)"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get(self, request):
        year = int(request.query_params.get('year', timezone.now().year))

        monthly_data = []
        for month in range(1, 13):
            start_date = timezone.datetime(year, month, 1)
            if month == 12:
                end_date = timezone.datetime(year + 1, 1, 1)
            else:
                end_date = timezone.datetime(year, month + 1, 1)

            transactions = Transaction.objects.filter(
                payment_status='paid',
                created_at__gte=start_date,
                created_at__lt=end_date
            )

            count = transactions.count()
            revenue = transactions.aggregate(Sum('total_amount'))['total_amount__sum'] or 0

            monthly_data.append({
                'month': month,
                'month_name': timezone.datetime(year, month, 1).strftime('%B'),
                'count': count,
                'revenue': float(revenue)
            })

        return Response(monthly_data)


# ============ خروجی‌های اکسل ============
class ExportUsersExcelView(APIView):
    """خروجی اکسل کاربران (ادمین)"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get(self, request):
        users = User.objects.all()

        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow([
            'شماره تلفن', 'نام', 'نام خانوادگی', 'ایمیل',
            'تایید شده', 'فعال', 'ادمین', 'تاریخ ثبت'
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
                user.created_at.strftime('%Y/%m/%d')
            ])

        response = HttpResponse(output.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="users_export.csv"'
        return response


class ExportSubscriptionsExcelView(APIView):
    """خروجی اکسل اشتراک‌ها (ادمین)"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get(self, request):
        subscriptions = UserSubscription.objects.all()

        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow([
            'کاربر', 'پلن', 'تاریخ شروع', 'تاریخ پایان',
            'فعال', 'آزمایشی', 'وضعیت پرداخت', 'مبلغ'
        ])

        for sub in subscriptions:
            writer.writerow([
                sub.user.phone_number,
                sub.plan.plan_name if sub.plan else '-',
                sub.start_date.strftime('%Y/%m/%d'),
                sub.end_date.strftime('%Y/%m/%d'),
                'بله' if sub.is_active else 'خیر',
                'بله' if sub.is_trial else 'خیر',
                sub.payment_status,
                float(sub.amount_paid)
            ])

        response = HttpResponse(output.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="subscriptions_export.csv"'
        return response


class ExportSalesExcelView(APIView):
    """خروجی اکسل فروش (ادمین)"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get(self, request):
        transactions = Transaction.objects.filter(payment_status='paid')

        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow([
            'تاریخ', 'کاربر', 'پلن', 'مبلغ', 'مالیات', 'مبلغ کل'
        ])

        for t in transactions:
            writer.writerow([
                t.created_at.strftime('%Y/%m/%d %H:%M'),
                t.user.phone_number,
                t.subscription.plan.plan_name if t.subscription and t.subscription.plan else '-',
                float(t.amount),
                float(t.vat_amount),
                float(t.total_amount)
            ])

        response = HttpResponse(output.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="sales_export.csv"'
        return response


# ============ تنظیمات سیستم ============
class AdminSettingsView(APIView):
    """مشاهده تنظیمات سیستم (ادمین)"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get(self, request):
        from apps.accounts.models import SystemSetting
        settings = SystemSetting.objects.all()

        data = []
        for setting in settings:
            data.append({
                'key': setting.setting_key,
                'value': setting.setting_value,
                'type': setting.setting_type,
                'description': setting.description,
                'is_editable': setting.is_editable
            })

        return Response(data)


class AdminSettingsUpdateView(APIView):
    """به‌روزرسانی تنظیمات سیستم (ادمین)"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def put(self, request):
        from apps.accounts.models import SystemSetting

        data = request.data
        updated = []

        for key, value in data.items():
            try:
                setting = SystemSetting.objects.get(setting_key=key)
                if setting.is_editable:
                    setting.setting_value = str(value)
                    setting.save()
                    updated.append(key)
            except SystemSetting.DoesNotExist:
                pass

        AdminActionLog.objects.create(
            admin=request.user,
            action_type='update',
            target_model='SystemSetting',
            description=f'به‌روزرسانی {len(updated)} تنظیم سیستم'
        )

        return Response({
            'message': f'{len(updated)} تنظیم با موفقیت به‌روزرسانی شد',
            'updated': updated
        })