// frontend/src/components/Admin/Charts/UsersChart.js
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const UsersChart = ({ data, title = 'کاربران جدید' }) => {
  if (!data || data.length === 0) {
    return <div className="empty-chart">هیچ داده‌ای برای نمایش وجود ندارد</div>;
  }

  return (
    <div className="chart-wrapper" style={{ width: '100%', height: 300 }}>
      <h3 className="chart-title">{title}</h3>
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="count" fill="#6c63ff" name="تعداد کاربران" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default UsersChart;