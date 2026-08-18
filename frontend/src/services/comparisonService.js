// frontend/src/services/comparisonService.js

import apiClient from './apiService';

const ComparisonService = {
    /**
     * دریافت داده‌های کامل مقایسه پورتفولیوها
     * @param {Object} params - پارامترهای فیلتر
     * @param {string} params.start_date - تاریخ شروع
     * @param {string} params.end_date - تاریخ پایان
     * @returns {Promise} داده‌های مقایسه
     */
    getComparisonData: async (params = {}) => {
        try {
            const queryParams = new URLSearchParams();
            if (params.start_date) queryParams.append('start_date', params.start_date);
            if (params.end_date) queryParams.append('end_date', params.end_date);

            const url = `trading/portfolios/compare/${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
            const response = await apiClient.get(url);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('❌ Error fetching comparison data:', error);
            return {
                success: false,
                error: error.response?.data?.error || 'خطا در دریافت داده‌های مقایسه'
            };
        }
    },

    /**
     * دریافت خلاصه مقایسه پورتفولیوها (برای کارت‌ها)
     * @param {Object} params - پارامترهای فیلتر
     * @returns {Promise} خلاصه مقایسه
     */
    getComparisonSummary: async (params = {}) => {
        try {
            const queryParams = new URLSearchParams();
            if (params.start_date) queryParams.append('start_date', params.start_date);
            if (params.end_date) queryParams.append('end_date', params.end_date);

            const url = `trading/portfolios/compare/summary/${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
            const response = await apiClient.get(url);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('❌ Error fetching comparison summary:', error);
            return {
                success: false,
                error: error.response?.data?.error || 'خطا در دریافت خلاصه مقایسه'
            };
        }
    },

    /**
     * دریافت داده‌های نمودار مقایسه‌ای
     * @param {Object} params - پارامترها
     * @param {string} params.chart_type - نوع نمودار (cumulative_pnl, radar, bar)
     * @param {string} params.start_date - تاریخ شروع
     * @param {string} params.end_date - تاریخ پایان
     * @returns {Promise} داده‌های نمودار
     */
    getChartData: async (params = {}) => {
        try {
            const queryParams = new URLSearchParams();
            if (params.chart_type) queryParams.append('chart_type', params.chart_type);
            if (params.start_date) queryParams.append('start_date', params.start_date);
            if (params.end_date) queryParams.append('end_date', params.end_date);

            const url = `trading/portfolios/compare/chart/${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
            const response = await apiClient.get(url);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('❌ Error fetching chart data:', error);
            return {
                success: false,
                error: error.response?.data?.error || 'خطا در دریافت داده‌های نمودار'
            };
        }
    }
};

export default ComparisonService;