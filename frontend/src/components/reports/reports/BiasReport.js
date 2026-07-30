// frontend/src/components/reports/reports/BiasReport.js

import React from 'react';

const BiasReport = ({ dateRange, selectedCategory, isDark, trades }) => {
  if (!trades || trades.length === 0) {
    return (
      <div className="report-content-inner">
        <div className="report-description">
          <h5>📖 درباره این گزارش</h5>
          <p>این گزارش عملکرد شما را بر اساس جهت‌گیری بازار (Bias) بررسی می‌کند. با تحلیل این داده‌ها می‌توانید متوجه شوید در کدام شرایط بازار عملکرد بهتری دارید.</p>
          <div className="formula-box">
            <p className="formula-text"><strong>📐 فرمول محاسبه:</strong></p>
            <ul className="formula-list">
              <li><strong>سود کل هر Bias:</strong> مجموع سود/زیان تمام تریدهای آن Bias</li>
              <li><strong>نرخ برد:</strong> (تعداد تریدهای برنده / کل تریدهای آن Bias) × ۱۰۰</li>
              <li><strong>میانگین سود:</strong> سود کل / تعداد تریدهای آن Bias</li>
            </ul>
          </div>
          <p className="interpretation-text"><strong>💡 نحوه تفسیر:</strong> بررسی کنید کدام جهت‌گیری بازار برای شما سودآورتر است. اگر در یک Bias خاص عملکرد ضعیفی دارید، شاید بهتر باشد در آن شرایط از معامله خودداری کنید.</p>
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
    const profit = biasTrades.reduce((sum, t) => sum + (parseFloat(t.profit) || 0), 0);
    const winning = biasTrades.filter(t => parseFloat(t.profit) > 0).length;
    const avgProfit = count > 0 ? profit / count : 0;
    const winRate = count > 0 ? (winning / count * 100).toFixed(1) : 0;
    return { bias, label: biasLabels[bias] || bias, count, profit, avgProfit, winRate };
  });

  const totalTrades = data.reduce((sum, item) => sum + item.count, 0);
  const totalProfit = data.reduce((sum, item) => sum + item.profit, 0);
  const bestBias = data.reduce((best, current) => current.profit > best.profit ? current : best, data[0]);
  const worstBias = data.reduce((worst, current) => current.profit < worst.profit ? current : worst, data[0]);

  return (
    <div className="report-content-inner">
      <div className="report-description">
        <h5>📖 درباره این گزارش</h5>
        <p>این گزارش عملکرد شما را بر اساس جهت‌گیری بازار (Bias) بررسی می‌کند. با تحلیل این داده‌ها می‌توانید متوجه شوید در کدام شرایط بازار عملکرد بهتری دارید.</p>
        <div className="formula-box">
          <p className="formula-text"><strong>📐 فرمول محاسبه:</strong></p>
          <ul className="formula-list">
            <li><strong>سود کل هر Bias:</strong> مجموع سود/زیان تمام تریدهای آن Bias</li>
            <li><strong>نرخ برد:</strong> (تعداد تریدهای برنده / کل تریدهای آن Bias) × ۱۰۰</li>
            <li><strong>میانگین سود:</strong> سود کل / تعداد تریدهای آن Bias</li>
          </ul>
        </div>
        <p className="interpretation-text"><strong>💡 نحوه تفسیر:</strong> بررسی کنید کدام جهت‌گیری بازار برای شما سودآورتر است. اگر در یک Bias خاص عملکرد ضعیفی دارید، شاید بهتر باشد در آن شرایط از معامله خودداری کنید.</p>
      </div>

      <div className="report-summary">
        <div className="summary-item">
          <span className="summary-label">بهترین Bias</span>
          <span className="summary-value success">{bestBias.label} (${bestBias.profit})</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">بدترین Bias</span>
          <span className="summary-value danger">{worstBias.label} (${worstBias.profit})</span>
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

      <div className="insight-box">
        <h5>💡 تحلیل و بینش</h5>
        <ul className="insight-list">
          <li>
            <strong>عملکرد کلی:</strong>
            {totalProfit >= 0 && ' ✅ شما در مجموع عملکرد مثبتی در بازار داشته‌اید.'}
            {totalProfit < 0 && ' ❌ عملکرد کلی شما در بازار منفی است. بررسی کنید در کدام Bias بیشترین ضرر را داشته‌اید.'}
          </li>
          <li>
            <strong>بهترین عملکرد:</strong>
            {bestBias.count > 0 && ` جهت‌گیری ${bestBias.label} با سود ${bestBias.profit}$ و نرخ برد ${bestBias.winRate}% بهترین عملکرد را داشته است.`}
          </li>
          <li>
            <strong>نکته قابل توجه:</strong>
            {worstBias.count > 0 && worstBias.profit < 0 && ` جهت‌گیری ${worstBias.label} با زیان ${worstBias.profit}$ نیاز به بررسی و بهبود دارد.`}
            {data.some(d => d.count === 0) && ' برخی از جهت‌گیری‌ها هیچ تریدی نداشته‌اند.'}
          </li>
        </ul>
      </div>
    </div>
  );
};

export default BiasReport;