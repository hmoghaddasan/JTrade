// frontend/src/components/messaging/MessageList.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import RealApiService from '../../services/realApiService';
import './Messaging.css';

const MessageList = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [showReply, setShowReply] = useState(false);
  const [systemMessages, setSystemMessages] = useState([]);

  // ============================================
  // بارگذاری پیام‌ها
  // ============================================
  useEffect(() => {
    const loadMessages = async () => {
      setLoading(true);
      try {
        // دریافت پیام‌های کاربر
        const messagesResponse = await RealApiService.getUserMessages();
        const messagesData = messagesResponse.data.results || messagesResponse.data || [];
        setMessages(messagesData);
        console.log('📬 Messages loaded:', messagesData.length);

        // دریافت پیام‌های سیستم
        const systemResponse = await RealApiService.getSystemMessages();
        const systemData = systemResponse.data.results || systemResponse.data || [];
        setSystemMessages(systemData.filter(m => m.is_active === true));
        console.log('📢 System messages loaded:', systemData.length);

      } catch (error) {
        console.error('Error loading messages:', error);
        showToast('خطا در دریافت پیام‌ها', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [showToast]);

  // ============================================
  // انتخاب پیام
  // ============================================
  const handleMessageSelect = (message) => {
    setSelectedMessage(message);
    setShowReply(false);
    setReplyText('');

    // اگر پیام خوانده نشده، علامت خوانده شدن را ثبت کن
    if (!message.is_read) {
      markAsRead(message.id);
    }
  };

  // ============================================
  // علامت خوانده شدن
  // ============================================
  const markAsRead = async (messageId) => {
    try {
      await RealApiService.markMessageAsRead(messageId);
      // به‌روزرسانی لیست
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, is_read: true } : m
      ));
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  // ============================================
  // پاسخ به پیام
  // ============================================
  const handleReply = async () => {
    if (!replyText.trim()) {
      showToast('لطفاً متن پاسخ را وارد کنید', 'warning');
      return;
    }

    try {
      const response = await RealApiService.replyToMessage(selectedMessage.id, {
        message: replyText.trim()
      });

      if (response.data) {
        showToast('✅ پاسخ با موفقیت ارسال شد', 'success');
        setShowReply(false);
        setReplyText('');

        // به‌روزرسانی پیام
        setMessages(prev => prev.map(m =>
          m.id === selectedMessage.id ? { ...m, is_replied: true, reply_message: replyText.trim() } : m
        ));
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      showToast('خطا در ارسال پاسخ', 'error');
    }
  };

  // ============================================
  // حذف پیام
  // ============================================
  const handleDelete = async (messageId) => {
    if (!window.confirm('آیا از حذف این پیام اطمینان دارید؟')) return;

    try {
      await RealApiService.deleteMessage(messageId);
      setMessages(prev => prev.filter(m => m.id !== messageId));
      if (selectedMessage?.id === messageId) {
        setSelectedMessage(null);
      }
      showToast('✅ پیام با موفقیت حذف شد', 'success');
    } catch (error) {
      console.error('Error deleting message:', error);
      showToast('خطا در حذف پیام', 'error');
    }
  };

  // ============================================
  // فرمت تاریخ
  // ============================================
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fa-IR') + ' ' + date.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="messaging-container">
        <div className="loading-spinner">⏳ در حال بارگذاری پیام‌ها...</div>
      </div>
    );
  }

  return (
    <div className="messaging-container">
      <div className="messaging-header">
        <h2>📬 پیام‌ها</h2>
        <button className="btn-primary" onClick={() => navigate('/messages/new')}>
          ✉️ پیام جدید
        </button>
      </div>

      {/* پیام‌های سیستم */}
      {systemMessages.length > 0 && (
        <div className="system-messages-section">
          <h4>📢 پیام‌های سیستم</h4>
          {systemMessages.map(msg => (
            <div key={msg.id} className="system-message-item">
              <div className="system-message-title">{msg.title}</div>
              <div className="system-message-body">{msg.message}</div>
              <div className="system-message-date">{formatDate(msg.created_at)}</div>
            </div>
          ))}
        </div>
      )}

      <div className="messages-layout">
        {/* لیست پیام‌ها */}
        <div className="messages-list">
          {messages.length === 0 ? (
            <div className="empty-state">
              <p>📭 هیچ پیامی ندارید</p>
              <button className="btn-primary btn-sm" onClick={() => navigate('/messages/new')}>
                ارسال پیام جدید
              </button>
            </div>
          ) : (
            messages.map(message => (
              <div
                key={message.id}
                className={`message-item ${selectedMessage?.id === message.id ? 'active' : ''} ${!message.is_read ? 'unread' : ''}`}
                onClick={() => handleMessageSelect(message)}
              >
                <div className="message-item-header">
                  <span className="message-subject">{message.subject}</span>
                  {!message.is_read && <span className="unread-badge">جدید</span>}
                  {message.is_replied && <span className="replied-badge">✅ پاسخ داده شده</span>}
                </div>
                <div className="message-item-info">
                  <span className="message-date">{formatDate(message.created_at)}</span>
                  <span className="message-status">
                    {message.is_read ? '📖 خوانده شده' : '📩 جدید'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* جزئیات پیام */}
        <div className="message-detail">
          {selectedMessage ? (
            <div className="message-detail-content">
              <div className="detail-header">
                <h3>{selectedMessage.subject}</h3>
                <div className="detail-actions">
                  <button
                    className="btn-delete btn-sm"
                    onClick={() => handleDelete(selectedMessage.id)}
                  >
                    🗑️ حذف
                  </button>
                  {!selectedMessage.is_replied && (
                    <button
                      className="btn-reply btn-sm"
                      onClick={() => setShowReply(!showReply)}
                    >
                      ↩️ پاسخ
                    </button>
                  )}
                </div>
              </div>

              <div className="detail-meta">
                <span>تاریخ: {formatDate(selectedMessage.created_at)}</span>
                <span>وضعیت: {selectedMessage.is_read ? 'خوانده شده' : 'جدید'}</span>
              </div>

              <div className="detail-body">
                {selectedMessage.message}
              </div>

              {selectedMessage.reply_message && (
                <div className="reply-section">
                  <h4>📨 پاسخ ادمین</h4>
                  <div className="reply-body">{selectedMessage.reply_message}</div>
                  <div className="reply-date">{formatDate(selectedMessage.reply_date)}</div>
                </div>
              )}

              {showReply && (
                <div className="reply-form">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="پاسخ خود را بنویسید..."
                    rows="4"
                  />
                  <div className="reply-actions">
                    <button className="btn-secondary btn-sm" onClick={() => setShowReply(false)}>
                      انصراف
                    </button>
                    <button className="btn-primary btn-sm" onClick={handleReply}>
                      ارسال پاسخ
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="no-message-selected">
              <p>📬 یک پیام را برای مشاهده جزئیات انتخاب کنید</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageList;