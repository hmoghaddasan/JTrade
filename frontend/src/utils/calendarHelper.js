// frontend/src/utils/calendarHelper.js

/**
 * دریافت نام ماه به فارسی
 */
export const getPersianMonthName = (month) => {
  const months = [
    'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
  ];
  return months[month] || '';
};

/**
 * دریافت نام روز هفته به فارسی
 */
export const getPersianDayName = (day) => {
  const days = ['شنبه', 'یک‌شنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];
  return days[day] || '';
};

/**
 * دریافت تعداد روزهای یک ماه
 */
export const getDaysInMonth = (year, month) => {
  return new Date(year, month + 1, 0).getDate();
};

/**
 * دریافت روز اول ماه (0=شنبه, 1=یک‌شنبه, ...)
 */
export const getFirstDayOfMonth = (year, month) => {
  return new Date(year, month, 1).getDay();
};

/**
 * دریافت داده‌های تقویم برای یک ماه خاص
 */
export const getCalendarData = (year, month, trades) => {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const days = [];

  // روزهای خالی قبل از شروع ماه
  for (let i = 0; i < firstDay; i++) {
    days.push({ day: null, date: null, profit: null, trades: [] });
  }

  // روزهای ماه
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateStr = date.toISOString().split('T')[0];

    // پیدا کردن تریدهای این روز
    const dayTrades = trades.filter(t => t.trade_date === dateStr);

    // محاسبه سود روز
    const totalProfit = dayTrades.reduce((sum, t) => {
      return sum + (parseFloat(t.profit) || 0);
    }, 0);

    days.push({
      day,
      date: dateStr,
      profit: dayTrades.length === 0 ? null : totalProfit,
      trades: dayTrades,
      hasTrade: dayTrades.length > 0
    });
  }

  // تکمیل روزهای باقیمانده
  const remaining = (7 - (days.length % 7)) % 7;
  for (let i = 0; i < remaining; i++) {
    days.push({ day: null, date: null, profit: null, trades: [] });
  }

  return days;
};

/**
 * دریافت رنگ پس‌زمینه بر اساس مقدار سود
 * روزهای بدون ترید: سفید
 * روزهای با ترید: بر اساس شدت سود/ضرر
 */
export const getProfitColor = (profit, maxProfit, tradeCount = 0) => {
  // بدون ترید - سفید (رنگ از CSS کنترل می‌شود)
  if (tradeCount === 0) return '#ffffff';

  // سود صفر - زرد روشن
  if (profit === 0) return '#fff9c4';

  // اگر profit نامشخص باشد - سفید
  if (profit === null || profit === undefined) return '#ffffff';

  // محاسبه شدت رنگ بر اساس نسبت سود به حداکثر سود
  const intensity = Math.min(Math.abs(profit) / maxProfit, 1);

  if (profit > 0) {
    // سود: از زرد به سبز تیره
    const r = Math.round(255 - intensity * 255);
    const g = Math.round(255 - intensity * 55);
    const b = Math.round(200 - intensity * 200);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // ضرر: از زرد به قرمز تیره
    const r = Math.round(255 - intensity * 55);
    const g = Math.round(255 - intensity * 255);
    const b = Math.round(200 - intensity * 200);
    return `rgb(${r}, ${g}, ${b})`;
  }
};

/**
 * دریافت شدت رنگ بر اساس مقدار سود
 */
export const getProfitIntensity = (profit, maxProfit) => {
  if (profit === null || profit === undefined || maxProfit === 0) return 0;
  return Math.min(Math.abs(profit) / maxProfit, 1);
};

/**
 * دریافت کلاس CSS بر اساس وضعیت روز
 */
export const getProfitClass = (profit, tradeCount = 0) => {
  // بدون ترید
  if (tradeCount === 0) return 'no-data';

  // سود صفر
  if (profit === 0) return 'zero';

  // سود یا ضرر
  if (profit > 0) return 'positive';
  if (profit < 0) return 'negative';

  return 'no-data';
};

/**
 * دریافت رنگ متن بر اساس پس‌زمینه (برای خوانایی بهتر)
 */
export const getTextColor = (profit, maxProfit) => {
  if (profit === null || profit === undefined) return '#999';
  if (profit === 0) return '#666';

  const intensity = Math.min(Math.abs(profit) / maxProfit, 1);

  // اگر شدت رنگ بیشتر از 0.5 باشد، متن سفید، در غیر این صورت تیره
  return intensity > 0.5 ? '#ffffff' : '#333333';
};

/**
 * فرمت عدد با کاما (به فارسی)
 */
export const formatNumber = (num) => {
  if (num === null || num === undefined) return '۰';
  return num.toLocaleString('fa-IR');
};

/**
 * دریافت خلاصه آمار ماه
 */
export const getMonthStats = (trades, year, month) => {
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthTrades = trades.filter(t => t.trade_date && t.trade_date.startsWith(dateStr));

  const totalProfit = monthTrades.reduce((sum, t) => sum + (parseFloat(t.profit) || 0), 0);
  const totalTrades = monthTrades.length;
  const winningTrades = monthTrades.filter(t => parseFloat(t.profit) > 0).length;
  const losingTrades = monthTrades.filter(t => parseFloat(t.profit) < 0).length;

  return {
    totalProfit,
    totalTrades,
    winningTrades,
    losingTrades,
    winRate: totalTrades > 0 ? (winningTrades / totalTrades * 100) : 0
  };
};

/**
 * دریافت بهترین و بدترین روز ماه
 */
export const getBestAndWorstDay = (trades, year, month) => {
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthTrades = trades.filter(t => t.trade_date && t.trade_date.startsWith(dateStr));

  if (monthTrades.length === 0) {
    return { bestDay: null, worstDay: null };
  }

  // گروه‌بندی بر اساس روز
  const dayGroups = {};
  monthTrades.forEach(t => {
    if (!dayGroups[t.trade_date]) {
      dayGroups[t.trade_date] = [];
    }
    dayGroups[t.trade_date].push(t);
  });

  // محاسبه سود هر روز
  const dayProfits = Object.keys(dayGroups).map(date => {
    const dayTrades = dayGroups[date];
    const totalProfit = dayTrades.reduce((sum, t) => sum + (parseFloat(t.profit) || 0), 0);
    return { date, profit: totalProfit, trades: dayTrades };
  });

  // پیدا کردن بهترین و بدترین روز
  dayProfits.sort((a, b) => b.profit - a.profit);

  return {
    bestDay: dayProfits.length > 0 ? dayProfits[0] : null,
    worstDay: dayProfits.length > 0 ? dayProfits[dayProfits.length - 1] : null
  };
};

/**
 * دریافت توزیع سود روزها (برای نمودار)
 */
export const getProfitDistribution = (trades, year, month) => {
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthTrades = trades.filter(t => t.trade_date && t.trade_date.startsWith(dateStr));

  const distribution = {
    positive: 0,
    negative: 0,
    zero: 0,
    totalDays: 0
  };

  const dayGroups = {};
  monthTrades.forEach(t => {
    if (!dayGroups[t.trade_date]) {
      dayGroups[t.trade_date] = [];
    }
    dayGroups[t.trade_date].push(t);
  });

  Object.keys(dayGroups).forEach(date => {
    const dayTrades = dayGroups[date];
    const totalProfit = dayTrades.reduce((sum, t) => sum + (parseFloat(t.profit) || 0), 0);
    distribution.totalDays++;

    if (totalProfit > 0) distribution.positive++;
    else if (totalProfit < 0) distribution.negative++;
    else distribution.zero++;
  });

  return distribution;
};

/**
 * دریافت میانگین سود روزانه
 */
export const getAverageDailyProfit = (trades, year, month) => {
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthTrades = trades.filter(t => t.trade_date && t.trade_date.startsWith(dateStr));

  if (monthTrades.length === 0) return 0;

  const dayGroups = {};
  monthTrades.forEach(t => {
    if (!dayGroups[t.trade_date]) {
      dayGroups[t.trade_date] = [];
    }
    dayGroups[t.trade_date].push(t);
  });

  const dayCount = Object.keys(dayGroups).length;
  if (dayCount === 0) return 0;

  const totalProfit = monthTrades.reduce((sum, t) => sum + (parseFloat(t.profit) || 0), 0);
  return totalProfit / dayCount;
};

/**
 * بررسی اینکه آیا روز مشخصی در ماه جاری است
 */
export const isDateInCurrentMonth = (dateStr, year, month) => {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  return date.getFullYear() === year && date.getMonth() === month;
};

/**
 * دریافت لیست روزهای دارای ترید در ماه
 */
export const getTradingDays = (trades, year, month) => {
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthTrades = trades.filter(t => t.trade_date && t.trade_date.startsWith(dateStr));

  const daySet = new Set();
  monthTrades.forEach(t => {
    if (t.trade_date) {
      daySet.add(t.trade_date);
    }
  });

  return Array.from(daySet).sort();
};

/**
 * دریافت تعداد تریدهای هر روز هفته در ماه
 */
export const getWeekdayDistribution = (trades, year, month) => {
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthTrades = trades.filter(t => t.trade_date && t.trade_date.startsWith(dateStr));

  const weekdays = {
    'شنبه': 0,
    'یک‌شنبه': 0,
    'دوشنبه': 0,
    'سه‌شنبه': 0,
    'چهارشنبه': 0,
    'پنج‌شنبه': 0,
    'جمعه': 0
  };

  const dayNames = ['شنبه', 'یک‌شنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];

  monthTrades.forEach(t => {
    if (t.trade_date) {
      const date = new Date(t.trade_date);
      const dayIndex = date.getDay();
      weekdays[dayNames[dayIndex]]++;
    }
  });

  return weekdays;
};

/**
 * دریافت تعداد تریدهای هر روز از ماه
 */
export const getDailyTradeCount = (trades, year, month) => {
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthTrades = trades.filter(t => t.trade_date && t.trade_date.startsWith(dateStr));

  const dailyCount = {};
  monthTrades.forEach(t => {
    if (t.trade_date) {
      dailyCount[t.trade_date] = (dailyCount[t.trade_date] || 0) + 1;
    }
  });

  return dailyCount;
};