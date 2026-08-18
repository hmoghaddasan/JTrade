// frontend/src/components/portfolio/ComparisonSummaryCards.js

import React from 'react';
import './ComparisonSummaryCards.css';

const ComparisonSummaryCards = ({ summary }) => {
    if (!summary) return null;

    const cards = [
        {
            id: 'best',
            label: '🏆 بهترین عملکرد',
            data: summary.best,
            color: '#2e7d32',
            bg: '#e8f5e9',
            icon: '🏆',
        },
        {
            id: 'worst',
            label: '⚠️ ضعیف‌ترین عملکرد',
            data: summary.worst,
            color: '#c62828',
            bg: '#ffebee',
            icon: '⚠️',
        },
        {
            id: 'most_active',
            label: '📊 بیشترین فعالیت',
            data: summary.most_active,
            color: '#0d47a1',
            bg: '#e3f2fd',
            icon: '📊',
        },
        {
            id: 'highest_win_rate',
            label: '🎯 بالاترین نرخ برد',
            data: summary.highest_win_rate,
            color: '#e65100',
            bg: '#fff3e0',
            icon: '🎯',
        },
    ];

    return (
        <div className="comparison-summary-cards">
            {cards.map(card => (
                <div
                    key={card.id}
                    className="summary-card"
                    style={{ borderColor: card.color }}
                >
                    <div className="card-header">
                        <span className="card-icon">{card.icon}</span>
                        <span className="card-label">{card.label}</span>
                    </div>
                    {card.data ? (
                        <div className="card-content">
                            <div className="card-name">
                                <span className="name-icon">{card.data.icon || '📊'}</span>
                                <span className="name-text">{card.data.name}</span>
                            </div>
                            <div className="card-stats">
                                <div className="stat-item">
                                    <span className="stat-label">سود کل</span>
                                    <span className="stat-value" style={{ color: card.data.total_profit >= 0 ? '#2e7d32' : '#c62828' }}>
                                        ${card.data.total_profit?.toFixed(2) || '0'}
                                    </span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">نرخ برد</span>
                                    <span className="stat-value" style={{ color: card.data.win_rate >= 50 ? '#2e7d32' : '#c62828' }}>
                                        {card.data.win_rate?.toFixed(1) || '0'}%
                                    </span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">تریدها</span>
                                    <span className="stat-value">{card.data.total_trades || 0}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="card-empty">داده‌ای موجود نیست</div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default ComparisonSummaryCards;