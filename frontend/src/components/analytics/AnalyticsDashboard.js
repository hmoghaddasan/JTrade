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
import LoadingBar from '../common/LoadingBar';

// ============================================
// ✅ کامپوننت راهنمای بازشو
// ============================================
const GuideSection = ({ title, icon, children, isOpen = false }) => {
  const [showGuide, setShowGuide] = useState(isOpen);

  return (
    <div className={`analytics-guide-section ${showGuide ? 'open' : ''}`}>
      <div className="analytics-guide-header" onClick={() => setShowGuide(!showGuide)}>
        <span className="analytics-guide-icon">{icon}</span>
        <span className="analytics-guide-title">{title}</span>
        <span className="analytics-guide-toggle">{showGuide ? '▲' : '▼'}</span>
      </div>
      {showGuide && (
        <div className="analytics-guide-content">
          {children}
        </div>
      )}
    </div>
  );
};

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
        📊 دسته‌بندی شده
      </button>
      <button
        className={`tab-btn emotional-tab ${activeTab === 'emotional' ? 'active' : ''}`}
        onClick={() => setActiveTab('emotional')}
      >
        🧠 مالی احساسات
      </button>
      <button
        className={`tab-btn rules-tab ${activeTab === 'rules' ? 'active' : ''}`}
        onClick={() => setActiveTab('rules')}
      >
        📋 پایبندی به قوانین
      </button>
    </div>
  );

  // ============================================
  // رندر دکمه بازگشت
  // ============================================
  const renderBackButton = () => (
    <button
      className="btn-back btn-back-fullwidth-mobile"
      onClick={() => navigate('/dashboard')}
    >
      ↩️ بازگشت
    </button>
  );

  // ============================================
  // رندر راهنمای تحلیل دسته‌بندی شده
  // ============================================
  const renderCategoryGuide = () => (
    <GuideSection title="📊 راهنمای تحلیل دسته‌بندی شده" icon="📖">
      <div className="guide-intro">
        <p>
          <strong>تحلیل دسته‌بندی شده</strong> به شما کمک می‌کند تا عملکرد معاملاتی خود را
          بر اساس معیارهای مختلف بررسی کنید و الگوهای پنهان در معاملات خود را کشف کنید.
        </p>
      </div>

      <div className="guide-step">
        <span className="step-number">۱</span>
        <div>
          <h4>📊 انتخاب دسته‌بندی</h4>
          <p>
            از بین دسته‌بندی‌های زیر انتخاب کنید تا عملکرد خود را بر اساس آن بررسی کنید:
          </p>
          <ul>
            <li><strong>روز هفته:</strong> کدام روزها عملکرد بهتری دارید؟</li>
            <li><strong>ساعت معامله:</strong> چه ساعتی از روز بهترین عملکرد را دارید؟</li>
            <li><strong>نماد معاملاتی:</strong> کدام نمادها بیشترین سود را برای شما داشته‌اند؟</li>
            <li><strong>نوع معامله:</strong> خرید یا فروش؟ کدام یک موفق‌تر بوده‌اید؟</li>
            <li><strong>استراتژی:</strong> کدام استراتژی بیشترین بازدهی را داشته است؟</li>
            <li><strong>وضعیت بازار:</strong> در چه شرایط بازاری بهتر عمل کرده‌اید؟</li>
            <li><strong>احساسات:</strong> کدام احساسات با موفقیت همراه بوده‌اند؟</li>
            <li><strong>نوع جلسه:</strong> جلسات حرفه‌ای یا مبتدی؟</li>
          </ul>
        </div>
      </div>

      <div className="guide-step">
        <span className="step-number">۲</span>
        <div>
          <h4>📈 کارت‌های شاخص کلیدی (KPI)</h4>
          <p>
            در بالای صفحه، شاخص‌های کلیدی عملکرد شما نمایش داده می‌شود:
          </p>
          <ul>
            <li><strong>کل تریدها:</strong> تعداد کل معاملات انجام‌شده</li>
            <li><strong>نرخ برد:</strong> درصد معاملات موفق</li>
            <li><strong>سود کل:</strong> مجموع سود خالص</li>
            <li><strong>میانگین R:R:</strong> نسبت ریسک به ریوارد متوسط</li>
            <li><strong>بزرگ‌ترین برد:</strong> بزرگ‌ترین سود یک معامله</li>
            <li><strong>بزرگ‌ترین ضرر:</strong> بزرگ‌ترین ضرر یک معامله</li>
            <li><strong>فاکتور سود:</strong> نسبت کل سود به کل ضرر</li>
          </ul>
          <p className="guide-note">
            💡 این شاخص‌ها به شما کمک می‌کنند تا در یک نگاه، وضعیت کلی عملکرد خود را ارزیابی کنید.
          </p>
        </div>
      </div>

      <div className="guide-step">
        <span className="step-number">۳</span>
        <div>
          <h4>📊 نمودارها</h4>
          <p>
            دو نوع نمودار برای تحلیل عمیق‌تر ارائه می‌شود:
          </p>
          <ul>
            <li><strong>نمودار میله‌ای (Bar Chart):</strong> نمایش سود/ضرر هر دسته‌بندی به‌صورت مقایسه‌ای</li>
            <li><strong>نمودار راداری (Radar Chart):</strong> نمایش چندبعدی شاخص‌های مختلف برای هر دسته‌بندی</li>
          </ul>
          <p className="guide-note">
            💡 نمودارها به شما کمک می‌کنند تا نقاط قوت و ضعف خود را در هر دسته‌بندی شناسایی کنید.
          </p>
        </div>
      </div>

      <div className="guide-step">
        <span className="step-number">۴</span>
        <div>
          <h4>📋 جدول جزئیات</h4>
          <p>
            جدول کامل شامل تمام شاخص‌های کلیدی برای هر دسته‌بندی:
          </p>
          <ul>
            <li><strong>دسته‌بندی:</strong> نام دسته‌بندی</li>
            <li><strong>تعداد ترید:</strong> تعداد معاملات در آن دسته</li>
            <li><strong>سود کل:</strong> مجموع سود/ضرر</li>
            <li><strong>نرخ برد:</strong> درصد موفقیت</li>
            <li><strong>میانگین R:R:</strong> نسبت ریسک به ریوارد</li>
            <li><strong>بزرگ‌ترین برد و ضرر:</strong> نقاط افراطی</li>
          </ul>
        </div>
      </div>

      <div className="guide-tip guide-tip-important">
        <span className="tip-icon">💡</span>
        <div>
          <strong>چرا این تحلیل مهم است؟</strong>
          <ul>
            <li>شناسایی <strong>بهترین روزها و ساعات</strong> معاملاتی</li>
            <li>تشخیص <strong>بهترین استراتژی‌ها و نمادها</strong> برای شما</li>
            <li>درک تأثیر <strong>احساسات و شرایط بازار</strong> بر عملکرد</li>
            <li>بهبود <strong>مدیریت ریسک</strong> با شناسایی الگوهای ضرر</li>
          </ul>
        </div>
      </div>
    </GuideSection>
  );

  // ============================================
  // رندر راهنمای تحلیل مالی احساسات
  // ============================================
  const renderEmotionalGuide = () => (
    <GuideSection title="🧠 راهنمای تحلیل مالی احساسات" icon="📖">
      <div className="guide-intro">
        <p>
          <strong>تحلیل مالی احساسات (Emotional P&L)</strong> به شما نشان می‌دهد که
          هر احساس چه تأثیری بر سود و زیان شما داشته است. این ابزار قدرتمند به شما کمک می‌کند
          تا ارتباط بین وضعیت روانی و عملکرد معاملاتی خود را درک کنید.
        </p>
      </div>

      <div className="guide-step">
        <span className="step-number">۱</span>
        <div>
          <h4>🎯 هدف تحلیل مالی احساسات</h4>
          <p>
            این تحلیل به شما کمک می‌کند تا بفهمید:
          </p>
          <ul>
            <li><strong>کدام احساسات</strong> با سود همراه بوده‌اند</li>
            <li><strong>کدام احساسات</strong> منجر به ضرر شده‌اند</li>
            <li><strong>الگوی احساسی</strong> شما در معاملات موفق و ناموفق</li>
            <li><strong>تأثیر احساسات</strong> بر تصمیمات معاملاتی شما</li>
          </ul>
        </div>
      </div>

      <div className="guide-step">
        <span className="step-number">۲</span>
        <div>
          <h4>📊 شاخص‌های تحلیل احساسات</h4>
          <p>
            برای هر احساس، شاخص‌های زیر محاسبه می‌شود:
          </p>
          <ul>
            <li><strong>سود/ضرر کل:</strong> مجموع سود یا ضرر در معاملات با آن احساس</li>
            <li><strong>تعداد معاملات:</strong> تعداد دفعاتی که با آن احساس معامله کرده‌اید</li>
            <li><strong>نرخ برد:</strong> درصد موفقیت در معاملات با آن احساس</li>
            <li><strong>میانگین سود/ضرر:</strong> میانگین هر معامله با آن احساس</li>
          </ul>
        </div>
      </div>

      <div className="guide-step">
        <span className="step-number">۳</span>
        <div>
          <h4>📈 تحلیل احساسات غالب</h4>
          <p>
            سیستم به‌طور خودکار احساسات غالب شما را شناسایی می‌کند:
          </p>
          <ul>
            <li><strong>احساسات مثبت:</strong> آرام، صبر، بااعتمادبه‌نفس</li>
            <li><strong>احساسات منفی:</strong> ترس، طمع، استرس، هیجان</li>
            <li><strong>احساسات خنثی:</strong> مردد، مطمئن</li>
          </ul>
          <p className="guide-note">
            💡 اگر احساسات منفی با ضرر همراه هستند، باید روی <strong>مدیریت احساسات</strong> خود کار کنید.
          </p>
        </div>
      </div>

      <div className="guide-step">
        <span className="step-number">۴</span>
        <div>
          <h4>🔍 کاربرد عملی</h4>
          <p>
            با استفاده از این تحلیل می‌توانید:
          </p>
          <ul>
            <li><strong>قبل از معامله:</strong> بررسی کنید که احساس فعلی شما در گذشته چه نتیجه‌ای داشته است</li>
            <li><strong>در حین معامله:</strong> اگر احساس منفی غالب شد، از ورود به معامله خودداری کنید</li>
            <li><strong>پس از معامله:</strong> احساس خود را ثبت کنید تا سیستم دقیق‌تر شود</li>
            <li><strong>بهبود روانشناسی:</strong> روی احساساتی که عملکرد شما را بهبود می‌دهند، تمرکز کنید</li>
          </ul>
        </div>
      </div>

      <div className="guide-tip guide-tip-success">
        <span className="tip-icon">🚀</span>
        <div>
          <strong>نکته کلیدی:</strong>
          <ul>
            <li>
              <strong>🔴 احساسات منفی</strong> معمولاً با تصمیمات عجولانه و ضرر همراه هستند
            </li>
            <li>
              <strong>🟢 احساسات مثبت</strong> معمولاً با صبر و تحلیل بهتر همراه هستند
            </li>
            <li>
              <strong>📈 هرچه داده‌های بیشتری ثبت کنید</strong>، تحلیل دقیق‌تر و کاربردی‌تر خواهد شد
            </li>
          </ul>
        </div>
      </div>
    </GuideSection>
  );

  // ============================================
  // رندر راهنمای پایبندی به قوانین
  // ============================================
  const renderRulesGuide = () => (
    <GuideSection title="📋 راهنمای پایبندی به قوانین" icon="📖">
      <div className="guide-intro">
        <p>
          <strong>تحلیل پایبندی به قوانین</strong> به شما نشان می‌دهد که چقدر به
          قوانین معاملاتی خود پایبند بوده‌اید. این ابزار به شما کمک می‌کند تا
          <strong>انضباط معاملاتی</strong> خود را اندازه‌گیری و بهبود بخشید.
        </p>
      </div>

      <div className="guide-step">
        <span className="step-number">۱</span>
        <div>
          <h4>🎯 هدف تحلیل پایبندی به قوانین</h4>
          <p>
            این تحلیل به شما کمک می‌کند تا بفهمید:
          </p>
          <ul>
            <li><strong>چقدر به قوانین خود</strong> پایبند بوده‌اید</li>
            <li><strong>کدام قوانین</strong> را بیشتر رعایت کرده‌اید</li>
            <li><strong>کدام قوانین</strong> را بیشتر نقض کرده‌اید</li>
            <li><strong>ارتباط بین پایبندی به قوانین</strong> و عملکرد معاملاتی</li>
          </ul>
        </div>
      </div>

      <div className="guide-step">
        <span className="step-number">۲</span>
        <div>
          <h4>📋 شاخص‌های پایبندی به قوانین</h4>
          <p>
            برای هر قانون، شاخص‌های زیر محاسبه می‌شود:
          </p>
          <ul>
            <li><strong>درصد پایبندی:</strong> چند درصد از مواقع قانون رعایت شده است</li>
            <li><strong>تعداد رعایت:</strong> تعداد دفعاتی که قانون رعایت شده</li>
            <li><strong>تعداد نقض:</strong> تعداد دفعاتی که قانون نقض شده</li>
            <li><strong>تأثیر بر عملکرد:</strong> آیا رعایت قانون با سود همراه بوده است؟</li>
          </ul>
        </div>
      </div>

      <div className="guide-step">
        <span className="step-number">۳</span>
        <div>
          <h4>📈 اهمیت پایبندی به قوانین</h4>
          <p>
            تحقیقات نشان می‌دهد که:
          </p>
          <ul>
            <li>
              <strong>معامله‌گران موفق</strong> معمولاً بیش از <strong>۸۰٪</strong> به قوانین خود پایبند هستند
            </li>
            <li>
              <strong>نقض قوانین</strong> در بیش از <strong>۷۰٪</strong> موارد با ضرر همراه است
            </li>
            <li>
              <strong>پایبندی به قوانین</strong> باعث <strong>کاهش استرس</strong> و افزایش اعتمادبه‌نفس می‌شود
            </li>
          </ul>
        </div>
      </div>

      <div className="guide-step">
        <span className="step-number">۴</span>
        <div>
          <h4>🔍 کاربرد عملی</h4>
          <p>
            با استفاده از این تحلیل می‌توانید:
          </p>
          <ul>
            <li><strong>قوانین ضعیف:</strong> قوانینی که کمتر رعایت می‌شوند را شناسایی کنید</li>
            <li><strong>قوانین مؤثر:</strong> قوانینی که با سود همراه هستند را تقویت کنید</li>
            <li><strong>انضباط شخصی:</strong> روی قوانینی که بیشترین تأثیر را دارند، تمرکز کنید</li>
            <li><strong>بهبود مستمر:</strong> قوانین خود را بر اساس داده‌ها به‌روزرسانی کنید</li>
          </ul>
        </div>
      </div>

      <div className="guide-tip guide-tip-important">
        <span className="tip-icon">⚠️</span>
        <div>
          <strong>نکات کلیدی برای بهبود پایبندی:</strong>
          <ul>
            <li>
              <strong>قوانین خود را ساده و مشخص کنید</strong> — قوانین پیچیده کمتر رعایت می‌شوند
            </li>
            <li>
              <strong>قوانین را به‌صورت روزانه مرور کنید</strong> — قبل از شروع معاملات
            </li>
            <li>
              <strong>پس از هر نقض، آن را ثبت کنید</strong> — تا از الگوی نقض خود آگاه شوید
            </li>
            <li>
              <strong>پایبندی به قوانین را به عنوان یک عادت روزانه تقویت کنید</strong>
            </li>
          </ul>
        </div>
      </div>

      <div className="guide-tip guide-tip-success">
        <span className="tip-icon">📈</span>
        <div>
          <strong>رابطه پایبندی به قوانین و سودآوری:</strong>
          <ul>
            <li>
              <strong>معامله‌گران با پایبندی بالا</strong> به طور میانگین <strong>۲.۵ برابر</strong> سودآورتر هستند
            </li>
            <li>
              <strong>هر ۱۰٪ افزایش در پایبندی</strong> به قوانین، سودآوری را <strong>۱۵٪</strong> افزایش می‌دهد
            </li>
            <li>
              <strong>انضباط معاملاتی</strong> مهم‌ترین عامل موفقیت بلندمدت است
            </li>
          </ul>
        </div>
      </div>
    </GuideSection>
  );

  // ============================================
  // لودینگ و خطا
  // ============================================
  if (activeTab === 'category' && loading) {
    return (
      <div className={`analytics-dashboard ${isDark ? 'dark' : 'light'}`}>
        <div className="analytics-header">
          <div className="header-left">
            <h2>📊 دسته‌بندی شده</h2>
            <span className="header-subtitle">بررسی عملکرد بر اساس معیارهای مختلف</span>
          </div>
          <div className="header-actions">
            {renderBackButton()}
          </div>
        </div>
        {renderTabs()}
        <div className="analytics-loading">
          <LoadingBar text="در حال بارگذاری..." />
        </div>
      </div>
    );
  }

  if (activeTab === 'category' && !data) {
    return (
      <div className={`analytics-dashboard ${isDark ? 'dark' : 'light'}`}>
        <div className="analytics-header">
          <div className="header-left">
            <h2>📊 تحلیل دسته‌بندی شده</h2>
            <span className="header-subtitle">بررسی عملکرد بر اساس معیارهای مختلف</span>
          </div>
          <div className="header-actions">
            {renderBackButton()}
          </div>
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
          <h2>🏆 تحلیل عملکرد</h2>
          <span className="header-subtitle">
            {activeTab === 'category'
              ? 'بررسی عملکرد بر اساس معیارهای مختلف'
              : activeTab === 'emotional'
              ? 'تحلیل تأثیر مالی هر احساس بر عملکرد معاملاتی'
              : 'تحلیل پایبندی به قوانین معاملاتی'}
          </span>
        </div>
        <div className="header-actions">
          {renderBackButton()}
        </div>
      </div>

      {/* تب‌ها */}
      {renderTabs()}

      {/* ===== راهنمای هر تب ===== */}
      {activeTab === 'category' && renderCategoryGuide()}
      {activeTab === 'emotional' && renderEmotionalGuide()}
      {activeTab === 'rules' && renderRulesGuide()}

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