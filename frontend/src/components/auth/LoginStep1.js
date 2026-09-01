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
  const inputRef = useRef(null);

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

    // ✅ بررسی شماره تلفن: ۱۱ رقم و شروع با 09
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
      console.log('📤 Response:', response.data);

      setPhoneNumber(cleanedPhone);

      showToast('کد تایید با موفقیت ارسال شد.', 'success');

      if (onCodeSent) {
        console.log('📱 Calling onCodeSent');
        onCodeSent();
      }

    } catch (error) {
      console.error('❌ Error sending verification code:', error);
      setError(error.response?.data?.message || 'خطا در ارسال کد تایید');
      showToast('خطا در ارسال کد تایید', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackground>
      <div className="auth-card">
        <div className="auth-header">
          <h1>📊 ژورنال حرفه‌ای ترید</h1>
          <h2>🚀 ورود به حساب کاربری</h2>
          <p>برای ورود یا ثبت نام، شماره همراه خود را وارد کنید.</p>
        </div>

        {isMobile && (
          <div className="auth-mobile-warning">
            <span className="mobile-warning-icon">📱</span>
            <div className="mobile-warning-text">
              <strong>توصیه می‌شود از نسخه دسکتاپ استفاده کنید.</strong>
              <span>برای تجربه بهتر و دسترسی کامل به امکانات، لطفاً از رایانه استفاده گردد.</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>📱 شماره تلفن</label>
            <input
              ref={inputRef}
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="09120000001"
              disabled={loading}
              className={`phone-input-ltr ${error ? 'has-error' : ''}`}
              maxLength="11"
            />
          </div>

          {error && <div className="error-message">⚠️ {error}</div>}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? '⏳ در حال ارسال...' : '📲 ارسال کد تایید'}
          </button>
        </form>
      </div>
    </AuthBackground>
  );
};

export default LoginStep1;