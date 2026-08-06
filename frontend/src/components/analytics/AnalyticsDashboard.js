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
import EmotionalPnL from './EmotionalPnL';
import RulesReport from '../reports/RulesReport';
import './AnalyticsDashboard.css';

const AnalyticsDashboard = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // ✅ تب‌ها
  const [activeTab, setActiveTab] = useState('category'); // 'category' | 'emotional' | 'rules'

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
  // واکشی داده‌ها (فقط برای تب تحلیل دسته‌بندی شده)
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
    if (activeTab === 'category') {
      fetchAnalytics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, activeTab]);

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
  // رندر تب‌ها
  // ============================================
  const renderTabs = () => (
    <div className="analytics-tabs">
      <button
        className={`tab-btn ${activeTab === 'category' ? 'active' : ''}`}
        onClick={() => setActiveTab('category')}
      >
        📊 تحلیل دسته‌بندی شده
      </button>
      <button
        className={`tab-btn emotional-tab ${activeTab === 'emotional' ? 'active' : ''}`}
        onClick={() => setActiveTab('emotional')}
      >
        🧠 تحلیل مالی احساسات <span className="tab-badge">جدید</span>
      </button>
      <button
        className={`tab-btn rules-tab ${activeTab === 'rules' ? 'active' : ''}`}
        onClick={() => setActiveTab('rules')}
      >
        📋 پایبندی به قوانین <span className="tab-badge">جدید</span>
      </button>
    </div>
  );

  // ============================================
  // لودینگ و خطا
  // ============================================
  if (activeTab === 'category' && loading) {
    return (
      <div className="analytics-dashboard">
        <div className="analytics-header">
          <div className="header-left">
            <h2>📊 تحلیل دسته‌بندی شده</h2>
            <span className="header-subtitle">بررسی عملکرد بر اساس معیارهای مختلف</span>
          </div>
          <button className="btn-back" onClick={() => navigate('/dashboard')}>
            ↩️ بازگشت به داشبورد
          </button>
        </div>
        {renderTabs()}
        <div className="analytics-loading">
          <div className="loading-spinner">⏳</div>
          <p>در حال بارگذاری داده‌های تحلیل...</p>
        </div>
      </div>
    );
  }

  if (activeTab === 'category' && !data) {
    return (
      <div className="analytics-dashboard">
        <div className="analytics-header">
          <div className="header-left">
            <h2>📊 تحلیل دسته‌بندی شده</h2>
            <span className="header-subtitle">بررسی عملکرد بر اساس معیارهای مختلف</span>
          </div>
          <button className="btn-back" onClick={() => navigate('/dashboard')}>
            ↩️ بازگشت به داشبورد
          </button>
        </div>
        {renderTabs()}
        <div className="analytics-error">
          <div className="error-icon">❌</div>
          <h3>خطا در بارگذاری</h3>
          <p>داده‌های تحلیل در دسترس نیست</p>
          <button className="btn-retry" onClick={fetchAnalytics}>
            تلاش مجدد
          </button>
        </div>
      </div>
    );
  }

  const { summary, categories, distribution } = data || {};
  const hasData = summary && summary.total_trades > 0;

  // ============================================
  // رندر اصلی
  // ============================================
  return (
    <div className={`analytics-dashboard ${isDark ? 'dark' : 'light'}`}>
      {/* هدر */}
      <div className="analytics-header">
        <div className="header-left">
          <h2>📊 تحلیل عملکرد</h2>
          <span className="header-subtitle">
            {activeTab === 'category'
              ? 'بررسی عملکرد بر اساس معیارهای مختلف'
              : activeTab === 'emotional'
              ? 'تحلیل تأثیر مالی هر احساس بر عملکرد معاملاتی'
              : 'تحلیل پایبندی به قوانین معاملاتی'}
          </span>
        </div>
        <div className="header-actions">
          <button className="btn-back" onClick={() => navigate('/dashboard')}>
            ↩️ بازگشت به داشبورد
          </button>
        </div>
      </div>

      {/* تب‌ها */}
      {renderTabs()}

      {/* محتوای تب تحلیل دسته‌بندی شده */}
      {activeTab === 'category' && (
        <>
          <AnalyticsFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            onCategoryChange={handleCategoryChange}
            categories={categories}
          />

          <KPICards summary={summary} />

          {!hasData ? (
            <div className="no-data-message">
              <div className="empty-icon">📭</div>
              <h3>هیچ تریدی برای تحلیل وجود ندارد</h3>
              <p>برای شروع تحلیل، ابتدا چند ترید ثبت کنید.</p>
            </div>
          ) : (
            <>
              <CategoryCharts
                categories={categories}
                distribution={distribution}
                categoryBy={filters.category_by}
              />
              <CategoryTable categories={categories} />
            </>
          )}
        </>
      )}

      {/* محتوای تب تحلیل مالی احساسات */}
      {activeTab === 'emotional' && (
        <EmotionalPnL />
      )}

      {/* محتوای تب پایبندی به قوانین */}
      {activeTab === 'rules' && (
        <RulesReport />
      )}
    </div>
  );
};

export default AnalyticsDashboard;