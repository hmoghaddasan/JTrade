// frontend/src/components/reports/reports/RiskManagementReport.js

import React from 'react';

const RiskManagementReport = ({ dateRange, selectedCategory, isDark, trades }) => {
  if (!trades || trades.length === 0) {
    return (
      <div className="report-content-inner">
        <div className="report-description">
          <h5>📖 درباره این گزارش</h5>
          <p>این گزارش میزان پایبندی شما به اصول مدیریت سرمایه را بررسی می‌کند. مدیریت سرمایه یکی از مهم‌ترین عوامل موفقیت در معاملات است و این گزارش به شما کمک می‌کند نقاط ضعف خود را در این زمینه شناسایی کنید.</p>
          <div className="formula-box">
            <p className="formula-text"><strong>📐 فرمول محاسبه:</strong></p>
            <ul className="formula-list">
              <li><strong>نرخ پایبندی:</strong> (تعداد تریدهای پایبند / کل تریدها) × ۱۰۰</li>
              <li><strong>ریسک بیش از حد:</strong> تریدهایی با ریسک بیشتر از ۳٪ از کل سرمایه</li>
              <li><strong>اورترید:</strong> تریدهایی که بیش از حد معمول انجام شده‌اند</li>
            </ul>
          </div>
          <p className="interpretation-text"><strong>💡 نحوه تفسیر:</strong> نرخ پایبندی بالای ۸۰٪ نشان‌دهنده مدیریت سرمایه خوب است. زیر ۵۰٪ نیاز به بازنگری اساسی دارد.</p>
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
    {
      type: 'عدم رعایت حد ضرر',
      count: trades.filter(t => t.stop_loss_adherence === false).length,
      profit: trades.filter(t => t.stop_loss_adherence === false).reduce((sum, t) => sum + (parseFloat(t.profit) || 0), 0)
    },
    {
      type: 'ریسک بیش از حد (>۳٪)',
      count: trades.filter(t => t.risk_percent && parseFloat(t.risk_percent) > 3).length,
      profit: trades.filter(t => t.risk_percent && parseFloat(t.risk_percent) > 3).reduce((sum, t) => sum + (parseFloat(t.profit) || 0), 0)
    },
    {
      type: 'اورترید',
      count: trades.filter(t => t.over_trade === true).length,
      profit: trades.filter(t => t.over_trade === true).reduce((sum, t) => sum + (parseFloat(t.profit) || 0), 0)
    }
  ].filter(v => v.count > 0);

  const totalViolationProfit = violations.reduce((sum, v) => sum + v.profit, 0);

  return (
    <div className="report-content-inner">
      <div className="report-description">
        <h5>📖 درباره این گزارش</h5>
        <p>این گزارش میزان پایبندی شما به اصول مدیریت سرمایه را بررسی می‌کند. مدیریت سرمایه یکی از مهم‌ترین عوامل موفقیت در معاملات است و این گزارش به شما کمک می‌کند نقاط ضعف خود را در این زمینه شناسایی کنید.</p>
        <div className="formula-box">
          <p className="formula-text"><strong>📐 فرمول محاسبه:</strong></p>
          <ul className="formula-list">
            <li><strong>نرخ پایبندی:</strong> (تعداد تریدهای پایبند / کل تریدها) × ۱۰۰</li>
            <li><strong>ریسک بیش از حد:</strong> تریدهایی با ریسک بیشتر از ۳٪ از کل سرمایه</li>
            <li><strong>اورترید:</strong> تریدهایی که بیش از حد معمول انجام شده‌اند</li>
          </ul>
        </div>
        <p className="interpretation-text"><strong>💡 نحوه تفسیر:</strong> نرخ پایبندی بالای ۸۰٪ نشان‌دهنده مدیریت سرمایه خوب است. زیر ۵۰٪ نیاز به بازنگری اساسی دارد.</p>
      </div>

      <div className="report-summary">
        <div className="summary-item">
          <span className="summary-label">نرخ پایبندی</span>
          <span className={`summary-value ${parseFloat(adherenceRate) >= 80 ? 'success' : parseFloat(adherenceRate) >= 50 ? 'warning' : 'danger'}`}>
            {adherenceRate}%
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">تخطی‌ها</span>
          <span className="summary-value danger">{violatedTrades} مورد</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">سود/زیان تخطی‌ها</span>
          <span className={`summary-value ${totalViolationProfit >= 0 ? 'success' : 'danger'}`}>
            ${totalViolationProfit}
          </span>
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
              strokeDasharray={`${(parseFloat(adherenceRate) / 100) * 314.16} 314.16`}
            />
            <text x="60" y="55" textAnchor="middle" dominantBaseline="central" className="risk-text">
              {adherenceRate}%
            </text>
            <text x="60" y="75" textAnchor="middle" dominantBaseline="central" className="risk-label">
              پایبندی
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
              <th>سود/زیان</th>
            </tr>
          </thead>
          <tbody>
            {violations.map((item, index) => (
              <tr key={index}>
                <td>❌ {item.type}</td>
                <td>{item.count}</td>
                <td className={item.profit >= 0 ? 'positive' : 'negative'}>
                  ${item.profit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="insight-box">
        <h5>💡 تحلیل و بینش</h5>
        <ul className="insight-list">
          <li>
            <strong>وضعیت کلی:</strong>
            {parseFloat(adherenceRate) >= 80 && ' ✅ مدیریت سرمایه شما در سطح خوبی است. این را حفظ کنید.'}
            {parseFloat(adherenceRate) >= 50 && parseFloat(adherenceRate) < 80 && ' ⚡ مدیریت سرمایه شما در سطح متوسط است. با کاهش تخطی‌ها می‌توانید عملکرد خود را بهبود بخشید.'}
            {parseFloat(adherenceRate) < 50 && ' ❌ مدیریت سرمایه شما نیاز به بازنگری اساسی دارد.'}
          </li>
          <li>
            <strong>تأثیر تخطی‌ها:</strong>
            {totalViolationProfit < 0 && ` تخطی‌ها باعث ${Math.abs(totalViolationProfit)}$ ضرر شده‌اند. کاهش آنها می‌تواند سود شما را افزایش دهد.`}
            {totalViolationProfit >= 0 && violations.length > 0 && ` با وجود تخطی‌ها، ${totalViolationProfit}$ سود داشته‌اید، اما کاهش تخطی‌ها می‌تواند عملکرد را بهتر کند.`}
          </li>
          <li>
            <strong>پیشنهاد:</strong>
            {violations.some(v => v.type.includes('حد ضرر')) && ' 🔴 روی رعایت حد ضرر تمرکز کنید. این مهم‌ترین اصل مدیریت سرمایه است.'}
            {violations.some(v => v.type.includes('ریسک')) && ' 🔴 ریسک هر ترید را زیر ۳٪ نگه دارید.'}
            {violations.some(v => v.type.includes('اورترید')) && ' 🔴 از اورترید خودداری کنید. کیفیت بر کمیت اولویت دارد.'}
          </li>
        </ul>
      </div>
    </div>
  );
};

export default RiskManagementReport;