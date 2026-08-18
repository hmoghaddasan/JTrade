// frontend/src/components/analytics/CategoryCharts.js

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
  LineChart, Line, ComposedChart
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

  return (
    <div className="category-charts">
      <div className="charts-row">
        <div className="chart-box bar-chart-box">
          <h4 className="chart-title">📊 سود بر اساس {getCategoryLabel(categoryBy)}</h4>
          <ExpandableChart className="chart-container" title="نمودار سود بر اساس دسته">
            {/* 🟢 ارتفاع ثابت ۲۸۰ پیکسل در حالت عادی */}
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-30} textAnchor="end" height={50} tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={formatCurrency} />
                <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                <Legend />
                <Bar dataKey="profit" fill="#1a237e" name="سود کل" />
              </BarChart>
            </ResponsiveContainer>
          </ExpandableChart>
        </div>

        <div className="chart-box pie-chart-box">
          <h4 className="chart-title">🍩 توزیع نتایج</h4>
          <ExpandableChart className="chart-container" title="نمودار توزیع نتایج">
            {pieData.length === 0 ? (
              <div className="no-chart-data">داده‌ای برای نمایش وجود ندارد</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius="55%"
                    outerRadius="80%"
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value} ترید`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ExpandableChart>
        </div>
      </div>

      <div className="chart-box full-width">
        <h4 className="chart-title">📈 نرخ برد و تعداد تریدها بر اساس {getCategoryLabel(categoryBy)}</h4>
        <ExpandableChart className="chart-container" title="نمودار ترکیبی نرخ برد و تعداد">
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={comboData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-30} textAnchor="end" height={50} tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tickFormatter={formatPercent} />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="right" dataKey="count" fill="#f57c00" name="تعداد تریدها" />
              <Line yAxisId="left" type="monotone" dataKey="winRate" stroke="#2e7d32" strokeWidth={2} name="نرخ برد" />
            </ComposedChart>
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