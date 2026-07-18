// frontend/src/components/auth/Login.js

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './auth.css';

const Login = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!phone || phone.length < 11) {
      setError('شماره تلفن معتبر نیست');
      setLoading(false);
      return;
    }
    if (!password || password.length < 6) {
      setError('رمز عبور باید حداقل ۶ کاراکتر باشد');
      setLoading(false);
      return;
    }

    const result = await login(phone, password);
    if (result.success) {
      navigate('/');
    } else {
      setError('خطا در ورود');
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-box">
        <h1>📊 ژورنال حرفه‌ای ترید</h1>
        <p>ورود به حساب کاربری</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} autoComplete="off">
          <input
            type="tel"
            name="login_phone"
            id="login_phone"
            placeholder="شماره تلفن"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={loading}
            required
            autoComplete="off"
          />

          <input
            type="password"
            name="login_password"
            id="login_password"
            placeholder="رمز عبور"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
            autoComplete="current-password"
          />

          <button type="submit" disabled={loading}>
            {loading ? 'در حال ورود...' : 'ورود'}
          </button>
        </form>

        <p style={{ marginTop: '16px' }}>
          حساب ندارید؟ <Link to="/register">ثبت نام</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;