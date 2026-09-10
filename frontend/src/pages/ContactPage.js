// frontend/src/pages/ContactPage.js

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import './ContactPage.css';

const ContactPage = () => {
  const { isDark } = useTheme();
  const { isAuthenticated, user } = useAuth();

  const contactMethods = [
    {
      icon: '💬',
      title: 'سیستم پیام‌رسانی داخلی',
      description: 'ارسال پیام مستقیم به تیم پشتیبانی از طریق سیستم پیام‌رسانی داخلی',
      action: isAuthenticated ? 'ارسال پیام' : 'ورود به حساب کاربری',
      link: isAuthenticated ? '/messages/new' : '/login',
      isInternal: true,
      requiresAuth: true
    },
    {
      icon: '📧',
      title: 'ایمیل پشتیبانی',
      description: 'ارسال ایمیل به آدرس پشتیبانی برای دریافت پاسخ در سریع‌ترین زمان',
      action: 'support@jtrade.ir',
      link: 'mailto:support@jtrade.ir',
      isInternal: false,
      requiresAuth: false
    },
    {
      icon: '📱',
      title: 'پیام‌های سیستم',
      description: 'مشاهده پیام‌های ارسالی از سمت سیستم و اعلان‌های مهم',
      action: isAuthenticated ? 'مشاهده پیام‌ها' : 'ورود به حساب کاربری',
      link: isAuthenticated ? '/messages' : '/login',
      isInternal: true,
      requiresAuth: true
    }
  ];

  return (
    <div className={`contact-page ${isDark ? 'dark' : 'light'}`}>
      <div className="contact-container">
        {/* هدر صفحه */}
        <div className="contact-header">
          <div className="contact-header-icon">📞</div>
          <h1>تماس با ما</h1>
          <p className="contact-subtitle">
            ما همواره در کنار شما هستیم. از طریق روش‌های زیر با ما در ارتباط باشید
          </p>
          {!isAuthenticated && (
            <div className="contact-login-notice">
              <span>🔒</span>
              <span>
                برای استفاده از بخش پیام‌رسانی داخلی، لطفاً{' '}
                <Link to="/login" className="login-link">وارد حساب کاربری</Link> شوید.
              </span>
            </div>
          )}
        </div>

        {/* روش‌های ارتباطی */}
        <div className="contact-methods">
          {contactMethods.map((method, index) => (
            <div
              key={index}
              className={`contact-method-card ${method.requiresAuth && !isAuthenticated ? 'disabled' : ''}`}
            >
              <div className="method-icon">{method.icon}</div>
              <div className="method-content">
                <h3>
                  {method.title}
                  {method.requiresAuth && !isAuthenticated && (
                    <span className="auth-badge">🔒 نیاز به ورود</span>
                  )}
                </h3>
                <p>{method.description}</p>
                {method.requiresAuth && !isAuthenticated ? (
                  <Link to="/login" className="method-btn login-btn">
                    🔑 ورود به حساب کاربری →
                  </Link>
                ) : method.isInternal ? (
                  <Link to={method.link} className="method-btn">
                    {method.action} →
                  </Link>
                ) : (
                  <a href={method.link} className="method-btn">
                    {method.action} →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* اطلاعات اضافی */}
        <div className="contact-info-box">
          <div className="info-item">
            <span className="info-icon">🕐</span>
            <div>
              <h4>ساعات پاسخگویی</h4>
              <p>شنبه تا پنجشنبه - 14:۰۰ تا ۱۸:۰۰</p>
            </div>
          </div>
          <div className="info-item">
            <span className="info-icon">📌</span>
            <div>
              <h4>زمان پاسخگویی</h4>
              <p>حداکثر تا ۲۴ ساعت کاری</p>
            </div>
          </div>
          <div className="info-item">
            <span className="info-icon">🔒</span>
            <div>
              <h4>حریم خصوصی</h4>
              <p>تمامی مکاتبات شما محرمانه است</p>
            </div>
          </div>
        </div>

        {/* دکمه دسترسی سریع به پیام‌ها - فقط برای کاربران لاگین شده */}
        {isAuthenticated ? (
          <div className="contact-quick-actions">
            <Link to="/messages/new" className="quick-action-btn primary">
              <span>✉️</span>
              ارسال پیام جدید
            </Link>
            <Link to="/messages" className="quick-action-btn secondary">
              <span>📋</span>
              مشاهده پیام‌ها
            </Link>
          </div>
        ) : (
          <div className="contact-quick-actions">
            <Link to="/login" className="quick-action-btn primary">
              <span>🔑</span>
              برای ارسال پیام وارد شوید
            </Link>
          </div>
        )}

        {/* فوتر صفحه */}
        <div className="contact-footer">
          <p>
            {isAuthenticated ? (
              <>
                برای ارتباط سریع‌تر، از طریق{' '}
                <Link to="/messages/new">سیستم پیام‌رسانی داخلی</Link> با ما در تماس باشید.
              </>
            ) : (
              <>
                برای ارتباط با ما، ابتدا{' '}
                <Link to="/login">وارد حساب کاربری</Link> شوید یا از ایمیل پشتیبانی استفاده کنید.
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;