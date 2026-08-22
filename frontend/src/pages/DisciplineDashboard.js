// frontend/src/pages/DisciplineDashboard.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import disciplineService from '../services/disciplineService';
import './DisciplineDashboard.css';

// ===== کامپوننت تب خلاصه =====
const TabSummary = ({ status, onRefresh }) => {
    if (!status) return <div className="tab-loading">در حال بارگذاری...</div>;

    const {
        tiltmeter_score,
        compliance_rate,
        trades_today,
        max_trades_per_day,
        daily_loss,
        daily_loss_limit,
        is_cooldown_active,
        cooldown_remaining,
        consecutive_losses,
        cooldown_consecutive_losses,
        is_locked,
        habits,
        habits_completed,
    } = status;

    return (
        <div className="tab-summary">
            <div className="summary-cards">
                <div className="summary-card tiltmeter">
                    <div className="card-icon">📊</div>
                    <div className="card-content">
                        <span className="card-label">Tiltmeter</span>
                        <span className="card-value">{tiltmeter_score.toFixed(1)}%</span>
                        <div className="mini-progress">
                            <div className="mini-fill" style={{
                                width: `${Math.min(tiltmeter_score, 100)}%`,
                                backgroundColor: tiltmeter_score >= 80 ? '#2e7d32' : tiltmeter_score >= 60 ? '#f9a825' : '#c62828'
                            }} />
                        </div>
                    </div>
                </div>
                <div className="summary-card compliance">
                    <div className="card-icon">✅</div>
                    <div className="card-content">
                        <span className="card-label">نرخ پایبندی</span>
                        <span className="card-value">{compliance_rate.toFixed(1)}%</span>
                    </div>
                </div>
                <div className="summary-card trades">
                    <div className="card-icon">📈</div>
                    <div className="card-content">
                        <span className="card-label">ترید امروز</span>
                        <span className="card-value">{trades_today} / {max_trades_per_day}</span>
                    </div>
                </div>
                <div className="summary-card loss">
                    <div className="card-icon">💰</div>
                    <div className="card-content">
                        <span className="card-label">ضرر امروز</span>
                        <span className="card-value">${daily_loss} / ${daily_loss_limit}</span>
                    </div>
                </div>
            </div>

            <div className="summary-details">
                <div className="detail-row">
                    <span>ضرر متوالی:</span>
                    <span className={consecutive_losses >= cooldown_consecutive_losses ? 'danger' : ''}>
                        {consecutive_losses} / {cooldown_consecutive_losses}
                    </span>
                </div>
                <div className="detail-row">
                    <span>کول‌داون:</span>
                    <span className={is_cooldown_active ? 'danger' : 'success'}>
                        {is_cooldown_active ? `فعال (${cooldown_remaining} دقیقه)` : 'غیرفعال'}
                    </span>
                </div>
                <div className="detail-row">
                    <span>وضعیت قفل:</span>
                    <span className={is_locked ? 'danger' : 'success'}>
                        {is_locked ? 'قفل تا پایان روز' : 'باز'}
                    </span>
                </div>
                {habits && habits.length > 0 && (
                    <div className="habits-section">
                        <span>عادات امروز:</span>
                        <div className="habits-list">
                            {habits.map((habit, i) => (
                                <span key={i} className={`habit-badge ${habits_completed?.includes(habit) ? 'done' : ''}`}>
                                    {habits_completed?.includes(habit) ? '✅' : '⬜'} {habit}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ===== کامپوننت تب تنظیمات =====
const TabSettings = ({ settings, onRefresh }) => {
    const [formData, setFormData] = useState(settings || {});
    const [saving, setSaving] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        if (settings) setFormData(settings);
    }, [settings]);

    const handleChange = (key, value) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await disciplineService.updateSettings(formData);
            showToast('✅ تنظیمات با موفقیت ذخیره شد', 'success');
            onRefresh();
        } catch (error) {
            showToast('❌ خطا در ذخیره تنظیمات', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (!settings) return <div className="tab-loading">در حال بارگذاری...</div>;

    return (
        <div className="tab-settings">
            <div className="settings-group">
                <h4>📊 محدودیت‌های روزانه</h4>
                <div className="setting-row">
                    <label>حداکثر ترید در روز</label>
                    <input type="number" value={formData.max_trades_per_day} onChange={(e) => handleChange('max_trades_per_day', parseInt(e.target.value) || 0)} min={0} />
                </div>
                <div className="setting-row">
                    <label>سقف ضرر روزانه ($)</label>
                    <input type="number" value={formData.daily_loss_limit} onChange={(e) => handleChange('daily_loss_limit', parseFloat(e.target.value) || 0)} min={0} step="10" />
                </div>
                <div className="setting-row">
                    <label>سقف ضرر هر ترید ($) - هشدار</label>
                    <input type="number" value={formData.max_loss_per_trade} onChange={(e) => handleChange('max_loss_per_trade', parseFloat(e.target.value) || 0)} min={0} step="10" />
                </div>
                <div className="setting-row">
                    <label>حداکثر حجم هر ترید (لات) - هشدار</label>
                    <input type="number" value={formData.max_contract_size} onChange={(e) => handleChange('max_contract_size', parseFloat(e.target.value) || 0)} min={0} step="0.1" />
                </div>
            </div>

            <div className="settings-group">
                <h4>⏰ کول‌داون</h4>
                <div className="setting-row">
                    <label>تعداد ضرر متوالی برای کول‌داون</label>
                    <input type="number" value={formData.cooldown_consecutive_losses} onChange={(e) => handleChange('cooldown_consecutive_losses', parseInt(e.target.value) || 0)} min={0} />
                </div>
                <div className="setting-row">
                    <label>مدت کول‌داون (دقیقه)</label>
                    <input type="number" value={formData.cooldown_duration_minutes} onChange={(e) => handleChange('cooldown_duration_minutes', parseInt(e.target.value) || 0)} min={0} />
                </div>
                <div className="setting-row checkbox">
                    <label>کول‌داون پس از سقف ضرر روزانه</label>
                    <input type="checkbox" checked={formData.cooldown_after_daily_loss} onChange={(e) => handleChange('cooldown_after_daily_loss', e.target.checked)} />
                </div>
                <div className="setting-row checkbox">
                    <label>کول‌داون پس از سقف ترید روزانه</label>
                    <input type="checkbox" checked={formData.cooldown_after_max_trades} onChange={(e) => handleChange('cooldown_after_max_trades', e.target.checked)} />
                </div>
            </div>

            <div className="settings-group">
                <h4>📋 چک‌لیست پیش‌از معامله</h4>
                <div className="setting-row checkbox">
                    <label>چک‌لیست اجباری</label>
                    <input type="checkbox" checked={formData.checklist_required} onChange={(e) => handleChange('checklist_required', e.target.checked)} />
                </div>
                <div className="setting-row textarea">
                    <label>آیتم‌های چک‌لیست (هر آیتم در یک خط)</label>
                    <textarea
                        value={Array.isArray(formData.pre_trade_checklist_items) ? formData.pre_trade_checklist_items.join('\n') : ''}
                        onChange={(e) => handleChange('pre_trade_checklist_items', e.target.value.split('\n').filter(s => s.trim()))}
                        rows={4}
                    />
                </div>
            </div>

            <div className="settings-group">
                <h4>🧩 عادات روزانه</h4>
                <div className="setting-row textarea">
                    <label>عادات (هر عادت در یک خط)</label>
                    <textarea
                        value={Array.isArray(formData.daily_habits) ? formData.daily_habits.join('\n') : ''}
                        onChange={(e) => handleChange('daily_habits', e.target.value.split('\n').filter(s => s.trim()))}
                        rows={4}
                    />
                </div>
            </div>

            <button className="btn-save" onClick={handleSave} disabled={saving}>
                {saving ? '⏳ در حال ذخیره...' : '💾 ذخیره تنظیمات'}
            </button>
        </div>
    );
};

// ===== کامپوننت تب گزارش نشت =====
const TabLeakReport = ({ report, loading }) => {
    if (loading) return <div className="tab-loading">در حال بارگذاری گزارش...</div>;
    if (!report) return <div className="tab-empty">هیچ داده‌ای برای گزارش وجود ندارد</div>;

    const {
        total_trades,
        disciplined_trades,
        undisciplined_trades,
        discipline_cost,
        disciplined_profit,
        undisciplined_profit,
        violations_by_type,
        compliance_rate,
        recommendations,
    } = report;

    return (
        <div className="tab-leak-report">
            <div className="report-summary">
                <div className="report-card">
                    <span className="report-label">هزینه بی‌انضباطی</span>
                    <span className={`report-value ${discipline_cost > 0 ? 'negative' : 'positive'}`}>
                        ${Math.abs(discipline_cost).toFixed(2)}
                    </span>
                </div>
                <div className="report-card">
                    <span className="report-label">نرخ پایبندی</span>
                    <span className="report-value">{compliance_rate.toFixed(1)}%</span>
                </div>
                <div className="report-card">
                    <span className="report-label">تریدهای باانضباط</span>
                    <span className="report-value">{disciplined_trades} / {total_trades}</span>
                </div>
            </div>

            {violations_by_type.length > 0 && (
                <div className="violations-table">
                    <h4>📊 دسته‌بندی نقض‌ها</h4>
                    <table>
                        <thead>
                            <tr><th>نوع نقض</th><th>تعداد</th></tr>
                        </thead>
                        <tbody>
                            {violations_by_type.map((v, i) => (
                                <tr key={i}>
                                    <td>{v.label}</td>
                                    <td>{v.count}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {recommendations.length > 0 && (
                <div className="recommendations">
                    <h4>💡 پیشنهادات</h4>
                    <ul>
                        {recommendations.map((rec, i) => (
                            <li key={i}>{rec}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

// ===== کامپوننت تب هیت‌مپ =====
const TabHeatmap = ({ heatmap, loading }) => {
    if (loading) return <div className="tab-loading">در حال بارگذاری گرما...</div>;
    if (!heatmap || heatmap.length === 0) return <div className="tab-empty">هیچ داده‌ای برای نمایش وجود ندارد</div>;

    const weeks = [];
    let currentWeek = [];
    let lastDate = null;
    heatmap.forEach(item => {
        const date = new Date(item.date);
        if (!lastDate) {
            currentWeek.push(item);
            lastDate = date;
        } else {
            const diff = (date - lastDate) / (1000 * 60 * 60 * 24);
            if (diff > 1) {
                weeks.push(currentWeek);
                currentWeek = [item];
            } else {
                currentWeek.push(item);
            }
            lastDate = date;
        }
    });
    if (currentWeek.length > 0) weeks.push(currentWeek);

    const getColorClass = (color) => {
        switch(color) {
            case 'green': return 'heat-green';
            case 'yellow': return 'heat-yellow';
            case 'red': return 'heat-red';
            default: return 'heat-empty';
        }
    };

    return (
        <div className="tab-heatmap">
            <div className="heatmap-grid">
                {weeks.map((week, wi) => (
                    <div key={wi} className="week-row">
                        {week.map((day, di) => (
                            <div key={di} className={`heat-cell ${getColorClass(day.color)}`} title={`${day.date}: ${day.compliance}%`}>
                                <span className="heat-date">{new Date(day.date).toLocaleDateString('fa-IR', { weekday: 'short' })}</span>
                                <span className="heat-value">{day.tiltmeter}%</span>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
            <div className="heatmap-legend">
                <span>🟢 عالی (≥۸۰%)</span>
                <span>🟡 متوسط (۵۰-۸۰%)</span>
                <span>🔴 ضعیف (&lt;۵۰%)</span>
            </div>
        </div>
    );
};

// ===== کامپوننت راهنمای بازشونده =====
const DisciplineGuide = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="discipline-guide">
            <button className="guide-toggle" onClick={() => setIsOpen(!isOpen)}>
                <span className="guide-icon">📖</span>
                <span className="guide-title">راهنمای اصطلاحات و فرمول‌ها</span>
                <span className="guide-arrow">{isOpen ? '▲' : '▼'}</span>
            </button>
            {isOpen && (
                <div className="guide-content">
                    <div className="guide-section">
                        <h4>📊 Tiltmeter</h4>
                        <p>
                            شاخص ترکیبی از پایبندی به قوانین، چک‌لیست و نرخ برد است که وضعیت کلی انضباط معاملاتی را نشان می‌دهد.
                        </p>
                        <div className="formula-box">
                            <span className="formula-label">فرمول:</span>
                            <code className="formula-code">
                                (نرخ پایبندی × ۰.۶) + (نرخ تکمیل چک‌لیست × ۰.۲) + (نرخ برد × ۰.۲)
                            </code>
                        </div>
                        <div className="interpretation">
                            <span className="interpret-label">تفسیر:</span>
                            <ul>
                                <li>🟢 ۸۰-۱۰۰%: انضباط عالی – عملکرد بسیار حرفه‌ای</li>
                                <li>🟡 ۶۰-۷۹%: انضباط خوب – نیاز به بهبود جزئی</li>
                                <li>🟠 ۴۰-۵۹%: نیاز به توجه – نقض‌های قابل توجه</li>
                                <li>🔴 ۰-۳۹%: هشدار – بی‌انضباطی جدی</li>
                            </ul>
                        </div>
                    </div>

                    <div className="guide-section">
                        <h4>✅ نرخ پایبندی (Compliance Rate)</h4>
                        <p>
                            درصد تریدهایی که در آنها حداقل یک قانون معاملاتی رعایت شده است.
                        </p>
                        <div className="formula-box">
                            <span className="formula-label">فرمول:</span>
                            <code className="formula-code">
                                (تعداد تریدهای دارای قانون / کل تریدها) × ۱۰۰
                            </code>
                        </div>
                    </div>

                    <div className="guide-section">
                        <h4>⏰ کول‌داون (Cooldown)</h4>
                        <p>
                            پس از رسیدن به تعداد مشخصی ضرر متوالی، معاملات به‌مدت معینی قفل می‌شوند تا از انتقام‌گیری جلوگیری شود.
                        </p>
                        <div className="info-box">
                            <span className="info-label">مثال:</span>
                            <span>پس از ۲ ضرر متوالی، به‌مدت ۱۵ دقیقه معاملات قفل می‌شوند.</span>
                        </div>
                    </div>

                    <div className="guide-section">
                        <h4>💰 سقف ضرر روزانه (Daily Loss Limit)</h4>
                        <p>
                            حداکثر ضرر مجاز در یک روز معاملاتی. در صورت رسیدن به این سقف، معاملات تا پایان روز قفل می‌شوند.
                        </p>
                    </div>

                    <div className="guide-section">
                        <h4>📋 چک‌لیست پیش‌از معامله</h4>
                        <p>
                            لیستی از معیارهایی که کاربر باید قبل از ورود به معامله بررسی کند. تکمیل این چک‌لیست برای ثبت ترید الزامی است.
                        </p>
                        <div className="info-box">
                            <span className="info-label">نرخ تکمیل چک‌لیست:</span>
                            <span>(چک‌لیست‌های تکمیل‌شده / کل چک‌لیست‌ها) × ۱۰۰</span>
                        </div>
                    </div>

                    <div className="guide-section">
                        <h4>📈 گزارش نشت انضباط (Leak Report)</h4>
                        <p>
                            تفاوت سود تریدهای باانضباط و بی‌انضباط را نشان می‌دهد و هزینه واقعی بی‌انضباطی را به دلار محاسبه می‌کند.
                        </p>
                        <div className="formula-box">
                            <span className="formula-label">فرمول:</span>
                            <code className="formula-code">
                                سود تریدهای باانضباط – سود تریدهای بی‌انضباط
                            </code>
                        </div>
                    </div>

                    <div className="guide-section">
                        <h4>🔥 گرمای پایبندی (Heatmap)</h4>
                        <p>
                            نمایش رنگ‌بندی نرخ پایبندی روزانه در تقویم. هر روز با یکی از رنگ‌های 🟢 (عالی)، 🟡 (متوسط) یا 🔴 (ضعیف) مشخص می‌شود.
                        </p>
                    </div>

                    <div className="guide-section">
                        <h4>🧩 عادات روزانه</h4>
                        <p>
                            عادت‌هایی که کاربر برای بهبود انضباط خود تعریف می‌کند و هر روز تکمیل آن‌ها را ثبت می‌کند.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

// ============================================
// صفحه اصلی DisciplineDashboard
// ============================================
const DisciplineDashboard = () => {
    const { isDark } = useTheme();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('summary');
    const [status, setStatus] = useState(null);
    const [settings, setSettings] = useState(null);
    const [report, setReport] = useState(null);
    const [heatmap, setHeatmap] = useState(null);
    const [loading, setLoading] = useState({
        status: true,
        settings: true,
        report: true,
        heatmap: true,
    });

    const loadAllData = async () => {
        setLoading({ status: true, settings: true, report: true, heatmap: true });
        try {
            const [statusRes, settingsRes, reportRes, heatmapRes] = await Promise.all([
                disciplineService.getStatus(),
                disciplineService.getSettings(),
                disciplineService.getReport(30),
                disciplineService.getHeatmap(90),
            ]);
            setStatus(statusRes.data);
            setSettings(settingsRes.data);
            setReport(reportRes.data);
            setHeatmap(heatmapRes.data);
        } catch (error) {
            console.error('Error loading discipline data:', error);
            showToast('❌ خطا در بارگذاری داده‌ها', 'error');
        } finally {
            setLoading({ status: false, settings: false, report: false, heatmap: false });
        }
    };

    useEffect(() => {
        loadAllData();
    }, []);

    const tabs = [
        { id: 'summary', label: '📊 خلاصه', component: TabSummary, props: { status, onRefresh: loadAllData } },
        { id: 'settings', label: '⚙️ تنظیمات', component: TabSettings, props: { settings, onRefresh: loadAllData } },
        { id: 'report', label: '📉 گزارش نشت', component: TabLeakReport, props: { report, loading: loading.report } },
        { id: 'heatmap', label: '🔥 هیت‌مپ', component: TabHeatmap, props: { heatmap, loading: loading.heatmap } },
    ];

    const CurrentTabComponent = tabs.find(t => t.id === activeTab)?.component || tabs[0].component;

    return (
        <div className={`discipline-dashboard ${isDark ? 'dark' : 'light'}`}>
            {/* ===== هدر با دستور قطعی برای چپ‌چین کردن دکمه بازگشت ===== */}
            <header style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                paddingBottom: '16px',
                borderBottom: '1px solid #e0e0e0',
                marginBottom: '16px'
            }}>


                {/* دکمه Refresh - در راست */}
                <div style={{ order: 2, flex: '0 0 auto', textAlign: 'right' }}>
                    <button
                        onClick={loadAllData}
                        title="به‌روزرسانی"
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '20px',
                            cursor: 'pointer',
                            padding: '8px',
                            borderRadius: '50%',
                            transition: 'transform 0.3s',
                            color: isDark ? '#e0e0e0' : '#1a237e'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'rotate(90deg)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'rotate(0deg)';
                        }}
                    >
                        🔄
                    </button>
                </div>

                {/* عنوان - در مرکز */}
                <div style={{ order: 1, flex: '1', textAlign: 'center' }}>
                    <h1 style={{ fontSize: '22px', fontWeight: 700, color: isDark ? '#e0e0e0' : '#1a237e', margin: 0 }}>🛡️ ابزارهای انضباطی</h1>
                </div>

                {/* دکمه بازگشت - با order: 0 و text-align: left */}
                <div style={{ order: 0, flex: '0 0 auto', textAlign: 'left' }}>
                    <button
                        onClick={() => navigate('/dashboard')}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '15px',
                            cursor: 'pointer',
                            color: isDark ? '#e0e0e0' : '#1a237e',
                            padding: '8px 14px',
                            borderRadius: '8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontWeight: 500,
                            transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = isDark ? '#2a2a3d' : '#e8eaf6';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                    >
                        ↩️ بازگشت
                    </button>
                </div>

            </header>

            {/* ===== راهنمای بازشونده ===== */}
            <DisciplineGuide />

            {/* ===== تب‌ها ===== */}
            <div className="discipline-tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ===== محتوای تب ===== */}
            <div className="discipline-content">
                <CurrentTabComponent {...tabs.find(t => t.id === activeTab)?.props} />
            </div>
        </div>
    );
};

export default DisciplineDashboard;