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
    # گروه‌های ترید
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

    # ============================================
    # نمادها (برای لیست کامل)
    # ============================================
    path('symbols/', views.SymbolListView.as_view(), name='symbols'),

    # ============================================
    # تحلیل دسته‌بندی شده
    # ============================================
    path('analytics/', views.AnalyticsView.as_view(), name='analytics'),

    # ============================================
    # ✅ تحلیل مالی احساسات (Emotional P&L)
    # ============================================
    path('analytics/emotional-pnl/', views.EmotionalPnLView.as_view(), name='emotional_pnl'),

    # ============================================
    # ✅ قوانین معاملاتی (Trading Rules)
    # ============================================
    path('rules/', views.TradingRuleListView.as_view(), name='rules_list'),
    path('rules/create/', views.TradingRuleCreateView.as_view(), name='rules_create'),
    path('rules/<int:pk>/', views.TradingRuleDetailView.as_view(), name='rules_detail'),
    path('rules/reorder/', views.TradingRuleReorderView.as_view(), name='rules_reorder'),
    path('rules/report/', views.RulesReportView.as_view(), name='rules_report'),

    # ============================================
    # ✅ لیست مدل‌های هوش مصنوعی
    # ============================================
    path('ai/models/', views.AvailableModelsView.as_view(), name='ai_models'),

    # ============================================
    # مشاوره AI (غیراستریم)
    # ============================================
    path('ai-consult/', views.AIConsultationView.as_view(), name='ai_consult'),

    # ============================================
    # مشاوره AI با استریم (برای نمایش تدریجی)
    # ============================================
    path('ai-consult-stream/', views.AIConsultationStreamView.as_view(), name='ai_consult_stream'),

    # ============================================
    # تاریخچه مشاوره‌ها
    # ============================================
    path('ai-consult-history/', views.AIConsultationHistoryView.as_view(), name='ai_consult_history'),

    # ============================================
    # جزئیات یک مشاوره خاص
    # ============================================
    path('ai-consult/<int:pk>/', views.AIConsultationDetailView.as_view(), name='ai_consult_detail'),

    # ============================================
    # ثبت بازخورد برای یک مشاوره
    # ============================================
    path('ai-consult/<int:pk>/feedback/', views.AIConsultationFeedbackView.as_view(), name='ai_consult_feedback'),

    # ============================================
    # مدیریت AI (فقط ادمین)
    # ============================================
    path('admin/ai/dashboard/', views.AIAnalyticsDashboardView.as_view(), name='ai_dashboard'),
    path('admin/ai/prompts/', views.AIPromptVersionView.as_view(), name='ai_prompts'),
    path('admin/ai/prompts/<int:pk>/', views.AIPromptVersionDetailView.as_view(), name='ai_prompt_detail'),

    # ============================================
    # ✅ قیمت لحظه‌ای (جدید)
    # ============================================
    path('live-price/<str:symbol>/', views.LivePriceView.as_view(), name='live_price'),
    # ============================================
    # خروجی‌ها
    # ============================================
    path('export/pdf/<int:pk>/', views.ExportTradePDFView.as_view(), name='export_pdf'),
    path('export/excel/', views.ExportTradeExcelView.as_view(), name='export_excel'),
]