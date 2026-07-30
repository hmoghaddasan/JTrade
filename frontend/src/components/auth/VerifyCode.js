// frontend/src/components/auth/VerifyCode.js

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import './auth.css';

const VerifyCode = ({ onVerifySuccess, onBack }) => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const { verifyCode, phoneNumber, sendCode } = useAuth();
  const { showToast } = useToast();
  const inputRefs = useRef([]);
  const navigate = useNavigate();

  useEffect(() => {
    console.log('📱 VerifyCode mounted, phoneNumber:', phoneNumber);
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [phoneNumber]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  // ============================================
  // تغییر مقدار هر خانه
  // ============================================
  const handleChange = (index, value) => {
    // فقط اعداد پذیرفته می‌شوند
    if (value && !/^[0-9]$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value || '';
    setCode(newCode);

    // حرکت خودکار به خانه بعدی
    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }

    if (error) setError('');
  };

  // ============================================
  // مدیریت کلیدهای صفحه کلید
  // ============================================
  const handleKeyDown = (index, e) => {
    // Backspace - برگشت به خانه قبلی
    if (e.key === 'Backspace') {
      if (!code[index] && index > 0) {
        // اگر خانه خالی است، به خانه قبلی برو
        inputRefs.current[index - 1].focus();
        // خانه قبلی را خالی کن
        const newCode = [...code];
        newCode[index - 1] = '';
        setCode(newCode);
      } else if (code[index]) {
        // اگر خانه پر است، آن را خالی کن
        const newCode = [...code];
        newCode[index] = '';
        setCode(newCode);
      }
      e.preventDefault();
    }

    // کلید Enter - ارسال فرم
    if (e.key === 'Enter') {
      e.preventDefault();
      if (code.every(digit => digit !== '')) {
        handleSubmit(e);
      }
    }
  };

  // ============================================
  // چسباندن کد از کلیپ بورد
  // ============================================
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').trim();
    if (!/^\d+$/.test(pastedData)) return;

    const digits = pastedData.slice(0, 6).split('');
    const newCode = [...code];
    digits.forEach((digit, index) => {
      if (index < 6) {
        newCode[index] = digit;
      }
    });
    setCode(newCode);

    // فوکوس روی اولین خانه خالی یا آخرین خانه
    const lastFilledIndex = Math.min(digits.length - 1, 5);
    if (lastFilledIndex < 5 && inputRefs.current[lastFilledIndex + 1]) {
      inputRefs.current[lastFilledIndex + 1].focus();
    } else {
      inputRefs.current[5].focus();
    }
  };

  // ============================================
  // ارسال فرم
  // ============================================
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);

    const fullCode = code.join('');
    console.log('📤 Submitting code:', fullCode);

    if (fullCode.length < 6) {
      setError('لطفاً کد ۶ رقمی را کامل وارد کنید');
      setLoading(false);
      return;
    }

    try {
      const result = await verifyCode(fullCode);
      console.log('📤 Verify result:', result);

      if (result.success) {
        showToast('✅ ورود با موفقیت انجام شد!', 'success');
        setTimeout(() => {
          if (onVerifySuccess) {
            onVerifySuccess();
          } else {
            navigate('/dashboard', { replace: true });
          }
        }, 100);
      } else {
        setError(result.error || 'کد تایید نامعتبر است');
        showToast('❌ ' + (result.error || 'کد تایید نامعتبر است'), 'error');
        // پاک کردن کد و بازگشت به خانه اول
        setCode(['', '', '', '', '', '']);
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
      }
    } catch (error) {
      console.error('❌ Verification error:', error);
      setError('خطا در تایید کد');
      showToast('❌ خطا در تایید کد', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // ارسال مجدد کد
  // ============================================
  const handleResendCode = async () => {
    if (timeLeft > 0 || loading) return;
    setLoading(true);
    setError('');
    try {
      const result = await sendCode(phoneNumber);
      if (result.success) {
        setTimeLeft(60);
        showToast('📨 کد تایید مجدداً ارسال شد', 'success');
        setCode(['', '', '', '', '', '']);
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
      } else {
        setError(result.error || 'خطا در ارسال مجدد کد');
        showToast('❌ ' + (result.error || 'خطا در ارسال مجدد کد'), 'error');
      }
    } catch (error) {
      console.error('❌ Resend error:', error);
      setError('خطا در ارسال مجدد کد');
      showToast('❌ خطا در ارسال مجدد کد', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // فرمت شماره تلفن
  // ============================================
  const formatPhone = (phone) => {
    if (!phone || phone.length !== 11) return phone;
    return `۰۹۱۲ ${phone.slice(4, 7)} ${phone.slice(7, 9)} ${phone.slice(9, 11)}`;
  };

  // اگر شماره تلفن وجود نداشت، به صفحه ورود برگرد
  if (!phoneNumber) {
    console.warn('⚠️ No phone number, redirecting to login');
    if (onBack) {
      onBack();
    } else {
      navigate('/login', { replace: true });
    }
    return null;
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>📊 ژورنال حرفه‌ای ترید</h1>
          <h2>🔐 تایید کد</h2>
          <p className="phone-display">
            کد تایید به شماره
            <strong className="phone-number-ltr">
              {formatPhone(phoneNumber)}
            </strong>
            ارسال شد
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="code-inputs-container">
            <div className="code-inputs">
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  disabled={loading}
                  className={`code-input ${digit ? 'filled' : ''} ${error ? 'has-error' : ''}`}
                  autoComplete="off"
                />
              ))}
            </div>
          </div>

          {error && <div className="error-message">⚠️ {error}</div>}

          <button
            type="submit"
            disabled={loading || code.some(d => d === '')}
            className="btn-primary"
          >
            {loading ? '⏳ در حال بررسی...' : '✅ تایید کد'}
          </button>

          <div className="resend-section">
            {timeLeft > 0 ? (
              <span>⏳ ارسال مجدد کد در {timeLeft} ثانیه</span>
            ) : (
              <button type="button" onClick={handleResendCode} disabled={loading} className="btn-link">
                📨 ارسال مجدد کد
              </button>
            )}
          </div>

          <button type="button" onClick={onBack} disabled={loading} className="btn-secondary">
            ↩️ بازگشت
          </button>
        </form>
      </div>
    </div>
  );
};

export default VerifyCode;