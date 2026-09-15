// frontend/src/pages/Admin/Finance/SalesReport.js
import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import adminService from '../../../services/adminService';
import ExportButton from '../../../components/Admin/ExportButton';
import LoadingSpinner from '../../../components/Admin/LoadingSpinner';
import './Finance.css';

const COLORS = ['#6c63ff', '#28a745', '#fd7e14', '#17a2b8', '#dc3545'];

const SalesReport = () => {
  const [period, setPeriod] = useState('monthly');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, [period]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const response = await adminService.getSalesReport({ period });
      setData(response.data);
    } catch (error) {
      console.error('Error loading sales report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    adminService.exportSales({ period }).then((response) => {
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `sales_report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
    });
  };

  const formatAmount = (amount) => Number(amount || 0).toLocaleString('fa-IR');

  if (loading) return <LoadingSpinner />;
  if (!data) return <div className="error">خطا در بارگذاری گزارش</div>;

  const { stats_by_period, plan_breakdown, payment_request_stats } = data;
  const topPlan = plan_breakdown?.[0];

  return (
    <div className="finance-page">
      <div className="page-header">
        <h1>📊 گزارش فروش</h1>
        <div className="header-actions">
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="period-select">
            <option value="daily">روزانه</option>
            <option value="monthly">ماهانه</option>
            <option value="yearly">سالانه</option>
          </select>
          <ExportButton onExport={handleExport} />
        </div>
      </div>

      {/* ============================================ */}
      {/* ✅ کارت‌های آماری کلی                         */}
      {/* ============================================ */}
      <div className="stats-grid mini">
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <div className="stat-value">{formatAmount(data.total_revenue)} تومان</div>
            <div className="stat-label">درآمد کل</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <div className="stat-value">{data.total_sales}</div>
            <div className="stat-label">تعداد فروش</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-info">
            <div className="stat-value">{formatAmount(data.average_price)} تومان</div>
            <div className="stat-label">میانگین قیمت</div>
          </div>
        </div>
        {topPlan && (
          <div className="stat-card highlight-top-plan">
            <div className="stat-icon">🏆</div>
            <div className="stat-info">
              <div className="stat-value">{topPlan.plan_name}</div>
              <div className="stat-label">پرفروش‌ترین پلن ({topPlan.count} خرید)</div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================ */}
      {/* ✅ آمار تفکیکی روز/هفته/ماه/سال              */}
      {/* ============================================ */}
      {stats_by_period && (
        <>
          <h3 className="section-title">📅 آمار تفکیکی</h3>
          <div className="stats-grid period-stats">
            <PeriodCard
              icon="☀️"
              title="امروز"
              count={stats_by_period.today.count}
              amount={stats_by_period.today.amount}
              color="#4caf50"
            />
            <PeriodCard
              icon="📆"
              title="۷ روز اخیر"
              count={stats_by_period.week.count}
              amount={stats_by_period.week.amount}
              color="#2196f3"
            />
            <PeriodCard
              icon="🗓️"
              title="۳۰ روز اخیر"
              count={stats_by_period.month.count}
              amount={stats_by_period.month.amount}
              color="#ff9800"
            />
            <PeriodCard
              icon="📅"
              title="یک سال اخیر"
              count={stats_by_period.year.count}
              amount={stats_by_period.year.amount}
              color="#9c27b0"
            />
          </div>
        </>
      )}

      {/* ============================================ */}
      {/* ✅ آمار کارت به کارت                          */}
      {/* ============================================ */}
      {payment_request_stats && (
        <>
          <h3 className="section-title">💳 آمار کارت به کارت</h3>
          <div className="stats-grid period-stats">
            <PeriodCard
              icon="⏳"
              title="در انتظار بررسی"
              count={payment_request_stats.pending_count}
              amount={payment_request_stats.pending_amount}
              color="#ff9800"
            />
            <PeriodCard
              icon="✅"
              title="تأیید شده"
              count={payment_request_stats.approved_count}
              amount={payment_request_stats.approved_amount}
              color="#4caf50"
            />
          </div>
        </>
      )}

      {/* ============================================ */}
      {/* نمودارها                                     */}
      {/* ============================================ */}
      <h3 className="section-title">📈 نمودارها</h3>
      <div className="charts-grid">
        <div className="chart-card">
          <h3>نمودار درآمد {period === 'daily' ? 'روزانه' : period === 'monthly' ? 'ماهانه' : 'سالانه'}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.daily_data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => `${formatAmount(value)} تومان`} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#6c63ff" name="درآمد" />
              <Line type="monotone" dataKey="count" stroke="#28a745" name="تعداد" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>تفکیک فروش بر اساس پلن</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={plan_breakdown}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ plan_name, percentage }) => `${plan_name}: ${percentage}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="revenue"
              >
                {plan_breakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${formatAmount(value)} تومان`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ============================================ */}
      {/* جدول پلن‌ها (مرتب‌شده بر اساس تعداد)         */}
      {/* ============================================ */}
      <div className="chart-card">
        <h3>🏆 پرفروش‌ترین پلن‌ها (مرتب بر اساس تعداد)</h3>
        <table className="mini-table">
          <thead>
            <tr>
              <th>رتبه</th>
              <th>پلن</th>
              <th>تعداد خرید</th>
              <th>درآمد</th>
              <th>درصد</th>
            </tr>
          </thead>
          <tbody>
            {plan_breakdown.map((item, index) => (
              <tr key={index}>
                <td>
                  {index === 0 && '🥇'}
                  {index === 1 && '🥈'}
                  {index === 2 && '🥉'}
                  {index > 2 && index + 1}
                </td>
                <td>{item.plan_name}</td>
                <td>{item.count}</td>
                <td>{formatAmount(item.revenue)} تومان</td>
                <td>{item.percentage}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============================================
// ✅ کامپوننت کارت آمار تفکیکی
// ============================================
const PeriodCard = ({ icon, title, count, amount, color }) => (
  <div className="stat-card period-stat-card" style={{ borderLeft: `4px solid ${color}` }}>
    <div className="stat-icon">{icon}</div>
    <div className="stat-info">
      <div className="stat-value">{count} خرید</div>
      <div className="stat-label">{title}</div>
      <div className="stat-sub">{Number(amount || 0).toLocaleString('fa-IR')} تومان</div>
    </div>
  </div>
);

export default SalesReport;