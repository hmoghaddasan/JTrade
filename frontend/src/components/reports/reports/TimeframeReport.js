// frontend/src/components/reports/reports/TimeframeReport.js

import React from 'react';

const TimeframeReport = ({ dateRange, selectedCategory, isDark, trades }) => {
  if (!trades || trades.length === 0) {
    return (
      <div className="report-content-inner">
        <div className="report-description">
          <h5>📖 درباره این گزارش</h5>
          <p>این گزارش بهترین ترکیب تایم‌فریم‌ها را برای شما شناسایی می‌کند. هر ترید ممکن است از ترکیب متفاوتی از تایم‌فریم‌ها استفاده کرده باشد و این گزارش به شما کمک می‌کند مؤثرترین ترکیب را پیدا کنید.</p>
          <p className="formula-text"><strong>فرمول محاسبه:</strong> برای هر ترکیب تایم‌فریم، تعداد ترید، سود کل، نرخ برد و میانگین سود محاسبه شده و ترکیب‌ها بر اساس سود مرتب می‌شوند.</p>
        </div>
        <div className="empty-state">
          <p>هیچ تریدی با فیلترهای انتخاب شده یافت نشد</p>
        </div>
      </div>
    );
  }

  const timeframeKeys = [
    { key: 'timeframe_d', label: 'D1' },
    { key: 'timeframe_h4', label: 'H4' },
    { key: 'timeframe_h1', label: 'H1' },
    { key: 'timeframe_m15', label: 'M15' },
    { key: 'timeframe_m5', label: 'M5' },
    { key: 'timeframe_m1', label: 'M1' }
  ];

  const combinations = {};
  trades.forEach(trade => {
    const used = timeframeKeys.filter(tf => trade[tf.key] === true);
    const key = used.length > 0 ? used.map(tf => tf.label).join('+') : 'No TF';

    if (!combinations[key]) {
      combinations[key] = { combination: key, count: 0, totalProfit: 0, winning: 0 };
    }
    combinations[key].count += 1;
    combinations[key].totalProfit += trade.profit || 0;
    if (trade.profit > 0) {
      combinations[key].winning += 1;
    }
  });

  const reportData = Object.values(combinations).map(item => ({
    ...item,
    winRate: item.count > 0 ? (item.winning / item.count * 100).toFixed(1) : 0,
    avgProfit: item.count > 0 ? (item.totalProfit / item.count) : 0
  }));

  reportData.sort((a, b) => b.totalProfit - a.totalProfit);

  return (
    <div className="report-content-inner">
      <div className="report-description">
        <h5>📖 درباره این گزارش</h5>
        <p>این گزارش بهترین ترکیب تایم‌فریم‌ها را برای شما شناسایی می‌کند. هر ترید ممکن است از ترکیب متفاوتی از تایم‌فریم‌ها استفاده کرده باشد و این گزارش به شما کمک می‌کند مؤثرترین ترکیب را پیدا کنید.</p>
        <p className="formula-text"><strong>فرمول محاسبه:</strong> برای هر ترکیب تایم‌فریم، تعداد ترید، سود کل، نرخ برد و میانگین سود محاسبه شده و ترکیب‌ها بر اساس سود مرتب می‌شوند.</p>
      </div>

      <div className="report-summary">
        <div className="summary-item">
          <span className="summary-label">بهترین ترکیب</span>
          <span className="summary-value success">
            {reportData.length > 0 ? reportData[0].combination : '-'}
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">بیشترین نرخ برد</span>
          <span className="summary-value">
            {reportData.length > 0 ? reportData.reduce((best, current) => parseFloat(current.winRate) > parseFloat(best.winRate) ? current : best, reportData[0]).winRate : 0}%
          </span>
        </div>
      </div>

      <table className="report-table">
        <thead>
          <tr>
            <th>ترکیب تایم‌فریم</th>
            <th>تعداد ترید</th>
            <th>سود کل</th>
            <th>نرخ برد</th>
            <th>رتبه</th>
          </tr>
        </thead>
        <tbody>
          {reportData.map((item, index) => (
            <tr key={index}>
              <td><span className="timeframe-combo">{item.combination}</span></td>
              <td>{item.count}</td>
              <td className={item.totalProfit >= 0 ? 'positive' : 'negative'}>
                ${item.totalProfit}
              </td>
              <td>{item.winRate}%</td>
              <td>
                <span className={`rank-badge ${index < 2 ? 'gold' : index < 4 ? 'silver' : 'bronze'}`}>
                  #{index + 1}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TimeframeReport;