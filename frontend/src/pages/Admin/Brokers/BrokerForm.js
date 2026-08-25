// frontend/src/pages/Admin/Brokers/BrokerForm.js
import React, { useState, useEffect } from 'react';
import adminService from '../../../services/adminService';
import './BrokerForm.css';

const BrokerForm = ({ broker, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'international_fx',
    is_active: true,
    order_index: 0,
  });

  useEffect(() => {
    if (broker) {
      setFormData({
        name: broker.name || '',
        category: broker.category || 'international_fx',
        is_active: broker.is_active !== undefined ? broker.is_active : true,
        order_index: broker.order_index || 0,
      });
    }
  }, [broker]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (broker) {
        await adminService.updateBroker(broker.id, formData);
      } else {
        await adminService.createBroker(formData);
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving broker:', error);
      setError(error.response?.data?.error || 'خطا در ذخیره بروکر');
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { value: 'international_fx', label: 'بروکرهای بین‌المللی فارکس و CFD' },
    { value: 'international_crypto', label: 'صرافی‌های ارز دیجیتال بین‌المللی' },
    { value: 'iranian_crypto', label: 'صرافی‌های ارز دیجیتال داخلی' },
    { value: 'iranian_stock', label: 'کارگزاری‌های بورس داخلی' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{broker ? '✏️ ویرایش بروکر' : '➕ بروکر جدید'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          {error && <div className="form-error">{error}</div>}
          <div className="form-group">
            <label>نام بروکر *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="مثلاً: IC Markets"
            />
          </div>
          <div className="form-group">
            <label>دسته‌بندی</label>
            <select name="category" value={formData.category} onChange={handleChange}>
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>ترتیب نمایش</label>
            <input
              type="number"
              name="order_index"
              value={formData.order_index}
              onChange={handleChange}
              min="0"
              step="1"
            />
          </div>
          <div className="form-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
              />
              فعال
            </label>
          </div>
          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-cancel">لغو</button>
            <button type="submit" className="btn-save" disabled={loading}>
              {loading ? 'در حال ذخیره...' : '💾 ذخیره'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BrokerForm;