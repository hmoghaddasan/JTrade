// frontend/src/components/auth/LoginStep1.js

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import RealApiService from '../../services/realApiService';
import AuthBackground from './AuthBackground';
import './auth.css';

const LoginStep1 = ({ onCodeSent }) => {
  const { setPhoneNumber } = useAuth();
  const { showToast } = useToast();

  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showBrowserWarning, setShowBrowserWarning] = useState(true);

  // ✅ مقدار ثابت ۷ روز (بدون درخواست به سرور)
  const trialDays = 7;

  const inputRef = useRef(null);

  // ============================================
  // ✅ تشخیص دقیق مرورگر
  // ============================================
  const getBrowserName = () => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    console.log('📱 User Agent:', userAgent);

    if (userAgent.indexOf('OPR') !== -1 || userAgent.indexOf('Opera') !== -1 || window.opera) {
      return 'Opera';
    }
    if (userAgent.indexOf('SamsungBrowser') !== -1) {
      return 'SamsungBrowser';
    }
    if (userAgent.indexOf('Firefox') !== -1) {
      return 'Firefox';
    }
    if (userAgent.indexOf('Chrome') !== -1 && userAgent.indexOf('Edg') === -1) {
      return 'Chrome';
    }
    if (userAgent.indexOf('Edg') !== -1) {
      return 'Edge';
    }
    if (userAgent.indexOf('Safari') !== -1 && userAgent.indexOf('Chrome') === -1) {
      return 'Safari';
    }
    if (userAgent.indexOf('UCBrowser') !== -1) {
      return 'UCBrowser';
    }
    return 'سایر';
  };

  const browserName = getBrowserName();

  const isSupportedBrowser = () => {
    const supportedBrowsers = ['Chrome', 'Firefox', 'Edge'];
    return supportedBrowsers.includes(browserName);
  };

  const supported = isSupportedBrowser();

  console.log('🌐 Browser detected:', browserName);
  console.log('✅ Is supported:', supported);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const cleanedPhone = phone.replace(/[^0-9]/g, '');

    if (cleanedPhone.length !== 11) {
      setError('شماره تلفن باید ۱۱ رقم باشد');
      setLoading(false);
      return;
    }

    if (!cleanedPhone.startsWith('09')) {
      setError('شماره تلفن باید با 09 شروع شود');
      setLoading(false);
      return;
    }

    try {
      console.log('📤 Sending code to:', cleanedPhone);
      const response = await RealApiService.sendVerificationCode(cleanedPhone);
      console.log('📤 Full response:', response);
      console.log('📤 Response data:', response.data);

      if (response.data && response.data.admin_bypass === true) {
        console.log('👑 Admin bypass detected! Logging in directly...');

        if (response.data.access) {
          localStorage.setItem('accessToken', response.data.access);
        }
        if (response.data.refresh) {
          localStorage.setItem('refreshToken', response.data.refresh);
        }
        if (response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }

        setPhoneNumber(cleanedPhone);
        showToast('👑 ورود مستقیم ادمین با موفقیت انجام شد', 'success');
        window.location.href = '/dashboard';
        return;
      }

      console.log('📱 Normal login flow - showing verify code page');
      setPhoneNumber(cleanedPhone);
      showToast('کد تایید با موفقیت ارسال شد.', 'success');

      if (onCodeSent) {
        console.log('📱 Calling onCodeSent');
        onCodeSent();
      }

    } catch (error) {
      console.error('❌ Error sending verification code:', error);
      console.error('❌ Error response:', error.response);
      setError(error.response?.data?.message || error.response?.data?.error || 'خطا در ارسال کد تایید');
      showToast('خطا در ارسال کد تایید', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseWarning = () => {
    setShowBrowserWarning(false);
  };

  const getWarningMessage = () => {
    switch(browserName) {
      case 'SamsungBrowser':
        return {
          title: 'مرورگر سامسونگ',
          message: 'برخی امکانات ممکن است در مرورگر سامسونگ به درستی کار نکنند.',
          icon: '📱',
          detail: 'لطفاً از Google Chrome یا Mozilla Firefox استفاده کنید.'
        };
      case 'Opera':
        return {
          title: 'مرورگر اپرا',
          message: 'برخی امکانات ممکن است در اپرا به درستی کار نکنند.',
          icon: '🌐',
          detail: 'لطفاً از Google Chrome یا Mozilla Firefox استفاده کنید.'
        };
      case 'UCBrowser':
        return {
          title: 'مرورگر UC',
          message: 'این مرورگر پشتیبانی نمی‌شود.',
          icon: '⚠️',
          detail: 'لطفاً از Google Chrome یا Mozilla Firefox استفاده کنید.'
        };
      case 'Safari':
        return {
          title: 'مرورگر سافاری',
          message: 'برخی امکانات ممکن است در سافاری به درستی کار نکنند.',
          icon: '🍎',
          detail: 'لطفاً از Google Chrome یا Mozilla Firefox استفاده کنید.'
        };
      default:
        return {
          title: 'مرورگر ناشناخته',
          message: 'این مرورگر پشتیبانی نمی‌شود.',
          icon: '❓',
          detail: 'لطفاً از Google Chrome یا Mozilla Firefox استفاده کنید.'
        };
    }
  };

  const warning = getWarningMessage();

  return (
    <AuthBackground>
      {/* ============================================ */}
      {/* ✅ هشدار مرورگر در بالای صفحه */}
      {/* ============================================ */}
      {!supported && showBrowserWarning && (
        <div className="browser-warning-bar-top">
          <button
            className="browser-warning-close-top"
            onClick={handleCloseWarning}
            aria-label="بستن هشدار"
          >
            ✕
          </button>
          <div className="browser-warning-content-top">
            <span className="browser-warning-icon-top">{warning.icon}</span>
            <div className="browser-warning-text-top">
              <strong>{warning.title}</strong>
              <span>{warning.message}</span>
              <span className="browser-warning-detail-top">
                💡 {warning.detail}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo-wrapper">
            <img
              src="/logo.svg"
              alt="JTrade Logo"
              className="auth-logo"
            />
          </div>
          <h1>ژورنال حرفه‌ای ترید</h1>
          <h2>🚀 ورود به حساب کاربری</h2>
        </div>
        <br/>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <p>برای ورود یا ثبت نام، شماره همراه خود را وارد کنید.</p>
            <label>📱 شماره تلفن:</label>
            <input
                ref={inputRef}
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="09123456789"
                disabled={loading}
                className={`phone-input-ltr ${error ? 'has-error' : ''}`}
                maxLength="11"
            />
          </div>

          {error && <div className="error-message">⚠️ {error}</div>}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? '⏳ در حال ارسال...' : '📲 ارسال کد تایید'}
          </button>

          {/* ============================================ */}
          {/* ✅ باکس تست رایگان - برای کاربران جدید */}
          {/* ============================================ */}
          <div className="trial-info-box">
            <div className="trial-info-icon">🎁</div>
            <div className="trial-info-content">
              <strong>کاربر جدید هستید؟</strong>
              <p>
                با ثبت‌نام، <span className="trial-highlight">{trialDays} روز استفاده رایگان</span> از
                تمام امکانات نرم‌افزار را دریافت می‌کنید.
              </p>
            </div>
          </div>
        </form>
        <br/>
        {isMobile && (
            <div className="auth-mobile-warning">
              <span className="mobile-warning-icon">📱</span>
              <div className="mobile-warning-text">
                <strong>توصیه می‌شود از نسخه دسکتاپ استفاده کنید.</strong>
                <span>برای تجربه بهتر و دسترسی کامل به امکانات، لطفاً از رایانه استفاده گردد.</span>
              </div>
            </div>
        )}
      </div>
    </AuthBackground>
  );
};

export default LoginStep1;