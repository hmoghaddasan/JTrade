// frontend/src/components/import/ImportPreview.js
import React from 'react';
import './ImportPreview.css';

const ImportPreview = ({
  headers,
  rows,
  totalRows,
  columnMapping,
  portfolios,
  groups,
  selectedPortfolio,
  selectedGroup,
  onPortfolioChange,
  onGroupChange,
  saveMapping,
  onSaveMappingChange,
  onImport,
  onBack,
  isProcessing,
}) => {
  // نمایش ۵ ردیف اول برای پیش‌نمایش
  const previewRows = rows.slice(0, 5);

  // پیدا کردن نام ستون‌ها بر اساس نگاشت
  const getColumnLabel = (field) => {
    const mapping = columnMapping[field];
    if (!mapping) return '—';
    return mapping;
  };

  return (
    <div className="import-preview">
      <div className="preview-header">
        <h2>👁️ پیش‌نمایش و تأیید</h2>
        <div className="preview-stats">
          <span>تعداد کل ردیف‌ها: <strong>{totalRows}</strong></span>
          <span>تعداد ردیف‌های نمایش داده شده: <strong>{previewRows.length}</strong></span>
        </div>
      </div>

      {/* ============================================================
          انتخاب پورتفولیو و گروه
          ============================================================ */}
      <div className="preview-settings">
        <div className="setting-group">
          <label htmlFor="portfolio-select">پورتفولیو</label>
          <select
            id="portfolio-select"
            value={selectedPortfolio || ''}
            onChange={(e) => onPortfolioChange(e.target.value ? parseInt(e.target.value) : null)}
            disabled={portfolios.length === 0}
          >
            {portfolios.length === 0 ? (
              <option value="">هیچ پورتفولیویی یافت نشد</option>
            ) : (
              portfolios.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.icon || '📊'} {p.name} {p.is_default ? '(پیش‌فرض)' : ''}
                </option>
              ))
            )}
          </select>
          {portfolios.length === 0 && (
            <span className="hint-text">⚠️ لطفاً ابتدا یک پورتفولیو ایجاد کنید</span>
          )}
        </div>

        <div className="setting-group">
          <label htmlFor="group-select">گروه <span className="required">*</span></label>
          <select
            id="group-select"
            value={selectedGroup || ''}
            onChange={(e) => onGroupChange(e.target.value ? parseInt(e.target.value) : null)}
            disabled={groups.length === 0}
            required
          >
            {groups.length === 0 ? (
              <option value="">هیچ گروهی یافت نشد</option>
            ) : (
              groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.icon || '📁'} {g.group_name} {g.is_default ? '(پیش‌فرض)' : ''}
                </option>
              ))
            )}
          </select>
          {groups.length === 0 && (
            <span className="hint-text error">⚠️ برای ادامه، حداقل یک گروه ایجاد کنید</span>
          )}
          <span className="hint-text">* گروه برای تریدها الزامی است</span>
        </div>
      </div>

      {/* ============================================================
          ذخیره نگاشت
          ============================================================ */}
      <div className="preview-save-mapping">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={saveMapping}
            onChange={(e) => onSaveMappingChange(e.target.checked)}
          />
          ذخیره نگاشت ستون‌ها برای استفاده بعدی
        </label>
      </div>

      {/* ============================================================
          جدول پیش‌نمایش
          ============================================================ */}
      <div className="preview-table-wrapper">
        <table className="preview-table">
          <thead>
            <tr>
              {headers.map((header, index) => (
                <th key={index}>
                  <div className="header-cell">
                    <span className="header-name">{header}</span>
                    <span className="header-mapping">
                      {Object.entries(columnMapping).find(([_, h]) => h === header)?.[0] || '—'}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewRows.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="empty-row">
                  هیچ داده‌ای برای نمایش وجود ندارد
                </td>
              </tr>
            ) : (
              previewRows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {headers.map((header, colIndex) => (
                    <td key={colIndex}>{row[header] || '—'}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
        {totalRows > 5 && (
          <div className="preview-more">
            ... و {totalRows - 5} ردیف دیگر
          </div>
        )}
      </div>

      {/* ============================================================
          دکمه‌های اقدام
          ============================================================ */}
      <div className="preview-actions">
        <button className="btn-secondary" onClick={onBack} disabled={isProcessing}>
          ↩️ بازگشت
        </button>
        <button
          className="btn-primary"
          onClick={onImport}
          disabled={
            isProcessing ||
            portfolios.length === 0 ||
            groups.length === 0 ||
            !selectedGroup
          }
        >
          {isProcessing ? '⏳ در حال پردازش...' : '✅ وارد کردن تریدها'}
        </button>
      </div>

      {/* ============================================================
          پیام‌های راهنما
          ============================================================ */}
      {(portfolios.length === 0 || groups.length === 0 || !selectedGroup) && (
        <div className="preview-warning">
          {portfolios.length === 0 && (
            <p>⚠️ برای ادامه، ابتدا یک پورتفولیو ایجاد کنید.</p>
          )}
          {groups.length === 0 && (
            <p>⚠️ برای ادامه، ابتدا یک گروه ایجاد کنید.</p>
          )}
          {groups.length > 0 && !selectedGroup && (
            <p>⚠️ لطفاً یک گروه برای تریدها انتخاب کنید.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ImportPreview;