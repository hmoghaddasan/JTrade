// frontend/src/services/aiService.js

import apiClient from './apiService';

const AI_SERVICE = {
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

  // ✅ متد قدیمی استریم (برای سازگاری نگه داشته شده)
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

      const consultationId = response.headers.get('X-Consultation-ID');
      console.log('📥 Consultation ID from header:', consultationId);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let fullText = '';
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
                fullText += data.response;
              }
            } catch {
              onChunk(line);
              fullText += line;
            }
          }
        }
      }

      return { consultationId, fullText };
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

  // ✅ متد جدید: شروع مشاوره ناهمگام (جایگزین استریم)
  async startConsultation(data) {
    try {
      const response = await apiClient.post('/trading/ai-consult-stream/', data);
      return response.data; // { consultation_id, status, message }
    } catch (error) {
      console.error('Error starting consultation:', error);
      throw error;
    }
  },

  // ✅ متد جدید: دریافت وضعیت مشاوره (برای پولینگ)
  async getConsultationStatus(id) {
    try {
      const response = await apiClient.get(`/trading/ai-consult/${id}/status/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching consultation status:', error);
      throw error;
    }
  },

  async getHistory(page = 1, pageSize = 1000) {
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

  async getConsultationDetail(id) {
    try {
      const response = await apiClient.get(`/trading/ai-consult/${id}/`);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching consultation detail:', error);
      throw error;
    }
  },

  async submitFeedback(id, feedback) {
    try {
      const response = await apiClient.post(`/trading/ai-consult/${id}/feedback/`, feedback);
      return response.data;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw error;
    }
  },

  async getAvailableModels() {
    try {
      const response = await apiClient.get('/trading/ai-models/');
      return response.data;
    } catch (error) {
      console.error('Error fetching available models:', error);
      throw error;
    }
  },

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