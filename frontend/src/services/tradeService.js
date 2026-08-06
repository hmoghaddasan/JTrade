// frontend/src/services/tradeService.js

import apiService from './apiService';

/**
 * دریافت لیست تریدها با فیلترهای اختیاری
 */
export const getTrades = async (filters = {}) => {
  try {
    const params = new URLSearchParams();

    if (filters.group_id) params.append('group_id', filters.group_id);
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    if (filters.symbol) params.append('symbol', filters.symbol);
    if (filters.trade_type) params.append('trade_type', filters.trade_type);
    if (filters.page) params.append('page', filters.page);
    if (filters.page_size) params.append('page_size', filters.page_size);

    const queryString = params.toString();
    const url = `/trading/trades/${queryString ? `?${queryString}` : ''}`;

    const response = await apiService.get(url);
    return {
      success: true,
      data: response.data.results || response.data,
      count: response.data.count,
      next: response.data.next,
      previous: response.data.previous,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'خطا در دریافت تریدها',
    };
  }
};

/**
 * دریافت جزئیات یک ترید
 */
export const getTradeDetail = async (id) => {
  try {
    const response = await apiService.get(`/trading/trades/${id}/`);
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'خطا در دریافت جزئیات ترید',
    };
  }
};

/**
 * ایجاد ترید جدید - با پشتیبانی از آپلود تصویر (FormData)
 */
export const createTrade = async (data) => {
  try {
    const formData = new FormData();

    // اضافه کردن تمام فیلدها به FormData
    Object.keys(data).forEach(key => {
      // فیلدهای خاص: تصویر و آرایه‌ها
      if (key === 'screenshot' && data[key] instanceof File) {
        formData.append('screenshot', data[key]);
      } else if (key === 'rule_checks' && Array.isArray(data[key])) {
        // آرایه‌ها را به JSON تبدیل می‌کنیم
        formData.append(key, JSON.stringify(data[key]));
      } else if (data[key] !== null && data[key] !== undefined) {
        // سایر فیلدها را به‌صورت معمولی اضافه می‌کنیم
        formData.append(key, data[key]);
      }
    });

    const response = await apiService.post('/trading/trades/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return {
      success: true,
      data: response.data,
      message: 'ترید با موفقیت ثبت شد',
    };
  } catch (error) {
    console.error('Error creating trade:', error);
    return {
      success: false,
      error: error.message || 'خطا در ثبت ترید',
      details: error.response?.data,
    };
  }
};

/**
 * به‌روزرسانی ترید - با پشتیبانی از آپلود تصویر (FormData)
 */
export const updateTrade = async (id, data) => {
  try {
    const formData = new FormData();

    Object.keys(data).forEach(key => {
      if (key === 'screenshot' && data[key] instanceof File) {
        formData.append('screenshot', data[key]);
      } else if (key === 'rule_checks' && Array.isArray(data[key])) {
        formData.append(key, JSON.stringify(data[key]));
      } else if (data[key] !== null && data[key] !== undefined) {
        formData.append(key, data[key]);
      }
    });

    // برای PUT، متد را به‌صورت _method ارسال می‌کنیم
    formData.append('_method', 'PUT');

    const response = await apiService.post(`/trading/trades/${id}/update/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return {
      success: true,
      data: response.data,
      message: 'ترید با موفقیت به‌روزرسانی شد',
    };
  } catch (error) {
    console.error('Error updating trade:', error);
    return {
      success: false,
      error: error.message || 'خطا در به‌روزرسانی ترید',
      details: error.response?.data,
    };
  }
};

/**
 * حذف ترید
 */
export const deleteTrade = async (id) => {
  try {
    await apiService.delete(`/trading/trades/${id}/delete/`);
    return {
      success: true,
      message: 'ترید با موفقیت حذف شد',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'خطا در حذف ترید',
    };
  }
};

/**
 * دریافت تحلیل ترید
 */
export const getTradeAnalysis = async (id) => {
  try {
    const response = await apiService.get(`/trading/trades/${id}/analysis/`);
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'خطا در دریافت تحلیل ترید',
    };
  }
};

/**
 * دریافت جفت ارزها
 */
export const getCurrencyPairs = async () => {
  try {
    const response = await apiService.get('/trading/currency-pairs/');
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'خطا در دریافت جفت ارزها',
    };
  }
};

/**
 * دریافت گروه‌های ترید
 */
export const getTradeGroups = async () => {
  try {
    const response = await apiService.get('/trading/groups/');
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'خطا در دریافت گروه‌های ترید',
    };
  }
};

/**
 * ایجاد گروه ترید جدید
 */
export const createTradeGroup = async (data) => {
  try {
    const response = await apiService.post('/trading/groups/', {
      group_name: data.group_name,
      description: data.description || '',
    });
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'خطا در ایجاد گروه',
    };
  }
};

/**
 * حذف گروه ترید
 */
export const deleteTradeGroup = async (id) => {
  try {
    await apiService.delete(`/trading/groups/${id}/delete/`);
    return {
      success: true,
      message: 'گروه با موفقیت حذف شد',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'خطا در حذف گروه',
    };
  }
};

/**
 * گزارش‌ها
 */
export const getReports = {
  /**
   * گزارش کلی
   */
  overview: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters);
      const response = await apiService.get(`/trading/reports/?${params.toString()}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message || 'خطا در دریافت گزارش' };
    }
  },

  /**
   * گزارش PnL بر اساس نماد
   */
  pnl: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters);
      const response = await apiService.get(`/trading/reports/pnl/?${params.toString()}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message || 'خطا در دریافت گزارش PnL' };
    }
  },

  /**
   * گزارش ریسک به ریوارد
   */
  riskReward: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters);
      const response = await apiService.get(`/trading/reports/risk-reward/?${params.toString()}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message || 'خطا در دریافت گزارش ریسک به ریوارد' };
    }
  },

  /**
   * گزارش عملکرد هفتگی
   */
  weekly: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters);
      const response = await apiService.get(`/trading/reports/weekly/?${params.toString()}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message || 'خطا در دریافت گزارش هفتگی' };
    }
  },

  /**
   * گزارش پایبندی به چک‌لیست
   */
  checklist: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters);
      const response = await apiService.get(`/trading/reports/checklist/?${params.toString()}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message || 'خطا در دریافت گزارش چک‌لیست' };
    }
  },

  /**
   * گزارش روانشناسی
   */
  psychology: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters);
      const response = await apiService.get(`/trading/reports/psychology/?${params.toString()}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message || 'خطا در دریافت گزارش روانشناسی' };
    }
  },

  /**
   * گزارش اشتباهات
   */
  mistakes: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters);
      const response = await apiService.get(`/trading/reports/mistakes/?${params.toString()}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message || 'خطا در دریافت گزارش اشتباهات' };
    }
  },

  /**
   * گزارش بایاس
   */
  bias: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters);
      const response = await apiService.get(`/trading/reports/bias/?${params.toString()}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message || 'خطا در دریافت گزارش بایاس' };
    }
  },

  /**
   * گزارش تایم‌فریم
   */
  timeframe: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters);
      const response = await apiService.get(`/trading/reports/timeframe/?${params.toString()}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message || 'خطا در دریافت گزارش تایم‌فریم' };
    }
  },
};