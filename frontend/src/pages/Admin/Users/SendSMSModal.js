// frontend/src/pages/Admin/Users/SendSMSModal.js
import React, { useState } from 'react';
import adminService from '../../../services/adminService';
import './SendSMSModal.css';

const SendSMSModal = ({ onClose, onSuccess, initialUserIds = [] }) => {
  const [message, setMessage] = useState('');
  const [sendToAll, setSendToAll] = useState(initialUserIds.length === 0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      alert('لطفاً متن پیامک را وارد کنید');
      return;
    }

    setLoading(true);
    try {
      const response = await adminService.sendSMS({
        message: message,
        user_ids: sendToAll ? [] : initialUserIds,
        send_to_all: sendToAll
      });
      setResult(response.data);
      setTimeout(onSuccess, 2000);
    } catch (error) {
      setResult({ error: error.response?.data?.error || 'خطا در ارسال پیامک' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>ارسال پیامک</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={sendToAll}
                onChange={(e) => setSendToAll(e.target.checked)}
              />
              ارسال به همه کاربران فعال
            </label>
          </div>

          {!sendToAll && initialUserIds.length > 0 && (
            <div className="info-box">
              ارسال به {initialUserIds.length} کاربر انتخاب‌شده
            </div>
          )}

          <div className="form-group">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="متن پیامک را وارد کنید..."
              rows={5}
              required
            />
          </div>

          {result && (
            <div className={`result-box ${result.error ? 'error' : 'success'}`}>
              {result.error || `${result.sent_count} پیامک با موفقیت ارسال شد`}
              {result.failed_count > 0 && ` (${result.failed_count} خطا)`}
            </div>
          )}

          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={loading}>
              انصراف
            </button>
            <button type="submit" disabled={loading}>
              {loading ? 'در حال ارسال...' : 'ارسال پیامک'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SendSMSModal;