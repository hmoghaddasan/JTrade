// frontend/src/components/analytics/AnalyticsFilters.js

import React from 'react';
import CategorySelector from './CategorySelector';
import './AnalyticsFilters.css';

const AnalyticsFilters = ({ filters, onFilterChange, onCategoryChange }) => {
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    onFilterChange({ [name]: value });
  };

  const clearFilters = () => {
    onFilterChange({
      date_from: '',
      date_to: '',
      symbol: '',
      trade_type: '',
      status: '',
    });
  };

  return (
    <div className="analytics-filters">
      <div className="filters-row">
        <CategorySelector
          value={filters.category_by}
          onChange={onCategoryChange}
        />
      </div>

      <div className="filters-row">
        <div className="filter-group">
          <label>از تاریخ</label>
          <input
            type="date"
            name="date_from"
            value={filters.date_from}
            onChange={handleInputChange}
            className="filter-input"
          />
        </div>
        <div className="filter-group">
          <label>تا تاریخ</label>
          <input
            type="date"
            name="date_to"
            value={filters.date_to}
            onChange={handleInputChange}
            className="filter-input"
          />
        </div>
        <div className="filter-group">
          <label>نماد</label>
          <input
            type="text"
            name="symbol"
            placeholder="مثلاً EURUSD"
            value={filters.symbol}
            onChange={handleInputChange}
            className="filter-input"
          />
        </div>
        <div className="filter-group">
          <label>نوع ترید</label>
          <select
            name="trade_type"
            value={filters.trade_type}
            onChange={handleInputChange}
            className="filter-select"
          >
            <option value="">همه</option>
            <option value="Buy">خرید</option>
            <option value="Sell">فروش</option>
          </select>
        </div>
        <div className="filter-group">
          <label>وضعیت</label>
          <select
            name="status"
            value={filters.status}
            onChange={handleInputChange}
            className="filter-select"
          >
            <option value="">همه</option>
            <option value="win">✅ سود</option>
            <option value="loss">❌ زیان</option>
            <option value="breakeven">⚖️ مساوی</option>
          </select>
        </div>
        <button className="btn-clear-filters" onClick={clearFilters}>
          🗑️ پاک کردن فیلترها
        </button>
      </div>
    </div>
  );
};

export default AnalyticsFilters;