// frontend/src/components/reports/reports/PnLReport.js

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

const PnLReport = ({ dateRange, selectedCategory, isDark, trades }) => {
  if (!trades || trades.length === 0) {
    return (
      <div className="report-content-inner">
        <div className="report-description">
          <h5>📖 درباره این گزارش</h5>
          <p>این گزارش عملکرد مالی شما را بر اساس هر نماد معاملاتی نمایش می‌دهد. با استفاده از این گزارش می‌توانید ببینید کدام نمادها بیشترین سود و کدام‌یک بیشترین ضرر را برای شما داشته‌اند.</p>
          <div className="formula-box">
            <p className="formula-text"><strong>📐 فرمول محاسبه:</strong></p>
            <ul className="formula-list">
              <li><strong>سود کل نماد:</strong> مجموع سود/زیان تمام تریدهای آن نماد</li>
              <li><strong>نرخ برد:</strong> (تعداد تریدهای برنده / کل تریدهای آن نماد) × ۱۰۰</li>
              <li><strong>میانگین سود:</strong> سود کل / تعداد تریدهای آن نماد</li>
              <li><strong>نسبت سود به ضرر:</strong> سود کل / مجموع ضررهای آن نماد</li>
            </ul>
          </div>
          <p className="interpretation-text"><strong>💡 نحوه تفسیر:</strong> نمادهایی با سود بالا و نرخ برد مناسب، گزینه‌های بهتری برای معامله هستند. نمادهایی با ضرر بالا ممکن است نیاز به تغییر استراتژی یا اجتناب داشته باشند.</p>
        </div>
        <div className="empty-state">
          <p>هیچ تریدی با فیلترهای انتخاب شده یافت نشد</p>
        </div>
      </div>
    );
  }

  const symbols = [...new Set(trades.map(t => t.symbol))];
  const data = symbols.map(symbol => {
    const symbolTrades = trades.filter(t => t.symbol === symbol);
    const total = symbolTrades.length;
    const winning = symbolTrades.filter(t => parseFloat(t.profit) > 0).length;
    const losing = symbolTrades.filter(t => parseFloat(t.profit) < 0).length;
    const profit = symbolTrades.reduce((sum, t) => sum + (parseFloat(t.profit) || 0), 0);
    const loss = symbolTrades.reduce((sum, t) => sum + (parseFloat(t.profit) < 0 ? Math.abs(parseFloat(t.profit)) : 0), 0);
    const winRate = total > 0 ? (winning / total * 100).toFixed(1) : 0;
    const avgProfit = total > 0 ? profit / total : 0;
    const profitFactor = loss > 0 ? profit / loss : (profit > 0 ? Infinity : 0);
    return { symbol, trades: total, winning, losing, profit, loss, winRate, avgProfit, profitFactor };
  });

  data.sort((a, b) => b.profit - a.profit);

  const totalProfit = data.reduce((sum, item) => sum + item.profit, 0);
  const totalTrades = data.reduce((sum, item) => sum + item.trades, 0);
  const totalWinning = data.reduce((sum, item) => sum + item.winning, 0);
  const totalLoss = data.reduce((sum, item) => sum + item.loss, 0);
  const overallWinRate = totalTrades > 0 ? (totalWinning / totalTrades * 100).toFixed(1) : 0;
  const overallProfitFactor = totalLoss > 0 ? totalProfit / totalLoss : (totalProfit > 0 ? Infinity : 0);

  const bestSymbol = data.length > 0 ? data[0] : null;
  const worstSymbol = data.length > 0 ? data[data.length - 1] : null;

  const chartAxisColor = isDark ? '#ccc' : '#666';

  return (
    <div className="report-content-inner">
      <div className="report-description">
        <h5>📖 درباره این گزارش</h5>
        <p>این گزارش عملکرد مالی شما را بر اساس هر نماد معاملاتی نمایش می‌دهد. با استفاده از این گزارش می‌توانید ببینید کدام نمادها بیشترین سود و کدام‌یک بیشترین ضرر را برای شما داشته‌اند.</p>
        <div className="formula-box">
          <p className="formula-text"><strong>📐 فرمول محاسبه:</strong></p>
          <ul className="formula-list">
            <li><strong>سود کل نماد:</strong> مجموع سود/زیان تمام تریدهای آن نماد</li>
            <li><strong>نرخ برد:</strong> (تعداد تریدهای برنده / کل تریدهای آن نماد) × ۱۰۰</li>
            <li><strong>میانگین سود:</strong> سود کل / تعداد تریدهای آن نماد</li>
            <li><strong>نسبت سود به ضرر:</strong> سود کل / مجموع ضررهای آن نماد</li>
          </ul>
        </div>
        <p className="interpretation-text"><strong>💡 نحوه تفسیر:</strong> نمادهایی با سود بالا و نرخ برد مناسب، گزینه‌های بهتری برای معامله هستند. نمادهایی با ضرر بالا ممکن است نیاز به تغییر استراتژی یا اجتناب داشته باشند.</p>
      </div>

      <div className="report-summary">
        <div className="summary-item">
          <span className="summary-label">کل سود</span>
          <span className={`summary-value ${totalProfit >= 0 ? 'success' : 'danger'}`}>
            ${totalProfit}
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">بهترین نماد</span>
          <span className="summary-value success">
            {bestSymbol ? `${bestSymbol.symbol} (+${bestSymbol.profit})` : '-'}
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">بدترین نماد</span>
          <span className="summary-value danger">
            {worstSymbol ? `${worstSymbol.symbol} (${worstSymbol.profit})` : '-'}
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">نسبت سود به ضرر</span>
          <span className={`summary-value ${overallProfitFactor >= 1 ? 'success' : 'danger'}`}>
            {overallProfitFactor === Infinity ? '∞' : overallProfitFactor.toFixed(2)}
          </span>
        </div>
      </div>

      {/* بخش نمودار */}
      <div className="chart-wrapper" style={{ margin: '20px 0', height: '300px' }}>
        <h6 style={{ color: isDark ? '#eee' : '#333' }}>سود/زیان هر نماد</h6>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#444' : '#eee'} />
            <XAxis dataKey="symbol" stroke={chartAxisColor} />
            <YAxis stroke={chartAxisColor} />
            <Tooltip
              contentStyle={{ backgroundColor: isDark ? '#333' : '#fff', border: 'none', borderRadius: '8px' }}
              itemStyle={{ color: isDark ? '#fff' : '#333' }}
              formatter={(value) => [`$${value}`, 'سود/زیان']}
            />
            <Bar dataKey="profit" name="سود/زیان">
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#4caf50' : '#f44336'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <table className="report-table">
        <thead>
          <tr>
            <th>نماد</th>
            <th>تعداد ترید</th>
            <th>برنده</th>
            <th>بازنده</th>
            <th>نرخ برد</th>
            <th>سود کل</th>
            <th>نسبت سود/ضرر</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index}>
              <td><strong>{item.symbol}</strong></td>
              <td>{item.trades}</td>
              <td>{item.winning}</td>
              <td>{item.losing}</td>
              <td>{item.winRate}%</td>
              <td className={item.profit >= 0 ? 'positive' : 'negative'}>
                ${item.profit}
              </td>
              <td>{item.profitFactor === Infinity ? '∞' : item.profitFactor.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th>مجموع</th>
            <th>{totalTrades}</th>
            <th>{totalWinning}</th>
            <th>{totalTrades - totalWinning}</th>
            <th>{overallWinRate}%</th>
            <th className={totalProfit >= 0 ? 'positive' : 'negative'}>
              ${totalProfit}
            </th>
            <th>{overallProfitFactor === Infinity ? '∞' : overallProfitFactor.toFixed(2)}</th>
          </tr>
        </tfoot>
      </table>

      <div className="insight-box">
        <h5>💡 تحلیل و بینش</h5>
        <ul className="insight-list">
          <li>
            <strong>عملکرد کلی:</strong>
            {totalProfit >= 0 && ` ✅ شما در مجموع ${totalProfit}$ سود داشته‌اید.`}
            {totalProfit < 0 && ` ❌ شما در مجموع ${Math.abs(totalProfit)}$ ضرر داشته‌اید.`}
          </li>
          <li>
            <strong>بهترین نماد:</strong>
            {bestSymbol && ` ${bestSymbol.symbol} با سود ${bestSymbol.profit}$ و نرخ برد ${bestSymbol.winRate}% بهترین عملکرد را داشته است.`}
          </li>
          <li>
            <strong>نمادهای نیازمند توجه:</strong>
            {data.filter(d => d.profit < 0).length > 0 && (
              <span>
                {' '}نمادهای زیر عملکرد منفی داشته‌اند:
                {data.filter(d => d.profit < 0).map((d, i, arr) => (
                  <span key={d.symbol}>
                    {d.symbol} (${d.profit})
                    {i < arr.length - 2 ? '، ' : i === arr.length - 2 ? ' و ' : ''}
                  </span>
                ))}
              </span>
            )}
          </li>
          <li>
            <strong>پیشنهاد:</strong>
            {totalProfit < 0 && ' برای بهبود عملکرد، روی نمادهایی با سود مثبت تمرکز کنید و از نمادهای پرضرر دوری کنید.'}
            {totalProfit >= 0 && data.some(d => d.profit < 0) && ' با وجود سود کلی، برخی نمادها ضررده هستند. بهتر است استراتژی خود را برای آنها بازبینی کنید.'}
            {totalProfit >= 0 && data.every(d => d.profit >= 0) && ' 🎯 عملکرد شما در همه نمادها مثبت است! این را حفظ کنید.'}
          </li>
        </ul>
      </div>
    </div>
  );
};

export default PnLReport;