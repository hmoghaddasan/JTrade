// frontend/src/components/auth/Register.js

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import RealApiService from '../../services/realApiService';
import AuthBackground from './AuthBackground';
import './auth.css';

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();

  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [code, setCode] = useState('');
  const [verificationId, setVerificationId] = useState(null);

  // ============================================
  // دسته‌بندی‌های پیش‌فرض
  // ============================================
  const DEFAULT_GROUPS = [
    { name: '📊 فارکس', icon: '💱', is_default: true },
    { name: '₿ کریپتو', icon: '₿', is_default: false },
    { name: '📈 شاخص‌ها', icon: '📈', is_default: false },
    { name: '🏆 کالاها', icon: '🏆', is_default: false },
    { name: '📁 شخصی', icon: '📁', is_default: false },
  ];

  // ============================================
  // ایجاد دسته‌بندی‌های پیش‌فرض برای کاربر جدید
  // ============================================
  const createDefaultGroups = async (userId) => {
    try {
      const existingGroups = await RealApiService.getTradeGroups();
      const userGroups = existingGroups.data.results || existingGroups.data || [];
      const hasGroups = userGroups.some(g => g.user_id === userId);

      if (!hasGroups) {
        const promises = DEFAULT_GROUPS.map((group, index) => {
          return RealApiService.createTradeGroup({
            group_name: group.name,
            icon: group.icon,
            user_id: userId,
            is_active: true,
            is_default: group.is_default,
            created_by: userId,
            order_index: index
          });
        });

        await Promise.all(promises);
        console.log('✅ دسته‌بندی‌های پیش‌فرض با موفقیت ایجاد شدند');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ خطا در ایجاد دسته‌بندی‌های پیش‌فرض:', error);
      return false;
    }
  };

  // ============================================
  // مرحله ۱: ارسال کد تایید
  // ============================================
  const handleSendCode = async (e) => {
    e.preventDefault();

    if (phone.length < 11) {
      showToast('شماره تلفن باید ۱۱ رقم باشد', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await RealApiService.sendVerificationCode(phone);
      setVerificationId(response.data.verification_id || response.data.id);
      showToast('کد تایید با موفقیت ارسال شد', 'success');
      setStep(2);
    } catch (error) {
      console.error('Error sending verification code:', error);
      showToast('خطا در ارسال کد تایید', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // مرحله ۲: تایید کد و ثبت‌نام
  // ============================================
  const handleVerifyCode = async (e) => {
    e.preventDefault();

    if (code.length < 4) {
      showToast('کد تایید را وارد کنید', 'error');
      return;
    }

    setLoading(true);
    try {
      const verifyResponse = await RealApiService.verifyCode(phone, code);

      if (!verifyResponse.data.success) {
        showToast('کد تایید نامعتبر است', 'error');
        setLoading(false);
        return;
      }

      const registerData = {
        phone_number: phone,
        first_name: firstName,
        last_name: lastName,
        email: email,
        verification_id: verificationId,
        code: code
      };

      const registerResponse = await RealApiService.register(registerData);

      if (registerResponse.data.success) {
        const userId = registerResponse.data.user_id || registerResponse.data.user?.id || registerResponse.data.id;
        await createDefaultGroups(userId);

        const userData = {
          ...registerResponse.data.user,
          id: userId
        };

        login(userData, registerResponse.data.token);

        showToast('🎉 ثبت‌نام با موفقیت انجام شد!', 'success');
        navigate('/dashboard');
      } else {
        showToast(registerResponse.data.message || 'خطا در ثبت‌نام', 'error');
      }
    } catch (error) {
      console.error('Error during registration:', error);
      showToast('خطا در فرآیند ثبت‌نام', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackground>
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
          <h2>📝 ثبت‌نام در نرم‌افزار</h2>
          <p className="register-subtitle">
            همین حالا ثبت‌نام کنید و از امکانات حرفه‌ای استفاده کنید.
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleSendCode} className="auth-form auth-form-compact">
            <div className="form-group">
              <label>📱 شماره تلفن:</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="09123456789"
                className={`auth-input phone-input-ltr ${phone.length > 0 ? 'filled' : ''}`}
                disabled={loading}
                maxLength="11"
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>👤 نام:</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="نام خود را وارد کنید."
                className="auth-input"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>👤 نام خانوادگی:</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="نام خانوادگی خود را وارد کنید."
                className="auth-input"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>✉️ ایمیل (اختیاری):</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="auth-input"
                disabled={loading}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? '⏳ در حال ارسال...' : '📨 ارسال کد تایید'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="auth-form auth-form-compact">
            <div className="form-group">
              <label>🔑 کد تایید</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="کد ۴ رقمی را وارد کنید."
                className={`auth-input code-input-single ${code.length > 0 ? 'filled' : ''}`}
                disabled={loading}
                maxLength={6}
                required
                autoFocus
              />
              <span className="field-hint">
                کد تایید به شماره <strong>{phone}</strong> ارسال شد.
              </span>
            </div>

            <div className="auth-actions-row">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setStep(1);
                  setCode('');
                }}
                disabled={loading}
              >
                ↩️ بازگشت
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? '⏳ در حال تایید...' : '✅ تایید و ثبت‌نام'}
              </button>
            </div>
          </form>
        )}

        <div className="auth-footer">
          <p>
            قبلاً ثبت‌نام کرده‌اید؟{' '}
            <span className="auth-link" onClick={() => navigate('/login')}>
              ورود به حساب
            </span>
          </p>
        </div>
      </div>
    </AuthBackground>
  );
};

export default Register;