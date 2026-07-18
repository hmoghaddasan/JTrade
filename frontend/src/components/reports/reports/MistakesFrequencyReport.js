// frontend/src/components/reports/reports/MistakesFrequencyReport.js

import React from 'react';

const MistakesFrequencyReport = ({ dateRange, selectedCategory, isDark, trades }) => {
  if (!trades || trades.length === 0) {
    return (
      <div className="report-content-inner">
        <div className="report-description">
          <h5>📖 درباره این گزارش</h5>
          <p>این گزارش فراوانی و تأثیر اشتباهات معاملاتی شما را نشان می‌دهد. با شناسایی پرتکرارترین اشتباهات و تأثیر آنها بر عملکرد، می‌توانید روی رفع آنها متمرکز شوید.</p>
          <p className="formula-text"><strong>فرمول محاسبه:</strong> وزن اشتباه = میانگین وزنی که به هر اشتباه اختصاص داده شده است (از ۰.۱ تا ۰.۹) | تأثیر = بر اساس وزن، اشتباهات به بالا، متوسط و پایین دسته‌بندی می‌شوند.</p>
        </div>
        <div className="empty-state">
          <p>هیچ تریدی با فیلترهای انتخاب شده یافت نشد</p>
        </div>
      </div>
    );
  }

  const mistakeMap = {};
  trades.forEach(t => {
    if (t.mistake_code && t.mistake_code.trim() !== '') {
      if (!mistakeMap[t.mistake_code]) {
        mistakeMap[t.mistake_code] = { code: t.mistake_code, count: 0, totalWeight: 0, trades: [] };
      }
      mistakeMap[t.mistake_code].count += 1;
      mistakeMap[t.mistake_code].totalWeight += parseFloat(t.mistake_weight) || 0;
      mistakeMap[t.mistake_code].trades.push({
        symbol: t.symbol,
        date: t.trade_date,
        profit: t.profit || 0
      });
    }
  });

  const mistakes = Object.values(mistakeMap).map(item => ({
    ...item,
    avgWeight: item.count > 0 ? (item.totalWeight / item.count).toFixed(2) : 0,
    impact: item.count > 0 && (item.totalWeight / item.count) >= 0.7 ? 'high' :
            item.count > 0 && (item.totalWeight / item.count) >= 0.4 ? 'medium' : 'low'
  }));

  const totalMistakes = mistakes.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="report-content-inner">
      <div className="report-description">
        <h5>📖 درباره این گزارش</h5>
        <p>این گزارش فراوانی و تأثیر اشتباهات معاملاتی شما را نشان می‌دهد. با شناسایی پرتکرارترین اشتباهات و تأثیر آنها بر عملکرد، می‌توانید روی رفع آنها متمرکز شوید.</p>
        <p className="formula-text"><strong>فرمول محاسبه:</strong> وزن اشتباه = میانگین وزنی که به هر اشتباه اختصاص داده شده است (از ۰.۱ تا ۰.۹) | تأثیر = بر اساس وزن، اشتباهات به بالا، متوسط و پایین دسته‌بندی می‌شوند.</p>
      </div>

      <div className="report-summary">
        <div className="summary-item">
          <span className="summary-label">کل اشتباهات</span>
          <span className="summary-value danger">{totalMistakes} مورد</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">تعداد نوع اشتباه</span>
          <span className="summary-value">{mistakes.length} نوع</span>
        </div>
      </div>

      {mistakes.length > 0 ? (
        <table className="report-table">
          <thead>
            <tr>
              <th>کد اشتباه</th>
              <th>تعداد تکرار</th>
              <th>وزن متوسط</th>
              <th>تأثیر</th>
            </tr>
          </thead>
          <tbody>
            {mistakes.map((item, index) => (
              <tr key={index}>
                <td>❌ {item.code}</td>
                <td>{item.count}</td>
                <td>{item.avgWeight}</td>
                <td>
                  <span className={`impact-badge ${item.impact}`}>
                    {item.impact === 'high' ? '🔴 بالا' :
                     item.impact === 'medium' ? '🟡 متوسط' : '🟢 پایین'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="empty-state">
          <p>✅ هیچ اشتباهی ثبت نشده است! عالی!</p>
        </div>
      )}
    </div>
  );
};

export default MistakesFrequencyReport;