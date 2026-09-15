// frontend/src/components/Admin/AdminSidebar.js

import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import './AdminSidebar.css';

const menuItems = [
  { path: '/admin/dashboard', icon: '📊', label: 'داشبورد' },
  { path: '/admin/users', icon: '👤', label: 'کاربران' },
  { path: '/admin/subscriptions', icon: '📦', label: 'اشتراک‌ها' },
  { path: '/admin/subscription-plans', icon: '📊', label: 'پلن‌های اشتراک' },

  // ===== منوی مالی با زیرمنو =====
  {
    path: '/admin/finance',
    icon: '💰',
    label: 'مالی',
    submenu: [
      { path: '/admin/finance', icon: '📋', label: 'تراکنش‌ها (درگاه)' },
      { path: '/admin/finance/payment-requests', icon: '💳', label: 'درخواست‌های پرداخت' },
      { path: '/admin/finance/payment-cards', icon: '🏦', label: 'کارت‌های بانکی' },
      { path: '/admin/finance/report', icon: '📊', label: 'گزارش فروش' },
    ]
  },

  { path: '/admin/discounts', icon: '🏷️', label: 'تخفیف‌ها' },
  { path: '/admin/symbols', icon: '💱', label: 'نمادها' },
  { path: '/admin/brokers', icon: '🏢', label: 'بروکرها' },
  { path: '/admin/consultations', icon: '🤖', label: 'مشاوره‌ها' },
  { path: '/admin/trades', icon: '📈', label: 'تریدها' },
  { path: '/admin/portfolios', icon: '📊', label: 'پورتفولیوها' },

  // ===== منوی پیام‌ها =====
  {
    path: '/admin/messages',
    icon: '✉️',
    label: 'پیام‌ها',
    submenu: [
      { path: '/admin/messages', icon: '📨', label: 'پیام‌های کاربران' },
      { path: '/admin/system-messages', icon: '📢', label: 'پیام‌های سیستمی' },
    ]
  },

  { path: '/admin/sms/providers', icon: '📱', label: 'پیامک' },
  { path: '/admin/versions', icon: '📌', label: 'نسخه‌ها' },
  { path: '/admin/settings', icon: '⚙️', label: 'تنظیمات' },
];

const AdminSidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState({
    messages: location.pathname.startsWith('/admin/messages') || location.pathname.startsWith('/admin/system-messages'),
    finance: location.pathname.startsWith('/admin/finance'),
  });

  // ============================================
  // ✅ بستن خودکار سایدبار هنگام تغییر مسیر
  // در همه سایزها (موبایل + دسکتاپ)
  // ============================================
  useEffect(() => {
    if (onClose && isOpen) {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // ============================================
  // ✅ قفل کردن اسکرول body وقتی سایدبار باز است (فقط موبایل)
  // ============================================
  useEffect(() => {
    if (window.innerWidth <= 992) {
      if (isOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const toggleMenu = (menuPath) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuPath]: !prev[menuPath]
    }));
  };

  const isActive = (path) => {
    if (path === '/admin/messages') {
      return location.pathname.startsWith('/admin/messages') || location.pathname.startsWith('/admin/system-messages');
    }
    if (path === '/admin/finance') {
      return location.pathname.startsWith('/admin/finance');
    }
    return location.pathname === path;
  };

  return (
    <>
      {/* ============================================ */}
      {/* ✅ Overlay - فقط در موبایل و وقتی سایدبار باز است */}
      {/* ============================================ */}
      {isOpen && (
        <div
          className="admin-sidebar-overlay"
          onClick={onClose}
        />
      )}

      <aside className={`admin-sidebar ${isOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-brand">
          <span className="brand-icon">🔧</span>
          {isOpen && <span className="brand-text">پنل مدیریت</span>}
        </div>
        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            // اگر آیتم دارای زیرمنو است
            if (item.submenu) {
              const menuKey = item.path.replace('/admin/', '');
              const isExpanded = expandedMenus[menuKey] || false;
              const isActiveParent = isActive(item.path);

              return (
                <div key={item.path} className="nav-group">
                  <div
                    className={`nav-link nav-parent ${isActiveParent ? 'active' : ''}`}
                    onClick={() => isOpen && toggleMenu(menuKey)}
                    style={{ cursor: isOpen ? 'pointer' : 'default' }}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    {isOpen && (
                      <>
                        <span className="nav-label">{item.label}</span>
                        <span className="nav-arrow">{isExpanded ? '▼' : '▶'}</span>
                      </>
                    )}
                  </div>
                  {isOpen && isExpanded && (
                    <div className="nav-submenu">
                      {item.submenu.map((sub) => (
                        <NavLink
                          key={sub.path}
                          to={sub.path}
                          end
                          className={({ isActive: isSubActive }) =>
                            `nav-link nav-sub ${isSubActive ? 'active' : ''}`
                          }
                        >
                          <span className="nav-icon">{sub.icon}</span>
                          <span className="nav-label">{sub.label}</span>
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            // آیتم معمولی
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive: isNavActive }) =>
                  `nav-link ${isNavActive ? 'active' : ''}`
                }
              >
                <span className="nav-icon">{item.icon}</span>
                {isOpen && <span className="nav-label">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

export default AdminSidebar;