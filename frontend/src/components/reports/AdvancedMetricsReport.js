// frontend/src/components/reports/AdvancedMetricsReport.js

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import MetricsService from '../../services/metricsService';
import MetricsFilter from './MetricsFilter';
import MetricsTable from './MetricsTable';
import MetricsChart from './MetricsChart';
import './AdvancedMetricsReport.css';

const AdvancedMetricsReport = () => {
  const { user } = useAuth();
  const { currentPortfolioId, portfolios } = usePortfolio();
  const { isDark } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const reportRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [filter, setFilter] = useState({
    portfolioId: currentPortfolioId === 'all' ? null : (currentPortfolioId === 'none' ? null : currentPortfolioId),
    startDate: '',
    endDate: '',
  });
  const [showFormula, setShowFormula] = useState(false);
  const [error, setError] = useState(null);

  const loadMetrics = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const params = {
        portfolio_id: filter.portfolioId,
        start_date: filter.startDate || undefined,
        end_date: filter.endDate || undefined,
      };

      console.log('📊 Loading metrics with params:', params);

      const [metricsResponse, trendResponse] = await Promise.all([
        MetricsService.getMetrics(params),
        MetricsService.getTrend({
          portfolio_id: filter.portfolioId,
          days: 90,
        }),
      ]);

      console.log('📊 Metrics response:', metricsResponse.data);
      console.log('📈 Trend response:', trendResponse.data);

      setMetrics(metricsResponse.data);
      setTrendData(trendResponse.data || []);
    } catch (error) {
      console.error('❌ Error loading metrics:', error);
      setError('خطا در بارگذاری شاخص‌ها');
      showToast('خطا در بارگذاری شاخص‌ها', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, [user, filter.portfolioId]);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setTimeout(() => loadMetrics(), 100);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleBack = () => {
    navigate(-1);
  };

  const getCurrentPortfolioName = () => {
    if (filter.portfolioId) {
      const portfolio = portfolios.find(p => p.id === filter.portfolioId);
      return portfolio ? portfolio.name : 'نامشخص';
    }
    return 'همه پورتفولیوها';
  };

  if (loading) {
    return (
      <div className="metrics-report-loading">
        <div className="loading-spinner">⏳</div>
        <p>در حال محاسبه شاخص‌ها...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="metrics-report-error">
        <div className="error-icon">❌</div>
        <h3>خطا</h3>
        <p>{error}</p>
        <button className="btn-retry" onClick={loadMetrics}>تلاش مجدد</button>
      </div>
    );
  }

  return (
    <div className={`metrics-report ${isDark ? 'dark' : 'light'}`} ref={reportRef}>
      {/* ===== هدر صفحه ===== */}
      <div className="metrics-header">
        <div className="metrics-header-left">
          <h1>📊 شاخص‌های پیشرفته معاملاتی</h1>
        </div>
        <div className="metrics-header-right">
          <button className="btn-print" onClick={handlePrint}>
            🖨️ چاپ
          </button>
          <button className="btn-back" onClick={handleBack}>
            ↩️ بازگشت
          </button>
        </div>
      </div>

      {/* ===== توضیحات پورتفولیو ===== */}
      <div className="metrics-portfolio-info">
        <span className="portfolio-label">پورتفولیو:</span>
        <span className="portfolio-name">{getCurrentPortfolioName()}</span>
        {filter.startDate && filter.endDate && (
          <span className="date-range">
            از {filter.startDate} تا {filter.endDate}
          </span>
        )}
      </div>

      {/* ===== فیلترها ===== */}
      <MetricsFilter
        filter={filter}
        onFilterChange={handleFilterChange}
        portfolios={portfolios}
      />

      {/* ===== دکمه نمایش فرمول‌ها ===== */}
      <div className="metrics-formula-toggle">
        <button
          className={`btn-toggle-formula ${showFormula ? 'active' : ''}`}
          onClick={() => setShowFormula(!showFormula)}
        >
          {showFormula ? '🔽 مخفی کردن فرمول‌ها' : '🔼 نمایش فرمول‌ها و توضیحات'}
        </button>
      </div>

      {/* ===== بخش فرمول‌ها ===== */}
      {showFormula && (
        <div className="metrics-formulas">
          <h3>🧮 فرمول‌ها و توضیحات شاخص‌ها</h3>

          <div className="formula-grid">
            <div className="formula-item">
              <h4>نسبت شارپ (Sharpe Ratio)</h4>
              <div className="formula-latin">Sharpe Ratio = (Rp - Rf) / σp</div>
              <div className="formula-fa">
                Rp = میانگین بازده پورتفولیو |
                Rf = نرخ بدون ریسک (۳٪) |
                σp = انحراف معیار بازده‌ها
              </div>
              <div className="formula-desc">
                سنجش بازده به ازای هر واحد ریسک کل. هرچه بالاتر، عملکرد adjusted to risk بهتر.
              </div>
              <div className="formula-interpret">
                <span className="label">تفسیر:</span>
                {'< ۱: قابل قبول | ۱-۲: خوب | ۲-۳: عالی | > ۳: استثنایی'}
              </div>
            </div>

            <div className="formula-item">
              <h4>نسبت سورتینو (Sortino Ratio)</h4>
              <div className="formula-latin">Sortino Ratio = (Rp - Rf) / σd</div>
              <div className="formula-fa">
                Rp = میانگین بازده پورتفولیو |
                Rf = نرخ بدون ریسک (۳٪) |
                σd = انحراف معیار بازده‌های منفی
              </div>
              <div className="formula-desc">
                مشابه شارپ اما فقط ریسک نزولی را مجازات می‌کند. مناسب‌تر برای تریدرهای فعال.
              </div>
              <div className="formula-interpret">
                <span className="label">تفسیر:</span>
                {'< ۱: قابل قبول | ۱-۲: خوب | ۲-۳: عالی | > ۳: استثنایی'}
              </div>
            </div>

            <div className="formula-item">
              <h4>نسبت کالمار (Calmar Ratio)</h4>
              <div className="formula-latin">Calmar Ratio = بازده سالانه / حداکثر افت</div>
              <div className="formula-fa">
                بازده سالانه = میانگین سود × ۲۵۲ روز معاملاتی
              </div>
              <div className="formula-desc">
                سنجش بازده به ازای هر واحد ریسک نزولی. نشان‌دهنده قدرت بازیابی از ضررها.
              </div>
              <div className="formula-interpret">
                <span className="label">تفسیر:</span>
                {'< ۱: قابل قبول | ۱-۲: خوب | > ۲: عالی'}
              </div>
            </div>

            <div className="formula-item">
              <h4>فاکتور سود (Profit Factor)</h4>
              <div className="formula-latin">Profit Factor = سود کل / ضرر کل</div>
              <div className="formula-fa">نسبت کل سودها به کل ضررها</div>
              <div className="formula-desc">
                نشان‌دهنده کارایی کلی استراتژی معاملاتی. هرچه بالاتر، استراتژی سودآورتر.
              </div>
              <div className="formula-interpret">
                <span className="label">تفسیر:</span>
                {'< ۱: ضرردهنده | ۱-۱.۲: نیاز به بهبود | ۱.۲-۱.۵: خوب | ۱.۵-۲: عالی | > ۲: استثنایی'}
              </div>
            </div>

            <div className="formula-item">
              <h4>حداکثر افت (Max Drawdown)</h4>
              <div className="formula-latin">Max Drawdown = (Peak - Trough) / Peak × ۱۰۰</div>
              <div className="formula-fa">
                بزرگترین کاهش از اوج به کف، به‌صورت درصدی
              </div>
              <div className="formula-desc">
                حیاتی‌ترین شاخص ریسک. نشان می‌دهد در بدترین حالت چقدر ممکن است ضرر کنید.
              </div>
              <div className="formula-interpret">
                <span className="label">تفسیر:</span>
                {'< ۱۰٪: عالی | ۱۰-۲۰٪: خوب | ۲۰-۳۰٪: قابل قبول | > ۳۰٪: خطرناک'}
              </div>
            </div>

            <div className="formula-item">
              <h4>معیار کلی (Kelly Criterion)</h4>
              <div className="formula-latin">f* = (p × R - (1-p)) / R</div>
              <div className="formula-fa">
                p = نرخ برد |
                R = نسبت میانگین سود به میانگین ضرر
              </div>
              <div className="formula-desc">
                اندازه بهینه پوزیشن برای حداکثر رشد سرمایه. نسخه فرکشنال (۲۵٪) برای کاربرد عملی.
              </div>
              <div className="formula-interpret">
                <span className="label">تفسیر:</span>
                {'< ۵٪: محافظه‌کارانه | ۵-۱۵٪: متوسط | ۱۵-۲۵٪: جسورانه | > ۲۵٪: بسیار جسورانه'}
              </div>
            </div>

            <div className="formula-item">
              <h4>امید ریاضی (Expectancy)</h4>
              <div className="formula-latin">Expectancy = (Avg Win × Win Rate) - (Avg Loss × Loss Rate)</div>
              <div className="formula-fa">
                سود مورد انتظار به ازای هر ترید
              </div>
              <div className="formula-desc">
                نشان می‌دهد به طور متوسط هر ترید چقدر سود یا ضرر دارد.
              </div>
              <div className="formula-interpret">
                <span className="label">تفسیر:</span>
                {'> ۰: لبه مثبت | = ۰: بدون لبه | < ۰: لبه منفی'}
              </div>
            </div>

            <div className="formula-item">
              <h4>فاکتور بازیابی (Recovery Factor)</h4>
              <div className="formula-latin">Recovery Factor = سود کل / حداکثر افت</div>
              <div className="formula-fa">
                توانایی بازیابی از ضررها
              </div>
              <div className="formula-desc">
                نشان می‌دهد چقدر سریع می‌توانید از بدترین افت خود بهبود یابید.
              </div>
              <div className="formula-interpret">
                <span className="label">تفسیر:</span>
                {'> ۳: بازیابی عالی | ۲-۳: بازیابی خوب | ۱-۲: قابل قبول | < ۱: نیاز به بهبود'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== جدول شاخص‌ها ===== */}
      {metrics && (
        <MetricsTable
          metrics={metrics}
          periods={[
            { key: '7d', label: '۷ روزه' },
            { key: '30d', label: '۳۰ روزه' },
            { key: '90d', label: '۹۰ روزه' },
            { key: 'all', label: 'کل دوره' },
          ]}
        />
      )}

      {/* ===== نمودارها با عناوین فارسی + انگلیسی ===== */}
      {trendData.length > 0 && (
        <div className="metrics-charts-section">
          <h3>📈 روند شاخص‌ها در ۹۰ روز اخیر</h3>

          <div className="chart-wrapper">
            <div className="chart-container">
              <MetricsChart
                data={trendData}
                type="line"
                metrics={['sharpe_ratio', 'sortino_ratio']}
                colors={['#2e7d32', '#f57c00']}
                labels={['نسبت شارپ (Sharpe Ratio)', 'نسبت سورتینو (Sortino Ratio)']}
                xAxisLabel="تاریخ (Date)"
                yAxisLabel="مقدار شاخص (Value)"
              />
            </div>
          </div>

          {metrics && (
            <div className="chart-wrapper">
              <div className="chart-container">
                <MetricsChart
                  data={trendData}
                  type="bar"
                  metrics={['profit_factor']}
                  colors={['#1a237e']}
                  labels={['فاکتور سود (Profit Factor)']}
                  xAxisLabel="تاریخ (Date)"
                  yAxisLabel="مقدار (Value)"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== خلاصه در پایین صفحه ===== */}
      {metrics && (
        <div className="metrics-summary">
          <div className="summary-item">
            <span className="summary-label">کل تریدها</span>
            <span className="summary-value">{metrics.total_trades || 0}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">سود کل</span>
            <span className={`summary-value ${metrics.total_profit >= 0 ? 'positive' : 'negative'}`}>
              {metrics.total_profit >= 0 ? '+' : ''}{metrics.total_profit?.toFixed(2) || 0}$
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">نرخ برد</span>
            <span className="summary-value">{metrics.win_rate || 0}%</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">میانگین R:R</span>
            <span className="summary-value">{metrics.avg_rr || '-'}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">امید ریاضی</span>
            <span className={`summary-value ${metrics.expectancy >= 0 ? 'positive' : 'negative'}`}>
              {metrics.expectancy?.toFixed(2) || '-'}$
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">فاکتور بازیابی</span>
            <span className="summary-value">{metrics.recovery_factor?.toFixed(2) || '-'}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedMetricsReport;