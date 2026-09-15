// frontend/src/components/Admin/AdminHeader.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import adminService from '../../services/adminService';
import './AdminHeader.css';

const AdminHeader = ({ toggleSidebar }) => {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [user] = useState(() => {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : {};
    } catch {
      return {};
    }
  });

  const [pendingCount, setPendingCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  // ============================================
  // ✅ بارگذاری آمار ادمین
  // ============================================
  const loadAdminStats = useCallback(async () => {
    try {
      const response = await adminService.getDashboard();
      const stats = response.data;

      const awaitingReview = stats?.payment_requests?.pending_review_count || 0;
      setPendingCount(awaitingReview);

      const unreadMessages = stats?.messages?.unread_by_admin || 0;
      setUnreadMessagesCount(unreadMessages);
    } catch (error) {
      console.debug('Admin stats load failed:', error?.message);
    }
  }, []);

  // ============================================
  // ✅ polling + رویدادهای سراسری
  // ============================================
  useEffect(() => {
    // بارگذاری اولیه
    loadAdminStats();

    // polling هر ۱۵ ثانیه
    const interval = setInterval(loadAdminStats, 15000);

    // گوش دادن به رویدادها برای به‌روزرسانی فوری
    const handleUpdate = () => {
      console.log('🔔 AdminHeader - Received update event, refreshing stats...');
      loadAdminStats();
    };

    window.addEventListener('payment-request-updated', handleUpdate);
    window.addEventListener('message-created', handleUpdate);
    window.addEventListener('admin-stats-updated', handleUpdate);

    // به‌روزرسانی وقتی تب دوباره visible می‌شود
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ Page visible again, refreshing admin stats...');
        loadAdminStats();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('payment-request-updated', handleUpdate);
      window.removeEventListener('message-created', handleUpdate);
      window.removeEventListener('admin-stats-updated', handleUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadAdminStats]);

  const handlePendingClick = () => {
    navigate('/admin/finance/payment-requests');
  };

  const handleMessagesClick = () => {
    navigate('/admin/messages');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('refresh');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <header className={`admin-header ${isDark ? 'dark' : 'light'}`}>
      <div className="admin-header-left">
        <button
          type="button"
          className="menu-toggle"
          onClick={toggleSidebar}
          title="نمایش/مخفی کردن منو"
          aria-label="Toggle sidebar"
        >
          <span className="menu-toggle-icon">☰</span>
        </button>

        <Link to="/admin" className="admin-header-brand">
          <span className="admin-brand-icon">🎛️</span>
          <div className="admin-brand-text">
            <span className="admin-brand-title">پنل مدیریت</span>
            <span className="admin-brand-subtitle">ژورنال حرفه‌ای ترید</span>
          </div>
        </Link>
      </div>

      <div className="admin-header-right">
        <button
          className="admin-header-btn admin-messages-btn"
          onClick={handleMessagesClick}
          title={
            unreadMessagesCount > 0
              ? `${unreadMessagesCount} پیام جدید از کاربران`
              : 'هیچ پیام جدیدی نیست'
          }
        >
          <span className="admin-btn-icon">✉️</span>
          <span className="admin-btn-text">پیام‌ها</span>
          {unreadMessagesCount > 0 && (
            <span className="messages-badge">{unreadMessagesCount}</span>
          )}
        </button>

        <button
          className="admin-header-btn admin-pending-btn"
          onClick={handlePendingClick}
          title={
            pendingCount > 0
              ? `${pendingCount} درخواست پرداخت در انتظار بررسی`
              : 'هیچ درخواست در انتظاری نیست'
          }
        >
          <span className="admin-btn-icon">🔔</span>
          <span className="admin-btn-text">پرداخت‌ها</span>
          {pendingCount > 0 && (
            <span className="pending-badge">{pendingCount}</span>
          )}
        </button>

        <button
          className="admin-header-btn admin-theme-btn"
          onClick={toggleTheme}
          title={isDark ? 'حالت روشن' : 'حالت تاریک'}
        >
          <span className="admin-btn-icon">{isDark ? '☀️' : '🌙'}</span>
          <span className="admin-btn-text">{isDark ? 'روشن' : 'تاریک'}</span>
        </button>

        <Link
          to="/dashboard"
          className="admin-header-btn admin-home-btn"
          title="بازگشت به داشبورد عمومی"
        >
          <span className="admin-btn-icon">🏠</span>
          <span className="admin-btn-text">داشبورد</span>
        </Link>

        <div className="admin-user-card">
          <div className="admin-user-avatar">
            {user.first_name?.[0] || user.phone_number?.[0] || '👤'}
          </div>
          <div className="admin-user-info">
            <span className="admin-user-name">
              {user.first_name && user.last_name
                ? `${user.first_name} ${user.last_name}`
                : user.full_name || user.phone_number || 'ادمین'}
            </span>
            <span className="admin-user-role">
              <span className="admin-role-dot"></span>
              ادمین
            </span>
          </div>
        </div>

        <button
          className="admin-header-btn admin-logout-btn"
          onClick={handleLogout}
          title="خروج از حساب کاربری"
        >
          <span className="admin-btn-icon">🚪</span>
          <span className="admin-btn-text">خروج</span>
        </button>
      </div>
    </header>
  );
};

export default AdminHeader;