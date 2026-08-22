// frontend/src/services/disciplineService.js

import apiClient from './apiService';

const BASE_URL = 'trading/discipline/';

export const disciplineService = {
    /**
     * دریافت وضعیت روزانه انضباط
     */
    getStatus: () => apiClient.get(`${BASE_URL}status/`),

    /**
     * بررسی مجاز بودن ثبت ترید
     */
    checkTrade: (tradeData) => apiClient.post(`${BASE_URL}check/`, tradeData),

    /**
     * دریافت گزارش نشت انضباط
     */
    getReport: (days = 30) => apiClient.get(`${BASE_URL}report/`, { params: { days } }),

    /**
     * دریافت تنظیمات انضباطی
     */
    getSettings: () => apiClient.get(`${BASE_URL}settings/`),

    /**
     * به‌روزرسانی تنظیمات انضباطی
     */
    updateSettings: (data) => apiClient.put(`${BASE_URL}settings/`, data),

    /**
     * دریافت داده‌های گرمای پایبندی
     */
    getHeatmap: (days = 90) => apiClient.get(`${BASE_URL}heatmap/`, { params: { days } }),

    /**
     * ثبت بازتاب پس از ترید
     */
    saveReflection: (data) => apiClient.post(`${BASE_URL}reflection/`, data),

    /**
     * دریافت بازتاب‌ها
     */
    getReflections: (limit = 20) => apiClient.get(`${BASE_URL}reflection/`, { params: { limit } }),

    /**
     * ثبت وضعیت عادت روزانه
     */
    saveHabit: (habitName, isDone = true) => apiClient.post(`${BASE_URL}habits/`, { habit_name: habitName, is_done: isDone }),

    /**
     * دریافت وضعیت عادات امروز
     */
    getHabitsStatus: () => apiClient.get(`${BASE_URL}habits/`),

    /**
     * دریافت لیست نقض‌ها
     */
    getViolations: (days = 30) => apiClient.get(`${BASE_URL}violations/`, { params: { days } }),
};

export default disciplineService;