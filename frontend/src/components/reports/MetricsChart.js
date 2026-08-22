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
  xAxisLabel = 'تاریخ (Date)',
  yAxisLabel = 'مقدار (Value)',
}) => {
  const { isDark } = useTheme();
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    if (!data || data.length === 0) {
      setChartData([]);
      return;
    }

    const validData = data.filter(item => {
      if (type === 'line') {
        return metrics.some(m => item[m] !== null && item[m] !== undefined);
      }
      return item;
    });

    setChartData(validData);
  }, [data, metrics, type]);

  // ===== نگاشت نام‌های نمایشی برای Legend و Tooltip =====
  const nameMap = metrics.reduce((acc, metric, index) => {
    acc[metric] = labels[index] || metric;
    return acc;
  }, {});

  const defaultColors = ['#2e7d32', '#f57c00', '#1a237e', '#c62828', '#6a1b9a'];
  const chartColors = colors.length > 0 ? colors : defaultColors;

  const themeColors = {
    text: isDark ? '#e0e0e0' : '#333',
    grid: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    background: isDark ? 'transparent' : 'transparent',
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

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
      margin: { top: 20, right: 30, left: 20, bottom: 30 },
    };

    const tooltipStyle = {
      backgroundColor: isDark ? '#1e1e1e' : '#fff',
      border: `1px solid ${isDark ? '#333' : '#ddd'}`,
      borderRadius: '8px',
      padding: '8px 12px',
      color: isDark ? '#e0e0e0' : '#333',
    };

    const xAxisProps = {
      dataKey: 'date',
      tickFormatter: formatDate,
      tick: { fill: themeColors.text, fontSize: 10 },
      stroke: themeColors.text,
      interval: 'preserveStartEnd',
      angle: -15,
      textAnchor: 'end',
      label: {
        value: xAxisLabel,
        position: 'insideBottom',
        offset: -10,
        style: { fill: themeColors.text, fontSize: 12, fontWeight: 500 },
      },
    };

    const yAxisProps = {
      tick: { fill: themeColors.text, fontSize: 10 },
      stroke: themeColors.text,
      label: {
        value: yAxisLabel,
        angle: -90,
        position: 'insideLeft',
        style: { fill: themeColors.text, fontSize: 12, fontWeight: 500 },
      },
    };

    // ===== تابع formatter برای Tooltip =====
    const tooltipFormatter = (value, name) => {
      const displayName = nameMap[name] || name;
      return [value?.toFixed(2) || '-', displayName];
    };

    // ===== تابع formatter برای Legend =====
    const legendFormatter = (value) => {
      return nameMap[value] || value;
    };

    if (type === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip
              contentStyle={tooltipStyle}
              labelFormatter={(label) => `تاریخ: ${label}`}
              formatter={tooltipFormatter}
            />
            <Legend
              wrapperStyle={{ color: themeColors.text, paddingTop: '10px' }}
              verticalAlign="top"
              height={36}
              formatter={legendFormatter}
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
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip
              contentStyle={tooltipStyle}
              labelFormatter={(label) => `تاریخ: ${label}`}
              formatter={tooltipFormatter}
            />
            <Legend
              wrapperStyle={{ color: themeColors.text, paddingTop: '10px' }}
              verticalAlign="top"
              height={36}
              formatter={legendFormatter}
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
          <XAxis {...xAxisProps} />
          <YAxis {...yAxisProps} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelFormatter={(label) => `تاریخ: ${label}`}
            formatter={tooltipFormatter}
          />
          <Legend
            wrapperStyle={{ color: themeColors.text, paddingTop: '10px' }}
            verticalAlign="top"
            height={36}
            formatter={legendFormatter}
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