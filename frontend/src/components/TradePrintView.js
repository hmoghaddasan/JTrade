// frontend/src/components/TradePrintView.js

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import './TradePrintView.css';

const TradePrintView = () => {
  const { id } = useParams();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [trade, setTrade] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const loadData = () => {
      try {
        const savedCategories = localStorage.getItem('categories');
        if (savedCategories) {
          setCategories(JSON.parse(savedCategories));
        }

        const savedTrades = localStorage.getItem('trades');
        if (savedTrades) {
          const trades = JSON.parse(savedTrades);
          const found = trades.find(t => t.id === parseInt(id));
          if (found) {
            setTrade(found);
          } else {
            navigate('/trades');
          }
        } else {
          navigate('/trades');
        }
      } catch (error) {
        console.error('Error loading trade:', error);
        navigate('/trades');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, navigate]);

  if (loading) {
    return <div className="print-loading">⏳ در حال بارگذاری...</div>;
  }

  if (!trade) {
    return <div className="print-error">❌ ترید یافت نشد</div>;
  }

  const t = trade;
  const categoryName = categories.find(c => c.id === t.category_id)?.name || '-';

  // بخش‌های چک‌لیست
  const checklistItems = [
    { key: 'smt_confirmed', label: 'SMT تایید شد' },
    { key: 'key_levels_reviewed', label: 'سطوح کلیدی بررسی شد' },
    { key: 'bond_dxy_support', label: 'حمایت BOND/DXY' },
    { key: 'weekly_news_printed', label: 'اخبار هفتگی چاپ شد' },
    { key: 'zero_hour_identified', label: 'ساعت صفر مشخص شد' },
    { key: 'asian_range_identified', label: 'رنج آسیا مشخص شد' },
    { key: 'london_range_identified', label: 'رنج لندن مشخص شد' },
    { key: 'judas_lo_identified', label: 'Judas LO مشخص شد' },
  ];

  const emotions = [
    { key: 'focus', label: 'تمرکز' },
    { key: 'calm', label: 'آرامش' },
    { key: 'excited', label: 'هیجان' },
    { key: 'fear', label: 'ترس' },
    { key: 'greed', label: 'طمع' },
    { key: 'relaxed', label: 'ریلکس' },
    { key: 'happy', label: 'خوشحال' },
    { key: 'sad', label: 'غمگین' },
    { key: 'energetic', label: 'پرانرژی' },
    { key: 'tired', label: 'خسته' },
    { key: 'fomo', label: 'FOMO' },
    { key: 'patience', label: 'صبر' },
    { key: 'contentment', label: 'قناعت' },
  ];

  const activeEmotions = emotions.filter(e => t[e.key]).map(e => e.label);

  return (
    <div className="trade-print-container">
      {/* هدر حرفه‌ای */}
      <div className="print-header">
        <div className="header-logo">
          <h1>📊 ژورنال حرفه‌ای ترید</h1>
          <p>گزارش دقیق معامله</p>
        </div>
        <div className="header-meta">
          <div className="meta-item">
            <span className="meta-label">تاریخ چاپ:</span>
            <span className="meta-value">{new Date().toLocaleDateString('fa-IR')}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">شماره ترید:</span>
            <span className="meta-value">#{t.id}</span>
          </div>
        </div>
      </div>

      {/* عنوان ترید */}
      <div className="trade-title-card">
        <div className="trade-title-row">
          <span className="trade-symbol-large">{t.symbol}</span>
          <span className={`trade-type-badge ${t.trade_type === 'Buy' ? 'buy' : 'sell'}`}>
            {t.trade_type === 'Buy' ? 'خرید' : 'فروش'}
          </span>
          <span className="trade-date-large">{t.trade_date}</span>
        </div>
        <div className="trade-summary-row">
          <div className="summary-chip">
            <span className="chip-label">سود/زیان</span>
            <span className={`chip-value ${t.profit >= 0 ? 'positive' : 'negative'}`}>
              {t.profit >= 0 ? '+' : ''}{t.profit || 0}$
            </span>
          </div>
          <div className="summary-chip">
            <span className="chip-label">نسبت R:R</span>
            <span className="chip-value">{t.risk_reward_ratio || '-'}</span>
          </div>
          <div className="summary-chip">
            <span className="chip-label">کیفیت اجرا</span>
            <span className={`chip-value quality-${t.execution_quality_score >= 7 ? 'high' : t.execution_quality_score >= 4 ? 'medium' : 'low'}`}>
              {t.execution_quality_score || '-'}/10
            </span>
          </div>
          <div className="summary-chip">
            <span className="chip-label">دسته‌بندی</span>
            <span className="chip-value">{categoryName}</span>
          </div>
        </div>
      </div>

      {/* بخش 1: اطلاعات عمومی */}
      <div className="print-section">
        <div className="section-header">
          <span className="section-icon">📋</span>
          <h3>اطلاعات عمومی</h3>
        </div>
        <div className="section-body grid-3">
          <div className="field-item">
            <span className="field-label">نماد</span>
            <span className="field-value">{t.symbol}</span>
          </div>
          <div className="field-item">
            <span className="field-label">تاریخ معامله</span>
            <span className="field-value">{t.trade_date}</span>
          </div>
          <div className="field-item">
            <span className="field-label">روز هفته</span>
            <span className="field-value">{t.day_of_week || '-'}</span>
          </div>
          <div className="field-item">
            <span className="field-label">ساعت (نیویورک)</span>
            <span className="field-value">{t.time_ny || '-'}</span>
          </div>
          <div className="field-item">
            <span className="field-label">نوع جلسه</span>
            <span className="field-value">{t.session_type || '-'}</span>
          </div>
          <div className="field-item">
            <span className="field-label">دسته‌بندی</span>
            <span className="field-value">{categoryName}</span>
          </div>
          <div className="field-item">
            <span className="field-label">بایاس</span>
            <span className={`field-value bias-${t.bias}`}>
              {t.bias === 'Bullish' ? '📈 صعودی' : t.bias === 'Bearish' ? '📉 نزولی' : t.bias === 'Neutral' ? '⚖️ خنثی' : '-'}
            </span>
          </div>
          <div className="field-item">
            <span className="field-label">استراتژی</span>
            <span className="field-value">{t.strategy_type || '-'}</span>
          </div>
          <div className="field-item">
            <span className="field-label">مدل ورودی</span>
            <span className="field-value">{t.retirement_model || '-'}</span>
          </div>
        </div>
      </div>

      {/* بخش 2: تایم‌فریم‌ها */}
      <div className="print-section">
        <div className="section-header">
          <span className="section-icon">⏰</span>
          <h3>تایم‌فریم‌های استفاده شده</h3>
        </div>
        <div className="section-body">
          <div className="timeframes-container">
            {t.timeframes && t.timeframes.length > 0 ? (
              t.timeframes.map((tf, i) => (
                <span key={i} className="timeframe-badge">{tf}</span>
              ))
            ) : (
              <span className="no-data">-</span>
            )}
          </div>
        </div>
      </div>

      {/* بخش 3: وضعیت روحی و ذهنی */}
      <div className="print-section">
        <div className="section-header">
          <span className="section-icon">🧠</span>
          <h3>وضعیت روحی و ذهنی</h3>
        </div>
        <div className="section-body grid-2">
          <div className="field-item">
            <span className="field-label">کیفیت خواب</span>
            <span className={`field-value sleep-${t.sleep_quality}`}>{t.sleep_quality || '-'}</span>
          </div>
          <div className="field-item">
            <span className="field-label">تغذیه مناسب</span>
            <span className={`field-value ${t.food_status ? 'checked' : 'unchecked'}`}>
              {t.food_status ? '✅ بله' : '❌ خیر'}
            </span>
          </div>
          <div className="field-item full-width">
            <span className="field-label">احساسات</span>
            <span className="field-value">
              {activeEmotions.length > 0 ? (
                <div className="emotions-container">
                  {activeEmotions.map((emotion, i) => (
                    <span key={i} className="emotion-badge">{emotion}</span>
                  ))}
                </div>
              ) : (
                '-'
              )}
            </span>
          </div>
          <div className="field-item full-width">
            <span className="field-label">احساس غالب</span>
            <span className="field-value">{t.dominant_feeling || '-'}</span>
          </div>
        </div>
      </div>

      {/* بخش 4: جزئیات اجرا */}
      <div className="print-section">
        <div className="section-header">
          <span className="section-icon">💰</span>
          <h3>جزئیات اجرا</h3>
        </div>
        <div className="section-body grid-3">
          <div className="field-item">
            <span className="field-label">قیمت ورود</span>
            <span className="field-value">{t.entry_price || '-'}</span>
          </div>
          <div className="field-item">
            <span className="field-label">قیمت خروج</span>
            <span className="field-value">{t.close_price || '-'}</span>
          </div>
          <div className="field-item">
            <span className="field-label">حد ضرر (SL)</span>
            <span className="field-value">{t.stop_loss || '-'}</span>
          </div>
          <div className="field-item">
            <span className="field-label">حد سود TP1</span>
            <span className="field-value">{t.take_profit_1 || '-'}</span>
          </div>
          <div className="field-item">
            <span className="field-label">حد سود TP2</span>
            <span className="field-value">{t.take_profit_2 || '-'}</span>
          </div>
          <div className="field-item">
            <span className="field-label">حد سود TP3</span>
            <span className="field-value">{t.take_profit_3 || '-'}</span>
          </div>
          <div className="field-item">
            <span className="field-label">حد خورده شده</span>
            <span className="field-value">{t.tp_sl_hit || '-'}</span>
          </div>
          <div className="field-item">
            <span className="field-label">نسبت R:R</span>
            <span className="field-value">{t.risk_reward_ratio || '-'}</span>
          </div>
          <div className="field-item">
            <span className="field-label">ریسک (دلار)</span>
            <span className="field-value">${t.risk_usd || '0'}</span>
          </div>
          <div className="field-item">
            <span className="field-label">درصد ریسک</span>
            <span className="field-value">{t.risk_percent || '0'}%</span>
          </div>
          <div className="field-item">
            <span className="field-label">سود/زیان</span>
            <span className={`field-value ${t.profit >= 0 ? 'positive' : 'negative'}`}>
              {t.profit >= 0 ? '+' : ''}{t.profit || 0}$
            </span>
          </div>
          <div className="field-item">
            <span className="field-label">کیفیت اجرا</span>
            <span className={`field-value quality-${t.execution_quality_score >= 7 ? 'high' : t.execution_quality_score >= 4 ? 'medium' : 'low'}`}>
              {t.execution_quality_score || '-'}/10
            </span>
          </div>
        </div>
      </div>

      {/* بخش 5: چک‌لیست روزانه */}
      <div className="print-section checklist-section">
        <div className="section-header">
          <span className="section-icon">✅</span>
          <h3>چک‌لیست روزانه</h3>
        </div>
        <div className="section-body">
          <div className="checklist-grid">
            {checklistItems.map(item => (
              <div key={item.key} className="checklist-item">
                <span className={`checklist-status ${t[item.key] ? 'done' : 'pending'}`}>
                  {t[item.key] ? '✓' : '○'}
                </span>
                <span className="checklist-label">{item.label}</span>
              </div>
            ))}
          </div>
          <div className="checklist-extra">
            <span className="field-label">توضیحات تکمیلی:</span>
            <span className="field-value">{t.checklist_extra || '-'}</span>
          </div>
        </div>
      </div>

      {/* بخش 6: بازبینی و اشتباهات */}
      <div className="print-section">
        <div className="section-header">
          <span className="section-icon">🔄</span>
          <h3>بازبینی و اشتباهات</h3>
        </div>
        <div className="section-body grid-2">
          <div className="field-item">
            <span className="field-label">کد اشتباه</span>
            <span className="field-value">{t.mistake_code || 'بدون اشتباه'}</span>
          </div>
          <div className="field-item">
            <span className="field-label">وزن اشتباه</span>
            <span className="field-value">{t.mistake_weight || '-'}</span>
          </div>
          <div className="field-item">
            <span className="field-label">پایبندی به حد ضرر</span>
            <span className={`field-value ${t.stop_loss_adherence ? 'checked' : 'unchecked'}`}>
              {t.stop_loss_adherence ? '✅ بله' : '❌ خیر'}
            </span>
          </div>
          <div className="field-item">
            <span className="field-label">پایبندی به استراتژی</span>
            <span className={`field-value ${t.strategy_adherence ? 'checked' : 'unchecked'}`}>
              {t.strategy_adherence ? '✅ بله' : '❌ خیر'}
            </span>
          </div>
          <div className="field-item">
            <span className="field-label">پایبندی به مدیریت سرمایه</span>
            <span className={`field-value ${t.capital_management_adherence ? 'checked' : 'unchecked'}`}>
              {t.capital_management_adherence ? '✅ بله' : '❌ خیر'}
            </span>
          </div>
          <div className="field-item">
            <span className="field-label">اورترید</span>
            <span className={`field-value ${t.over_trade ? 'checked' : 'unchecked'}`}>
              {t.over_trade ? '⚠️ بله' : '✅ خیر'}
            </span>
          </div>
          <div className="field-item full-width">
            <span className="field-label">اسکن پس از معامله</span>
            <span className={`field-value ${t.post_trade_scan ? 'checked' : 'unchecked'}`}>
              {t.post_trade_scan ? '✅ انجام شد' : '❌ انجام نشد'}
            </span>
          </div>
          <div className="field-item full-width">
            <span className="field-label">دلیل ورود یادداشت شد</span>
            <span className={`field-value ${t.entry_reason_written ? 'checked' : 'unchecked'}`}>
              {t.entry_reason_written ? '✅ بله' : '❌ خیر'}
            </span>
          </div>
          <div className="field-item full-width">
            <span className="field-label">دلیل خروج یادداشت شد</span>
            <span className={`field-value ${t.exit_reason_written ? 'checked' : 'unchecked'}`}>
              {t.exit_reason_written ? '✅ بله' : '❌ خیر'}
            </span>
          </div>
          <div className="field-item full-width">
            <span className="field-label">اشتباهات ثبت شد</span>
            <span className={`field-value ${t.mistakes_recorded ? 'checked' : 'unchecked'}`}>
              {t.mistakes_recorded ? '✅ بله' : '❌ خیر'}
            </span>
          </div>
        </div>
      </div>

      {/* بخش 7: تحلیل ICT */}
      <div className="print-section">
        <div className="section-header">
          <span className="section-icon">📊</span>
          <h3>تحلیل ICT</h3>
        </div>
        <div className="section-body grid-3">
          <div className="field-item">
            <span className="field-label">FVG</span>
            <span className="field-value">{t.fvg || '-'}</span>
          </div>
          <div className="field-item">
            <span className="field-label">Order Block</span>
            <span className="field-value">{t.order_block || '-'}</span>
          </div>
          <div className="field-item">
            <span className="field-label">BOS</span>
            <span className="field-value">{t.bos || '-'}</span>
          </div>
          <div className="field-item">
            <span className="field-label">CHOCH</span>
            <span className="field-value">{t.choch || '-'}</span>
          </div>
          <div className="field-item">
            <span className="field-label">MSS</span>
            <span className="field-value">{t.mss || '-'}</span>
          </div>
          <div className="field-item">
            <span className="field-label">Liquidity Sweep</span>
            <span className="field-value">{t.liquidity_sweep || '-'}</span>
          </div>
          <div className="field-item">
            <span className="field-label">POI</span>
            <span className="field-value">{t.poi || '-'}</span>
          </div>
          <div className="field-item">
            <span className="field-label">Demand Zone</span>
            <span className="field-value">{t.demand_zone || '-'}</span>
          </div>
          <div className="field-item">
            <span className="field-label">Supply Zone</span>
            <span className="field-value">{t.supply_zone || '-'}</span>
          </div>
        </div>
      </div>

      {/* فوتر */}
      <div className="print-footer">
        <span>چاپ شده در تاریخ: {new Date().toLocaleDateString('fa-IR')} - ساعت: {new Date().toLocaleTimeString('fa-IR')}</span>
        <span className="footer-separator">|</span>
        <span>ژورنال حرفه‌ای ترید - تمامی حقوق محفوظ است</span>
      </div>
    </div>
  );
};

export default TradePrintView;