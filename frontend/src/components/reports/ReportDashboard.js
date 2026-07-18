// frontend/src/components/reports/ReportDashboard.js

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import './ReportDashboard.css';

// کامپوننت‌های گزارشات
import PnLReport from './reports/PnLReport';
import RiskRewardReport from './reports/RiskRewardReport';
import WeeklyPerformanceReport from './reports/WeeklyPerformanceReport';
import ChecklistReport from './reports/ChecklistReport';
import RiskManagementReport from './reports/RiskManagementReport';
import SleepNutritionReport from './reports/SleepNutritionReport';
import FeelingsHeatmapReport from './reports/FeelingsHeatmapReport';
import ReactionReport from './reports/ReactionReport';
import MistakesFrequencyReport from './reports/MistakesFrequencyReport';
import ExecutionQualityReport from './reports/ExecutionQualityReport';
import BiasReport from './reports/BiasReport';
import TimeframeReport from './reports/TimeframeReport';

const ReportDashboard = () => {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [activeReport, setActiveReport] = useState('pnl');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const [trades, setTrades] = useState([]);
  const printRef = useRef();

  // بارگذاری داده‌ها
  useEffect(() => {
    const savedTrades = localStorage.getItem('trades');
    const savedCategories = localStorage.getItem('categories');

    if (savedTrades) {
      setTrades(JSON.parse(savedTrades));
    }

    if (savedCategories) {
      setCategories(JSON.parse(savedCategories));
    } else {
      setCategories([{ id: 1, name: 'همه تریدها', icon: '📊' }]);
    }
  }, []);

  // گزارشات موجود
  const reports = [
    { id: 'pnl', title: '📊 عملکرد مالی (PnL) بر اساس نمادها', category: 'مالی' },
    { id: 'riskReward', title: '📈 تأثیر نسبت ریسک به ریوارد (R:R) بر سود نهایی', category: 'مالی' },
    { id: 'weekly', title: '📅 کارایی روزهای هفته (بهترین و بدترین روز)', category: 'مالی' },
    { id: 'checklist', title: '✅ پایبندی به چک‌لیست', category: 'انضباط' },
    { id: 'riskManagement', title: '🛡️ تخطی از مدیریت سرمایه', category: 'انضباط' },
    { id: 'sleepNutrition', title: '😴 تأثیر کیفیت خواب و تغذیه بر عملکرد', category: 'روانشناسی' },
    { id: 'feelings', title: '🔥 نقشه حرارتی احساسات غالب', category: 'روانشناسی' },
    { id: 'reaction', title: '🎭 واکنش به سود و ضرر (رفتار پس از نتیجه)', category: 'روانشناسی' },
    { id: 'mistakes', title: '📋 جدول فراوانی اشتباهات', category: 'تحلیل اشتباهات' },
    { id: 'executionQuality', title: '⭐ کیفیت اجرا در برابر نتیجه', category: 'تحلیل اشتباهات' },
    { id: 'bias', title: '🎯 عملکرد بر اساس جهت بازار (Bias)', category: 'بایاس و تایم‌فریم' },
    { id: 'timeframe', title: '⏰ بهترین ترکیب تایم‌فریم', category: 'بایاس و تایم‌فریم' }
  ];

  // فیلتر کردن تریدها بر اساس تاریخ و دسته‌بندی
  const getFilteredTrades = () => {
    let filtered = trades;

    if (dateRange.startDate) {
      filtered = filtered.filter(t => t.trade_date >= dateRange.startDate);
    }
    if (dateRange.endDate) {
      filtered = filtered.filter(t => t.trade_date <= dateRange.endDate);
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category_id === parseInt(selectedCategory));
    }

    return filtered;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    alert('📄 در حال تولید PDF... (در نسخه نهایی، این قابلیت با jsPDF پیاده‌سازی خواهد شد)');
  };

  const renderReport = () => {
    const filteredTrades = getFilteredTrades();
    const props = {
      dateRange,
      selectedCategory,
      isDark,
      trades: filteredTrades
    };

    switch(activeReport) {
      case 'pnl': return <PnLReport {...props} />;
      case 'riskReward': return <RiskRewardReport {...props} />;
      case 'weekly': return <WeeklyPerformanceReport {...props} />;
      case 'checklist': return <ChecklistReport {...props} />;
      case 'riskManagement': return <RiskManagementReport {...props} />;
      case 'sleepNutrition': return <SleepNutritionReport {...props} />;
      case 'feelings': return <FeelingsHeatmapReport {...props} />;
      case 'reaction': return <ReactionReport {...props} />;
      case 'mistakes': return <MistakesFrequencyReport {...props} />;
      case 'executionQuality': return <ExecutionQualityReport {...props} />;
      case 'bias': return <BiasReport {...props} />;
      case 'timeframe': return <TimeframeReport {...props} />;
      default: return <PnLReport {...props} />;
    }
  };

  return (
    <div className={`report-dashboard ${isDark ? 'dark' : 'light'}`}>
      {/* Header */}
      <div className="report-header">
        <h2>📊 تحلیل تریدها</h2>
        <div className="header-actions">
          <button className="btn-print" onClick={handlePrint}>
            🖨️ چاپ
          </button>
          <button className="btn-pdf" onClick={handleExportPDF}>
            📄 PDF
          </button>
          <button className="btn-back" onClick={() => navigate('/')}>
            ↩️ بازگشت
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="filter-group">
          <label>از تاریخ</label>
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
          />
        </div>
        <div className="filter-group">
          <label>تا تاریخ</label>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
          />
        </div>
        <div className="filter-group">
          <label>دسته‌بندی</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">همه دسته‌بندی‌ها</option>
            {categories.filter(c => c.id !== 1).map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Report Navigation */}
      <div className="report-nav">
        <div className="report-categories">
          {['مالی', 'انضباط', 'روانشناسی', 'تحلیل اشتباهات', 'بایاس و تایم‌فریم'].map(category => (
            <div key={category} className="category-section">
              <h4 className="category-title">{category}</h4>
              <div className="category-reports">
                {reports
                  .filter(r => r.category === category)
                  .map(report => (
                    <button
                      key={report.id}
                      className={`report-btn ${activeReport === report.id ? 'active' : ''}`}
                      onClick={() => setActiveReport(report.id)}
                    >
                      {report.title}
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Report Content */}
      <div className="report-content" ref={printRef}>
        <div className="report-wrapper">
          <div className="report-title-section">
            <h1>📊 ژورنال حرفه‌ای ترید</h1>
            <h3>{reports.find(r => r.id === activeReport)?.title}</h3>
            <div className="report-meta">
              <span>تاریخ: {new Date().toLocaleDateString('fa-IR')}</span>
              <span>کاربر: علی محمدی</span>
              {dateRange.startDate && dateRange.endDate && (
                <span>بازه: {dateRange.startDate} تا {dateRange.endDate}</span>
              )}
            </div>
          </div>
          {renderReport()}
        </div>
      </div>
    </div>
  );
};

export default ReportDashboard;