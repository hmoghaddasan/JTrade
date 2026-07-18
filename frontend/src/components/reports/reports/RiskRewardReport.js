// frontend/src/components/reports/reports/RiskRewardReport.js

import React from 'react';

const RiskRewardReport = ({ dateRange, selectedCategory, isDark, trades }) => {
  if (!trades || trades.length === 0) {
    return (
      <div className="report-content-inner">
        <div className="report-description">
          <h5>📖 درباره این گزارش</h5>
          <p>این گزارش تأثیر نسبت ریسک به ریوارد (R:R) را بر سود نهایی شما بررسی می‌کند. با دسته‌بندی تریدها بر اساس محدوده R:R، می‌توانید ببینید کدام محدوده بیشترین سودآوری را داشته است.</p>
          <p className="formula-text"><strong>فرمول محاسبه:</strong> نسبت R:R = (قیمت هدف - قیمت ورود) / (قیمت ورود - حد ضرر) | برای هر محدوده، مجموع سود و نرخ برد محاسبه می‌شود.</p>
        </div>
        <div className="empty-state">
          <p>هیچ تریدی با فیلترهای انتخاب شده یافت نشد</p>
        </div>
      </div>
    );
  }

  const rrRanges = [
    { min: 0, max: 1, label: '0-1' },
    { min: 1, max: 2, label: '1-2' },
    { min: 2, max: 3, label: '2-3' },
    { min: 3, max: 5, label: '3-5' },
    { min: 5, max: Infinity, label: '5+' },
  ];

  const data = rrRanges.map(range => {
    const rangeTrades = trades.filter(t => {
      const rr = t.risk_reward_ratio || 0;
      return rr >= range.min && rr < range.max;
    });
    const count = rangeTrades.length;
    const winning = rangeTrades.filter(t => t.profit > 0).length;
    const profit = rangeTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const avgProfit = count > 0 ? profit / count : 0;
    const winRate = count > 0 ? (winning / count * 100).toFixed(1) : 0;
    return { ...range, count, winning, profit, avgProfit, winRate };
  });

  const totalTrades = data.reduce((sum, item) => sum + item.count, 0);
  const totalProfit = data.reduce((sum, item) => sum + item.profit, 0);
  const bestRange = data.reduce((best, current) => current.profit > best.profit ? current : best, data[0]);

  return (
    <div className="report-content-inner">
      <div className="report-description">
        <h5>📖 درباره این گزارش</h5>
        <p>این گزارش تأثیر نسبت ریسک به ریوارد (R:R) را بر سود نهایی شما بررسی می‌کند. با دسته‌بندی تریدها بر اساس محدوده R:R، می‌توانید ببینید کدام محدوده بیشترین سودآوری را داشته است.</p>
        <p className="formula-text"><strong>فرمول محاسبه:</strong> نسبت R:R = (قیمت هدف - قیمت ورود) / (قیمت ورود - حد ضرر) | برای هر محدوده، مجموع سود و نرخ برد محاسبه می‌شود.</p>
      </div>

      <div className="report-summary">
        <div className="summary-item">
          <span className="summary-label">کل سود</span>
          <span className={`summary-value ${totalProfit >= 0 ? 'success' : 'danger'}`}>
            ${totalProfit}
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">کل تریدها</span>
          <span className="summary-value">{totalTrades}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">بهترین محدوده R:R</span>
          <span className="summary-value success">{bestRange.label}</span>
        </div>
      </div>

      <table className="report-table">
        <thead>
          <tr>
            <th>محدوده R:R</th>
            <th>تعداد ترید</th>
            <th>برنده</th>
            <th>نرخ برد</th>
            <th>سود کل</th>
            <th>میانگین سود</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index}>
              <td><span className="rr-badge">{item.label}</span></td>
              <td>{item.count}</td>
              <td>{item.winning}</td>
              <td>{item.winRate}%</td>
              <td className={item.profit >= 0 ? 'positive' : 'negative'}>
                ${item.profit}
              </td>
              <td>${item.avgProfit.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th>مجموع</th>
            <th>{totalTrades}</th>
            <th>-</th>
            <th>-</th>
            <th className={totalProfit >= 0 ? 'positive' : 'negative'}>
              ${totalProfit}
            </th>
            <th>-</th>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default RiskRewardReport;