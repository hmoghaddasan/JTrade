# backend/apps/sms/admin_views.py
"""
API Views ادمین برای سیستم پیامک
مسیر پایه: /api/admin/sms/
"""

from datetime import timedelta
from django.utils import timezone
from django.db.models import Count, Q, Sum
from rest_framework import generics, permissions, status, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from apps.accounts.permissions import IsAdminUser
from apps.accounts.models import User

from .models import (
    SmsProviderConfig, SmsMessage, SmsInbox, SmsTemplate, SmsErrorLog
)
from .serializers import (
    SmsProviderConfigSerializer,
    SmsMessageSerializer,
    SmsInboxSerializer,
    SmsTemplateSerializer,
    SmsSendSerializer,
    SmsStatsSerializer,
)
from .services import SmsService
from .providers import GhasedakProvider, SmsIrProvider


# ============================================
# ۱. Providers
# ============================================
class AdminProviderListView(generics.ListAPIView):
    """لیست provider ها"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = SmsProviderConfigSerializer
    queryset = SmsProviderConfig.objects.all().order_by('provider')


class AdminProviderDetailView(generics.RetrieveUpdateAPIView):
    """جزئیات و ویرایش provider"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = SmsProviderConfigSerializer
    queryset = SmsProviderConfig.objects.all()

    def perform_update(self, serializer):
        instance = serializer.save()
        # اگر api_key یا line_number تغییر کرد، is_configured را به‌روز کن
        if instance.api_key and instance.line_number:
            instance.is_configured = True
            instance.save()


class AdminProviderActivateView(APIView):
    """فعال‌سازی provider"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def post(self, request, pk):
        config = get_object_or_404(SmsProviderConfig, pk=pk)

        # چک تنظیمات
        if not config.api_key or not config.line_number:
            return Response(
                {'error': 'ابتدا کلید API و شماره خط را تنظیم کنید'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # غیرفعال کردن بقیه
        SmsProviderConfig.objects.exclude(pk=pk).update(is_active=False)
        config.is_active = True
        config.save()

        return Response({
            'message': f'provider {config.provider_display} فعال شد',
            'provider': SmsProviderConfigSerializer(config).data,
        })


class AdminProviderTestView(APIView):
    """تست اتصال provider"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def post(self, request, pk):
        config = get_object_or_404(SmsProviderConfig, pk=pk)

        try:
            if config.provider == 'ghasedak':
                provider = GhasedakProvider(
                    api_key=config.api_key,
                    line_number=config.line_number,
                )
            else:
                provider = SmsIrProvider(
                    api_key=config.api_key,
                    line_number=config.line_number,
                    otp_template_id=None,
                )

            result = provider.test_connection()

            # ذخیره آخرین بررسی
            config.last_checked_at = timezone.now()
            if result.get('credit'):
                config.credit = result['credit']
            config.save()

            return Response(result)
        except Exception as e:
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class AdminProviderRefreshCreditView(APIView):
    """بروزرسانی اعتبار provider"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def post(self, request, pk):
        config = get_object_or_404(SmsProviderConfig, pk=pk)

        try:
            if config.provider == 'ghasedak':
                provider = GhasedakProvider(api_key=config.api_key, line_number=config.line_number)
            else:
                provider = SmsIrProvider(api_key=config.api_key, line_number=config.line_number)

            credit_info = provider.get_credit()
            if credit_info:
                config.credit = credit_info.credit
                config.last_checked_at = timezone.now()
                config.save()
                return Response({'success': True, 'credit': credit_info.credit})
            return Response({'success': False, 'error': 'provider اعتبار ندارد'})
        except Exception as e:
            return Response({'success': False, 'error': str(e)})


# ============================================
# ۲. Messages (ارسالی)
# ============================================
class AdminMessageListView(generics.ListAPIView):
    """لیست پیام‌های ارسالی با فیلترهای پیشرفته"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = SmsMessageSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['phone_number', 'message', 'external_id', 'event_key']
    ordering_fields = ['created_at', 'sent_at', 'delivered_at', 'status', 'cost']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = SmsMessage.objects.all().select_related('user')

        provider = self.request.query_params.get('provider')
        if provider:
            queryset = queryset.filter(provider=provider)

        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        event_key = self.request.query_params.get('event_key')
        if event_key:
            queryset = queryset.filter(event_key=event_key)

        send_method = self.request.query_params.get('send_method')
        if send_method:
            queryset = queryset.filter(send_method=send_method)

        phone = self.request.query_params.get('phone')
        if phone:
            queryset = queryset.filter(phone_number__icontains=phone)

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
    """جزئیات کامل پیام"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = SmsMessageSerializer
    queryset = SmsMessage.objects.all()


class AdminMessageCheckStatusView(APIView):
    """بررسی وضعیت یک پیام"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def post(self, request, pk):
        msg = get_object_or_404(SmsMessage, pk=pk)
        service = SmsService()
        result = service._check_single_message(msg)
        msg.refresh_from_db()
        return Response({
            'result': result,
            'message': SmsMessageSerializer(msg).data,
        })


class AdminMessageBulkCheckView(APIView):
    """بررسی گروهی وضعیت پیام‌ها"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def post(self, request):
        batch_size = int(request.data.get('batch_size', 50))
        service = SmsService()
        result = service.check_pending_status(batch_size=batch_size)
        return Response(result)


# ============================================
# ۳. Inbox (دریافتی)
# ============================================
class AdminInboxListView(generics.ListAPIView):
    """لیست پیام‌های دریافتی"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = SmsInboxSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['from_number', 'message']
    ordering_fields = ['received_at', 'created_at', 'is_read']
    ordering = ['-received_at']

    def get_queryset(self):
        queryset = SmsInbox.objects.all().select_related('user')

        provider = self.request.query_params.get('provider')
        if provider:
            queryset = queryset.filter(provider=provider)

        is_read = self.request.query_params.get('is_read')
        if is_read is not None:
            queryset = queryset.filter(is_read=is_read.lower() == 'true')

        is_flagged = self.request.query_params.get('is_flagged')
        if is_flagged is not None:
            queryset = queryset.filter(is_flagged=is_flagged.lower() == 'true')

        from_number = self.request.query_params.get('from_number')
        if from_number:
            queryset = queryset.filter(from_number__icontains=from_number)

        date_from = self.request.query_params.get('date_from')
        if date_from:
            queryset = queryset.filter(received_at__date__gte=date_from)

        date_to = self.request.query_params.get('date_to')
        if date_to:
            queryset = queryset.filter(received_at__date__lte=date_to)

        return queryset


class AdminInboxDetailView(generics.RetrieveAPIView):
    """جزئیات پیام دریافتی"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = SmsInboxSerializer
    queryset = SmsInbox.objects.all()


class AdminInboxMarkReadView(APIView):
    """علامت‌گذاری خوانده شده"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def post(self, request, pk):
        inbox = get_object_or_404(SmsInbox, pk=pk)
        inbox.is_read = True
        inbox.save()
        return Response({'message': 'خوانده شد', 'id': inbox.id})


class AdminInboxFlagView(APIView):
    """علامت‌گذاری مهم"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def post(self, request, pk):
        inbox = get_object_or_404(SmsInbox, pk=pk)
        inbox.is_flagged = not inbox.is_flagged
        inbox.save()
        return Response({'is_flagged': inbox.is_flagged})


class AdminInboxBulkMarkReadView(APIView):
    """علامت‌گذاری گروهی خوانده شده"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def post(self, request):
        ids = request.data.get('ids', [])
        if not ids:
            return Response({'error': 'لیست IDs الزامی است'}, status=400)
        count = SmsInbox.objects.filter(id__in=ids).update(is_read=True)
        return Response({'updated': count})


class AdminInboxFetchView(APIView):
    """دریافت دستی پیام‌های جدید"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def post(self, request):
        service = SmsService()
        result = service.fetch_inbox()
        return Response(result)


# ============================================
# ۴. Send SMS
# ============================================
class AdminSendSmsView(APIView):
    """
    ارسال پیامک دستی از پنل ادمین
    - می‌تواند از قالب استفاده کند (event_key)
    - یا متن آزاد بفرستد
    - به یک کاربر، چند کاربر یا همه
    """
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def post(self, request):
        serializer = SmsSendSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        message_text = data.get('message', '').strip()
        phone_numbers = data.get('phone_numbers', [])
        user_ids = data.get('user_ids', [])
        send_to_all = data.get('send_to_all', False)
        use_template = data.get('use_template', False)
        template_event = data.get('template_event', '')
        template_context = data.get('context', {}) or {}

        # ============================================
        # ✅ اگر context خالی است ولی message فرستاده شده،
        # message را در context بگذار (برای admin_single و admin_bulk)
        # ============================================
        if use_template and not template_context and message_text:
            template_context = {'message': message_text}

        # تعیین لیست گیرندگان
        recipients = []

        if send_to_all:
            users = User.objects.filter(is_active=True, is_verified=True)
            recipients = [u.phone_number for u in users if u.phone_number]
            target_users = list(users)

        elif user_ids:
            users = User.objects.filter(id__in=user_ids, is_active=True)
            recipients = [u.phone_number for u in users if u.phone_number]
            target_users = list(users)

        elif phone_numbers:
            recipients = phone_numbers
            target_users = [User.objects.filter(phone_number=p).first() for p in phone_numbers]

        else:
            return Response({'error': 'گیرنده‌ای انتخاب نشده'}, status=400)

        if not recipients:
            return Response({'error': 'هیچ گیرنده معتبری یافت نشد'}, status=404)

        service = SmsService()

        # ============================================
        # ارسال
        # ============================================
        if use_template and template_event:
            # ===== استفاده از قالب رویداد =====
            results = []
            for i, phone in enumerate(recipients):
                user = target_users[i] if i < len(target_users) else None
                result = service.send_event(
                    event_key=template_event,
                    phone_number=phone,
                    context=template_context,
                    user=user,
                    related_object_type='admin_bulk',
                    priority='high',
                )
                results.append({'phone': phone, 'result': result})
        else:
            # ===== متن آزاد =====
            results = []
            for i, phone in enumerate(recipients):
                user = target_users[i] if i < len(target_users) else None
                # استفاده از رویداد admin_single برای تکی، admin_bulk برای گروهی
                event_key = 'admin_single' if len(recipients) == 1 else 'admin_bulk'

                # context همیشه باید message داشته باشد
                context = {'message': message_text}

                result = service.send_event(
                    event_key=event_key,
                    phone_number=phone,
                    context=context,
                    user=user,
                    related_object_type='admin_bulk',
                    priority='high',
                )
                results.append({'phone': phone, 'result': result})

        # آمار نتیجه
        success_count = sum(1 for r in results if r['result'].get('success'))
        failed_count = len(results) - success_count

        return Response({
            'total': len(results),
            'success_count': success_count,
            'failed_count': failed_count,
            'results': results[:20],  # فقط ۲۰ ردیف اول برای نمایش
        })


# ============================================
# ۵. Templates
# ============================================
class AdminTemplateListView(generics.ListCreateAPIView):
    """لیست و ایجاد قالب"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = SmsTemplateSerializer
    queryset = SmsTemplate.objects.all().order_by('event_key')

    def get_queryset(self):
        queryset = SmsTemplate.objects.all()
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        return queryset.order_by('event_key')


class AdminTemplateDetailView(generics.RetrieveUpdateDestroyAPIView):
    """جزئیات، ویرایش و حذف قالب"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = SmsTemplateSerializer
    queryset = SmsTemplate.objects.all()

    def perform_destroy(self, instance):
        # قالب‌های سیستمی قابل حذف نیستند
        if instance.is_system:
            return Response(
                {'error': 'قالب‌های سیستمی قابل حذف نیستند'},
                status=status.HTTP_400_BAD_REQUEST
            )
        instance.delete()


# ============================================
# ۶. Stats
# ============================================
class AdminSmsStatsView(APIView):
    """آمار کلی سیستم پیامک"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get(self, request):
        service = SmsService()
        stats = service.get_stats()
        return Response(stats)