// frontend/src/components/common/AppHeader.js

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useConsultation } from '../../contexts/ConsultationContext';
import { usePortfolio } from '../../contexts/PortfolioContext';
import PortfolioSelector from '../PortfolioSelector';
import RealApiService from '../../services/realApiService';
import './AppHeader.css';

const AppHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { hasActiveConsultation } = useConsultation();
  const [appVersion, setAppVersion] = useState('1.0.0');
  const [scrolled, setScrolled] = useState(false);
  const [showTradeDropdown, setShowTradeDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const [lastScrollY, setLastScrollY] = useState(0);

  // ============================================
  // ✅ دریافت نسخه از سرور - مانند Dashboard.js
  // ============================================
  useEffect(() => {
    const loadVersion = async () => {
      try {
        const response = await RealApiService.getCurrentVersion();
        if (response.data && response.data.version_number) {
          setAppVersion(response.data.version_number);
          console.log('📌 Version loaded from server:', response.data.version_number);
        }
      } catch (error) {
        console.warn('⚠️ Unable to fetch version from server, using fallback:', error);
        // استفاده از نسخه پیش‌فرض در صورت خطا
        const envVersion = process.env.REACT_APP_VERSION;
        if (envVersion) {
          setAppVersion(envVersion);
        }
      }
    };
    loadVersion();
  }, []);

  // تشخیص اسکرول - محو شدن عنوان و کلیدها
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // بستن Dropdown با کلیک خارج
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowTradeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // توابع ناوبری
  const handleNewTrade = () => {
    setShowTradeDropdown(false);
    navigate('/trades/new');
  };

  const handleImportCSV = () => {
    setShowTradeDropdown(false);
    navigate('/import');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleGoToMetrics = () => navigate('/advanced-metrics');
  const handleGoToComparison = () => navigate('/portfolio-comparison');
  const handleGoToDiscipline = () => navigate('/discipline');
  const handleGoToDashboard = () => navigate('/dashboard');

  // تشخیص صفحه فعلی برای هایلایت منوها
  const isActive = (path) => location.pathname === path;

  // اگر کاربر ادمین است، هدر متفاوت نمایش داده نشود
  if (user?.is_admin && location.pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <header className={`app-header ${scrolled ? 'scrolled' : ''} ${isDark ? 'dark' : 'light'}`}>
      {/* ===== بخش بالایی هدر (عنوان + کلیدهای سریع) - در حالت اسکرول مخفی می‌شود ===== */}
      <div className={`header-top ${scrolled ? 'header-top-hidden' : ''}`}>
        <div className="header-left-group">
          <Link to="/dashboard" className="header-title-link">
            <div className="header-left">
              <h1 className="header-title">
                📊 ژورنال حرفه‌ای ترید
                <span className="header-version">v{appVersion}</span>
              </h1>
            </div>
          </Link>
        </div>

        <div className="header-right">
          {/* ===== کلید خانه (داشبورد) - اولین کلید ===== */}
          <button
            className="header-btn home-btn"
            onClick={handleGoToDashboard}
            title="داشبورد اصلی"
          >
            <span className="btn-icon">🏠</span>
            {/* <span className="btn-text">داشبورد</span>*/}
          </button>

          <button
            className="header-btn metrics-btn"
            onClick={handleGoToMetrics}
            title="شاخص‌های پیشرفته"
          >
            <span className="btn-icon">🎯</span>
            <span className="btn-text">شاخص‌ها</span>
          </button>

          <button
            className="header-btn comparison-btn"
            onClick={handleGoToComparison}
            title="مقایسه پورتفولیوها"
          >
            <span className="btn-icon">⚖️</span>
            <span className="btn-text">مقایسه</span>
          </button>

          <button
            className="header-btn discipline-btn"
            onClick={handleGoToDiscipline}
            title="ابزارهای انضباطی"
          >
            <span className="btn-icon">🛡️</span>
            <span className="btn-text">انضباط</span>
          </button>

          <button
            className="header-btn theme-btn"
            onClick={toggleTheme}
            title={isDark ? 'حالت روشن' : 'حالت تاریک'}
          >
            <span className="btn-icon">{isDark ? '☀️' : '🌙'}</span>
            <span className="btn-text">{isDark ? 'روشن' : 'تاریک'}</span>
          </button>

          <button
            className="header-btn logout-btn"
            onClick={handleLogout}
            title="خروج از حساب کاربری"
          >
            <span className="btn-icon">❌</span>
            {/*<span className="btn-text">خروج</span>*/}
          </button>
        </div>
      </div>

      {/* ===== خط فاصله بین عنوان و منوها ===== */}
      <div className="header-divider"></div>

      {/* ===== بخش منوهای اصلی (شش‌گانه + پورتفولیو) - همیشه قابل مشاهده ===== */}
      <div className="header-menu">
        <div className="menu-items">
          {/* منوی ترید جدید - یکپارچه با فلش */}
          <div className="menu-item-wrapper" ref={dropdownRef}>
            <div className="menu-dropdown-container">
              <button
                className="menu-btn primary-btn"
                onClick={handleNewTrade}
                title="ثبت ترید جدید"
              >
                <span className="menu-icon">➕</span>
                <span className="menu-text">ترید جدید</span>
              </button>
              <button
                className="menu-dropdown-toggle"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTradeDropdown(!showTradeDropdown);
                }}
                aria-label="گزینه‌های بیشتر"
              >
                <span className="arrow-icon">▾</span>
              </button>
              {showTradeDropdown && (
                <div className="dropdown-menu">
                  <button className="dropdown-item" onClick={handleNewTrade}>
                    <span className="dropdown-icon">➕</span>
                    ثبت دستی
                  </button>
                  <button className="dropdown-item" onClick={handleImportCSV}>
                    <span className="dropdown-icon">📥</span>
                    انتقال از فایل CSV
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* سایر منوها */}
          <button
            className={`menu-btn secondary-btn ${isActive('/trades') ? 'active' : ''}`}
            onClick={() => navigate('/trades')}
          >
            <span className="menu-icon">📋</span>
            <span className="menu-text">لیست تریدها</span>
          </button>

          <button
            className={`menu-btn success-btn ${isActive('/analytics') ? 'active' : ''}`}
            onClick={() => navigate('/analytics')}
          >
            <span className="menu-icon">🏆</span>
            <span className="menu-text">تحلیل عملکرد</span>
          </button>

          <button
            className={`menu-btn warning-btn ${isActive('/reports') ? 'active' : ''}`}
            onClick={() => navigate('/reports')}
          >
            <span className="menu-icon">📝</span>
            <span className="menu-text">گزارش‌های پیشرفته</span>
          </button>

          <button
            className={`menu-btn ai-btn ${isActive('/ai-consultation') ? 'active' : ''}`}
            onClick={() => navigate('/ai-consultation')}
            disabled={hasActiveConsultation}
          >
            <span className="menu-icon">🧠</span>
            <span className="menu-text">
              {hasActiveConsultation ? '⏳ مشاوره...' : 'مشاور AI'}
            </span>
          </button>

          <button
            className={`menu-btn info-btn ${isActive('/profile') ? 'active' : ''}`}
            onClick={() => navigate('/profile')}
          >
            <span className="menu-icon">👤</span>
            <span className="menu-text">پنل کاربری</span>
          </button>

          {/* ===== سلکتور پورتفولیو ===== */}
          <div className="portfolio-menu-wrapper">
            <div className="portfolio-selector-container">
              <PortfolioSelector />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;