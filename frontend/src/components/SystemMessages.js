// frontend/src/components/SystemMessages.js

import React, { useState, useEffect } from 'react';
import api from '../services/apiService';
import './SystemMessages.css';

const SystemMessages = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dismissedIds, setDismissedIds] = useState(() => {
    try {
      const saved = localStorage.getItem('dismissedSystemMessages');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showResetBanner, setShowResetBanner] = useState(true); // ✅ کنترل نمایش بنر ریست

  useEffect(() => {
    const loadMessages = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log('📢 Fetching system messages from API...');
        const response = await api.get('messages/system/public/');
        console.log('📢 System messages response:', response.data);

        let data = response.data;

        if (!Array.isArray(data)) {
          if (data && typeof data === 'object') {
            if (data.results && Array.isArray(data.results)) {
              data = data.results;
            } else if (data.data && Array.isArray(data.data)) {
              data = data.data;
            } else {
              data = [data];
            }
          } else {
            data = [];
          }
        }

        console.log('📅 Raw messages count:', data.length);

        // ============================================
        // ✅ فیلتر پیام‌های فعال
        // ============================================
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayStr = today.toISOString().split('T')[0];

        const activeMessages = data.filter(msg => {
          if (msg.is_active === false || msg.is_active === 0) {
            console.log(`❌ Message ${msg.id} (${msg.title}) is INACTIVE`);
            return false;
          }

          if (msg.start_date) {
            try {
              const startDate = new Date(msg.start_date);
              const startDateStr = startDate.toISOString().split('T')[0];
              if (startDateStr > todayStr) {
                console.log(`❌ Message ${msg.id} start_date (${startDateStr}) > today (${todayStr})`);
                return false;
              }
            } catch (e) {
              console.error(`Error parsing start_date for message ${msg.id}:`, e);
            }
          }

          if (msg.end_date) {
            try {
              const endDate = new Date(msg.end_date);
              const endDateStr = endDate.toISOString().split('T')[0];
              if (endDateStr < todayStr) {
                console.log(`❌ Message ${msg.id} end_date (${endDateStr}) < today (${todayStr}) - EXPIRED`);
                return false;
              }
            } catch (e) {
              console.error(`Error parsing end_date for message ${msg.id}:`, e);
            }
          }

          console.log(`✅ Message ${msg.id} (${msg.title}) is ACTIVE`);
          return true;
        });

        console.log('📢 Active messages count:', activeMessages.length);
        setMessages(activeMessages);

      } catch (error) {
        console.error('❌ Error loading system messages from API:', error);
        setError('خطا در بارگذاری پیام‌های سیستمی');
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, []);

  const handleDismiss = (messageId) => {
    const newDismissed = [...dismissedIds, messageId];
    setDismissedIds(newDismissed);
    localStorage.setItem('dismissedSystemMessages', JSON.stringify(newDismissed));
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  };

  // ✅ ریست همه پیام‌های بسته شده
  const handleResetDismissed = () => {
    localStorage.removeItem('dismissedSystemMessages');
    setDismissedIds([]);
    setShowResetBanner(false); // ✅ مخفی کردن بنر ریست
    window.location.reload();
  };

  // ✅ بستن بنر ریست
  const handleDismissResetBanner = () => {
    setShowResetBanner(false);
  };

  // ✅ فقط پیام‌هایی که بسته نشده‌اند نمایش داده شوند
  const visibleMessages = messages.filter(msg => !dismissedIds.includes(msg.id));

  console.log('📢 visibleMessages count:', visibleMessages.length);
  console.log('📢 dismissedIds:', dismissedIds);

  if (loading) {
    return (
      <div className="system-messages-loading">
        <span className="loading-dots">⏳</span>
      </div>
    );
  }

  if (error || visibleMessages.length === 0) {
    // ✅ اگر پیامی وجود ندارد اما قبلاً بسته شده‌اند و بنر نمایش داده شود
    if (messages.length > 0 && dismissedIds.length > 0 && showResetBanner) {
      return (
        <div className="system-messages-reset">
          <div className="reset-message">
            <span className="reset-icon">📢</span>
            <span>همه پیام‌ها بسته شده‌اند</span>
            <button className="reset-btn" onClick={handleResetDismissed}>
              🔄 مشاهده مجدد
            </button>
            <button className="reset-dismiss-btn" onClick={handleDismissResetBanner} title="بستن">
              ✕
            </button>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="system-messages">
      {visibleMessages.map((msg, index) => (
        <div key={msg.id || index} className={`system-message ${index === 0 ? 'primary' : 'secondary'}`}>
          <div className="message-icon">📢</div>
          <div className="message-content">
            <h4>{msg.title || 'پیام سیستم'}</h4>
            <p>{msg.message || ''}</p>
            {msg.start_date && msg.end_date && (
              <div className="message-date-range">
                <span className="date-label">📅 بازه:</span>
                <span className="date-value">
                  {new Date(msg.start_date).toLocaleDateString('fa-IR')}
                  تا
                  {new Date(msg.end_date).toLocaleDateString('fa-IR')}
                </span>
              </div>
            )}
          </div>
          <button
            className="message-dismiss-btn"
            onClick={() => handleDismiss(msg.id)}
            title="بستن پیام"
            aria-label="بستن پیام"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};

export default SystemMessages;