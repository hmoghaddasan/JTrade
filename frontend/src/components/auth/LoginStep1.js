// frontend/src/components/auth/LoginStep1.js

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import RealApiService from '../../services/realApiService';
import './auth.css';

const LoginStep1 = ({ onCodeSent }) => {
  const { setPhoneNumber } = useAuth();  // ✅ دریافت setPhoneNumber
  const { showToast } = useToast();

  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const cleanedPhone = phone.replace(/[^0-9]/g, '');
    if (cleanedPhone.length < 11) {
      setError('شماره تلفن معتبر وارد کنید (حداقل ۱۱ رقم)');
      setLoading(false);
      return;
    }

    try {
      console.log('📤 Sending code to:', cleanedPhone);
      const response = await RealApiService.sendVerificationCode(cleanedPhone);
      console.log('📤 Response:', response.data);

      // ✅ ذخیره شماره تلفن در AuthContext
      setPhoneNumber(cleanedPhone);

      showToast('کد تایید با موفقیت ارسال شد', 'success');

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
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>📊 ژورنال حرفه‌ای ترید</h1>
          <h2>🚀 ورود به حساب کاربری</h2>
          <p>شماره تلفن خود را وارد کنید تا کد تایید برای شما ارسال شود</p>
        </div>

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

        <div className="auth-footer">
          <p>
            ثبت‌نام نکرده‌اید؟{' '}
            <span className="auth-link" onClick={() => window.location.href = '/register'}>
              ثبت‌نام
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginStep1;