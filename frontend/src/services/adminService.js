// frontend/src/services/adminService.js

import api from './apiService';

// ✅ اصلاح: حذف /api از BASE_URL (apiService قبلاً /api دارد)
const BASE_URL = '/admin';

// ============================================
// ✅ تعریف adminService با const
// ============================================
const adminService = {
    // ============================================
    // ===== داشبورد =====
    // ============================================
    getDashboard: () => api.get(`${BASE_URL}/dashboard/`),

    // ============================================
    // ===== کاربران =====
    // ============================================
    getUsers: (params) => api.get(`${BASE_URL}/users/`, { params }),
    getUser: (id) => api.get(`${BASE_URL}/users/${id}/`),
    updateUser: (id, data) => api.put(`${BASE_URL}/users/${id}/update/`, data),
    toggleUser: (id) => api.post(`${BASE_URL}/users/${id}/toggle/`),
    deleteUser: (id) => api.delete(`${BASE_URL}/users/${id}/delete/`),
    sendSms: (data) => api.post(`${BASE_URL}/users/send-sms/`, data),
    exportUsers: () => api.get(`${BASE_URL}/users/export-excel/`, { responseType: 'blob' }),

    // ============================================
    // ===== اشتراک‌ها =====
    // ============================================
    getSubscriptions: (params) => api.get(`${BASE_URL}/subscriptions/`, { params }),
    getSubscription: (id) => api.get(`${BASE_URL}/subscriptions/${id}/`),
    extendSubscription: (id, data) => api.post(`${BASE_URL}/subscriptions/${id}/extend/`, data),
    cancelSubscription: (id) => api.post(`${BASE_URL}/subscriptions/${id}/cancel/`),
    giftSubscription: (data) => api.post(`${BASE_URL}/subscriptions/gift/`, data),
    exportSubscriptions: () => api.get(`${BASE_URL}/subscriptions/export-excel/`, { responseType: 'blob' }),

    // ============================================
    // ===== پلن‌های اشتراک =====
    // ============================================
    getPlans: () => api.get(`${BASE_URL}/subscription-plans/`),
    getPlan: (id) => api.get(`${BASE_URL}/subscription-plans/${id}/`),
    createPlan: (data) => api.post(`${BASE_URL}/subscription-plans/`, data),
    updatePlan: (id, data) => api.put(`${BASE_URL}/subscription-plans/${id}/`, data),
    deletePlan: (id) => api.delete(`${BASE_URL}/subscription-plans/${id}/`),

    // ============================================
    // ===== مالی =====
    // ============================================
    getTransactions: (params) => api.get(`${BASE_URL}/transactions/`, { params }),
    getSalesReport: (params) => api.get(`${BASE_URL}/sales/report/`, { params }),
    exportSales: (params) => api.get(`${BASE_URL}/sales/export/`, { params, responseType: 'blob' }),

    // ============================================
    // ===== تخفیف‌ها =====
    // ============================================
    getDiscounts: (params) => api.get(`${BASE_URL}/discounts/`, { params }),
    getDiscount: (id) => api.get(`${BASE_URL}/discounts/${id}/`),
    createDiscount: (data) => api.post(`${BASE_URL}/discounts/`, data),
    updateDiscount: (id, data) => api.put(`${BASE_URL}/discounts/${id}/`, data),
    deleteDiscount: (id) => api.delete(`${BASE_URL}/discounts/${id}/delete/`),

    // ============================================
    // ===== نمادها =====
    // ============================================
    getSymbols: (params) => api.get(`${BASE_URL}/symbols/`, { params }),
    getSymbol: (id) => api.get(`${BASE_URL}/symbols/${id}/`),
    createSymbol: (data) => api.post(`${BASE_URL}/symbols/`, data),
    updateSymbol: (id, data) => api.put(`${BASE_URL}/symbols/${id}/`, data),
    deleteSymbol: (id) => api.delete(`${BASE_URL}/symbols/${id}/`),

    // ============================================
    // ===== بروکرها =====
    // ============================================
    getBrokers: (params) => api.get(`${BASE_URL}/brokers/`, { params }),
    getBroker: (id) => api.get(`${BASE_URL}/brokers/${id}/`),
    createBroker: (data) => api.post(`${BASE_URL}/brokers/`, data),
    updateBroker: (id, data) => api.put(`${BASE_URL}/brokers/${id}/`, data),
    deleteBroker: (id) => api.delete(`${BASE_URL}/brokers/${id}/`),

    // ============================================
    // ===== مشاوره‌های AI =====
    // ============================================
    getConsultations: (params) => api.get(`${BASE_URL}/consultations/`, { params }),
    getConsultation: (id) => api.get(`${BASE_URL}/consultations/${id}/`),
    getConsultationAnalytics: () => api.get(`${BASE_URL}/consultations/analytics/`),

    // ============================================
    // ===== تریدها =====
    // ============================================
    getTrades: (params) => api.get(`${BASE_URL}/trades/`, { params }),
    getTrade: (id) => api.get(`${BASE_URL}/trades/${id}/`),
    deleteTrade: (id) => api.delete(`${BASE_URL}/trades/${id}/delete/`),
    exportTrades: (params) => api.get(`${BASE_URL}/trades/export-excel/`, { params, responseType: 'blob' }),

    // ============================================
    // ===== پیام‌ها =====
    // ============================================
    getMessages: (params) => api.get(`${BASE_URL}/messages/`, { params }),
    getMessage: (id) => api.get(`${BASE_URL}/messages/${id}/`),
    replyMessage: (id, data) => api.post(`${BASE_URL}/messages/${id}/reply/`, data),
    deleteMessage: (id) => api.delete(`${BASE_URL}/messages/${id}/delete/`),

    // ============================================
    // ===== نسخه‌ها =====
    // ============================================
    getVersions: () => api.get(`${BASE_URL}/versions/`),
    getVersion: (id) => api.get(`${BASE_URL}/versions/${id}/`),
    createVersion: (data) => api.post(`${BASE_URL}/versions/`, data),
    updateVersion: (id, data) => api.put(`${BASE_URL}/versions/${id}/`, data),
    deleteVersion: (id) => api.delete(`${BASE_URL}/versions/${id}/delete/`),

    // ============================================
    // ===== پورتفولیوها =====
    // ============================================
    getPortfolios: (params) => api.get(`${BASE_URL}/portfolios/`, { params }),
    getPortfolio: (id) => api.get(`${BASE_URL}/portfolios/${id}/`),
    createPortfolio: (data) => api.post(`${BASE_URL}/portfolios/`, data),
    updatePortfolio: (id, data) => api.put(`${BASE_URL}/portfolios/${id}/`, data),
    deletePortfolio: (id) => api.delete(`${BASE_URL}/portfolios/${id}/`),

    // ============================================
    // ===== تنظیمات سیستم =====
    // ============================================
    getSettings: () => api.get(`${BASE_URL}/settings/`),
    updateSettings: (data) => api.post(`${BASE_URL}/settings/update/`, data),
};

// ============================================
// ✅ export default
// ============================================
export default adminService;