// frontend/src/components/auth/Register.js

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { registerUser } from '../../services/mockAuthService';
import { useAuth } from '../../contexts/AuthContext';
import './auth.css';

const Register = () => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { isDark } = useTheme();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const phoneNumber = location.state?.phoneNumber || localStorage.getItem('tempPhoneNumber') || '';

  useEffect(() => {
    if (!phoneNumber) {
      navigate('/login');
    }
  }, [phoneNumber, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.first_name.trim()) {
      setError('نام الزامی است');
      setLoading(false);
      return;
    }
    if (!formData.last_name.trim()) {
      setError('نام خانوادگی الزامی است');
      setLoading(false);
      return;
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('ایمیل معتبر نیست');
      setLoading(false);
      return;
    }

    try {
      const response = await registerUser({
        phone_number: phoneNumber,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim()
      });

      if (response.success) {
        if (response.access && response.refresh) {
          localStorage.setItem('accessToken', response.access);
          localStorage.setItem('refreshToken', response.refresh);
        }

        login(response.user, response.access, response.refresh);

        localStorage.removeItem('tempPhoneNumber');
        navigate('/');
      } else {
        setError(response.error || 'خطا در ثبت نام');
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
          <h1>📝 تکمیل ثبت نام</h1>
          <p>برای تکمیل ثبت نام، اطلاعات زیر را وارد کنید</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>شماره تلفن همراه</label>
            <input
              type="tel"
              value={phoneNumber}
              disabled
              className="disabled-input phone-display"
            />
            <span className="field-hint">شماره تلفن تایید شده و قابل تغییر نیست</span>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>نام *</label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                placeholder="نام خود را وارد کنید"
                disabled={loading}
                required
              />
            </div>
            <div className="form-group">
              <label>نام خانوادگی *</label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                placeholder="نام خانوادگی خود را وارد کنید"
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>ایمیل</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="example@email.com"
              disabled={loading}
            />
            <span className="field-hint">ایمیل اختیاری است</span>
          </div>

          {/* ✅ کلید تکمیل ثبت نام وسط‌چین */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'در حال ثبت نام...' : '✅ تکمیل ثبت نام'}
            </button>
          </div>
        </form>

        <div className="auth-footer">
          <p>با ثبت نام، روزهای رایگان شما شروع می‌شود 🎁</p>
        </div>
      </div>
    </div>
  );
};

export default Register;