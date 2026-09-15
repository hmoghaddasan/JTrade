// frontend/src/pages/Admin/AdminLayout.js
import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import AdminSidebar from '../../components/Admin/AdminSidebar';
import AdminHeader from '../../components/Admin/AdminHeader';
import './AdminLayout.css';
import './AdminStyles.css';

const AdminLayout = () => {
  // ✅ در دسکتاپ پیش‌فرض باز، در موبایل پیش‌فرض بسته
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth > 992;
    }
    return true;
  });

  const navigate = useNavigate();
  const { isDark } = useTheme();

  // ============================================
  // ✅ بررسی احراز هویت ادمین
  // ============================================
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

  // ============================================
  // ✅ مدیریت resize - بستن/باز کردن خودکار سایدبار
  // ============================================
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 992) {
        // در موبایل، همیشه بسته شود
        setSidebarOpen(false);
      } else {
        // در دسکتاپ، باز شود
        setSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ============================================
  // ✅ توابع کنترل سایدبار
  // ============================================
  const toggleSidebar = () => setSidebarOpen(prev => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  // ✅ اعمال هر دو کلاس "dark" و "dark-theme" برای سازگاری با CSS موجود
  const themeClass = isDark ? 'dark dark-theme' : 'light';

  return (
    <div className={`admin-layout ${themeClass}`}>
      <AdminSidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div className={`admin-main ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <AdminHeader toggleSidebar={toggleSidebar} />
        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;