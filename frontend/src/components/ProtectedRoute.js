// frontend/src/components/ProtectedRoute.js

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading, subscriptionExpired } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        ⏳ در حال بارگذاری...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (subscriptionExpired) {
    return <Navigate to="/subscription/renew" />;
  }

  return children || <Outlet />;
};

export default ProtectedRoute;