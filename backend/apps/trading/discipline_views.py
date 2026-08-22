# backend/apps/trading/discipline_views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.utils import timezone
from django.core.cache import cache
import logging

from .discipline_engine import DisciplineEngine
from .discipline_serializers import (
    DisciplineSettingsSerializer,
    DailyDisciplineStateSerializer,
    DisciplineStatusSerializer,
    DisciplineCheckSerializer,
    DisciplineViolationSerializer,
    ReflectionSerializer,
    ReflectionCreateSerializer,
    DailyHabitSerializer,
    DailyHabitStatusSerializer,
    DisciplineLeakReportSerializer,
    DisciplineHeatmapItemSerializer,
)
from .models import Trade, DisciplineViolation, Reflection, DailyHabit
from apps.accounts.permissions import IsAuthenticatedWithSubscription

logger = logging.getLogger(__name__)


class DisciplineStatusView(APIView):
    """
    دریافت وضعیت روزانه انضباط
    GET /api/trading/discipline/status/
    """
    permission_classes = [permissions.IsAuthenticated, IsAuthenticatedWithSubscription]

    def get(self, request):
        engine = DisciplineEngine(request.user)
        status_data = engine.get_today_status()
        serializer = DisciplineStatusSerializer(status_data)
        return Response(serializer.data)


class DisciplineCheckView(APIView):
    """
    بررسی مجاز بودن ثبت ترید
    POST /api/trading/discipline/check/
    """
    permission_classes = [permissions.IsAuthenticated, IsAuthenticatedWithSubscription]

    def post(self, request):
        trade_data = request.data
        engine = DisciplineEngine(request.user)

        allowed, message, warnings = engine.check_can_trade(trade_data)

        return Response({
            'allowed': allowed,
            'message': message,
            'warnings': warnings,
        }, status=status.HTTP_200_OK)


class DisciplineReportView(APIView):
    """
    دریافت گزارش نشت انضباط
    GET /api/trading/discipline/report/?days=30
    """
    permission_classes = [permissions.IsAuthenticated, IsAuthenticatedWithSubscription]

    def get(self, request):
        days = int(request.query_params.get('days', 30))
        engine = DisciplineEngine(request.user)
        report = engine.get_discipline_report(days)
        # serializer = DisciplineLeakReportSerializer(report)
        return Response(report)


class DisciplineSettingsView(APIView):
    """
    دریافت و به‌روزرسانی تنظیمات انضباطی
    GET /api/trading/discipline/settings/
    PUT /api/trading/discipline/settings/
    """
    permission_classes = [permissions.IsAuthenticated, IsAuthenticatedWithSubscription]

    def get(self, request):
        engine = DisciplineEngine(request.user)
        settings = engine.get_settings()
        return Response(settings)

    def put(self, request):
        engine = DisciplineEngine(request.user)
        try:
            updated = engine.update_settings(request.data)
            return Response(updated)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class DisciplineHeatmapView(APIView):
    """
    دریافت داده‌های گرمای پایبندی
    GET /api/trading/discipline/heatmap/?days=90
    """
    permission_classes = [permissions.IsAuthenticated, IsAuthenticatedWithSubscription]

    def get(self, request):
        days = int(request.query_params.get('days', 90))
        engine = DisciplineEngine(request.user)
        data = engine.get_heatmap_data(days)
        # serializer = DisciplineHeatmapItemSerializer(data, many=True)
        return Response(data)


class ReflectionView(APIView):
    """
    ثبت و دریافت بازتاب‌های پس از ترید
    POST /api/trading/discipline/reflection/
    GET /api/trading/discipline/reflection/?limit=20
    """
    permission_classes = [permissions.IsAuthenticated, IsAuthenticatedWithSubscription]

    def post(self, request):
        serializer = ReflectionCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        engine = DisciplineEngine(request.user)
        try:
            reflection = engine.save_reflection(
                trade_id=serializer.validated_data['trade_id'],
                data=serializer.validated_data
            )
            return Response(ReflectionSerializer(reflection).data, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)

    def get(self, request):
        limit = int(request.query_params.get('limit', 20))
        engine = DisciplineEngine(request.user)
        reflections = engine.get_reflections(limit)
        return Response(ReflectionSerializer(reflections, many=True).data)


class HabitView(APIView):
    """
    مدیریت عادات روزانه
    POST /api/trading/discipline/habits/  (ثبت وضعیت عادت)
    GET /api/trading/discipline/habits/   (دریافت وضعیت عادات امروز)
    """
    permission_classes = [permissions.IsAuthenticated, IsAuthenticatedWithSubscription]

    def post(self, request):
        habit_name = request.data.get('habit_name')
        is_done = request.data.get('is_done', True)

        if not habit_name:
            return Response({'error': 'نام عادت الزامی است'}, status=status.HTTP_400_BAD_REQUEST)

        engine = DisciplineEngine(request.user)
        habit = engine.save_habit(habit_name, is_done)
        return Response(DailyHabitSerializer(habit).data, status=status.HTTP_201_CREATED)

    def get(self, request):
        engine = DisciplineEngine(request.user)
        status_data = engine.get_habits_status()
        serializer = DailyHabitStatusSerializer(status_data)
        return Response(serializer.data)


class DisciplineViolationsView(APIView):
    """
    دریافت لیست نقض‌های انضباطی
    GET /api/trading/discipline/violations/?days=30
    """
    permission_classes = [permissions.IsAuthenticated, IsAuthenticatedWithSubscription]

    def get(self, request):
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now().date() - timezone.timedelta(days=days)

        violations = DisciplineViolation.objects.filter(
            user=request.user,
            created_at__date__gte=start_date
        ).order_by('-created_at')

        return Response(DisciplineViolationSerializer(violations, many=True).data)