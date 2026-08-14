// frontend/src/contexts/AuthContext.js

import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import RealApiService from '../services/realApiService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const initialized = useRef(false);

  // ============================================
  // بررسی توکن - فقط یک بار
  // ============================================
  useEffect(() => {
    if (initialized.current) {
      console.log('⏭️ Auth already initialized, skipping');
      return;
    }

    const checkAuth = async () => {
      console.log('🔍 Checking auth for the first time...');
      let token = localStorage.getItem('accessToken');
      if (!token) {
        token = localStorage.getItem('token');
      }
      console.log('🔍 Token exists:', !!token);

      if (!token) {
        setLoading(false);
        setIsAuthenticated(false);
        initialized.current = true;
        return;
      }

      try {
        const response = await RealApiService.getProfile();
        console.log('✅ User profile loaded:', response.data);

        if (response.data) {
          // ✅ ذخیره اطلاعات کاربر در localStorage
          localStorage.setItem('user', JSON.stringify(response.data));
          setUser(response.data);
          setIsAuthenticated(true);
          setPhoneNumber(response.data.phone_number || '');
        }
      } catch (error) {
        console.error('❌ Error loading user profile:', error);
        if (error.response?.status === 401 || error.response?.status === 403) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('refresh');
          localStorage.removeItem('user');
          setUser(null);
          setIsAuthenticated(false);
          setPhoneNumber('');
        }
      } finally {
        setLoading(false);
        initialized.current = true;
      }
    };

    checkAuth();
  }, []);

  // ============================================
  // sendCode
  // ============================================
  const sendCode = useCallback(async (phone) => {
    setLoading(true);
    try {
      const cleanedPhone = phone.replace(/[^0-9]/g, '');

      if (cleanedPhone.length < 11) {
        return {
          success: false,
          error: 'شماره تلفن باید حداقل ۱۱ رقم باشد'
        };
      }

      const response = await RealApiService.sendVerificationCode(cleanedPhone);
      console.log('📤 Send code response:', response.data);

      const data = response.data;

      if (data.error) {
        return { success: false, error: data.error };
      }

      if (data.success === true || data.message) {
        setPhoneNumber(cleanedPhone);
        return {
          success: true,
          message: data.message || 'کد تایید ارسال شد',
          test_code: data.test_code
        };
      }

      setPhoneNumber(cleanedPhone);
      return { success: true, message: 'کد تایید ارسال شد' };

    } catch (error) {
      console.error('❌ Send code error:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'خطا در ارتباط با سرور'
      };
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // verifyCode - اصلاح شده با ذخیره user
  // ============================================
  const verifyCode = useCallback(async (code) => {
    setLoading(true);
    try {
      console.log('📝 phoneNumber in verifyCode:', phoneNumber);

      if (!phoneNumber) {
        console.error('❌ phoneNumber is empty!');
        return { success: false, error: 'شماره تلفن یافت نشد. لطفاً دوباره تلاش کنید.' };
      }

      console.log('📝 Verifying code for:', phoneNumber);
      const response = await RealApiService.verifyCode(phoneNumber, code);
      console.log('📝 Verify response:', response.data);

      const data = response.data;

      if (data.access && data.refresh) {
        // ذخیره توکن‌ها
        localStorage.setItem('accessToken', data.access);
        localStorage.setItem('token', data.access);
        localStorage.setItem('refreshToken', data.refresh);
        localStorage.setItem('refresh', data.refresh);

        // ✅ ذخیره اطلاعات کاربر در localStorage
        const userData = data.user || data;
        localStorage.setItem('user', JSON.stringify(userData));

        setUser(userData);
        setIsAuthenticated(true);
        setPhoneNumber(userData.phone_number || phoneNumber);

        console.log('✅ User authenticated, tokens and user stored');
        console.log('🔑 Access token saved:', data.access.substring(0, 20) + '...');
        console.log('👤 User saved:', userData.phone_number);

        return { success: true };
      }

      if (data.success === true && data.access) {
        localStorage.setItem('accessToken', data.access);
        localStorage.setItem('token', data.access);
        if (data.refresh) {
          localStorage.setItem('refreshToken', data.refresh);
          localStorage.setItem('refresh', data.refresh);
        }

        // ✅ ذخیره اطلاعات کاربر در localStorage
        const userData = data.user || data;
        localStorage.setItem('user', JSON.stringify(userData));

        setUser(userData);
        setIsAuthenticated(true);
        setPhoneNumber(userData.phone_number || phoneNumber);

        console.log('✅ User authenticated, tokens and user stored');
        return { success: true };
      }

      if (data.error) {
        return { success: false, error: data.error };
      }

      return { success: false, error: 'خطا در تایید کد' };

    } catch (error) {
      console.error('❌ Verify code error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'خطا در تایید کد'
      };
    } finally {
      setLoading(false);
    }
  }, [phoneNumber]);

  // ============================================
  // خروج از سیستم
  // ============================================
  const logout = useCallback(async () => {
    try {
      await RealApiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('refresh');
      localStorage.removeItem('user');
      setUser(null);
      setIsAuthenticated(false);
      setPhoneNumber('');
      initialized.current = false;
    }
  }, []);

  // ============================================
  // به‌روزرسانی کاربر
  // ============================================
  const updateUser = useCallback((userData) => {
    setUser(userData);
    if (userData?.phone_number) {
      setPhoneNumber(userData.phone_number);
    }
    // ✅ به‌روزرسانی localStorage
    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData));
    }
  }, []);

  // ============================================
  // مقدار Context
  // ============================================
  const value = {
    user,
    loading,
    phoneNumber,
    setPhoneNumber,
    isAuthenticated,
    sendCode,
    verifyCode,
    logout,
    updateUser,
    getFullName: () => {
      if (!user) return '';
      return `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.phone_number;
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// ============================================
// Hook استفاده از Auth
// ============================================
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;