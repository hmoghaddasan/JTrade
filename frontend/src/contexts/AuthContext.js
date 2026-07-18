// frontend/src/contexts/AuthContext.js

import React, { createContext, useState, useContext, useEffect } from 'react';
import { getCurrentUser } from '../services/mockAuthService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionExpired, setSubscriptionExpired] = useState(false);

  // بررسی توکن هنگام بارگذاری برنامه
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');

      if (token) {
        try {
          // دریافت اطلاعات کاربر از توکن
          const userData = await getCurrentUser();
          setUser(userData);

          if (userData.subscription_expiry) {
            const expiry = new Date(userData.subscription_expiry);
            if (expiry < new Date()) {
              setSubscriptionExpired(true);
            }
          }
        } catch (error) {
          console.error('Error fetching user:', error);
          // اگر توکن نامعتبر است، آن را پاک کن
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          setUser(null);
        }
      }

      setLoading(false);
    };

    checkAuth();
  }, []);

  // تابع ورود - بعد از تایید کد فراخوانی می‌شود
  const login = (userData, accessToken, refreshToken) => {
    // ذخیره توکن‌ها
    if (accessToken) {
      localStorage.setItem('accessToken', accessToken);
    }
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }

    // تنظیم کاربر
    setUser(userData);
    setSubscriptionExpired(false);

    return { success: true };
  };

  // تابع ثبت نام - بعد از تکمیل ثبت نام فراخوانی می‌شود
  const register = (userData, accessToken, refreshToken) => {
    // ذخیره توکن‌ها
    if (accessToken) {
      localStorage.setItem('accessToken', accessToken);
    }
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }

    // تنظیم کاربر
    setUser(userData);
    setSubscriptionExpired(false);

    return { success: true };
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('tempPhoneNumber');
    setUser(null);
    setSubscriptionExpired(false);
  };

  const updateUser = (userData) => {
    setUser(prev => ({ ...prev, ...userData }));
  };

  const checkSubscription = () => {
    if (user && user.subscription_expiry) {
      const expiry = new Date(user.subscription_expiry);
      if (expiry < new Date()) {
        setSubscriptionExpired(true);
        return false;
      }
    }
    return true;
  };

  const value = {
    user,
    loading,
    subscriptionExpired,
    login,
    register,
    logout,
    updateUser,
    checkSubscription,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};