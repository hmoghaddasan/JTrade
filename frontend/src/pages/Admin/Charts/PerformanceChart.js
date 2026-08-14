// frontend/src/components/Admin/Charts/PerformanceChart.js
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const PerformanceChart = ({ data, title = 'عملکرد' }) => {
  if (!data || data.length === 0) {
    return <div className="empty-chart">هیچ داده‌ای برای نمایش وجود ندارد</div>;
  }

  return (
    <div className="chart-wrapper" style={{ width: '100%', height: 300 }}>
      <h3 className="chart-title">{title}</h3>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis dataKey="name" type="category" />
          <Tooltip />
          <Legend />
          <Bar dataKey="value" fill="#28a745" name="ارزش" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PerformanceChart;