// frontend/src/services/aiService.js

import apiService from './apiService';

const AIService = {
  /**
   * دریافت مشاوره هوشمند از AI (غیراستریم)
   */
  async getConsultation(data) {
    try {
      const response = await apiService.post('/trading/ai/consult/', data);
      return response;
    } catch (error) {
      console.error('Error getting AI consultation:', error);
      throw error;
    }
  },

  /**
   * دریافت مشاوره هوشمند از AI به صورت استریم
   * @param {Object} data - داده‌های ورودی مشاوره
   * @param {Function} onChunk - تابع callback برای هر تکه از پاسخ
   * @returns {Promise<void>}
   */
  async getConsultationStream(data, onChunk) {
    try {
      const response = await fetch(`${apiService.defaults.baseURL}/trading/ai/consult/stream/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || errorMessage;
        } catch (e) {
          // اگر پاسخ JSON نبود، از متن خطا استفاده کن
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        onChunk(chunk);
      }
    } catch (error) {
      console.error('Error getting AI consultation stream:', error);
      throw error;
    }
  },

  /**
   * دریافت تاریخچه مشاوره‌ها
   */
  async getHistory(params = {}) {
    try {
      const response = await apiService.get('/trading/ai/history/', { params });
      return response;
    } catch (error) {
      console.error('Error fetching AI history:', error);
      throw error;
    }
  },

  /**
   * دریافت جزئیات یک مشاوره
   */
  async getConsultationDetail(id) {
    try {
      const response = await apiService.get(`/trading/ai/history/${id}/`);
      return response;
    } catch (error) {
      console.error('Error fetching consultation detail:', error);
      throw error;
    }
  },

  /**
   * ثبت بازخورد برای یک مشاوره
   */
  async submitFeedback(id, feedbackData) {
    try {
      const response = await apiService.post(`/trading/ai/feedback/${id}/`, feedbackData);
      return response;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw error;
    }
  },

  /**
   * دریافت داشبورد مدیریتی (فقط ادمین)
   */
  async getAdminDashboard() {
    try {
      const response = await apiService.get('/trading/admin/ai/dashboard/');
      return response;
    } catch (error) {
      console.error('Error fetching admin dashboard:', error);
      throw error;
    }
  },

  /**
   * دریافت لیست نسخه‌های پرامپت (فقط ادمین)
   */
  async getPromptVersions() {
    try {
      const response = await apiService.get('/trading/admin/ai/prompts/');
      return response;
    } catch (error) {
      console.error('Error fetching prompt versions:', error);
      throw error;
    }
  },

  /**
   * ایجاد نسخه جدید پرامپت (فقط ادمین)
   */
  async createPromptVersion(data) {
    try {
      const response = await apiService.post('/trading/admin/ai/prompts/', data);
      return response;
    } catch (error) {
      console.error('Error creating prompt version:', error);
      throw error;
    }
  },

  /**
   * بروزرسانی نسخه پرامپت (فقط ادمین)
   */
  async updatePromptVersion(id, data) {
    try {
      const response = await apiService.put(`/trading/admin/ai/prompts/${id}/`, data);
      return response;
    } catch (error) {
      console.error('Error updating prompt version:', error);
      throw error;
    }
  },

  /**
   * حذف نسخه پرامپت (فقط ادمین)
   */
  async deletePromptVersion(id) {
    try {
      const response = await apiService.delete(`/trading/admin/ai/prompts/${id}/`);
      return response;
    } catch (error) {
      console.error('Error deleting prompt version:', error);
      throw error;
    }
  },
};

export default AIService;