// frontend/src/components/reports/reports/ChecklistReport.js

import React from 'react';

const ChecklistReport = ({ dateRange, selectedCategory, isDark, trades }) => {
  if (!trades || trades.length === 0) {
    return (
      <div className="report-content-inner">
        <div className="report-description">
          <h5>📖 درباره این گزارش</h5>
          <p>این گزارش میزان پایبندی شما به چک‌لیست روزانه را بررسی می‌کند. هر آیتم چک‌لیست نشان‌دهنده یک قاعده یا اصل معاملاتی است که رعایت آن می‌تواند به بهبود عملکرد شما کمک کند.</p>
          <div className="formula-box">
            <p className="formula-text"><strong>📐 فرمول محاسبه:</strong></p>
            <ul className="formula-list">
              <li><strong>درصد رعایت:</strong> (تعداد دفعات رعایت / کل تریدها) × ۱۰۰</li>
              <li><strong>سود کل آیتم:</strong> مجموع سود/زیان تمام تریدهایی که آن آیتم در آنها رعایت شده است</li>
              <li><strong>میانگین سود:</strong> سود کل آیتم / تعداد تریدهای رعایت شده</li>
              <li><strong>نرخ برد:</strong> (تعداد تریدهای برنده رعایت شده / تعداد کل تریدهای رعایت شده) × ۱۰۰</li>
              <li><strong>امتیاز کلی:</strong> میانگین درصد رعایت تمام آیتم‌ها</li>
            </ul>
          </div>
          <p className="interpretation-text"><strong>💡 نحوه تفسیر:</strong> امتیاز بالای ۷۰٪ نشان‌دهنده پایبندی خوب، ۵۰-۷۰٪ متوسط و زیر ۵۰٪ نیاز به بهبود دارد. همچنین بررسی کنید کدام آیتم‌ها بیشترین تأثیر را بر سود شما داشته‌اند.</p>
        </div>
        <div className="empty-state">
          <p>هیچ تریدی با فیلترهای انتخاب شده یافت نشد</p>
        </div>
      </div>
    );
  }

  const checklistItems = [
    { key: 'smt_confirmed', label: 'SMT تایید شد (NO SMT = NO Trade)' },
    { key: 'key_levels_reviewed', label: 'سطوح کلیدی بررسی شد' },
    { key: 'bond_dxy_support', label: 'حمایت BOND/DXY تایید شد' },
    { key: 'weekly_news_printed', label: 'اخبار هفتگی چاپ شد' },
    { key: 'zero_hour_identified', label: 'ساعت صفر (۰) مشخص شد' },
    { key: 'asian_range_identified', label: 'رنج آسیا مشخص شد' },
    { key: 'london_range_identified', label: 'رنج لندن مشخص شد' },
    { key: 'judas_lo_identified', label: 'Judas LO مشخص شد' },
  ];

  const total = trades.length;

  // محاسبه دقیق با parseFloat
  const checklistData = checklistItems.map(item => {
    const itemTrades = trades.filter(t => t[item.key] === true);
    const count = itemTrades.length;
    const percentage = total > 0 ? (count / total * 100).toFixed(1) : 0;

    // محاسبه سود برای تریدهایی که این آیتم را رعایت کرده‌اند
    const profit = itemTrades.reduce((sum, t) => sum + (parseFloat(t.profit) || 0), 0);
    const avgProfit = itemTrades.length > 0 ? profit / itemTrades.length : 0;
    const winCount = itemTrades.filter(t => parseFloat(t.profit) > 0).length;
    const winRate = itemTrades.length > 0 ? (winCount / itemTrades.length * 100).toFixed(1) : 0;

    return { ...item, count, percentage, profit, avgProfit, winCount, winRate };
  });

  // محاسبه امتیاز کلی
  const overallScore = checklistData.reduce((sum, item) => sum + parseFloat(item.percentage), 0) / checklistData.length;

  // محاسبه مجموع سود برای آیتم‌های رعایت شده
  const totalProfitAdhered = checklistData.reduce((sum, item) => sum + item.profit, 0);
  const totalProfitAdheredAvg = checklistData.length > 0 ? totalProfitAdhered / checklistData.length : 0;

  // پیدا کردن بهترین و بدترین آیتم از نظر سود
  const bestItem = checklistData.reduce((best, current) => current.profit > best.profit ? current : best, checklistData[0]);
  const worstItem = checklistData.reduce((worst, current) => current.profit < worst.profit ? current : worst, checklistData[0]);

  return (
    <div className="report-content-inner">
      <div className="report-description">
        <h5>📖 درباره این گزارش</h5>
        <p>این گزارش میزان پایبندی شما به چک‌لیست روزانه را بررسی می‌کند. هر آیتم چک‌لیست نشان‌دهنده یک قاعده یا اصل معاملاتی است که رعایت آن می‌تواند به بهبود عملکرد شما کمک کند.</p>
        <div className="formula-box">
          <p className="formula-text"><strong>📐 فرمول محاسبه:</strong></p>
          <ul className="formula-list">
            <li><strong>درصد رعایت:</strong> (تعداد دفعات رعایت / کل تریدها) × ۱۰۰</li>
            <li><strong>سود کل آیتم:</strong> مجموع سود/زیان تمام تریدهایی که آن آیتم در آنها رعایت شده است</li>
            <li><strong>میانگین سود:</strong> سود کل آیتم / تعداد تریدهای رعایت شده</li>
            <li><strong>نرخ برد:</strong> (تعداد تریدهای برنده رعایت شده / تعداد کل تریدهای رعایت شده) × ۱۰۰</li>
            <li><strong>امتیاز کلی:</strong> میانگین درصد رعایت تمام آیتم‌ها</li>
          </ul>
        </div>
        <p className="interpretation-text"><strong>💡 نحوه تفسیر:</strong> امتیاز بالای ۷۰٪ نشان‌دهنده پایبندی خوب، ۵۰-۷۰٪ متوسط و زیر ۵۰٪ نیاز به بهبود دارد. همچنین بررسی کنید کدام آیتم‌ها بیشترین تأثیر را بر سود شما داشته‌اند.</p>
      </div>

      <div className="report-summary">
        <div className="summary-item">
          <span className="summary-label">امتیاز کلی</span>
          <span className={`summary-value ${overallScore >= 70 ? 'success' : overallScore >= 50 ? 'warning' : 'danger'}`}>
            {overallScore.toFixed(1)}%
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">وضعیت</span>
          <span className={`summary-value ${overallScore >= 70 ? 'success' : overallScore >= 50 ? 'warning' : 'danger'}`}>
            {overallScore >= 70 ? '✅ خوب' : overallScore >= 50 ? '⚡ متوسط' : '❌ نیاز به بهبود'}
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">بهترین آیتم</span>
          <span className="summary-value success">{bestItem.label}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">بدترین آیتم</span>
          <span className="summary-value danger">{worstItem.label}</span>
        </div>
      </div>

      <table className="report-table">
        <thead>
          <tr>
            <th>آیتم چک‌لیست</th>
            <th>تعداد رعایت</th>
            <th>از کل تریدها</th>
            <th>درصد</th>
            <th>سود کل</th>
            <th>میانگین سود</th>
            <th>نرخ برد</th>
          </tr>
        </thead>
        <tbody>
          {checklistData.map((item, index) => (
            <tr key={index}>
              <td>{item.label}</td>
              <td>{item.count}</td>
              <td>{total}</td>
              <td>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${item.percentage}%`,
                      background: parseFloat(item.percentage) >= 70 ? '#2e7d32' :
                                 parseFloat(item.percentage) >= 50 ? '#f57f17' : '#c62828'
                    }}
                  />
                  <span className="progress-label">{item.percentage}%</span>
                </div>
              </td>
              <td className={item.profit >= 0 ? 'positive' : 'negative'}>
                ${item.profit}
              </td>
              <td className={item.avgProfit >= 0 ? 'positive' : 'negative'}>
                ${item.avgProfit.toFixed(2)}
              </td>
              <td>{item.winRate}%</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th>میانگین / مجموع</th>
            <th>-</th>
            <th>{total}</th>
            <th>{overallScore.toFixed(1)}%</th>
            <th className={totalProfitAdhered >= 0 ? 'positive' : 'negative'}>
              ${totalProfitAdhered}
            </th>
            <th className={totalProfitAdheredAvg >= 0 ? 'positive' : 'negative'}>
              ${totalProfitAdheredAvg.toFixed(2)}
            </th>
            <th>-</th>
          </tr>
        </tfoot>
      </table>

      <div className="insight-box">
        <h5>💡 تحلیل و بینش</h5>
        <ul className="insight-list">
          <li>
            <strong>وضعیت کلی:</strong>
            {overallScore >= 70 && ' ✅ پایبندی شما به چک‌لیست در سطح خوبی است. این موضوع تأثیر مثبتی بر عملکرد شما داشته است.'}
            {overallScore >= 50 && overallScore < 70 && ' ⚡ پایبندی شما به چک‌لیست در سطح متوسط است. با افزایش رعایت آیتم‌ها می‌توانید عملکرد خود را بهبود بخشید.'}
            {overallScore < 50 && ' ❌ پایبندی شما به چک‌لیست پایین است. پیشنهاد می‌کنم روی رعایت آیتم‌های چک‌لیست تمرکز بیشتری داشته باشید.'}
          </li>
          <li>
            <strong>آیتم‌های نیازمند توجه:</strong>
            {checklistData.filter(item => parseFloat(item.percentage) < 30).length > 0 ? (
              <span>
                {' '}آیتم‌های زیر کمتر از ۳۰٪ رعایت شده‌اند:
                {checklistData.filter(item => parseFloat(item.percentage) < 30).map((item, i, arr) => (
                  <span key={item.key}>
                    {item.label}
                    {i < arr.length - 2 ? '، ' : i === arr.length - 2 ? ' و ' : ''}
                  </span>
                ))}
              </span>
            ) : (
              ' 🎯 همه آیتم‌ها بالای ۳۰٪ رعایت شده‌اند.'
            )}
          </li>
          <li>
            <strong>تأثیر بر سود:</strong>
            {bestItem.profit > 0 && ` آیتم "${bestItem.label}" با سود ${bestItem.profit}$ بیشترین تأثیر مثبت را داشته است.`}
            {worstItem.profit < 0 && ` آیتم "${worstItem.label}" با زیان ${worstItem.profit}$ نیاز به بررسی بیشتری دارد.`}
          </li>
          <li>
            <strong>پیشنهاد:</strong>
            {overallScore < 70 && ' برای بهبود امتیاز خود، روی آیتم‌هایی با درصد پایین تمرکز کنید.'}
            {overallScore >= 70 && ' سطح پایبندی خود را حفظ کنید و روی بهبود کیفیت اجرا در آیتم‌های با سود کمتر متمرکز شوید.'}
          </li>
        </ul>
      </div>
    </div>
  );
};

export default ChecklistReport;