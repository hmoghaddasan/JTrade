// frontend/src/components/reports/reports/WeeklyPerformanceReport.js

import React from 'react';

const WeeklyPerformanceReport = ({ dateRange, selectedCategory, isDark, trades }) => {
  if (!trades || trades.length === 0) {
    return (
      <div className="report-content-inner">
        <div className="report-description">
          <h5>📖 درباره این گزارش</h5>
          <p>این گزارش کارایی شما را در روزهای مختلف هفته نشان می‌دهد. با تحلیل این داده‌ها می‌توانید متوجه شوید کدام روزهای هفته برای شما سودآورتر هستند و برنامه‌ریزی بهتری داشته باشید.</p>
          <div className="formula-box">
            <p className="formula-text"><strong>📐 فرمول محاسبه:</strong></p>
            <ul className="formula-list">
              <li><strong>سود روز:</strong> مجموع سود/زیان تمام تریدهای آن روز</li>
              <li><strong>نرخ برد روز:</strong> (تعداد تریدهای برنده در آن روز / کل تریدهای آن روز) × ۱۰۰</li>
              <li><strong>میانگین سود روز:</strong> سود روز / تعداد تریدهای آن روز</li>
            </ul>
          </div>
          <p className="interpretation-text"><strong>💡 نحوه تفسیر:</strong> روزهایی با سود بالا و نرخ برد مناسب، بهترین زمان برای معامله هستند. روزهایی با عملکرد ضعیف ممکن است نیاز به استراحت یا تغییر استراتژی داشته باشند.</p>
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

  const data = days.map(day => {
    const dayTrades = trades.filter(t => t.day_of_week === day);
    const count = dayTrades.length;
    const winning = dayTrades.filter(t => parseFloat(t.profit) > 0).length;
    const profit = dayTrades.reduce((sum, t) => sum + (parseFloat(t.profit) || 0), 0);
    const avgProfit = count > 0 ? profit / count : 0;
    const winRate = count > 0 ? (winning / count * 100).toFixed(1) : 0;
    return { day, dayFa: dayNamesFa[day] || day, count, winning, profit, avgProfit, winRate };
  });

  const bestDay = [...data].sort((a, b) => b.profit - a.profit)[0];
  const worstDay = [...data].sort((a, b) => a.profit - b.profit)[0];
  const bestWinRateDay = [...data].sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate))[0];

  return (
    <div className="report-content-inner">
      <div className="report-description">
        <h5>📖 درباره این گزارش</h5>
        <p>این گزارش کارایی شما را در روزهای مختلف هفته نشان می‌دهد. با تحلیل این داده‌ها می‌توانید متوجه شوید کدام روزهای هفته برای شما سودآورتر هستند و برنامه‌ریزی بهتری داشته باشید.</p>
        <div className="formula-box">
          <p className="formula-text"><strong>📐 فرمول محاسبه:</strong></p>
          <ul className="formula-list">
            <li><strong>سود روز:</strong> مجموع سود/زیان تمام تریدهای آن روز</li>
            <li><strong>نرخ برد روز:</strong> (تعداد تریدهای برنده در آن روز / کل تریدهای آن روز) × ۱۰۰</li>
            <li><strong>میانگین سود روز:</strong> سود روز / تعداد تریدهای آن روز</li>
          </ul>
        </div>
        <p className="interpretation-text"><strong>💡 نحوه تفسیر:</strong> روزهایی با سود بالا و نرخ برد مناسب، بهترین زمان برای معامله هستند. روزهایی با عملکرد ضعیف ممکن است نیاز به استراحت یا تغییر استراتژی داشته باشند.</p>
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
        <div className="summary-item">
          <span className="summary-label">بیشترین نرخ برد</span>
          <span className="summary-value">
            {bestWinRateDay?.dayFa} ({bestWinRateDay?.winRate || 0}%)
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
            <th>میانگین سود</th>
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
              <td>${item.avgProfit.toFixed(2)}</td>
              <td>{item.winRate}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="insight-box">
        <h5>💡 تحلیل و بینش</h5>
        <ul className="insight-list">
          <li>
            <strong>بهترین روز معاملاتی:</strong>
            {bestDay.count > 0 && ` ${bestDay.dayFa} با سود ${bestDay.profit}$ و نرخ برد ${bestDay.winRate}% بهترین روز شماست.`}
          </li>
          <li>
            <strong>روزهای نیازمند توجه:</strong>
            {data.filter(d => parseFloat(d.profit) < 0).length > 0 && (
              <span>
                {' '}روزهای زیر عملکرد منفی داشته‌اند:
                {data.filter(d => parseFloat(d.profit) < 0).map((d, i, arr) => (
                  <span key={d.day}>
                    {d.dayFa} (${d.profit})
                    {i < arr.length - 2 ? '، ' : i === arr.length - 2 ? ' و ' : ''}
                  </span>
                ))}
              </span>
            )}
          </li>
          <li>
            <strong>پیشنهاد:</strong>
            {bestDay.count > 0 && bestDay.profit > 0 && ` سعی کنید در روزهای ${bestDay.dayFa} بیشتر معامله کنید.`}
            {worstDay.count > 0 && worstDay.profit < 0 && ` در روزهای ${worstDay.dayFa} محتاط‌تر باشید یا از معامله خودداری کنید.`}
            {data.some(d => d.count === 0) && ' برخی روزها هیچ تریدی نداشته‌اند. شاید بهتر باشد این روزها را استراحت کنید.'}
          </li>
        </ul>
      </div>
    </div>
  );
};

export default WeeklyPerformanceReport;