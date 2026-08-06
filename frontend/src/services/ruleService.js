// frontend/src/services/ruleService.js

import apiService from './apiService';

/**
 * سرویس مدیریت قوانین معاملاتی
 */
const RuleService = {
  /**
   * دریافت لیست قوانین فعال کاربر
   */
  async getRules() {
    try {
      const response = await apiService.get('/trading/rules/');
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'خطا در دریافت قوانین',
        details: error.response?.data,
      };
    }
  },

  /**
   * ایجاد قانون جدید
   */
  async createRule(data) {
    try {
      const response = await apiService.post('/trading/rules/create/', data);
      return {
        success: true,
        data: response.data,
        message: 'قانون با موفقیت ایجاد شد',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'خطا در ایجاد قانون',
        details: error.response?.data,
      };
    }
  },

  /**
   * ویرایش قانون
   */
  async updateRule(id, data) {
    try {
      const response = await apiService.put(`/trading/rules/${id}/`, data);
      return {
        success: true,
        data: response.data,
        message: 'قانون با موفقیت به‌روزرسانی شد',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'خطا در به‌روزرسانی قانون',
        details: error.response?.data,
      };
    }
  },

  /**
   * حذف قانون (غیرفعال‌سازی)
   */
  async deleteRule(id) {
    try {
      await apiService.delete(`/trading/rules/${id}/`);
      return {
        success: true,
        message: 'قانون با موفقیت حذف شد',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'خطا در حذف قانون',
        details: error.response?.data,
      };
    }
  },

  /**
   * تغییر ترتیب قوانین
   */
  async reorderRules(ruleIds) {
    try {
      await apiService.post('/trading/rules/reorder/', { rule_ids: ruleIds });
      return {
        success: true,
        message: 'ترتیب قوانین با موفقیت به‌روزرسانی شد',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'خطا در تغییر ترتیب قوانین',
        details: error.response?.data,
      };
    }
  },

  /**
   * دریافت گزارش پایبندی به قوانین
   */
  async getRulesReport() {
    try {
      const response = await apiService.get('/trading/rules/report/');
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'خطا در دریافت گزارش قوانین',
        details: error.response?.data,
      };
    }
  },
};

export default RuleService;