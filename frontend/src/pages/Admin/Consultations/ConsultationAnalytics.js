// frontend/src/pages/Admin/Consultations/ConsultationAnalytics.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import adminService from '../../../services/adminService';
import LoadingSpinner from '../../../components/Admin/LoadingSpinner';
import './ConsultationAnalytics.css';

const COLORS = ['#6c63ff', '#28a745', '#fd7e14', '#17a2b8', '#dc3545', '#6f42c1'];

const ConsultationAnalytics = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const response = await adminService.getConsultationAnalytics();
      setData(response.data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!data) return <div className="error">خطا در بارگذاری داده‌ها</div>;

  // آماده‌سازی داده برای نمودار توزیع امتیازات
  const feedbackDistribution = Object.entries(data.feedback_distribution || {}).map(([key, value]) => ({
    name: `${key} ستاره`,
    value: value
  }));

  // آماده‌سازی داده برای نمودار مفید بودن
  const helpfulnessData = Object.entries(data.feedback_helpfulness || {}).map(([key, value]) => ({
    name: key === 'very_helpful' ? 'بسیار مفید' :
          key === 'somewhat_helpful' ? 'نسبتاً مفید' :
          key === 'little_helpful' ? 'کم‌فایده' : 'بی‌فایده',
    value: value
  }));

  return (
    <div className="consultation-analytics-page">
      <div className="page-header">
        <h1>📊 تحلیل عملکرد هوش مصنوعی</h1>
        <button onClick={() => navigate('/admin/consultations')} className="btn-back">
          🔙 بازگشت
        </button>
      </div>

      <div className="stats-grid mini">
        <div className="stat-card">
          <div className="stat-icon">🤖</div>
          <div className="stat-info">
            <div className="stat-value">{data.total_consultations}</div>
            <div className="stat-label">کل مشاوره‌ها</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-info">
            <div className="stat-value">{data.overall_avg_score}</div>
            <div className="stat-label">میانگین امتیاز AI</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📝</div>
          <div className="stat-info">
            <div className="stat-value">{data.total_with_feedback}</div>
            <div className="stat-label">بازخورد دریافت‌شده</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💯</div>
          <div className="stat-info">
            <div className="stat-value">{data.overall_avg_feedback}</div>
            <div className="stat-label">میانگین امتیاز بازخورد</div>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3>عملکرد مدل‌های مختلف</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.model_analytics || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="model_name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="avg_score" fill="#6c63ff" name="میانگین امتیاز" />
              <Bar dataKey="avg_feedback" fill="#28a745" name="میانگین بازخورد" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>توزیع امتیازات بازخورد</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={feedbackDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                dataKey="value"
              >
                {feedbackDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>میزان مفید بودن بازخوردها</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={helpfulnessData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#6f42c1" name="تعداد" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>جزئیات مدل‌ها</h3>
          <table className="mini-table">
            <thead>
              <tr>
                <th>مدل</th>
                <th>تعداد مشاوره</th>
                <th>امتیاز AI</th>
                <th>بازخورد</th>
                <th>نرخ موفقیت</th>
                <th>نماد پرکاربرد</th>
              </tr>
            </thead>
            <tbody>
              {data.model_analytics?.map((model, index) => (
                <tr key={index}>
                  <td>{model.model_name}</td>
                  <td>{model.total_consultations}</td>
                  <td>{model.avg_score}</td>
                  <td>{model.avg_feedback}</td>
                  <td style={{ color: model.success_rate > 60 ? 'green' : 'red' }}>
                    {model.success_rate}%
                  </td>
                  <td>{model.most_common_symbol}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ConsultationAnalytics;