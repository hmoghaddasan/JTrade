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

  if (loading) return <LoadingSpinner />;
  if (!data) return <div className="error">خطا در بارگذاری گزارش</div>;

  return (
    <div className="finance-page">
      <div className="page-header">
        <h1>گزارش فروش</h1>
        <div className="header-actions">
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="period-select">
            <option value="daily">روزانه</option>
            <option value="monthly">ماهانه</option>
            <option value="yearly">سالانه</option>
          </select>
          <ExportButton onExport={handleExport} />
        </div>
      </div>

      <div className="stats-grid mini">
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <div className="stat-value">{data.total_revenue.toLocaleString()} تومان</div>
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
            <div className="stat-value">{data.average_price.toLocaleString()} تومان</div>
            <div className="stat-label">میانگین قیمت</div>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3>نمودار درآمد {period === 'daily' ? 'روزانه' : period === 'monthly' ? 'ماهانه' : 'سالانه'}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.daily_data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => `${value.toLocaleString()} تومان`} />
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
                data={data.plan_breakdown}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ plan_name, percentage }) => `${plan_name}: ${percentage}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="revenue"
              >
                {data.plan_breakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value.toLocaleString()} تومان`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-card">
        <h3>داده‌های تفکیکی</h3>
        <table className="mini-table">
          <thead>
            <tr>
              <th>پلن</th>
              <th>تعداد</th>
              <th>درآمد</th>
              <th>درصد</th>
            </tr>
          </thead>
          <tbody>
            {data.plan_breakdown.map((item, index) => (
              <tr key={index}>
                <td>{item.plan_name}</td>
                <td>{item.count}</td>
                <td>{item.revenue.toLocaleString()} تومان</td>
                <td>{item.percentage}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SalesReport;