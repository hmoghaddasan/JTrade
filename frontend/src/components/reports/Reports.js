// frontend/src/components/reports/Reports.js

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import './Reports.css';

const Reports = () => {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [activeReport, setActiveReport] = useState('overview');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });

  // داده‌های نمونه برای گزارشات
  const sampleData = {
    overview: {
      totalTrades: 45,
      winningTrades: 28,
      losingTrades: 17,
      winRate: 62.2,
      totalProfit: 3250.50,
      avgProfit: 72.23,
      bestTrade: 450.00,
      worstTrade: -120.00
    },
    monthly: [
      { month: 'فروردین', trades: 12, profit: 850 },
      { month: 'اردیبهشت', trades: 15, profit: 1200 },
      { month: 'خرداد', trades: 10, profit: -150 },
      { month: 'تیر', trades: 8, profit: 650 }
    ],
    symbols: [
      { symbol: 'EURUSD', trades: 12, winRate: 66.7, profit: 1250 },
      { symbol: 'XAUUSD', trades: 8, winRate: 75.0, profit: 980 },
      { symbol: 'NAS100', trades: 6, winRate: 50.0, profit: 320 },
      { symbol: 'BTCUSD', trades: 5, winRate: 60.0, profit: 450 },
      { symbol: 'GBPUSD', trades: 4, winRate: 75.0, profit: 250 }
    ],
    psychology: {
      focused: { count: 25, winRate: 72 },
      calm: { count: 20, winRate: 68 },
      stressed: { count: 8, winRate: 38 },
      tired: { count: 5, winRate: 20 },
      patient: { count: 22, winRate: 70 }
    },
    mistakes: [
      { code: 'ورود زودهنگام', count: 8, avgWeight: 0.7 },
      { code: 'عدم رعایت حد ضرر', count: 5, avgWeight: 0.8 },
      { code: 'خروج زودهنگام', count: 4, avgWeight: 0.5 },
      { code: 'اورترید', count: 3, avgWeight: 0.6 }
    ]
  };

  const renderOverview = () => (
    <div className="report-section">
      <h3>📊 نمای کلی عملکرد</h3>
      <div className="stats-grid">
        <div className="stat-item">
          <span className="stat-label">کل تریدها</span>
          <span className="stat-number">{sampleData.overview.totalTrades}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">تریدهای برنده</span>
          <span className="stat-number success">{sampleData.overview.winningTrades}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">تریدهای بازنده</span>
          <span className="stat-number danger">{sampleData.overview.losingTrades}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">نرخ برد</span>
          <span className="stat-number">{sampleData.overview.winRate}%</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">سود کل</span>
          <span className="stat-number success">${sampleData.overview.totalProfit}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">میانگین سود</span>
          <span className="stat-number">${sampleData.overview.avgProfit}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">بهترین ترید</span>
          <span className="stat-number success">${sampleData.overview.bestTrade}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">بدترین ترید</span>
          <span className="stat-number danger">${sampleData.overview.worstTrade}</span>
        </div>
      </div>
    </div>
  );

  const renderMonthly = () => (
    <div className="report-section">
      <h3>📈 عملکرد ماهانه</h3>
      <div className="table-container">
        <table className="report-table">
          <thead>
            <tr>
              <th>ماه</th>
              <th>تعداد ترید</th>
              <th>سود/زیان</th>
              <th>وضعیت</th>
            </tr>
          </thead>
          <tbody>
            {sampleData.monthly.map((item, index) => (
              <tr key={index}>
                <td>{item.month}</td>
                <td>{item.trades}</td>
                <td className={item.profit >= 0 ? 'positive' : 'negative'}>
                  ${item.profit}
                </td>
                <td>
                  <span className={`status-badge ${item.profit >= 0 ? 'success' : 'danger'}`}>
                    {item.profit >= 0 ? '✅ سود' : '❌ زیان'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderSymbols = () => (
    <div className="report-section">
      <h3>📊 عملکرد بر اساس نماد</h3>
      <div className="table-container">
        <table className="report-table">
          <thead>
            <tr>
              <th>نماد</th>
              <th>تعداد ترید</th>
              <th>نرخ برد</th>
              <th>سود کل</th>
            </tr>
          </thead>
          <tbody>
            {sampleData.symbols.map((item, index) => (
              <tr key={index}>
                <td><strong>{item.symbol}</strong></td>
                <td>{item.trades}</td>
                <td>{item.winRate}%</td>
                <td className={item.profit >= 0 ? 'positive' : 'negative'}>
                  ${item.profit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderPsychology = () => (
    <div className="report-section">
      <h3>🧠 تحلیل روانشناسی</h3>
      <div className="psychology-grid">
        <div className="psychology-card">
          <h4>احساسات غالب</h4>
          {Object.entries(sampleData.psychology).map(([key, value]) => (
            <div key={key} className="psychology-item">
              <span className="emotion-label">
                {key === 'focused' ? 'تمرکز' :
                 key === 'calm' ? 'آرامش' :
                 key === 'stressed' ? 'استرس' :
                 key === 'tired' ? 'خستگی' :
                 key === 'patient' ? 'صبر' : key}
              </span>
              <div className="emotion-bar">
                <div
                  className="emotion-fill"
                  style={{
                    width: `${(value.count / 25) * 100}%`,
                    background: value.winRate >= 60 ? '#2e7d32' :
                               value.winRate >= 40 ? '#f57f17' : '#c62828'
                  }}
                />
              </div>
              <span className="emotion-stats">
                {value.count} ترید | {value.winRate}% برد
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderMistakes = () => (
    <div className="report-section">
      <h3>❌ تحلیل اشتباهات</h3>
      <div className="table-container">
        <table className="report-table">
          <thead>
            <tr>
              <th>کد اشتباه</th>
              <th>تعداد تکرار</th>
              <th>وزن متوسط</th>
              <th>تاثیر</th>
            </tr>
          </thead>
          <tbody>
            {sampleData.mistakes.map((item, index) => (
              <tr key={index}>
                <td>{item.code}</td>
                <td>{item.count}</td>
                <td>{item.avgWeight}</td>
                <td>
                  <span className={`impact-badge ${item.avgWeight >= 0.7 ? 'high' : item.avgWeight >= 0.4 ? 'medium' : 'low'}`}>
                    {item.avgWeight >= 0.7 ? '🔴 بالا' :
                     item.avgWeight >= 0.4 ? '🟡 متوسط' : '🟢 پایین'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderContent = () => {
    switch(activeReport) {
      case 'overview': return renderOverview();
      case 'monthly': return renderMonthly();
      case 'symbols': return renderSymbols();
      case 'psychology': return renderPsychology();
      case 'mistakes': return renderMistakes();
      default: return renderOverview();
    }
  };

  return (
    <div className={`reports-container ${isDark ? 'dark' : 'light'}`}>
      <div className="reports-header">
        <h2>📊 گزارشات ترید</h2>
        <button className="btn-back" onClick={() => navigate('/')}>
          ↩️ بازگشت
        </button>
      </div>

      <div className="reports-tabs">
        <button
          className={`tab-btn ${activeReport === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveReport('overview')}
        >
          📊 نمای کلی
        </button>
        <button
          className={`tab-btn ${activeReport === 'monthly' ? 'active' : ''}`}
          onClick={() => setActiveReport('monthly')}
        >
          📈 ماهانه
        </button>
        <button
          className={`tab-btn ${activeReport === 'symbols' ? 'active' : ''}`}
          onClick={() => setActiveReport('symbols')}
        >
          💹 نمادها
        </button>
        <button
          className={`tab-btn ${activeReport === 'psychology' ? 'active' : ''}`}
          onClick={() => setActiveReport('psychology')}
        >
          🧠 روانشناسی
        </button>
        <button
          className={`tab-btn ${activeReport === 'mistakes' ? 'active' : ''}`}
          onClick={() => setActiveReport('mistakes')}
        >
          ❌ اشتباهات
        </button>
      </div>

      <div className="reports-content">
        {renderContent()}
      </div>
    </div>
  );
};

export default Reports;