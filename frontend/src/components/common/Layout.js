// frontend/src/components/common/Layout.js

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f5f5',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #1a237e, #0d47a1)',
        color: 'white',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>📊</span>
          <h1 style={{ fontSize: '20px', margin: 0 }}>ژورنال حرفه‌ای ترید</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span>{user?.first_name || 'کاربر'}</span>
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 16px',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            خروج
          </button>
        </div>
      </header>

      {/* Navigation */}
      <nav style={{
        background: 'white',
        padding: '12px 24px',
        display: 'flex',
        gap: '8px',
        borderBottom: '1px solid #e0e0e0',
        flexWrap: 'wrap'
      }}>
        <button onClick={() => navigate('/dashboard')} style={navButtonStyle}>🏠 داشبورد</button>
        <button onClick={() => navigate('/trades')} style={navButtonStyle}>📈 تریدها</button>
        <button onClick={() => navigate('/trades/new')} style={navButtonStyle}>➕ ترید جدید</button>
        <button onClick={() => navigate('/reports')} style={navButtonStyle}>📊 گزارشات</button>
        <button onClick={() => navigate('/messages')} style={navButtonStyle}>💬 پیام‌ها</button>
        <button onClick={() => navigate('/profile')} style={navButtonStyle}>👤 پروفایل</button>
        {user?.is_admin && (
          <button onClick={() => navigate('/admin/dashboard')} style={{...navButtonStyle, background: '#e8eaf6'}}>⚙️ مدیریت</button>
        )}
      </nav>

      {/* Main Content */}
      <main style={{
        flex: 1,
        padding: '24px',
        maxWidth: '1200px',
        width: '100%',
        margin: '0 auto'
      }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{
        background: 'white',
        padding: '16px 24px',
        textAlign: 'center',
        borderTop: '1px solid #e0e0e0',
        color: '#666',
        fontSize: '14px'
      }}>
        © ۱۴۰۳ - ژورنال حرفه‌ای ترید | نسخه ۱.۰.۰
      </footer>
    </div>
  );
};

const navButtonStyle = {
  padding: '8px 16px',
  background: 'transparent',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '14px',
  transition: 'all 0.3s ease',
  color: '#333'
};

export default Layout;