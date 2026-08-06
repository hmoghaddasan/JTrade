// frontend/src/components/dashboard/Dashboard.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import PnLCalendar from './PnLCalendar';
import TradeList from '../trading/TradeList';
import TradeDetail from '../trading/TradeDetail';
import TradeGroupList from '../trading/TradeGroupList';
import RulesComplianceWidget from './RulesComplianceWidget';
import RealApiService from '../../services/realApiService';
import './dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const [trades, setTrades] = useState([]);
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState([]);

  // ============================================
  // بارگذاری داده‌ها
  // ============================================
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const tradesRes = await RealApiService.getTrades();
        setTrades(tradesRes.data.results || []);

        const groupsRes = await RealApiService.getTradeGroups();
        setGroups(groupsRes.data.results || []);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // ============================================
  // کلیک روی روز تقویم
  // ============================================
  const handleDayClick = (date) => {
    setSelectedDate(date);
    console.log('Selected date:', date);
  };

  // ============================================
  // رندر
  // ============================================
  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner">⏳</div>
        <p>در حال بارگذاری داشبورد...</p>
      </div>
    );
  }

  return (
    <div className={`dashboard ${isDark ? 'dark' : 'light'}`}>
      <div className="dashboard-container">
        {/* ===== هدر ===== */}
        <div className="dashboard-header">
          <h2>🏠 داشبورد</h2>
          <p className="dashboard-welcome">
            خوش آمدید {user?.first_name || user?.phone_number || 'کاربر'} عزیز
          </p>
        </div>

        {/* ===== تقویم P&L ===== */}
        <div className="dashboard-calendar-wrapper">
          <PnLCalendar
            trades={trades}
            onDayClick={handleDayClick}
            selectedDate={selectedDate}
            compact={true}
          />
        </div>

        {/* ===== ویجت پایبندی به قوانین ===== */}
        <RulesComplianceWidget />

        {/* ===== کارت‌های وضعیت ===== */}
        <div className="user-status">
          <div className="status-card">
            <div className="status-label">تعداد تریدها</div>
            <div className="status-value">{trades.length}</div>
          </div>
          <div className="status-card">
            <div className="status-label">گروه‌ها</div>
            <div className="status-value">{groups.length}</div>
          </div>
          <div className="status-card">
            <div className="status-label">وضعیت اشتراک</div>
            <div className="status-value" style={{ fontSize: '20px', color: '#2e7d32' }}>
              ✅ فعال
            </div>
          </div>
        </div>

        {/* ===== دکمه‌های سریع ===== */}
        <div className="quick-actions">
          <h3>⚡ اقدامات سریع</h3>
          <div className="actions-grid">
            <button
              className="quick-action-btn"
              style={{ background: 'linear-gradient(135deg, #2e7d32, #1b5e20)' }}
              onClick={() => navigate('/trades/new')}
            >
              <span className="action-icon">➕</span>
              <span className="action-label">ترید جدید</span>
            </button>
            <button
              className="quick-action-btn"
              style={{ background: 'linear-gradient(135deg, #0d47a1, #01579b)' }}
              onClick={() => navigate('/trades')}
            >
              <span className="action-icon">📈</span>
              <span className="action-label">لیست تریدها</span>
            </button>
            <button
              className="quick-action-btn"
              style={{ background: 'linear-gradient(135deg, #f57f17, #e65100)' }}
              onClick={() => navigate('/reports')}
            >
              <span className="action-icon">📊</span>
              <span className="action-label">گزارشات</span>
            </button>
            <button
              className="quick-action-btn"
              style={{ background: 'linear-gradient(135deg, #00695c, #004d40)' }}
              onClick={() => navigate('/messages')}
            >
              <span className="action-icon">💬</span>
              <span className="action-label">پیام‌ها</span>
            </button>
            <button
              className="quick-action-btn"
              style={{ background: 'linear-gradient(135deg, #6a1b9a, #4a148c)' }}
              onClick={() => navigate('/ai-consultation')}
            >
              <span className="action-icon">🧠</span>
              <span className="action-label">مشاور AI</span>
            </button>
          </div>
        </div>

        {/* ===== بخش اصلی سه‌ستونی ===== */}
        <div className="dashboard-main">
          <div className="dashboard-left">
            <TradeGroupList
              groups={groups}
              selectedGroup={selectedGroup}
              onSelectGroup={setSelectedGroup}
            />
          </div>
          <div className="dashboard-center">
            <TradeList
              trades={trades}
              selectedTrade={selectedTrade}
              onSelectTrade={setSelectedTrade}
              groupId={selectedGroup?.id}
            />
          </div>
          <div className="dashboard-right">
            <TradeDetail trade={selectedTrade} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;