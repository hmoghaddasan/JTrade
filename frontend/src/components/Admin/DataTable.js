// frontend/src/components/Admin/DataTable.js

import React, { useState, useMemo } from 'react';
import './DataTable.css';

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

  // ✅ استفاده از useMemo برای جلوگیری از محاسبات اضافی
  const dataArray = useMemo(() => {
    if (Array.isArray(data)) return data;
    if (data?.results) return data.results;
    if (data?.data) return data.data;
    if (data && typeof data === 'object') {
      // اگر شیء است و کلیدهای عددی دارد
      const values = Object.values(data);
      if (values.length > 0 && Array.isArray(values[0])) {
        return values[0];
      }
      // اگر لیست کلید-مقدار است
      return Object.entries(data).map(([key, value]) => ({
        id: key,
        name: key,
        value: value,
        ...(typeof value === 'object' ? value : { value })
      }));
    }
    return [];
  }, [data]);

  // ✅ محاسبه totalItems
  const totalItems = useMemo(() => {
    if (total) return total;
    if (data?.count) return data.count;
    return dataArray.length;
  }, [total, data, dataArray]);

  const handleSort = (field) => {
    if (!onSort) {
      // اگر onSort وجود ندارد، مرتب‌سازی داخلی انجام بده
      const order = sortField === field && sortOrder === 'asc' ? 'desc' : 'asc';
      setSortField(field);
      setSortOrder(order);
    } else {
      onSort(field, sortField === field && sortOrder === 'asc' ? 'desc' : 'asc');
    }
  };

  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  // ============================================
  // نمایش لودینگ
  // ============================================
  if (loading) {
    return (
      <div className="data-table-container">
        <div className="loading-spinner">در حال بارگذاری...</div>
      </div>
    );
  }

  // ============================================
  // نمایش پیام خالی
  // ============================================
  if (!dataArray || dataArray.length === 0) {
    return (
      <div className="data-table-container">
        <div className="empty-message">{emptyMessage}</div>
      </div>
    );
  }

  // ============================================
  // رندر اصلی جدول
  // ============================================
  return (
    <div className="data-table-container">
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && handleSort(col.key)}
                  style={{ cursor: col.sortable ? 'pointer' : 'default' }}
                >
                  {col.label}
                  {col.sortable && sortField === col.key && (
                    <span className="sort-icon">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
              ))}
              {actions && actions.length > 0 && <th>عملیات</th>}
            </tr>
          </thead>
          <tbody>
            {dataArray.map((row, index) => (
              <tr
                key={row.id || index}
                onClick={() => onRowClick && onRowClick(row)}
                style={{ cursor: onRowClick ? 'pointer' : 'default' }}
              >
                {columns.map((col) => {
                  const value = row[col.key];
                  return (
                    <td key={col.key}>
                      {col.render ? col.render(value, row) : (value ?? '—')}
                    </td>
                  );
                })}
                {actions && actions.length > 0 && (
                  <td className="actions-cell">
                    {actions.map((action, i) => (
                      <button
                        key={i}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (action.onClick) action.onClick(row);
                        }}
                        className={`action-btn ${action.className || ''}`}
                        title={action.label}
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

      {/* ============================================ */}
      {/* صفحه‌بندی */}
      {/* ============================================ */}
      {totalPages > 1 && onPageChange && (
        <div className="table-pagination">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="pagination-btn"
          >
            قبلی
          </button>
          <span className="pagination-info">
            صفحه {page} از {totalPages}
          </span>
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="pagination-btn"
          >
            بعدی
          </button>
        </div>
      )}
    </div>
  );
};

export default DataTable;