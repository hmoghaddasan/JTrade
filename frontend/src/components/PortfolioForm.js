// frontend/src/components/PortfolioForm.js

import React, { useState } from 'react';
import { usePortfolio } from '../contexts/PortfolioContext';
import { useToast } from '../contexts/ToastContext';
import './PortfolioForm.css';

const PortfolioForm = ({ onClose, onSuccess, editData }) => {
  const { createPortfolio, updatePortfolio } = usePortfolio();
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    name: editData?.name || '',
    description: editData?.description || '',
    icon: editData?.icon || '📊',
    initial_balance: editData?.initial_balance || 0,
    is_active: editData?.is_active !== undefined ? editData.is_active : true,
    is_default: editData?.is_default || false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const icons = ['📊', '💰', '💎', '📈', '🏦', '💱', '🔮', '🧪', '⭐', '🔥', '🚀', '🎯'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.name.trim()) {
      setError('لطفاً نام پورتفولیو را وارد کنید');
      setLoading(false);
      return;
    }

    try {
      if (editData) {
        await updatePortfolio(editData.id, formData);
        showToast('✅ پورتفولیو با موفقیت ویرایش شد', 'success');
      } else {
        await createPortfolio(formData);
        showToast('✅ پورتفولیو با موفقیت ایجاد شد', 'success');
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'خطا در ذخیره پورتفولیو');
      console.error('Error saving portfolio:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portfolio-modal-overlay" onClick={onClose}>
      <div className="portfolio-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editData ? '✏️ ویرایش پورتفولیو' : '➕ پورتفولیو جدید'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="portfolio-form">
          <div className="form-group">
            <label>نام پورتفولیو *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
              placeholder="مثلاً: حساب شخصی"
              maxLength="100"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>آیکون</label>
            <div className="icon-selector">
              {icons.map(icon => (
                <button
                  key={icon}
                  type="button"
                  className={`icon-btn ${formData.icon === icon ? 'selected' : ''}`}
                  onClick={() => setFormData({...formData, icon})}
                  disabled={loading}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>سرمایه اولیه (دلار)</label>
            <input
              type="number"
              value={formData.initial_balance}
              onChange={(e) => setFormData({...formData, initial_balance: parseFloat(e.target.value) || 0})}
              min="0"
              step="100"
              disabled={loading}
            />
            <small className="hint-text">سرمایه اولیه این پورتفولیو برای محاسبه موجودی فعلی</small>
          </div>

          <div className="form-group">
            <label>توضیحات</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows="2"
              placeholder="توضیحات اختیاری..."
              disabled={loading}
            />
          </div>

          <div className="form-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.is_default}
                onChange={(e) => setFormData({...formData, is_default: e.target.checked})}
                disabled={loading}
              />
              پورتفولیو پیش‌فرض
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                disabled={loading}
              />
              فعال
            </label>
          </div>

          {error && <div className="error-message">{error}</div>}

 
          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-cancel" disabled={loading}>
              <span>✕</span> لغو
            </button>
            <button type="submit" disabled={loading} className="btn-save">
              <span>💾</span> {loading ? 'در حال ذخیره...' : (editData ? 'ذخیره تغییرات' : 'ذخیره')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PortfolioForm;