// frontend/src/components/analytics/EmotionalPnL.js

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import AnalyticsService from '../../services/analyticsService';
import ExpandableChart from '../common/ExpandableChart';
import './EmotionalPnL.css';

// رنگ‌های اختصاصی هر احساس
const EMOTION_COLORS = {
  'آرامش': '#4caf50',
  'تمرکز': '#2196f3',
  'هیجان': '#9c27b0',
  'ترس': '#f44336',
  'طمع': '#ffc107',
  'صبر': '#00bcd4',
  'FOMO': '#ff5722',
  'استرس': '#e91e63',
  'ریلکس': '#8bc34a',
  'خوشحال': '#ffeb3b',
  'غمگین': '#607d8b',
  'پرانرژی': '#ff9800',
  'خسته': '#795548',
  'قناعت': '#3f51b5',
};

// آیکون‌های هر احساس
const EMOTION_ICONS = {
  'آرامش': '😌',
  'تمرکز': '🧘',
  'هیجان': '🤩',
  'ترس': '😰',
  'طمع': '😈',
  'صبر': '🧠',
  'FOMO': '😱',
  'استرس': '😫',
  'ریلکس': '😊',
  'خوشحال': '😃',
  'غمگین': '😢',
  'پرانرژی': '⚡',
  'خسته': '😴',
  'قناعت': '🙏',
};

const EmotionalPnL = () => {
  const { isDark } = useTheme();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await AnalyticsService.getEmotionalPnL();
        setData(response.data);
      } catch (error) {
        console.error('Error fetching emotional PnL:', error);
        showToast('خطا در دریافت تحلیل احساسات', 'error');
        setData({ has_data: false, message: 'خطا در دریافت داده‌ها' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [showToast]);

  if (loading) {
    return (
      <div className="emotional-pnl-loading">
        <div className="loading-spinner">⏳</div>
        <p>در حال تحلیل احساسات...</p>
      </div>
    );
  }

  if (!data || !data.has_data) {
    return (
      <div className="emotional-pnl-empty">
        <div className="empty-icon">📭</div>
        <h3>هیچ داده‌ای برای تحلیل احساسات وجود ندارد</h3>
        <p>{data?.message || 'حداقل چند ترید ثبت کنید تا تحلیل احساسات انجام شود.'}</p>
      </div>
    );
  }

  const { emotions, summary, total_trades, total_profit } = data;
  const hasEmotions = emotions && emotions.length > 0;

  // محاسبه بیشترین و کمترین سود
  const maxProfit = hasEmotions ? Math.max(...emotions.map(e => e.total_pnl)) : 0;
  const minProfit = hasEmotions ? Math.min(...emotions.map(e => e.total_pnl)) : 0;

  return (
    <div className={`emotional-pnl-container ${isDark ? 'dark' : 'light'}`}>
      {/* ===== هدر با توضیحات ===== */}
      <div className="emotional-header">
        <div className="emotional-title">
          <span className="emotional-icon">🧠</span>
          <h3>تحلیل مالی احساسات (Emotional P&L)</h3>
          <button
            className="guide-toggle-btn"
            onClick={() => setShowGuide(!showGuide)}
          >
            {showGuide ? '📖 بستن راهنما' : '📖 راهنما'}
          </button>
        </div>
        <div className="emotional-stats-mini">
          <span className="mini-stat">📊 {total_trades} ترید</span>
          <span className={`mini-stat ${total_profit >= 0 ? 'positive' : 'negative'}`}>
            {total_profit >= 0 ? '+' : ''}{total_profit.toFixed(2)}$
          </span>
        </div>
      </div>

      {/* ===== راهنما ===== */}
      {showGuide && (
        <div className="emotional-guide">
          <div className="guide-content">
            <h4>📖 تحلیل مالی احساسات (Emotional P&L) چیست؟</h4>
            <p>
              این ابزار تأثیر مالی هر احساس (آرامش، ترس، طمع، هیجان، صبر، FOMO) را بر عملکرد
              معاملاتی شما محاسبه می‌کند.
            </p>
            <div className="guide-grid">
              <div className="guide-item">
                <strong>📊 Emotional P&L Ratio</strong>
                <p>درصد ضررهایی که ناشی از احساسات منفی هستند.</p>
                <ul>
                  <li>کمتر از ۳۰٪: ✅ عملکرد عالی – احساسات شما را کنترل می‌کنید.</li>
                  <li>۳۰-۵۰٪: ⚠️ نیاز به توجه – برخی احساسات روی عملکردتان تأثیر می‌گذارند.</li>
                  <li>بیشتر از ۵۰٪: ❌ زنگ خطر – اکثر ضررها ناشی از احساسات هستند، نه استراتژی!</li>
                </ul>
              </div>
              <div className="guide-item">
                <strong>🔑 شاخص‌های کلیدی</strong>
                <ul>
                  <li><strong>نرخ برد هر احساس:</strong> نشان می‌دهد کدام احساسات عملکرد بهتری دارند.</li>
                  <li><strong>میانگین R:R:</strong> نسبت ریسک به ریوارد در هر حالت احساسی.</li>
                  <li><strong>تأثیر (Impact):</strong> درصد تأثیر هر احساس بر کل سود/زیان.</li>
                </ul>
                <p style={{ fontSize: '13px', color: '#888', marginTop: '8px' }}>
                  💡 احساسات منفی (ترس، طمع، هیجان، FOMO، استرس) معمولاً R:R پایین‌تر و نرخ برد کمتری دارند.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== کارت هشدار Emotional P&L Ratio ===== */}
      <div className={`emotional-alert-card ${summary.status}`}>
        <div className="alert-icon">
          {summary.status === 'good' ? '✅' : summary.status === 'warning' ? '⚠️' : '🚨'}
        </div>
        <div className="alert-content">
          <div className="alert-title">Emotional P&L Ratio</div>
          <div className="alert-value" style={{ color: summary.status_color }}>
            {summary.emotional_ratio}%
          </div>
          <div className="alert-text">{summary.status_text}</div>
          <div className="alert-detail">
            ضرر ناشی از احساسات منفی: {summary.negative_loss.toFixed(2)}$ از مجموع {summary.total_loss.toFixed(2)}$ ضرر
          </div>
        </div>
      </div>

      {/* ===== نمودارها ===== */}
      {hasEmotions && (
        <div className="emotional-charts">
          {/* نمودار میله‌ای */}
          <div className="chart-card bar-chart">
            <h4>📊 سود/زیان هر احساس</h4>
            <ExpandableChart className="bar-chart-container" title="نمودار سود/زیان هر احساس">
              <div className="bar-chart-container">
                {emotions.map((item) => {
                  const percent = Math.max(0, (Math.abs(item.total_pnl) / Math.max(maxProfit, Math.abs(minProfit), 1)) * 100);
                  const isPositive = item.total_pnl >= 0;
                  const color = EMOTION_COLORS[item.emotion] || '#888';
                  const icon = EMOTION_ICONS[item.emotion] || '😐';

                  return (
                    <div key={item.emotion} className="bar-item">
                      <div className="bar-label">
                        <span className="bar-icon">{icon}</span>
                        <span className="bar-name">{item.emotion}</span>
                        <span className={`bar-value ${isPositive ? 'positive' : 'negative'}`}>
                          {isPositive ? '+' : ''}{item.total_pnl.toFixed(2)}$
                        </span>
                      </div>
                      <div className="bar-track">
                        <div
                          className={`bar-fill ${isPositive ? 'positive' : 'negative'}`}
                          style={{
                            width: `${Math.min(percent, 100)}%`,
                            backgroundColor: isPositive ? '#4caf50' : '#f44336',
                            opacity: Math.max(0.3, percent / 100)
                          }}
                        />
                      </div>
                      <div className="bar-impact">{item.impact}% تأثیر</div>
                    </div>
                  );
                })}
              </div>
            </ExpandableChart>
          </div>

          {/* نمودار دایره‌ای و جدول کنار هم */}
          <div className="charts-row">
            {/* نمودار دایره‌ای */}
            <div className="chart-card doughnut-chart">
              <h4>🍩 توزیع تعداد تریدها</h4>
              <ExpandableChart className="doughnut-container" title="نمودار توزیع تعداد تریدها">
                <div className="doughnut-container">
                  <div className="doughnut-legend">
                    {emotions.map((item) => {
                      const color = EMOTION_COLORS[item.emotion] || '#888';
                      const icon = EMOTION_ICONS[item.emotion] || '😐';
                      return (
                        <div key={item.emotion} className="legend-item">
                          <span className="legend-dot" style={{ backgroundColor: color }}></span>
                          <span className="legend-label">{icon} {item.emotion}</span>
                          <span className="legend-count">{item.count} ({item.win_rate}%)</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="doughnut-visual" style={{ width: '100%', height: '100%' }}>
                    <svg viewBox="0 0 100 100" width="100%" height="100%">
                      {emotions.map((item, index) => {
                        const color = EMOTION_COLORS[item.emotion] || '#888';
                        let startAngle = 0;
                        for (let i = 0; i < index; i++) {
                          startAngle += (emotions[i].count / total_trades) * 360;
                        }
                        const endAngle = startAngle + (item.count / total_trades) * 360;
                        const startRad = (startAngle - 90) * Math.PI / 180;
                        const endRad = (endAngle - 90) * Math.PI / 180;
                        const x1 = 50 + 40 * Math.cos(startRad);
                        const y1 = 50 + 40 * Math.sin(startRad);
                        const x2 = 50 + 40 * Math.cos(endRad);
                        const y2 = 50 + 40 * Math.sin(endRad);
                        const largeArc = (endAngle - startAngle) > 180 ? 1 : 0;
                        const pathData = `
                          M 50 50
                          L ${x1} ${y1}
                          A 40 40 0 ${largeArc} 1 ${x2} ${y2}
                          Z
                        `;
                        return (
                          <path
                            key={item.emotion}
                            d={pathData}
                            fill={color}
                            stroke="#fff"
                            strokeWidth="1"
                            opacity="0.9"
                          />
                        );
                      })}
                      <circle cx="50" cy="50" r="20" fill="var(--card-bg, #fff)" stroke="var(--border-color, #ddd)" strokeWidth="1" />
                      <text x="50" y="48" textAnchor="middle" fontSize="10" fill="var(--text-primary, #333)" fontWeight="bold">
                        {total_trades}
                      </text>
                      <text x="50" y="58" textAnchor="middle" fontSize="6" fill="var(--text-muted, #888)">
                        ترید
                      </text>
                    </svg>
                  </div>
                </div>
              </ExpandableChart>
            </div>

            {/* جدول کامل */}
            <div className="chart-card table-card">
              <h4>📋 جدول جزئیات احساسات</h4>
              <div className="emotional-table-wrapper">
                <table className="emotional-table">
                  <thead>
                    <tr>
                      <th>احساس</th>
                      <th>تعداد</th>
                      <th>سود کل</th>
                      <th>برد</th>
                      <th>باخت</th>
                      <th>نرخ برد</th>
                      <th>میانگین R:R</th>
                      <th>تأثیر</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emotions.map((item) => {
                      const isPositive = item.total_pnl >= 0;
                      const color = EMOTION_COLORS[item.emotion] || '#888';
                      const icon = EMOTION_ICONS[item.emotion] || '😐';
                      return (
                        <tr key={item.emotion} style={{ borderRight: `4px solid ${color}` }}>
                          <td><span className="emotion-cell">{icon} {item.emotion}</span></td>
                          <td>{item.count}</td>
                          <td className={isPositive ? 'positive' : 'negative'}>
                            {isPositive ? '+' : ''}{item.total_pnl.toFixed(2)}$
                          </td>
                          <td className="win">{item.win_count}</td>
                          <td className="loss">{item.loss_count}</td>
                          <td>{item.win_rate}%</td>
                          <td>{item.avg_rr.toFixed(2)}</td>
                          <td>
                            <div className="impact-bar">
                              <div
                                className="impact-fill"
                                style={{ width: `${Math.min(item.impact, 100)}%` }}
                              />
                              <span>{item.impact}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== جمع‌بندی و توصیه‌ها ===== */}
      <div className="emotional-summary">
        <div className="summary-box">
          <h4>📌 جمع‌بندی و توصیه‌ها</h4>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">بهترین احساس</span>
              <span className="summary-value">
                {emotions.length > 0 && (
                  <>
                    {EMOTION_ICONS[emotions[0].emotion] || '😐'} {emotions[0].emotion}
                    <small>({emotions[0].total_pnl.toFixed(2)}$)</small>
                  </>
                )}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">بدترین احساس</span>
              <span className="summary-value">
                {emotions.length > 0 && (
                  <>
                    {EMOTION_ICONS[emotions[emotions.length - 1].emotion] || '😐'} {emotions[emotions.length - 1].emotion}
                    <small>({emotions[emotions.length - 1].total_pnl.toFixed(2)}$)</small>
                  </>
                )}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">احساسات منفی</span>
              <span className="summary-value">
                {summary.negative_emotions.map(e => EMOTION_ICONS[e] || '😐').join(' ')}
              </span>
            </div>
          </div>
          <div className="summary-recommendation">
            <p>
              {summary.status === 'good' && '✅ عالی! احساسات شما را کنترل می‌کنید. به این روند ادامه دهید.'}
              {summary.status === 'warning' && '⚠️ روی احساسات منفی (به‌ویژه ترس و طمع) کار کنید. تمرکز بر آرامش و صبر می‌تواند عملکرد شما را بهبود بخشد.'}
              {summary.status === 'danger' && '🚨 اکثر ضررهای شما ناشی از احساسات است. توصیه می‌کنیم قبل از هر معامله یک چک‌لیست روانشناختی تهیه کنید و در شرایط احساسی شدید معامله نکنید.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmotionalPnL;