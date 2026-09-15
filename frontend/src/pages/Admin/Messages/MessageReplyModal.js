// frontend/src/pages/Admin/Messages/MessageReplyModal.js
import React, { useState, useEffect } from 'react';
import adminService from '../../../services/adminService';
import './MessageReplyModal.css';

const MessageReplyModal = ({ message, onClose, onSuccess }) => {
  // ✅ مقدار اولیه از reply_message قبلی
  const [reply, setReply] = useState(message?.reply_message || '');
  const [sendSms, setSendSms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ✅ اگر message تغییر کرد (مثلاً مودال برای پیام دیگری باز شد)، reply را به‌روز کن
  useEffect(() => {
    setReply(message?.reply_message || '');
    setError(null);
  }, [message?.id]);

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

  // ✅ اگر پیام قبلاً پاسخ داده شده باشد، دکمه «ویرایش پاسخ» شود
  const isEditing = !!message?.reply_message;
  const submitButtonText = loading
    ? 'در حال ارسال...'
    : isEditing
      ? '💾 ویرایش پاسخ'
      : '📤 ارسال پاسخ';

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>✉️ {isEditing ? 'مشاهده و ویرایش پاسخ' : 'پاسخ به پیام'}</h2>

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

        {/* ✅ اگر پاسخ قبلی وجود دارد، آن را نمایش بده */}
        {isEditing && message.reply_date_fa && (
          <div className="previous-reply-info">
            <div className="info-row">
              <span className="label">📅 تاریخ پاسخ قبلی:</span>
              <span className="value">{message.reply_date_fa}</span>
            </div>
            {message.replied_by_name && (
              <div className="info-row">
                <span className="label">👤 پاسخ‌دهنده:</span>
                <span className="value">{message.replied_by_name}</span>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>
              {isEditing ? 'ویرایش پاسخ *' : 'پاسخ شما *'}
            </label>
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
              بستن
            </button>
            <button type="submit" disabled={loading}>
              {submitButtonText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MessageReplyModal;