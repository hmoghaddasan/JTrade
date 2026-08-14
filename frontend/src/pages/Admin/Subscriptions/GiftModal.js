// frontend/src/pages/Admin/Subscriptions/GiftModal.js
import React, { useState } from 'react';
import adminService from '../../../services/adminService';
import './GiftModal.css';

const GiftModal = ({ onClose, onSuccess }) => {
  const [days, setDays] = useState(7);
  const [onlyActive, setOnlyActive] = useState(true);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (days < 1) {
      alert('تعداد روز باید حداقل ۱ باشد');
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const response = await adminService.giftSubscription({
        days: days,
        only_active: onlyActive,
        reason: reason
      });
      setResult(response.data);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (error) {
      setResult({ error: error.response?.data?.error || 'خطا در ارسال هدیه' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>🎁 هدیه گروهی</h2>
        <p className="gift-desc">
          این قابلیت به شما امکان می‌دهد به تمام کاربران فعال (یا کاربران خاص) روزهای اضافه هدیه دهید.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>تعداد روز هدیه</label>
            <input
              type="number"
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value) || 0)}
              min="1"
              max="365"
              required
            />
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={onlyActive}
                onChange={(e) => setOnlyActive(e.target.checked)}
              />
              فقط به کاربران با اشتراک فعال
            </label>
          </div>

          <div className="form-group">
            <label>دلیل هدیه (اختیاری)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثلاً: عید نوروز، سالگرد و ..."
            />
          </div>

          {result && (
            <div className={`result-box ${result.error ? 'error' : 'success'}`}>
              {result.error || `✅ ${result.days} روز به ${result.count} اشتراک اضافه شد`}
            </div>
          )}

          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={loading}>
              انصراف
            </button>
            <button type="submit" disabled={loading}>
              {loading ? 'در حال ارسال...' : '🎁 اعمال هدیه'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GiftModal;