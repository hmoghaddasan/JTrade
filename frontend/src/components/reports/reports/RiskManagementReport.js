// frontend/src/components/reports/reports/RiskManagementReport.js

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';

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

  const chartAxisColor = isDark ? '#ccc' : '#666';
  // رنگ‌بندی برای گیج SVG
  const gaugeColor = parseFloat(adherenceRate) >= 80 ? '#4caf50' : parseFloat(adherenceRate) >= 50 ? '#ff9800' : '#f44336';
  const gaugeBg = isDark ? '#333' : '#eee';

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

      <div className="risk-breakdown" style={{ display: 'flex', flexWrap: 'wrap', gap: '30px', alignItems: 'center', margin: '20px 0' }}>
        {/* گیج SVG بهبود یافته */}
        <div className="risk-circle">
          <svg viewBox="0 0 120 120" width="120" height="120">
            <circle cx="60" cy="60" r="50" stroke={gaugeBg} strokeWidth="8" fill="none" />
            <circle
              cx="60"
              cy="60"
              r="50"
              stroke={gaugeColor}
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${(parseFloat(adherenceRate) / 100) * 314.16} 314.16`}
              transform="rotate(-90 60 60)"
              strokeLinecap="round"
            />
            <text x="60" y="55" textAnchor="middle" dominantBaseline="central" fill={isDark ? '#fff' : '#333'} fontSize="20" fontWeight="bold">
              {adherenceRate}%
            </text>
            <text x="60" y="75" textAnchor="middle" dominantBaseline="central" fill={isDark ? '#aaa' : '#666'} fontSize="12">
              پایبندی
            </text>
          </svg>
        </div>
        <div className="risk-legend">
          <div className="legend-item" style={{ color: isDark ? '#ccc' : '#666' }}>
            <span className="legend-color green" style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#4caf50', marginRight: '8px' }}></span>
            <span>پایبندی ({adheredTrades} ترید)</span>
          </div>
          <div className="legend-item" style={{ color: isDark ? '#ccc' : '#666' }}>
            <span className="legend-color red" style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#f44336', marginRight: '8px' }}></span>
            <span>تخطی ({violatedTrades} ترید)</span>
          </div>
        </div>
      </div>

      {violations.length > 0 && (
        <>
          {/* نمودار تخطی‌ها */}
          <div className="chart-wrapper" style={{ margin: '20px 0', height: '200px' }}>
            <h6 style={{ color: isDark ? '#eee' : '#333' }}>تأثیر تخطی‌ها بر سود</h6>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={violations} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#444' : '#eee'} />
                <XAxis dataKey="type" stroke={chartAxisColor} />
                <YAxis stroke={chartAxisColor} />
                <Tooltip
                  contentStyle={{ backgroundColor: isDark ? '#333' : '#fff', border: 'none', borderRadius: '8px' }}
                  itemStyle={{ color: isDark ? '#fff' : '#333' }}
                  formatter={(value) => [`$${value}`, 'سود/زیان']}
                />
                <Bar dataKey="profit" name="سود/زیان">
                  {violations.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#4caf50' : '#f44336'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

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
        </>
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