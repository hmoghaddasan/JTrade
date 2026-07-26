// frontend/src/components/auth/VerifyCode.js
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './auth.css';

const VerifyCode = ({ onVerifySuccess, onBack }) => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const { verifyCode, phoneNumber, sendCode } = useAuth();
  const inputRefs = useRef([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const handleChange = (index, value) => {
    if (value && !/^[0-9]$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value || '';
    setCode(newCode);
    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }
    if (error) setError('');
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (code.every(digit => digit !== '')) {
        handleSubmit(e);
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
    if (inputRefs.current[lastFilledIndex + 1]) {
      inputRefs.current[lastFilledIndex + 1].focus();
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);

    const fullCode = code.join('');
    if (fullCode.length < 6) {
      setError('لطفاً کد ۶ رقمی را کامل وارد کنید');
      setLoading(false);
      return;
    }

    const result = await verifyCode(fullCode);
    if (result.success) {
      if (onVerifySuccess) {
        onVerifySuccess();
      } else {
        navigate('/dashboard', { replace: true });
      }
    } else {
      setError(result.error || 'کد تایید نامعتبر است');
      setCode(['', '', '', '', '', '']);
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }
    }
    setLoading(false);
  };

  const handleResendCode = async () => {
    if (timeLeft > 0 || loading) return;
    setLoading(true);
    setError('');
    const result = await sendCode(phoneNumber);
    if (result.success) {
      setTimeLeft(60);
      setCode(['', '', '', '', '', '']);
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }
    } else {
      setError(result.error || 'خطا در ارسال مجدد کد');
    }
    setLoading(false);
  };

  const formatPhone = (phone) => {
    if (!phone || phone.length !== 11) return phone;
    return `۰۹۱۲ ${phone.slice(4, 7)} ${phone.slice(7, 9)} ${phone.slice(9, 11)}`;
  };

  if (!phoneNumber) {
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
            <div className="code-inputs code-inputs-ltr">
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
                  className={`code-input code-input-ltr ${digit ? 'filled' : ''} ${error ? 'has-error' : ''}`}
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