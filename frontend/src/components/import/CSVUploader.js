// frontend/src/components/import/CSVUploader.js
import React, { useRef, useState } from 'react';
import './CSVUploader.css';

const CSVUploader = ({ onUpload, isProcessing }) => {
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onUpload(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      onUpload(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  return (
    <div
      className={`csv-uploader ${dragOver ? 'drag-over' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <div className="upload-icon">📂</div>
      <h2>فایل CSV خود را آپلود کنید</h2>
      <p className="upload-description">
        فایل خروجی از کارگزار خود را انتخاب کنید.
        ما ستون‌ها را به‌صورت خودکار شناسایی می‌کنیم.
      </p>
      <button
        className="btn-upload"
        onClick={() => fileInputRef.current.click()}
        disabled={isProcessing}
      >
        {isProcessing ? '⏳ در حال پردازش...' : '📤 انتخاب فایل'}
      </button>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv,.txt"
        style={{ display: 'none' }}
      />
      <p className="upload-hint">یا فایل را به این ناحیه بکشید و رها کنید</p>
      <div className="supported-formats">
        <span>پشتیبانی از: MetaTrader 4/5, TradingView, Interactive Brokers, Binance, Coinbase و...</span>
      </div>
    </div>
  );
};

export default CSVUploader;