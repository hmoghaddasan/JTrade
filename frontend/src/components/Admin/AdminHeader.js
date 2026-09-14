// frontend/src/components/Admin/AdminHeader.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
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
      {/* ===== بخش راست هدر (دکمه منو + برند) ===== */}
      <div className="admin-header-left">
        <button
          className="menu-toggle"
          onClick={toggleSidebar}
          title="نمایش/مخفی کردن منو"
        >
          ☰
        </button>

        <Link to="/admin" className="admin-header-brand">
          <span className="admin-brand-icon">🎛️</span>
          <div className="admin-brand-text">
            <span className="admin-brand-title">پنل مدیریت</span>
            <span className="admin-brand-subtitle">ژورنال حرفه‌ای ترید</span>
          </div>
        </Link>
      </div>

      {/* ===== بخش چپ هدر (کاربر + دکمه‌ها) ===== */}
      <div className="admin-header-right">
        {/* دکمه تغییر تم */}
        <button
          className="admin-header-btn admin-theme-btn"
          onClick={toggleTheme}
          title={isDark ? 'حالت روشن' : 'حالت تاریک'}
        >
          <span className="admin-btn-icon">{isDark ? '☀️' : '🌙'}</span>
          <span className="admin-btn-text">{isDark ? 'روشن' : 'تاریک'}</span>
        </button>

        {/* دکمه بازگشت به داشبورد */}
        <Link
          to="/dashboard"
          className="admin-header-btn admin-home-btn"
          title="بازگشت به داشبورد عمومی"
        >
          <span className="admin-btn-icon">🏠</span>
          <span className="admin-btn-text">داشبورد</span>
        </Link>

        {/* اطلاعات کاربر */}
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

        {/* دکمه خروج */}
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