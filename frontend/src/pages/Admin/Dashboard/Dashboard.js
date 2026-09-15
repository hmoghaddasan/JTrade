// frontend/src/pages/Admin/Dashboard/Dashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../../../services/adminService';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
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

  const { users, subscriptions, trades, consultations, finance, charts, recent_logs, payment_requests, messages } = stats;

  const pendingPaymentCount = payment_requests?.pending_review_count || 0;
  const unreadMessagesCount = messages?.unread_by_admin || 0;

  return (
    <div className="admin-dashboard">
      <h1>داشبورد مدیریت</h1>

      {/* ============================================ */}
      {/* ✅ بنر اطلاع‌رسانی پیام‌های جدید کاربران       */}
      {/* ============================================ */}
      {unreadMessagesCount > 0 && (
        <div className="pending-messages-banner">
          <div className="banner-content">
            <div className="banner-icon">✉️</div>
            <div className="banner-text">
              <div className="banner-title">
                {unreadMessagesCount} پیام جدید از کاربران
              </div>
              <div className="banner-subtitle">
                {messages.unreplied > 0 && `${messages.unreplied} پیام پاسخ‌نشده`}
              </div>
            </div>
          </div>
          <button
            className="banner-action"
            onClick={() => navigate('/admin/messages')}
          >
            مشاهده پیام‌ها ←
          </button>
        </div>
      )}

      {/* ============================================ */}
      {/* ✅ بنر اطلاع‌رسانی پرداخت‌های در انتظار       */}
      {/* ============================================ */}
      {pendingPaymentCount > 0 && (
        <div className="pending-payment-banner">
          <div className="banner-content">
            <div className="banner-icon">🔔</div>
            <div className="banner-text">
              <div className="banner-title">
                {pendingPaymentCount} درخواست پرداخت در انتظار بررسی
              </div>
              <div className="banner-subtitle">
                مبلغ کل: {Number(payment_requests.pending_review_amount || 0).toLocaleString('fa-IR')} تومان
              </div>
            </div>
          </div>
          <button
            className="banner-action"
            onClick={() => navigate('/admin/finance/payment-requests')}
          >
            بررسی درخواست‌ها ←
          </button>
        </div>
      )}

      {/* کارت‌های آماری */}
      <div className="stats-grid">
        <StatCard icon="👤" label="کاربران" value={users.total} sub={`+${users.new_today} امروز`} />
        <StatCard icon="📦" label="اشتراک فعال" value={subscriptions.active} sub={`${subscriptions.expiring_soon} در حال انقضا`} />
        <StatCard icon="📈" label="تریدها" value={trades.total} sub={`برد ${trades.win_rate}%`} />
        <StatCard icon="💰" label="درآمد کل" value={`${finance.total_revenue.toLocaleString()} تومان`} sub={`${finance.revenue_today.toLocaleString()} امروز`} />
        <StatCard icon="🤖" label="مشاوره‌ها" value={consultations.total} sub={`میانگین امتیاز ${consultations.avg_score}`} />
        <StatCard
          icon="✉️"
          label="پیام‌های جدید"
          value={unreadMessagesCount}
          sub={`${messages?.unreplied || 0} پاسخ‌نشده`}
          highlight={unreadMessagesCount > 0}
          onClick={() => navigate('/admin/messages')}
        />
        <StatCard
          icon="💳"
          label="درخواست‌های پرداخت"
          value={pendingPaymentCount}
          sub={`${Number(payment_requests?.pending_review_amount || 0).toLocaleString('fa-IR')} تومان`}
          highlight={pendingPaymentCount > 0}
          onClick={() => navigate('/admin/finance/payment-requests')}
        />
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

const StatCard = ({ icon, label, value, sub, highlight, onClick }) => (
  <div
    className={`stat-card ${highlight ? 'stat-card-highlight' : ''} ${onClick ? 'stat-card-clickable' : ''}`}
    onClick={onClick}
    style={{ cursor: onClick ? 'pointer' : 'default' }}
  >
    <div className="stat-icon">{icon}</div>
    <div className="stat-info">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-sub">{sub}</div>
    </div>
    {highlight && <span className="stat-highlight-dot"></span>}
  </div>
);

export default Dashboard;