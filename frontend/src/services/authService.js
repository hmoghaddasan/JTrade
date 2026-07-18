// frontend/src/services/authService.js

export const login = async (phoneNumber, password) => {
  // برای تست، یک پاسخ شبیه‌سازی شده برمی‌گردانیم
  return {
    access: 'fake-access-token',
    refresh: 'fake-refresh-token',
    user: {
      id: 1,
      phone_number: phoneNumber,
      first_name: 'علی',
      last_name: 'محمدی',
      is_admin: true,
      subscription_expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      remaining_trades: 50,
      subscription_status: true
    }
  };
};

export const register = async (userData) => {
  return {
    message: 'کد تایید ارسال شد',
    phone_number: userData.phone_number
  };
};

export const verify = async (phoneNumber, code) => {
  return {
    access: 'fake-access-token',
    refresh: 'fake-refresh-token',
    user: {
      id: 1,
      phone_number: phoneNumber,
      first_name: 'علی',
      last_name: 'محمدی',
      is_admin: true,
      subscription_expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      remaining_trades: 50,
      subscription_status: true
    }
  };
};

export const logout = async () => {
  return { success: true };
};

export const getCurrentUser = async () => {
  return {
    id: 1,
    phone_number: '09123456789',
    first_name: 'علی',
    last_name: 'محمدی',
    is_admin: true,
    subscription_expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    remaining_trades: 50,
    subscription_status: true
  };
};