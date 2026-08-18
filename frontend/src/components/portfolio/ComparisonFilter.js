// frontend/src/components/portfolio/ComparisonFilter.js

import React, { useState } from 'react';
import './ComparisonFilter.css';

const ComparisonFilter = ({ onFilterChange, initialFilter }) => {
    const [filter, setFilter] = useState({
        startDate: initialFilter?.startDate || '',
        endDate: initialFilter?.endDate || '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFilter(prev => ({ ...prev, [name]: value }));
    };

    const handleApply = () => {
        onFilterChange(filter);
    };

    const handleReset = () => {
        const resetFilter = { startDate: '', endDate: '' };
        setFilter(resetFilter);
        onFilterChange(resetFilter);
    };

    return (
        <div className="comparison-filter">
            <div className="filter-row">
                <div className="filter-group">
                    <label className="filter-label">📅 از تاریخ</label>
                    <input
                        type="date"
                        name="startDate"
                        value={filter.startDate}
                        onChange={handleChange}
                        className="filter-input"
                        max={filter.endDate || undefined}
                    />
                </div>
                <div className="filter-group">
                    <label className="filter-label">📅 تا تاریخ</label>
                    <input
                        type="date"
                        name="endDate"
                        value={filter.endDate}
                        onChange={handleChange}
                        className="filter-input"
                        min={filter.startDate || undefined}
                        max={new Date().toISOString().split('T')[0]}
                    />
                </div>
                <div className="filter-actions">
                    <button className="btn-filter-apply" onClick={handleApply}>
                        🔍 اعمال
                    </button>
                    <button className="btn-filter-reset" onClick={handleReset}>
                        ↩️ بازنشانی
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ComparisonFilter;