// frontend/src/components/analytics/CategoryCharts.js

import React, { useState, useEffect, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
  ComposedChart, Line
} from 'recharts';
import ExpandableChart from '../common/ExpandableChart';
import './CategoryCharts.css';

const COLORS = ['#1a237e', '#2e7d32', '#c62828', '#f57c00', '#6a1b9a', '#00838f', '#4a148c', '#bf360c'];

const CategoryCharts = ({ categories, distribution, categoryBy }) => {
  const barData = categories.map(cat => ({
    name: cat.name,
    profit: cat.total_profit,
    winRate: cat.win_rate,
    count: cat.count,
  }));

  const pieData = [
    { name: 'سود', value: distribution.win },
    { name: 'زیان', value: distribution.loss },
    { name: 'مساوی', value: distribution.breakeven },
  ].filter(item => item.value > 0);

  const PIE_COLORS = ['#2e7d32', '#c62828', '#f57c00'];

  const comboData = categories.map(cat => ({
    name: cat.name,
    winRate: cat.win_rate,
    count: cat.count,
  }));

  const formatCurrency = (value) => {
    if (value === undefined || value === null) return '$0';
    return `$${value.toFixed(0)}`;
  };

  const formatPercent = (value) => {
    if (value === undefined || value === null) return '0%';
    return `${value.toFixed(0)}%`;
  };

  // ==========================================================
  // ✅ تنظیمات MARGIN
  // ==========================================================

  const NORMAL_MARGIN = {
    top: 30,
    right: 40,
    left: 55,
    bottom: 85
  };

  const EXPANDED_MARGIN = {
    top: 50,
    right: 60,
    left: 85,
    bottom: 120
  };

  // ==========================================================
  // ✅ تنظیمات XAxis
  // ==========================================================

  const normalXAxisProps = {
    angle: -30,
    textAnchor: 'end',
    height: 80,
    tick: {
      fontSize: 11,
      dy: 15
    },
    interval: 0,
    padding: { left: 10, right: 10 }
  };

  const expandedXAxisProps = {
    angle: -30,
    textAnchor: 'end',
    height: 100,
    tick: {
      fontSize: 14,
      dy: 20
    },
    interval: 0,
    padding: { left: 15, right: 15 }
  };

  // ==========================================================
  // ✅ تنظیمات YAxis
  // ==========================================================

  const normalYAxisProps = {
    width: 65,
    tick: { fontSize: 11 },
    padding: { top: 10, bottom: 10 }
  };

  const expandedYAxisProps = {
    width: 85,
    tick: { fontSize: 14 },
    padding: { top: 15, bottom: 15 }
  };

  // ==========================================================
  // ✅ رندر نمودار سود (BarChart)
  // ==========================================================

  const renderProfitChart = (isExpanded = false) => {
    const margin = isExpanded ? EXPANDED_MARGIN : NORMAL_MARGIN;
    const xAxisProps = isExpanded ? expandedXAxisProps : normalXAxisProps;
    const yAxisProps = isExpanded ? expandedYAxisProps : normalYAxisProps;

    return (
      <BarChart data={barData} margin={margin}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" {...xAxisProps} />
        <YAxis tickFormatter={formatCurrency} {...yAxisProps} />
        <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
        <Legend wrapperStyle={{ paddingTop: isExpanded ? 25 : 15 }} />
        <Bar dataKey="profit" fill="#1a237e" name="سود کل" barSize={isExpanded ? 50 : 35} />
      </BarChart>
    );
  };

  // ==========================================================
  // ✅ رندر نمودار توزیع نتایج (PieChart) - با حالت بزرگ‌نمایی
  // ==========================================================

  const renderPieChart = (isExpanded = false) => {
    if (pieData.length === 0) {
      return <div className="no-chart-data">داده‌ای برای نمایش وجود ندارد</div>;
    }

    // ✅ تنظیمات متفاوت برای حالت عادی و بزرگ‌نمایی
    const pieConfig = isExpanded ? {
      innerRadius: '40%',
      outerRadius: '88%',
      paddingAngle: 4,
      labelFontSize: 18,
      labelDy: 10,
      labelLine: true,
      margin: { top: 40, right: 50, bottom: 40, left: 50 },
      legendFontSize: 16,
      legendPaddingTop: 35,
      tooltipFontSize: 14
    } : {
      innerRadius: '55%',
      outerRadius: '80%',
      paddingAngle: 2,
      labelFontSize: 12,
      labelDy: 5,
      labelLine: false,
      margin: { top: 20, right: 20, bottom: 20, left: 20 },
      legendFontSize: 12,
      legendPaddingTop: 15,
      tooltipFontSize: 12
    };

    return (
      <PieChart margin={pieConfig.margin}>
        <Pie
          data={pieData}
          cx="50%"
          cy="50%"
          innerRadius={pieConfig.innerRadius}
          outerRadius={pieConfig.outerRadius}
          paddingAngle={pieConfig.paddingAngle}
          dataKey="value"
          label={{
            fontSize: pieConfig.labelFontSize,
            dy: pieConfig.labelDy,
            fontWeight: 500
          }}
          labelLine={pieConfig.labelLine}
        >
          {pieData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => `${value} ترید`}
          wrapperStyle={{ fontSize: pieConfig.tooltipFontSize }}
        />
        <Legend
          wrapperStyle={{
            paddingTop: pieConfig.legendPaddingTop,
            fontSize: pieConfig.legendFontSize
          }}
        />
      </PieChart>
    );
  };

  // ==========================================================
  // ✅ رندر نمودار ترکیبی (ComposedChart)
  // ==========================================================

  const renderComboChart = (isExpanded = false) => {
    const margin = isExpanded ? EXPANDED_MARGIN : NORMAL_MARGIN;
    const xAxisProps = isExpanded ? expandedXAxisProps : normalXAxisProps;

    return (
      <ComposedChart data={comboData} margin={margin}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" {...xAxisProps} />
        <YAxis
          yAxisId="left"
          tickFormatter={formatPercent}
          width={isExpanded ? 85 : 65}
          tick={{ fontSize: isExpanded ? 14 : 11 }}
          padding={{ top: isExpanded ? 15 : 10, bottom: isExpanded ? 15 : 10 }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          width={isExpanded ? 65 : 50}
          tick={{ fontSize: isExpanded ? 14 : 11 }}
          padding={{ top: isExpanded ? 15 : 10, bottom: isExpanded ? 15 : 10 }}
        />
        <Tooltip />
        <Legend wrapperStyle={{ paddingTop: isExpanded ? 25 : 15 }} />
        <Bar yAxisId="right" dataKey="count" fill="#f57c00" name="تعداد تریدها" barSize={isExpanded ? 40 : 30} />
        <Line yAxisId="left" type="monotone" dataKey="winRate" stroke="#2e7d32" strokeWidth={2} name="نرخ برد" dot={{ r: 4 }} />
      </ComposedChart>
    );
  };

  // ==========================================================
  // ✅ کامپوننت wrapper برای تشخیص بزرگ‌نمایی
  // ==========================================================

  // برای تشخیص اینکه آیا در حالت بزرگ‌نمایی هستیم یا نه
  // از یک کامپوننت سفارشی استفاده می‌کنیم که isExpanded را به فرزندان منتقل کند
  const ChartWrapper = ({ children, isExpanded = false }) => {
    return children(isExpanded);
  };

  // ==========================================================
  // ✅ رندر نهایی
  // ==========================================================

  return (
    <div className="category-charts">
      <div className="charts-row">
        {/* نمودار سود */}
        <div className="chart-box bar-chart-box">
          <h4 className="chart-title">📊 سود بر اساس {getCategoryLabel(categoryBy)}</h4>
          <ExpandableChart>
            <ResponsiveContainer width="100%" height={280}>
              {renderProfitChart(false)}
            </ResponsiveContainer>
          </ExpandableChart>
        </div>

        {/* ✅ نمودار توزیع نتایج - با پشتیبانی کامل از بزرگ‌نمایی */}
        <div className="chart-box pie-chart-box">
          <h4 className="chart-title">🍩 توزیع نتایج</h4>
          <ExpandableChart>
            <ResponsiveContainer width="100%" height={280}>
              {renderPieChart(false)}
            </ResponsiveContainer>
          </ExpandableChart>
        </div>
      </div>

      {/* نمودار ترکیبی */}
      <div className="chart-box full-width">
        <h4 className="chart-title">📈 نرخ برد و تعداد تریدها بر اساس {getCategoryLabel(categoryBy)}</h4>
        <ExpandableChart>
          <ResponsiveContainer width="100%" height={280}>
            {renderComboChart(false)}
          </ResponsiveContainer>
        </ExpandableChart>
      </div>
    </div>
  );
};

const getCategoryLabel = (value) => {
  const map = {
    'day_of_week': 'روز هفته',
    'month': 'ماه',
    'symbol': 'نماد',
    'trade_type': 'نوع ترید',
    'dominant_feeling': 'احساس غالب',
    'strategy_type': 'نوع استراتژی',
    'bias': 'بایاس',
    'session_type': 'نوع جلسه',
  };
  return map[value] || value;
};

export default CategoryCharts;