// frontend/src/components/Admin/Charts/RevenueChart.js
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const RevenueChart = ({ data, title = 'نمودار درآمد' }) => {
  if (!data || data.length === 0) {
    return <div className="empty-chart">هیچ داده‌ای برای نمایش وجود ندارد</div>;
  }

  return (
    <div className="chart-wrapper" style={{ width: '100%', height: 300 }}>
      <h3 className="chart-title">{title}</h3>
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip formatter={(value) => `${value.toLocaleString()} تومان`} />
          <Legend />
          <Line type="monotone" dataKey="revenue" stroke="#6c63ff" name="درآمد" strokeWidth={2} />
          <Line type="monotone" dataKey="count" stroke="#28a745" name="تعداد" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RevenueChart;