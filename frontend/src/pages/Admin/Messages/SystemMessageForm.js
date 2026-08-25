// frontend/src/pages/Admin/Messages/SystemMessageForm.js

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext';
import adminService from '../../../services/adminService';
import './SystemMessageForm.css';

const SystemMessageForm = () => {
  const { id } = useParams();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    message_key: '',
    is_active: true,
    is_global: true,
    start_date: '',
    end_date: '',
  });

  const isEdit = !!id;

  useEffect(() => {
    if (isEdit) {
      loadMessage();
    }
  }, [id]);

  const loadMessage = async () => {
    setLoading(true);
    try {
      const response = await adminService.getSystemMessage(id);
      const data = response.data;
      setFormData({
        title: data.title || '',
        message: data.message || '',
        message_key: data.message_key || '',
        is_active: data.is_active !== undefined ? data.is_active : true,
        is_global: data.is_global !== undefined ? data.is_global : true,
        start_date: data.start_date ? data.start_date.split('T')[0] : '',
        end_date: data.end_date ? data.end_date.split('T')[0] : '',
      });
    } catch (err) {
      console.error('Error loading system message:', err);
      setError('خطا در بارگذاری پیام');
    } finally {
      setLoading(false);
    }
  };

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
      if (isEdit) {
        await adminService.updateSystemMessage(id, formData);
      } else {
        await adminService.createSystemMessage(formData);
      }
      navigate('/admin/system-messages');
    } catch (err) {
      console.error('Error saving system message:', err);
      setError('خطا در ذخیره پیام');
      setLoading(false);
    }
  };

  if (loading && isEdit) {
    return (
      <div className="loading-container">
        <div className="spinner">⏳</div>
        <p>در حال بارگذاری...</p>
      </div>
    );
  }

  return (
    <div className={`system-message-form ${isDark ? 'dark' : 'light'}`}>
      <div className="page-header">
        <h2>{isEdit ? '✏️ ویرایش پیام سیستمی' : '➕ پیام سیستمی جدید'}</h2>
        <button className="btn-back" onClick={() => navigate('/admin/system-messages')}>
          ↩️ بازگشت
        </button>
      </div>

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="form-container">
        <div className="form-group">
          <label htmlFor="title">عنوان پیام <span className="required">*</span></label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="مثلاً: به‌روزرسانی جدید"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="message">متن پیام <span className="required">*</span></label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            placeholder="متن پیام را وارد کنید..."
            rows="5"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="message_key">کلید پیام (اختیاری)</label>
          <input
            type="text"
            id="message_key"
            name="message_key"
            value={formData.message_key}
            onChange={handleChange}
            placeholder="مثلاً: update_v2"
          />
          <small className="hint">برای شناسایی پیام در کد استفاده می‌شود</small>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="start_date">تاریخ شروع</label>
            <input
              type="date"
              id="start_date"
              name="start_date"
              value={formData.start_date}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="end_date">تاریخ پایان</label>
            <input
              type="date"
              id="end_date"
              name="end_date"
              value={formData.end_date}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-row checkboxes">
          <div className="form-group checkbox">
            <label>
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
              />
              <span>فعال</span>
            </label>
          </div>
          <div className="form-group checkbox">
            <label>
              <input
                type="checkbox"
                name="is_global"
                checked={formData.is_global}
                onChange={handleChange}
              />
              <span>عمومی (برای همه کاربران)</span>
            </label>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? '⏳ در حال ذخیره...' : (isEdit ? '💾 به‌روزرسانی' : '✅ ایجاد')}
          </button>
          <button type="button" className="btn-cancel" onClick={() => navigate('/admin/system-messages')}>
            انصراف
          </button>
        </div>
      </form>
    </div>
  );
};

export default SystemMessageForm;