// frontend/src/services/authService.js
import apiService from './apiService';

// ============================================
// احراز هویت (Authentication)
// ============================================

/**
 * ارسال کد تایید به شماره تلفن
 * مسیر: POST /api/auth/send-code/
 */
export const sendVerificationCode = async (phoneNumber) => {
  try {
    console.log('📤 ارسال درخواست کد تایید:', { phoneNumber });

    const response = await apiService.post('/auth/send-code/', {
      phone_number: phoneNumber,
    });

    console.log('📥 پاسخ سرور:', response.data);

    return {
      success: true,
      message: response.data.message || 'کد تایید ارسال شد',
      phoneNumber: response.data.phone_number || phoneNumber,
      testCode: response.data.test_code || null,
    };
  } catch (error) {
    console.error('❌ خطا در ارسال کد تایید:', error);

    // اگر خطای شبکه باشد
    if (!error.response) {
      return {
        success: false,
        error: 'ارتباط با سرور برقرار نشد. لطفاً اتصال اینترنت خود را بررسی کنید.',
      };
    }

    // اگر کاربر قبلاً ثبت نام کرده باشد
    if (error.response?.status === 400) {
      return {
        success: false,
        error: error.response?.data?.error || 'این شماره تلفن قبلاً ثبت شده است. لطفاً وارد شوید.',
      };
    }

    return {
      success: false,
      error: error.response?.data?.error || error.message || 'خطا در ارسال کد تایید',
    };
  }
};

/**
 * تایید کد ارسال شده
 * مسیر: POST /api/auth/verify-code/
 */
export const verifyCode = async (phoneNumber, code) => {
  try {
    console.log('📤 ارسال درخواست تایید کد:', { phoneNumber, code });

    const response = await apiService.post('/auth/verify-code/', {
      phone_number: phoneNumber,
      code: code,
    });

    console.log('📥 پاسخ سرور:', response.data);

    // ذخیره توکن‌ها و اطلاعات کاربر
    if (response.data.access) {
      localStorage.setItem('accessToken', response.data.access);
      localStorage.setItem('refreshToken', response.data.refresh);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return {
      success: true,
      access: response.data.access,
      refresh: response.data.refresh,
      is_new_user: response.data.is_new_user || false,
      user: response.data.user,
      message: response.data.message || 'کد تایید شد',
    };
  } catch (error) {
    console.error('❌ خطا در تایید کد:', error);

    // اگر خطای شبکه باشد
    if (!error.response) {
      return {
        success: false,
        error: 'ارتباط با سرور برقرار نشد. لطفاً اتصال اینترنت خود را بررسی کنید.',
      };
    }

    // خطای 400 - کد نامعتبر
    if (error.response?.status === 400) {
      return {
        success: false,
        error: error.response?.data?.error || 'کد تایید نامعتبر است',
      };
    }

    return {
      success: false,
      error: error.response?.data?.error || error.message || 'کد تایید نامعتبر است',
    };
  }
};

/**
 * تکمیل ثبت‌نام کاربر جدید
 * مسیر: POST /api/auth/register/
 */
export const registerUser = async (userData) => {
  try {
    console.log('📤 ارسال درخواست ثبت‌نام:', userData);

    const response = await apiService.post('/auth/register/', {
      phone_number: userData.phone_number,
      first_name: userData.first_name,
      last_name: userData.last_name,
      email: userData.email || '',
    });

    console.log('📥 پاسخ سرور:', response.data);

    if (response.data.access) {
      localStorage.setItem('accessToken', response.data.access);
      localStorage.setItem('refreshToken', response.data.refresh);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return {
      success: true,
      access: response.data.access,
      refresh: response.data.refresh,
      user: response.data.user,
      message: response.data.message || 'ثبت نام با موفقیت انجام شد',
    };
  } catch (error) {
    console.error('❌ خطا در ثبت‌نام:', error);

    // اگر خطای شبکه باشد
    if (!error.response) {
      return {
        success: false,
        error: 'ارتباط با سرور برقرار نشد. لطفاً اتصال اینترنت خود را بررسی کنید.',
      };
    }

    // خطای 400 - اطلاعات نامعتبر
    if (error.response?.status === 400) {
      return {
        success: false,
        error: error.response?.data?.error || 'اطلاعات وارد شده معتبر نیست',
      };
    }

    return {
      success: false,
      error: error.response?.data?.error || error.message || 'خطا در ثبت‌نام',
    };
  }
};

/**
 * ورود با شماره تلفن و رمز عبور
 * مسیر: POST /api/auth/login/
 */
export const loginWithPassword = async (phoneNumber, password) => {
  try {
    console.log('📤 ارسال درخواست ورود:', { phoneNumber });

    const response = await apiService.post('/auth/login/', {
      phone_number: phoneNumber,
      password: password,
    });

    console.log('📥 پاسخ سرور:', response.data);

    if (response.data.access) {
      localStorage.setItem('accessToken', response.data.access);
      localStorage.setItem('refreshToken', response.data.refresh);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return {
      success: true,
      access: response.data.access,
      refresh: response.data.refresh,
      user: response.data.user,
      message: response.data.message || 'ورود با موفقیت انجام شد',
    };
  } catch (error) {
    console.error('❌ خطا در ورود:', error);

    // اگر خطای شبکه باشد
    if (!error.response) {
      return {
        success: false,
        error: 'ارتباط با سرور برقرار نشد. لطفاً اتصال اینترنت خود را بررسی کنید.',
      };
    }

    // خطای 401 - اطلاعات نادرست
    if (error.response?.status === 401) {
      return {
        success: false,
        error: 'شماره تلفن یا رمز عبور اشتباه است',
      };
    }

    return {
      success: false,
      error: error.response?.data?.error || error.message || 'خطا در ورود',
    };
  }
};

/**
 * خروج از حساب کاربری
 * مسیر: POST /api/auth/logout/
 */
export const logoutUser = async () => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      await apiService.post('/auth/logout/', { refresh: refreshToken });
    }
  } catch (error) {
    // خطا را نادیده بگیر
    console.warn('⚠️ خطا در خروج:', error);
  } finally {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('tempPhoneNumber');
  }
};

/**
 * Refresh Token
 * مسیر: POST /api/auth/token/refresh/
 */
export const refreshToken = async () => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token');
    }

    const response = await apiService.post('/auth/token/refresh/', {
      refresh: refreshToken,
    });

    if (response.data.access) {
      localStorage.setItem('accessToken', response.data.access);
    }

    return {
      success: true,
      access: response.data.access,
    };
  } catch (error) {
    console.error('❌ خطا در Refresh Token:', error);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    return {
      success: false,
      error: error.message || 'خطا در Refresh Token',
    };
  }
};

// ============================================
// پروفایل کاربر (Profile)
// ============================================

/**
 * دریافت اطلاعات کاربر جاری
 * مسیر: GET /api/auth/profile/
 */
export const getCurrentUser = async () => {
  try {
    const response = await apiService.get('/auth/profile/');
    return response.data;
  } catch (error) {
    console.error('❌ خطا در دریافت کاربر:', error);
    return null;
  }
};

/**
 * به‌روزرسانی پروفایل کاربر
 * مسیر: PUT /api/auth/profile/update/
 */
export const updateProfile = async (data) => {
  try {
    console.log('📤 ارسال درخواست به‌روزرسانی پروفایل:', data);

    const response = await apiService.put('/auth/profile/update/', {
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email || '',
    });

    console.log('📥 پاسخ سرور:', response.data);

    // به‌روزرسانی اطلاعات کاربر در localStorage
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const updatedUser = { ...currentUser, ...response.data.user };
    localStorage.setItem('user', JSON.stringify(updatedUser));

    return {
      success: true,
      user: response.data.user,
      message: response.data.message || 'پروفایل با موفقیت به‌روزرسانی شد',
    };
  } catch (error) {
    console.error('❌ خطا در به‌روزرسانی پروفایل:', error);

    if (!error.response) {
      return {
        success: false,
        error: 'ارتباط با سرور برقرار نشد. لطفاً اتصال اینترنت خود را بررسی کنید.',
      };
    }

    return {
      success: false,
      error: error.response?.data?.error || error.message || 'خطا در به‌روزرسانی پروفایل',
    };
  }
};

/**
 * تغییر رمز عبور
 * مسیر: POST /api/auth/change-password/
 */
export const changePassword = async (data) => {
  try {
    const response = await apiService.post('/auth/change-password/', {
      old_password: data.oldPassword,
      new_password: data.newPassword,
      confirm_password: data.confirmPassword,
    });

    return {
      success: true,
      message: response.data.message || 'رمز عبور با موفقیت تغییر کرد',
    };
  } catch (error) {
    console.error('❌ خطا در تغییر رمز عبور:', error);

    if (!error.response) {
      return {
        success: false,
        error: 'ارتباط با سرور برقرار نشد. لطفاً اتصال اینترنت خود را بررسی کنید.',
      };
    }

    return {
      success: false,
      error: error.response?.data?.error || error.message || 'خطا در تغییر رمز عبور',
    };
  }
};

// ============================================
// فراموشی رمز عبور (Forgot Password)
// ============================================

/**
 * درخواست بازیابی رمز عبور
 * مسیر: POST /api/auth/forgot-password/
 */
export const forgotPassword = async (phoneNumber) => {
  try {
    const response = await apiService.post('/auth/forgot-password/', {
      phone_number: phoneNumber,
    });

    return {
      success: true,
      message: response.data.message || 'کد بازیابی به شماره شما ارسال شد',
    };
  } catch (error) {
    console.error('❌ خطا در ارسال کد بازیابی:', error);

    if (!error.response) {
      return {
        success: false,
        error: 'ارتباط با سرور برقرار نشد. لطفاً اتصال اینترنت خود را بررسی کنید.',
      };
    }

    return {
      success: false,
      error: error.response?.data?.error || error.message || 'خطا در ارسال کد بازیابی',
    };
  }
};

/**
 * بازنشانی رمز عبور با کد
 * مسیر: POST /api/auth/reset-password/
 */
export const resetPassword = async (data) => {
  try {
    const response = await apiService.post('/auth/reset-password/', {
      phone_number: data.phone_number,
      code: data.code,
      new_password: data.new_password,
      confirm_password: data.confirm_password,
    });

    return {
      success: true,
      message: response.data.message || 'رمز عبور با موفقیت بازنشانی شد',
    };
  } catch (error) {
    console.error('❌ خطا در بازنشانی رمز عبور:', error);

    if (!error.response) {
      return {
        success: false,
        error: 'ارتباط با سرور برقرار نشد. لطفاً اتصال اینترنت خود را بررسی کنید.',
      };
    }

    return {
      success: false,
      error: error.response?.data?.error || error.message || 'خطا در بازنشانی رمز عبور',
    };
  }
};

// ============================================
// اشتراک (Subscription)
// ============================================

/**
 * دریافت وضعیت اشتراک
 * مسیر: GET /api/auth/subscription-status/
 */
export const getSubscriptionStatus = async () => {
  try {
    const response = await apiService.get('/auth/subscription-status/');
    return response.data;
  } catch (error) {
    console.error('❌ خطا در دریافت وضعیت اشتراک:', error);
    return null;
  }
};

/**
 * بررسی وضعیت اشتراک برای انجام ترید
 * مسیر: GET /api/auth/subscription-check/
 */
export const checkSubscription = async () => {
  try {
    const response = await apiService.get('/auth/subscription-check/');
    return response.data;
  } catch (error) {
    console.error('❌ خطا در بررسی اشتراک:', error);
    return null;
  }
};

// ============================================
// سیستم (System)
// ============================================

/**
 * دریافت پیام‌های سیستم
 * مسیر: GET /api/auth/system/messages/
 */
export const getSystemMessages = async () => {
  try {
    const response = await apiService.get('/auth/system/messages/');
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('❌ خطا در دریافت پیام‌های سیستم:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'خطا در دریافت پیام‌های سیستم',
    };
  }
};

/**
 * دریافت نسخه فعلی برنامه
 * مسیر: GET /api/auth/system/version/
 */
export const getCurrentVersion = async () => {
  try {
    const response = await apiService.get('/auth/system/version/');
    return response.data;
  } catch (error) {
    console.error('❌ خطا در دریافت نسخه:', error);
    return null;
  }
};

/**
 * دریافت تاریخچه نسخه‌ها
 * مسیر: GET /api/auth/system/versions/
 */
export const getAppVersions = async () => {
  try {
    const response = await apiService.get('/auth/system/versions/');
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('❌ خطا در دریافت تاریخچه نسخه‌ها:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'خطا در دریافت تاریخچه نسخه‌ها',
    };
  }
};