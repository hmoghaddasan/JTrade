// frontend/src/services/apiService.js

import axios from 'axios';

// ✅ اگر proxy در package.json وجود دارد، baseURL باید خالی باشد
const API_BASE_URL = '';

// ایجاد نمونه axios
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================
// Interceptor برای اضافه کردن توکن و مدیریت هدر
// ============================================
apiClient.interceptors.request.use(
  (config) => {
    // ✅ اصلاح: ابتدا 'token' و سپس 'accessToken' را بررسی می‌کنیم
    let token = localStorage.getItem('token');
    if (!token || token === 'undefined' || token === 'null') {
      token = localStorage.getItem('accessToken');
    }

    if (token && token !== 'undefined' && token !== 'null') {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // اگر داده از نوع FormData است، هدر Content-Type را حذف کن تا axios خودش تنظیم کند
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    // ✅ دیباگ: آدرس نهایی را در کنسول نشان بده
    console.log('🚀 Request URL:', config.baseURL + config.url);
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
          const response = await axios.post(`/api/auth/refresh/`, {
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

// ✅ برای دسترسی در کنسول (دیباگ)
window.apiClient = apiClient;

export default apiClient;