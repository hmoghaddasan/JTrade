// frontend/src/components/reports/reports/RiskManagementReport.js

import React from 'react';

const RiskManagementReport = ({ dateRange, selectedCategory, isDark, trades }) => {
  if (!trades || trades.length === 0) {
    return (
      <div className="report-content-inner">
        <div className="report-description">
          <h5>📖 درباره این گزارش</h5>
          <p>این گزارش میزان پایبندی شما به اصول مدیریت سرمایه را بررسی می‌کند. مدیریت سرمایه یکی از مهم‌ترین عوامل موفقیت در معاملات است و این گزارش به شما کمک می‌کند نقاط ضعف خود را در این زمینه شناسایی کنید.</p>
          <p className="formula-text"><strong>فرمول محاسبه:</strong> نرخ پایبندی = (تعداد تریدهای پایبند / کل تریدها) × ۱۰۰ | تخطی‌ها شامل مواردی مانند عدم رعایت حد ضرر، ریسک بیش از حد و اورترید است.</p>
        </div>
        <div className="empty-state">
          <p>هیچ تریدی با فیلترهای انتخاب شده یافت نشد</p>
        </div>
      </div>
    );
  }

  const totalTrades = trades.length;
  const adheredTrades = trades.filter(t => t.stop_loss_adherence === true).length;
  const violatedTrades = totalTrades - adheredTrades;
  const adherenceRate = totalTrades > 0 ? (adheredTrades / totalTrades * 100).toFixed(1) : 0;

  // محاسبه انواع تخطی‌ها
  const violations = [
    { type: 'عدم رعایت حد ضرر', count: trades.filter(t => t.stop_loss_adherence === false).length },
    { type: 'ریسک بیش از حد', count: trades.filter(t => t.risk_percent && parseFloat(t.risk_percent) > 3).length },
    { type: 'اورترید', count: trades.filter(t => t.over_trade === true).length }
  ].filter(v => v.count > 0);

  return (
    <div className="report-content-inner">
      <div className="report-description">
        <h5>📖 درباره این گزارش</h5>
        <p>این گزارش میزان پایبندی شما به اصول مدیریت سرمایه را بررسی می‌کند. مدیریت سرمایه یکی از مهم‌ترین عوامل موفقیت در معاملات است و این گزارش به شما کمک می‌کند نقاط ضعف خود را در این زمینه شناسایی کنید.</p>
        <p className="formula-text"><strong>فرمول محاسبه:</strong> نرخ پایبندی = (تعداد تریدهای پایبند / کل تریدها) × ۱۰۰ | تخطی‌ها شامل مواردی مانند عدم رعایت حد ضرر، ریسک بیش از حد و اورترید است.</p>
      </div>

      <div className="report-summary">
        <div className="summary-item">
          <span className="summary-label">نرخ پایبندی</span>
          <span className={`summary-value ${adherenceRate >= 80 ? 'success' : 'danger'}`}>
            {adherenceRate}%
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">تخطی‌ها</span>
          <span className="summary-value danger">{violatedTrades} مورد</span>
        </div>
      </div>

      <div className="risk-breakdown">
        <div className="risk-circle">
          <svg viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" className="risk-bg" />
            <circle
              cx="60"
              cy="60"
              r="50"
              className="risk-fill"
              strokeDasharray={`${(adherenceRate / 100) * 314.16} 314.16`}
            />
            <text x="60" y="60" textAnchor="middle" dominantBaseline="central" className="risk-text">
              {adherenceRate}%
            </text>
          </svg>
        </div>
        <div className="risk-legend">
          <div className="legend-item">
            <span className="legend-color green"></span>
            <span>پایبندی ({adheredTrades} ترید)</span>
          </div>
          <div className="legend-item">
            <span className="legend-color red"></span>
            <span>تخطی ({violatedTrades} ترید)</span>
          </div>
        </div>
      </div>

      {violations.length > 0 && (
        <table className="report-table">
          <thead>
            <tr>
              <th>نوع تخطی</th>
              <th>تعداد</th>
            </tr>
          </thead>
          <tbody>
            {violations.map((item, index) => (
              <tr key={index}>
                <td>❌ {item.type}</td>
                <td>{item.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default RiskManagementReport;