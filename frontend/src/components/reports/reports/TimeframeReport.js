// frontend/src/components/reports/reports/WeeklyPerformanceReport.js

import React from 'react';

const WeeklyPerformanceReport = ({ dateRange, selectedCategory, isDark, trades }) => {
  if (!trades || trades.length === 0) {
    return (
      <div className="report-content-inner">
        <div className="report-description">
          <h5>📖 درباره این گزارش</h5>
          <p>این گزارش کارایی شما را در روزهای مختلف هفته نشان می‌دهد. با تحلیل این داده‌ها می‌توانید متوجه شوید کدام روزهای هفته برای شما سودآورتر هستند و برنامه‌ریزی بهتری داشته باشید.</p>
          <p className="formula-text"><strong>فرمول محاسبه:</strong> سود روز = مجموع سود/زیان تمام تریدهای آن روز | نرخ برد روز = (تعداد تریدهای برنده در آن روز / کل تریدهای آن روز) × ۱۰۰</p>
        </div>
        <div className="empty-state">
          <p>هیچ تریدی با فیلترهای انتخاب شده یافت نشد</p>
        </div>
      </div>
    );
  }

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dayNamesFa = {
    'Monday': 'دوشنبه',
    'Tuesday': 'سه‌شنبه',
    'Wednesday': 'چهارشنبه',
    'Thursday': 'پنج‌شنبه',
    'Friday': 'جمعه',
    'Saturday': 'شنبه',
    'Sunday': 'یک‌شنبه'
  };

  // ✅ اصلاح: استفاده از parseFloat برای جمع عددی
  const data = days.map(day => {
    const dayTrades = trades.filter(t => t.day_of_week === day);
    const count = dayTrades.length;
    const winning = dayTrades.filter(t => parseFloat(t.profit) > 0).length;
    const profit = dayTrades.reduce((sum, t) => sum + (parseFloat(t.profit) || 0), 0);
    const winRate = count > 0 ? (winning / count * 100).toFixed(1) : 0;
    return { day, dayFa: dayNamesFa[day] || day, count, winning, profit, winRate };
  });

  const bestDay = [...data].sort((a, b) => b.profit - a.profit)[0];
  const worstDay = [...data].sort((a, b) => a.profit - b.profit)[0];

  return (
    <div className="report-content-inner">
      <div className="report-description">
        <h5>📖 درباره این گزارش</h5>
        <p>این گزارش کارایی شما را در روزهای مختلف هفته نشان می‌دهد. با تحلیل این داده‌ها می‌توانید متوجه شوید کدام روزهای هفته برای شما سودآورتر هستند و برنامه‌ریزی بهتری داشته باشید.</p>
        <p className="formula-text"><strong>فرمول محاسبه:</strong> سود روز = مجموع سود/زیان تمام تریدهای آن روز | نرخ برد روز = (تعداد تریدهای برنده در آن روز / کل تریدهای آن روز) × ۱۰۰</p>
      </div>

      <div className="report-summary">
        <div className="summary-item">
          <span className="summary-label">بهترین روز</span>
          <span className="summary-value success">
            {bestDay?.dayFa} (+${bestDay?.profit || 0})
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">بدترین روز</span>
          <span className="summary-value danger">
            {worstDay?.dayFa} (${worstDay?.profit || 0})
          </span>
        </div>
      </div>

      <table className="report-table">
        <thead>
          <tr>
            <th>روز هفته</th>
            <th>تعداد ترید</th>
            <th>برنده</th>
            <th>سود/زیان</th>
            <th>نرخ برد</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index}>
              <td>{item.dayFa}</td>
              <td>{item.count}</td>
              <td>{item.winning}</td>
              <td className={item.profit >= 0 ? 'positive' : 'negative'}>
                ${item.profit}
              </td>
              <td>{item.winRate}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default WeeklyPerformanceReport;