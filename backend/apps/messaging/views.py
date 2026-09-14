# backend/apps/messaging/views.py

from rest_framework import status, generics, permissions, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.db.models import Q
from django.conf import settings
import logging

from .models import UserMessage, SystemMessage, SupportInfo, SMSLog
from .serializers import (
    UserMessageSerializer,
    UserMessageCreateSerializer,
    UserMessageReplySerializer,
    UserMessageListSerializer,
    SystemMessageSerializer,
    SystemMessageCreateSerializer,
    SupportInfoSerializer,
    SMSLogSerializer,
    SendSMSBulkSerializer,
    UnreadMessagesCountSerializer
)
from apps.accounts.permissions import IsAdminUser

# ✅ Import سرویس جدید پیامک
try:
    from apps.sms.services import SmsService
    SMS_SERVICE_AVAILABLE = True
except ImportError:
    SMS_SERVICE_AVAILABLE = False
    SmsService = None

logger = logging.getLogger(__name__)


# ============================================
# پیام‌های کاربران (User)
# ============================================
class MessageListView(generics.ListAPIView):
    """لیست پیام‌های کاربر"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserMessageListSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['created_at', 'is_read', 'is_replied']
    ordering = ['-created_at']

    def get_queryset(self):
        return UserMessage.objects.filter(user=self.request.user)


class MessageDetailView(generics.RetrieveAPIView):
    """جزئیات یک پیام - با علامت‌گذاری خوانده شده"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserMessageSerializer

    def get_queryset(self):
        return UserMessage.objects.filter(user=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.mark_as_read()
        if instance.has_new_reply:
            instance.mark_new_reply_as_read()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class MessageCreateView(generics.CreateAPIView):
    """ایجاد پیام جدید"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserMessageCreateSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class MessageReplyView(APIView):
    """پاسخ به پیام (فقط ادمین) - با SmsService جدید"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def post(self, request, pk):
        try:
            message = UserMessage.objects.get(id=pk)
            serializer = UserMessageReplySerializer(data=request.data)

            if serializer.is_valid():
                reply_message = serializer.validated_data['reply_message']
                message.reply(reply_message, request.user)

                # ============================================
                # 🆕 ارسال پیامک پاسخ با SmsService جدید
                # ============================================
                if SMS_SERVICE_AVAILABLE and SmsService:
                    try:
                        sms_service = SmsService()
                        sms_service.send_admin_reply(
                            user=message.user,
                            subject=message.subject,
                            message_id=message.id,
                        )
                        logger.info(f"✅ Reply SMS sent to {message.user.phone_number}")
                    except Exception as e:
                        logger.error(f"❌ Error sending reply SMS: {str(e)}")

                return Response({
                    'message': 'پاسخ با موفقیت ارسال شد',
                    'reply': reply_message,
                    'reply_date': message.reply_date
                })
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        except UserMessage.DoesNotExist:
            return Response(
                {'error': 'پیام یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )


class MessageMarkReadView(APIView):
    """علامت‌گذاری پیام به عنوان خوانده شده"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            message = UserMessage.objects.get(id=pk, user=request.user)
            message.mark_as_read()
            if message.has_new_reply:
                message.mark_new_reply_as_read()
            return Response({'message': 'پیام به عنوان خوانده شده علامت‌گذاری شد'})
        except UserMessage.DoesNotExist:
            return Response(
                {'error': 'پیام یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )


class MessageMarkAllReadView(APIView):
    """علامت‌گذاری همه پیام‌ها به عنوان خوانده شده"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        UserMessage.objects.filter(user=request.user, is_read=False).update(is_read=True)
        UserMessage.objects.filter(user=request.user, has_new_reply=True).update(has_new_reply=False)
        return Response({'message': 'همه پیام‌ها به عنوان خوانده شده علامت‌گذاری شدند'})


class UnreadMessagesCountView(APIView):
    """دریافت تعداد پیام‌های خوانده نشده"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        unread_count = UserMessage.objects.filter(
            user=request.user,
            is_read=False
        ).count()

        has_unread_replies = UserMessage.objects.filter(
            user=request.user,
            has_new_reply=True
        ).exists()

        return Response({
            'unread_count': unread_count,
            'has_unread_replies': has_unread_replies
        })


# ============================================
# اطلاعات پشتیبانی
# ============================================
class SupportInfoView(APIView):
    """دریافت اطلاعات پشتیبانی"""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        info = SupportInfo.get_active_info()
        if info:
            serializer = SupportInfoSerializer(info)
            return Response(serializer.data)
        return Response({
            'title': 'ارتباط با پشتیبانی',
            'description': 'برای ارتباط با پشتیبانی می‌توانید از طریق فرم زیر پیام خود را ارسال کنید.',
            'phone': getattr(settings, 'DEFAULT_SUPPORT_PHONE', ''),
            'email': getattr(settings, 'DEFAULT_SUPPORT_EMAIL', ''),
        })


class SupportInfoUpdateView(APIView):
    """به‌روزرسانی اطلاعات پشتیبانی (فقط ادمین)"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def put(self, request):
        info = SupportInfo.get_active_info()
        if not info:
            info = SupportInfo.objects.create(
                title='ارتباط با پشتیبانی'
            )

        serializer = SupportInfoSerializer(info, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                'message': 'اطلاعات پشتیبانی با موفقیت به‌روزرسانی شد',
                'data': serializer.data
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ============================================
# پیام‌های سیستم (عمومی)
# ============================================
class PublicSystemMessagesView(APIView):
    """دریافت پیام‌های فعال سیستم برای همه کاربران"""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        messages = SystemMessage.get_active_messages()
        serializer = SystemMessageSerializer(messages, many=True)
        return Response(serializer.data)


# ============================================
# پیام‌های سیستم (ادمین)
# ============================================
class SystemMessageAdminView(generics.ListCreateAPIView):
    """لیست و ایجاد پیام‌های سیستم (ادمین)"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = SystemMessageSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'message']
    ordering_fields = ['created_at', 'is_active']
    ordering = ['-created_at']

    def get_queryset(self):
        return SystemMessage.objects.all()


class SystemMessageCreateView(generics.CreateAPIView):
    """ایجاد پیام سیستم جدید (ادمین)"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = SystemMessageCreateSerializer


class SystemMessageDetailView(generics.RetrieveUpdateAPIView):
    """جزئیات و ویرایش پیام سیستم (ادمین)"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = SystemMessageSerializer
    queryset = SystemMessage.objects.all()


class SystemMessageUpdateView(generics.UpdateAPIView):
    """به‌روزرسانی پیام سیستم (ادمین)"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = SystemMessageCreateSerializer
    queryset = SystemMessage.objects.all()


class SystemMessageDeleteView(APIView):
    """حذف پیام سیستم (ادمین)"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def delete(self, request, pk):
        try:
            message = SystemMessage.objects.get(id=pk)
            message.delete()
            return Response({'message': 'پیام با موفقیت حذف شد'})
        except SystemMessage.DoesNotExist:
            return Response(
                {'error': 'پیام یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )


# ============================================
# پیام‌های سیستم (داشبورد)
# ============================================
class DashboardMessagesView(APIView):
    """دریافت پیام‌های فعال برای نمایش در داشبورد"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        system_messages = SystemMessage.get_active_messages()
        system_data = SystemMessageSerializer(system_messages, many=True).data

        unread_messages = UserMessage.objects.filter(
            user=request.user,
            is_read=False
        ).count()

        has_new_reply = UserMessage.objects.filter(
            user=request.user,
            has_new_reply=True
        ).exists()

        return Response({
            'system_messages': system_data,
            'unread_messages': unread_messages,
            'has_unread_replies': has_new_reply,
            'has_unread': unread_messages > 0 or has_new_reply
        })


# ============================================
# ارسال پیامک گروهی (ادمین) - با SmsService جدید
# ============================================
class AdminSendSMSView(APIView):
    """ارسال پیامک گروهی (ادمین) با SmsService جدید"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def post(self, request):
        serializer = SendSMSBulkSerializer(data=request.data)
        if serializer.is_valid():
            message = serializer.validated_data['message']
            user_ids = serializer.validated_data.get('user_ids', [])
            send_to_all_active = serializer.validated_data.get('send_to_all_active', False)

            from apps.accounts.models import User

            if send_to_all_active:
                users = User.objects.filter(is_active=True, is_verified=True)
            elif user_ids:
                users = User.objects.filter(id__in=user_ids, is_active=True)
            else:
                return Response(
                    {'error': 'هیچ کاربری انتخاب نشده است'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if not users.exists():
                return Response(
                    {'error': 'هیچ کاربری برای ارسال یافت نشد'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # بررسی در دسترس بودن سرویس
            if not SMS_SERVICE_AVAILABLE or not SmsService:
                return Response(
                    {'error': 'سرویس پیامک در دسترس نیست'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )

            # ============================================
            # 🆕 ارسال با SmsService جدید
            # ============================================
            sms_service = SmsService()
            success_count = 0
            failed_count = 0
            errors = []

            for user in users:
                if not user.phone_number:
                    continue

                try:
                    result = sms_service.send_admin_single(user, message)
                    if result.get('success'):
                        success_count += 1
                    else:
                        failed_count += 1
                        errors.append(f"{user.phone_number}: {result.get('error_message', 'خطا')}")
                except Exception as e:
                    logger.error(f"Error sending SMS to {user.phone_number}: {str(e)}")
                    failed_count += 1
                    errors.append(f"{user.phone_number}: {str(e)}")

            # ثبت لاگ قدیمی (برای سازگاری)
            SMSLog.objects.create(
                phone_number='BULK',
                message=message,
                status='sent',
                sent_by=request.user,
                is_bulk=True,
                recipients_count=users.count()
            )

            return Response({
                'message': f'پیامک با موفقیت ارسال شد',
                'total_users': users.count(),
                'success_count': success_count,
                'failed_count': failed_count,
                'errors': errors[:10] if errors else []
            })

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminSMSHistoryView(generics.ListAPIView):
    """تاریخچه ارسال پیامک (ادمین) - فقط برای سازگاری"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = SMSLogSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['phone_number', 'message']
    ordering_fields = ['created_at', 'status']
    ordering = ['-created_at']

    def get_queryset(self):
        return SMSLog.objects.all()


# ============================================
# پیام‌های کاربران (ادمین)
# ============================================
class AdminMessageListView(generics.ListAPIView):
    """لیست پیام‌های کاربران (ادمین)"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = UserMessageSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['user__phone_number', 'user__first_name', 'user__last_name', 'subject', 'message']
    ordering_fields = ['created_at', 'is_read', 'is_replied']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = UserMessage.objects.all()

        is_replied = self.request.query_params.get('is_replied')
        if is_replied is not None:
            queryset = queryset.filter(is_replied=is_replied.lower() == 'true')

        is_read = self.request.query_params.get('is_read')
        if is_read is not None:
            queryset = queryset.filter(is_read=is_read.lower() == 'true')

        return queryset


class AdminMessageDetailView(generics.RetrieveAPIView):
    """جزئیات پیام (ادمین)"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = UserMessageSerializer
    queryset = UserMessage.objects.all()

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.mark_as_read_by_admin()
        return super().retrieve(request, *args, **kwargs)


class AdminMessageReplyView(APIView):
    """پاسخ به پیام کاربر (ادمین) - با SmsService جدید"""
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

            message.reply(reply, request.user)

            # ============================================
            # 🆕 ارسال پیامک پاسخ با SmsService جدید
            # ============================================
            if SMS_SERVICE_AVAILABLE and SmsService:
                try:
                    sms_service = SmsService()
                    sms_service.send_admin_reply(
                        user=message.user,
                        subject=message.subject,
                        message_id=message.id,
                    )
                    logger.info(f"✅ Reply SMS sent to {message.user.phone_number}")
                except Exception as e:
                    logger.error(f"❌ Error sending reply SMS: {str(e)}")

            return Response({
                'message': 'پاسخ با موفقیت ارسال شد',
                'reply': reply,
                'reply_date': message.reply_date
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
            return Response({'message': 'پیام با موفقیت حذف شد'})
        except UserMessage.DoesNotExist:
            return Response(
                {'error': 'پیام یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )