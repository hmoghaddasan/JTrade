// frontend/src/components/Dashboard.js

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import './Dashboard.css';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <h1>📊 ژورنال حرفه‌ای ترید</h1>
        <div className="header-actions">
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            title={isDark ? 'حالت روز' : 'حالت شب'}
          >
            {isDark ? '☀️' : '🌙'}
          </button>
          <span className="user-name">{user?.first_name || 'کاربر'}</span>
          <button className="logout-btn" onClick={handleLogout}>
            خروج
          </button>
        </div>
      </header>
      <main className="dashboard-content">
        <h2>🏠 داشبورد</h2>
        <p className="welcome-text">به داشبورد خوش آمدید {user?.first_name || ''} عزیز!</p>

        <div className="quick-actions">
          <button
            className="quick-action-btn primary"
            onClick={() => navigate('/trades/new')}
          >
            <span className="action-icon">➕</span>
            <span className="action-label">ترید جدید</span>
          </button>
          <button
            className="quick-action-btn secondary"
            onClick={() => navigate('/trades')}
          >
            <span className="action-icon">📈</span>
            <span className="action-label">لیست تریدها</span>
          </button>
          <button
            className="quick-action-btn warning"
            onClick={() => {
              console.log('Navigating to reports...');
              navigate('/reports');
            }}
          >
            <span className="action-icon">📊</span>
            <span className="action-label">گزارشات</span>
          </button>
          <button
            className="quick-action-btn info"
            onClick={() => navigate('/profile')}
          >
            <span className="action-icon">👤</span>
            <span className="action-label">پروفایل</span>
          </button>
        </div>

        <div className="stats">
          <div className="stat-card">
            <span className="stat-label">روزهای باقیمانده</span>
            <strong className="stat-value">۲۵</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">تریدهای باقیمانده</span>
            <strong className="stat-value">۴۵</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">وضعیت اشتراک</span>
            <strong className="status-active">فعال ✅</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">کل تریدها</span>
            <strong className="stat-value">۱۲</strong>
          </div>
        </div>

        <div className="theme-info">
          <p>تم فعلی: {isDark ? '🌙 شب' : '☀️ روز'}</p>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;