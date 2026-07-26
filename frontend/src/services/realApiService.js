// frontend/src/services/realApiService.js

import apiClient from './apiService';

const RealApiService = {
  // ============================================
  // احراز هویت (Authentication)
  // ============================================

  /**
   * مرحله اول: ارسال شماره تلفن و دریافت کد تایید
   * @param {string} phoneNumber - شماره تلفن کاربر
   * @returns {Promise} - پاسخ شامل success و message
   */
  sendCode: (phoneNumber) => {
    console.log('📤 Sending code for:', phoneNumber);
    return apiClient.post('/auth/send-code/', { phone_number: phoneNumber });
  },

  /**
   * مرحله دوم: تایید کد و دریافت توکن
   * @param {string} phoneNumber - شماره تلفن کاربر
   * @param {string} code - کد تایید ۶ رقمی
   * @returns {Promise} - پاسخ شامل access, refresh و user
   */
  verifyCode: (phoneNumber, code) => {
    console.log('📤 Verifying code for:', phoneNumber);
    return apiClient.post('/auth/verify-code/', {
      phone_number: phoneNumber,
      code: code
    });
  },

  /**
   * دریافت اطلاعات کاربر جاری
   * @returns {Promise} - اطلاعات کاربر
   */
  getProfile: () => {
    console.log('📤 Getting profile');
    return apiClient.get('/auth/profile/');
  },

  /**
   * به‌روزرسانی اطلاعات کاربر
   * @param {Object} data - داده‌های جدید کاربر
   * @returns {Promise} - اطلاعات به‌روز شده
   */
  updateProfile: (data) => {
    console.log('📤 Updating profile');
    return apiClient.patch('/auth/profile/', data);
  },

  /**
   * خروج از سیستم (غیرفعال کردن توکن)
   * @returns {Promise}
   */
  logout: () => {
    console.log('📤 Logging out');
    return apiClient.post('/auth/logout/');
  },

  // ============================================
  // تریدها (Trading)
  // ============================================

  /**
   * دریافت لیست تریدها
   * @param {Object} params - پارامترهای فیلتر (user_id, date_from, date_to, symbol)
   * @returns {Promise} - لیست تریدها
   */
  getTrades: (params) => {
    console.log('📤 Getting trades with params:', params);
    return apiClient.get('/trading/trades/', { params });
  },

  /**
   * دریافت یک ترید با ID
   * @param {number} id - ID ترید
   * @returns {Promise} - اطلاعات ترید
   */
  getTrade: (id) => {
    console.log('📤 Getting trade:', id);
    return apiClient.get(`/trading/trades/${id}/`);
  },

  /**
   * ایجاد ترید جدید
   * @param {Object} data - داده‌های ترید
   * @returns {Promise} - ترید ایجاد شده
   */
  createTrade: (data) => {
    console.log('📤 Creating trade');
    return apiClient.post('/trading/trades/', data);
  },

  /**
   * به‌روزرسانی ترید
   * @param {number} id - ID ترید
   * @param {Object} data - داده‌های جدید
   * @returns {Promise} - ترید به‌روز شده
   */
  updateTrade: (id, data) => {
    console.log('📤 Updating trade:', id);
    return apiClient.put(`/trading/trades/${id}/`, data);
  },

  /**
   * حذف ترید
   * @param {number} id - ID ترید
   * @returns {Promise}
   */
  deleteTrade: (id) => {
    console.log('📤 Deleting trade:', id);
    return apiClient.delete(`/trading/trades/${id}/`);
  },

  /**
   * دریافت تحلیل‌های دسته‌بندی شده
   * @param {Object} params - پارامترهای تحلیل (group_by, date_from, date_to)
   * @returns {Promise} - داده‌های تحلیل
   */
  getAnalytics: (params) => {
    console.log('📤 Getting analytics with params:', params);
    return apiClient.get('/trading/analytics/', { params });
  },

  // ============================================
  // اشتراک‌ها (Subscriptions)
  // ============================================

  /**
   * دریافت لیست پلن‌های اشتراک از دیتابیس
   * @returns {Promise} - لیست پلن‌ها
   */
  getPlans: () => {
    console.log('📤 Getting plans from database');
    return apiClient.get('/subscription/plans/');
  },

  /**
   * دریافت جزئیات یک پلن
   * @param {number} id - ID پلن
   * @returns {Promise} - اطلاعات پلن
   */
  getPlanDetail: (id) => {
    console.log('📤 Getting plan detail:', id);
    return apiClient.get(`/subscription/plans/${id}/`);
  },

  /**
   * دریافت اشتراک فعلی کاربر
   * @returns {Promise} - اطلاعات اشتراک
   */
// ============================================
// دریافت اطلاعات اشتراک کاربر (برای نمایش جزئیات)
// ============================================
getUserSubscription: () => {
  console.log('📤 Getting user subscription');
  return apiClient.get('/subscription/current/');
},
  /**
   * دریافت تاریخچه اشتراک‌های کاربر
   * @returns {Promise} - لیست اشتراک‌ها
   */
  getSubscriptionHistory: () => {
    console.log('📤 Getting subscription history');
    return apiClient.get('/subscription/history/');
  },

  /**
   * دریافت وضعیت اشتراک کاربر
   * @returns {Promise} - وضعیت اشتراک
   */
  getSubscriptionStatus: () => {
    console.log('📤 Getting subscription status');
    return apiClient.get('/subscription/status/');
  },

  /**
   * خرید اشتراک جدید
   * @param {number} planId - ID پلن
   * @param {string} discountCode - کد تخفیف (اختیاری)
   * @returns {Promise} - اطلاعات پرداخت
   */
  purchaseSubscription: (planId, discountCode) => {
    console.log('📤 Purchasing subscription with plan:', planId);
    return apiClient.post('/subscription/purchase/', {
      plan_id: planId,
      discount_code: discountCode || ''
    });
  },

  /**
   * تمدید اشتراک
   * @param {number} planId - ID پلن
   * @param {string} discountCode - کد تخفیف (اختیاری)
   * @returns {Promise} - اطلاعات پرداخت
   */
  extendSubscription: (planId, discountCode) => {
    console.log('📤 Extending subscription with plan:', planId);
    return apiClient.post('/subscription/extend/', {
      plan_id: planId,
      discount_code: discountCode || ''
    });
  },

  /**
   * اعتبارسنجی کد تخفیف
   * @param {string} code - کد تخفیف
   * @param {number} planId - ID پلن (اختیاری)
   * @returns {Promise} - نتیجه اعتبارسنجی
   */
  validateDiscount: (code, planId) => {
    console.log('📤 Validating discount code:', code);
    return apiClient.post('/subscription/discount/validate/', {
      code: code,
      plan_id: planId
    });
  },

  /**
   * تایید پرداخت
   * @param {string} authority - کد Authority از زرین‌پال
   * @param {string} status - وضعیت پرداخت
   * @returns {Promise} - نتیجه تایید
   */
// frontend/src/services/realApiService.js

verifyPayment: (authority, status, subscriptionId) => {
  console.log('📤 Verifying payment:', { authority, status, subscriptionId });
  return apiClient.get('/subscription/verify-payment/', {
    params: {
      Authority: authority,
      Status: status,
      subscription_id: subscriptionId
    }
  });
},
  // ============================================
  // نسخه‌های نرم‌افزار (App Versions)
  // ============================================

  /**
   * دریافت لیست نسخه‌های نرم‌افزار
   * @returns {Promise} - لیست نسخه‌ها
   */
  getAppVersions: () => {
    console.log('📤 Getting app versions from server');
    return apiClient.get('/system/versions/');
  },

  /**
   * دریافت نسخه فعلی نرم‌افزار
   * @returns {Promise} - نسخه فعلی
   */
  getCurrentVersion: () => {
    console.log('📤 Getting current version');
    return apiClient.get('/system/version/');
  },

  // ============================================
  // پیام‌ها (Messaging)
  // ============================================

  /**
   * دریافت پیام‌های دریافتی
   * @returns {Promise} - لیست پیام‌ها
   */
  getMessages: () => {
    console.log('📤 Getting messages');
    return apiClient.get('/messages/inbox/');
  },

  /**
   * ارسال پیام جدید
   * @param {Object} data - { subject, message }
   * @returns {Promise} - پیام ارسال شده
   */
  sendMessage: (data) => {
    console.log('📤 Sending message');
    return apiClient.post('/messages/send/', data);
  },

  /**
   * دریافت پیام سیستم
   * @returns {Promise} - لیست پیام‌های سیستم
   */
  getSystemMessages: () => {
    console.log('📤 Getting system messages');
    return apiClient.get('/messages/system/');
  },

  /**
   * علامت‌گذاری پیام به عنوان خوانده شده
   * @param {number} id - ID پیام
   * @returns {Promise}
   */
  markAsRead: (id) => {
    console.log('📤 Marking message as read:', id);
    return apiClient.post(`/messages/${id}/read/`);
  },

  // ============================================
  // مدیریت فایل (File Management)
  // ============================================

  /**
   * آپلود اسکرین‌شات برای ترید
   * @param {number} tradeId - ID ترید
   * @param {File} file - فایل تصویر
   * @returns {Promise} - آدرس فایل آپلود شده
   */
  uploadScreenshot: (tradeId, file) => {
    const formData = new FormData();
    formData.append('screenshot', file);
    return apiClient.post(
      `/trading/trades/${tradeId}/upload-screenshot/`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      }
    );
  },

  // ============================================
  // ادمین (Admin)
  // ============================================

  /**
   * دریافت آمار کلی برای ادمین
   * @returns {Promise} - آمار سیستم
   */
  getAdminStats: () => {
    console.log('📤 Getting admin stats');
    return apiClient.get('/admin/stats/');
  },

  /**
   * دریافت لیست کاربران (فقط ادمین)
   * @param {Object} params - پارامترهای فیلتر
   * @returns {Promise} - لیست کاربران
   */
  getAdminUsers: (params) => {
    console.log('📤 Getting admin users');
    return apiClient.get('/admin/users/', { params });
  },

  /**
   * دریافت لاگ‌های سیستم (فقط ادمین)
   * @param {Object} params - پارامترهای فیلتر
   * @returns {Promise} - لیست لاگ‌ها
   */
  getAdminLogs: (params) => {
    console.log('📤 Getting admin logs');
    return apiClient.get('/admin/logs/', { params });
  },
};

export default RealApiService;