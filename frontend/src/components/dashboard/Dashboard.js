// frontend/src/components/dashboard/Dashboard.js

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2>🏠 داشبورد</h2>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        خوش آمدید {user?.first_name || 'کاربر'} عزیز
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '14px', color: '#666' }}>روزهای باقیمانده</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1a237e' }}>25 روز</div>
        </div>
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '14px', color: '#666' }}>تریدهای باقیمانده</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1a237e' }}>45 عدد</div>
        </div>
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '14px', color: '#666' }}>وضعیت اشتراک</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2e7d32' }}>فعال</div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '16px'
      }}>
        <button
          onClick={() => navigate('/trades/new')}
          style={{
            padding: '20px',
            background: '#2e7d32',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '500'
          }}
        >
          ➕ ترید جدید
        </button>
        <button
          onClick={() => navigate('/trades')}
          style={{
            padding: '20px',
            background: '#0d47a1',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '500'
          }}
        >
          📈 لیست تریدها
        </button>
        <button
          onClick={() => navigate('/reports')}
          style={{
            padding: '20px',
            background: '#f57f17',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '500'
          }}
        >
          📊 گزارشات
        </button>
        <button
          onClick={() => navigate('/messages')}
          style={{
            padding: '20px',
            background: '#00695c',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '500'
          }}
        >
          💬 پیام‌ها
        </button>
      </div>
    </div>
  );
};

export default Dashboard;