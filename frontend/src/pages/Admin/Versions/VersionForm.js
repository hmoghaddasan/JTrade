// frontend/src/pages/Admin/Versions/VersionForm.js
import React, { useState, useEffect } from 'react';
import adminService from '../../../services/adminService';
import './VersionForm.css';

const VersionForm = ({ version, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    version_number: '',
    release_date: new Date().toISOString().slice(0, 16),
    release_notes: '',
    is_current: false,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (version) {
      setFormData({
        version_number: version.version_number,
        release_date: version.release_date?.slice(0, 16) || '',
        release_notes: version.release_notes || '',
        is_current: version.is_current || false,
      });
    }
  }, [version]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (version) {
        await adminService.updateVersion(version.id, formData);
      } else {
        await adminService.createVersion(formData);
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving version:', error);
      alert('خطا در ذخیره نسخه');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{version ? 'ویرایش نسخه' : 'افزودن نسخه جدید'}</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>شماره نسخه *</label>
              <input
                type="text"
                name="version_number"
                value={formData.version_number}
                onChange={handleChange}
                placeholder="مثلاً: 1.6.0"
                required
              />
            </div>

            <div className="form-group">
              <label>تاریخ انتشار *</label>
              <input
                type="datetime-local"
                name="release_date"
                value={formData.release_date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group full-width">
              <label>توضیحات انتشار</label>
              <textarea
                name="release_notes"
                value={formData.release_notes}
                onChange={handleChange}
                rows={5}
                placeholder="تغییرات این نسخه را وارد کنید..."
              />
            </div>

            <div className="form-group checkbox-group full-width">
              <label>
                <input
                  type="checkbox"
                  name="is_current"
                  checked={formData.is_current}
                  onChange={handleChange}
                />
                فعال کردن به عنوان نسخه فعلی
              </label>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={loading}>
              انصراف
            </button>
            <button type="submit" disabled={loading}>
              {loading ? 'در حال ذخیره...' : '💾 ذخیره'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VersionForm;