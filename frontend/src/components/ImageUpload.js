// frontend/src/components/ImageUpload.js

import React, { useState, useRef } from 'react';
import './ImageUpload.css';

const ImageUpload = ({ value, onChange, onRemove, disabled, maxSizeMB = 5, accept = 'image/*' }) => {
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  React.useEffect(() => {
    if (value instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(value);
    } else if (typeof value === 'string' && value) {
      setPreview(value);
    } else {
      setPreview(null);
    }
  }, [value]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // بررسی حجم
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`حجم فایل نباید بیشتر از ${maxSizeMB} مگابایت باشد`);
      return;
    }
    setError('');
    onChange(file);
  };

  const handleRemove = () => {
    setPreview(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onRemove) {
      onRemove();
    }
    onChange(null);
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className={`image-upload-container ${disabled ? 'disabled' : ''}`}>
      {preview ? (
        <div className="image-preview-wrapper">
          <img src={preview} alt="پیش‌نمایش" className="image-preview" />
          {!disabled && (
            <div className="image-actions">
              <button type="button" className="btn-change" onClick={handleClick}>
                📷 تغییر
              </button>
              <button type="button" className="btn-remove" onClick={handleRemove}>
                🗑️ حذف
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="image-upload-placeholder" onClick={handleClick}>
          <span className="upload-icon">🖼️</span>
          <span className="upload-text">برای آپلود کلیک کنید</span>
          <span className="upload-hint">حداکثر {maxSizeMB} مگابایت</span>
        </div>
      )}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={accept}
        disabled={disabled}
        style={{ display: 'none' }}
      />
      {error && <div className="upload-error">{error}</div>}
    </div>
  );
};

export default ImageUpload;