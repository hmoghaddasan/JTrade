// frontend/src/services/apiService.js

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000, // ✅ افزایش timeout به ۱۲۰ ثانیه
});

// ============================================
// Interceptor برای اضافه کردن توکن به هدر
// ============================================
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    console.log('🔑 Token from localStorage:', token ? 'Exists' : 'Not found');

    if (token && token !== 'undefined' && token !== 'null') {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('✅ Token added to headers');
    } else {
      console.warn('⚠️ No valid token found');
    }

    console.log('📤 Request URL:', config.url);
    console.log('📤 Request Headers:', config.headers);

    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// ============================================
// Interceptor برای مدیریت خطاها
// ============================================
apiClient.interceptors.response.use(
  (response) => {
    console.log('✅ Response received:', response.status, response.config.url);
    return response;
  },
  async (error) => {
    console.error('❌ Response error:', error.response?.status, error.response?.data);

    const originalRequest = error.config;

    if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        console.log('🔄 Trying to refresh token...');

        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
            refresh: refreshToken
          });

          const { access } = response.data;
          localStorage.setItem('accessToken', access);
          console.log('✅ Token refreshed successfully');

          originalRequest.headers.Authorization = `Bearer ${access}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        console.error('❌ Refresh token error:', refreshError);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;