// frontend/src/components/Admin/FilterBar.js
import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const FilterBar = ({ fields, onFilter, initialValues = {} }) => {
  const [values, setValues] = useState(initialValues);
  const { isDark } = useTheme();

  const handleChange = (key, value) => {
    const newValues = { ...values, [key]: value };
    setValues(newValues);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onFilter(values);
  };

  const handleReset = () => {
    setValues({});
    onFilter({});
  };

  // ✅ استایل‌های inline بر اساس تم
  const formStyle = {
    background: isDark ? '#1a1f2e' : '#fff',
    boxShadow: isDark
      ? '0 1px 4px rgba(0, 0, 0, 0.3)'
      : '0 1px 4px rgba(0, 0, 0, 0.04)',
    border: isDark ? '1px solid #2a3040' : 'none',
    color: isDark ? '#e0e0e0' : '#212529',
  };

  const labelStyle = {
    color: isDark ? '#b0b8c8' : '#495057',
    fontSize: '13px',
    fontWeight: '500',
  };

  const inputStyle = {
    background: isDark ? '#0f1419' : '#fff',
    color: isDark ? '#e0e0e0' : '#212529',
    borderColor: isDark ? '#2a3040' : '#e8ecf1',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '14px',
    minWidth: '120px',
  };

  const resetBtnStyle = {
    background: isDark ? '#2a3040' : '#f1f3f5',
    color: isDark ? '#b0b8c8' : '#495057',
    border: `1px solid ${isDark ? '#3a4050' : '#e8ecf1'}`,
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  };

  return (
    <form className="filter-bar" onSubmit={handleSubmit} style={formStyle}>
      {fields.map((field) => (
        <div className="filter-group" key={field.key}>
          <label style={labelStyle}>{field.label}</label>
          {field.type === 'text' && (
            <input
              type="text"
              value={values[field.key] || ''}
              onChange={(e) => handleChange(field.key, e.target.value)}
              placeholder={field.placeholder || ''}
              style={inputStyle}
            />
          )}
          {field.type === 'select' && (
            <select
              value={values[field.key] || ''}
              onChange={(e) => handleChange(field.key, e.target.value)}
              style={inputStyle}
            >
              {field.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
          {field.type === 'date' && (
            <input
              type="date"
              value={values[field.key] || ''}
              onChange={(e) => handleChange(field.key, e.target.value)}
              style={inputStyle}
            />
          )}
        </div>
      ))}

      <div className="filter-actions">
        <button type="submit" className="btn-filter">اعمال فیلتر</button>
        <button
          type="button"
          className="btn-reset"
          onClick={handleReset}
          style={resetBtnStyle}
        >
          حذف فیلترها
        </button>
      </div>
    </form>
  );
};

export default FilterBar;