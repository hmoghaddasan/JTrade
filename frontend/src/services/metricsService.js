// frontend/src/services/metricsService.js

import api from './apiService';

const MetricsService = {
  /**
   * دریافت شاخص‌های پیشرفته
   * @param {Object} params - پارامترهای فیلتر
   * @param {number} params.portfolio_id - شناسه پورتفولیو
   * @param {string} params.start_date - تاریخ شروع (YYYY-MM-DD)
   * @param {string} params.end_date - تاریخ پایان (YYYY-MM-DD)
   * @param {string} params.period - دوره ('7d', '30d', '90d', 'all')
   * @returns {Promise} - داده‌های شاخص‌ها
   */
  async getMetrics(params = {}) {
    const queryParams = new URLSearchParams();

    if (params.portfolio_id) {
      queryParams.append('portfolio_id', params.portfolio_id);
    }
    if (params.start_date) {
      queryParams.append('start_date', params.start_date);
    }
    if (params.end_date) {
      queryParams.append('end_date', params.end_date);
    }
    if (params.period) {
      queryParams.append('period', params.period);
    }

    // ✅ اصلاح: حذف `/api/` از ابتدای مسیر (چون baseURL قبلاً شامل آن است)
    const url = `trading/metrics/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    console.log('📊 MetricsService.getMetrics: fetching from', url);

    try {
      const response = await api.get(url);
      return response;
    } catch (error) {
      console.error('❌ MetricsService.getMetrics error:', error);
      throw error;
    }
  },

  /**
   * دریافت داده‌های روند شاخص‌ها
   * @param {Object} params - پارامترهای فیلتر
   * @param {number} params.portfolio_id - شناسه پورتفولیو
   * @param {number} params.days - تعداد روزهای گذشته (پیش‌فرض 90)
   * @returns {Promise} - داده‌های روند
   */
  async getTrend(params = {}) {
    const queryParams = new URLSearchParams();

    if (params.portfolio_id) {
      queryParams.append('portfolio_id', params.portfolio_id);
    }
    if (params.days) {
      queryParams.append('days', params.days);
    }

    // ✅ اصلاح: حذف `/api/` از ابتدای مسیر
    const url = `trading/metrics/trend/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    try {
      const response = await api.get(url);
      return response;
    } catch (error) {
      console.error('❌ MetricsService.getTrend error:', error);
      throw error;
    }
  },

  /**
   * دریافت خلاصه شاخص‌ها برای کارت‌های داشبورد
   * @param {Object} params - پارامترهای فیلتر
   * @returns {Promise} - خلاصه شاخص‌ها
   */
  async getSummary(params = {}) {
    const queryParams = new URLSearchParams();

    if (params.portfolio_id) {
      queryParams.append('portfolio_id', params.portfolio_id);
    }

    // ✅ اصلاح: حذف `/api/` از ابتدای مسیر
    const url = `trading/metrics/summary/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    try {
      const response = await api.get(url);
      return response;
    } catch (error) {
      console.error('❌ MetricsService.getSummary error:', error);
      throw error;
    }
  },
};

export default MetricsService;