// frontend/src/services/systemSettingsService.js

import apiService from './apiService';

/**
 * سرویس مدیریت تنظیمات سیستم
 */
const SystemSettingsService = {
  /**
   * دریافت تمام تنظیمات سیستم
   */
  async getSettings() {
    try {
      const response = await apiService.get('/system/settings/');
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Error fetching system settings:', error);
      return {
        success: false,
        error: error.message || 'خطا در دریافت تنظیمات سیستم',
      };
    }
  },

  /**
   * دریافت یک تنظیم خاص با کلید
   */
  async getSetting(key, defaultValue = null) {
    try {
      const response = await apiService.get('/system/settings/', {
        params: { key },
      });
      if (response.data && response.data.length > 0) {
        const setting = response.data.find(s => s.key === key);
        if (setting && setting.value !== null && setting.value !== undefined) {
          return setting.value;
        }
      }
      return defaultValue;
    } catch (error) {
      console.error(`Error fetching setting "${key}":`, error);
      return defaultValue;
    }
  },

  /**
   * به‌روزرسانی یک تنظیم (فقط ادمین)
   */
  async updateSetting(key, value) {
    try {
      const response = await apiService.put('/system/settings/', {
        [key]: value,
      });
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'خطا در به‌روزرسانی تنظیم',
      };
    }
  },

  /**
   * دریافت تنظیمات آپلود تصویر
   */
  async getScreenshotSettings() {
    try {
      const response = await apiService.get('/system/screenshot-settings/');
      return response.data;
    } catch (error) {
      console.error('Error fetching screenshot settings:', error);
      // مقادیر پیش‌فرض در صورت خطا
      return {
        show_upload: true,
        max_size_mb: 5,
        max_width: 2000,
        max_height: 2000,
        image_quality: 85,
      };
    }
  },
};

export default SystemSettingsService;