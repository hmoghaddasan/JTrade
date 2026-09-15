// frontend/src/services/apiService.js

import axios from 'axios';

// ✅ اصلاح: حذف / انتهایی و اضافه کردن / ابتدایی در متدها
const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:8000/api').replace(/\/+$/, '');

// ایجاد نمونه axios
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================
// Interceptor برای اضافه کردن توکن و مدیریت هدر
// ============================================
apiClient.interceptors.request.use(
  (config) => {
    let token = localStorage.getItem('token');
    if (!token || token === 'undefined' || token === 'null') {
      token = localStorage.getItem('accessToken');
    }

    if (token && token !== 'undefined' && token !== 'null') {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    // ✅ اصلاح: فرمت صحیح URL
    const fullUrl = config.baseURL + (config.url?.startsWith('/') ? config.url : '/' + (config.url || ''));
    console.log('🚀 Request URL:', fullUrl);
    console.log('🔑 Token:', token ? '✅ موجود' : '❌ ندارد');

    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================
// Interceptor برای مدیریت خطاها و refresh token
// ============================================
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        let refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken || refreshToken === 'undefined' || refreshToken === 'null') {
          refreshToken = localStorage.getItem('refresh');
        }

        if (refreshToken) {
          const response = await axios.post(`${API_URL}/auth/refresh/`, {
            refresh: refreshToken,
          });
          const { access } = response.data;

          if (access) {
            localStorage.setItem('token', access);
            localStorage.setItem('accessToken', access);
          }

          originalRequest.headers.Authorization = `Bearer ${access}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem('token');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('refresh');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// ============================================
// سرویس‌های پورتفولیو
// ============================================
export const portfolioService = {
  getPortfolios: () => apiClient.get('/trading/portfolios/'),
  createPortfolio: (data) => apiClient.post('/trading/portfolios/', data),
  getPortfolio: (id) => apiClient.get(`/trading/portfolios/${id}/`),
  updatePortfolio: (id, data) => apiClient.put(`/trading/portfolios/${id}/`, data),
  deletePortfolio: (id) => apiClient.delete(`/trading/portfolios/${id}/`),
  getPortfolioAnalytics: (id) => apiClient.get(`/trading/portfolios/${id}/analytics/`),
  getCombinedAnalytics: () => apiClient.get('/trading/portfolios/combined-analytics/'),
};

window.apiClient = apiClient;

// ============================================
// ✅ دریافت لیست مدل‌های AI
// ============================================
export const aiModelService = {
  getAvailableModels: () => {
    console.log('📡 Fetching available AI models...');
    return apiClient.get('/trading/ai/models/');
  },
};

window.aiModelService = aiModelService;

export default apiClient;