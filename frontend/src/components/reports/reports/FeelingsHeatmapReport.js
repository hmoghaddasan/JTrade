// frontend/src/components/reports/reports/FeelingsHeatmapReport.js

import React from 'react';

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
    const winning = emotionTrades.filter(t => t.profit > 0).length;
    const winRate = count > 0 ? (winning / count * 100).toFixed(1) : 0;
    const avgProfit = count > 0 ? (emotionTrades.reduce((sum, t) => sum + (t.profit || 0), 0) / count) : 0;
    return { ...emotion, count, winRate, avgProfit };
  });

  const maxCount = Math.max(...data.map(d => d.count));

  return (
    <div className="report-content-inner">
      <div className="report-description">
        <h5>📖 درباره این گزارش</h5>
        <p>این گزارش نقشه حرارتی احساسات غالب شما در طول معاملات را نمایش می‌دهد. با شناسایی احساساتی که بیشترین تأثیر را بر عملکرد شما دارند، می‌توانید روی مدیریت آنها تمرکز کنید.</p>
        <p className="formula-text"><strong>فرمول محاسبه:</strong> هر احساس بر اساس تعداد دفعات ثبت و نرخ برد مرتبط با آن، در نقشه حرارتی با اندازه و رنگ متفاوت نمایش داده می‌شود.</p>
      </div>

      <div className="heatmap-grid">
        {data.map((item, index) => (
          <div
            key={index}
            className={`heatmap-item ${item.count > 0 ? 'active' : 'inactive'}`}
            style={{
              background: item.count > 0 ?
                `hsl(${item.winRate * 1.2}, 70%, ${40 + (item.count / maxCount) * 40}%)` :
                '#e0e0e0',
              transform: item.count > 0 ? `scale(${0.7 + (item.count / maxCount) * 0.3})` : 'scale(0.7)',
              opacity: item.count > 0 ? 1 : 0.4
            }}
          >
            <div className="heatmap-name">{item.label}</div>
            <div className="heatmap-stats">
              <span>{item.count} بار</span>
              <span>{item.winRate}% برد</span>
              <span>${item.avgProfit.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="heatmap-legend">
        <span>کمتر</span>
        <div className="legend-gradient" />
        <span>بیشتر</span>
      </div>
    </div>
  );
};

export default FeelingsHeatmapReport;