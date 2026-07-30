# backend/apps/trading/urls.py

from django.urls import path
from . import views

app_name = 'trading'

urlpatterns = [
    # ============================================
    # جفت ارزها
    # ============================================
    path('currency-pairs/', views.CurrencyPairListView.as_view(), name='currency_pairs'),
    path('currency-pairs/<str:symbol>/', views.CurrencyPairDetailView.as_view(), name='currency_pair_detail'),

    # ============================================
    # گروه‌های ترید - استفاده از کلاس‌های موجود
    # ============================================
    path('groups/', views.TradeGroupListCreateView.as_view(), name='trade_groups'),
    path('groups/<int:pk>/', views.TradeGroupDetailView.as_view(), name='trade_group_detail'),
    path('groups/<int:pk>/delete/', views.TradeGroupDeleteView.as_view(), name='trade_group_delete'),

    # ============================================
    # تریدها
    # ============================================
    path('trades/', views.TradeListCreateView.as_view(), name='trade_list'),
    path('trades/<int:pk>/', views.TradeDetailView.as_view(), name='trade_detail'),
    path('trades/<int:pk>/update/', views.TradeUpdateView.as_view(), name='trade_update'),
    path('trades/<int:pk>/delete/', views.TradeDeleteView.as_view(), name='trade_delete'),
    path('trades/<int:pk>/analysis/', views.TradeAnalysisView.as_view(), name='trade_analysis'),

    # ============================================
    # گزارشات
    # ============================================
    path('reports/', views.ReportView.as_view(), name='reports'),
    path('reports/pnl/', views.PnLReportView.as_view(), name='pnl_report'),
    path('reports/risk-reward/', views.RiskRewardReportView.as_view(), name='risk_reward_report'),
    path('reports/weekly/', views.WeeklyPerformanceReportView.as_view(), name='weekly_performance'),
    path('reports/checklist/', views.ChecklistAdherenceReportView.as_view(), name='checklist_adherence'),
    path('reports/psychology/', views.PsychologyReportView.as_view(), name='psychology_report'),
    path('reports/mistakes/', views.MistakesReportView.as_view(), name='mistakes_report'),
    path('reports/bias/', views.BiasReportView.as_view(), name='bias_report'),
    path('reports/timeframe/', views.TimeframeReportView.as_view(), name='timeframe_report'),
]