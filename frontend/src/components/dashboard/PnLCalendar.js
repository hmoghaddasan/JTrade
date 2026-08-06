// frontend/src/components/dashboard/PnLCalendar.js

import React, { useState, useEffect, useMemo } from 'react';
import {
  getCalendarData,
  getPersianMonthName,
  getPersianDayName,
  getProfitColor,
  getProfitClass,
  formatNumber,
  getMonthStats,
  getTextColor
} from '../../utils/calendarHelper';
import './PnLCalendar.css';

const PnLCalendar = ({ trades, onDayClick, selectedDate, compact = true }) => {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [hoveredDay, setHoveredDay] = useState(null);
  const [tooltipData, setTooltipData] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // ✅ وضعیت باز/بسته شدن از LocalStorage (پیش‌فرض: جمع‌شده)
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem('pnl_calendar_expanded');
    return saved !== null ? JSON.parse(saved) : false;
  });

  // ذخیره وضعیت در LocalStorage هنگام تغییر
  useEffect(() => {
    localStorage.setItem('pnl_calendar_expanded', JSON.stringify(isExpanded));
  }, [isExpanded]);

  // بررسی اندازه صفحه
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // محاسبه داده‌های تقویم
  const calendarDays = useMemo(() => {
    return getCalendarData(currentYear, currentMonth, trades);
  }, [currentYear, currentMonth, trades]);

  // محاسبه حداکثر سود برای رنگ‌بندی
  const maxProfit = useMemo(() => {
    const profits = calendarDays
      .filter(d => d.profit !== null && d.profit !== undefined && d.trades.length > 0)
      .map(d => Math.abs(d.profit));
    return profits.length > 0 ? Math.max(...profits) : 1;
  }, [calendarDays]);

  // آمار ماه
  const monthStats = useMemo(() => {
    return getMonthStats(trades, currentYear, currentMonth);
  }, [trades, currentYear, currentMonth]);

  // تعیین تعداد ردیف‌ها بر اساس عرض صفحه
  const getRowCount = () => {
    if (compact) {
      if (windowWidth > 1200) return 1;
      if (windowWidth > 992) return 2;
      if (windowWidth > 768) return 3;
      return 4;
    }
    return 4;
  };

  // تعیین اندازه خانه بر اساس عرض صفحه
  const getCellSize = () => {
    if (compact) {
      if (windowWidth > 1200) return '28px';
      if (windowWidth > 992) return '32px';
      if (windowWidth > 768) return '36px';
      return '40px';
    }
    return '40px';
  };

  // تغییر ماه
  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  // نمایش تولتیپ
  const showTooltip = (e, dayData) => {
    if (!dayData.date) return;

    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipData(dayData);
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    });
  };

  const hideTooltip = () => {
    setTooltipData(null);
  };

  // کلیک روی روز
  const handleDayClick = (dayData) => {
    if (dayData.date && onDayClick) {
      onDayClick(dayData.date);
    }
  };

  // روزهای هفته (مخفف برای حالت فشرده)
  const weekDaysFull = ['شنبه', 'یک‌شنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];
  const weekDaysShort = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

  const weekDays = compact && windowWidth > 992 ? weekDaysShort : weekDaysFull;

  // بررسی اینکه روز امروز است
  const isToday = (dateStr) => {
    if (!dateStr) return false;
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  };

  // بررسی اینکه روز انتخاب شده است
  const isSelected = (dateStr) => {
    if (!dateStr || !selectedDate) return false;
    return dateStr === selectedDate;
  };

  const rowCount = getRowCount();
  const cellSize = getCellSize();

  // ✅ تابع toggle برای باز/بسته کردن
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`pnl-calendar-container ${compact ? 'compact' : ''}`}>
      {/* ===== هدر تقویم (قابل کلیک) ===== */}
      <div className="calendar-header" onClick={toggleExpand}>
        <div className="calendar-header-left">
          <span className="calendar-icon">📅</span>
          <span className="calendar-title-text">تقویم سود و زیان</span>
          <span className="calendar-badge">
            {trades.length} ترید
          </span>
          <span className="calendar-month-badge">
            {getPersianMonthName(currentMonth)} {currentYear}
          </span>
        </div>
        <div className="calendar-header-right">
          <span className={`calendar-toggle ${isExpanded ? 'expanded' : 'collapsed'}`}>
            {isExpanded ? '▲' : '▼'}
          </span>
        </div>
      </div>

      {/* ===== محتوای تقویم (فقط در حالت باز نمایش داده می‌شود) ===== */}
      <div className={`calendar-body ${isExpanded ? 'expanded' : 'collapsed'}`}>
        {/* ===== نوار ناوبری و آمار (درون محتوا) ===== */}
        <div className="pnl-calendar-header">
          <div className="calendar-title">
            <span className="calendar-month-year">
              {getPersianMonthName(currentMonth)} {currentYear}
            </span>
          </div>
          <div className="calendar-nav">
            <button className="nav-btn" onClick={goToPrevMonth} title="ماه قبل">
              ◀
            </button>
            <button className="nav-btn today-btn" onClick={goToToday}>
              امروز
            </button>
            <button className="nav-btn" onClick={goToNextMonth} title="ماه بعد">
              ▶
            </button>
          </div>
        </div>

        {/* ===== خلاصه آمار ماه ===== */}
        <div className={`calendar-stats ${compact ? 'compact-stats' : ''}`}>
          <div className="stat-item">
            <span className="stat-label">سود ماه</span>
            <span className={`stat-value ${monthStats.totalProfit >= 0 ? 'positive' : 'negative'}`}>
              {monthStats.totalProfit >= 0 ? '+' : ''}{formatNumber(monthStats.totalProfit)}$
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">نرخ برد</span>
            <span className="stat-value">{monthStats.winRate.toFixed(1)}%</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">برد/باخت</span>
            <span className="stat-value">
              <span className="win-count">{monthStats.winningTrades}</span>
              <span className="separator">/</span>
              <span className="loss-count">{monthStats.losingTrades}</span>
            </span>
          </div>
          {compact && windowWidth > 768 && (
            <div className="stat-item">
              <span className="stat-label">تعداد ترید</span>
              <span className="stat-value">{monthStats.totalTrades}</span>
            </div>
          )}
        </div>

        {/* ===== تقویم ===== */}
        <div className="calendar-grid">
          {/* روزهای هفته */}
          <div className="calendar-weekdays">
            {weekDays.map((day, index) => (
              <div key={index} className="weekday-cell">
                {day}
              </div>
            ))}
          </div>

          {/* روزهای ماه */}
          <div className="calendar-days" style={{ gridTemplateRows: `repeat(${rowCount}, 1fr)` }}>
            {calendarDays.map((dayData, index) => {
              const isTodayDay = isToday(dayData.date);
              const isSelectedDay = isSelected(dayData.date);
              const isEmpty = dayData.day === null;
              const profitClass = getProfitClass(dayData.profit, dayData.trades.length);
              const color = getProfitColor(dayData.profit, maxProfit, dayData.trades.length);
              const textColor = getTextColor(dayData.profit, maxProfit);

              return (
                <div
                  key={index}
                  className={`calendar-day-cell 
                    ${isEmpty ? 'empty' : 'has-date'} 
                    ${!isEmpty && profitClass} 
                    ${isTodayDay ? 'today' : ''} 
                    ${isSelectedDay ? 'selected' : ''}
                    ${dayData.hasTrade ? 'has-trade' : ''}
                    ${compact ? 'compact-cell' : ''}`}
                  style={{
                    backgroundColor: isEmpty ? '#fafafa' : color,
                    borderColor: isEmpty ? '#f0f0f0' : undefined,
                    cursor: isEmpty ? 'default' : 'pointer',
                    minHeight: cellSize,
                    maxHeight: cellSize,
                    color: isEmpty ? '#e0e0e0' : textColor
                  }}
                  onMouseEnter={(e) => !isEmpty && dayData.date && showTooltip(e, dayData)}
                  onMouseLeave={hideTooltip}
                  onClick={() => !isEmpty && handleDayClick(dayData)}
                >
                  {dayData.day && (
                    <>
                      <span className="day-number">{dayData.day}</span>
                      {dayData.hasTrade && (
                        <span className={`day-profit-indicator ${dayData.profit > 0 ? 'up' : dayData.profit < 0 ? 'down' : 'zero'}`}>
                          {dayData.profit > 0 ? '▲' : dayData.profit < 0 ? '▼' : '•'}
                        </span>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ===== Legend - راهنمای رنگ ===== */}
        <div className="calendar-legend">
          <div className="legend-items">
            <div className="legend-item">
              <span className="legend-dot positive-dot"></span>
              <span className="legend-label">سود</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot zero-dot"></span>
              <span className="legend-label">صفر</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot negative-dot"></span>
              <span className="legend-label">ضرر</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot no-data-dot"></span>
              <span className="legend-label">بدون ترید</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Tooltip ===== */}
      {tooltipData && (
        <div
          className="calendar-tooltip"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            transform: 'translateX(-50%) translateY(-100%)'
          }}
        >
          <div className="tooltip-date">
            {tooltipData.date ? new Date(tooltipData.date).toLocaleDateString('fa-IR') : ''}
          </div>
          <div className="tooltip-profit">
            سود روز:
            <span className={tooltipData.profit >= 0 ? 'positive' : 'negative'}>
              {tooltipData.profit >= 0 ? '+' : ''}{formatNumber(tooltipData.profit)}$
            </span>
          </div>
          <div className="tooltip-trades">
            تعداد ترید: {tooltipData.trades.length}
          </div>
          {tooltipData.trades.length > 0 && (
            <div className="tooltip-details">
              {tooltipData.trades.slice(0, 3).map((t, i) => (
                <div key={i} className="tooltip-trade">
                  {t.symbol} {t.trade_type === 'Buy' ? '🟢' : '🔴'} {parseFloat(t.profit) >= 0 ? '+' : ''}{t.profit}$
                </div>
              ))}
              {tooltipData.trades.length > 3 && (
                <div className="tooltip-more">... و {tooltipData.trades.length - 3} ترید دیگر</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PnLCalendar;