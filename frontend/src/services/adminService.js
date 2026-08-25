// frontend/src/services/adminService.js
import api from './apiService';

const BASE_URL = '/admin';


const adminService = {
  // ===== داشبورد =====
  getDashboard: () => {
    console.log('✅ getDashboard called!');
    return api.get(`${BASE_URL}/dashboard/`);
  },

  // ===== کاربران =====
  getUsers: (params) => {
    console.log('✅ getUsers called!');
    return api.get(`${BASE_URL}/users/`, { params });
  },
  getUser: (id) => api.get(`${BASE_URL}/users/${id}/`),
  updateUser: (id, data) => api.put(`${BASE_URL}/users/${id}/update/`, data),
  toggleUser: (id) => api.post(`${BASE_URL}/users/${id}/toggle/`),
  deleteUser: (id) => api.delete(`${BASE_URL}/users/${id}/delete/`),
  sendSMS: (data) => api.post(`${BASE_URL}/users/send-sms/`, data),
  exportUsers: (params) => api.get(`${BASE_URL}/users/export-excel/`, { params, responseType: 'blob' }),

  // ===== اشتراک‌ها =====
  getSubscriptions: (params) => api.get(`${BASE_URL}/subscriptions/`, { params }),
  getSubscription: (id) => api.get(`${BASE_URL}/subscriptions/${id}/`),
  extendSubscription: (id, data) => api.post(`${BASE_URL}/subscriptions/${id}/extend/`, data),
  cancelSubscription: (id) => api.post(`${BASE_URL}/subscriptions/${id}/cancel/`),
  giftSubscription: (data) => api.post(`${BASE_URL}/subscriptions/gift/`, data),
  exportSubscriptions: (params) => api.get(`${BASE_URL}/subscriptions/export-excel/`, { params, responseType: 'blob' }),

  // ===== مالی =====
  getTransactions: (params) => api.get(`${BASE_URL}/transactions/`, { params }),
  getSalesReport: (params) => api.get(`${BASE_URL}/sales/report/`, { params }),
  exportSales: (params) => api.get(`${BASE_URL}/sales/export/`, { params, responseType: 'blob' }),

  // ===== تخفیف‌ها =====
  getDiscounts: (params) => api.get(`${BASE_URL}/discounts/`, { params }),
  getDiscount: (id) => api.get(`${BASE_URL}/discounts/${id}/`),
  deleteDiscount: (id) => api.delete(`${BASE_URL}/discounts/${id}/delete/`),

  // ===== نمادها =====
  getSymbols: (params) => api.get(`${BASE_URL}/symbols/`, { params }),
  getSymbol: (id) => api.get(`${BASE_URL}/symbols/${id}/`),
  createSymbol: (data) => api.post(`${BASE_URL}/symbols/`, data),
  updateSymbol: (id, data) => api.put(`${BASE_URL}/symbols/${id}/`, data),
  deleteSymbol: (id) => api.delete(`${BASE_URL}/symbols/${id}/`),

  // ===== بروکرها =====
  getBrokers: (params) => api.get(`${BASE_URL}/brokers/`, { params }),
  getBroker: (id) => api.get(`${BASE_URL}/brokers/${id}/`),
  createBroker: (data) => api.post(`${BASE_URL}/brokers/`, data),
  updateBroker: (id, data) => api.put(`${BASE_URL}/brokers/${id}/`, data),
  deleteBroker: (id) => api.delete(`${BASE_URL}/brokers/${id}/`),

  // ===== مشاوره‌ها =====
  getConsultations: (params) => api.get(`${BASE_URL}/consultations/`, { params }),
  getConsultation: (id) => api.get(`${BASE_URL}/consultations/${id}/`),
  getConsultationAnalytics: () => api.get(`${BASE_URL}/consultations/analytics/`),

  // ===== تریدها =====
  getTrades: (params) => api.get(`${BASE_URL}/trades/`, { params }),
  getTrade: (id) => api.get(`${BASE_URL}/trades/${id}/`),
  deleteTrade: (id) => api.delete(`${BASE_URL}/trades/${id}/delete/`),
  exportTrades: (params) => api.get(`${BASE_URL}/trades/export-excel/`, { params, responseType: 'blob' }),

  // ============================================
  // ===== پیام‌های کاربران (ادمین) =====
  // ============================================
  getMessages: (params) => api.get(`${BASE_URL}/messages/`, { params }),
  getMessage: (id) => api.get(`${BASE_URL}/messages/${id}/`),
  replyMessage: (id, data) => api.post(`${BASE_URL}/messages/${id}/reply/`, data),
  deleteMessage: (id) => api.delete(`${BASE_URL}/messages/${id}/delete/`),

  // ============================================
  // ===== 📢 پیام‌های سیستمی =====
  // ============================================
  // ✅ استفاده از 'messages' (همخوان با مسیر بک‌اند)
  getSystemMessages: (params) => {
    console.log('✅ getSystemMessages called!');
    return api.get('messages/system/', { params });
  },
  getSystemMessage: (id) => {
    return api.get(`messages/system/${id}/`);
  },
  createSystemMessage: (data) => {
    return api.post('messages/system/create/', data);
  },
  updateSystemMessage: (id, data) => {
    return api.put(`messages/system/${id}/update/`, data);
  },
  deleteSystemMessage: (id) => {
    return api.delete(`messages/system/${id}/delete/`);
  },
  toggleSystemMessage: (id) => {
    return api.post(`messages/system/${id}/toggle/`);
  },

  // ============================================
  // ===== نسخه‌ها =====
  // ============================================
  getVersions: () => api.get(`${BASE_URL}/versions/`),
  getVersion: (id) => api.get(`${BASE_URL}/versions/${id}/`),
  createVersion: (data) => api.post(`${BASE_URL}/versions/`, data),
  updateVersion: (id, data) => api.put(`${BASE_URL}/versions/${id}/`),
  deleteVersion: (id) => api.delete(`${BASE_URL}/versions/${id}/delete/`),

  // ============================================
  // ===== تنظیمات =====
  // ============================================
  getSettings: () => api.get(`${BASE_URL}/settings/`),
  updateSettings: (data) => api.put(`${BASE_URL}/settings/update/`, data),
};

// ✅ برای دسترسی در کنسول (دیباگ)
window.adminService = adminService;

export default adminService;