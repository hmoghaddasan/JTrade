// frontend/src/services/aiService.js

import apiClient from './apiService';

const AI_SERVICE = {
  /**
   * دریافت مشاوره هوشمند از AI (غیراستریم)
   * @param {Object} data - داده‌های ورودی شامل:
   *   symbol, direction, entry_price, stop_loss, take_profit,
   *   market_condition, emotion, time_ny, user_question,
   *   model, session_type, strategy_type, timeframes,
   *   risk_percent, volume
   * @returns {Promise} پاسخ API
   */
  async consultAI(data) {
    try {
      const response = await apiClient.post('/trading/ai-consult/', data, {
        timeout: 120000,
      });
      return response.data;
    } catch (error) {
      console.error('Error in consultAI:', error);
      throw error;
    }
  },

  /**
   * دریافت مشاوره با استریم (برای نمایش تدریجی به کاربر)
   * @param {Object} data - داده‌های ورودی (همانند consultAI)
   * @param {Function} onChunk - تابع callback برای هر بخش از پاسخ
   * @returns {Promise<{consultationId: string|null}>} - شناسه مشاوره
   */
  async getConsultationStream(data, onChunk) {
    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
    const token = localStorage.getItem('accessToken');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000);

    try {
      const response = await fetch(`${API_BASE_URL}/trading/ai-consult-stream/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = `خطای سرور (${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          const text = await response.text();
          if (text) errorMessage = text;
        }
        const error = new Error(errorMessage);
        error.status = response.status;
        throw error;
      }

      // ✅ دریافت consultationId از هدر
      const consultationId = response.headers.get('X-Consultation-ID');
      console.log('📥 Consultation ID from header:', consultationId);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              if (data.response) {
                onChunk(data.response);
              }
            } catch {
              onChunk(line);
            }
          }
        }
      }

      // ✅ برگرداندن consultationId
      return { consultationId };

    } catch (error) {
      if (error.name === 'AbortError' || error.code === 20) {
        const timeoutError = new Error(
          '⏰ زمان پاسخگویی سرویس هوش مصنوعی به پایان رسید. لطفاً دوباره تلاش کنید.'
        );
        timeoutError.name = 'TimeoutError';
        throw timeoutError;
      }

      console.error('Stream error:', error);

      if (!error.message || error.message === 'Failed to fetch') {
        const networkError = new Error(
          '🔌 اتصال به سرویس هوش مصنوعی برقرار نشد. لطفاً اتصال اینترنت و وضعیت سرور را بررسی کنید.'
        );
        networkError.name = 'ConnectionError';
        throw networkError;
      }

      throw error;
    }
  },

  /**
   * دریافت تاریخچه مشاوره‌های کاربر با pagination
   * @param {number} page - شماره صفحه
   * @param {number} pageSize - تعداد آیتم در هر صفحه
   * @returns {Promise} { results, count, page, page_size, total_pages }
   */
  async getHistory(page = 1, pageSize = 20) {
    try {
      const response = await apiClient.get('/trading/ai-consult-history/', {
        params: { page, page_size: pageSize },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching AI consultation history:', error);
      throw error;
    }
  },

  /**
   * دریافت جزئیات یک مشاوره خاص با شناسه
   * @param {number|string} id - شناسه مشاوره
   * @returns {Promise} جزئیات مشاوره
   */
  async getConsultationDetail(id) {
    try {
      const response = await apiClient.get(`/trading/ai-consult/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching consultation detail:', error);
      throw error;
    }
  },

  /**
   * ثبت بازخورد برای یک مشاوره
   * @param {number|string} id - شناسه مشاوره
   * @param {Object} feedback - داده‌های بازخورد شامل:
   *   is_followed: 'full' | 'partial' | 'none'
   *   trade_result: 'win' | 'loss' | 'breakeven'
   *   feedback_score: 1-5
   *   feedback_helpfulness: 'very_helpful' | 'somewhat_helpful' | 'little_helpful' | 'not_helpful'
   *   feedback_comment: string (اختیاری)
   * @returns {Promise} پاسخ API
   */
  async submitFeedback(id, feedback) {
    try {
      const response = await apiClient.post(`/trading/ai-consult/${id}/feedback/`, feedback);
      return response.data;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw error;
    }
  },

  /**
   * دریافت لیست مدل‌های هوش مصنوعی موجود
   * @returns {Promise} لیست مدل‌ها
   */
  async getAvailableModels() {
    try {
      const response = await apiClient.get('/trading/ai-models/');
      return response.data;
    } catch (error) {
      console.error('Error fetching available models:', error);
      throw error;
    }
  },

  /**
   * دریافت آمار تحلیلی مشاوره‌ها (فقط ادمین)
   * @returns {Promise} آمار داشبورد
   */
  async getAdminAnalytics() {
    try {
      const response = await apiClient.get('/trading/ai-analytics/');
      return response.data;
    } catch (error) {
      console.error('Error fetching AI analytics:', error);
      throw error;
    }
  },
};

export default AI_SERVICE;