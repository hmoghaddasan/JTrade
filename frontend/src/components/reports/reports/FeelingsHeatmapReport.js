// frontend/src/components/reports/reports/FeelingsHeatmapReport.js

import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import ExpandableChart from '../../common/ExpandableChart';

const FeelingsHeatmapReport = ({ dateRange, selectedCategory, isDark, trades }) => {
  if (!trades || trades.length === 0) {
    return (
      <div className="report-content-inner">
        <div className="report-description">
          <h5>📖 درباره این گزارش</h5>
          <p>این گزارش نقشه حرارتی احساسات غالب شما در طول معاملات را نمایش می‌دهد. با شناسایی احساساتی که بیشترین تأثیر را بر عملکرد شما دارند، می‌توانید روی مدیریت آنها تمرکز کنید.</p>
          <p className="formula-text"><strong>فرمول محاسبه:</strong> هر احساس بر اساس تعداد دفعات ثبت و نرخ برد مرتبط با آن، در نقشه حرارتی با اندازه و رنگ متفاوت نمایش داده می‌شود.</p>
        </div>
        <div className="empty-state">
          <p>هیچ تریدی با فیلترهای انتخاب شده یافت نشد</p>
        </div>
      </div>
    );
  }

  const emotions = [
    { key: 'focus', label: 'تمرکز' },
    { key: 'calm', label: 'آرامش' },
    { key: 'excited', label: 'هیجان' },
    { key: 'fear', label: 'ترس' },
    { key: 'greed', label: 'طمع' },
    { key: 'relaxed', label: 'ریلکس' },
    { key: 'happy', label: 'خوشحال' },
    { key: 'sad', label: 'غمگین' },
    { key: 'energetic', label: 'پرانرژی' },
    { key: 'tired', label: 'خسته' },
    { key: 'fomo', label: 'FOMO' },
    { key: 'patience', label: 'صبر' },
    { key: 'contentment', label: 'قناعت' }
  ];

  const data = emotions.map(emotion => {
    const emotionTrades = trades.filter(t => t[emotion.key] === true);
    const count = emotionTrades.length;
    const winning = emotionTrades.filter(t => parseFloat(t.profit) > 0).length;
    const winRate = count > 0 ? (winning / count * 100).toFixed(1) : 0;
    const avgProfit = count > 0 ? (emotionTrades.reduce((sum, t) => sum + (parseFloat(t.profit) || 0), 0) / count) : 0;
    return { ...emotion, count, winRate, avgProfit };
  });

  const maxCount = Math.max(...data.map(d => d.count));
  // رنگ‌های برای پای چارت
  const COLORS = isDark ? ['#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c', '#d0ed57', '#ffc658', '#ff8042'] : ['#4caf50', '#2196f3', '#ff9800', '#f44336', '#9c27b0', '#3f51b5', '#009688', '#ffeb3b'];

  // داده برای پای چارت (۵ احساس برتر)
  const topEmotions = [...data].sort((a, b) => b.count - a.count).slice(0, 5);

  return (
    <div className="report-content-inner">
      <div className="report-description">
        <h5>📖 درباره این گزارش</h5>
        <p>این گزارش نقشه حرارتی احساسات غالب شما در طول معاملات را نمایش می‌دهد. با شناسایی احساساتی که بیشترین تأثیر را بر عملکرد شما دارند، می‌توانید روی مدیریت آنها تمرکز کنید.</p>
        <p className="formula-text"><strong>فرمول محاسبه:</strong> هر احساس بر اساس تعداد دفعات ثبت و نرخ برد مرتبط با آن، در نقشه حرارتی با اندازه و رنگ متفاوت نمایش داده می‌شود.</p>
      </div>

      {/* بخش نمودار پای برای احساسات برتر */}
      <div className="chart-wrapper" style={{ margin: '20px 0', height: '250px' }}>
        <h6 style={{ color: isDark ? '#eee' : '#333' }}>۵ احساس پرتکرار</h6>
        <ExpandableChart title="نمودار احساسات پرتکرار">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={topEmotions} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius="80%">
                {topEmotions.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: isDark ? '#333' : '#fff', border: 'none', borderRadius: '8px' }}
                itemStyle={{ color: isDark ? '#fff' : '#333' }}
                formatter={(value, name, props) => [`${value} بار`, `${props.payload.label} (نرخ برد: ${props.payload.winRate}%)`]}
              />
              <Legend verticalAlign="bottom" height={36} formatter={(value) => <span style={{ color: isDark ? '#fff' : '#333' }}>{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </ExpandableChart>
      </div>

      {/* نقشه حرارتی ارتقا یافته با CSS Grid */}
      <div className="heatmap-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '15px', margin: '20px 0' }}>
        {data.map((item, index) => (
          <div
            key={index}
            className={`heatmap-item ${item.count > 0 ? 'active' : 'inactive'}`}
            style={{
              background: item.count > 0 ?
                `hsl(${parseFloat(item.winRate) * 1.2}, 70%, ${40 + (item.count / maxCount) * 40}%)` :
                (isDark ? '#2a2a2a' : '#e0e0e0'),
              transform: item.count > 0 ? `scale(${0.8 + (item.count / maxCount) * 0.2})` : 'scale(0.8)',
              opacity: item.count > 0 ? 1 : 0.4,
              padding: '10px',
              borderRadius: '8px',
              textAlign: 'center',
              color: '#fff',
              transition: 'all 0.3s ease',
              boxShadow: isDark ? '0 0 10px rgba(0,0,0,0.5)' : '0 2px 5px rgba(0,0,0,0.1)'
            }}
          >
            <div className="heatmap-name" style={{ fontWeight: 'bold', fontSize: '1.1em' }}>{item.label}</div>
            <div className="heatmap-stats" style={{ fontSize: '0.8em', marginTop: '5px' }}>
              <div>{item.count} بار</div>
              <div>{item.winRate}% برد</div>
              <div>${item.avgProfit.toFixed(2)}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="heatmap-legend" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', margin: '10px 0' }}>
        <span style={{ color: isDark ? '#ccc' : '#666' }}>کمتر</span>
        <div className="legend-gradient" style={{
          width: '100px',
          height: '15px',
          background: 'linear-gradient(to right, hsl(0, 70%, 40%), hsl(120, 70%, 80%))',
          borderRadius: '8px'
        }} />
        <span style={{ color: isDark ? '#ccc' : '#666' }}>بیشتر</span>
      </div>
    </div>
  );
};

export default FeelingsHeatmapReport;