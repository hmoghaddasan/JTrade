// frontend/src/components/reports/reports/BiasReport.js

import React from 'react';

const BiasReport = ({ dateRange, selectedCategory, isDark, trades }) => {
  if (!trades || trades.length === 0) {
    return (
      <div className="report-content-inner">
        <div className="report-description">
          <h5>📖 درباره این گزارش</h5>
          <p>این گزارش عملکرد شما را بر اساس جهت‌گیری بازار (Bias) بررسی می‌کند. با تحلیل این داده‌ها می‌توانید متوجه شوید در کدام شرایط بازار عملکرد بهتری دارید.</p>
          <p className="formula-text"><strong>فرمول محاسبه:</strong> برای هر نوع Bias (صعودی، نزولی، خنثی)، تعداد ترید، سود کل، نرخ برد و میانگین سود محاسبه می‌شود.</p>
        </div>
        <div className="empty-state">
          <p>هیچ تریدی با فیلترهای انتخاب شده یافت نشد</p>
        </div>
      </div>
    );
  }

  const biases = ['Bullish', 'Bearish', 'Neutral'];
  const biasLabels = {
    'Bullish': '📈 صعودی',
    'Bearish': '📉 نزولی',
    'Neutral': '⚖️ خنثی'
  };

  const data = biases.map(bias => {
    const biasTrades = trades.filter(t => t.bias === bias);
    const count = biasTrades.length;
    const profit = biasTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const winning = biasTrades.filter(t => t.profit > 0).length;
    const avgProfit = count > 0 ? profit / count : 0;
    const winRate = count > 0 ? (winning / count * 100).toFixed(1) : 0;
    return { bias, label: biasLabels[bias] || bias, count, profit, avgProfit, winRate };
  });

  const totalTrades = data.reduce((sum, item) => sum + item.count, 0);
  const totalProfit = data.reduce((sum, item) => sum + item.profit, 0);
  const bestBias = data.reduce((best, current) => current.profit > best.profit ? current : best, data[0]);

  return (
    <div className="report-content-inner">
      <div className="report-description">
        <h5>📖 درباره این گزارش</h5>
        <p>این گزارش عملکرد شما را بر اساس جهت‌گیری بازار (Bias) بررسی می‌کند. با تحلیل این داده‌ها می‌توانید متوجه شوید در کدام شرایط بازار عملکرد بهتری دارید.</p>
        <p className="formula-text"><strong>فرمول محاسبه:</strong> برای هر نوع Bias (صعودی، نزولی، خنثی)، تعداد ترید، سود کل، نرخ برد و میانگین سود محاسبه می‌شود.</p>
      </div>

      <div className="report-summary">
        <div className="summary-item">
          <span className="summary-label">بهترین Bias</span>
          <span className="summary-value success">{bestBias.label}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">سود کل</span>
          <span className={`summary-value ${totalProfit >= 0 ? 'success' : 'danger'}`}>
            ${totalProfit}
          </span>
        </div>
      </div>

      <table className="report-table">
        <thead>
          <tr>
            <th>جهت بازار (Bias)</th>
            <th>تعداد ترید</th>
            <th>سود کل</th>
            <th>نرخ برد</th>
            <th>میانگین سود</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index}>
              <td><span className={`bias-badge ${item.bias}`}>{item.label}</span></td>
              <td>{item.count}</td>
              <td className={item.profit >= 0 ? 'positive' : 'negative'}>
                ${item.profit}
              </td>
              <td>{item.winRate}%</td>
              <td>${item.avgProfit.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BiasReport;