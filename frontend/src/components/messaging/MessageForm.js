// frontend/src/components/messaging/MessageForm.js

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import RealApiService from '../../services/realApiService';
import './Messaging.css';

const MessageForm = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ============================================
  // ارسال پیام
  // ============================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!subject.trim()) {
      setError('لطفاً موضوع پیام را وارد کنید');
      return;
    }

    if (!message.trim()) {
      setError('لطفاً متن پیام را وارد کنید');
      return;
    }

    setLoading(true);

    try {
      const data = {
        subject: subject.trim(),
        message: message.trim(),
      };

      // ✅ اصلاح مسیر - استفاده از /messages/create/
      const response = await RealApiService.sendMessage(data);
      console.log('📤 Message sent:', response.data);

      showToast('✅ پیام با موفقیت ارسال شد', 'success');

      setTimeout(() => {
        navigate('/messages');
      }, 500);

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMsg = error.response?.data?.message || error.response?.data?.error || 'خطا در ارسال پیام';
      setError(errorMsg);
      showToast('❌ ' + errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // انصراف
  // ============================================
  const handleCancel = () => {
    navigate('/messages');
  };

  return (
    <div className="messaging-container">
      <div className="messaging-header">
        <h2>✉️ ارسال پیام جدید</h2>
        <button className="btn-secondary" onClick={handleCancel}>
          ↩️ بازگشت
        </button>
      </div>

      <div className="message-form-container">
        <form onSubmit={handleSubmit} className="message-form">
          <div className="form-group">
            <label>موضوع <span className="required">*</span></label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="موضوع پیام را وارد کنید"
              disabled={loading}
              className={error ? 'has-error' : ''}
              maxLength={200}
            />
          </div>

          <div className="form-group">
            <label>متن پیام <span className="required">*</span></label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="متن پیام خود را بنویسید..."
              disabled={loading}
              className={error ? 'has-error' : ''}
              rows="8"
            />
          </div>

          {error && <div className="error-message">⚠️ {error}</div>}

          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleCancel}
              disabled={loading}
            >
              انصراف
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? '⏳ در حال ارسال...' : '📨 ارسال پیام'}
            </button>
          </div>

          <div className="form-info">
            <p>💡 پیام شما برای تیم پشتیبانی ارسال خواهد شد. پاسخ در اسرع وقت به شما اطلاع داده می‌شود.</p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MessageForm;