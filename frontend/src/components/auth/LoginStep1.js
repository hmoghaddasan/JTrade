// frontend/src/components/auth/LoginStep1.js

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { sendVerificationCode } from '../../services/mockAuthService';
import './auth.css';

const LoginStep1 = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [testCode, setTestCode] = useState('');
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const validatePhone = (phone) => {
    const pattern = /^09\d{9}$/;
    return pattern.test(phone);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setTestCode('');
    setLoading(true);

    if (!phoneNumber) {
      setError('لطفاً شماره تلفن خود را وارد کنید');
      setLoading(false);
      return;
    }

    if (!validatePhone(phoneNumber)) {
      setError('شماره تلفن باید با 09 شروع شده و 11 رقم باشد');
      setLoading(false);
      return;
    }

    try {
      const response = await sendVerificationCode(phoneNumber);

      if (response.success) {
        localStorage.setItem('tempPhoneNumber', phoneNumber);

        if (response.testCode) {
          setTestCode(response.testCode);
        }

        navigate('/verify', { state: { phoneNumber, testCode: response.testCode } });
      } else {
        setError(response.error || 'خطا در ارسال کد تایید');
      }
    } catch (error) {
      setError('خطا در ارتباط با سرور');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-box">
        <div className="auth-header">
          <h1>📊 ژورنال حرفه‌ای ترید</h1>
          <p>برای ورود یا ثبت نام، شماره تلفن همراه خود را وارد کنید</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        {testCode && (
          <div className="auth-success" style={{
            background: '#e8f5e9',
            color: '#2e7d32',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            🔑 کد تایید (تست): <strong>{testCode}</strong>
            <br />
            <span style={{ fontSize: '12px' }}>این کد در کنسول مرورگر نیز نمایش داده می‌شود</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>شماره تلفن همراه</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
              placeholder="مثلاً 09123456789"
              maxLength="11"
              disabled={loading}
              className="phone-input"
            />
            <span className="field-hint">شماره تلفن را با فرمت 09123456789 وارد کنید</span>
          </div>

          {/* ✅ کلید ورود/ثبت نام وسط‌چین */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'در حال ارسال...' : 'ورود / ثبت نام'}
            </button>
          </div>
        </form>

        <div className="auth-footer">
          <p>با ورود، شرایط و قوانین را می‌پذیرید</p>
        </div>
      </div>
    </div>
  );
};

export default LoginStep1;