// frontend/src/components/Admin/AdminSidebar.js
import React from 'react';
import { NavLink } from 'react-router-dom';
import './AdminSidebar.css';

const menuItems = [
  { path: '/admin/dashboard', icon: '📊', label: 'داشبورد' },
  { path: '/admin/users', icon: '👤', label: 'کاربران' },
  { path: '/admin/subscriptions', icon: '📦', label: 'اشتراک‌ها' },
  { path: '/admin/finance', icon: '💰', label: 'مالی' },
  { path: '/admin/discounts', icon: '🏷️', label: 'تخفیف‌ها' },
  { path: '/admin/symbols', icon: '💱', label: 'نمادها' },
  { path: '/admin/consultations', icon: '🤖', label: 'مشاوره‌ها' },
  { path: '/admin/trades', icon: '📈', label: 'تریدها' },
  { path: '/admin/messages', icon: '✉️', label: 'پیام‌ها' },
  { path: '/admin/versions', icon: '📌', label: 'نسخه‌ها' },
  { path: '/admin/settings', icon: '⚙️', label: 'تنظیمات' },
];

const AdminSidebar = ({ isOpen }) => {
  console.log('🟦 AdminSidebar rendering, isOpen:', isOpen);

  return (
    <aside className={`admin-sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-brand">
        <span className="brand-icon">🔧</span>
        {isOpen && <span className="brand-text">پنل مدیریت</span>}
      </div>
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            {isOpen && <span className="nav-label">{item.label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default AdminSidebar;