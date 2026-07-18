// frontend/src/components/auth/VerifyCode.js

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { verifyCode, resendVerificationCode } from '../../services/mockAuthService';
import './auth.css';

const VerifyCode = () => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);
  const [canResend, setCanResend] = useState(false);
  const [testCode, setTestCode] = useState('');
  const { isDark } = useTheme();
  const { login } = useAuth();  // ✅ استفاده از login از AuthContext
  const navigate = useNavigate();
  const location = useLocation();

  const phoneNumber = location.state?.phoneNumber || localStorage.getItem('tempPhoneNumber') || '';
  const testCodeFromState = location.state?.testCode || '';

  useEffect(() => {
    if (testCodeFromState) {
      setTestCode(testCodeFromState);
    }
  }, [testCodeFromState]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  const isCodeComplete = code.length === 6;

  // frontend/src/components/auth/VerifyCode.js - بخش handleVerify

const handleVerify = async () => {
  setError('');
  setSuccess('');
  setLoading(true);

  try {
    const response = await verifyCode(phoneNumber, code);

    if (response.success) {
      // ✅ ذخیره توکن‌ها
      if (response.access && response.refresh) {
        localStorage.setItem('accessToken', response.access);
        localStorage.setItem('refreshToken', response.refresh);
      }

      // ✅ اگر کاربر جدید است، به صفحه ثبت نام برود
      if (response.is_new_user) {
        // ذخیره شماره تلفن برای صفحه ثبت نام
        localStorage.setItem('tempPhoneNumber', phoneNumber);
        navigate('/register', { state: { phoneNumber, userData: response.user } });
      } else {
        // ✅ کاربر موجود - ورود به سیستم
        login(response.user, response.access, response.refresh);
        localStorage.removeItem('tempPhoneNumber');
        navigate('/');
      }
    } else {
      setError(response.error || 'کد تایید نامعتبر است');
    }
  } catch (error) {
    setError('خطا در ارتباط با سرور');
  } finally {
    setLoading(false);
  }
};
  const handleResend = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    setCanResend(false);
    setTimeLeft(120);

    try {
      const response = await resendVerificationCode(phoneNumber);

      if (response.success) {
        setSuccess('📨 کد جدید ارسال شد');
        if (response.testCode) {
          setTestCode(response.testCode);
        }
      } else {
        setError(response.error || 'خطا در ارسال مجدد کد');
        setCanResend(true);
      }
    } catch (error) {
      setError('خطا در ارتباط با سرور');
      setCanResend(true);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="auth-page">
      <div className="auth-box verify-box">
        <div className="auth-header">
          <h1>📱 تایید شماره تلفن</h1>
          <p>
            کد ۶ رقمی ارسال شده به شماره
            <strong> {phoneNumber}</strong> را وارد کنید
          </p>
        </div>

        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success" style={{
          background: '#e8f5e9',
          color: '#2e7d32',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '14px',
          textAlign: 'center'
        }}>{success}</div>}

        {testCode && (
          <div className="auth-test-code" style={{
            background: '#fff3e0',
            color: '#e65100',
            padding: '10px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px',
            textAlign: 'center',
            border: '1px dashed #f57f17'
          }}>
            🔑 کد تایید (تست): <strong style={{ fontSize: '20px', letterSpacing: '4px' }}>{testCode}</strong>
            <br />
            <span style={{ fontSize: '12px' }}>این کد را در باکس بالا وارد کنید</span>
          </div>
        )}

        <div className="code-input-container">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="کد ۶ رقمی"
            maxLength="6"
            className="code-input"
            autoFocus
          />
          <div className="code-dots">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <span
                key={index}
                className={`code-dot ${code[index] ? 'filled' : ''}`}
              >
                {code[index] || ''}
              </span>
            ))}
          </div>
        </div>

        <div className="verify-actions">
          <button
            className="btn-verify"
            onClick={handleVerify}
            disabled={!isCodeComplete || loading}
          >
            {loading ? 'در حال تایید...' : '✅ تایید'}
          </button>
        </div>

        <div className="timer-section">
          <div className="timer">
            <span className="timer-icon">⏱️</span>
            <span className={`timer-text ${timeLeft < 30 ? 'danger' : ''}`}>
              {formatTime(timeLeft)}
            </span>
          </div>

          <button
            className={`btn-resend ${canResend ? 'active' : 'disabled'}`}
            onClick={handleResend}
            disabled={!canResend || loading}
          >
            {canResend ? '📨 ارسال مجدد کد' : `ارسال مجدد پس از ${formatTime(timeLeft)}`}
          </button>
        </div>

        <div className="back-link">
          <Link to="/login" className="btn-back-link">
            ↩️ تغییر شماره تلفن
          </Link>
        </div>

        <div className="auth-footer">
          <p>کد تایید به شماره شما ارسال شد. در صورت عدم دریافت، روی ارسال مجدد کلیک کنید.</p>
        </div>
      </div>
    </div>
  );
};

export default VerifyCode;