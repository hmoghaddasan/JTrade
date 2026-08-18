// frontend/src/components/reports/MetricsFilter.js

import React, { useState } from 'react';
import './MetricsFilter.css';

const MetricsFilter = ({ filter, onFilterChange, portfolios }) => {
  const [localFilter, setLocalFilter] = useState({
    portfolioId: filter.portfolioId || '',
    startDate: filter.startDate || '',
    endDate: filter.endDate || '',
  });

  // ============================================
  // اعمال فیلتر
  // ============================================
  const handleApply = () => {
    onFilterChange(localFilter);
  };

  // ============================================
  // بازنشانی فیلتر
  // ============================================
  const handleReset = () => {
    const resetFilter = {
      portfolioId: '',
      startDate: '',
      endDate: '',
    };
    setLocalFilter(resetFilter);
    onFilterChange(resetFilter);
  };

  // ============================================
  // تغییر فیلد
  // ============================================
  const handleChange = (field, value) => {
    setLocalFilter(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // ============================================
  // دریافت نام پورتفولیو
  // ============================================
  const getPortfolioName = (id) => {
    if (!id) return 'همه پورتفولیوها';
    const p = portfolios.find(p => p.id === parseInt(id));
    return p ? p.name : 'نامشخص';
  };

  return (
    <div className="metrics-filter">
      <div className="filter-row">
        {/* ===== انتخاب پورتفولیو ===== */}
        <div className="filter-group">
          <label className="filter-label">پورتفولیو</label>
          <select
            className="filter-select"
            value={localFilter.portfolioId || ''}
            onChange={(e) => handleChange('portfolioId', e.target.value)}
          >
            <option value="">همه پورتفولیوها</option>
            {portfolios.map(p => (
              <option key={p.id} value={p.id}>
                {p.icon || '📊'} {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* ===== تاریخ شروع ===== */}
        <div className="filter-group">
          <label className="filter-label">از تاریخ</label>
          <input
            type="date"
            className="filter-input"
            value={localFilter.startDate || ''}
            onChange={(e) => handleChange('startDate', e.target.value)}
            max={localFilter.endDate || undefined}
          />
        </div>

        {/* ===== تاریخ پایان ===== */}
        <div className="filter-group">
          <label className="filter-label">تا تاریخ</label>
          <input
            type="date"
            className="filter-input"
            value={localFilter.endDate || ''}
            onChange={(e) => handleChange('endDate', e.target.value)}
            min={localFilter.startDate || undefined}
            max={new Date().toISOString().split('T')[0]}
          />
        </div>

        {/* ===== دکمه‌ها ===== */}
        <div className="filter-actions">
          <button className="btn-filter-apply" onClick={handleApply}>
            🔍 اعمال
          </button>
          <button className="btn-filter-reset" onClick={handleReset}>
            ↩️ بازنشانی
          </button>
        </div>
      </div>

      {/* ===== نمایش فیلترهای فعال ===== */}
      {(localFilter.portfolioId || localFilter.startDate || localFilter.endDate) && (
        <div className="filter-active">
          <span className="active-label">فیلترهای فعال:</span>
          {localFilter.portfolioId && (
            <span className="active-tag">
              📂 {getPortfolioName(localFilter.portfolioId)}
            </span>
          )}
          {localFilter.startDate && (
            <span className="active-tag">
              📅 از {localFilter.startDate}
            </span>
          )}
          {localFilter.endDate && (
            <span className="active-tag">
              📅 تا {localFilter.endDate}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default MetricsFilter;