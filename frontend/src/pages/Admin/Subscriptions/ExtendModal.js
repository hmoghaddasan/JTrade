// frontend/src/pages/Admin/Subscriptions/ExtendModal.js
import React, { useState } from 'react';
import adminService from '../../../services/adminService';
import './ExtendModal.css';

const ExtendModal = ({ subscription, onClose, onSuccess }) => {
  const [days, setDays] = useState(30);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (days < 1) {
      setError('تعداد روز باید حداقل ۱ باشد');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await adminService.extendSubscription(subscription.id, {
        additional_days: days,
        reason: reason
      });
      onSuccess();
      onClose();
    } catch (error) {
      setError(error.response?.data?.error || 'خطا در تمدید اشتراک');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>تمدید اشتراک</h2>
        <p className="sub-info">
          کاربر: <strong>{subscription.user_name || subscription.user_phone}</strong>
          <br />
          پلن فعلی: <strong>{subscription.plan_name}</strong>
          <br />
          تاریخ انقضا: <strong>{new Date(subscription.end_date).toLocaleDateString('fa-IR')}</strong>
          <br />
          روزهای باقیمانده: <strong>{subscription.remaining_days} روز</strong>
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>تعداد روز اضافه</label>
            <input
              type="number"
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value) || 0)}
              min="1"
              max="365"
              required
            />
          </div>

          <div className="form-group">
            <label>دلیل تمدید (اختیاری)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثلاً: هدیه ویژه، پشتیبانی و ..."
            />
          </div>

          {error && <div className="error-box">{error}</div>}

          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={loading}>
              انصراف
            </button>
            <button type="submit" disabled={loading}>
              {loading ? 'در حال تمدید...' : '✅ تمدید اشتراک'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExtendModal;