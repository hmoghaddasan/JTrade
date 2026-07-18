// frontend/src/components/reports/reports/ChecklistReport.js

import React from 'react';

const ChecklistReport = ({ dateRange, selectedCategory, isDark, trades }) => {
  if (!trades || trades.length === 0) {
    return (
      <div className="report-content-inner">
        <div className="report-description">
          <h5>📖 درباره این گزارش</h5>
          <p>این گزارش میزان پایبندی شما به چک‌لیست روزانه را بررسی می‌کند. هر آیتم چک‌لیست نشان‌دهنده یک قاعده یا اصل معاملاتی است که رعایت آن می‌تواند به بهبود عملکرد شما کمک کند.</p>
          <p className="formula-text"><strong>فرمول محاسبه:</strong> درصد رعایت = (تعداد دفعات رعایت / کل تریدها) × ۱۰۰ | امتیاز کلی = میانگین درصد رعایت تمام آیتم‌ها</p>
        </div>
        <div className="empty-state">
          <p>هیچ تریدی با فیلترهای انتخاب شده یافت نشد</p>
        </div>
      </div>
    );
  }

  const checklistItems = [
    { key: 'smt_confirmed', label: 'SMT تایید شد' },
    { key: 'key_levels_reviewed', label: 'سطوح کلیدی بررسی شد' },
    { key: 'bond_dxy_support', label: 'حمایت BOND/DXY' },
    { key: 'weekly_news_printed', label: 'اخبار هفتگی چاپ شد' },
    { key: 'zero_hour_identified', label: 'ساعت صفر مشخص شد' },
    { key: 'asian_range_identified', label: 'رنج آسیا مشخص شد' },
    { key: 'london_range_identified', label: 'رنج لندن مشخص شد' },
    { key: 'judas_lo_identified', label: 'Judas LO مشخص شد' },
  ];

  const total = trades.length;
  const checklistData = checklistItems.map(item => {
    const count = trades.filter(t => t[item.key] === true).length;
    const percentage = (count / total * 100).toFixed(1);
    return { ...item, count, percentage };
  });

  const overallScore = checklistData.reduce((sum, item) => sum + parseFloat(item.percentage), 0) / checklistData.length;

  return (
    <div className="report-content-inner">
      <div className="report-description">
        <h5>📖 درباره این گزارش</h5>
        <p>این گزارش میزان پایبندی شما به چک‌لیست روزانه را بررسی می‌کند. هر آیتم چک‌لیست نشان‌دهنده یک قاعده یا اصل معاملاتی است که رعایت آن می‌تواند به بهبود عملکرد شما کمک کند.</p>
        <p className="formula-text"><strong>فرمول محاسبه:</strong> درصد رعایت = (تعداد دفعات رعایت / کل تریدها) × ۱۰۰ | امتیاز کلی = میانگین درصد رعایت تمام آیتم‌ها</p>
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
            {overallScore >= 70 ? '✅ خوب' : overallScore >= 50 ? '⚡ متوسط' : '❌ ضعیف'}
          </span>
        </div>
      </div>

      <table className="report-table">
        <thead>
          <tr>
            <th>آیتم چک‌لیست</th>
            <th>تعداد رعایت</th>
            <th>از کل تریدها</th>
            <th>درصد</th>
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
                      background: item.percentage >= 70 ? '#2e7d32' :
                                 item.percentage >= 50 ? '#f57f17' : '#c62828'
                    }}
                  />
                  <span className="progress-label">{item.percentage}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ChecklistReport;