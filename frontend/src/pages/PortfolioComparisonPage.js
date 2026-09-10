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
import LoadingBar from '../components/common/LoadingBar';

// ============================================
// داده‌های راهنمای شاخص‌ها
// ============================================
const METRICS_GUIDE = [
    {
        fa: 'سود کل',
        en: 'Total Profit',
        formula: 'Σ (Profit)',
        description: 'مجموع سود یا زیان تمام تریدهای پورتفولیو. نشان‌دهنده عملکرد کلی مالی است.',
        interpretation: '🟢 هرچه بالاتر، بهتر. مقدار مثبت نشان‌دهنده سودآوری کلی است.'
    },
    {
        fa: 'نرخ برد',
        en: 'Win Rate',
        formula: '(Wins / Total Trades) × 100',
        description: 'درصد تریدهایی که با سود بسته شده‌اند. هرچه بالاتر، عملکرد موفق‌تر.',
        interpretation: '🟢 بالای ۵۰٪ خوب است. 🔴 زیر ۴۰٪ نیاز به بهبود دارد.'
    },
    {
        fa: 'فاکتور سود',
        en: 'Profit Factor',
        formula: 'Total Profit / Total Loss',
        description: 'نسبت کل سود به کل ضرر. مقدار > ۱ نشان‌دهنده سودآوری است. هرچه بالاتر، بهتر.',
        interpretation: '🟢 > ۱.۵ عالی | 🟡 ۱ تا ۱.۵ خوب | 🔴 < ۱ ضررده'
    },
    {
        fa: 'میانگین R:R',
        en: 'Average R/R',
        formula: 'Σ (Risk/Reward) / N',
        description: 'میانگین نسبت ریسک به ریوارد در تمام تریدها. نشان‌دهنده کیفیت متوسط ستاپ‌هاست.',
        interpretation: '🟢 > ۲ عالی | 🟡 ۱.۵ تا ۲ خوب | 🔴 < ۱.۵ نیاز به بهبود'
    },
    {
        fa: 'حداکثر افت',
        en: 'Max Drawdown',
        formula: '(Peak - Trough) / Peak × 100',
        description: 'بزرگترین کاهش از اوج به کف (درصدی). ریسک نزولی پورتفولیو را نشان می‌دهد.',
        interpretation: '🟢 < ۱۰٪ عالی | 🟡 ۱۰-۲۵٪ قابل قبول | 🔴 > ۲۵٪ خطرناک'
    },
    {
        fa: 'امید ریاضی',
        en: 'Expectancy',
        formula: '(Avg Win × Win Rate) - (Avg Loss × Loss Rate)',
        description: 'سود مورد انتظار به ازای هر ترید. مقدار مثبت نشان‌دهنده لبه معاملاتی است.',
        interpretation: '🟢 مثبت = لبه معاملاتی | 🔴 منفی = نیاز به بازنگری'
    },
    {
        fa: 'تعداد تریدها',
        en: 'Total Trades',
        formula: 'Count',
        description: 'تعداد کل تریدهای انجام‌شده در پورتفولیو. نشان‌دهنده حجم فعالیت است.',
        interpretation: '📊 هرچه بیشتر، داده‌ها معتبرتر. حداقل ۲۰ ترید برای تحلیل معتبر.'
    },
    {
        fa: 'سودده',
        en: 'Wins',
        formula: 'Count of Profitable Trades',
        description: 'تعداد تریدهایی که با سود بسته شده‌اند.',
        interpretation: '✅ نشان‌دهنده قدرت استراتژی در کسب سود است.'
    },
    {
        fa: 'ضررده',
        en: 'Losses',
        formula: 'Count of Losing Trades',
        description: 'تعداد تریدهایی که با زیان بسته شده‌اند.',
        interpretation: '❌ نشان‌دهنده نقاط ضعف و نیاز به مدیریت ریسک بهتر است.'
    },
    {
        fa: 'مساوی',
        en: 'Breakevens',
        formula: 'Count of Breakeven Trades',
        description: 'تعداد تریدهایی که با سود صفر (مساوی) بسته شده‌اند.',
        interpretation: '⚖️ نشان‌دهنده فرصت‌های از دست‌رفته برای سود است.'
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
                <LoadingBar text="در حال بارگذاری..." />
            </div>
        );
    }

    return (
        <div className={`comparison-page ${isDark ? 'dark' : 'light'}`}>
            {/* ===== هدر ===== */}
            <div className="comparison-page-header">
                <div className="header-left">
                    <h1>⚖️ مقایسه پورتفولیوها</h1>
                </div>
                <div className="header-right">
                    <button className="btn-back" onClick={handleBack}>
                        <span>← بازگشت</span>
                    </button>
                    <button className="btn-print" onClick={handlePrint}>
                        <span>🖨️ چاپ</span>
                    </button>
                </div>
            </div>

            {/* ===== فیلتر ===== */}
            <ComparisonFilter onFilterChange={handleFilterChange} initialFilter={filter} />

            {/* ===== دکمه راهنما - تمام عرض ===== */}
            <div className="guide-toggle-wrapper full-width">
                <button
                    className={`btn-guide-toggle ${showGuide ? 'active' : ''}`}
                    onClick={() => setShowGuide(!showGuide)}
                >
                    {showGuide ? '🔽 مخفی کردن راهنما' : '📖 راهنمای شاخص‌های مقایسه پورتفولیوها'}
                </button>
            </div>

            {/* ===== بخش راهنما ===== */}
            {showGuide && (
                <div className="guide-container">
                    <h3>📊 راهنمای شاخص‌های مقایسه پورتفولیوها</h3>

                    <div className="guide-intro">
                        <p>
                            <strong>شاخص‌های زیر</strong> به شما کمک می‌کنند تا عملکرد پورتفولیوهای مختلف را
                            در ابعاد گوناگون بررسی کنید و بهترین تصمیم‌ها را برای سرمایه‌گذاری خود بگیرید.
                            هر شاخص نشان‌دهنده جنبه‌ای از عملکرد معاملاتی است و ترکیب آنها تصویر کاملی از وضعیت شما ارائه می‌دهد.
                        </p>
                    </div>

                    <div className="guide-table-wrapper">
                        <table className="guide-table">
                            <thead>
                                <tr>
                                    <th>نام فارسی</th>
                                    <th>نام لاتین</th>
                                    <th>فرمول</th>
                                    <th>توضیحات</th>
                                    <th>تفسیر</th>
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
                                        <td className="guide-interpretation">{item.interpretation}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* ===== توضیحات تکمیلی زیر جدول ===== */}
                    <div className="guide-extra-info">
                        <div className="guide-tip guide-tip-important">
                            <span className="tip-icon">💡</span>
                            <div>
                                <strong>نکات کلیدی برای مقایسه پورتفولیوها:</strong>
                                <ul>
                                    <li>
                                        <strong>بهترین عملکرد:</strong> پورتفولیویی با بالاترین سود کل و نرخ برد مناسب
                                        (ترکیب سود بالا و نرخ برد بالای ۵۰٪)
                                    </li>
                                    <li>
                                        <strong>کم‌ریسک‌ترین:</strong> پورتفولیویی با کمترین حداکثر افت (زیر ۱۰٪)
                                        و فاکتور سود بالای ۱.۵
                                    </li>
                                    <li>
                                        <strong>پایدارترین:</strong> پورتفولیویی با امید ریاضی مثبت و میانگین R:R بالای ۲
                                    </li>
                                    <li>
                                        <strong>تنوع‌بخشی:</strong> مقایسه پورتفولیوها به شما کمک می‌کند تا بهترین ترکیب را
                                        برای سرمایه‌گذاری انتخاب کنید
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className="guide-tip guide-tip-success">
                            <span className="tip-icon">🚀</span>
                            <div>
                                <strong>چگونه از این تحلیل استفاده کنیم؟</strong>
                                <ul>
                                    <li>
                                        <strong>شناسایی نقاط قوت:</strong> پورتفولیویی که در بیشتر شاخص‌ها عملکرد بهتری دارد
                                    </li>
                                    <li>
                                        <strong>شناسایی نقاط ضعف:</strong> پورتفولیویی که در برخی شاخص‌ها ضعیف عمل کرده است
                                    </li>
                                    <li>
                                        <strong>تنظیم استراتژی:</strong> از بهترین پورتفولیوها الگو بگیرید و استراتژی خود را بهبود دهید
                                    </li>
                                    <li>
                                        <strong>مدیریت ریسک:</strong> پورتفولیوهای با افت کمتر را برای سرمایه‌گذاری بلندمدت انتخاب کنید
                                    </li>
                                    <li>
                                        <strong>تخصیص سرمایه:</strong> سرمایه خود را بین پورتفولیوهای با عملکرد بهتر توزیع کنید
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className="guide-tip guide-tip-warning">
                            <span className="tip-icon">⚠️</span>
                            <div>
                                <strong>هشدارهای مهم:</strong>
                                <ul>
                                    <li>
                                        <strong>دوره کوتاه:</strong> تحلیل کمتر از ۲۰ ترید معتبر نیست
                                    </li>
                                    <li>
                                        <strong>تنوع نمادها:</strong> مقایسه پورتفولیوهای با نمادهای کاملاً متفاوت ممکن است گمراه‌کننده باشد
                                    </li>
                                    <li>
                                        <strong>شرایط بازار:</strong> عملکرد در بازارهای مختلف (روندی، رنج، پرنوسان) متفاوت است
                                    </li>
                                    <li>
                                        <strong>اندازه سرمایه:</strong> پورتفولیوهای با سرمایه متفاوت را با نسبت‌ها (درصدی) مقایسه کنید
                                    </li>
                                </ul>
                            </div>
                        </div>
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
                <div className="comparison-table-wrapper">
                    <ComparisonTable data={data.portfolios} />
                </div>
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