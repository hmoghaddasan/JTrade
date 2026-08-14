// frontend/src/components/Admin/AdminHeader.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminHeader.css';

const AdminHeader = ({ toggleSidebar }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : {};
    } catch {
      return {};
    }
  });

  console.log('🟦 AdminHeader rendering');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('refresh');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <header className="admin-header">
      <button className="menu-toggle" onClick={toggleSidebar}>
        ☰
      </button>

      <div className="header-right">
        <div className="user-info">
          <span className="user-name">{user.full_name || user.phone_number || 'ادمین'}</span>
          <span className="user-role">ادمین</span>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          خروج
        </button>
      </div>
    </header>
  );
};

export default AdminHeader;