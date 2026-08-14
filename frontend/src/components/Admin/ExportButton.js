// frontend/src/components/Admin/ExportButton.js
import React from 'react';
import './ExportButton.css';

const ExportButton = ({
  onExport,
  label = '📊 خروجی اکسل',
  loading = false,
  disabled = false,
  className = '',
  ...props
}) => {
  return (
    <button
      className={`btn-export ${className}`}
      onClick={onExport}
      disabled={loading || disabled}
      {...props}
    >
      {loading ? (
        <span className="spinner">⏳</span>
      ) : (
        <span>{label}</span>
      )}
    </button>
  );
};

export default ExportButton;