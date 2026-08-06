// frontend/src/services/realApiService.js

import axios from 'axios';

// ✅ ============================================
// ✅ غیرفعال‌سازی کامل WebSocket در مرورگر
// ✅ ============================================
if (typeof window !== 'undefined' && window.WebSocket) {
  const OriginalWebSocket = window.WebSocket;
  window.WebSocket = function(url, protocols) {
    // اگر URL به /ws ختم می‌شود، اتصال را متوقف کن
    if (url && (url.includes('/ws') || url.includes('ws://'))) {
      console.warn('⚠️ WebSocket connection blocked:', url);
      // یک WebSocket ساختگی برگردان که هیچ کاری نمی‌کند
      return {
        readyState: 3, // CLOSED
        close: () => {},
        send: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        onopen: null,
        onclose: null,
        onmessage: null,
        onerror: null
      };
    }
    return new OriginalWebSocket(url, protocols);
  };
  // کپی کردن static properties
  Object.assign(window.WebSocket, OriginalWebSocket);
  window.WebSocket.CONNECTING = 0;
  window.WebSocket.OPEN = 1;
  window.WebSocket.CLOSING = 2;
  window.WebSocket.CLOSED = 3;
}

class RealApiService {
  constructor() {
    this.apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
    this.wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:8000/ws/';
  }

  // ============================================
  // دریافت توکن از localStorage
  // ============================================
  getToken() {
    const token = localStorage.getItem('accessToken');
    console.log('🔑 getToken:', token ? token.substring(0, 20) + '...' : 'null');
    return token;
  }

  // ============================================
  // تنظیم هدرهای درخواست
  // ============================================
  getHeaders() {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('✅ Authorization header set');
    } else {
      console.warn('⚠️ No token found!');
    }

    return headers;
  }

  // ============================================
  // درخواست پایه
  // ============================================
  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${this.apiUrl}${endpoint}`;
    const headers = this.getHeaders();

    console.log(`📤 ${options.method || 'GET'} ${url}`);

    try {
      const config = {
        url,
        method: options.method || 'GET',
        headers: { ...headers, ...(options.headers || {}) },
        data: options.body,
        params: options.params,
        withCredentials: true,
      };

      const response = await axios(config);
      console.log(`✅ Response: ${response.status}`);
      return response;

    } catch (error) {
      console.error(`❌ Request failed:`, error.response?.status);
      console.error('❌ Error details:', error.response?.data);

      if (error.response?.status === 401) {
        console.log('🔑 Token expired, redirecting to login...');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
      throw error;
    }
  }

  // ============================================
  // احراز هویت (نیاز به توکن ندارد)
  // ============================================

  async sendVerificationCode(phone) {
    return this.request('/auth/send-code/', {
      method: 'POST',
      body: JSON.stringify({ phone_number: phone })
    });
  }

  async verifyCode(phone, code) {
    return this.request('/auth/verify-code/', {
      method: 'POST',
      body: JSON.stringify({ phone_number: phone, code })
    });
  }

  async register(data) {
    return this.request('/auth/register/', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async login(data) {
    return this.request('/auth/login/', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async logout() {
    return this.request('/auth/logout/', {
      method: 'POST'
    });
  }

  // ============================================
  // پروفایل (نیاز به توکن دارد)
  // ============================================

  async getProfile() {
    return this.request('/auth/profile/');
  }

  async updateProfile(data) {
    return this.request('/auth/profile/', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // ============================================
  // مدیریت دسته‌بندی‌ها (نیاز به توکن دارد)
  // ============================================

  async getTradeGroups() {
    console.log('📤 Getting trade groups...');
    return this.request('/trading/groups/');
  }

  async createTradeGroup(data) {
    return this.request('/trading/groups/', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateTradeGroup(id, data) {
    return this.request(`/trading/groups/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteTradeGroup(id) {
    return this.request(`/trading/groups/${id}/delete/`, {
      method: 'DELETE'
    });
  }

  // ============================================
  // مدیریت تریدها (نیاز به توکن دارد)
  // ============================================

  async getTrades(params = {}) {
    return this.request('/trading/trades/', {
      params
    });
  }

  async getTrade(id) {
    return this.request(`/trading/trades/${id}/`);
  }

  async createTrade(data) {
    return this.request('/trading/trades/', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateTrade(id, data) {
    return this.request(`/trading/trades/${id}/update/`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteTrade(id) {
    return this.request(`/trading/trades/${id}/delete/`, {
      method: 'DELETE'
    });
  }

  // ============================================
  // جفت ارزها (Currency Pairs)
  // ============================================

  async getCurrencyPairs(params = {}) {
    const defaultParams = { page_size: 1000, ...params };
    return this.request('/trading/currency-pairs/', { params: defaultParams });
  }

  async getAllSymbols() {
    return this.request('/trading/symbols/');
  }

  // ============================================
  // ✅ دریافت لیست مدل‌های هوش مصنوعی
  // ============================================

  async getAvailableModels() {
    return this.request('/trading/ai/models/');
  }

  // ============================================
  // ✅ دریافت نسخه فعلی نرم‌افزار (جدید)
  // ============================================

  async getCurrentVersion() {
    return this.request('/system/version/');
  }

  // ============================================
  // اشتراک و پرداخت (نیاز به توکن دارد)
  // ============================================

  async getSubscriptionStatus() {
    return this.request('/subscription/status/');
  }

  async getUserSubscription() {
    return this.request('/subscription/current/');
  }

  async getPlans() {
    console.log('📤 Getting subscription plans...');
    return this.request('/subscription/plans/');
  }

  async purchaseSubscription(planId, discountCode = '') {
    return this.request('/subscription/purchase/', {
      method: 'POST',
      body: JSON.stringify({
        plan_id: planId,
        discount_code: discountCode
      })
    });
  }

  async validateDiscount(code, planId = null) {
    return this.request('/subscription/discount/validate/', {
      method: 'POST',
      body: JSON.stringify({
        code,
        plan_id: planId
      })
    });
  }

  async verifyPayment(authority, status, subscriptionId) {
    return this.request('/subscription/verify-payment/', {
      method: 'GET',
      params: { authority, status, subscription_id: subscriptionId }
    });
  }

  // ============================================
  // گزارشات (نیاز به توکن دارد)
  // ============================================

  async getReport(params = {}) {
    return this.request('/trading/reports/', { params });
  }

  async getPnLReport(params = {}) {
    return this.request('/trading/reports/pnl/', { params });
  }

  async getRiskRewardReport(params = {}) {
    return this.request('/trading/reports/risk-reward/', { params });
  }

  async getWeeklyPerformance(params = {}) {
    return this.request('/trading/reports/weekly/', { params });
  }

  async getChecklistReport(params = {}) {
    return this.request('/trading/reports/checklist/', { params });
  }

  async getPsychologyReport(params = {}) {
    return this.request('/trading/reports/psychology/', { params });
  }

  async getMistakesReport(params = {}) {
    return this.request('/trading/reports/mistakes/', { params });
  }

  async getBiasReport(params = {}) {
    return this.request('/trading/reports/bias/', { params });
  }

  async getTimeframeReport(params = {}) {
    return this.request('/trading/reports/timeframe/', { params });
  }

  // ============================================
  // پیام‌رسانی (نیاز به توکن دارد)
  // ============================================

  async getUserMessages(params = {}) {
    return this.request('/messages/', { params });
  }

  async sendMessage(data) {
    return this.request('/messages/create/', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async replyToMessage(messageId, data) {
    return this.request(`/messages/${messageId}/reply/`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async markMessageAsRead(messageId) {
    return this.request(`/messages/${messageId}/mark-read/`, {
      method: 'POST'
    });
  }

  async deleteMessage(messageId) {
    return this.request(`/messages/${messageId}/`, {
      method: 'DELETE'
    });
  }

  async getSystemMessages() {
    return this.request('/messages/system/public/');
  }

  async getSupportInfo() {
    return this.request('/messages/support-info/');
  }

  // ============================================
  // نسخه‌ها و تنظیمات (نیاز به توکن دارد)
  // ============================================

  async getAppVersions() {
    return this.request('/system/versions/');
  }

  async getSystemSettings() {
    return this.request('/system/settings/');
  }

  // ============================================
  // ✅ وب‌سوکت - کاملاً غیرفعال (بدون لاگ)
  // ============================================

  connectWebSocket() {
    // کاملاً غیرفعال - هیچ اتصالی برقرار نمی‌شود
    return null;
  }
}

export default new RealApiService();