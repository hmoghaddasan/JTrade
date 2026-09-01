// frontend/src/components/SystemMessages.js

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import RealApiService from '../services/realApiService';
import './SystemMessages.css';

// کلید ذخیره‌سازی در localStorage
const STORAGE_KEY = 'jtrade_system_messages_data';

const SystemMessages = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // ============================================
  // بررسی آیا باید پیام‌ها نمایش داده شوند
  // ============================================
  const shouldShowMessages = () => {
    if (!user) return false;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);

      // اگر هیچ داده‌ای وجود ندارد => نمایش بده
      if (!stored) {
        console.log('📢 اولین بار است، نمایش پیام‌ها');
        return true;
      }

      const data = JSON.parse(stored);

      // اگر کاربر تغییر کرده => نمایش بده
      if (data.userId !== user.id) {
        console.log('🔄 کاربر تغییر کرده، نمایش پیام‌ها');
        return true;
      }

      // اگر بیش از ۱ روز گذشته => نمایش بده
      const oneDay = 24 * 60 * 60 * 1000;
      const elapsed = Date.now() - data.timestamp;
      if (elapsed > oneDay) {
        console.log(`⏰ بیش از ۱ روز گذشته (${Math.round(elapsed / (24 * 60 * 60 * 1000))} روز)، نمایش پیام‌ها`);
        return true;
      }

      // اگر پیام‌ها قبلاً نمایش داده شده‌اند => نمایش نده
      if (data.shown === true) {
        console.log(`⏭️ قبلاً نمایش داده شده (${Math.round(elapsed / (60 * 60 * 1000))} ساعت پیش)، عدم نمایش`);
        return false;
      }

      // در غیر این صورت => نمایش بده
      return true;

    } catch (error) {
      console.error('Error in shouldShowMessages:', error);
      return true;
    }
  };

  // ============================================
  // ذخیره وضعیت نمایش
  // ============================================
  const markAsShown = () => {
    const data = {
      userId: user?.id,
      shown: true,
      timestamp: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    console.log('💾 در localStorage ذخیره شد (shown: true)');
  };

  // ============================================
  // پاک کردن (برای دیباگ)
  // ============================================
  const clearStorage = () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  };

  // ============================================
  // بارگذاری پیام‌ها
  // ============================================
  useEffect(() => {
    const loadMessages = async () => {
      if (!user) {
        setLoading(false);
        setVisible(false);
        return;
      }

      try {
        // ✅ بررسی آیا باید نمایش داده شود
        const show = shouldShowMessages();
        console.log('📊 shouldShowMessages:', show);

        if (!show) {
          setLoading(false);
          setVisible(false);
          return;
        }

        console.log('📢 بارگذاری پیام‌های سیستمی...');
        const response = await RealApiService.getSystemMessages();
        const data = response.data.results || response.data || [];

        // فقط پیام‌های فعال
        const activeMessages = data.filter(m => m.is_active === true);
        setMessages(activeMessages);

        if (activeMessages.length > 0) {
          console.log(`📢 نمایش ${activeMessages.length} پیام سیستمی`);
          setVisible(true);
          setCurrentIndex(0);
          // ✅ بلافاصله ذخیره کن تا دوباره نمایش داده نشود
          markAsShown();
        } else {
          console.log('📭 هیچ پیام فعالی وجود ندارد');
          setVisible(false);
          // اگر پیامی نبود، باز هم ذخیره کن تا دوباره چک نشود
          markAsShown();
        }

      } catch (error) {
        console.error('Error loading system messages:', error);
        // اگر خطا بود، باز هم ذخیره کن تا دوباره تلاش نکند
        markAsShown();
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [user]);

  // ============================================
  // بستن پیام
  // ============================================
  const handleClose = () => {
    setVisible(false);
    markAsShown();
  };

  // ============================================
  // نمایش مجدد (برای مواقع نادر که کاربر بخواهد دوباره ببیند)
  // ============================================
  const handleShowAgain = () => {
    clearStorage();
  };

  // ============================================
  // پیام بعدی
  // ============================================
  const handleNext = () => {
    if (currentIndex < messages.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      handleClose();
    }
  };

  // ============================================
  // پیام قبلی
  // ============================================
  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (loading || !visible || messages.length === 0) {
    return null;
  }

  const currentMessage = messages[currentIndex];
  const isLast = currentIndex === messages.length - 1;
  const isFirst = currentIndex === 0;

  return (
    <div className="system-messages-banner">
      <div className="system-messages-content">
        <div className="system-messages-header">
          <span className="system-messages-icon">📢</span>
          <span className="system-messages-title">
            پیام سیستم ({currentIndex + 1} / {messages.length})
          </span>
          <button
            className="system-messages-close"
            onClick={handleClose}
            title="بستن پیام‌ها"
          >
            ✕
          </button>
        </div>

        <div className="system-messages-body">
          <h4>{currentMessage.title}</h4>
          <p>{currentMessage.message}</p>
          {currentMessage.start_date && currentMessage.end_date && (
            <div className="system-messages-date">
              📅 از {new Date(currentMessage.start_date).toLocaleDateString('fa-IR')}
              تا {new Date(currentMessage.end_date).toLocaleDateString('fa-IR')}
            </div>
          )}
        </div>

        <div className="system-messages-footer">
          <div className="system-messages-nav">
            <button
              className="system-messages-nav-btn"
              onClick={handlePrev}
              disabled={isFirst}
            >
              ◀
            </button>
            <span className="system-messages-counter">
              {currentIndex + 1} / {messages.length}
            </span>
            <button
              className="system-messages-nav-btn"
              onClick={handleNext}
            >
              {isLast ? '✅ تمام' : '▶'}
            </button>
          </div>
          <div className="system-messages-actions">
            <button
              className="system-messages-dismiss-btn"
              onClick={handleClose}
            >
              {isLast ? '📌 بستن' : '⏭ رد کردن'}
            </button>
            <button
              className="system-messages-show-again-btn"
              onClick={handleShowAgain}
            >
              🔄 مشاهده مجدد
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemMessages;