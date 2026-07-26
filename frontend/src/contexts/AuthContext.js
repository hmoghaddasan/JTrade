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
 // frontend/src/contexts/AuthContext.js (قسمت useEffect)

useEffect(() => {
  if (initialized.current) {
    console.log('⏭️ Auth already initialized, skipping');
    return;
  }

  const checkAuth = async () => {
    console.log('🔍 Checking auth for the first time...');
    const token = localStorage.getItem('accessToken');
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
        setUser(response.data);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('❌ Error loading user profile:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setUser(null);
        setIsAuthenticated(false);
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

      const response = await RealApiService.sendCode(cleanedPhone);
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
  // verifyCode
  // ============================================
  const verifyCode = useCallback(async (code) => {
    setLoading(true);
    try {
      if (!phoneNumber) {
        return { success: false, error: 'شماره تلفن یافت نشد' };
      }

      const response = await RealApiService.verifyCode(phoneNumber, code);
      console.log('📝 Verify response:', response.data);

      const data = response.data;

      if (data.success === true && data.access) {
        const { access, refresh, user } = data;

        localStorage.setItem('accessToken', access);
        localStorage.setItem('refreshToken', refresh);

        setUser(user);
        setIsAuthenticated(true);

        console.log('✅ User authenticated, tokens stored');
        return { success: true };
      }

      if (data.access) {
        const { access, refresh, user } = data;

        localStorage.setItem('accessToken', access);
        localStorage.setItem('refreshToken', refresh);

        setUser(user);
        setIsAuthenticated(true);

        console.log('✅ User authenticated, tokens stored');
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
      localStorage.removeItem('refreshToken');
      setUser(null);
      setIsAuthenticated(false);
      setPhoneNumber('');
      initialized.current = false;
    }
  }, []);

  const value = {
    user,
    loading,
    phoneNumber,
    isAuthenticated,
    sendCode,
    verifyCode,
    logout,
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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;