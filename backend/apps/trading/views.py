# backend/apps/trading/views.py

from rest_framework import status, generics, permissions, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Sum, Avg, Count, Q, Value, F
from django.db.models.functions import Coalesce
from django.http import HttpResponse, StreamingHttpResponse
from datetime import datetime
import csv
import io
import json
from .models import (
    CurrencyPair, TradeGroup, Trade, AIConsultation, AIPromptVersion,
    AIConsultationAnalytics, TradingRule, TradeRuleCheck
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
)
from .ai_service import AIService, AIFeedbackService, AIAnalyticsService
from apps.accounts.permissions import IsAuthenticatedWithSubscription, CanTrade
from apps.subscriptions.models import UserSubscription
from django.conf import settings


# backend/apps/trading/views.py
# فقط بخش اضافه‌شده برای LivePriceView نمایش داده می‌شود.
# کل فایل views.py بسیار طولانی است، بنابراین فقط کلاس جدید را اضافه کنید.

# backend/apps/trading/views.py
# اضافه کنید در انتهای فایل، قبل از ExportTradePDFView

class LivePriceView(APIView):
    """
    دریافت قیمت لحظه‌ای یک نماد از سرویس‌های تنظیم‌شده
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, symbol):
        from .ai_service import AIService

        # گرفتن قیمت با متد موجود در ai_service
        price = AIService.get_live_price(symbol)

        if price is None:
            # اگر قیمت وجود نداشت، خطای ۴۰۴ با توضیح
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

        # بررسی محدودیت ترید - فقط برای کاربران غیرادمین
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

        # دریافت قوانین بررسی‌شده (ممکن است به‌صورت JSON رشته باشد)
        rule_checks = self.request.data.get('rule_checks', [])
        if isinstance(rule_checks, str):
            try:
                rule_checks = json.loads(rule_checks)
            except json.JSONDecodeError:
                rule_checks = []

        # ✅ دریافت تصویر - فقط اگر آپلود فعال باشد
        screenshot = None
        if settings.SHOW_SCREENSHOT_UPLOAD:
            if hasattr(self.request, 'FILES') and self.request.FILES.get('screenshot'):
                screenshot = self.request.FILES.get('screenshot')
                print("📸 Screenshot received from FILES")
            elif self.request.data.get('screenshot'):
                screenshot = self.request.data.get('screenshot')
                print("📸 Screenshot received from data (Base64)")
            else:
                print("⚠️ No screenshot received")
        else:
            print("ℹ️ Screenshot upload is disabled by admin")

        # لاگ برای دیباگ
        print("=" * 60)
        print("📥 TradeListCreateView.perform_create:")
        print(f"   - group_id: {group_id}")
        print(f"   - rule_checks: {rule_checks}")
        print(f"   - screenshot type: {type(screenshot)}")
        if screenshot and isinstance(screenshot, str):
            print(f"   - screenshot length: {len(screenshot)}")
        print("=" * 60)

        # ✅ حذف rule_checks از validated_data تا تداخل ایجاد نشود
        if hasattr(serializer, 'validated_data') and 'rule_checks' in serializer.validated_data:
            serializer.validated_data.pop('rule_checks')

        # ذخیره ترید با تصویر
        trade = serializer.save(user=user, group=group, screenshot=screenshot)

        # ثبت بررسی قوانین
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
        """Override متد update برای لاگ کردن خطاهای اعتبارسنجی"""
        print("=" * 60)
        print("📥 Received data in TradeUpdateView.update:")
        print(f"   - request.data: {request.data}")
        print(f"   - request.FILES: {request.FILES}")
        print(f"   - screenshot from data: {request.data.get('screenshot', 'NOT FOUND')}")
        print("=" * 60)

        # دریافت serializer
        serializer = self.get_serializer(data=request.data, partial=True)

        # اعتبارسنجی دستی و لاگ کردن خطاها
        if not serializer.is_valid():
            print("❌ Validation errors:")
            print(serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # اگر اعتبارسنجی موفق بود، به‌روزرسانی را انجام بده
        return super().update(request, *args, **kwargs)

    def perform_update(self, serializer):
        """ذخیره تصویر در صورت وجود (از هر دو منبع)"""
        print("✅ Validation passed, performing update...")

        # ✅ دریافت تصویر - فقط اگر آپلود فعال باشد
        screenshot = None
        if settings.SHOW_SCREENSHOT_UPLOAD:
            if hasattr(self.request, 'FILES') and self.request.FILES.get('screenshot'):
                screenshot = self.request.FILES.get('screenshot')
                print("📸 Screenshot received from FILES (update)")
            elif self.request.data.get('screenshot') is not None:
                screenshot = self.request.data.get('screenshot')
                print("📸 Screenshot received from data (Base64) (update)")
            else:
                print("⚠️ No screenshot in update request")
        else:
            print("ℹ️ Screenshot upload is disabled by admin (update)")

        # لاگ برای دیباگ
        if screenshot and isinstance(screenshot, str):
            print(f"   - screenshot length: {len(screenshot)}")

        # دریافت قوانین بررسی‌شده
        rule_checks = self.request.data.get('rule_checks', [])
        if isinstance(rule_checks, str):
            try:
                rule_checks = json.loads(rule_checks)
            except json.JSONDecodeError:
                rule_checks = []

        # ✅ حذف rule_checks از validated_data تا تداخل ایجاد نشود
        if hasattr(serializer, 'validated_data') and 'rule_checks' in serializer.validated_data:
            serializer.validated_data.pop('rule_checks')

        # ذخیره ترید
        if screenshot is not None:
            serializer.save(screenshot=screenshot)
        else:
            serializer.save()

        # بروزرسانی بررسی قوانین
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
        trades.filter(execution_quality_score__isnull=False).aggregate(avg=Avg('execution_quality_score'))['avg'] or 0

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

        # لیست احساسات ممکن (بر اساس فیلدهای موجود در مدل)
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

        # احساسات منفی برای محاسبه Emotional P&L Ratio
        negative_emotions = ['ترس', 'طمع', 'هیجان', 'FOMO', 'استرس']

        result = []
        total_abs_pnl = 0

        # محاسبه آمار برای هر احساس
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

        # محاسبه impact
        for item in result:
            if total_abs_pnl > 0:
                item['impact'] = round(abs(item['total_pnl']) / total_abs_pnl * 100, 1)
            else:
                item['impact'] = 0

        # محاسبه Emotional P&L Ratio
        negative_loss = sum(item['total_pnl'] for item in result
                            if item['is_negative'] and item['total_pnl'] < 0)
        total_loss_all = sum(item['total_pnl'] for item in result if item['total_pnl'] < 0)

        emotional_ratio = 0
        if total_loss_all < 0:
            emotional_ratio = round(abs(negative_loss) / abs(total_loss_all) * 100, 1)

        # تعیین وضعیت با پیام‌های جدید
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

        # محاسبه پایبندی کلی
        total_checks = 0
        total_checked = 0
        rules_stats = []

        for rule in rules:
            checks = TradeRuleCheck.objects.filter(rule=rule, trade__in=trades)
            total = checks.count()
            checked = checks.filter(is_checked=True).count()
            total_checks += total
            total_checked += checked

            # محاسبه عملکرد تریدهایی که قانون رعایت شده vs نشده
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

        # پایبندی به تفکیک دسته‌بندی
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
# ✅ دریافت لیست مدل‌های هوش مصنوعی موجود
# ============================================
class AvailableModelsView(APIView):
    """دریافت لیست مدل‌های هوش مصنوعی قابل انتخاب توسط کاربر"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        models_str = getattr(settings, 'OLLAMA_AVAILABLE_MODELS', 'llama3.1:8b')
        models = [m.strip() for m in models_str.split(',') if m.strip()]
        return Response(models)


# ============================================
# مشاوره AI (غیراستریم)
# ============================================
# backend/apps/trading/views.py
# فقط بخش AIConsultationView و AIConsultationStreamView اصلاح شده است

# backend/apps/trading/views.py
# فقط بخش‌های اصلاح‌شده نمایش داده می‌شود. کل فایل را در ادامه کامل خواهم داد.

class AIConsultationView(APIView):
    """دریافت مشاوره هوشمند از AI"""
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


class AIConsultationStreamView(APIView):
    """دریافت مشاوره هوشمند از AI به صورت استریم با پشتیبانی کامل CORS"""
    permission_classes = [permissions.IsAuthenticated, IsAuthenticatedWithSubscription]

    def post(self, request):
        serializer = AIConsultationInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # بررسی محدودیت مشاوره
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
            result = AIService.get_consultation_stream(request.user, serializer.validated_data)

            if isinstance(result, dict) and 'error' in result:
                return Response({
                    'error': result['error'],
                    'message': result.get('message', '')
                }, status=status.HTTP_400_BAD_REQUEST)

            if isinstance(result, tuple) and len(result) == 2:
                consultation, generator = result
            else:
                return Response({
                    'error': 'invalid_response',
                    'message': 'پاسخ نامعتبر از سرویس AI'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            def stream_generator():
                for chunk in generator():
                    yield chunk

            response = StreamingHttpResponse(stream_generator(), content_type='text/plain; charset=utf-8')

            # ===== افزودن هدرهای CORS =====
            response['Access-Control-Allow-Origin'] = '*'
            response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
            response['Access-Control-Allow-Headers'] = 'Authorization, Content-Type, Accept, X-Requested-With'
            response['Access-Control-Expose-Headers'] = 'X-Consultation-ID, X-Total-Time'
            response['X-Consultation-ID'] = str(consultation.id)

            return response

        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # ===== پشتیبانی از درخواست OPTIONS (preflight) =====
    def options(self, request, *args, **kwargs):
        response = Response()
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Authorization, Content-Type, Accept, X-Requested-With'
        response['Access-Control-Max-Age'] = '86400'
        return response



# ============================================
# مشاوره AI با استریم (اصلاح‌شده)
# ============================================
# backend/apps/trading/views.py
# فقط بخش‌های مربوط به AIConsultationStreamView اصلاح شده است

# ============================================
# مشاوره AI با استریم (اصلاح‌شده با CORS)
# ============================================
# backend/apps/trading/views.py
# فقط بخش مربوط به AIConsultationStreamView اصلاح شده است
# بقیه فایل بدون تغییر باقی می‌ماند

# ============================================
# مشاوره AI با استریم (اصلاح‌شده با CORS)
# ============================================
class AIConsultationStreamView(APIView):
    """
    دریافت مشاوره هوشمند از AI به صورت استریم با پشتیبانی کامل CORS
    """
    permission_classes = [permissions.IsAuthenticated, IsAuthenticatedWithSubscription]

    def post(self, request):
        serializer = AIConsultationInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # بررسی محدودیت مشاوره
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
            result = AIService.get_consultation_stream(request.user, serializer.validated_data)

            if isinstance(result, dict) and 'error' in result:
                return Response({
                    'error': result['error'],
                    'message': result.get('message', '')
                }, status=status.HTTP_400_BAD_REQUEST)

            if isinstance(result, tuple) and len(result) == 2:
                consultation, generator = result
            else:
                return Response({
                    'error': 'invalid_response',
                    'message': 'پاسخ نامعتبر از سرویس AI'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            def stream_generator():
                for chunk in generator():
                    yield chunk

            response = StreamingHttpResponse(stream_generator(), content_type='text/plain; charset=utf-8')

            # ===== افزودن هدرهای CORS به صورت دستی =====
            # این کار ضروری است زیرا StreamingHttpResponse به‌طور خودکار CORS را اضافه نمی‌کند
            response['Access-Control-Allow-Origin'] = '*'
            response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
            response['Access-Control-Allow-Headers'] = 'Authorization, Content-Type, Accept, X-Requested-With'
            response['Access-Control-Expose-Headers'] = 'X-Consultation-ID, X-Total-Time'
            response['X-Consultation-ID'] = str(consultation.id)

            return response

        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # ===== پشتیبانی از درخواست OPTIONS (preflight) =====
    def options(self, request, *args, **kwargs):
        response = Response()
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Authorization, Content-Type, Accept, X-Requested-With'
        response['Access-Control-Max-Age'] = '86400'  # 24 ساعت کش
        return response



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