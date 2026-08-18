// frontend/src/components/reports/MetricsTable.js

import React from 'react';
import './MetricsTable.css';

const MetricsTable = ({ metrics, periods }) => {
  if (!metrics) return null;

  // ===== تعریف شاخص‌ها با نام کامل فارسی + لاتین =====
  const metricDefinitions = [
    {
      key: 'sharpe_ratio',
      label: 'نسبت شارپ (Sharpe Ratio)',
      getValue: (data) => data?.sharpe_ratio,
      getDesc: (data) => data?.sharpe_desc,
      format: (v) => v?.toFixed(2) || '-',
    },
    {
      key: 'sortino_ratio',
      label: 'نسبت سورتینو (Sortino Ratio)',
      getValue: (data) => data?.sortino_ratio,
      getDesc: (data) => data?.sortino_desc,
      format: (v) => v?.toFixed(2) || '-',
    },
    {
      key: 'calmar_ratio',
      label: 'نسبت کالمار (Calmar Ratio)',
      getValue: (data) => data?.calmar_ratio,
      getDesc: (data) => data?.calmar_desc,
      format: (v) => v?.toFixed(2) || '-',
    },
    {
      key: 'profit_factor',
      label: 'فاکتور سود (Profit Factor)',
      getValue: (data) => data?.profit_factor,
      getDesc: (data) => data?.profit_factor_desc,
      format: (v) => v?.toFixed(2) || '-',
    },
    {
      key: 'max_drawdown',
      label: 'حداکثر افت (Max Drawdown)',
      getValue: (data) => data?.max_drawdown,
      getDesc: (data) => null,
      format: (v) => (v !== null && v !== undefined ? `${v.toFixed(1)}%` : '-'),
      isNegative: true,
    },
    {
      key: 'kelly_criterion',
      label: 'معیار کلی (Kelly Criterion)',
      getValue: (data) => data?.kelly_criterion,
      getDesc: (data) => data?.kelly_desc,
      format: (v) => (v !== null && v !== undefined ? `${(v * 100).toFixed(1)}%` : '-'),
    },
    {
      key: 'avg_rr',
      label: 'میانگین R:R (Avg R/R)',
      getValue: (data) => data?.avg_rr,
      getDesc: (data) => null,
      format: (v) => v?.toFixed(2) || '-',
    },
    {
      key: 'expectancy',
      label: 'امید ریاضی (Expectancy)',
      getValue: (data) => data?.expectancy,
      getDesc: (data) => null,
      format: (v) => (v !== null && v !== undefined ? `$${v.toFixed(2)}` : '-'),
    },
    {
      key: 'recovery_factor',
      label: 'فاکتور بازیابی (Recovery Factor)',
      getValue: (data) => data?.recovery_factor,
      getDesc: (data) => null,
      format: (v) => v?.toFixed(2) || '-',
    },
  ];

  const periodKeys = periods.map(p => p.key);

  const getPeriodData = (periodKey) => {
    return metrics[periodKey] || null;
  };

  const getStatusColor = (key, value) => {
    if (value === null || value === undefined) return '';

    if (key === 'sharpe_ratio') {
      if (value < 0) return 'danger';
      if (value < 1) return 'warning';
      if (value < 2) return 'good';
      if (value < 3) return 'excellent';
      return 'amazing';
    }

    if (key === 'sortino_ratio') {
      if (value < 0) return 'danger';
      if (value < 1) return 'warning';
      if (value < 2) return 'good';
      if (value < 3) return 'excellent';
      return 'amazing';
    }

    if (key === 'profit_factor') {
      if (value < 1) return 'danger';
      if (value < 1.2) return 'warning';
      if (value < 1.5) return 'good';
      if (value < 2) return 'excellent';
      return 'amazing';
    }

    if (key === 'max_drawdown') {
      if (value < 10) return 'amazing';
      if (value < 20) return 'good';
      if (value < 30) return 'warning';
      return 'danger';
    }

    if (key === 'kelly_criterion') {
      if (value < 0) return 'danger';
      if (value < 0.05) return 'good';
      if (value < 0.15) return 'good';
      if (value < 0.25) return 'warning';
      return 'danger';
    }

    return '';
  };

  const getStatusIcon = (key, value) => {
    const color = getStatusColor(key, value);
    if (color === 'amazing') return '🏆';
    if (color === 'excellent') return '🌟';
    if (color === 'good') return '✅';
    if (color === 'warning') return '🟡';
    if (color === 'danger') return '⚠️';
    return '';
  };

  return (
    <div className="metrics-table-container">
      <table className="metrics-table">
        <thead>
          <tr>
            <th className="metric-name">شاخص (نام لاتین)</th>
            {periods.map(p => (
              <th key={p.key} className="period-header">{p.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metricDefinitions.map((metric) => (
            <tr key={metric.key}>
              <td className="metric-name">{metric.label}</td>
              {periodKeys.map((periodKey) => {
                const data = getPeriodData(periodKey);
                const value = metric.getValue(data);
                const desc = metric.getDesc ? metric.getDesc(data) : null;
                const formatted = metric.format(value);
                const statusColor = getStatusColor(metric.key, value);
                const icon = getStatusIcon(metric.key, value);

                return (
                  <td key={periodKey} className="period-value">
                    <div className={`value-container ${statusColor}`}>
                      <span className="value">{formatted}</span>
                      {icon && <span className="status-icon">{icon}</span>}
                      {desc && (
                        <span className="value-desc">{desc}</span>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="metrics-legend">
        <span className="legend-title">راهنمای رنگ‌ها:</span>
        <span className="legend-item amazing">🏆 استثنایی</span>
        <span className="legend-item excellent">🌟 عالی</span>
        <span className="legend-item good">✅ خوب</span>
        <span className="legend-item warning">🟡 متوسط</span>
        <span className="legend-item danger">⚠️ نیاز به بهبود</span>
      </div>
    </div>
  );
};

export default MetricsTable;