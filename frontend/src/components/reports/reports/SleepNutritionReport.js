// frontend/src/components/reports/reports/SleepNutritionReport.js

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import ExpandableChart from '../../common/ExpandableChart';

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

  const chartAxisColor = isDark ? '#ccc' : '#666';

  return (
    <div className="report-content-inner">
      <div className="report-description">
        <h5>📖 درباره این گزارش</h5>
        <p>این گزارش تأثیر کیفیت خواب و تغذیه را بر عملکرد معاملاتی شما بررسی می‌کند. تحقیقات نشان داده است که خواب کافی و تغذیه مناسب می‌تواند تأثیر قابل توجهی بر تصمیم‌گیری و کنترل هیجانات داشته باشد.</p>
        <p className="formula-text"><strong>فرمول محاسبه:</strong> برای هر دسته (خواب/تغذیه)، میانگین سود و نرخ برد محاسبه می‌شود تا تأثیر هر عامل بر عملکرد مشخص شود.</p>
      </div>

      <h5>😴 کیفیت خواب</h5>
      {/* نمودار خواب */}
      <div className="chart-wrapper" style={{ margin: '15px 0', height: '200px' }}>
        <ExpandableChart title="نمودار تأثیر کیفیت خواب بر سود">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sleepData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#444' : '#eee'} />
              <XAxis dataKey="quality" stroke={chartAxisColor} />
              <YAxis stroke={chartAxisColor} />
              <Tooltip
                contentStyle={{ backgroundColor: isDark ? '#333' : '#fff', border: 'none', borderRadius: '8px' }}
                itemStyle={{ color: isDark ? '#fff' : '#333' }}
                formatter={(value) => [`$${value}`, 'سود کل']}
              />
              <Bar dataKey="profit" name="سود کل">
                {sleepData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#4caf50' : '#f44336'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ExpandableChart>
      </div>

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
      {/* نمودار تغذیه */}
      <div className="chart-wrapper" style={{ margin: '15px 0', height: '200px' }}>
        <ExpandableChart title="نمودار تأثیر تغذیه بر سود">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={nutritionData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#444' : '#eee'} />
              <XAxis dataKey="status" stroke={chartAxisColor} />
              <YAxis stroke={chartAxisColor} />
              <Tooltip
                contentStyle={{ backgroundColor: isDark ? '#333' : '#fff', border: 'none', borderRadius: '8px' }}
                itemStyle={{ color: isDark ? '#fff' : '#333' }}
                formatter={(value) => [`$${value}`, 'سود کل']}
              />
              <Bar dataKey="profit" name="سود کل">
                {nutritionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#4caf50' : '#f44336'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ExpandableChart>
      </div>

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