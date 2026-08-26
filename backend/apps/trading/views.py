# backend/apps/trading/views.py

import requests
import logging
from django.conf import settings
from rest_framework import status, generics, permissions, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Sum, Avg, Count, Q, Value, F
from django.db.models.functions import Coalesce
from django.http import HttpResponse, StreamingHttpResponse
from datetime import datetime, timedelta
import csv
import io
import json
from .models import (
    CurrencyPair, TradeGroup, Trade, AIConsultation, AIPromptVersion,
    AIConsultationAnalytics, TradingRule, TradeRuleCheck, Portfolio,
    Broker, DisciplineSettings, DailyDisciplineState,
    DisciplineViolation, Reflection, DailyHabit
)
from .serializers import (
    CurrencyPairSerializer,
    TradeGroupSerializer,
    TradeListSerializer,
    TradeDetailSerializer,
    TradeCreateSerializer,
    TradeUpdateSerializer,
    AIConsultationSerializer,
    AIConsultationInputSerializer,
    AIConsultationFeedbackSerializer,
    AIPromptVersionSerializer,
    AIConsultationAnalyticsSerializer,
    TradingRuleSerializer,
    TradeRuleCheckSerializer,
    RulesReportSerializer,
    PortfolioSerializer,
    PortfolioDetailSerializer,
    MetricsSerializer,
    MetricsTrendSerializer,
    BrokerSerializer,
)
from .ai_service import AIService, AIFeedbackService, AIAnalyticsService
from .analytics import AdvancedMetricsCalculator, MetricsCache
from apps.accounts.permissions import IsAuthenticatedWithSubscription, CanTrade
from apps.subscriptions.models import UserSubscription

# ===== اضافه کردن importهای جدید برای ابزارهای انضباطی =====
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
)

# ============================================
# ✅ importهای جدید برای گزارش‌های ترکیبی پورتفولیو
# ============================================
from .portfolio_comparison import PortfolioComparisonEngine
from .comparison_serializers import (
    ComparisonDataSerializer,
    ComparisonSummarySerializer,
    CumulativePnLSeriesSerializer,
    RadarMetricsSerializer,
    BarDataItemSerializer,
)

# ===== اضافه کردن importهای جدید برای مدیریت مدل‌های AI =====
from .services.ai_model_manager import model_manager

# ============================================
# ✅ تعریف logger
# ============================================
logger = logging.getLogger(__name__)


# ============================================
# ✅ ویو لیست بروکرها
# ============================================
class BrokerListView(generics.ListAPIView):
    """دریافت لیست بروکرهای فعال"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BrokerSerializer
    queryset = Broker.objects.filter(is_active=True).order_by('category', 'order_index', 'name')
    pagination_class = None


# ============================================
# ✅ دریافت لیست مدل‌های AI (نسخه کامل با مدل‌های Gapgpt.app)
# ============================================
class AvailableModelsView(APIView):
    """
    دریافت لیست مدل‌های هوش مصنوعی قابل انتخاب توسط کاربر
    - بر اساس تنظیم ai_provider_mode (offline / online / hybrid)
    - مدل‌های آنلاین از Gapgpt.app و مدل‌های آفلاین از Ollama
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            # بازخوانی مدل‌ها از مدل‌منیجر
            models = model_manager.refresh_models()

            # ساختاردهی خروجی برای فرانت‌اند
            result = []
            for model in models:
                result.append({
                    'id': model['id'],
                    'name': model['name'],
                    'provider': model['provider'],
                    'display_name': model.get('display_name', model['provider']),
                    'online': model.get('online', False),
                    'free': model.get('free', True),
                    'category': model.get('category', ''),
                    'category_label': model.get('category_label', ''),
                    'cooldown': model.get('cooldown', 10),
                    'is_default': model.get('rank', 999) == 1,
                })

            logger.info(f"✅ AvailableModelsView: {len(result)} models returned")
            return Response(result)

        except Exception as e:
            logger.error(f"❌ Error in AvailableModelsView: {str(e)}")
            # در صورت خطا، مدل‌های پیش‌فرض را برگردان
            fallback_models = self._get_fallback_models()
            return Response(fallback_models)

    def _get_fallback_models(self):
        """مدل‌های پیش‌فرض در صورت خطا"""
        return [
            {'id': 'llama3.1:8b', 'name': 'Llama 3.1 8B', 'provider': 'ollama', 'display_name': 'Ollama (محلی)',
             'online': False, 'free': True, 'category': 'local', 'category_label': '🟣 محلی', 'cooldown': 5},
            {'id': 'GapGPT 5.6 Lite', 'name': 'GapGPT 5.6 Lite', 'provider': 'gapgpt',
             'display_name': 'Gapgpt.app (آنلاین)', 'online': True, 'free': True, 'category': 'free',
             'category_label': '🟢 رایگان', 'cooldown': 10},
        ]


# ============================================
# جفت ارزها
# ============================================
class CurrencyPairListView(generics.ListAPIView):
    """لیست جفت ارزها"""
    permission_classes = [permissions.IsAuthenticated]
    queryset = CurrencyPair.objects.filter(is_active=True)
    serializer_class = CurrencyPairSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['symbol', 'description']
    ordering_fields = ['symbol', 'pair_type']


class SymbolListView(APIView):
    """لیست تمام نمادها بدون pagination"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        symbols = CurrencyPair.objects.filter(is_active=True).values_list('symbol', flat=True)
        return Response(list(symbols))


class CurrencyPairDetailView(generics.RetrieveAPIView):
    """جزئیات یک جفت ارز"""
    permission_classes = [permissions.IsAuthenticated]
    queryset = CurrencyPair.objects.filter(is_active=True)
    serializer_class = CurrencyPairSerializer
    lookup_field = 'symbol'


# ============================================
# گروه‌های ترید
# ============================================
class TradeGroupListCreateView(generics.ListCreateAPIView):
    """لیست و ایجاد گروه‌های ترید - فقط گروه‌های کاربر جاری"""
    permission_classes = [permissions.IsAuthenticated, IsAuthenticatedWithSubscription]
    serializer_class = TradeGroupSerializer

    def get_queryset(self):
        user = self.request.user
        print(f"🔍 User ID: {user.id}")
        print(f"🔍 User phone: {user.phone_number}")

        queryset = TradeGroup.objects.filter(
            user=user,
            is_active=True
        ).order_by('order_index', 'group_name')

        print(f"🔍 Found {queryset.count()} groups for user")
        for group in queryset:
            print(f"   - {group.id}: {group.group_name} (user_id: {group.user_id})")

        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        print(f"📝 Creating group for user: {user.id}")

        if serializer.validated_data.get('is_default', False):
            TradeGroup.objects.filter(
                user=user,
                is_default=True
            ).update(is_default=False)

        serializer.save(
            user=user,
            created_by=user
        )


class TradeGroupDetailView(generics.RetrieveUpdateAPIView):
    """جزئیات و ویرایش گروه ترید"""
    permission_classes = [permissions.IsAuthenticated, IsAuthenticatedWithSubscription]
    serializer_class = TradeGroupSerializer

    def get_queryset(self):
        return TradeGroup.objects.filter(user=self.request.user)


class TradeGroupDeleteView(APIView):
    """حذف گروه ترید"""
    permission_classes = [permissions.IsAuthenticated, IsAuthenticatedWithSubscription]

    def delete(self, request, pk):
        try:
            group = TradeGroup.objects.get(id=pk, user=request.user)

            if group.trades.filter(is_deleted=False).exists():
                return Response(
                    {
                        'error': 'این گروه دارای ترید است. ابتدا تریدهای آن را حذف کنید.',
                        'trade_count': group.trades.filter(is_deleted=False).count()
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            group.is_active = False
            group.save()
            return Response({'message': 'گروه با موفقیت حذف شد'})
        except TradeGroup.DoesNotExist:
            return Response(
                {'error': 'گروه یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )


# ============================================
# تریدها - با پشتیبانی از آپلود تصویر (هر دو حالت JSON و FormData)
# ============================================
class TradeListCreateView(generics.ListCreateAPIView):
    """لیست و ایجاد تریدها - با پشتیبانی از آپلود فایل و Base64"""
    permission_classes = [permissions.IsAuthenticated, IsAuthenticatedWithSubscription, CanTrade]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TradeCreateSerializer
        return TradeListSerializer

    def get_queryset(self):
        queryset = Trade.objects.filter(
            user=self.request.user,
            is_deleted=False
        ).select_related('group')

        group_id = self.request.query_params.get('group_id')
        if group_id:
            queryset = queryset.filter(group_id=group_id)

        symbol = self.request.query_params.get('symbol')
        if symbol:
            queryset = queryset.filter(symbol__icontains=symbol)

        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(trade_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(trade_date__lte=end_date)

        return queryset.order_by('-trade_date', '-created_at')

    def perform_create(self, serializer):
        user = self.request.user
        group_id = self.request.data.get('group_id')

        if not group_id:
            from rest_framework import serializers
            raise serializers.ValidationError({'group_id': 'انتخاب دسته‌بندی اجباری است'})

        try:
            group = TradeGroup.objects.get(id=group_id, user=user, is_active=True)
        except TradeGroup.DoesNotExist:
            from rest_framework import serializers
            raise serializers.ValidationError({'group_id': 'دسته‌بندی انتخاب شده معتبر نیست'})

        if not user.is_admin:
            try:
                subscription = UserSubscription.objects.filter(
                    user=user,
                    is_active=True
                ).latest('created_at')

                if not subscription.can_trade():
                    from rest_framework import serializers
                    raise serializers.ValidationError({
                        'limit': f'محدودیت ترید شما به پایان رسیده است. ({subscription.trades_limit} ترید)'
                    })
            except UserSubscription.DoesNotExist:
                from rest_framework import serializers
                raise serializers.ValidationError({
                    'subscription': 'شما اشتراک فعالی ندارید. لطفاً اشتراک تهیه کنید.'
                })

        rule_checks = self.request.data.get('rule_checks', [])
        if isinstance(rule_checks, str):
            try:
                rule_checks = json.loads(rule_checks)
            except json.JSONDecodeError:
                rule_checks = []

        if hasattr(serializer, 'validated_data') and 'rule_checks' in serializer.validated_data:
            serializer.validated_data.pop('rule_checks')

        trade = serializer.save(user=user, group=group)

        for rule_id in rule_checks:
            try:
                rule = TradingRule.objects.get(id=rule_id, user=user, is_active=True)
                TradeRuleCheck.objects.create(
                    trade=trade,
                    rule=rule,
                    is_checked=True
                )
            except TradingRule.DoesNotExist:
                pass


class TradeDetailView(generics.RetrieveAPIView):
    """جزئیات یک ترید"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TradeDetailSerializer

    def get_queryset(self):
        return Trade.objects.filter(user=self.request.user, is_deleted=False).select_related('group')


class TradeUpdateView(generics.UpdateAPIView):
    """به‌روزرسانی ترید - با پشتیبانی از آپلود فایل و Base64"""
    permission_classes = [permissions.IsAuthenticated, IsAuthenticatedWithSubscription]
    serializer_class = TradeUpdateSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        return Trade.objects.filter(user=self.request.user, is_deleted=False).select_related('group')

    def update(self, request, *args, **kwargs):
        print("=" * 60)
        print("📥 Received data in TradeUpdateView.update:")
        print(f"   - request.data: {request.data}")
        print(f"   - request.FILES: {request.FILES}")
        print(f"   - screenshot from data: {request.data.get('screenshot', 'NOT FOUND')}")
        print("=" * 60)

        serializer = self.get_serializer(data=request.data, partial=True)

        if not serializer.is_valid():
            print("❌ Validation errors:")
            print(serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        return super().update(request, *args, **kwargs)

    def perform_update(self, serializer):
        print("✅ Validation passed, performing update...")

        rule_checks = self.request.data.get('rule_checks', [])
        if isinstance(rule_checks, str):
            try:
                rule_checks = json.loads(rule_checks)
            except json.JSONDecodeError:
                rule_checks = []

        if hasattr(serializer, 'validated_data') and 'rule_checks' in serializer.validated_data:
            serializer.validated_data.pop('rule_checks')

        trade = serializer.save()

        if rule_checks:
            trade = serializer.instance
            TradeRuleCheck.objects.filter(trade=trade).delete()
            for rule_id in rule_checks:
                try:
                    rule = TradingRule.objects.get(id=rule_id, user=self.request.user, is_active=True)
                    TradeRuleCheck.objects.create(
                        trade=trade,
                        rule=rule,
                        is_checked=True
                    )
                except TradingRule.DoesNotExist:
                    pass


class TradeDeleteView(APIView):
    """حذف ترید"""
    permission_classes = [permissions.IsAuthenticated, IsAuthenticatedWithSubscription]

    def delete(self, request, pk):
        try:
            trade = Trade.objects.get(id=pk, user=request.user)
            trade.is_deleted = True
            trade.save()
            return Response({'message': 'ترید با موفقیت حذف شد'})
        except Trade.DoesNotExist:
            return Response(
                {'error': 'ترید یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )


class TradeAnalysisView(APIView):
    """تحلیل ترید"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            trade = Trade.objects.get(id=pk, user=request.user, is_deleted=False)
            return Response({
                'trade_id': trade.id,
                'symbol': trade.symbol,
                'profit': float(trade.profit) if trade.profit else 0,
                'risk_reward': float(trade.risk_reward_ratio) if trade.risk_reward_ratio else 0,
                'execution_quality': trade.execution_quality_score,
                'emotions': trade.get_emotions(),
                'timeframes': trade.get_timeframes_used(),
            })
        except Trade.DoesNotExist:
            return Response(
                {'error': 'ترید یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )


# ============================================
# گزارشات
# ============================================
class ReportView(APIView):
    """گزارش کلی"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        trades = Trade.objects.filter(user=request.user, is_deleted=False)
        total_trades = trades.count()
        winning_trades = trades.filter(profit__gt=0).count()
        total_profit = trades.aggregate(Sum('profit'))['profit__sum'] or 0

        return Response({
            'total_trades': total_trades,
            'winning_trades': winning_trades,
            'win_rate': round((winning_trades / total_trades * 100) if total_trades > 0 else 0, 2),
            'total_profit': float(total_profit),
        })


class PnLReportView(APIView):
    """گزارش PnL بر اساس نماد"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        trades = Trade.objects.filter(user=request.user, is_deleted=False)
        report = []
        symbols = trades.values_list('symbol', flat=True).distinct()

        for symbol in symbols:
            symbol_trades = trades.filter(symbol=symbol)
            report.append({
                'symbol': symbol,
                'total_trades': symbol_trades.count(),
                'total_profit': float(symbol_trades.aggregate(Sum('profit'))['profit__sum'] or 0),
            })

        return Response(report)


class RiskRewardReportView(APIView):
    """گزارش ریسک به ریوارد"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        trades = Trade.objects.filter(
            user=request.user,
            is_deleted=False,
            risk_reward_ratio__isnull=False
        )

        rr_ranges = [
            {'min': 0, 'max': 1, 'label': '0-1'},
            {'min': 1, 'max': 2, 'label': '1-2'},
            {'min': 2, 'max': 3, 'label': '2-3'},
            {'min': 3, 'max': 5, 'label': '3-5'},
            {'min': 5, 'max': float('inf'), 'label': '5+'},
        ]

        report = []
        for rr_range in rr_ranges:
            range_trades = trades.filter(
                risk_reward_ratio__gte=rr_range['min'],
                risk_reward_ratio__lt=rr_range['max']
            )
            count = range_trades.count()
            if count > 0:
                report.append({
                    'rr_range': rr_range['label'],
                    'count': count,
                    'total_profit': float(range_trades.aggregate(Sum('profit'))['profit__sum'] or 0),
                })

        return Response(report)


class WeeklyPerformanceReportView(APIView):
    """گزارش عملکرد هفتگی"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        trades = Trade.objects.filter(user=request.user, is_deleted=False)
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        day_names_fa = {
            'Monday': 'دوشنبه', 'Tuesday': 'سه‌شنبه', 'Wednesday': 'چهارشنبه',
            'Thursday': 'پنج‌شنبه', 'Friday': 'جمعه', 'Saturday': 'شنبه', 'Sunday': 'یک‌شنبه'
        }

        report = []
        for day in days:
            day_trades = trades.filter(day_of_week=day)
            count = day_trades.count()
            if count > 0:
                report.append({
                    'day': day,
                    'day_fa': day_names_fa.get(day, day),
                    'count': count,
                    'total_profit': float(day_trades.aggregate(Sum('profit'))['profit__sum'] or 0),
                })

        return Response(report)


class ChecklistAdherenceReportView(APIView):
    """گزارش چک‌لیست"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        trades = Trade.objects.filter(user=request.user, is_deleted=False)
        total = trades.count()
        if total == 0:
            return Response({'message': 'هیچ تریدی یافت نشد'})

        checklist_items = {
            'smt_confirmed': 'SMT تایید شد',
            'key_levels_reviewed': 'سطوح کلیدی بررسی شد',
            'bond_dxy_support': 'حمایت BOND/DXY',
            'weekly_news_printed': 'اخبار هفتگی چاپ شد',
            'zero_hour_identified': 'ساعت صفر مشخص شد',
            'asian_range_identified': 'رنج آسیا مشخص شد',
            'london_range_identified': 'رنج لندن مشخص شد',
            'judas_lo_identified': 'Judas LO مشخص شد',
        }

        result = {}
        for key, label in checklist_items.items():
            count = trades.filter(**{key: True}).count()
            result[key] = {
                'label': label,
                'count': count,
                'percentage': round((count / total * 100), 2)
            }

        return Response(result)


class PsychologyReportView(APIView):
    """گزارش روانشناسی"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        trades = Trade.objects.filter(user=request.user, is_deleted=False)
        return Response({'message': 'در حال توسعه'})


class MistakesReportView(APIView):
    """گزارش اشتباهات"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        trades = Trade.objects.filter(
            user=request.user,
            is_deleted=False,
            mistake_code__isnull=False,
            mistake_code__gt=''
        )

        mistakes = {}
        for trade in trades:
            code = trade.mistake_code
            if code not in mistakes:
                mistakes[code] = {'code': code, 'count': 0}
            mistakes[code]['count'] += 1

        return Response({
            'total_mistakes': trades.count(),
            'unique_mistakes': len(mistakes),
            'mistakes': list(mistakes.values())
        })


class BiasReportView(APIView):
    """گزارش Bias"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        trades = Trade.objects.filter(user=request.user, is_deleted=False, bias__isnull=False)
        biases = ['Bullish', 'Bearish', 'Neutral']
        report = []

        for bias in biases:
            bias_trades = trades.filter(bias=bias)
            count = bias_trades.count()
            if count > 0:
                report.append({
                    'bias': bias,
                    'count': count,
                    'total_profit': float(bias_trades.aggregate(Sum('profit'))['profit__sum'] or 0),
                })

        return Response(report)


class TimeframeReportView(APIView):
    """گزارش تایم‌فریم"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        trades = Trade.objects.filter(user=request.user, is_deleted=False)
        timeframes = ['timeframe_d', 'timeframe_h4', 'timeframe_h1', 'timeframe_m15', 'timeframe_m5', 'timeframe_m1']
        timeframe_labels = {'timeframe_d': 'D1', 'timeframe_h4': 'H4', 'timeframe_h1': 'H1',
                            'timeframe_m15': 'M15', 'timeframe_m5': 'M5', 'timeframe_m1': 'M1'}

        report = []
        for tf in timeframes:
            tf_trades = trades.filter(**{tf: True})
            count = tf_trades.count()
            if count > 0:
                report.append({
                    'timeframe': timeframe_labels[tf],
                    'count': count,
                    'total_profit': float(tf_trades.aggregate(Sum('profit'))['profit__sum'] or 0),
                })

        return Response(report)


# ============================================
# تحلیل دسته‌بندی شده
# ============================================
class AnalyticsView(APIView):
    """دریافت داده‌های تحلیلی دسته‌بندی شده بر اساس معیارهای مختلف"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        category_by = request.query_params.get('category_by', 'day_of_week')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        symbol = request.query_params.get('symbol')
        trade_type = request.query_params.get('trade_type')
        status_filter = request.query_params.get('status')

        trades = Trade.objects.filter(user=user, is_deleted=False)

        if date_from:
            try:
                date_from_parsed = datetime.strptime(date_from, '%Y-%m-%d').date()
                trades = trades.filter(trade_date__gte=date_from_parsed)
            except ValueError:
                pass
        if date_to:
            try:
                date_to_parsed = datetime.strptime(date_to, '%Y-%m-%d').date()
                trades = trades.filter(trade_date__lte=date_to_parsed)
            except ValueError:
                pass

        if symbol:
            trades = trades.filter(symbol__icontains=symbol)
        if trade_type:
            trades = trades.filter(trade_type=trade_type)
        if status_filter:
            if status_filter == 'win':
                trades = trades.filter(profit__gt=0)
            elif status_filter == 'loss':
                trades = trades.filter(profit__lt=0)
            elif status_filter == 'breakeven':
                trades = trades.filter(profit=0)

        total_trades = trades.count()
        if total_trades == 0:
            return Response({
                'summary': {
                    'total_trades': 0,
                    'win_rate': 0,
                    'total_profit': 0,
                    'profit_factor': 0,
                    'avg_rr': 0,
                    'avg_quality': 0,
                },
                'categories': [],
                'distribution': {'win': 0, 'loss': 0, 'breakeven': 0}
            })

        win_count = trades.filter(profit__gt=0).count()
        loss_count = trades.filter(profit__lt=0).count()
        breakeven_count = trades.filter(profit=0).count()
        total_profit = trades.aggregate(total=Sum('profit'))['total'] or 0
        total_loss = trades.filter(profit__lt=0).aggregate(total=Sum('profit'))['total'] or 0
        total_loss_abs = abs(total_loss)
        avg_rr = trades.filter(risk_reward_ratio__isnull=False).aggregate(avg=Avg('risk_reward_ratio'))['avg'] or 0
        avg_quality = \
            trades.filter(execution_quality_score__isnull=False).aggregate(avg=Avg('execution_quality_score'))[
                'avg'] or 0

        win_rate = (win_count / total_trades * 100) if total_trades > 0 else 0
        profit_factor = (total_profit / total_loss_abs) if total_loss_abs > 0 else (999 if total_profit > 0 else 0)

        summary = {
            'total_trades': total_trades,
            'win_rate': round(win_rate, 1),
            'total_profit': round(total_profit, 2),
            'profit_factor': round(profit_factor, 2),
            'avg_rr': round(avg_rr, 2),
            'avg_quality': round(avg_quality, 1),
        }

        distribution = {
            'win': win_count,
            'loss': loss_count,
            'breakeven': breakeven_count,
        }

        categories = []
        group_by = category_by

        if group_by == 'day_of_week':
            day_order = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
            day_names_fa = {
                'Saturday': 'شنبه', 'Sunday': 'یکشنبه', 'Monday': 'دوشنبه',
                'Tuesday': 'سه‌شنبه', 'Wednesday': 'چهارشنبه', 'Thursday': 'پنجشنبه',
                'Friday': 'جمعه'
            }
            grouped = trades.values('day_of_week').annotate(
                count=Count('id'),
                win_count=Count('id', filter=Q(profit__gt=0)),
                loss_count=Count('id', filter=Q(profit__lt=0)),
                total_profit=Sum('profit'),
                avg_rr=Avg('risk_reward_ratio', filter=Q(risk_reward_ratio__isnull=False)),
                avg_quality=Avg('execution_quality_score', filter=Q(execution_quality_score__isnull=False)),
            )
            grouped_dict = {item['day_of_week']: item for item in grouped if item['day_of_week']}
            for day in day_order:
                if day in grouped_dict:
                    data = grouped_dict[day]
                    categories.append({
                        'name': day_names_fa.get(day, day),
                        'count': data['count'],
                        'win_count': data['win_count'] or 0,
                        'loss_count': data['loss_count'] or 0,
                        'total_profit': round(data['total_profit'] or 0, 2),
                        'avg_rr': round(data['avg_rr'] or 0, 2),
                        'avg_quality': round(data['avg_quality'] or 0, 1),
                        'win_rate': round((data['win_count'] / data['count'] * 100) if data['count'] > 0 else 0, 1),
                    })

        elif group_by == 'symbol':
            grouped = trades.values('symbol').annotate(
                count=Count('id'),
                win_count=Count('id', filter=Q(profit__gt=0)),
                loss_count=Count('id', filter=Q(profit__lt=0)),
                total_profit=Sum('profit'),
                avg_rr=Avg('risk_reward_ratio', filter=Q(risk_reward_ratio__isnull=False)),
                avg_quality=Avg('execution_quality_score', filter=Q(execution_quality_score__isnull=False)),
            ).order_by('-total_profit')
            for item in grouped:
                categories.append({
                    'name': item['symbol'],
                    'count': item['count'],
                    'win_count': item['win_count'] or 0,
                    'loss_count': item['loss_count'] or 0,
                    'total_profit': round(item['total_profit'] or 0, 2),
                    'avg_rr': round(item['avg_rr'] or 0, 2),
                    'avg_quality': round(item['avg_quality'] or 0, 1),
                    'win_rate': round((item['win_count'] / item['count'] * 100) if item['count'] > 0 else 0, 1),
                })

        elif group_by == 'trade_type':
            grouped = trades.values('trade_type').annotate(
                count=Count('id'),
                win_count=Count('id', filter=Q(profit__gt=0)),
                loss_count=Count('id', filter=Q(profit__lt=0)),
                total_profit=Sum('profit'),
                avg_rr=Avg('risk_reward_ratio', filter=Q(risk_reward_ratio__isnull=False)),
                avg_quality=Avg('execution_quality_score', filter=Q(execution_quality_score__isnull=False)),
            )
            type_names = {'Buy': 'خرید', 'Sell': 'فروش'}
            for item in grouped:
                categories.append({
                    'name': type_names.get(item['trade_type'], item['trade_type']),
                    'count': item['count'],
                    'win_count': item['win_count'] or 0,
                    'loss_count': item['loss_count'] or 0,
                    'total_profit': round(item['total_profit'] or 0, 2),
                    'avg_rr': round(item['avg_rr'] or 0, 2),
                    'avg_quality': round(item['avg_quality'] or 0, 1),
                    'win_rate': round((item['win_count'] / item['count'] * 100) if item['count'] > 0 else 0, 1),
                })

        elif group_by == 'dominant_feeling':
            grouped = trades.values('dominant_feeling').annotate(
                count=Count('id'),
                win_count=Count('id', filter=Q(profit__gt=0)),
                loss_count=Count('id', filter=Q(profit__lt=0)),
                total_profit=Sum('profit'),
                avg_rr=Avg('risk_reward_ratio', filter=Q(risk_reward_ratio__isnull=False)),
                avg_quality=Avg('execution_quality_score', filter=Q(execution_quality_score__isnull=False)),
            ).order_by('-total_profit')
            for item in grouped:
                if item['dominant_feeling']:
                    categories.append({
                        'name': item['dominant_feeling'],
                        'count': item['count'],
                        'win_count': item['win_count'] or 0,
                        'loss_count': item['loss_count'] or 0,
                        'total_profit': round(item['total_profit'] or 0, 2),
                        'avg_rr': round(item['avg_rr'] or 0, 2),
                        'avg_quality': round(item['avg_quality'] or 0, 1),
                        'win_rate': round((item['win_count'] / item['count'] * 100) if item['count'] > 0 else 0, 1),
                    })

        elif group_by == 'strategy_type':
            grouped = trades.values('strategy_type').annotate(
                count=Count('id'),
                win_count=Count('id', filter=Q(profit__gt=0)),
                loss_count=Count('id', filter=Q(profit__lt=0)),
                total_profit=Sum('profit'),
                avg_rr=Avg('risk_reward_ratio', filter=Q(risk_reward_ratio__isnull=False)),
                avg_quality=Avg('execution_quality_score', filter=Q(execution_quality_score__isnull=False)),
            )
            for item in grouped:
                if item['strategy_type']:
                    categories.append({
                        'name': item['strategy_type'],
                        'count': item['count'],
                        'win_count': item['win_count'] or 0,
                        'loss_count': item['loss_count'] or 0,
                        'total_profit': round(item['total_profit'] or 0, 2),
                        'avg_rr': round(item['avg_rr'] or 0, 2),
                        'avg_quality': round(item['avg_quality'] or 0, 1),
                        'win_rate': round((item['win_count'] / item['count'] * 100) if item['count'] > 0 else 0, 1),
                    })

        elif group_by == 'bias':
            grouped = trades.values('bias').annotate(
                count=Count('id'),
                win_count=Count('id', filter=Q(profit__gt=0)),
                loss_count=Count('id', filter=Q(profit__lt=0)),
                total_profit=Sum('profit'),
                avg_rr=Avg('risk_reward_ratio', filter=Q(risk_reward_ratio__isnull=False)),
                avg_quality=Avg('execution_quality_score', filter=Q(execution_quality_score__isnull=False)),
            )
            for item in grouped:
                if item['bias']:
                    categories.append({
                        'name': item['bias'],
                        'count': item['count'],
                        'win_count': item['win_count'] or 0,
                        'loss_count': item['loss_count'] or 0,
                        'total_profit': round(item['total_profit'] or 0, 2),
                        'avg_rr': round(item['avg_rr'] or 0, 2),
                        'avg_quality': round(item['avg_quality'] or 0, 1),
                        'win_rate': round((item['win_count'] / item['count'] * 100) if item['count'] > 0 else 0, 1),
                    })

        elif group_by == 'session_type':
            grouped = trades.values('session_type').annotate(
                count=Count('id'),
                win_count=Count('id', filter=Q(profit__gt=0)),
                loss_count=Count('id', filter=Q(profit__lt=0)),
                total_profit=Sum('profit'),
                avg_rr=Avg('risk_reward_ratio', filter=Q(risk_reward_ratio__isnull=False)),
                avg_quality=Avg('execution_quality_score', filter=Q(execution_quality_score__isnull=False)),
            )
            for item in grouped:
                if item['session_type']:
                    categories.append({
                        'name': item['session_type'],
                        'count': item['count'],
                        'win_count': item['win_count'] or 0,
                        'loss_count': item['loss_count'] or 0,
                        'total_profit': round(item['total_profit'] or 0, 2),
                        'avg_rr': round(item['avg_rr'] or 0, 2),
                        'avg_quality': round(item['avg_quality'] or 0, 1),
                        'win_rate': round((item['win_count'] / item['count'] * 100) if item['count'] > 0 else 0, 1),
                    })

        elif group_by == 'month':
            grouped = trades.values('month').annotate(
                count=Count('id'),
                win_count=Count('id', filter=Q(profit__gt=0)),
                loss_count=Count('id', filter=Q(profit__lt=0)),
                total_profit=Sum('profit'),
                avg_rr=Avg('risk_reward_ratio', filter=Q(risk_reward_ratio__isnull=False)),
                avg_quality=Avg('execution_quality_score', filter=Q(execution_quality_score__isnull=False)),
            ).order_by('month')
            month_names = {
                1: 'فروردین', 2: 'اردیبهشت', 3: 'خرداد', 4: 'تیر', 5: 'مرداد', 6: 'شهریور',
                7: 'مهر', 8: 'آبان', 9: 'آذر', 10: 'دی', 11: 'بهمن', 12: 'اسفند'
            }
            for item in grouped:
                if item['month']:
                    categories.append({
                        'name': month_names.get(item['month'], str(item['month'])),
                        'count': item['count'],
                        'win_count': item['win_count'] or 0,
                        'loss_count': item['loss_count'] or 0,
                        'total_profit': round(item['total_profit'] or 0, 2),
                        'avg_rr': round(item['avg_rr'] or 0, 2),
                        'avg_quality': round(item['avg_quality'] or 0, 1),
                        'win_rate': round((item['win_count'] / item['count'] * 100) if item['count'] > 0 else 0, 1),
                    })

        else:
            return Response({
                'error': 'معیار دسته‌بندی نامعتبر است',
                'valid_options': ['day_of_week', 'month', 'symbol', 'trade_type', 'dominant_feeling',
                                  'strategy_type', 'bias', 'session_type']
            }, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'summary': summary,
            'categories': categories,
            'distribution': distribution
        })


# ============================================
# ✅ تحلیل مالی احساسات (Emotional P&L)
# ============================================
class EmotionalPnLView(APIView):
    """دریافت تحلیل مالی احساسات (Emotional P&L)"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        trades = Trade.objects.filter(user=user, is_deleted=False)

        total_trades = trades.count()
        if total_trades == 0:
            return Response({
                'has_data': False,
                'message': 'هیچ تریدی برای تحلیل وجود ندارد'
            })

        emotion_mapping = {
            'آرامش': 'calm',
            'تمرکز': 'focus',
            'هیجان': 'excited',
            'ترس': 'fear',
            'طمع': 'greed',
            'صبر': 'patience',
            'FOMO': 'fomo',
            'استرس': 'stress',
            'ریلکس': 'relaxed',
            'خوشحال': 'happy',
            'غمگین': 'sad',
            'پرانرژی': 'energetic',
            'خسته': 'tired',
            'قناعت': 'contentment',
        }

        negative_emotions = ['ترس', 'طمع', 'هیجان', 'FOMO', 'استرس']

        result = []
        total_abs_pnl = 0

        for emotion_fa, emotion_en in emotion_mapping.items():
            emotion_trades = trades.filter(dominant_feeling=emotion_fa)
            count = emotion_trades.count()
            if count == 0:
                continue

            total_pnl = emotion_trades.aggregate(total=Sum('profit'))['total'] or 0
            win_count = emotion_trades.filter(profit__gt=0).count()
            loss_count = emotion_trades.filter(profit__lt=0).count()
            win_rate = (win_count / count * 100) if count > 0 else 0

            avg_rr = emotion_trades.filter(risk_reward_ratio__isnull=False).aggregate(
                avg=Avg('risk_reward_ratio')
            )['avg'] or 0

            avg_profit = total_pnl / count if count > 0 else 0

            total_abs_pnl += abs(total_pnl)

            result.append({
                'emotion': emotion_fa,
                'emotion_key': emotion_en,
                'count': count,
                'total_pnl': round(total_pnl, 2),
                'win_count': win_count,
                'loss_count': loss_count,
                'win_rate': round(win_rate, 1),
                'avg_rr': round(avg_rr, 2),
                'avg_profit': round(avg_profit, 2),
                'is_negative': emotion_fa in negative_emotions,
            })

        for item in result:
            if total_abs_pnl > 0:
                item['impact'] = round(abs(item['total_pnl']) / total_abs_pnl * 100, 1)
            else:
                item['impact'] = 0

        negative_loss = sum(item['total_pnl'] for item in result
                            if item['is_negative'] and item['total_pnl'] < 0)
        total_loss_all = sum(item['total_pnl'] for item in result if item['total_pnl'] < 0)

        emotional_ratio = 0
        if total_loss_all < 0:
            emotional_ratio = round(abs(negative_loss) / abs(total_loss_all) * 100, 1)

        if emotional_ratio < 30:
            status = 'good'
            status_text = '✅ عملکرد عالی – کمتر از ۳۰٪ ضررهای شما ناشی از احساسات منفی است. کنترل روانی بالایی دارید.'
            status_color = '#2e7d32'
        elif emotional_ratio < 50:
            status = 'warning'
            status_text = '⚠️ نیاز به توجه – بین ۳۰ تا ۵۰٪ ضررهای شما ناشی از احساسات است. روی مدیریت ترس و طمع کار کنید.'
            status_color = '#f57c00'
        else:
            status = 'danger'
            status_text = '❌ زنگ خطر – بیش از ۵۰٪ ضررهای شما ناشی از احساسات است. بدون کنترل احساسی معامله نکنید!'
            status_color = '#c62828'

        total_profit = trades.aggregate(total=Sum('profit'))['total'] or 0
        result.sort(key=lambda x: x['total_pnl'], reverse=True)

        return Response({
            'has_data': True,
            'total_trades': total_trades,
            'total_profit': round(total_profit, 2),
            'emotions': result,
            'summary': {
                'emotional_ratio': emotional_ratio,
                'status': status,
                'status_text': status_text,
                'status_color': status_color,
                'negative_emotions': negative_emotions,
                'negative_loss': round(negative_loss, 2),
                'total_loss': round(total_loss_all, 2),
            }
        })


# ============================================
# ✅ قوانین معاملاتی (Trading Rules)
# ============================================

class TradingRuleListView(APIView):
    """دریافت لیست قوانین معاملاتی کاربر"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        rules = TradingRule.objects.filter(user=request.user, is_active=True)
        serializer = TradingRuleSerializer(rules, many=True)
        return Response(serializer.data)


class TradingRuleCreateView(APIView):
    """ایجاد قانون معاملاتی جدید"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = TradingRuleSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TradingRuleDetailView(APIView):
    """ویرایش یا حذف یک قانون"""
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self, pk, user):
        try:
            return TradingRule.objects.get(id=pk, user=user)
        except TradingRule.DoesNotExist:
            return None

    def put(self, request, pk):
        rule = self.get_object(pk, request.user)
        if not rule:
            return Response({'error': 'قانون یافت نشد'}, status=status.HTTP_404_NOT_FOUND)

        serializer = TradingRuleSerializer(rule, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        rule = self.get_object(pk, request.user)
        if not rule:
            return Response({'error': 'قانون یافت نشد'}, status=status.HTTP_404_NOT_FOUND)

        rule.is_active = False
        rule.save()
        return Response({'message': 'قانون با موفقیت حذف شد'})


class TradingRuleReorderView(APIView):
    """تغییر ترتیب قوانین"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        rule_ids = request.data.get('rule_ids', [])
        if not rule_ids:
            return Response({'error': 'لیست شناسه‌ها الزامی است'}, status=status.HTTP_400_BAD_REQUEST)

        for index, rule_id in enumerate(rule_ids):
            try:
                rule = TradingRule.objects.get(id=rule_id, user=request.user)
                rule.order_index = index
                rule.save()
            except TradingRule.DoesNotExist:
                pass

        return Response({'message': 'ترتیب با موفقیت به‌روزرسانی شد'})


class RulesReportView(APIView):
    """گزارش تحلیلی پایبندی به قوانین"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        rules = TradingRule.objects.filter(user=user, is_active=True)
        trades = Trade.objects.filter(user=user, is_deleted=False)

        if not rules.exists():
            return Response({
                'has_data': False,
                'message': 'هیچ قانون معاملاتی تعریف نشده است'
            })

        total_rules = rules.count()
        rules_by_category = {}
        for category in TradingRule.RULE_CATEGORIES:
            count = rules.filter(category=category[0]).count()
            if count > 0:
                rules_by_category[category[1]] = count

        total_checks = 0
        total_checked = 0
        rules_stats = []

        for rule in rules:
            checks = TradeRuleCheck.objects.filter(rule=rule, trade__in=trades)
            total = checks.count()
            checked = checks.filter(is_checked=True).count()
            total_checks += total
            total_checked += checked

            checked_trades = checks.filter(is_checked=True).values_list('trade_id', flat=True)
            unchecked_trades = checks.filter(is_checked=False).values_list('trade_id', flat=True)

            checked_profit = Trade.objects.filter(id__in=checked_trades).aggregate(total=Sum('profit'))['total'] or 0
            unchecked_profit = Trade.objects.filter(id__in=unchecked_trades).aggregate(total=Sum('profit'))[
                                   'total'] or 0

            rules_stats.append({
                'rule_id': rule.id,
                'rule_text': rule.rule_text[:50] + ('...' if len(rule.rule_text) > 50 else ''),
                'category': rule.get_category_label(),
                'total_checks': total,
                'checked_count': checked,
                'compliance_rate': round((checked / total * 100), 1) if total > 0 else 0,
                'profit_checked': round(checked_profit, 2),
                'profit_unchecked': round(unchecked_profit, 2),
                'impact': round(checked_profit - unchecked_profit, 2),
            })

        overall_compliance = round((total_checked / total_checks * 100), 1) if total_checks > 0 else 0

        compliance_by_category = {}
        for category, label in TradingRule.RULE_CATEGORIES:
            cat_rules = rules.filter(category=category[0])
            if not cat_rules.exists():
                continue
            cat_checks = TradeRuleCheck.objects.filter(rule__in=cat_rules, trade__in=trades)
            cat_total = cat_checks.count()
            cat_checked = cat_checks.filter(is_checked=True).count()
            if cat_total > 0:
                compliance_by_category[label] = round((cat_checked / cat_total * 100), 1)
            else:
                compliance_by_category[label] = 0

        return Response({
            'has_data': True,
            'total_rules': total_rules,
            'rules_by_category': rules_by_category,
            'overall_compliance': overall_compliance,
            'rules_stats': rules_stats,
            'compliance_by_category': compliance_by_category,
        })


# ============================================
# مشاوره AI (غیراستریم)
# ============================================
class AIConsultationView(APIView):
    """دریافت مشاوره هوشمند از AI (نسخه همزمان)"""
    permission_classes = [permissions.IsAuthenticated, IsAuthenticatedWithSubscription]

    def post(self, request):
        serializer = AIConsultationInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            subscription = UserSubscription.objects.filter(
                user=request.user,
                is_active=True
            ).latest('created_at')

            if not subscription.can_consult_ai():
                return Response({
                    'error': 'limit_reached',
                    'message': f'محدودیت مشاوره AI شما به پایان رسیده است. ({subscription.ai_consultations_limit} مشاوره)'
                }, status=status.HTTP_403_FORBIDDEN)
        except UserSubscription.DoesNotExist:
            return Response({
                'error': 'no_subscription',
                'message': 'شما اشتراک فعالی ندارید. لطفاً اشتراک تهیه کنید.'
            }, status=status.HTTP_403_FORBIDDEN)

        try:
            result = AIService.get_consultation(request.user, serializer.validated_data)

            if isinstance(result, dict) and 'error' in result:
                return Response({
                    'error': result['error'],
                    'message': result.get('message', '')
                }, status=status.HTTP_400_BAD_REQUEST)

            consultation = result
            remaining = subscription.get_remaining_ai_consultations()

            return Response({
                'id': consultation.id,
                'score': consultation.ai_score,
                'response': consultation.ai_response,
                'comparison_stats': consultation.comparison_stats,
                'created_at': consultation.created_at,
                'remaining_consultations': remaining,
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================
# ✅ وضعیت مشاوره (برای پولینگ)
# ============================================
class AIConsultationStatusView(APIView):
    """
    دریافت وضعیت یک مشاوره خاص (برای پولینگ)
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            consultation = AIConsultation.objects.get(id=pk, user=request.user)
        except AIConsultation.DoesNotExist:
            return Response(
                {'error': 'مشاوره یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )

        response_data = {
            'id': consultation.id,
            'status': consultation.status,
            'created_at': consultation.created_at,
            'updated_at': consultation.updated_at,
            'symbol': consultation.symbol,
        }

        if consultation.status == 'completed':
            response_data['result'] = {
                'score': consultation.ai_score,
                'response': consultation.ai_response,
                'comparison_stats': consultation.comparison_stats,
            }
        elif consultation.status == 'failed':
            response_data['error'] = consultation.ai_response.get('error', 'خطای ناشناخته')

        return Response(response_data)


# ============================================
# مشاوره AI با استریم (نسخه ناهمگام جدید)
# ============================================

class AIConsultationStreamView(APIView):
    def post(self, request):
        serializer = AIConsultationInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # ✅ اطمینان از دریافت مدل از درخواست
        validated_data = serializer.validated_data
        model_value = request.data.get('model') or validated_data.get('model')
        if model_value:
            validated_data['model'] = model_value
            logger.info(f"🔍 [AIConsultationStreamView] model received: {model_value}")
        else:
            # اگر مدل ارسال نشده، از پیش‌فرض استفاده کن
            from apps.accounts.models import SystemSetting
            default_model = SystemSetting.objects.get(setting_key='gapgpt_default_model').setting_value or 'o4-mini'
            validated_data['model'] = default_model
            logger.info(f"🔍 [AIConsultationStreamView] Using default model: {default_model}")

        try:
            subscription = UserSubscription.objects.filter(
                user=request.user,
                is_active=True
            ).latest('created_at')

            if not subscription.can_consult_ai():
                return Response({
                    'error': 'limit_reached',
                    'message': f'محدودیت مشاوره AI شما به پایان رسیده است. ({subscription.ai_consultations_limit} مشاوره)'
                }, status=status.HTTP_403_FORBIDDEN)
        except UserSubscription.DoesNotExist:
            return Response({
                'error': 'no_subscription',
                'message': 'شما اشتراک فعالی ندارید. لطفاً اشتراک تهیه کنید.'
            }, status=status.HTTP_403_FORBIDDEN)

        try:
            result = AIService.start_async_consultation(request.user, validated_data)

            if isinstance(result, dict) and 'error' in result:
                return Response({
                    'error': result['error'],
                    'message': result.get('message', '')
                }, status=status.HTTP_400_BAD_REQUEST)

            return Response({
                'consultation_id': result['consultation_id'],
                'status': result['status'],
                'message': result['message'],
            }, status=status.HTTP_202_ACCEPTED)

        except Exception as e:
            logger.error(f"❌ Error in AIConsultationStreamView: {str(e)}")
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================
# تاریخچه و جزئیات مشاوره‌ها
# ============================================
class AIConsultationHistoryView(APIView):
    """دریافت تاریخچه مشاوره‌های کاربر"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        consultations = AIConsultation.objects.filter(
            user=request.user
        ).order_by('-created_at')

        page = request.query_params.get('page', 1)
        page_size = request.query_params.get('page_size', 20)

        start = (int(page) - 1) * int(page_size)
        end = start + int(page_size)

        total = consultations.count()
        paginated = consultations[start:end]

        return Response({
            'results': AIConsultationSerializer(paginated, many=True).data,
            'count': total,
            'page': int(page),
            'page_size': int(page_size),
            'total_pages': (total + int(page_size) - 1) // int(page_size),
        })


class AIConsultationDetailView(APIView):
    """دریافت جزئیات یک مشاوره خاص"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            consultation = AIConsultation.objects.get(id=pk, user=request.user)
            return Response(AIConsultationSerializer(consultation).data)
        except AIConsultation.DoesNotExist:
            return Response(
                {'error': 'مشاوره یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )


class AIConsultationFeedbackView(APIView):
    """ثبت بازخورد برای یک مشاوره"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        serializer = AIConsultationFeedbackSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            consultation = AIFeedbackService.save_feedback(pk, request.user, serializer.validated_data)
            return Response(AIConsultationSerializer(consultation).data)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================
# مدیریت AI (فقط ادمین)
# ============================================
class AIAnalyticsDashboardView(APIView):
    """داشبورد مدیریتی برای توسعه‌دهنده (فقط ادمین)"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.user.is_admin:
            return Response(
                {'error': 'دسترسی غیرمجاز'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            data = AIAnalyticsService.get_admin_dashboard()
            return Response(data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AIPromptVersionView(APIView):
    """مدیریت نسخه‌های پرامپت (فقط ادمین)"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.user.is_admin:
            return Response(
                {'error': 'دسترسی غیرمجاز'},
                status=status.HTTP_403_FORBIDDEN
            )

        versions = AIPromptVersion.objects.all().order_by('-created_at')
        return Response(AIPromptVersionSerializer(versions, many=True).data)

    def post(self, request):
        if not request.user.is_admin:
            return Response(
                {'error': 'دسترسی غیرمجاز'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = AIPromptVersionSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AIPromptVersionDetailView(APIView):
    """ویرایش و حذف نسخه پرامپت (فقط ادمین)"""
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self, pk, user):
        if not user.is_admin:
            return None
        try:
            return AIPromptVersion.objects.get(id=pk)
        except AIPromptVersion.DoesNotExist:
            return None

    def put(self, request, pk):
        if not request.user.is_admin:
            return Response(
                {'error': 'دسترسی غیرمجاز'},
                status=status.HTTP_403_FORBIDDEN
            )

        instance = self.get_object(pk, request.user)
        if not instance:
            return Response(
                {'error': 'نسخه یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = AIPromptVersionSerializer(instance, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        if not request.user.is_admin:
            return Response(
                {'error': 'دسترسی غیرمجاز'},
                status=status.HTTP_403_FORBIDDEN
            )

        instance = self.get_object(pk, request.user)
        if not instance:
            return Response(
                {'error': 'نسخه یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )

        instance.delete()
        return Response({'message': 'نسخه با موفقیت حذف شد'})


# ============================================
# خروجی‌ها
# ============================================
class ExportTradePDFView(APIView):
    """خروجی PDF ترید"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        return Response({'message': 'PDF در حال تولید است'})


class ExportTradeExcelView(APIView):
    """خروجی Excel تریدها"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        trades = Trade.objects.filter(user=request.user, is_deleted=False)

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['تاریخ', 'نماد', 'نوع', 'دسته‌بندی', 'قیمت ورود', 'قیمت خروج', 'سود/زیان'])

        for trade in trades:
            group_name = trade.group.group_name if trade.group else 'بدون دسته‌بندی'
            writer.writerow([
                trade.trade_date, trade.symbol, trade.trade_type,
                group_name, trade.entry_price, trade.close_price, trade.profit
            ])

        response = HttpResponse(output.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="trades_export.csv"'
        return response


# ============================================
# ✅ دریافت قیمت لحظه‌ای
# ============================================
class LivePriceView(APIView):
    """
    دریافت قیمت لحظه‌ای یک نماد از سرویس‌های تنظیم‌شده
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, symbol):
        from .ai_service import AIService

        price = AIService.get_live_price(symbol)

        if price is None:
            return Response(
                {
                    'error': 'قیمت لحظه‌ای در دسترس نیست',
                    'symbol': symbol,
                    'provider': getattr(AIService, 'LIVE_PRICE_PROVIDER', 'none'),
                    'message': 'لطفاً تنظیمات سرویس قیمت را بررسی کنید.'
                },
                status=status.HTTP_404_NOT_FOUND
            )

        return Response({
            'symbol': symbol,
            'price': price,
            'provider': getattr(AIService, 'LIVE_PRICE_PROVIDER', 'unknown'),
            'timestamp': datetime.now().isoformat(),
        })


# ============================================
# ✅ شاخص‌های حرفه‌ای (Advanced Metrics)
# ============================================

class AdvancedMetricsView(APIView):
    """
    دریافت شاخص‌های پیشرفته معاملاتی
    شامل: Sharpe Ratio, Sortino Ratio, Calmar Ratio,
          Profit Factor, Max Drawdown, Kelly Criterion,
          Average R/R, Expectancy, Recovery Factor
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        portfolio_id = request.query_params.get('portfolio_id')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        period = request.query_params.get('period', 'all')  # '7d', '30d', '90d', 'all'

        # ===== تعریف دوره‌ها =====
        today = datetime.now().date()
        periods = [
            ('7d', today - timedelta(days=7)),
            ('30d', today - timedelta(days=30)),
            ('90d', today - timedelta(days=90)),
            ('all', None),
        ]

        # ===== بررسی کش =====
        cache_key = MetricsCache.get_cache_key(
            user.id,
            portfolio_id,
            start_date,
            end_date
        )
        cached_data = MetricsCache.get_cached_metrics(cache_key)

        if cached_data is not None:
            return Response(cached_data)

        result = {}

        # ===== محاسبه برای هر دوره =====
        for period_key, period_start in periods:
            # اگر درخواست خاصی برای یک دوره خاص است
            if period != 'all' and period_key != period:
                continue

            calc = AdvancedMetricsCalculator(
                user=user,
                portfolio_id=portfolio_id,
                start_date=period_start,
                end_date=end_date
            )

            metrics = calc.get_all_metrics()
            result[period_key] = metrics

        # ===== ذخیره در کش =====
        MetricsCache.set_cached_metrics(cache_key, result)

        return Response(result)


class MetricsTrendView(APIView):
    """
    دریافت داده‌های روند شاخص‌ها در بازه زمانی مشخص
    برای نمایش نمودارها
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        portfolio_id = request.query_params.get('portfolio_id')
        days = int(request.query_params.get('days', 90))

        calc = AdvancedMetricsCalculator(
            user=user,
            portfolio_id=portfolio_id
        )

        trend_data = calc.get_trend_data(days=days)
        return Response(trend_data)


class MetricsSummaryView(APIView):
    """
    دریافت خلاصه شاخص‌ها برای کارت‌های داشبورد
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        portfolio_id = request.query_params.get('portfolio_id')

        calc = AdvancedMetricsCalculator(
            user=user,
            portfolio_id=portfolio_id
        )

        metrics = calc.get_all_metrics()

        # فقط شاخص‌های کلیدی برای کارت‌ها
        summary = {
            'sharpe_ratio': metrics.get('sharpe_ratio'),
            'sharpe_desc': metrics.get('sharpe_desc'),
            'sortino_ratio': metrics.get('sortino_ratio'),
            'sortino_desc': metrics.get('sortino_desc'),
            'profit_factor': metrics.get('profit_factor'),
            'profit_factor_desc': metrics.get('profit_factor_desc'),
            'max_drawdown': metrics.get('max_drawdown'),
            'kelly_criterion': metrics.get('kelly_criterion'),
            'kelly_desc': metrics.get('kelly_desc'),
            'total_trades': metrics.get('total_trades'),
            'total_profit': metrics.get('total_profit'),
            'win_rate': metrics.get('win_rate'),
        }

        return Response(summary)


# ============================================
# ویوهای مدیریت پورتفولیو
# ============================================
class PortfolioListCreateView(generics.ListCreateAPIView):
    """لیست و ایجاد پورتفولیو"""
    permission_classes = [permissions.IsAuthenticated, IsAuthenticatedWithSubscription]
    serializer_class = PortfolioSerializer

    def get_queryset(self):
        return Portfolio.objects.filter(user=self.request.user, is_active=True)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class PortfolioDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsAuthenticatedWithSubscription]
    serializer_class = PortfolioDetailSerializer

    def get_queryset(self):
        return Portfolio.objects.filter(user=self.request.user)

    def perform_destroy(self, instance):
        if instance.is_default:
            raise serializers.ValidationError(
                {'error': 'پورتفولیو پیش‌فرض قابل حذف نیست. ابتدا پورتفولیوی دیگری را به عنوان پیش‌فرض انتخاب کنید.'}
            )

        if instance.trades.filter(is_deleted=False).exists():
            raise serializers.ValidationError(
                {'error': 'این پورتفولیو دارای ترید است. ابتدا تریدها را منتقل یا حذف کنید.'}
            )

        instance.is_active = False
        instance.save()
        return Response({'message': 'پورتفولیو با موفقیت غیرفعال شد'})


class PortfolioAnalyticsView(APIView):
    """دریافت آمار تحلیلی یک پورتفولیو"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            portfolio = Portfolio.objects.get(id=pk, user=request.user, is_active=True)
        except Portfolio.DoesNotExist:
            return Response({'error': 'پورتفولیو یافت نشد'}, status=status.HTTP_404_NOT_FOUND)

        trades = portfolio.trades.filter(is_deleted=False)
        total = trades.count()

        if total == 0:
            return Response({
                'portfolio': PortfolioSerializer(portfolio).data,
                'analytics': {
                    'total_trades': 0,
                    'win_rate': 0,
                    'total_profit': 0,
                    'avg_rr': 0,
                    'avg_quality': 0,
                }
            })

        win_count = trades.filter(profit__gt=0).count()
        total_profit = trades.aggregate(Sum('profit'))['profit__sum'] or 0
        avg_rr = trades.filter(risk_reward_ratio__isnull=False).aggregate(Avg('risk_reward_ratio'))['avg'] or 0
        avg_quality = trades.filter(execution_quality_score__isnull=False).aggregate(Avg('execution_quality_score'))[
                          'avg'] or 0

        return Response({
            'portfolio': PortfolioSerializer(portfolio).data,
            'analytics': {
                'total_trades': total,
                'win_rate': round((win_count / total * 100), 1) if total > 0 else 0,
                'total_profit': float(total_profit),
                'avg_rr': round(avg_rr, 2),
                'avg_quality': round(avg_quality, 1),
            }
        })


class CombinedPortfolioAnalyticsView(APIView):
    """دریافت آمار ترکیبی همه پورتفولیوهای کاربر"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        portfolios = Portfolio.objects.filter(user=request.user, is_active=True)
        all_trades = Trade.objects.filter(user=request.user, is_deleted=False)

        total = all_trades.count()
        win_count = all_trades.filter(profit__gt=0).count()
        total_profit = all_trades.aggregate(Sum('profit'))['profit__sum'] or 0
        avg_rr = all_trades.filter(risk_reward_ratio__isnull=False).aggregate(Avg('risk_reward_ratio'))['avg'] or 0

        portfolio_summary = []
        for p in portfolios:
            p_trades = p.trades.filter(is_deleted=False)
            p_total = p_trades.count()
            p_win = p_trades.filter(profit__gt=0).count()
            p_profit = p_trades.aggregate(Sum('profit'))['profit__sum'] or 0
            portfolio_summary.append({
                'id': p.id,
                'name': p.name,
                'icon': p.icon,
                'total_trades': p_total,
                'win_rate': round((p_win / p_total * 100), 1) if p_total > 0 else 0,
                'total_profit': float(p_profit),
                'current_balance': float(p.get_current_balance()),
                'is_default': p.is_default,
            })

        return Response({
            'total_trades': total,
            'win_rate': round((win_count / total * 100), 1) if total > 0 else 0,
            'total_profit': float(total_profit),
            'avg_rr': round(avg_rr, 2),
            'portfolios': portfolio_summary,
        })


# ============================================
# ✅ گزارش‌های ترکیبی و مقایسه‌ای پورتفولیو (جدید)
# ============================================

class PortfolioComparisonView(APIView):
    """
    دریافت داده‌های کامل مقایسه پورتفولیوها
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        engine = PortfolioComparisonEngine(user, start_date, end_date)
        data = engine.get_comparison_data()

        serializer = ComparisonDataSerializer(data)
        return Response(serializer.data)


class PortfolioComparisonSummaryView(APIView):
    """
    دریافت خلاصه مقایسه پورتفولیوها (برای کارت‌ها)
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        engine = PortfolioComparisonEngine(user, start_date, end_date)
        data = engine.get_comparison_data()

        summary_data = {
            'best': data.get('best'),
            'worst': data.get('worst'),
            'most_active': data.get('most_active'),
            'highest_win_rate': data.get('highest_win_rate'),
        }

        serializer = ComparisonSummarySerializer(summary_data)
        return Response(serializer.data)


class PortfolioComparisonChartView(APIView):
    """
    دریافت داده‌های نمودار مقایسه‌ای پورتفولیوها
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        chart_type = request.query_params.get('chart_type', 'cumulative_pnl')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        engine = PortfolioComparisonEngine(user, start_date, end_date)
        data = engine.get_chart_data(chart_type)

        if chart_type == 'cumulative_pnl':
            serializer = CumulativePnLSeriesSerializer(data, many=True)
        elif chart_type == 'radar':
            serializer = RadarMetricsSerializer(data, many=True)
        elif chart_type == 'bar':
            serializer = BarDataItemSerializer(data, many=True)
        else:
            return Response({'error': 'نوع نمودار نامعتبر است'}, status=400)

        return Response(serializer.data)


# ============================================
# ✅ ابزارهای انضباطی (Discipline Tools)
# ============================================

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
        start_date = datetime.now().date() - timedelta(days=days)

        violations = DisciplineViolation.objects.filter(
            user=request.user,
            created_at__date__gte=start_date
        ).order_by('-created_at')

        return Response(DisciplineViolationSerializer(violations, many=True).data)