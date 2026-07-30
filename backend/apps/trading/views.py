# backend/apps/trading/views.py

from rest_framework import status, generics, permissions, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Sum, Avg
from django.http import HttpResponse
import csv
import io
from .models import CurrencyPair, TradeGroup, Trade
from .serializers import (
    CurrencyPairSerializer,
    TradeGroupSerializer,
    TradeListSerializer,
    TradeDetailSerializer,
    TradeCreateSerializer,
    TradeUpdateSerializer
)
from apps.accounts.permissions import IsAuthenticatedWithSubscription, CanTrade


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
        """فقط گروه‌های کاربر جاری را برگردان"""
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
        """ایجاد گروه جدید با کاربر جاری"""
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
# تریدها
# ============================================
class TradeListCreateView(generics.ListCreateAPIView):
    """لیست و ایجاد تریدها"""
    permission_classes = [permissions.IsAuthenticated, IsAuthenticatedWithSubscription, CanTrade]

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
        group_id = self.request.data.get('group_id')
        if not group_id:
            from rest_framework import serializers
            raise serializers.ValidationError({'group_id': 'انتخاب دسته‌بندی اجباری است'})

        try:
            group = TradeGroup.objects.get(id=group_id, user=self.request.user, is_active=True)
        except TradeGroup.DoesNotExist:
            from rest_framework import serializers
            raise serializers.ValidationError({'group_id': 'دسته‌بندی انتخاب شده معتبر نیست'})

        serializer.save(user=self.request.user, group=group)


class TradeDetailView(generics.RetrieveAPIView):
    """جزئیات یک ترید"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TradeDetailSerializer

    def get_queryset(self):
        return Trade.objects.filter(user=self.request.user, is_deleted=False).select_related('group')


class TradeUpdateView(generics.UpdateAPIView):
    """به‌روزرسانی ترید"""
    permission_classes = [permissions.IsAuthenticated, IsAuthenticatedWithSubscription]
    serializer_class = TradeUpdateSerializer

    def get_queryset(self):
        return Trade.objects.filter(user=self.request.user, is_deleted=False).select_related('group')


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