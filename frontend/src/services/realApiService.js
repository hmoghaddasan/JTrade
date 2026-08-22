// frontend/src/services/realApiService.js

import axios from 'axios';

// ============================================
// غیرفعال‌سازی کامل WebSocket
// ============================================
if (typeof window !== 'undefined' && window.WebSocket) {
  const OriginalWebSocket = window.WebSocket;
  window.WebSocket = function(url, protocols) {
    if (url && (url.includes('/ws') || url.includes('ws://'))) {
      console.warn('⚠️ WebSocket connection blocked:', url);
      return {
        readyState: 3,
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

  getToken() {
    const token = localStorage.getItem('accessToken');
    return token;
  }

  getHeaders() {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async request(endpoint, options = {}) {
    let cleanEndpoint = endpoint;
    if (cleanEndpoint.startsWith('/api/')) {
      cleanEndpoint = cleanEndpoint.substring(4);
    }
    if (cleanEndpoint.startsWith('api/')) {
      cleanEndpoint = cleanEndpoint.substring(4);
    }
    if (cleanEndpoint.startsWith('/')) {
      cleanEndpoint = cleanEndpoint.substring(1);
    }

    const url = `${this.apiUrl}/${cleanEndpoint}`;
    const headers = this.getHeaders();

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
      return response;
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
      throw error;
    }
  }

  // ============================================
  // احراز هویت
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
  // پروفایل
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
  // مدیریت دسته‌بندی‌ها
  // ============================================
  async getTradeGroups() {
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
  // مدیریت تریدها
  // ============================================
  async getTrades(params = {}) {
    const defaultParams = { page_size: 1000, ...params };
    return this.request('/trading/trades/', { params: defaultParams });
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
  // جفت ارزها و نمادها
  // ============================================
  async getCurrencyPairs(params = {}) {
    const defaultParams = { page_size: 1000, ...params };
    return this.request('/trading/currency-pairs/', { params: defaultParams });
  }

  async getAllSymbols() {
    return this.request('/trading/symbols/');
  }

  // ============================================
  // هوش مصنوعی
  // ============================================
  async getAvailableModels() {
    return this.request('/trading/ai/models/');
  }

  async getLivePrice(symbol) {
    try {
      const response = await this.request(`/trading/live-price/${symbol}/`);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching live price:', error);
      throw error;
    }
  }

  // ============================================
  // نسخه نرم‌افزار
  // ============================================
  async getCurrentVersion() {
    return this.request('/system/version/');
  }

  // ============================================
  // اشتراک و پرداخت
  // ============================================
  async getSubscriptionStatus() {
    return this.request('/subscription/status/');
  }

  async getUserSubscription() {
    return this.request('/subscription/current/');
  }

  async getPlans() {
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
      body: JSON.stringify({ code, plan_id: planId })
    });
  }

  async verifyPayment(authority, status, subscriptionId) {
    return this.request('/subscription/verify-payment/', {
      method: 'GET',
      params: { authority, status, subscription_id: subscriptionId }
    });
  }

  // ============================================
  // گزارشات
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

  async getRulesReport(params = {}) {
    return this.request('/trading/rules/report/', { params });
  }

  // ============================================
  // پورتفولیو و مقایسه
  // ============================================
  async getPortfolioComparison(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);
    const url = `/trading/portfolios/compare/${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return this.request(url);
  }

  async getPortfolioComparisonSummary(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);
    const url = `/trading/portfolios/compare/summary/${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return this.request(url);
  }

  async getPortfolioComparisonChart(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.chart_type) queryParams.append('chart_type', params.chart_type);
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);
    const url = `/trading/portfolios/compare/chart/${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return this.request(url);
  }

  // ============================================
  // پیام‌رسانی
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
  // نسخه‌ها و تنظیمات
  // ============================================
  async getAppVersions() {
    return this.request('/system/versions/');
  }

  async getSystemSettings() {
    return this.request('/system/settings/');
  }


// ============================================
// ✅ بروکرها (کارگزاران) - با پشتیبانی از پارامتر
// ============================================
async getBrokers(params = {}) {
  return this.request('/trading/brokers/', { params });
}
  // ============================================
  // WebSocket (غیرفعال)
  // ============================================
  connectWebSocket() {
    return null;
  }
}

export default new RealApiService();