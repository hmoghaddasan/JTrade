// frontend/src/components/portfolio/ComparisonTable.js

import React, { useState } from 'react';
import './ComparisonTable.css';

const ComparisonTable = ({ data }) => {
    const [sortBy, setSortBy] = useState('total_profit');
    const [sortOrder, setSortOrder] = useState('desc');

    if (!data || data.length === 0) {
        return (
            <div className="comparison-table-empty">
                <span>📭</span>
                <p>هیچ داده‌ای برای نمایش وجود ندارد</p>
            </div>
        );
    }

    const handleSort = (field) => {
        if (sortBy === field) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('desc');
        }
    };

    const sortedData = [...data].sort((a, b) => {
        const aVal = a[sortBy] || 0;
        const bVal = b[sortBy] || 0;
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    const columns = [
        { key: 'name', label: 'نام پورتفولیو', sortable: true },
        { key: 'total_trades', label: 'تریدها', sortable: true },
        { key: 'win_rate', label: 'نرخ برد', sortable: true, format: (v) => `${v?.toFixed(1) || 0}%` },
        { key: 'total_profit', label: 'سود کل', sortable: true, format: (v) => `$${v?.toFixed(2) || '0'}` },
        { key: 'profit_factor', label: 'فاکتور سود', sortable: true, format: (v) => v?.toFixed(2) || '0' },
        { key: 'avg_rr', label: 'میانگین R:R', sortable: true, format: (v) => v?.toFixed(2) || '0' },
        { key: 'max_drawdown', label: 'حداکثر افت', sortable: true, format: (v) => `${v?.toFixed(1) || 0}%` },
        { key: 'expectancy', label: 'امید ریاضی', sortable: true, format: (v) => `$${v?.toFixed(2) || '0'}` },
    ];

    const getSortIcon = (key) => {
        if (sortBy !== key) return '↕';
        return sortOrder === 'asc' ? '↑' : '↓';
    };

    const getValueColor = (key, value) => {
        if (key === 'total_profit') return value >= 0 ? 'positive' : 'negative';
        if (key === 'win_rate') return value >= 50 ? 'positive' : 'negative';
        if (key === 'profit_factor') return value >= 1.5 ? 'positive' : value >= 1 ? 'warning' : 'negative';
        if (key === 'max_drawdown') return value < 10 ? 'positive' : value < 25 ? 'warning' : 'negative';
        if (key === 'expectancy') return value >= 0 ? 'positive' : 'negative';
        return '';
    };

    const getRowClass = (item) => {
        if (item.is_default) return 'row-default';
        return '';
    };

    return (
        <div className="comparison-table-container">
            <div className="table-header">
                <span className="table-title">📊 جدول مقایسه کامل</span>
                <span className="table-count">{data.length} پورتفولیو</span>
            </div>
            <div className="table-wrapper">
                <table className="comparison-table">
                    <thead>
                        <tr>
                            {columns.map(col => (
                                <th
                                    key={col.key}
                                    className={col.sortable ? 'sortable' : ''}
                                    onClick={() => col.sortable && handleSort(col.key)}
                                >
                                    {col.label}
                                    {col.sortable && <span className="sort-icon">{getSortIcon(col.key)}</span>}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedData.map((item, index) => (
                            <tr key={item.id || index} className={getRowClass(item)}>
                                <td className="col-name">
                                    <span className="name-icon">{item.icon || '📊'}</span>
                                    <span className="name-text">{item.name}</span>
                                    {item.is_default && <span className="badge-default">پیش‌فرض</span>}
                                </td>
                                {columns.slice(1).map(col => {
                                    const value = item[col.key];
                                    const formatted = col.format ? col.format(value) : value;
                                    const colorClass = getValueColor(col.key, value);
                                    return (
                                        <td key={col.key} className={`col-${col.key} ${colorClass}`}>
                                            {formatted}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="table-footer">
                <span className="footer-hint">💡 برای مرتب‌سازی روی هر ستون کلیک کنید</span>
            </div>
        </div>
    );
};

export default ComparisonTable;