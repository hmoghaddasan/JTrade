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
 * ایجاد ترید جدید
 */
export const createTrade = async (data) => {
  try {
    // تبدیل داده‌ها به فرمت مورد نیاز بک‌اند
    const tradeData = {
      trade_date: data.trade_date,
      symbol: data.symbol,
      trade_type: data.trade_type,
      session_type: data.session_type,
      sleep_quality: data.sleep_quality,
      food_status: data.food_status || false,
      focus: data.focus || false,
      calm: data.calm || false,
      excited: data.excited || false,
      fear: data.fear || false,
      greed: data.greed || false,
      relaxed: data.relaxed || false,
      happy: data.happy || false,
      sad: data.sad || false,
      energetic: data.energetic || false,
      tired: data.tired || false,
      fomo: data.fomo || false,
      patience: data.patience || false,
      contentment: data.contentment || false,
      dominant_feeling: data.dominant_feeling || '',
      bias: data.bias,
      strategy_type: data.strategy_type,
      timeframe_d: data.timeframe_d || false,
      timeframe_h4: data.timeframe_h4 || false,
      timeframe_h1: data.timeframe_h1 || false,
      timeframe_m15: data.timeframe_m15 || false,
      timeframe_m5: data.timeframe_m5 || false,
      timeframe_m1: data.timeframe_m1 || false,
      retirement_model: data.retirement_model || '',
      weekly_news_printed: data.weekly_news_printed || false,
      zero_hour_identified: data.zero_hour_identified || false,
      asian_range_identified: data.asian_range_identified || false,
      london_range_identified: data.london_range_identified || false,
      judas_lo_identified: data.judas_lo_identified || false,
      key_levels_reviewed: data.key_levels_reviewed || false,
      smt_confirmed: data.smt_confirmed || false,
      bond_dxy_support: data.bond_dxy_support || false,
      entry_price: data.entry_price,
      stop_loss: data.stop_loss,
      take_profit_1: data.take_profit_1,
      take_profit_2: data.take_profit_2,
      take_profit_3: data.take_profit_3,
      risk_usd: data.risk_usd,
      risk_percent: data.risk_percent,
      risk_reward_ratio: data.risk_reward_ratio,
      close_price: data.close_price,
      tp_sl_hit: data.tp_sl_hit || '',
      profit: data.profit,
      pre_trade_stress: data.pre_trade_stress,
      entry_emotion_control: data.entry_emotion_control,
      reaction_to_profit: data.reaction_to_profit || '',
      stop_loss_adherence: data.stop_loss_adherence || false,
      expectation_management: data.expectation_management,
      strategy_adherence: data.strategy_adherence || false,
      capital_management_adherence: data.capital_management_adherence || false,
      over_trade: data.over_trade || false,
      emotion_after_losses: data.emotion_after_losses || '',
      mistake_code: data.mistake_code || '',
      mistake_weight: data.mistake_weight,
      post_trade_scan: data.post_trade_scan || false,
      entry_reason_written: data.entry_reason_written || false,
      exit_reason_written: data.exit_reason_written || false,
      mistakes_recorded: data.mistakes_recorded || false,
      execution_quality_score: data.execution_quality_score,
      group_id: data.group_id,
      // فیلدهای ICT
      fvg: data.fvg || '',
      order_block: data.order_block || '',
      bos: data.bos || '',
      choch: data.choch || '',
      mss: data.mss || '',
      liquidity_sweep: data.liquidity_sweep || '',
      poi: data.poi || '',
      demand_zone: data.demand_zone || '',
      supply_zone: data.supply_zone || '',
    };

    const response = await apiService.post('/trading/trades/', tradeData);
    return {
      success: true,
      data: response.data,
      message: 'ترید با موفقیت ثبت شد',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'خطا در ثبت ترید',
      details: error.response?.data,
    };
  }
};

/**
 * به‌روزرسانی ترید
 */
export const updateTrade = async (id, data) => {
  try {
    const response = await apiService.put(`/trading/trades/${id}/update/`, data);
    return {
      success: true,
      data: response.data,
      message: 'ترید با موفقیت به‌روزرسانی شد',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'خطا در به‌روزرسانی ترید',
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