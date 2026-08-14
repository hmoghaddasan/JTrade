// frontend/src/pages/Admin/Messages/MessageReplyModal.js
import React, { useState } from 'react';
import adminService from '../../../services/adminService';
import './MessageReplyModal.css';

const MessageReplyModal = ({ message, onClose, onSuccess }) => {
  const [reply, setReply] = useState('');
  const [sendSms, setSendSms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reply.trim()) {
      setError('متن پاسخ الزامی است');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await adminService.replyMessage(message.id, {
        reply_message: reply,
        send_sms: sendSms
      });
      onSuccess();
      onClose();
    } catch (error) {
      setError(error.response?.data?.error || 'خطا در ارسال پاسخ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>✉️ پاسخ به پیام</h2>

        <div className="message-info">
          <div className="info-row">
            <span className="label">از:</span>
            <span className="value">{message.user_name || message.user_phone}</span>
          </div>
          <div className="info-row">
            <span className="label">موضوع:</span>
            <span className="value">{message.subject}</span>
          </div>
          <div className="info-row">
            <span className="label">متن پیام:</span>
            <div className="message-text">{message.message}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>پاسخ شما *</label>
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="متن پاسخ را وارد کنید..."
              rows={5}
              required
            />
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={sendSms}
                onChange={(e) => setSendSms(e.target.checked)}
              />
              ارسال پیامک به کاربر
            </label>
          </div>

          {error && <div className="error-box">{error}</div>}

          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={loading}>
              انصراف
            </button>
            <button type="submit" disabled={loading}>
              {loading ? 'در حال ارسال...' : '📤 ارسال پاسخ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MessageReplyModal;