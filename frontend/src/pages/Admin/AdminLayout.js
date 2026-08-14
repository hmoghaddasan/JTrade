// frontend/src/pages/Admin/AdminLayout.js
import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/Admin/AdminSidebar';
import AdminHeader from '../../components/Admin/AdminHeader';
import './AdminLayout.css';
import './AdminStyles.css';  // ✅ اضافه کنید

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // ✅ بررسی از AuthContext به جای localStorage
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const userStr = localStorage.getItem('user');

      console.log('🔍 Checking admin access...');
      console.log('🔍 Token exists:', !!token);
      console.log('🔍 User exists:', !!userStr);

      if (!token) {
        console.log('❌ No token found, redirecting to login');
        navigate('/login');
        return;
      }

      if (userStr) {
        const user = JSON.parse(userStr);
        if (!user.is_admin) {
          console.log('❌ User is not admin, redirecting to dashboard');
          navigate('/dashboard');
          return;
        }
        console.log('✅ Admin user confirmed in AdminLayout');
      } else {
        // ✅ اگر user در localStorage نیست، از API دریافت کن
        console.log('ℹ️ User not in localStorage, fetching from API...');
        // اینجا می‌توانید از API برای دریافت اطلاعات کاربر استفاده کنید
        // یا به سادگی به dashboard هدایت کنید
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      navigate('/login');
    }
  }, [navigate]);

  console.log('🟦 AdminLayout rendering, sidebarOpen:', sidebarOpen);

  return (
    <div className="admin-layout">
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