// frontend/src/components/reports/MetricsChart.js

import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from 'recharts';
import { useTheme } from '../../contexts/ThemeContext';
import './MetricsChart.css';

const MetricsChart = ({
  data = [],
  type = 'line',
  metrics = [],
  colors = [],
  labels = [],
  height = 300,
  title = '',
}) => {
  const { isDark } = useTheme();
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    if (!data || data.length === 0) {
      setChartData([]);
      return;
    }

    // فیلتر کردن داده‌های معتبر
    const validData = data.filter(item => {
      if (type === 'line') {
        return metrics.some(m => item[m] !== null && item[m] !== undefined);
      }
      return item;
    });

    setChartData(validData);
  }, [data, metrics, type]);

  // ===== رنگ‌ها =====
  const defaultColors = ['#2e7d32', '#f57c00', '#1a237e', '#c62828', '#6a1b9a'];
  const chartColors = colors.length > 0 ? colors : defaultColors;

  // ===== رنگ‌های تم =====
  const themeColors = {
    text: isDark ? '#e0e0e0' : '#333',
    grid: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    background: isDark ? 'transparent' : 'transparent',
  };

  // ===== فرمت کردن تاریخ =====
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // ===== تابع رندر =====
  const renderChart = () => {
    if (chartData.length === 0) {
      return (
        <div className="chart-empty">
          <span className="empty-icon">📊</span>
          <p>داده‌ای برای نمایش وجود ندارد</p>
        </div>
      );
    }

    const commonProps = {
      data: chartData,
      margin: { top: 10, right: 30, left: 0, bottom: 10 },
    };

    const tooltipStyle = {
      backgroundColor: isDark ? '#1e1e1e' : '#fff',
      border: `1px solid ${isDark ? '#333' : '#ddd'}`,
      borderRadius: '8px',
      padding: '8px 12px',
      color: isDark ? '#e0e0e0' : '#333',
    };

    if (type === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fill: themeColors.text, fontSize: 11 }}
              stroke={themeColors.text}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: themeColors.text, fontSize: 11 }}
              stroke={themeColors.text}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              labelFormatter={(label) => `تاریخ: ${label}`}
              formatter={(value, name) => {
                const index = labels.indexOf(name);
                const label = labels[index] || name;
                return [value?.toFixed(2) || '-', label];
              }}
            />
            <Legend
              wrapperStyle={{ color: themeColors.text }}
              formatter={(value) => {
                const index = labels.indexOf(value);
                return labels[index] || value;
              }}
            />
            {metrics.map((metric, index) => (
              <Bar
                key={metric}
                dataKey={metric}
                fill={chartColors[index % chartColors.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (type === 'composed') {
      return (
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fill: themeColors.text, fontSize: 11 }}
              stroke={themeColors.text}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: themeColors.text, fontSize: 11 }}
              stroke={themeColors.text}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              labelFormatter={(label) => `تاریخ: ${label}`}
              formatter={(value, name) => {
                const index = labels.indexOf(name);
                const label = labels[index] || name;
                return [value?.toFixed(2) || '-', label];
              }}
            />
            <Legend
              wrapperStyle={{ color: themeColors.text }}
              formatter={(value) => {
                const index = labels.indexOf(value);
                return labels[index] || value;
              }}
            />
            {metrics.map((metric, index) => {
              if (index === 0) {
                return (
                  <Bar
                    key={metric}
                    dataKey={metric}
                    fill={chartColors[index % chartColors.length]}
                    radius={[4, 4, 0, 0]}
                  />
                );
              }
              return (
                <Line
                  key={metric}
                  type="monotone"
                  dataKey={metric}
                  stroke={chartColors[index % chartColors.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              );
            })}
          </ComposedChart>
        </ResponsiveContainer>
      );
    }

    // ===== پیش‌فرض: خطی =====
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fill: themeColors.text, fontSize: 11 }}
            stroke={themeColors.text}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: themeColors.text, fontSize: 11 }}
            stroke={themeColors.text}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            labelFormatter={(label) => `تاریخ: ${label}`}
            formatter={(value, name) => {
              const index = labels.indexOf(name);
              const label = labels[index] || name;
              return [value?.toFixed(2) || '-', label];
            }}
          />
          <Legend
            wrapperStyle={{ color: themeColors.text }}
            formatter={(value) => {
              const index = labels.indexOf(value);
              return labels[index] || value;
            }}
          />
          {metrics.map((metric, index) => (
            <Line
              key={metric}
              type="monotone"
              dataKey={metric}
              stroke={chartColors[index % chartColors.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className={`metrics-chart ${isDark ? 'dark' : 'light'}`}>
      {title && <h4 className="chart-title">{title}</h4>}
      <div className="chart-container">
        {renderChart()}
      </div>
    </div>
  );
};

export default MetricsChart;