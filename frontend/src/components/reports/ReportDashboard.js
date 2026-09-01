// frontend/src/components/reports/ReportDashboard.js

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { usePortfolio } from '../../contexts/PortfolioContext';
import RealApiService from '../../services/realApiService';
import './ReportDashboard.css';

// ایمپورت گزارش‌ها
import PnLReport from './reports/PnLReport';
import RiskRewardReport from './reports/RiskRewardReport';
import WeeklyPerformanceReport from './reports/WeeklyPerformanceReport';
import ChecklistReport from './reports/ChecklistReport';
import SleepNutritionReport from './reports/SleepNutritionReport';
import FeelingsHeatmapReport from './reports/FeelingsHeatmapReport';
import ReactionReport from './reports/ReactionReport';
import MistakesFrequencyReport from './reports/MistakesFrequencyReport';
import ExecutionQualityReport from './reports/ExecutionQualityReport';
import BiasReport from './reports/BiasReport';
import TimeframeReport from './reports/TimeframeReport';
import RiskManagementReport from './reports/RiskManagementReport';
import LoadingBar from '../common/LoadingBar';
const ReportDashboard = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { showToast } = useToast();
  const { portfolios, currentPortfolioId } = usePortfolio();
  const reportContentRef = useRef(null);

  const [trades, setTrades] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedPortfolio, setSelectedPortfolio] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [selectedReport, setSelectedReport] = useState('pnl');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const groupsResponse = await RealApiService.getTradeGroups();
        let groupsData = groupsResponse.data.results || groupsResponse.data || [];

        const userGroups = groupsData.filter(g => g.user_id === user?.id);

        const allCategory = { id: 0, name: 'همه دسته‌بندی‌ها', icon: '📊' };
        setCategories([allCategory, ...userGroups.map(g => ({
          id: g.id,
          name: g.group_name,
          icon: g.icon || '📁'
        }))]);

        const tradesResponse = await RealApiService.getTrades();
        const tradesData = tradesResponse.data.results || tradesResponse.data || [];
        setTrades(tradesData);

        if (categories.length > 0) {
          setSelectedCategory(categories[0]);
        }

        // تنظیم پورتفولیو پیش‌فرض
        if (portfolios.length > 0) {
          setSelectedPortfolio(currentPortfolioId || portfolios[0]?.id || null);
        }

      } catch (error) {
        console.error('Error loading data:', error);
        showToast('خطا در بارگذاری داده‌ها', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, showToast, portfolios, currentPortfolioId]);

  const filteredTrades = useMemo(() => {
    let result = [...trades];

    if (selectedCategory && selectedCategory.id !== 0) {
      result = result.filter(t =>
        t.group === selectedCategory.id ||
        t.group_id === selectedCategory.id
      );
    }

    // ✅ فیلتر بر اساس پورتفولیو
    if (selectedPortfolio) {
      result = result.filter(t => {
        const p = t.portfolio_info || t.portfolio;
        return p && p.id === selectedPortfolio;
      });
    }

    if (dateRange.startDate) {
      result = result.filter(t => t.trade_date >= dateRange.startDate);
    }

    if (dateRange.endDate) {
      result = result.filter(t => t.trade_date <= dateRange.endDate);
    }

    return result;
  }, [trades, selectedCategory, selectedPortfolio, dateRange]);

  const reports = [
    { id: 'pnl', label: '📊 P&L', labelEn: 'Profit & Loss', component: PnLReport },
    { id: 'risk_reward', label: '📈 نسبت R:R', labelEn: 'Risk/Reward Ratio', component: RiskRewardReport },
    { id: 'weekly', label: '📅 عملکرد هفتگی', labelEn: 'Weekly Performance', component: WeeklyPerformanceReport },
    { id: 'checklist', label: '✅ چک‌لیست', labelEn: 'Checklist Adherence', component: ChecklistReport },
    { id: 'sleep_nutrition', label: '😴 خواب و تغذیه', labelEn: 'Sleep & Nutrition', component: SleepNutritionReport },
    { id: 'feelings', label: '🧠 نقشه احساسات', labelEn: 'Feelings Heatmap', component: FeelingsHeatmapReport },
    { id: 'reaction', label: '🎭 واکنش‌ها', labelEn: 'Reactions', component: ReactionReport },
    { id: 'mistakes', label: '❌ اشتباهات', labelEn: 'Mistakes Frequency', component: MistakesFrequencyReport },
    { id: 'execution', label: '🎯 کیفیت اجرا', labelEn: 'Execution Quality', component: ExecutionQualityReport },
    { id: 'bias', label: '📉 بایاس', labelEn: 'Bias Analysis', component: BiasReport },
    { id: 'timeframe', label: '⏰ تایم‌فریم', labelEn: 'Timeframe Analysis', component: TimeframeReport },
    { id: 'risk_management', label: '🛡️ مدیریت ریسک', labelEn: 'Risk Management', component: RiskManagementReport },
  ];

  const handlePrint = () => {
    const printContent = reportContentRef.current;
    if (!printContent) {
      showToast('محتوایی برای چاپ وجود ندارد', 'warning');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      showToast('لطفاً pop-up را فعال کنید', 'warning');
      return;
    }

    const currentReport = reports.find(r => r.id === selectedReport);
    const title = currentReport ? `${currentReport.label} - ${currentReport.labelEn}` : 'گزارش تحلیل';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="fa">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Vazir', 'Segoe UI', Tahoma, sans-serif;
            padding: 30px;
            background: #ffffff;
            color: #1a1a2e;
            direction: rtl;
            line-height: 1.6;
          }
          .print-header {
            text-align: center;
            padding: 20px 0 16px 0;
            margin-bottom: 20px;
            border-bottom: 3px solid #1a237e;
          }
          .print-header h1 {
            font-size: 24px;
            color: #1a237e;
            margin: 0;
          }
          .print-header .sub-title {
            color: #555;
            font-size: 14px;
            margin-top: 4px;
          }
          .print-header .print-date {
            font-size: 12px;
            color: #888;
            margin-top: 6px;
          }
          .print-content {
            padding: 0 10px;
          }
          .print-footer {
            text-align: center;
            padding-top: 16px;
            border-top: 1px solid #e0e0e0;
            margin-top: 20px;
            color: #999;
            font-size: 12px;
          }
          @media print {
            body { padding: 15px; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="print-header">
          <h1>📊 ژورنال حرفه‌ای ترید</h1>
          <div class="sub-title">${title}</div>
          <div class="print-date">تاریخ چاپ: ${new Date().toLocaleDateString('fa-IR')} - ساعت: ${new Date().toLocaleTimeString('fa-IR')}</div>
        </div>
        <div class="print-content">
          ${printContent.innerHTML}
        </div>
        <div class="print-footer">
          ژورنال حرفه‌ای ترید - تمامی حقوق محفوظ است
        </div>
        <script>
          window.onload = function() { 
            setTimeout(function() { window.print(); }, 500);
          }
        <\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const renderReport = () => {
    const report = reports.find(r => r.id === selectedReport);
    if (!report) return null;

    const ReportComponent = report.component;
    return (
      <div ref={reportContentRef} className="report-print-content">
        <ReportComponent
          trades={filteredTrades}
          dateRange={dateRange}
          selectedCategory={selectedCategory}
          isDark={isDark}
        />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="report-dashboard-loading">
        <LoadingBar text="در حال بارگذاری..." />
      </div>
    );
  }

  return (
    <div className={`report-dashboard ${isDark ? 'dark' : 'light'}`}>
      <div className="report-header">
        <h2>📊 گزارش های پیشرفته</h2>
        <div className="header-actions">
          <button className="btn-print-report" onClick={handlePrint}>
            🖨️ چاپ گزارش
          </button>
          <button className="btn-back" onClick={() => window.history.back()}>
            ↩️ بازگشت
          </button>
        </div>
      </div>
      <div className="report-controls">
        <div className="filter-group">
          <label>دسته‌بندی</label>
          <select
            value={selectedCategory?.id || 0}
            onChange={(e) => {
              const category = categories.find(c => c.id === parseInt(e.target.value));
              setSelectedCategory(category || categories[0]);
            }}
          >
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* ✅ فیلتر پورتفولیو */}
        <div className="filter-group">
          <label>پورتفولیو</label>
          <select
            value={selectedPortfolio || ''}
            onChange={(e) => setSelectedPortfolio(e.target.value ? parseInt(e.target.value) : null)}
          >
            <option value="">همه پورتفولیوها</option>
            {portfolios.map(p => (
              <option key={p.id} value={p.id}>
                {p.icon || '📊'} {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>از تاریخ</label>
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
          />
        </div>

        <div className="filter-group">
          <label>تا تاریخ</label>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
          />
        </div>

        <button
          className="btn-clear-filters"
          onClick={() => {
            setDateRange({ startDate: '', endDate: '' });
            setSelectedCategory(categories[0]);
            setSelectedPortfolio(null);
          }}
        >
          🗑️ پاک کردن فیلترها
        </button>
      </div>

      <div className="report-tabs">
        {reports.map(report => (
          <button
            key={report.id}
            className={`report-tab ${selectedReport === report.id ? 'active' : ''}`}
            onClick={() => setSelectedReport(report.id)}
            title={report.labelEn}
          >
            {report.label}
            <span className="report-tab-en">({report.labelEn})</span>
          </button>
        ))}
      </div>

      <div className="report-content">
        {renderReport()}
      </div>
    </div>
  );
};

export default ReportDashboard;