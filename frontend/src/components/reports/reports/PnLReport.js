// frontend/src/components/reports/reports/PnLReport.js

import React from 'react';

const PnLReport = ({ dateRange, selectedCategory, isDark, trades }) => {
  if (!trades || trades.length === 0) {
    return (
      <div className="report-content-inner">
        <div className="report-description">
          <h5>📖 درباره این گزارش</h5>
          <p>این گزارش عملکرد مالی شما را بر اساس هر نماد معاملاتی نمایش می‌دهد. با استفاده از این گزارش می‌توانید ببینید کدام نمادها بیشترین سود و کدام‌یک بیشترین ضرر را برای شما داشته‌اند.</p>
          <p className="formula-text"><strong>فرمول محاسبه:</strong> سود کل = مجموع سود/زیان تمام تریدهای آن نماد | نرخ برد = (تعداد تریدهای برنده / کل تریدها) × ۱۰۰</p>
        </div>
        <div className="empty-state">
          <p>هیچ تریدی با فیلترهای انتخاب شده یافت نشد</p>
        </div>
      </div>
    );
  }

  const symbols = [...new Set(trades.map(t => t.symbol))];
  const data = symbols.map(symbol => {
    const symbolTrades = trades.filter(t => t.symbol === symbol);
    const total = symbolTrades.length;
    const winning = symbolTrades.filter(t => t.profit > 0).length;
    const losing = symbolTrades.filter(t => t.profit < 0).length;
    const profit = symbolTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const winRate = total > 0 ? (winning / total * 100).toFixed(1) : 0;
    return { symbol, trades: total, winning, losing, profit, winRate };
  });

  data.sort((a, b) => b.profit - a.profit);

  const totalProfit = data.reduce((sum, item) => sum + item.profit, 0);
  const totalTrades = data.reduce((sum, item) => sum + item.trades, 0);
  const totalWinning = data.reduce((sum, item) => sum + item.winning, 0);
  const overallWinRate = totalTrades > 0 ? (totalWinning / totalTrades * 100).toFixed(1) : 0;

  return (
    <div className="report-content-inner">
      <div className="report-description">
        <h5>📖 درباره این گزارش</h5>
        <p>این گزارش عملکرد مالی شما را بر اساس هر نماد معاملاتی نمایش می‌دهد. با استفاده از این گزارش می‌توانید ببینید کدام نمادها بیشترین سود و کدام‌یک بیشترین ضرر را برای شما داشته‌اند.</p>
        <p className="formula-text"><strong>فرمول محاسبه:</strong> سود کل = مجموع سود/زیان تمام تریدهای آن نماد | نرخ برد = (تعداد تریدهای برنده / کل تریدها) × ۱۰۰</p>
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
          <span className="summary-label">نرخ برد کلی</span>
          <span className="summary-value">{overallWinRate}%</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">بهترین نماد</span>
          <span className="summary-value success">
            {data.length > 0 ? data[0].symbol : '-'} (+${data.length > 0 ? data[0].profit : 0})
          </span>
        </div>
      </div>

      <table className="report-table">
        <thead>
          <tr>
            <th>نماد</th>
            <th>تعداد ترید</th>
            <th>برنده</th>
            <th>بازنده</th>
            <th>نرخ برد</th>
            <th>سود کل</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index}>
              <td><strong>{item.symbol}</strong></td>
              <td>{item.trades}</td>
              <td>{item.winning}</td>
              <td>{item.losing}</td>
              <td>{item.winRate}%</td>
              <td className={item.profit >= 0 ? 'positive' : 'negative'}>
                ${item.profit}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th>مجموع</th>
            <th>{totalTrades}</th>
            <th>{totalWinning}</th>
            <th>{totalTrades - totalWinning}</th>
            <th>{overallWinRate}%</th>
            <th className={totalProfit >= 0 ? 'positive' : 'negative'}>
              ${totalProfit}
            </th>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default PnLReport;