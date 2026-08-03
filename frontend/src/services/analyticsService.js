// frontend/src/services/analyticsService.js

import apiService from './apiService';

/**
 * سرویس مدیریت درخواست‌های مربوط به تحلیل دسته‌بندی شده
 */
const AnalyticsService = {
  /**
   * دریافت داده‌های تحلیل دسته‌بندی شده
   * @param {Object} params - پارامترهای کوئری
   * @param {string} params.category_by - معیار دسته‌بندی (day_of_week, symbol, trade_type, ...)
   * @param {string} params.date_from - تاریخ شروع (YYYY-MM-DD)
   * @param {string} params.date_to - تاریخ پایان (YYYY-MM-DD)
   * @param {string} params.symbol - فیلتر نماد
   * @param {string} params.trade_type - فیلتر نوع ترید (Buy/Sell)
   * @param {string} params.status - فیلتر وضعیت (win/loss/breakeven)
   * @returns {Promise} پاسخ API شامل summary, categories, distribution
   */
  async getAnalytics(params = {}) {
    try {
      // ✅ مسیر صحیح با پیشوند trading/ مطابق با urlconf بک‌اند
      const response = await apiService.get('/trading/analytics/', { params });
      return response;
    } catch (error) {
      console.error('❌ Error fetching analytics:', error);
      // propagate error to caller
      throw error;
    }
  }
};

export default AnalyticsService;