// frontend/src/pages/Admin/Dashboard/Dashboard.js
import React, { useState, useEffect } from 'react';
import adminService from '../../../services/adminService';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await adminService.getDashboard();
      setStats(response.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">در حال بارگذاری...</div>;
  if (!stats) return <div className="error">خطا در بارگذاری داشبورد</div>;

  const { users, subscriptions, trades, consultations, finance, charts, recent_logs } = stats;

  return (
    <div className="admin-dashboard">
      <h1>داشبورد مدیریت</h1>

      {/* کارت‌های آماری */}
      <div className="stats-grid">
        <StatCard icon="👤" label="کاربران" value={users.total} sub={`+${users.new_today} امروز`} />
        <StatCard icon="📦" label="اشتراک فعال" value={subscriptions.active} sub={`${subscriptions.expiring_soon} در حال انقضا`} />
        <StatCard icon="📈" label="تریدها" value={trades.total} sub={`برد ${trades.win_rate}%`} />
        <StatCard icon="💰" label="درآمد کل" value={`${finance.total_revenue.toLocaleString()} تومان`} sub={`${finance.revenue_today.toLocaleString()} امروز`} />
        <StatCard icon="🤖" label="مشاوره‌ها" value={consultations.total} sub={`میانگین امتیاز ${consultations.avg_score}`} />
        <StatCard icon="✉️" label="پیام‌ها" value={stats.messages.pending} sub={`${stats.messages.unreplied} پاسخ‌نشده`} />
      </div>

      {/* نمودارها */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3>درآمد ماهانه</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={charts.monthly_stats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#8884d8" name="درآمد" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>بهترین نمادها</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={charts.top_symbols}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="symbol" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="profit" fill="#82ca9d" name="سود" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* لاگ‌های اخیر */}
      <div className="recent-logs">
        <h3>آخرین اقدامات</h3>
        <table className="logs-table">
          <thead>
            <tr>
              <th>زمان</th>
              <th>ادمین</th>
              <th>اقدام</th>
              <th>توضیحات</th>
            </tr>
          </thead>
          <tbody>
            {recent_logs.map((log) => (
              <tr key={log.id}>
                <td>{new Date(log.created_at).toLocaleString('fa-IR')}</td>
                <td>{log.admin_name || log.admin_phone}</td>
                <td>{log.action_display}</td>
                <td>{log.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, sub }) => (
  <div className="stat-card">
    <div className="stat-icon">{icon}</div>
    <div className="stat-info">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  </div>
);

export default Dashboard;