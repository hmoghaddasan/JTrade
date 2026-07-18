// frontend/src/components/messaging/MessageList.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import './Messaging.css';

const MessageList = () => {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // بارگذاری پیام‌ها
  useEffect(() => {
    loadMessages();
    loadUnreadCount();
  }, []);

  const loadMessages = () => {
    // بارگذاری از localStorage (mock)
    const savedMessages = localStorage.getItem('userMessages');
    if (savedMessages) {
      const parsed = JSON.parse(savedMessages);
      // فیلتر کردن پیام‌های کاربر فعلی
      const userMessages = parsed.filter(m => m.user === user?.phone_number);
      setMessages(userMessages.sort((a, b) => new Date(b.date) - new Date(a.date)));
    }
    setLoading(false);
  };

  const loadUnreadCount = () => {
    const savedMessages = localStorage.getItem('userMessages');
    if (savedMessages) {
      const parsed = JSON.parse(savedMessages);
      const unread = parsed.filter(m =>
        m.user === user?.phone_number &&
        m.isRead === false
      ).length;
      setUnreadCount(unread);
    }
  };

  const handleMessageClick = (message) => {
    setSelectedMessage(message);
    // علامت‌گذاری به عنوان خوانده شده
    const savedMessages = localStorage.getItem('userMessages');
    if (savedMessages) {
      const parsed = JSON.parse(savedMessages);
      const updated = parsed.map(m => {
        if (m.id === message.id) {
          return { ...m, isRead: true };
        }
        return m;
      });
      localStorage.setItem('userMessages', JSON.stringify(updated));
      loadUnreadCount();
    }
  };

  const handleReply = () => {
    if (!replyText.trim()) {
      alert('لطفاً متن پاسخ را وارد کنید');
      return;
    }

    // شبیه‌سازی پاسخ ادمین
    const savedMessages = localStorage.getItem('userMessages');
    if (savedMessages) {
      const parsed = JSON.parse(savedMessages);
      const updated = parsed.map(m => {
        if (m.id === selectedMessage.id) {
          return {
            ...m,
            reply: replyText,
            isReplied: true,
            replyDate: new Date().toISOString()
          };
        }
        return m;
      });
      localStorage.setItem('userMessages', JSON.stringify(updated));
      setReplyText('');
      setShowReplyModal(false);
      loadMessages();
      alert('✅ پاسخ با موفقیت ارسال شد');
    }
  };

  const getStatusBadge = (message) => {
    if (message.isReplied) {
      return <span className="badge-success">✅ پاسخ داده شده</span>;
    }
    if (!message.isRead) {
      return <span className="badge-warning">🟡 خوانده نشده</span>;
    }
    return <span className="badge-info">📖 خوانده شده</span>;
  };

  if (loading) {
    return <div className="loading-spinner">⏳ در حال بارگذاری...</div>;
  }

  return (
    <div className={`messaging-container ${isDark ? 'dark' : 'light'}`}>
      <div className="messaging-header">
        <h2>💬 پیام‌های من</h2>
        <div className="header-actions">
          <button className="btn-primary" onClick={() => navigate('/messages/new')}>
            ✉️ پیام جدید
          </button>
          <button className="btn-secondary" onClick={() => navigate('/')}>
            ↩️ بازگشت
          </button>
        </div>
      </div>

      {unreadCount > 0 && (
        <div className="unread-banner">
          <span>📬 {unreadCount} پیام خوانده نشده دارید</span>
        </div>
      )}

      <div className="messages-list">
        {messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>هیچ پیامی ندارید</h3>
            <p>برای ارسال پیام به پشتیبانی، روی دکمه "پیام جدید" کلیک کنید.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`message-item ${!msg.isRead ? 'unread' : ''}`}
              onClick={() => handleMessageClick(msg)}
            >
              <div className="message-item-header">
                <div className="message-subject">{msg.subject}</div>
                <div className="message-status">{getStatusBadge(msg)}</div>
              </div>
              <div className="message-item-body">
                <p className="message-preview">{msg.message}</p>
              </div>
              <div className="message-item-footer">
                <span className="message-date">
                  {new Date(msg.date).toLocaleDateString('fa-IR')}
                </span>
                {msg.isReplied && (
                  <button
                    className="btn-view-reply"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMessage(msg);
                      setShowReplyModal(true);
                    }}
                  >
                    👁️ مشاهده پاسخ
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* مودال مشاهده پاسخ */}
      {showReplyModal && selectedMessage && (
        <div className="modal-overlay" onClick={() => setShowReplyModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">💬</div>
            <h3>پیام: {selectedMessage.subject}</h3>

            <div className="message-detail">
              <div className="message-sender">
                <strong>شما:</strong> {selectedMessage.message}
              </div>
              {selectedMessage.isReplied && (
                <div className="message-reply">
                  <strong>پاسخ ادمین:</strong>
                  <div className="reply-content">{selectedMessage.reply}</div>
                  <div className="reply-date">
                    {new Date(selectedMessage.replyDate).toLocaleDateString('fa-IR')}
                  </div>
                </div>
              )}
            </div>

            {!selectedMessage.isReplied && (
              <div className="reply-form">
                <div className="form-group">
                  <label>پاسخ شما (برای ادمین)</label>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="پاسخ خود را بنویسید..."
                    rows="4"
                  />
                </div>
                <div className="modal-actions">
                  <button className="btn-cancel" onClick={() => setShowReplyModal(false)}>
                    بستن
                  </button>
                  <button className="btn-send" onClick={handleReply}>
                    ارسال پاسخ
                  </button>
                </div>
              </div>
            )}

            {selectedMessage.isReplied && (
              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setShowReplyModal(false)}>
                  بستن
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageList;