// frontend/src/pages/Admin/Finance/FinanceTabs.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import TransactionList from './TransactionList';
import SalesReport from './SalesReport';
import PaymentRequestsManagement from './PaymentRequestsManagement';
import PaymentCardsManagement from './PaymentCardsManagement';
import './FinanceTabs.css';

/**
 * تب‌بندی صفحه مالی ادمین
 * ۴ تب: تراکنش‌ها | درخواست‌های پرداخت | مدیریت کارت‌ها | گزارش فروش
 */
const FinanceTabs = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // تشخیص تب فعال بر اساس URL
  const getActiveTab = () => {
    if (location.pathname.includes('/finance/payment-requests')) return 'payment-requests';
    if (location.pathname.includes('/finance/payment-cards')) return 'payment-cards';
    if (location.pathname.includes('/finance/report')) return 'report';
    return 'transactions';
  };

  const [activeTab, setActiveTab] = useState(getActiveTab());

  useEffect(() => {
    setActiveTab(getActiveTab());
  }, [location.pathname]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'transactions') navigate('/admin/finance');
    else if (tab === 'payment-requests') navigate('/admin/finance/payment-requests');
    else if (tab === 'payment-cards') navigate('/admin/finance/payment-cards');
    else if (tab === 'report') navigate('/admin/finance/report');
  };

  const tabs = [
    { key: 'transactions', icon: '📋', label: 'تراکنش‌ها (درگاه)' },
    { key: 'payment-requests', icon: '💳', label: 'درخواست‌های پرداخت' },
    { key: 'payment-cards', icon: '🏦', label: 'مدیریت کارت‌ها' },
    { key: 'report', icon: '📊', label: 'گزارش فروش' },
  ];

  return (
    <div className="finance-tabs-container">
      {/* ===== تب‌بندی ===== */}
      <div className="finance-tabs-nav">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`finance-tab-btn ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => handleTabChange(tab.key)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ===== محتوای تب فعال ===== */}
      <div className="finance-tabs-content">
        {activeTab === 'transactions' && <TransactionList />}
        {activeTab === 'payment-requests' && <PaymentRequestsManagement />}
        {activeTab === 'payment-cards' && <PaymentCardsManagement />}
        {activeTab === 'report' && <SalesReport />}
      </div>
    </div>
  );
};

export default FinanceTabs;