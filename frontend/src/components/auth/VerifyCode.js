// frontend/src/components/auth/VerifyCode.js

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import AuthBackground from './AuthBackground';
import './auth.css';

const VerifyCode = ({ onVerifySuccess, onBack }) => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);
  const { verifyCode, phoneNumber, sendCode } = useAuth();
  const { showToast } = useToast();
  const inputRefs = useRef([]);
  const navigate = useNavigate();
  const isSubmitting = useRef(false);

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
  // ✅ اصلاح شده - حذف صفر اضافی ابتدای شماره
  // ============================================
  const formatPhone = (phone) => {
    if (!phone) return '';

    // فقط اعداد را نگه دار
    const cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.length === 0) return phone;

    // اگر شماره ۱۱ رقمی است (با صفر ابتدا)، آن را فرمت کن
    if (cleaned.length === 11) {
      // ۰۹۱۵۵۵۱۱۳۹۳ → ۰۹۱۵ ۵۵۱ ۱۳ ۹۳
      const firstFour = cleaned.slice(0, 4);   // "0915"
      const secondThree = cleaned.slice(4, 7); // "551"
      const thirdTwo = cleaned.slice(7, 9);    // "13"
      const fourthTwo = cleaned.slice(9, 11);  // "93"
      return `۰${firstFour.slice(1)} ${secondThree} ${thirdTwo} ${fourthTwo}`;
      // خروجی: "۰۹۱۵ ۵۵۱ ۱۳ ۹۳"
    }

    // اگر شماره ۱۰ رقمی است (بدون صفر اول)
    if (cleaned.length === 10) {
      // ۹۱۵۵۵۱۱۳۹۳ → ۰۹۱۵ ۵۵۱ ۱۳ ۹۳
      const firstFour = cleaned.slice(0, 4);   // "9155"
      const secondThree = cleaned.slice(4, 7); // "511"
      const thirdTwo = cleaned.slice(7, 9);    // "13"
      const fourthTwo = cleaned.slice(9, 11);  // "93"
      return `۰${firstFour} ${secondThree} ${thirdTwo} ${fourthTwo}`;
      // خروجی: "۰۹۱۵۵ ۵۱۱ ۱۳ ۹۳"
    }

    // در غیر این صورت، شماره را با یک صفر در ابتدا نمایش بده
    return `۰${cleaned}`;
  };

  const handleChange = (index, value) => {
    if (value && !/^[0-9]$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value || '';
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }

    if (error) setError('');

    const fullCode = newCode.join('');
    if (fullCode.length === 6 && !loading && !isSubmitting.current) {
      isSubmitting.current = true;
      setTimeout(() => {
        handleSubmit(newCode);
      }, 200);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!code[index] && index > 0) {
        inputRefs.current[index - 1].focus();
        const newCode = [...code];
        newCode[index - 1] = '';
        setCode(newCode);
      } else if (code[index]) {
        const newCode = [...code];
        newCode[index] = '';
        setCode(newCode);
      }
      e.preventDefault();
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (code.every(digit => digit !== '') && !loading && !isSubmitting.current) {
        isSubmitting.current = true;
        handleSubmit(code);
      }
    }
  };

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

    const lastFilledIndex = Math.min(digits.length - 1, 5);
    if (lastFilledIndex < 5 && inputRefs.current[lastFilledIndex + 1]) {
      inputRefs.current[lastFilledIndex + 1].focus();
    } else {
      inputRefs.current[5].focus();
    }

    if (digits.length >= 6 && !loading && !isSubmitting.current) {
      isSubmitting.current = true;
      setTimeout(() => {
        handleSubmit(newCode);
      }, 300);
    }
  };

  const handleSubmit = async (codeArray) => {
    const currentCode = codeArray || code;
    const fullCode = currentCode.join('');

    if (fullCode.length < 6) {
      setError('لطفاً کد ۶ رقمی را کامل وارد کنید.');
      setLoading(false);
      isSubmitting.current = false;
      return;
    }

    setError('');
    setLoading(true);

    console.log('📤 Submitting code:', fullCode);

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
        setCode(['', '', '', '', '', '']);
        isSubmitting.current = false;
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
      setTimeout(() => {
        isSubmitting.current = false;
      }, 500);
    }
  };

  const handleResendCode = async () => {
    if (timeLeft > 0 || loading) return;
    setLoading(true);
    setError('');
    try {
      const result = await sendCode(phoneNumber);
      if (result.success) {
        setTimeLeft(120);
        showToast('📨 کد تایید مجدداً ارسال شد.', 'success');
        setCode(['', '', '', '', '', '']);
        isSubmitting.current = false;
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
    <AuthBackground>
      <div className="auth-card">
        <div className="auth-header">
          <h1>📊 ژورنال حرفه‌ای ترید</h1>
          <h2>🔐 تایید کد</h2>
          <p className="phone-display">
            کد تایید به شماره
            <strong className="phone-number-ltr" style={{ direction: 'ltr', unicodeBidi: 'embed' }}>
              {formatPhone(phoneNumber)}
            </strong>
            ارسال شد
          </p>
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="auth-form">
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
            onClick={(e) => {
              e.preventDefault();
              if (!loading && !isSubmitting.current) {
                isSubmitting.current = true;
                handleSubmit(code);
              }
            }}
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
    </AuthBackground>
  );
};

export default VerifyCode;