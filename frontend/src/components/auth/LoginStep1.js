// frontend/src/components/auth/LoginStep1.js
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './auth.css';

const LoginStep1 = ({ onCodeSent }) => {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { sendCode } = useAuth();
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

    const result = await sendCode(cleanedPhone);
    if (result.success) {
      if (onCodeSent) {
        onCodeSent();
      }
    } else {
      setError(result.error || 'خطا در ارسال کد تایید');
    }
    setLoading(false);
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
      </div>
    </div>
  );
};

export default LoginStep1;