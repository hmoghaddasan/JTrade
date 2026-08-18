// frontend/src/components/reports/reports/RiskRewardReport.js

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

const RiskRewardReport = ({ dateRange, selectedCategory, isDark, trades }) => {
  if (!trades || trades.length === 0) {
    return (
      <div className="report-content-inner">
        <div className="report-description">
          <h5>📖 درباره این گزارش</h5>
          <p>این گزارش تأثیر نسبت ریسک به ریوارد (R:R) را بر سود نهایی شما بررسی می‌کند. با دسته‌بندی تریدها بر اساس محدوده R:R، می‌توانید ببینید کدام محدوده بیشترین سودآوری را داشته است.</p>
          <div className="formula-box">
            <p className="formula-text"><strong>📐 فرمول محاسبه:</strong></p>
            <ul className="formula-list">
              <li><strong>نسبت R:R:</strong> (قیمت هدف - قیمت ورود) / (قیمت ورود - حد ضرر)</li>
              <li><strong>سود کل هر محدوده:</strong> مجموع سود/زیان تمام تریدهای آن محدوده</li>
              <li><strong>نرخ برد:</strong> (تعداد تریدهای برنده / کل تریدهای آن محدوده) × ۱۰۰</li>
              <li><strong>میانگین سود:</strong> سود کل / تعداد تریدهای آن محدوده</li>
            </ul>
          </div>
          <p className="interpretation-text"><strong>💡 نحوه تفسیر:</strong> محدوده‌های R:R بالاتر معمولاً سود بیشتری دارند اما ممکن است نرخ برد کمتری داشته باشند. تعادل مناسب بین R:R و نرخ برد کلید موفقیت است.</p>
        </div>
        <div className="empty-state">
          <p>هیچ تریدی با فیلترهای انتخاب شده یافت نشد</p>
        </div>
      </div>
    );
  }

  const rrRanges = [
    { min: 0, max: 1, label: '0-1' },
    { min: 1, max: 2, label: '1-2' },
    { min: 2, max: 3, label: '2-3' },
    { min: 3, max: 5, label: '3-5' },
    { min: 5, max: Infinity, label: '5+' },
  ];

  const data = rrRanges.map(range => {
    const rangeTrades = trades.filter(t => {
      const rr = parseFloat(t.risk_reward_ratio) || 0;
      return rr >= range.min && rr < range.max;
    });
    const count = rangeTrades.length;
    const winning = rangeTrades.filter(t => parseFloat(t.profit) > 0).length;
    const profit = rangeTrades.reduce((sum, t) => sum + (parseFloat(t.profit) || 0), 0);
    const avgProfit = count > 0 ? profit / count : 0;
    const winRate = count > 0 ? (winning / count * 100).toFixed(1) : 0;
    return { ...range, count, winning, profit, avgProfit, winRate };
  });

  const totalTrades = data.reduce((sum, item) => sum + item.count, 0);
  const totalProfit = data.reduce((sum, item) => sum + item.profit, 0);
  const bestRange = data.reduce((best, current) => current.profit > best.profit ? current : best, data[0]);
  const bestWinRateRange = data.reduce((best, current) => parseFloat(current.winRate) > parseFloat(best.winRate) ? current : best, data[0]);

  const chartAxisColor = isDark ? '#ccc' : '#666';

  return (
    <div className="report-content-inner">
      <div className="report-description">
        <h5>📖 درباره این گزارش</h5>
        <p>این گزارش تأثیر نسبت ریسک به ریوارد (R:R) را بر سود نهایی شما بررسی می‌کند. با دسته‌بندی تریدها بر اساس محدوده R:R، می‌توانید ببینید کدام محدوده بیشترین سودآوری را داشته است.</p>
        <div className="formula-box">
          <p className="formula-text"><strong>📐 فرمول محاسبه:</strong></p>
          <ul className="formula-list">
            <li><strong>نسبت R:R:</strong> (قیمت هدف - قیمت ورود) / (قیمت ورود - حد ضرر)</li>
            <li><strong>سود کل هر محدوده:</strong> مجموع سود/زیان تمام تریدهای آن محدوده</li>
            <li><strong>نرخ برد:</strong> (تعداد تریدهای برنده / کل تریدهای آن محدوده) × ۱۰۰</li>
            <li><strong>میانگین سود:</strong> سود کل / تعداد تریدهای آن محدوده</li>
          </ul>
        </div>
        <p className="interpretation-text"><strong>💡 نحوه تفسیر:</strong> محدوده‌های R:R بالاتر معمولاً سود بیشتری دارند اما ممکن است نرخ برد کمتری داشته باشند. تعادل مناسب بین R:R و نرخ برد کلید موفقیت است.</p>
      </div>

      <div className="report-summary">
        <div className="summary-item">
          <span className="summary-label">کل سود</span>
          <span className={`summary-value ${totalProfit >= 0 ? 'success' : 'danger'}`}>
            ${totalProfit}
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">بهترین محدوده R:R</span>
          <span className="summary-value success">{bestRange.label}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">بیشترین نرخ برد</span>
          <span className="summary-value">{bestWinRateRange.label} ({bestWinRateRange.winRate}%)</span>
        </div>
      </div>

      {/* بخش نمودار */}
      <div className="chart-wrapper" style={{ margin: '20px 0', height: '250px' }}>
        <h6 style={{ color: isDark ? '#eee' : '#333' }}>سود کل در هر محدوده R:R</h6>
        <ExpandableChart title="نمودار سود کل بر اساس محدوده R:R">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#444' : '#eee'} />
              <XAxis dataKey="label" stroke={chartAxisColor} />
              <YAxis stroke={chartAxisColor} />
              <Tooltip
                contentStyle={{ backgroundColor: isDark ? '#333' : '#fff', border: 'none', borderRadius: '8px' }}
                itemStyle={{ color: isDark ? '#fff' : '#333' }}
                formatter={(value) => [`$${value}`, 'سود کل']}
              />
              <Bar dataKey="profit" name="سود کل">
                {data.map((entry, index) => (
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
            <th>محدوده R:R</th>
            <th>تعداد ترید</th>
            <th>برنده</th>
            <th>نرخ برد</th>
            <th>سود کل</th>
            <th>میانگین سود</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index}>
              <td><span className="rr-badge">{item.label}</span></td>
              <td>{item.count}</td>
              <td>{item.winning}</td>
              <td>{item.winRate}%</td>
              <td className={item.profit >= 0 ? 'positive' : 'negative'}>
                ${item.profit}
              </td>
              <td>${item.avgProfit.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th>مجموع</th>
            <th>{totalTrades}</th>
            <th>-</th>
            <th>-</th>
            <th className={totalProfit >= 0 ? 'positive' : 'negative'}>
              ${totalProfit}
            </th>
            <th>-</th>
          </tr>
        </tfoot>
      </table>

      <div className="insight-box">
        <h5>💡 تحلیل و بینش</h5>
        <ul className="insight-list">
          <li>
            <strong>بهترین محدوده R:R:</strong>
            {bestRange.count > 0 && ` محدوده ${bestRange.label} با سود ${bestRange.profit}$ و نرخ برد ${bestRange.winRate}% بهترین عملکرد را داشته است.`}
          </li>
          <li>
            <strong>تعادل R:R و نرخ برد:</strong>
            {bestRange.count > 0 && bestRange.winRate >= 50 && ' نسبت R:R و نرخ برد در بهترین محدوده متعادل است.'}
            {bestRange.count > 0 && bestRange.winRate < 50 && ' نرخ برد در بهترین محدوده پایین است. شاید بهتر باشد محدوده‌ای با نرخ برد بالاتر انتخاب کنید.'}
          </li>
          <li>
            <strong>پیشنهاد:</strong>
            {totalProfit >= 0 && ' با توجه به سود کلی، استراتژی R:R شما مؤثر است. سعی کنید محدوده‌های با سود بالاتر را بیشتر استفاده کنید.'}
            {totalProfit < 0 && ' برای بهبود عملکرد، روی محدوده‌های R:R با سود مثبت تمرکز کنید و محدوده‌های ضررده را کاهش دهید.'}
          </li>
        </ul>
      </div>
    </div>
  );
};

export default RiskRewardReport;