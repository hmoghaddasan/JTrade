// frontend/src/services/ruleService.js

import apiClient from './apiService';

// ============================================
// سرویس قوانین معاملاتی
// ============================================
// ✅ اصلاح: API_BASE بدون 'api/' و بدون اسلش ابتدایی
const API_BASE = 'trading';

const RuleService = {
  /**
   * دریافت لیست قوانین معاملاتی کاربر
   * @returns {Promise} لیست قوانین
   */
  getRules: async () => {
    try {
      const response = await apiClient.get(`${API_BASE}/rules/`);
      return {
        success: true,
        data: response.data || []
      };
    } catch (error) {
      console.error('❌ Error fetching rules:', error);
      return {
        success: false,
        data: [],
        error: error.response?.data?.error || 'خطا در دریافت قوانین'
      };
    }
  },

  /**
   * ایجاد قانون جدید
   * @param {Object} ruleData - اطلاعات قانون
   * @param {string} ruleData.rule_text - متن قانون
   * @param {string} ruleData.category - دسته‌بندی (entry, exit, risk, psychology, time, general)
   * @param {boolean} ruleData.is_active - فعال/غیرفعال
   * @param {boolean} ruleData.is_required - اجباری/اختیاری
   * @param {number} ruleData.order_index - ترتیب نمایش
   * @returns {Promise} قانون ایجاد شده
   */
  createRule: async (ruleData) => {
    try {
      const response = await apiClient.post(`${API_BASE}/rules/create/`, ruleData);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating rule:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'خطا در ایجاد قانون'
      };
    }
  },

  /**
   * به‌روزرسانی قانون
   * @param {number} ruleId - شناسه قانون
   * @param {Object} ruleData - اطلاعات جدید
   * @returns {Promise} قانون به‌روزرسانی شده
   */
  updateRule: async (ruleId, ruleData) => {
    try {
      const response = await apiClient.put(`${API_BASE}/rules/${ruleId}/`, ruleData);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error updating rule:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'خطا در به‌روزرسانی قانون'
      };
    }
  },

  /**
   * حذف قانون (غیرفعال کردن)
   * @param {number} ruleId - شناسه قانون
   * @returns {Promise} نتیجه حذف
   */
  deleteRule: async (ruleId) => {
    try {
      const response = await apiClient.delete(`${API_BASE}/rules/${ruleId}/`);
      return {
        success: true,
        message: response.data?.message || 'قانون با موفقیت حذف شد'
      };
    } catch (error) {
      console.error('❌ Error deleting rule:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'خطا در حذف قانون'
      };
    }
  },

  /**
   * تغییر ترتیب قوانین
   * @param {Array<number>} ruleIds - لیست شناسه‌ها به ترتیب جدید
   * @returns {Promise} نتیجه تغییر ترتیب
   */
  reorderRules: async (ruleIds) => {
    try {
      const response = await apiClient.post(`${API_BASE}/rules/reorder/`, { rule_ids: ruleIds });
      return {
        success: true,
        message: response.data?.message || 'ترتیب با موفقیت به‌روزرسانی شد'
      };
    } catch (error) {
      console.error('❌ Error reordering rules:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'خطا در تغییر ترتیب'
      };
    }
  },

  /**
   * دریافت گزارش پایبندی به قوانین
   * @param {Object} params - پارامترهای فیلتر (اختیاری)
   * @param {string} params.portfolio_id - فیلتر بر اساس پورتفولیو
   * @param {string} params.start_date - تاریخ شروع
   * @param {string} params.end_date - تاریخ پایان
   * @returns {Promise} گزارش پایبندی
   */
  getRulesReport: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.portfolio_id) queryParams.append('portfolio_id', params.portfolio_id);
      if (params.start_date) queryParams.append('start_date', params.start_date);
      if (params.end_date) queryParams.append('end_date', params.end_date);

      const url = `${API_BASE}/rules/report/${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await apiClient.get(url);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error fetching rules report:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'خطا در دریافت گزارش'
      };
    }
  },

  /**
   * دریافت قوانین دسته‌بندی شده
   * @returns {Promise} قوانین دسته‌بندی شده
   */
  getGroupedRules: async () => {
    try {
      const response = await RuleService.getRules();
      if (!response.success) {
        return { success: false, data: {}, error: response.error };
      }

      const rules = response.data;
      const grouped = {};

      // دسته‌بندی‌های موجود
      const categories = {
        'entry': '📈 قوانین ورود',
        'exit': '🚪 قوانین خروج',
        'risk': '🛡️ مدیریت ریسک',
        'psychology': '🧠 روانشناختی',
        'time': '⏰ قوانین زمانی',
        'general': '📋 متفرقه'
      };

      // دسته‌بندی قوانین
      Object.keys(categories).forEach(key => {
        grouped[key] = {
          label: categories[key],
          rules: rules.filter(rule => rule.category === key)
        };
      });

      return {
        success: true,
        data: grouped
      };
    } catch (error) {
      console.error('❌ Error grouping rules:', error);
      return {
        success: false,
        data: {},
        error: 'خطا در دسته‌بندی قوانین'
      };
    }
  },

  /**
   * دریافت قوانین اجباری
   * @returns {Promise} لیست قوانین اجباری
   */
  getRequiredRules: async () => {
    try {
      const response = await RuleService.getRules();
      if (!response.success) {
        return { success: false, data: [], error: response.error };
      }

      const requiredRules = response.data.filter(rule => rule.is_required && rule.is_active);
      return {
        success: true,
        data: requiredRules
      };
    } catch (error) {
      console.error('❌ Error fetching required rules:', error);
      return {
        success: false,
        data: [],
        error: 'خطا در دریافت قوانین اجباری'
      };
    }
  },

  /**
   * بررسی پایبندی به قوانین برای یک ترید خاص
   * @param {number} tradeId - شناسه ترید
   * @returns {Promise} وضعیت پایبندی
   */
  getTradeRuleCompliance: async (tradeId) => {
    try {
      const response = await apiClient.get(`trading/trades/${tradeId}/`);
      const trade = response.data;

      if (!trade.rule_compliance) {
        return {
          success: true,
          data: {
            total: 0,
            checked: 0,
            percentage: 0,
            details: []
          }
        };
      }

      return {
        success: true,
        data: {
          total: trade.rule_compliance.total || 0,
          checked: trade.rule_compliance.checked || 0,
          percentage: trade.rule_compliance.percentage || 0,
          details: trade.rule_checks_detail || []
        }
      };
    } catch (error) {
      console.error('❌ Error fetching trade rule compliance:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'خطا در دریافت وضعیت پایبندی'
      };
    }
  },

  /**
   * دریافت آمار کلی پایبندی به قوانین
   * @param {Object} params - پارامترهای فیلتر
   * @returns {Promise} آمار پایبندی
   */
  getComplianceStats: async (params = {}) => {
    try {
      const report = await RuleService.getRulesReport(params);
      if (!report.success) {
        return { success: false, data: null, error: report.error };
      }

      const data = report.data;
      return {
        success: true,
        data: {
          total_rules: data.total_rules || 0,
          overall_compliance: data.overall_compliance || 0,
          rules_by_category: data.rules_by_category || {},
          compliance_by_category: data.compliance_by_category || {},
          rules_stats: data.rules_stats || []
        }
      };
    } catch (error) {
      console.error('❌ Error fetching compliance stats:', error);
      return {
        success: false,
        data: null,
        error: 'خطا در دریافت آمار پایبندی'
      };
    }
  }
};

export default RuleService;