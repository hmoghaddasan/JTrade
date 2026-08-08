// frontend/src/services/aiService.js

import apiClient from './apiService';

const AI_SERVICE = {
  /**
   * دریافت مشاوره هوشمند از AI
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
   * @returns {Promise} Promise که پس از اتمام کامل استریم resolve می‌شود
   */
// frontend/src/services/aiService.js

async getConsultationStream(data, onChunk) {
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
  const token = localStorage.getItem('accessToken');

  try {
    const response = await fetch(`${API_BASE_URL}/trading/ai-consult-stream/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(300000), // ✅ ۵ دقیقه timeout
    });

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        // اگر پاسخ JSON نبود
      }
      throw new Error(errorMessage);
    }

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

    return;
  } catch (error) {
    console.error('Stream error:', error);
    // اگر خطا timeout باشد، پیام مناسب اضافه می‌کنیم
    if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
      error.message = '⏰ زمان پاسخگویی سرویس هوش مصنوعی به پایان رسید. لطفاً دوباره تلاش کنید.';
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