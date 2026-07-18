from rest_framework import status, generics, permissions, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.db.models import Q, Sum, Avg, Count
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
import csv
import io
from datetime import datetime, timedelta
import logging

from .models import CurrencyPair, TradeGroup, Trade, TradeAnalytics
from .serializers import (
    CurrencyPairSerializer,
    TradeGroupSerializer,
    TradeListSerializer,
    TradeDetailSerializer,
    TradeCreateSerializer,
    TradeUpdateSerializer,
    TradeAnalyticsSerializer
)
from apps.accounts.permissions import IsAuthenticatedWithSubscription, CanTrade
from apps.subscriptions.models import UserSubscription

logger = logging.getLogger(__name__)


# ============ جفت ارزها ============
class CurrencyPairListView(generics.ListAPIView):
    """لیست جفت ارزها"""
    permission_classes = [permissions.IsAuthenticated]
    queryset = CurrencyPair.objects.filter(is_active=True)
    serializer_class = CurrencyPairSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['symbol', 'description', 'base_currency', 'quote_currency']
    ordering_fields = ['symbol', 'pair_type']


class CurrencyPairDetailView(generics.RetrieveAPIView):
    """جزئیات یک جفت ارز"""
    permission_classes = [permissions.IsAuthenticated]
    queryset = CurrencyPair.objects.filter(is_active=True)
    serializer_class = CurrencyPairSerializer
    lookup_field = 'symbol'


# ============ گروه‌های ترید ============
class TradeGroupListCreateView(generics.ListCreateAPIView):
    """لیست و ایجاد گروه‌های ترید"""
    permission_classes = [permissions.IsAuthenticated, IsAuthenticatedWithSubscription]
    serializer_class = TradeGroupSerializer

    def get_queryset(self):
        return TradeGroup.objects.filter(user=self.request.user, is_active=True)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class TradeGroupDetailView(generics.RetrieveUpdateAPIView):
    """جزئیات و ویرایش گروه ترید"""
    permission_classes = [permissions.IsAuthenticated, IsAuthenticatedWithSubscription]
    serializer_class = TradeGroupSerializer

    def get_queryset(self):
        return TradeGroup.objects.filter(user=self.request.user)


class TradeGroupDeleteView(APIView):
    """حذف گروه ترید (غیرفعال کردن)"""
    permission_classes = [permissions.IsAuthenticated, IsAuthenticatedWithSubscription]

    def delete(self, request, pk):
        try:
            group = TradeGroup.objects.get(id=pk, user=request.user)
            group.is_active = False
            group.save()
            return Response({'message': 'گروه با موفقیت حذف شد'})
        except TradeGroup.DoesNotExist:
            return Response(
                {'error': 'گروه یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )


# ============ تریدها ============
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
        )

        # فیلتر بر اساس گروه
        group_id = self.request.query_params.get('group_id')
        if group_id:
            queryset = queryset.filter(group_id=group_id)

        # فیلتر بر اساس نماد
        symbol = self.request.query_params.get('symbol')
        if symbol:
            queryset = queryset.filter(symbol__icontains=symbol)

        # فیلتر بر اساس تاریخ
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(trade_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(trade_date__lte=end_date)

        # فیلتر بر اساس نوع
        trade_type = self.request.query_params.get('trade_type')
        if trade_type:
            queryset = queryset.filter(trade_type=trade_type)

        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

        # افزایش تعداد تریدهای استفاده شده
        subscription = self.request.user.get_active_subscription()
        if subscription:
            subscription.trades_used += 1
            subscription.save()


class TradeDetailView(generics.RetrieveAPIView):
    """جزئیات یک ترید"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TradeDetailSerializer

    def get_queryset(self):
        return Trade.objects.filter(user=self.request.user, is_deleted=False)


class TradeUpdateView(generics.UpdateAPIView):
    """به‌روزرسانی ترید"""
    permission_classes = [permissions.IsAuthenticated, IsAuthenticatedWithSubscription]
    serializer_class = TradeUpdateSerializer

    def get_queryset(self):
        return Trade.objects.filter(user=self.request.user, is_deleted=False)


class TradeDeleteView(APIView):
    """حذف ترید (غیرفعال کردن)"""
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
    """تحلیل و بررسی ترید"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            trade = Trade.objects.get(id=pk, user=request.user, is_deleted=False)

            # محاسبه تحلیل‌ها
            analysis = {
                'trade_id': trade.id,
                'symbol': trade.symbol,
                'trade_date': trade.trade_date,
                'profit': float(trade.profit) if trade.profit else 0,
                'risk_reward': float(trade.risk_reward_ratio) if trade.risk_reward_ratio else 0,
                'execution_quality': trade.execution_quality_score,
                'strategy_adherence': trade.strategy_adherence,
                'emotions': trade.get_emotions(),
                'timeframes': trade.get_timeframes_used(),
                'mistakes': {
                    'code': trade.mistake_code,
                    'weight': float(trade.mistake_weight) if trade.mistake_weight else 0
                },
                'checklist': {
                    'smt_confirmed': trade.smt_confirmed,
                    'key_levels_reviewed': trade.key_levels_reviewed,
                    'bond_dxy_support': trade.bond_dxy_support
                }
            }

            return Response(analysis)

        except Trade.DoesNotExist:
            return Response(
                {'error': 'ترید یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )


# ============ گزارشات ============
class ReportView(APIView):
    """داشبورد گزارشات کلی"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        trades = Trade.objects.filter(user=request.user, is_deleted=False)

        # آمار کلی
        total_trades = trades.count()
        winning_trades = trades.filter(profit__gt=0).count()
        losing_trades = trades.filter(profit__lt=0).count()

        total_profit = trades.aggregate(Sum('profit'))['profit__sum'] or 0
        avg_profit = trades.aggregate(Avg('profit'))['profit__avg'] or 0

        win_rate = (winning_trades / total_trades * 100) if total_trades > 0 else 0

        # بهترین و بدترین ترید
        best_trade = trades.order_by('-profit').first()
        worst_trade = trades.order_by('profit').first()

        return Response({
            'total_trades': total_trades,
            'winning_trades': winning_trades,
            'losing_trades': losing_trades,
            'win_rate': round(win_rate, 2),
            'total_profit': float(total_profit),
            'avg_profit': float(avg_profit),
            'best_trade': {
                'id': best_trade.id if best_trade else None,
                'profit': float(best_trade.profit) if best_trade else 0,
                'symbol': best_trade.symbol if best_trade else None
            } if best_trade else None,
            'worst_trade': {
                'id': worst_trade.id if worst_trade else None,
                'profit': float(worst_trade.profit) if worst_trade else 0,
                'symbol': worst_trade.symbol if worst_trade else None
            } if worst_trade else None
        })


class PnLReportView(APIView):
    """گزارش عملکرد مالی بر اساس نمادها"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        trades = Trade.objects.filter(user=request.user, is_deleted=False)

        # فیلتر بر اساس گروه
        group_id = request.query_params.get('group_id')
        if group_id:
            trades = trades.filter(group_id=group_id)

        # فیلتر بر اساس تاریخ
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        if start_date:
            trades = trades.filter(trade_date__gte=start_date)
        if end_date:
            trades = trades.filter(trade_date__lte=end_date)

        # گزارش بر اساس نماد
        report = []
        symbols = trades.values_list('symbol', flat=True).distinct()

        for symbol in symbols:
            symbol_trades = trades.filter(symbol=symbol)
            total_trades = symbol_trades.count()
            winning = symbol_trades.filter(profit__gt=0).count()
            losing = symbol_trades.filter(profit__lt=0).count()
            total_profit = symbol_trades.aggregate(Sum('profit'))['profit__sum'] or 0
            avg_profit = symbol_trades.aggregate(Avg('profit'))['profit__avg'] or 0

            report.append({
                'symbol': symbol,
                'total_trades': total_trades,
                'winning_trades': winning,
                'losing_trades': losing,
                'win_rate': round((winning / total_trades * 100) if total_trades > 0 else 0, 2),
                'total_profit': float(total_profit),
                'avg_profit': float(avg_profit)
            })

        return Response(report)


class RiskRewardReportView(APIView):
    """گزارش تأثیر نسبت ریسک به ریوارد بر سود نهایی"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        trades = Trade.objects.filter(
            user=request.user,
            is_deleted=False,
            risk_reward_ratio__isnull=False
        )

        # فیلترها
        group_id = request.query_params.get('group_id')
        if group_id:
            trades = trades.filter(group_id=group_id)

        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        if start_date:
            trades = trades.filter(trade_date__gte=start_date)
        if end_date:
            trades = trades.filter(trade_date__lte=end_date)

        # گروه‌بندی بر اساس نسبت RR
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
                total_profit = range_trades.aggregate(Sum('profit'))['profit__sum'] or 0
                avg_profit = range_trades.aggregate(Avg('profit'))['profit__avg'] or 0
                winning = range_trades.filter(profit__gt=0).count()

                report.append({
                    'rr_range': rr_range['label'],
                    'count': count,
                    'winning_trades': winning,
                    'win_rate': round((winning / count * 100), 2),
                    'total_profit': float(total_profit),
                    'avg_profit': float(avg_profit)
                })

        return Response(report)


class WeeklyPerformanceReportView(APIView):
    """گزارش کارایی روزهای هفته"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        trades = Trade.objects.filter(user=request.user, is_deleted=False)

        # فیلترها
        group_id = request.query_params.get('group_id')
        if group_id:
            trades = trades.filter(group_id=group_id)

        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        if start_date:
            trades = trades.filter(trade_date__gte=start_date)
        if end_date:
            trades = trades.filter(trade_date__lte=end_date)

        # روزهای هفته
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        day_names_fa = {
            'Monday': 'دوشنبه',
            'Tuesday': 'سه‌شنبه',
            'Wednesday': 'چهارشنبه',
            'Thursday': 'پنج‌شنبه',
            'Friday': 'جمعه',
            'Saturday': 'شنبه',
            'Sunday': 'یک‌شنبه'
        }

        report = []
        for day in days:
            day_trades = trades.filter(day_of_week=day)
            count = day_trades.count()
            if count > 0:
                total_profit = day_trades.aggregate(Sum('profit'))['profit__sum'] or 0
                avg_profit = day_trades.aggregate(Avg('profit'))['profit__avg'] or 0
                winning = day_trades.filter(profit__gt=0).count()

                report.append({
                    'day': day,
                    'day_fa': day_names_fa.get(day, day),
                    'count': count,
                    'winning_trades': winning,
                    'win_rate': round((winning / count * 100), 2),
                    'total_profit': float(total_profit),
                    'avg_profit': float(avg_profit)
                })

        # مرتب‌سازی بر اساس سود
        report.sort(key=lambda x: x['total_profit'], reverse=True)

        return Response(report)


class ChecklistAdherenceReportView(APIView):
    """گزارش پایبندی به چک‌لیست"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        trades = Trade.objects.filter(user=request.user, is_deleted=False)

        # فیلترها
        group_id = request.query_params.get('group_id')
        if group_id:
            trades = trades.filter(group_id=group_id)

        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        if start_date:
            trades = trades.filter(trade_date__gte=start_date)
        if end_date:
            trades = trades.filter(trade_date__lte=end_date)

        total = trades.count()
        if total == 0:
            return Response({'message': 'هیچ تریدی یافت نشد'})

        # محاسبه پایبندی به هر آیتم
        checklist_items = {
            'smt_confirmed': {'label': 'SMT تایید شد', 'count': 0},
            'key_levels_reviewed': {'label': 'سطوح کلیدی بررسی شد', 'count': 0},
            'bond_dxy_support': {'label': 'حمایت BOND/DXY', 'count': 0},
            'weekly_news_printed': {'label': 'اخبار هفتگی چاپ شد', 'count': 0},
            'zero_hour_identified': {'label': 'ساعت صفر مشخص شد', 'count': 0},
            'asian_range_identified': {'label': 'رنج آسیا مشخص شد', 'count': 0},
            'london_range_identified': {'label': 'رنج لندن مشخص شد', 'count': 0},
            'judas_lo_identified': {'label': 'Judas LO مشخص شد', 'count': 0},
        }

        for item in checklist_items:
            count = trades.filter(**{item: True}).count()
            checklist_items[item]['count'] = count
            checklist_items[item]['percentage'] = round((count / total * 100), 2)

        # محاسبه امتیاز کلی
        total_items = len(checklist_items)
        total_checked = sum([item['count'] for item in checklist_items.values()])
        overall_score = round((total_checked / (total * total_items) * 100), 2)

        return Response({
            'total_trades': total,
            'overall_score': overall_score,
            'items': checklist_items
        })


class PsychologyReportView(APIView):
    """گزارش روانشناسی و احساسات"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        trades = Trade.objects.filter(user=request.user, is_deleted=False)

        # فیلترها
        group_id = request.query_params.get('group_id')
        if group_id:
            trades = trades.filter(group_id=group_id)

        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        if start_date:
            trades = trades.filter(trade_date__gte=start_date)
        if end_date:
            trades = trades.filter(trade_date__lte=end_date)

        # احساسات غالب
        emotions = {
            'focus': {'label': 'تمرکز', 'count': 0, 'winning': 0},
            'calm': {'label': 'آرامش', 'count': 0, 'winning': 0},
            'excited': {'label': 'هیجان', 'count': 0, 'winning': 0},
            'fear': {'label': 'ترس', 'count': 0, 'winning': 0},
            'greed': {'label': 'طمع', 'count': 0, 'winning': 0},
            'relaxed': {'label': 'ریلکس', 'count': 0, 'winning': 0},
            'happy': {'label': 'خوشحال', 'count': 0, 'winning': 0},
            'sad': {'label': 'غمگین', 'count': 0, 'winning': 0},
            'energetic': {'label': 'پرانرژی', 'count': 0, 'winning': 0},
            'tired': {'label': 'خسته', 'count': 0, 'winning': 0},
            'fomo': {'label': 'FOMO', 'count': 0, 'winning': 0},
            'patience': {'label': 'صبر', 'count': 0, 'winning': 0},
            'contentment': {'label': 'قناعت', 'count': 0, 'winning': 0},
        }

        for emotion in emotions:
            emotion_trades = trades.filter(**{emotion: True})
            count = emotion_trades.count()
            winning = emotion_trades.filter(profit__gt=0).count()
            emotions[emotion]['count'] = count
            emotions[emotion]['winning'] = winning
            emotions[emotion]['win_rate'] = round((winning / count * 100), 2) if count > 0 else 0

        # تأثیر کیفیت خواب
        sleep_quality = {}
        for quality in ['خوب', 'متوسط', 'بد']:
            quality_trades = trades.filter(sleep_quality=quality)
            count = quality_trades.count()
            if count > 0:
                total_profit = quality_trades.aggregate(Sum('profit'))['profit__sum'] or 0
                winning = quality_trades.filter(profit__gt=0).count()
                sleep_quality[quality] = {
                    'count': count,
                    'winning_trades': winning,
                    'win_rate': round((winning / count * 100), 2),
                    'total_profit': float(total_profit)
                }

        return Response({
            'emotions': emotions,
            'sleep_quality': sleep_quality
        })


class MistakesReportView(APIView):
    """گزارش فراوانی اشتباهات"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        trades = Trade.objects.filter(
            user=request.user,
            is_deleted=False,
            mistake_code__isnull=False,
            mistake_code__gt=''
        )

        # فیلترها
        group_id = request.query_params.get('group_id')
        if group_id:
            trades = trades.filter(group_id=group_id)

        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        if start_date:
            trades = trades.filter(trade_date__gte=start_date)
        if end_date:
            trades = trades.filter(trade_date__lte=end_date)

        # گروه‌بندی اشتباهات
        mistakes = {}
        for trade in trades:
            code = trade.mistake_code
            if code not in mistakes:
                mistakes[code] = {
                    'code': code,
                    'count': 0,
                    'total_weight': 0,
                    'avg_weight': 0,
                    'trades': []
                }
            mistakes[code]['count'] += 1
            mistakes[code]['total_weight'] += float(trade.mistake_weight) if trade.mistake_weight else 0
            mistakes[code]['trades'].append({
                'id': trade.id,
                'symbol': trade.symbol,
                'date': trade.trade_date,
                'profit': float(trade.profit) if trade.profit else 0
            })

        # محاسبه میانگین وزن
        for code in mistakes:
            if mistakes[code]['count'] > 0:
                mistakes[code]['avg_weight'] = round(
                    mistakes[code]['total_weight'] / mistakes[code]['count'], 2
                )
            mistakes[code]['trades'] = sorted(
                mistakes[code]['trades'],
                key=lambda x: x['date'],
                reverse=True
            )[:5]  # آخرین ۵ ترید

        return Response({
            'total_mistakes': trades.count(),
            'unique_mistakes': len(mistakes),
            'mistakes': list(mistakes.values())
        })


class BiasReportView(APIView):
    """گزارش عملکرد بر اساس جهت بازار"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        trades = Trade.objects.filter(user=request.user, is_deleted=False, bias__isnull=False)

        # فیلترها
        group_id = request.query_params.get('group_id')
        if group_id:
            trades = trades.filter(group_id=group_id)

        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        if start_date:
            trades = trades.filter(trade_date__gte=start_date)
        if end_date:
            trades = trades.filter(trade_date__lte=end_date)

        biases = ['Bullish', 'Bearish', 'Neutral']
        report = []

        for bias in biases:
            bias_trades = trades.filter(bias=bias)
            count = bias_trades.count()
            if count > 0:
                total_profit = bias_trades.aggregate(Sum('profit'))['profit__sum'] or 0
                winning = bias_trades.filter(profit__gt=0).count()
                report.append({
                    'bias': bias,
                    'count': count,
                    'winning_trades': winning,
                    'win_rate': round((winning / count * 100), 2),
                    'total_profit': float(total_profit),
                    'avg_profit': float(total_profit / count)
                })

        return Response(report)


class TimeframeReportView(APIView):
    """گزارش بهترین ترکیب تایم‌فریم"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        trades = Trade.objects.filter(user=request.user, is_deleted=False)

        # فیلترها
        group_id = request.query_params.get('group_id')
        if group_id:
            trades = trades.filter(group_id=group_id)

        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        if start_date:
            trades = trades.filter(trade_date__gte=start_date)
        if end_date:
            trades = trades.filter(trade_date__lte=end_date)

        # ترکیب تایم‌فریم‌ها
        timeframes = ['timeframe_d', 'timeframe_h4', 'timeframe_h1', 'timeframe_m15', 'timeframe_m5', 'timeframe_m1']
        timeframe_labels = {
            'timeframe_d': 'D1',
            'timeframe_h4': 'H4',
            'timeframe_h1': 'H1',
            'timeframe_m15': 'M15',
            'timeframe_m5': 'M5',
            'timeframe_m1': 'M1'
        }

        combinations = {}
        for trade in trades:
            used = [tf for tf in timeframes if getattr(trade, tf)]
            key = '+'.join([timeframe_labels[tf] for tf in used]) if used else 'No TF'

            if key not in combinations:
                combinations[key] = {
                    'combination': key,
                    'count': 0,
                    'total_profit': 0,
                    'winning': 0
                }

            combinations[key]['count'] += 1
            if trade.profit:
                combinations[key]['total_profit'] += float(trade.profit)
                if trade.profit > 0:
                    combinations[key]['winning'] += 1

        # محاسبه آمار
        report = []
        for key, data in combinations.items():
            report.append({
                'combination': key,
                'count': data['count'],
                'winning_trades': data['winning'],
                'win_rate': round((data['winning'] / data['count'] * 100), 2),
                'total_profit': round(data['total_profit'], 2),
                'avg_profit': round(data['total_profit'] / data['count'], 2)
            })

        # مرتب‌سازی بر اساس سود
        report.sort(key=lambda x: x['total_profit'], reverse=True)

        return Response(report)


# ============ خروجی‌ها ============
class ExportTradePDFView(APIView):
    """خروجی PDF ترید"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            trade = Trade.objects.get(id=pk, user=request.user, is_deleted=False)
            # TODO: تولید PDF با استفاده از reportlab
            return Response({'message': 'PDF در حال تولید است'})
        except Trade.DoesNotExist:
            return Response(
                {'error': 'ترید یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )


class ExportTradeExcelView(APIView):
    """خروجی Excel تریدها"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        trades = Trade.objects.filter(user=request.user, is_deleted=False)

        # ایجاد فایل CSV
        output = io.StringIO()
        writer = csv.writer(output)

        # هدر
        writer.writerow([
            'تاریخ', 'نماد', 'نوع', 'قیمت ورود', 'قیمت خروج',
            'سود/زیان', 'حد ضرر', 'نسبت RR', 'کیفیت اجرا'
        ])

        # داده‌ها
        for trade in trades:
            writer.writerow([
                trade.trade_date,
                trade.symbol,
                trade.trade_type,
                trade.entry_price,
                trade.close_price,
                trade.profit,
                trade.stop_loss,
                trade.risk_reward_ratio,
                trade.execution_quality_score
            ])

        response = HttpResponse(output.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="trades_export.csv"'
        return response