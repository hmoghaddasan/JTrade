// frontend/src/components/reports/reports/ExecutionQualityReport.js

import React from 'react';

const ExecutionQualityReport = ({ dateRange, selectedCategory, isDark, trades }) => {
  if (!trades || trades.length === 0) {
    return (
      <div className="report-content-inner">
        <div className="report-description">
          <h5>📖 درباره این گزارش</h5>
          <p>این گزارش رابطه بین کیفیت اجرا و نتایج معاملات را بررسی می‌کند. کیفیت اجرا نشان‌دهنده میزان پایبندی شما به برنامه معاملاتی و دقت در انجام آن است.</p>
          <p className="formula-text"><strong>فرمول محاسبه:</strong> امتیاز کیفیت اجرا از ۱ تا ۱۰ توسط شما ثبت می‌شود. این گزارش میانگین سود و نرخ برد را برای هر محدوده امتیاز محاسبه می‌کند.</p>
        </div>
        <div className="empty-state">
          <p>هیچ تریدی با فیلترهای انتخاب شده یافت نشد</p>
        </div>
      </div>
    );
  }

  const ranges = [
    { min: 9, max: 10, label: '۹-۱۰' },
    { min: 7, max: 8, label: '۷-۸' },
    { min: 5, max: 6, label: '۵-۶' },
    { min: 3, max: 4, label: '۳-۴' },
    { min: 1, max: 2, label: '۱-۲' }
  ];

  // ✅ اصلاح: استفاده از parseFloat برای جمع عددی
  const data = ranges.map(range => {
    const rangeTrades = trades.filter(t => {
      const score = parseFloat(t.execution_quality_score) || 0;
      return score >= range.min && score <= range.max;
    });
    const count = rangeTrades.length;
    const profit = rangeTrades.reduce((sum, t) => sum + (parseFloat(t.profit) || 0), 0);
    const winning = rangeTrades.filter(t => parseFloat(t.profit) > 0).length;
    const avgProfit = count > 0 ? profit / count : 0;
    const winRate = count > 0 ? (winning / count * 100).toFixed(1) : 0;
    return { ...range, count, profit, avgProfit, winRate };
  });

  const totalTrades = data.reduce((sum, item) => sum + item.count, 0);
  const avgQuality = trades.reduce((sum, t) => sum + (parseFloat(t.execution_quality_score) || 0), 0) / trades.length;

  return (
    <div className="report-content-inner">
      <div className="report-description">
        <h5>📖 درباره این گزارش</h5>
        <p>این گزارش رابطه بین کیفیت اجرا و نتایج معاملات را بررسی می‌کند. کیفیت اجرا نشان‌دهنده میزان پایبندی شما به برنامه معاملاتی و دقت در انجام آن است.</p>
        <p className="formula-text"><strong>فرمول محاسبه:</strong> امتیاز کیفیت اجرا از ۱ تا ۱۰ توسط شما ثبت می‌شود. این گزارش میانگین سود و نرخ برد را برای هر محدوده امتیاز محاسبه می‌کند.</p>
      </div>

      <div className="report-summary">
        <div className="summary-item">
          <span className="summary-label">میانگین کیفیت</span>
          <span className="summary-value">{avgQuality.toFixed(1)}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">بالاترین سود با کیفیت بالا</span>
          <span className="summary-value success">
            ${data[0]?.profit || 0}
          </span>
        </div>
      </div>

      <table className="report-table">
        <thead>
          <tr>
            <th>امتیاز کیفیت</th>
            <th>تعداد ترید</th>
            <th>میانگین سود</th>
            <th>نرخ برد</th>
            <th>وضعیت</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index}>
              <td>
                <span className={`quality-badge ${item.count > 0 && item.avgProfit > 0 ? 'high' : 'low'}`}>
                  {item.label}
                </span>
              </td>
              <td>{item.count}</td>
              <td className={item.avgProfit >= 0 ? 'positive' : 'negative'}>
                ${item.avgProfit.toFixed(2)}
              </td>
              <td>{item.winRate}%</td>
              <td>
                <span className={`status-badge ${parseFloat(item.winRate) >= 60 ? 'success' : 'danger'}`}>
                  {parseFloat(item.winRate) >= 60 ? '✅ خوب' : '❌ ضعیف'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="insight-box">
        <h5>💡 تحلیل</h5>
        <p>
          تریدهایی با کیفیت اجرای بالا (۷-۱۰) به طور متوسط سود بیشتری دارند.
          {avgQuality < 6 && ' برای بهبود عملکرد، روی افزایش کیفیت اجرا تمرکز کنید.'}
          {avgQuality >= 6 && avgQuality < 8 && ' کیفیت اجرای شما در سطح قابل قبولی است، اما همچنان جای بهبود دارد.'}
          {avgQuality >= 8 && ' کیفیت اجرای شما عالی است! این را حفظ کنید.'}
        </p>
      </div>
    </div>
  );
};

export default ExecutionQualityReport;