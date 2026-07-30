// frontend/src/components/reports/reports/SleepNutritionReport.js

import React from 'react';

const SleepNutritionReport = ({ dateRange, selectedCategory, isDark, trades }) => {
  if (!trades || trades.length === 0) {
    return (
      <div className="report-content-inner">
        <div className="report-description">
          <h5>📖 درباره این گزارش</h5>
          <p>این گزارش تأثیر کیفیت خواب و تغذیه را بر عملکرد معاملاتی شما بررسی می‌کند. تحقیقات نشان داده است که خواب کافی و تغذیه مناسب می‌تواند تأثیر قابل توجهی بر تصمیم‌گیری و کنترل هیجانات داشته باشد.</p>
          <p className="formula-text"><strong>فرمول محاسبه:</strong> برای هر دسته (خواب/تغذیه)، میانگین سود و نرخ برد محاسبه می‌شود تا تأثیر هر عامل بر عملکرد مشخص شود.</p>
        </div>
        <div className="empty-state">
          <p>هیچ تریدی با فیلترهای انتخاب شده یافت نشد</p>
        </div>
      </div>
    );
  }

  // ✅ اصلاح: استفاده از parseFloat برای جمع عددی
  const sleepData = [
    { quality: 'خوب', trades: trades.filter(t => t.sleep_quality === 'خوب') },
    { quality: 'متوسط', trades: trades.filter(t => t.sleep_quality === 'متوسط') },
    { quality: 'بد', trades: trades.filter(t => t.sleep_quality === 'بد') }
  ].map(item => {
    const count = item.trades.length;
    const profit = item.trades.reduce((sum, t) => sum + (parseFloat(t.profit) || 0), 0);
    const winning = item.trades.filter(t => parseFloat(t.profit) > 0).length;
    const winRate = count > 0 ? (winning / count * 100).toFixed(1) : 0;
    return { ...item, count, profit, winning, winRate };
  });

  // ✅ اصلاح: استفاده از parseFloat برای جمع عددی
  const nutritionData = [
    { status: 'مناسب', trades: trades.filter(t => t.food_status === true) },
    { status: 'نامناسب', trades: trades.filter(t => t.food_status === false) }
  ].map(item => {
    const count = item.trades.length;
    const profit = item.trades.reduce((sum, t) => sum + (parseFloat(t.profit) || 0), 0);
    const winning = item.trades.filter(t => parseFloat(t.profit) > 0).length;
    const winRate = count > 0 ? (winning / count * 100).toFixed(1) : 0;
    return { ...item, count, profit, winning, winRate };
  });

  return (
    <div className="report-content-inner">
      <div className="report-description">
        <h5>📖 درباره این گزارش</h5>
        <p>این گزارش تأثیر کیفیت خواب و تغذیه را بر عملکرد معاملاتی شما بررسی می‌کند. تحقیقات نشان داده است که خواب کافی و تغذیه مناسب می‌تواند تأثیر قابل توجهی بر تصمیم‌گیری و کنترل هیجانات داشته باشد.</p>
        <p className="formula-text"><strong>فرمول محاسبه:</strong> برای هر دسته (خواب/تغذیه)، میانگین سود و نرخ برد محاسبه می‌شود تا تأثیر هر عامل بر عملکرد مشخص شود.</p>
      </div>

      <h5>😴 کیفیت خواب</h5>
      <table className="report-table">
        <thead>
          <tr>
            <th>کیفیت خواب</th>
            <th>تعداد ترید</th>
            <th>برنده</th>
            <th>سود کل</th>
            <th>نرخ برد</th>
          </tr>
        </thead>
        <tbody>
          {sleepData.map((item, index) => (
            <tr key={index}>
              <td>{item.quality}</td>
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

      <h5>🍽️ وضعیت تغذیه</h5>
      <table className="report-table">
        <thead>
          <tr>
            <th>تغذیه</th>
            <th>تعداد ترید</th>
            <th>برنده</th>
            <th>سود کل</th>
            <th>نرخ برد</th>
          </tr>
        </thead>
        <tbody>
          {nutritionData.map((item, index) => (
            <tr key={index}>
              <td>{item.status}</td>
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

export default SleepNutritionReport;