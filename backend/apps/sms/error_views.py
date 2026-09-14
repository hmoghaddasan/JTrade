# backend/apps/sms/error_views.py
"""
API Views برای مدیریت خطاهای پیامک
"""

from rest_framework import generics, permissions, status, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Count, Q

from apps.accounts.permissions import IsAdminUser

from .models import SmsErrorLog
from .serializers import SmsErrorLogSerializer, SmsErrorLogListSerializer


class AdminErrorLogListView(generics.ListAPIView):
    """لیست خطاها با فیلترهای پیشرفته"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = SmsErrorLogListSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['error_message', 'error_code', 'provider']
    ordering_fields = ['created_at', 'severity']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = SmsErrorLog.objects.all().select_related('sms_message', 'resolved_by')

        provider = self.request.query_params.get('provider')
        if provider:
            queryset = queryset.filter(provider=provider)

        error_type = self.request.query_params.get('error_type')
        if error_type:
            queryset = queryset.filter(error_type=error_type)

        severity = self.request.query_params.get('severity')
        if severity:
            queryset = queryset.filter(severity=severity)

        is_resolved = self.request.query_params.get('is_resolved')
        if is_resolved is not None:
            queryset = queryset.filter(is_resolved=is_resolved.lower() == 'true')

        admin_notified = self.request.query_params.get('admin_notified')
        if admin_notified is not None:
            queryset = queryset.filter(admin_notified=admin_notified.lower() == 'true')

        date_from = self.request.query_params.get('date_from')
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)

        date_to = self.request.query_params.get('date_to')
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)

        return queryset


class AdminErrorLogDetailView(generics.RetrieveAPIView):
    """جزئیات خطا"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = SmsErrorLogSerializer
    queryset = SmsErrorLog.objects.all()


class AdminErrorResolveView(APIView):
    """برطرف کردن خطا"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def post(self, request, pk):
        log = get_object_or_404(SmsErrorLog, pk=pk)
        note = request.data.get('note', '')
        log.resolve(user=request.user, note=note)
        return Response({
            'message': 'خطا برطرف شد',
            'log': SmsErrorLogSerializer(log).data,
        })


class AdminErrorStatsView(APIView):
    """آمار خطاها"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get(self, request):
        total = SmsErrorLog.objects.count()
        unresolved = SmsErrorLog.objects.filter(is_resolved=False).count()
        notified = SmsErrorLog.objects.filter(admin_notified=True).count()

        by_severity = SmsErrorLog.objects.values('severity').annotate(count=Count('id'))
        by_type = SmsErrorLog.objects.values('error_type').annotate(count=Count('id'))
        by_provider = SmsErrorLog.objects.values('provider').annotate(count=Count('id'))

        return Response({
            'total': total,
            'unresolved': unresolved,
            'admin_notified': notified,
            'by_severity': list(by_severity),
            'by_type': list(by_type),
            'by_provider': list(by_provider),
        })