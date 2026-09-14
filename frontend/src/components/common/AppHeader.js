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

  // دریافت نسخه از سرور
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
        const envVersion = process.env.REACT_APP_VERSION;
        if (envVersion) {
          setAppVersion(envVersion);
        }
      }
    };
    loadVersion();
  }, []);

  // تشخیص اسکرول
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

  const isActive = (path) => location.pathname === path;

  if (user?.is_admin && location.pathname.startsWith('/admin')) {
    return null;
  }

  // ============================================
  // ✅ استایل‌های inline - قطعی و بدون نیاز به CSS
  // ============================================
  const headerBtnBase = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    padding: '5px 10px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
    textDecoration: 'none',
    transition: 'all 0.3s ease',
    minHeight: '32px',
    height: '32px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    overflow: 'hidden',
    border: 'none',
    outline: 'none',
  };

  const iconStyle = {
    fontSize: '14px',
    lineHeight: '1',
    background: 'transparent',
    backgroundColor: 'transparent',
    padding: '0',
    margin: '0',
    border: 'none',
    color: 'inherit',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 'auto',
    height: 'auto',
    boxShadow: 'none',
  };

  const textStyle = {
    fontSize: '11px',
    background: 'transparent',
    backgroundColor: 'transparent',
    padding: '0',
    margin: '0',
    border: 'none',
    color: 'inherit',
    display: 'inline-block',
  };

  // استایل‌های رنگی برای هر دکمه (inline)
  const homeBtnStyle = {
    ...headerBtnBase,
    background: 'rgba(100, 180, 255, 0.25)',
    color: '#ffffff',
    border: '1px solid rgba(100, 180, 255, 0.4)',
  };

  const metricsBtnStyle = {
    ...headerBtnBase,
    background: 'rgba(255, 215, 0, 0.25)',
    color: '#ffffff',
    border: '1px solid rgba(255, 215, 0, 0.4)',
  };

  const comparisonBtnStyle = {
    ...headerBtnBase,
    background: 'rgba(0, 230, 200, 0.25)',
    color: '#ffffff',
    border: '1px solid rgba(0, 230, 200, 0.4)',
  };

  const disciplineBtnStyle = {
    ...headerBtnBase,
    background: 'rgba(200, 150, 255, 0.25)',
    color: '#ffffff',
    border: '1px solid rgba(200, 150, 255, 0.4)',
  };

  const themeBtnStyle = {
    ...headerBtnBase,
    background: 'rgba(255, 200, 100, 0.25)',
    color: '#ffffff',
    border: '1px solid rgba(255, 200, 100, 0.4)',
  };

  const logoutBtnStyle = {
    ...headerBtnBase,
    background: 'rgba(255, 100, 100, 0.25)',
    color: '#ffffff',
    border: '1px solid rgba(255, 100, 100, 0.4)',
  };

  // هندلرهای هاور
  const handleHoverIn = (e) => {
    e.currentTarget.style.transform = 'translateY(-2px)';
    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.25)';
  };

  const handleHoverOut = (e) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.12)';
  };

  return (
    <header className={`app-header ${scrolled ? 'scrolled' : ''} ${isDark ? 'dark' : 'light'}`}>
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

        {/* ============================================ */}
        {/* ✅ کلیدهای ردیف بالا با Inline Style */}
        {/* ============================================ */}
        <div className="header-right">
          {/* کلید خانه */}
          <button
            style={homeBtnStyle}
            onClick={handleGoToDashboard}
            onMouseEnter={handleHoverIn}
            onMouseLeave={handleHoverOut}
            title="داشبورد اصلی"
          >
            <span style={iconStyle}>🏠</span>
          </button>

          {/* کلید شاخص‌ها */}
          <button
            style={metricsBtnStyle}
            onClick={handleGoToMetrics}
            onMouseEnter={handleHoverIn}
            onMouseLeave={handleHoverOut}
            title="شاخص‌های پیشرفته"
          >
            <span style={iconStyle}>🎯</span>
            <span style={textStyle}>شاخص‌ها</span>
          </button>

          {/* کلید مقایسه */}
          <button
            style={comparisonBtnStyle}
            onClick={handleGoToComparison}
            onMouseEnter={handleHoverIn}
            onMouseLeave={handleHoverOut}
            title="مقایسه پورتفولیوها"
          >
            <span style={iconStyle}>⚖️</span>
            <span style={textStyle}>مقایسه</span>
          </button>

          {/* کلید انضباط */}
          <button
            style={disciplineBtnStyle}
            onClick={handleGoToDiscipline}
            onMouseEnter={handleHoverIn}
            onMouseLeave={handleHoverOut}
            title="ابزارهای انضباطی"
          >
            <span style={iconStyle}>🛡️</span>
            <span style={textStyle}>انضباط</span>
          </button>

          {/* کلید تم */}
          <button
            style={themeBtnStyle}
            onClick={toggleTheme}
            onMouseEnter={handleHoverIn}
            onMouseLeave={handleHoverOut}
            title={isDark ? 'حالت روشن' : 'حالت تاریک'}
          >
            <span style={iconStyle}>{isDark ? '☀️' : '🌙'}</span>
            <span style={textStyle}>{isDark ? 'روشن' : 'تاریک'}</span>
          </button>

          {/* کلید خروج */}
          <button
            style={logoutBtnStyle}
            onClick={handleLogout}
            onMouseEnter={handleHoverIn}
            onMouseLeave={handleHoverOut}
            title="خروج از حساب کاربری"
          >
            <span style={iconStyle}>❌</span>
          </button>
        </div>
      </div>

      <div className="header-divider"></div>

      {/* ===== منوهای ردیف پایین - بدون تغییر ===== */}
      <div className="header-menu">
        <div className="menu-items">
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