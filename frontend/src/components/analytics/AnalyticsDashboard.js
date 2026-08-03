// frontend/src/components/analytics/AnalyticsDashboard.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import AnalyticsService from '../../services/analyticsService';
import KPICards from './KPICards';
import CategorySelector from './CategorySelector';
import CategoryCharts from './CategoryCharts';
import CategoryTable from './CategoryTable';
import AnalyticsFilters from './AnalyticsFilters';
import './AnalyticsDashboard.css';

const AnalyticsDashboard = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({
    category_by: 'day_of_week',
    date_from: '',
    date_to: '',
    symbol: '',
    trade_type: '',
    status: '',
  });

  // ============================================
  // واکشی داده‌ها
  // ============================================
  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await AnalyticsService.getAnalytics(filters);
      setData(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      showToast('خطا در دریافت داده‌های تحلیل', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // ============================================
  // مدیریت تغییر فیلترها
  // ============================================
  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleCategoryChange = (category) => {
    setFilters(prev => ({ ...prev, category_by: category }));
  };

  // ============================================
  // لودینگ و خطا
  // ============================================
  if (loading) {
    return (
      <div className="analytics-loading">
        <div className="loading-spinner">⏳</div>
        <p>در حال بارگذاری داده‌های تحلیل...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="analytics-error">
        <div className="error-icon">❌</div>
        <h3>خطا در بارگذاری</h3>
        <p>داده‌های تحلیل در دسترس نیست</p>
        <button className="btn-retry" onClick={fetchAnalytics}>
          تلاش مجدد
        </button>
      </div>
    );
  }

  const { summary, categories, distribution } = data;
  const hasData = summary.total_trades > 0;

  // ============================================
  // رندر اصلی
  // ============================================
  return (
    <div className={`analytics-dashboard ${isDark ? 'dark' : 'light'}`}>
      {/* هدر */}
      <div className="analytics-header">
        <div className="header-left">
          <h2>📊 تحلیل دسته‌بندی شده</h2>
          <span className="header-subtitle">
            بررسی عملکرد بر اساس معیارهای مختلف
          </span>
        </div>
        <div className="header-actions">
          <button className="btn-back" onClick={() => navigate('/dashboard')}>
            ↩️ بازگشت به داشبورد
          </button>
        </div>
      </div>

      {/* فیلترها */}
      <AnalyticsFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onCategoryChange={handleCategoryChange}
        categories={categories}
      />

      {/* کارت‌های KPI */}
      <KPICards summary={summary} />

      {/* اگر داده وجود نداشته باشد */}
      {!hasData ? (
        <div className="no-data-message">
          <div className="empty-icon">📭</div>
          <h3>هیچ تریدی برای تحلیل وجود ندارد</h3>
          <p>برای شروع تحلیل، ابتدا چند ترید ثبت کنید.</p>
        </div>
      ) : (
        <>
          {/* نمودارها */}
          <CategoryCharts
            categories={categories}
            distribution={distribution}
            categoryBy={filters.category_by}
          />

          {/* جدول جزئیات */}
          <CategoryTable categories={categories} />
        </>
      )}
    </div>
  );
};

export default AnalyticsDashboard;