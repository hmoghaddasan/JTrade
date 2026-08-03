// frontend/src/components/analytics/CategorySelector.js

import React from 'react';
import './CategorySelector.css';

const CATEGORY_OPTIONS = [
  { value: 'day_of_week', label: 'روز هفته' },
  { value: 'month', label: 'ماه' },
  { value: 'symbol', label: 'نماد' },
  { value: 'trade_type', label: 'نوع ترید' },
  { value: 'dominant_feeling', label: 'احساس غالب' },
  { value: 'strategy_type', label: 'نوع استراتژی' },
  { value: 'bias', label: 'بایاس' },
  { value: 'session_type', label: 'نوع جلسه' },
];

const CategorySelector = ({ value, onChange }) => {
  return (
    <div className="category-selector">
      <label className="selector-label">معیار دسته‌بندی:</label>
      <select
        className="selector-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {CATEGORY_OPTIONS.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default CategorySelector;