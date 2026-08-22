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

  // فیلدهای نگاشت‌شده
  const mappedFields = Object.keys(columnMapping);

  return (
    <div className="import-preview">
      <h2>👁️ پیش‌نمایش و تأیید</h2>
      <div className="preview-stats">
        <span>📄 {totalRows} ردیف در فایل</span>
        <span>🔗 {mappedFields.length} ستون نگاشت‌شده</span>
      </div>

      <div className="preview-table-wrapper">
        <table className="preview-table">
          <thead>
            <tr>
              {headers.slice(0, 10).map((h, i) => (
                <th key={i}>{h}</th>
              ))}
              {headers.length > 10 && <th>...</th>}
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row, idx) => (
              <tr key={idx}>
                {headers.slice(0, 10).map((h, i) => (
                  <td key={i}>{row[h] || '-'}</td>
                ))}
                {headers.length > 10 && <td>...</td>}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > 5 && (
          <div className="preview-more">... و {rows.length - 5} ردیف دیگر</div>
        )}
      </div>

      <div className="preview-settings">
        <div className="setting-group">
          <label>پورتفولیو (اختیاری)</label>
          <select
            value={selectedPortfolio || ''}
            onChange={(e) => onPortfolioChange(e.target.value || null)}
          >
            <option value="">— بدون پورتفولیو —</option>
            {portfolios.map((p) => (
              <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
            ))}
          </select>
        </div>
        <div className="setting-group">
          <label>گروه پیش‌فرض (اختیاری)</label>
          <select
            value={selectedGroup || ''}
            onChange={(e) => onGroupChange(e.target.value || null)}
          >
            <option value="">— بدون گروه —</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.icon} {g.group_name}</option>
            ))}
          </select>
        </div>
        <div className="setting-group checkbox">
          <label>
            <input
              type="checkbox"
              checked={saveMapping}
              onChange={(e) => onSaveMappingChange(e.target.checked)}
            />
            ذخیره نگاشت برای استفاده‌های بعدی
          </label>
        </div>
      </div>

      <div className="preview-actions">
        <button className="btn-secondary" onClick={onBack}>← بازگشت</button>
        <button
          className="btn-primary"
          onClick={onImport}
          disabled={isProcessing}
        >
          {isProcessing ? '⏳ در حال وارد کردن...' : '📥 شروع Import'}
        </button>
      </div>
    </div>
  );
};

export default ImportPreview;