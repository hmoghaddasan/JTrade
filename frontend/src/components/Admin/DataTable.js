// frontend/src/components/Admin/DataTable.js

import React, { useState, useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import './DataTable.css';
import LoadingBar from '../common/LoadingBar';

const DataTable = ({
  columns,
  data,
  loading,
  total,
  page,
  pageSize,
  onPageChange,
  onSort,
  onRowClick,
  actions,
  emptyMessage = 'هیچ داده‌ای یافت نشد',
}) => {
  const [sortField, setSortField] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const { isDark } = useTheme();

  const dataArray = useMemo(() => {
    if (Array.isArray(data)) return data;
    if (data?.results) return data.results;
    if (data?.data) return data.data;
    if (data && typeof data === 'object') {
      const values = Object.values(data);
      if (values.length > 0 && Array.isArray(values[0])) {
        return values[0];
      }
      return Object.entries(data).map(([key, value]) => ({
        id: key,
        name: key,
        value: value,
        ...(typeof value === 'object' ? value : { value })
      }));
    }
    return [];
  }, [data]);

  const totalItems = useMemo(() => {
    if (total) return total;
    if (data?.count) return data.count;
    return dataArray.length;
  }, [total, data, dataArray]);

  const handleSort = (field) => {
    if (!onSort) {
      const order = sortField === field && sortOrder === 'asc' ? 'desc' : 'asc';
      setSortField(field);
      setSortOrder(order);
    } else {
      onSort(field, sortField === field && sortOrder === 'asc' ? 'desc' : 'asc');
    }
  };

  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  // ============================================
  // ✅ استایل‌های inline بر اساس تم
  // ============================================
  const containerStyle = {
    background: isDark ? '#1a1f2e' : '#fff',
    boxShadow: isDark
      ? '0 1px 4px rgba(0, 0, 0, 0.3)'
      : '0 1px 4px rgba(0, 0, 0, 0.04)',
    color: isDark ? '#e0e0e0' : '#212529',
  };

  const theadStyle = {
    background: isDark ? '#151a26' : '#f8f9fa',
    borderBottom: `2px solid ${isDark ? '#2a3040' : '#e8ecf1'}`,
  };

  const thStyle = {
    color: isDark ? '#b0b8c8' : '#495057',
  };

  const tdStyle = {
    color: isDark ? '#e0e0e0' : '#212529',
    borderBottom: `1px solid ${isDark ? '#2a3040' : '#f1f3f5'}`,
  };

  const emptyStyle = {
    color: isDark ? '#888' : '#868e96',
  };

  const paginationStyle = {
    borderTop: `1px solid ${isDark ? '#2a3040' : '#e8ecf1'}`,
  };

  const paginationBtnStyle = {
    background: isDark ? '#1a1f2e' : '#fff',
    color: isDark ? '#b0b8c8' : '#495057',
    border: `1px solid ${isDark ? '#2a3040' : '#e8ecf1'}`,
  };

  const paginationSpanStyle = {
    color: isDark ? '#b0b8c8' : '#495057',
  };

  // هندلر هاور ردیف
  const handleRowMouseEnter = (e) => {
    e.currentTarget.style.background = isDark ? '#1f2535' : '#f8f9fa';
  };
  const handleRowMouseLeave = (e) => {
    e.currentTarget.style.background = 'transparent';
  };

  const handleActionBtnMouseEnter = (e, className) => {
    if (isDark) {
      if (className?.includes('danger')) {
        e.currentTarget.style.background = '#4a1f1f';
        e.currentTarget.style.color = '#ff8888';
      } else if (className?.includes('success')) {
        e.currentTarget.style.background = '#1f4a2f';
        e.currentTarget.style.color = '#81c784';
      } else {
        e.currentTarget.style.background = '#3a4050';
        e.currentTarget.style.color = '#e0e0e0';
      }
    } else {
      if (className?.includes('danger')) {
        e.currentTarget.style.background = '#fee';
        e.currentTarget.style.color = '#dc3545';
      } else if (className?.includes('success')) {
        e.currentTarget.style.background = '#e6f9ee';
        e.currentTarget.style.color = '#28a745';
      } else {
        e.currentTarget.style.background = '#f1f3f5';
      }
    }
  };

  const handleActionBtnMouseLeave = (e) => {
    e.currentTarget.style.background = isDark ? '#2a3040' : 'transparent';
    e.currentTarget.style.color = isDark ? '#b0b8c8' : '#495057';
  };

  // ============================================
  // نمایش لودینگ
  // ============================================
  if (loading) {
    return (
      <div className="data-table-container" style={containerStyle}>
        <LoadingBar text="در حال بارگذاری..." />
      </div>
    );
  }

  // ============================================
  // نمایش پیام خالی
  // ============================================
  if (!dataArray || dataArray.length === 0) {
    return (
      <div className="data-table-container" style={containerStyle}>
        <div className="empty-message" style={emptyStyle}>{emptyMessage}</div>
      </div>
    );
  }

  // ============================================
  // رندر اصلی جدول
  // ============================================
  return (
    <div className="data-table-container" style={containerStyle}>
      <div className="table-wrapper">
        <table className="data-table">
          <thead style={theadStyle}>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && handleSort(col.key)}
                  style={{ cursor: col.sortable ? 'pointer' : 'default', ...thStyle }}
                >
                  {col.label}
                  {col.sortable && sortField === col.key && (
                    <span className="sort-icon">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
              ))}
              {actions && actions.length > 0 && <th style={thStyle}>عملیات</th>}
            </tr>
          </thead>
          <tbody>
            {dataArray.map((row, index) => (
              <tr
                key={row.id || index}
                onClick={() => onRowClick && onRowClick(row)}
                onMouseEnter={handleRowMouseEnter}
                onMouseLeave={handleRowMouseLeave}
                style={{ cursor: onRowClick ? 'pointer' : 'default' }}
              >
                {columns.map((col) => {
                  const value = row[col.key];
                  return (
                    <td key={col.key} style={tdStyle}>
                      {col.render ? col.render(value, row) : (value ?? '—')}
                    </td>
                  );
                })}
                {actions && actions.length > 0 && (
                  <td className="actions-cell" style={tdStyle}>
                    {actions.map((action, i) => (
                      <button
                        key={i}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (action.onClick) action.onClick(row);
                        }}
                        onMouseEnter={(e) => handleActionBtnMouseEnter(e, action.className)}
                        onMouseLeave={handleActionBtnMouseLeave}
                        className={`action-btn ${action.className || ''}`}
                        title={action.label}
                        style={{
                          background: isDark ? '#2a3040' : 'transparent',
                          color: isDark ? '#b0b8c8' : '#495057',
                          border: `1px solid ${isDark ? '#3a4050' : '#e8ecf1'}`,
                        }}
                      >
                        {action.icon} {action.label}
                      </button>
                    ))}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* صفحه‌بندی */}
      {totalPages > 1 && onPageChange && (
        <div className="table-pagination" style={paginationStyle}>
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="pagination-btn"
            style={paginationBtnStyle}
          >
            قبلی
          </button>
          <span className="pagination-info" style={paginationSpanStyle}>
            صفحه {page} از {totalPages}
          </span>
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="pagination-btn"
            style={paginationBtnStyle}
          >
            بعدی
          </button>
        </div>
      )}
    </div>
  );
};

export default DataTable;