# backend/apps/sms/views.py
"""
Views عمومی سیستم پیامک (کاربر عادی)
"""

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import SmsMessage, SmsInbox


class MySmsListView(generics.ListAPIView):
    """لیست پیامک‌های ارسالی به کاربر لاگین‌شده"""
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SmsMessage.objects.filter(user=self.request.user).order_by('-created_at')

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()[:50]
        data = [{
            'id': m.id,
            'event_key': m.event_key,
            'status': m.status,
            'status_display': m.get_status_display(),
            'created_at': m.created_at,
            'message_preview': (m.message[:80] + '...') if len(m.message) > 80 else m.message,
        } for m in queryset]
        return Response(data)


class MySmsDetailView(APIView):
    """جزئیات یک پیامک"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            msg = SmsMessage.objects.get(id=pk, user=request.user)
            return Response({
                'id': msg.id,
                'event_key': msg.event_key,
                'message': msg.message,
                'status': msg.status,
                'status_display': msg.get_status_display(),
                'created_at': msg.created_at,
                'sent_at': msg.sent_at,
                'delivered_at': msg.delivered_at,
            })
        except SmsMessage.DoesNotExist:
            return Response({'error': 'پیام یافت نشد'}, status=status.HTTP_404_NOT_FOUND)


class SmsHealthView(APIView):
    """بررسی سلامت سیستم پیامک (عمومی)"""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from .models import SmsProviderConfig
        active = SmsProviderConfig.get_active()
        return Response({
            'enabled': bool(active),
            'provider': active.provider if active else None,
            'provider_display': active.provider_display if active else None,
        })