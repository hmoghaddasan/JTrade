// frontend/src/services/tradeService.js

import apiClient from './apiService';

export const getTrades = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });
    const query = params.toString();
    const response = await apiClient.get(`/trading/trades/${query ? '?' + query : ''}`);
    return {
      success: true,
      data: response.data.results || response.data,
      count: response.data.count,
      next: response.data.next,
      previous: response.data.previous,
    };
  } catch (error) {
    return { success: false, error: error.message || 'خطا در دریافت تریدها' };
  }
};

export const getTradeDetail = async (id) => {
  try {
    const response = await apiClient.get(`/trading/trades/${id}/`);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.message || 'خطا در دریافت جزئیات ترید' };
  }
};

const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const createTrade = async (data) => {
  try {
    const payload = { ...data };

    // تبدیل تصویر به Base64
    if (data.screenshot && data.screenshot instanceof File) {
      payload.screenshot = await fileToBase64(data.screenshot);
    } else if (data.screenshot && typeof data.screenshot === 'string') {
      payload.screenshot = data.screenshot;
    } else {
      delete payload.screenshot;
    }

    // اطمینان از آرایه بودن rule_checks
    if (payload.rule_checks && !Array.isArray(payload.rule_checks)) {
      try { payload.rule_checks = JSON.parse(payload.rule_checks); } catch { payload.rule_checks = []; }
    } else if (!payload.rule_checks) {
      payload.rule_checks = [];
    }

    // تبدیل رشته‌های 'true'/'false' به بولین
    Object.keys(payload).forEach(key => {
      if (payload[key] === 'true') payload[key] = true;
      if (payload[key] === 'false') payload[key] = false;
    });

    const response = await apiClient.post('/trading/trades/', payload);
    return { success: true, data: response.data, message: 'ترید با موفقیت ثبت شد' };
  } catch (error) {
    console.error('Error creating trade:', error);
    return { success: false, error: error.message || 'خطا در ثبت ترید', details: error.response?.data };
  }
};

export const updateTrade = async (id, data) => {
  try {
    const payload = { ...data };

    if (data.screenshot && data.screenshot instanceof File) {
      payload.screenshot = await fileToBase64(data.screenshot);
    } else if (data.screenshot && typeof data.screenshot === 'string') {
      payload.screenshot = data.screenshot;
    } else if (data.screenshot === '') {
      payload.screenshot = '';
    } else {
      delete payload.screenshot;
    }

    if (payload.rule_checks && !Array.isArray(payload.rule_checks)) {
      try { payload.rule_checks = JSON.parse(payload.rule_checks); } catch { payload.rule_checks = []; }
    } else if (!payload.rule_checks) {
      payload.rule_checks = [];
    }

    Object.keys(payload).forEach(key => {
      if (payload[key] === 'true') payload[key] = true;
      if (payload[key] === 'false') payload[key] = false;
    });

    const response = await apiClient.put(`/trading/trades/${id}/update/`, payload);
    return { success: true, data: response.data, message: 'ترید با موفقیت به‌روزرسانی شد' };
  } catch (error) {
    console.error('Error updating trade:', error);
    return { success: false, error: error.message || 'خطا در به‌روزرسانی ترید', details: error.response?.data };
  }
};

export const deleteTrade = async (id) => {
  try {
    await apiClient.delete(`/trading/trades/${id}/delete/`);
    return { success: true, message: 'ترید با موفقیت حذف شد' };
  } catch (error) {
    return { success: false, error: error.message || 'خطا در حذف ترید' };
  }
};

export const getTradeAnalysis = async (id) => {
  try {
    const response = await apiClient.get(`/trading/trades/${id}/analysis/`);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.message || 'خطا در دریافت تحلیل ترید' };
  }
};

export const getCurrencyPairs = async () => {
  try {
    const response = await apiClient.get('/trading/currency-pairs/');
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.message || 'خطا در دریافت جفت ارزها' };
  }
};

export const getTradeGroups = async () => {
  try {
    const response = await apiClient.get('/trading/groups/');
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.message || 'خطا در دریافت گروه‌های ترید' };
  }
};

export const createTradeGroup = async (data) => {
  try {
    const response = await apiClient.post('/trading/groups/', {
      group_name: data.group_name,
      description: data.description || '',
    });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.message || 'خطا در ایجاد گروه' };
  }
};

export const deleteTradeGroup = async (id) => {
  try {
    await apiClient.delete(`/trading/groups/${id}/delete/`);
    return { success: true, message: 'گروه با موفقیت حذف شد' };
  } catch (error) {
    return { success: false, error: error.message || 'خطا در حذف گروه' };
  }
};

export const getReports = {
  overview: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters);
      const response = await apiClient.get(`/trading/reports/?${params.toString()}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message || 'خطا در دریافت گزارش' };
    }
  },
  pnl: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters);
      const response = await apiClient.get(`/trading/reports/pnl/?${params.toString()}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message || 'خطا در دریافت گزارش PnL' };
    }
  },
  riskReward: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters);
      const response = await apiClient.get(`/trading/reports/risk-reward/?${params.toString()}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message || 'خطا در دریافت گزارش ریسک به ریوارد' };
    }
  },
  weekly: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters);
      const response = await apiClient.get(`/trading/reports/weekly/?${params.toString()}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message || 'خطا در دریافت گزارش هفتگی' };
    }
  },
  checklist: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters);
      const response = await apiClient.get(`/trading/reports/checklist/?${params.toString()}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message || 'خطا در دریافت گزارش چک‌لیست' };
    }
  },
  psychology: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters);
      const response = await apiClient.get(`/trading/reports/psychology/?${params.toString()}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message || 'خطا در دریافت گزارش روانشناسی' };
    }
  },
  mistakes: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters);
      const response = await apiClient.get(`/trading/reports/mistakes/?${params.toString()}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message || 'خطا در دریافت گزارش اشتباهات' };
    }
  },
  bias: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters);
      const response = await apiClient.get(`/trading/reports/bias/?${params.toString()}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message || 'خطا در دریافت گزارش بایاس' };
    }
  },
  timeframe: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters);
      const response = await apiClient.get(`/trading/reports/timeframe/?${params.toString()}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message || 'خطا در دریافت گزارش تایم‌فریم' };
    }
  },
};