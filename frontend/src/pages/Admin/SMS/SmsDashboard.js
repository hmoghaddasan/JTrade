// frontend/src/pages/Admin/SMS/SmsDashboard.js

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom';
import LoadingSpinner from '../../../components/Admin/LoadingSpinner';
import adminService from '../../../services/adminService';
import './SmsDashboard.css';

// زیرتب‌ها
import SmsProviderConfig from './SmsProviderConfig';
import SmsTemplates from './SmsTemplates';
import SmsMessages from './SmsMessages';
import SmsInbox from './SmsInbox';
import SmsErrors from './SmsErrors';

const SmsDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await adminService.getSmsStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error loading SMS stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { key: 'providers', label: '⚙️ پیکربندی', path: '/admin/sms/providers' },
    { key: 'templates', label: '📋 قالب‌ها', path: '/admin/sms/templates' },
    { key: 'messages', label: '📤 ارسالی', path: '/admin/sms/messages' },
    { key: 'inbox', label: '📥 دریافتی', path: '/admin/sms/inbox' },
    { key: 'errors', label: '⚠️ خطاها', path: '/admin/sms/errors' },
  ];

  const currentTab = tabs.find(t => location.pathname.startsWith(t.path))?.key || 'providers';

  if (loading) return <LoadingSpinner />;

  return (
    <div className="sms-dashboard-page">
      {/* ============ Header ============ */}
      <div className="sms-dashboard-header">
        <div>
          <h1>📱 سیستم پیامک</h1>
          <p className="sms-dashboard-subtitle">مدیریت providers، قالب‌ها، پیام‌های ارسالی و دریافتی</p>
        </div>
        <button className="btn-refresh" onClick={loadStats} title="بروزرسانی آمار">
          🔄
        </button>
      </div>

      {/* ============ Stats Cards ============ */}
      {stats && (
        <div className="sms-stats-grid">
          <div className="sms-stat-card">
            <div className="stat-icon">📤</div>
            <div className="stat-info">
              <span className="stat-label">کل ارسال‌ها</span>
              <span className="stat-value">{stats.total_sent || 0}</span>
            </div>
          </div>

          <div className="sms-stat-card success">
            <div className="stat-icon">✅</div>
            <div className="stat-info">
              <span className="stat-label">تحویل شده</span>
              <span className="stat-value">{stats.total_delivered || 0}</span>
            </div>
          </div>

          <div className="sms-stat-card danger">
            <div className="stat-icon">❌</div>
            <div className="stat-info">
              <span className="stat-label">ناموفق</span>
              <span className="stat-value">{stats.total_failed || 0}</span>
            </div>
          </div>

          <div className="sms-stat-card warning">
            <div className="stat-icon">⏳</div>
            <div className="stat-info">
              <span className="stat-label">در انتظار</span>
              <span className="stat-value">{stats.total_pending || 0}</span>
            </div>
          </div>

          <div className="sms-stat-card info">
            <div className="stat-icon">📅</div>
            <div className="stat-info">
              <span className="stat-label">امروز</span>
              <span className="stat-value">{stats.today_sent || 0}</span>
            </div>
          </div>

          <div className="sms-stat-card">
            <div className="stat-icon">📥</div>
            <div className="stat-info">
              <span className="stat-label">پیام‌های خوانده نشده</span>
              <span className="stat-value">{stats.inbox_unread || 0}</span>
            </div>
          </div>

          <div className="sms-stat-card cost">
            <div className="stat-icon">💰</div>
            <div className="stat-info">
              <span className="stat-label">هزینه امروز (ریال)</span>
              <span className="stat-value">{(stats.today_cost || 0).toLocaleString()}</span>
            </div>
          </div>

          <div className="sms-stat-card">
            <div className="stat-icon">💵</div>
            <div className="stat-info">
              <span className="stat-label">هزینه کل (ریال)</span>
              <span className="stat-value">{(stats.total_cost || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* ============ Tabs Navigation ============ */}
      <div className="sms-tabs-nav">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`sms-tab-btn ${currentTab === tab.key ? 'active' : ''}`}
            onClick={() => navigate(tab.path)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ============ Tabs Content ============ */}
      <div className="sms-tabs-content">
        <Routes>
          <Route path="providers" element={<SmsProviderConfig />} />
          <Route path="templates" element={<SmsTemplates />} />
          <Route path="messages" element={<SmsMessages />} />
          <Route path="inbox" element={<SmsInbox />} />
          <Route path="errors" element={<SmsErrors />} />
          <Route path="*" element={<Navigate to="/admin/sms/providers" replace />} />
        </Routes>
      </div>
    </div>
  );
};

export default SmsDashboard;