// frontend/src/components/analytics/KPICards.js

import React from 'react';
import './KPICards.css';

const KPICards = ({ summary }) => {
  const cards = [
    {
      icon: '📊',
      label: 'کل تریدها',
      value: summary.total_trades,
      color: '#1a237e',
    },
    {
      icon: '🎯',
      label: 'نرخ برد',
      value: `${summary.win_rate}%`,
      color: '#2e7d32',
    },
    {
      icon: '💰',
      label: 'سود کل',
      value: `$${summary.total_profit.toFixed(2)}`,
      color: summary.total_profit >= 0 ? '#2e7d32' : '#c62828',
    },
    {
      icon: '📈',
      label: 'فاکتور سود',
      value: summary.profit_factor.toFixed(2),
      color: '#f57c00',
    },
    {
      icon: '⚖️',
      label: 'میانگین R:R',
      value: summary.avg_rr.toFixed(2),
      color: '#6a1b9a',
    },
    {
      icon: '⭐',
      label: 'کیفیت اجرا',
      value: summary.avg_quality.toFixed(1),
      color: '#00838f',
    },
  ];

  return (
    <div className="kpi-cards">
      {cards.map((card, index) => (
        <div key={index} className="kpi-card">
          <div className="kpi-icon">{card.icon}</div>
          <div className="kpi-info">
            <span className="kpi-label">{card.label}</span>
            <span className="kpi-value" style={{ color: card.color }}>
              {card.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default KPICards;