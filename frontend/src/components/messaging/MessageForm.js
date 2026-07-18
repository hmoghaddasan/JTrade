// frontend/src/components/messaging/MessageForm.js

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import './Messaging.css';

const MessageForm = () => {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.subject.trim()) {
      setError('لطفاً موضوع پیام را وارد کنید');
      setLoading(false);
      return;
    }
    if (!formData.message.trim()) {
      setError('لطفاً متن پیام را وارد کنید');
      setLoading(false);
      return;
    }

    // ذخیره در localStorage (mock)
    const savedMessages = localStorage.getItem('userMessages');
    const messages = savedMessages ? JSON.parse(savedMessages) : [];

    const newMessage = {
      id: Date.now(),
      user: user?.phone_number,
      subject: formData.subject.trim(),
      message: formData.message.trim(),
      date: new Date().toISOString(),
      isRead: false,
      isReplied: false,
      reply: null,
      replyDate: null
    };

    messages.push(newMessage);
    localStorage.setItem('userMessages', JSON.stringify(messages));

    setLoading(false);
    alert('✅ پیام شما با موفقیت ارسال شد. همکاران ما در اسرع وقت پاسخ خواهند داد.');
    navigate('/messages');
  };

  return (
    <div className={`messaging-container ${isDark ? 'dark' : 'light'}`}>
      <div className="messaging-header">
        <h2>✉️ ارسال پیام جدید</h2>
        <button className="btn-secondary" onClick={() => navigate('/messages')}>
          ↩️ بازگشت
        </button>
      </div>

      <div className="message-form-container">
        <div className="form-info">
          <p>📌 لطفاً سؤال یا مشکل خود را به صورت کامل توضیح دهید.</p>
          <p>همکاران ما پس از دریافت پیام شما، در اسرع وقت بررسی کرده و در صورت نیاز با شما تماس خواهند گرفت.</p>
        </div>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit} className="message-form">
          <div className="form-group">
            <label>موضوع *</label>
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              placeholder="موضوع پیام را وارد کنید"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label>متن پیام *</label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              placeholder="پیام خود را به صورت کامل بنویسید..."
              rows="6"
              disabled={loading}
              required
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={() => navigate('/messages')}>
              انصراف
            </button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'در حال ارسال...' : '📨 ارسال پیام'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MessageForm;