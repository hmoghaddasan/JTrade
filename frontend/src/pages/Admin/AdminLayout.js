// frontend/src/pages/Admin/AdminLayout.js
import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import AdminSidebar from '../../components/Admin/AdminSidebar';
import AdminHeader from '../../components/Admin/AdminHeader';
import './AdminLayout.css';
import './AdminStyles.css';

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const { isDark } = useTheme();

  useEffect(() => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const userStr = localStorage.getItem('user');

      if (!token) {
        navigate('/login');
        return;
      }

      if (userStr) {
        const user = JSON.parse(userStr);
        if (!user.is_admin) {
          navigate('/dashboard');
          return;
        }
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      navigate('/login');
    }
  }, [navigate]);

  // ✅ اعمال هر دو کلاس "dark" و "dark-theme" برای سازگاری با CSS موجود
  const themeClass = isDark ? 'dark dark-theme' : 'light';

  return (
    <div className={`admin-layout ${themeClass}`}>
      <AdminSidebar isOpen={sidebarOpen} />
      <div className={`admin-main ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <AdminHeader toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;