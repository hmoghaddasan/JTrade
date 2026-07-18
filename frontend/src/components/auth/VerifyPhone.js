// frontend/src/components/auth/VerifyPhone.js

import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const VerifyPhone = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { verify } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const phoneNumber = location.state?.phone_number || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!code || code.length !== 6) {
      setError('کد تایید باید ۶ رقم باشد');
      setLoading(false);
      return;
    }

    const result = await verify(phoneNumber, code);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'کد تایید نامعتبر است');
    }

    setLoading(false);
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a237e, #0d47a1)',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '16px',
        maxWidth: '400px',
        width: '100%',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        textAlign: 'center'
      }}>
        <h1 style={{ color: '#1a237e', marginBottom: '8px' }}>📱 تایید شماره تلفن</h1>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          کد ۶ رقمی ارسال شده به {phoneNumber} را وارد کنید
        </p>

        {error && (
          <div style={{
            background: '#ffebee',
            color: '#c62828',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="کد ۶ رقمی"
            maxLength="6"
            style={{
              width: '100%',
              padding: '16px',
              border: '2px solid #e0e0e0',
              borderRadius: '8px',
              fontSize: '24px',
              textAlign: 'center',
              letterSpacing: '8px',
              marginBottom: '20px',
              boxSizing: 'border-box'
            }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: 'linear-gradient(135deg, #1a237e, #0d47a1)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '18px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            {loading ? 'در حال تایید...' : 'تایید'}
          </button>
        </form>

        <div style={{ marginTop: '20px' }}>
          <Link to="/register" style={{ color: '#1a237e' }}>بازگشت به ثبت نام</Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyPhone;