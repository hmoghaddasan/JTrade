// frontend/src/pages/PortfolioComparisonPage.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import ComparisonService from '../services/comparisonService';
import ComparisonFilter from '../components/portfolio/ComparisonFilter';
import ComparisonSummaryCards from '../components/portfolio/ComparisonSummaryCards';
import ComparisonChart from '../components/portfolio/ComparisonChart';
import ComparisonTable from '../components/portfolio/ComparisonTable';
import './PortfolioComparisonPage.css';

// ============================================
// داده‌های راهنمای شاخص‌ها
// ============================================
const METRICS_GUIDE = [
    {
        fa: 'سود کل',
        en: 'Total Profit',
        formula: 'Σ (Profit)',
        description: 'مجموع سود یا زیان تمام تریدهای پورتفولیو. نشان‌دهنده عملکرد کلی مالی است.',
    },
    {
        fa: 'نرخ برد',
        en: 'Win Rate',
        formula: '(Wins / Total Trades) × 100',
        description: 'درصد تریدهایی که با سود بسته شده‌اند. هرچه بالاتر، عملکرد موفق‌تر.',
    },
    {
        fa: 'فاکتور سود',
        en: 'Profit Factor',
        formula: 'Total Profit / Total Loss',
        description: 'نسبت کل سود به کل ضرر. مقدار > ۱ نشان‌دهنده سودآوری است. هرچه بالاتر، بهتر.',
    },
    {
        fa: 'میانگین R:R',
        en: 'Average R/R',
        formula: 'Σ (Risk/Reward) / N',
        description: 'میانگین نسبت ریسک به ریوارد در تمام تریدها. نشان‌دهنده کیفیت متوسط ستاپ‌هاست.',
    },
    {
        fa: 'حداکثر افت',
        en: 'Max Drawdown',
        formula: '(Peak - Trough) / Peak × 100',
        description: 'بزرگترین کاهش از اوج به کف (درصدی). ریسک نزولی پورتفولیو را نشان می‌دهد.',
    },
    {
        fa: 'امید ریاضی',
        en: 'Expectancy',
        formula: '(Avg Win × Win Rate) - (Avg Loss × Loss Rate)',
        description: 'سود مورد انتظار به ازای هر ترید. مقدار مثبت نشان‌دهنده لبه معاملاتی است.',
    },
    {
        fa: 'تعداد تریدها',
        en: 'Total Trades',
        formula: 'Count',
        description: 'تعداد کل تریدهای انجام‌شده در پورتفولیو. نشان‌دهنده حجم فعالیت است.',
    },
    {
        fa: 'سودده',
        en: 'Wins',
        formula: 'Count of Profitable Trades',
        description: 'تعداد تریدهایی که با سود بسته شده‌اند.',
    },
    {
        fa: 'ضررده',
        en: 'Losses',
        formula: 'Count of Losing Trades',
        description: 'تعداد تریدهایی که با زیان بسته شده‌اند.',
    },
    {
        fa: 'مساوی',
        en: 'Breakevens',
        formula: 'Count of Breakeven Trades',
        description: 'تعداد تریدهایی که با سود صفر (مساوی) بسته شده‌اند.',
    },
];

const PortfolioComparisonPage = () => {
    const { user } = useAuth();
    const { isDark } = useTheme();
    const { showToast } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [summary, setSummary] = useState(null);
    const [chartData, setChartData] = useState(null);
    const [filter, setFilter] = useState({ startDate: '', endDate: '' });
    const [activeChart, setActiveChart] = useState('cumulative_pnl');
    const [showGuide, setShowGuide] = useState(false);

    // ============================================
    // بارگذاری داده‌ها
    // ============================================
    const loadData = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filter.startDate) params.start_date = filter.startDate;
            if (filter.endDate) params.end_date = filter.endDate;

            const [comparisonRes, summaryRes, chartRes] = await Promise.all([
                ComparisonService.getComparisonData(params),
                ComparisonService.getComparisonSummary(params),
                ComparisonService.getChartData({ ...params, chart_type: activeChart }),
            ]);

            if (comparisonRes.success) {
                setData(comparisonRes.data);
            } else {
                showToast('خطا در دریافت داده‌های مقایسه', 'error');
            }

            if (summaryRes.success) {
                setSummary(summaryRes.data);
            }

            if (chartRes.success) {
                setChartData(chartRes.data);
            }

        } catch (error) {
            console.error('Error loading comparison data:', error);
            showToast('خطا در بارگذاری داده‌ها', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [filter, activeChart]);

    // ============================================
    // تغییر فیلتر
    // ============================================
    const handleFilterChange = (newFilter) => {
        setFilter(newFilter);
    };

    // ============================================
    // تغییر نوع نمودار
    // ============================================
    const handleChartTypeChange = (type) => {
        setActiveChart(type);
    };

    // ============================================
    // چاپ
    // ============================================
    const handlePrint = () => {
        window.print();
    };

    // ============================================
    // بازگشت
    // ============================================
    const handleBack = () => {
        navigate('/dashboard');
    };

    // ============================================
    // لودینگ
    // ============================================
    if (loading) {
        return (
            <div className="comparison-page-loading">
                <div className="loading-spinner">⏳</div>
                <p>در حال بارگذاری داده‌های مقایسه...</p>
            </div>
        );
    }

    return (
        <div className={`comparison-page ${isDark ? 'dark' : 'light'}`}>
            {/* ===== هدر ===== */}
            <div className="comparison-page-header">
                <div className="header-left">
                    <h1>📊 مقایسه پورتفولیوها</h1>
                </div>
                <div className="header-right">
                    {/* ✅ دکمه بازگشت به اینجا منتقل شد */}
                    <button className="btn-back" onClick={handleBack}>← بازگشت</button>
                    <button className="btn-print" onClick={handlePrint}>🖨️ چاپ</button>
                </div>
            </div>

            {/* ===== فیلتر ===== */}
            <ComparisonFilter onFilterChange={handleFilterChange} initialFilter={filter} />

            {/* ===== دکمه راهنما ===== */}
            <div className="guide-toggle-wrapper">
                <button
                    className={`btn-guide-toggle ${showGuide ? 'active' : ''}`}
                    onClick={() => setShowGuide(!showGuide)}
                >
                    {showGuide ? '🔽 مخفی کردن راهنما' : '❓ نمایش راهنمای شاخص‌ها'}
                </button>
            </div>

            {/* ===== بخش راهنما ===== */}
            {showGuide && (
                <div className="guide-container">
                    <h3>📖 راهنمای شاخص‌های مقایسه پورتفولیو</h3>
                    <div className="guide-table-wrapper">
                        <table className="guide-table">
                            <thead>
                                <tr>
                                    <th>نام فارسی</th>
                                    <th>نام لاتین</th>
                                    <th>فرمول</th>
                                    <th>توضیحات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {METRICS_GUIDE.map((item, index) => (
                                    <tr key={index}>
                                        <td className="guide-fa">{item.fa}</td>
                                        <td className="guide-en">{item.en}</td>
                                        <td className="guide-formula">
                                            <code>{item.formula}</code>
                                        </td>
                                        <td className="guide-desc">{item.description}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ===== کارت‌های خلاصه ===== */}
            {summary && (
                <ComparisonSummaryCards summary={summary} />
            )}

            {/* ===== انتخاب نوع نمودار ===== */}
            <div className="chart-type-selector">
                <button
                    className={`chart-type-btn ${activeChart === 'cumulative_pnl' ? 'active' : ''}`}
                    onClick={() => handleChartTypeChange('cumulative_pnl')}
                >
                    📈 سود تجمعی
                </button>
                <button
                    className={`chart-type-btn ${activeChart === 'radar' ? 'active' : ''}`}
                    onClick={() => handleChartTypeChange('radar')}
                >
                    🕸️ تحلیل راداری
                </button>
                <button
                    className={`chart-type-btn ${activeChart === 'bar' ? 'active' : ''}`}
                    onClick={() => handleChartTypeChange('bar')}
                >
                    📊 مقایسه شاخص‌ها
                </button>
            </div>

            {/* ===== نمودارها ===== */}
            {chartData && chartData.length > 0 && (
                <ComparisonChart
                    data={chartData}
                    type={activeChart}
                    title={
                        activeChart === 'cumulative_pnl' ? '📈 روند سود تجمعی پورتفولیوها' :
                        activeChart === 'radar' ? '🕸️ تحلیل راداری نقاط قوت' :
                        '📊 مقایسه شاخص‌های کلیدی'
                    }
                />
            )}

            {/* ===== اطلاعات ترکیبی ===== */}
            {data?.combined && (
                <div className="combined-info">
                    <div className="combined-card">
                        <span className="combined-label">📊 مجموع پورتفولیوها</span>
                        <span className="combined-value">{data.combined.total_portfolios}</span>
                    </div>
                    <div className="combined-card">
                        <span className="combined-label">💰 موجودی کل</span>
                        <span className="combined-value">${data.combined.total_balance?.toFixed(2) || '0'}</span>
                    </div>
                    <div className="combined-card">
                        <span className="combined-label">📈 کل تریدها</span>
                        <span className="combined-value">{data.combined.total_trades || 0}</span>
                    </div>
                    <div className="combined-card">
                        <span className="combined-label">🎯 نرخ برد کلی</span>
                        <span className="combined-value">{data.combined.win_rate?.toFixed(1) || 0}%</span>
                    </div>
                    <div className="combined-card">
                        <span className="combined-label">💰 سود کل</span>
                        <span className="combined-value" style={{ color: data.combined.total_profit >= 0 ? '#2e7d32' : '#c62828' }}>
                            ${data.combined.total_profit?.toFixed(2) || '0'}
                        </span>
                    </div>
                    <div className="combined-card">
                        <span className="combined-label">📉 حداکثر افت</span>
                        <span className="combined-value">{data.combined.max_drawdown?.toFixed(1) || 0}%</span>
                    </div>
                </div>
            )}

            {/* ===== جدول مقایسه ===== */}
            {data?.portfolios && (
                <ComparisonTable data={data.portfolios} />
            )}

            {/* ===== بدون داده ===== */}
            {(!data?.portfolios || data.portfolios.length === 0) && (
                <div className="no-data-message">
                    <div className="empty-icon">📭</div>
                    <h3>هیچ داده‌ای برای مقایسه وجود ندارد</h3>
                    <p>برای مشاهده این بخش، حداقل یک پورتفولیو با ترید ثبت‌شده داشته باشید.</p>
                </div>
            )}
        </div>
    );
};

export default PortfolioComparisonPage;