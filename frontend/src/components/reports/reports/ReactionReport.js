// frontend/src/components/reports/reports/ReactionReport.js

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

const ReactionReport = ({ dateRange, selectedCategory, isDark, trades }) => {
  if (!trades || trades.length === 0) {
    return (
      <div className="report-content-inner">
        <div className="report-description">
          <h5>📖 درباره این گزارش</h5>
          <p>این گزارش واکنش‌های شما به سود و ضرر را تحلیل می‌کند. نحوه واکنش به نتایج معاملات می‌تواند تأثیر زیادی بر عملکرد آینده شما داشته باشد و این گزارش به شما کمک می‌کند الگوهای رفتاری خود را شناسایی کنید.</p>
          <p className="formula-text"><strong>فرمول محاسبه:</strong> برای هر نوع واکنش، میانگین سود و نرخ برد محاسبه می‌شود تا مشخص شود کدام واکنش‌ها به نتایج بهتری منجر می‌شوند.</p>
        </div>
        <div className="empty-state">
          <p>هیچ تریدی با فیلترهای انتخاب شده یافت نشد</p>
        </div>
      </div>
    );
  }

  const reactionTypes = ['محتاطانه', 'شتابزده', 'آرام', 'هیجانی'];
  const emotionTypes = ['کنترل شده', 'عصبی', 'مصمم', 'ناامید'];

  const reactionData = reactionTypes.map(reaction => {
    const reactionTrades = trades.filter(t => t.reaction_to_profit === reaction);
    const count = reactionTrades.length;
    const profit = reactionTrades.reduce((sum, t) => sum + (parseFloat(t.profit) || 0), 0);
    const winning = reactionTrades.filter(t => parseFloat(t.profit) > 0).length;
    const avgProfit = count > 0 ? profit / count : 0;
    const winRate = count > 0 ? (winning / count * 100).toFixed(1) : 0;
    return { reaction, count, profit, avgProfit, winRate };
  });

  const emotionData = emotionTypes.map(emotion => {
    const emotionTrades = trades.filter(t => t.emotion_after_losses === emotion);
    const count = emotionTrades.length;
    const nextProfit = emotionTrades.reduce((sum, t) => sum + (parseFloat(t.profit) || 0), 0);
    const avgNextProfit = count > 0 ? nextProfit / count : 0;
    return { emotion, count, nextProfit, avgNextProfit };
  });

  const chartAxisColor = isDark ? '#ccc' : '#666';

  return (
    <div className="report-content-inner">
      <div className="report-description">
        <h5>📖 درباره این گزارش</h5>
        <p>این گزارش واکنش‌های شما به سود و ضرر را تحلیل می‌کند. نحوه واکنش به نتایج معاملات می‌تواند تأثیر زیادی بر عملکرد آینده شما داشته باشد و این گزارش به شما کمک می‌کند الگوهای رفتاری خود را شناسایی کنید.</p>
        <p className="formula-text"><strong>فرمول محاسبه:</strong> برای هر نوع واکنش، میانگین سود و نرخ برد محاسبه می‌شود تا مشخص شود کدام واکنش‌ها به نتایج بهتری منجر می‌شوند.</p>
      </div>

      <h5>🎭 واکنش به سود</h5>
      {/* نمودار واکنش به سود */}
      <div className="chart-wrapper" style={{ margin: '15px 0', height: '200px' }}>
        <ExpandableChart title="نمودار واکنش به سود">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={reactionData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#444' : '#eee'} />
              <XAxis dataKey="reaction" stroke={chartAxisColor} />
              <YAxis stroke={chartAxisColor} />
              <Tooltip
                contentStyle={{ backgroundColor: isDark ? '#333' : '#fff', border: 'none', borderRadius: '8px' }}
                itemStyle={{ color: isDark ? '#fff' : '#333' }}
                formatter={(value) => [`$${value.toFixed(2)}`, 'میانگین سود']}
              />
              <Bar dataKey="avgProfit" name="میانگین سود">
                {reactionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.avgProfit >= 0 ? '#4caf50' : '#f44336'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ExpandableChart>
      </div>

      <table className="report-table">
        <thead>
          <tr>
            <th>نوع واکنش</th>
            <th>تعداد</th>
            <th>سود کل</th>
            <th>میانگین سود</th>
            <th>نرخ برد</th>
          </tr>
        </thead>
        <tbody>
          {reactionData.map((item, index) => (
            <tr key={index}>
              <td>{item.reaction}</td>
              <td>{item.count}</td>
              <td className={item.profit >= 0 ? 'positive' : 'negative'}>
                ${item.profit}
              </td>
              <td>${item.avgProfit.toFixed(2)}</td>
              <td>{item.winRate}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h5>🧠 کنترل احساسات پس از ضرر</h5>
      {/* نمودار کنترل احساسات */}
      <div className="chart-wrapper" style={{ margin: '15px 0', height: '200px' }}>
        <ExpandableChart title="نمودار کنترل احساسات پس از ضرر">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={emotionData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#444' : '#eee'} />
              <XAxis dataKey="emotion" stroke={chartAxisColor} />
              <YAxis stroke={chartAxisColor} />
              <Tooltip
                contentStyle={{ backgroundColor: isDark ? '#333' : '#fff', border: 'none', borderRadius: '8px' }}
                itemStyle={{ color: isDark ? '#fff' : '#333' }}
                formatter={(value) => [`$${value.toFixed(2)}`, 'میانگین سود ترید بعدی']}
              />
              <Bar dataKey="avgNextProfit" name="میانگین سود ترید بعدی">
                {emotionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.avgNextProfit >= 0 ? '#4caf50' : '#f44336'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ExpandableChart>
      </div>

      <table className="report-table">
        <thead>
          <tr>
            <th>وضعیت احساسی</th>
            <th>تعداد</th>
            <th>سود ترید بعدی</th>
            <th>میانگین سود</th>
          </tr>
        </thead>
        <tbody>
          {emotionData.map((item, index) => (
            <tr key={index}>
              <td>{item.emotion}</td>
              <td>{item.count}</td>
              <td className={item.nextProfit >= 0 ? 'positive' : 'negative'}>
                ${item.nextProfit}
              </td>
              <td>${item.avgNextProfit.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ReactionReport;