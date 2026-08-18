// frontend/src/App.js

import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { ConsultationProvider } from './contexts/ConsultationContext';
import ConsultationProgressWidget from './components/ai/ConsultationProgressWidget';
import SubscriptionRenewal from './components/auth/SubscriptionRenewal';
import PaymentVerify from './components/PaymentVerify';
import RealApiService from './services/realApiService';
import PortfolioComparisonPage from './pages/PortfolioComparisonPage';

// Auth Components
import LoginStep1 from './components/auth/LoginStep1';
import VerifyCode from './components/auth/VerifyCode';
import Register from './components/auth/Register';

// Main Components
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';

// Trading Components
import TradeForm from './components/TradeForm';
import TradeEditForm from './components/TradeEditForm';
import TradeList from './components/TradeList';
import TradeDetail from './components/TradeDetail';

// Reports Components
import ReportDashboard from './components/reports/ReportDashboard';

// ✅ Advanced Metrics - جدید
import AdvancedMetricsReport from './components/reports/AdvancedMetricsReport';

// Analytics
import AnalyticsDashboard from './components/analytics/AnalyticsDashboard';

// AI Consultation
import AIConsultation from './components/ai/AIConsultation';
import AIConsultationHistory from './components/ai/AIConsultationHistory';
import AIConsultationDetail from './components/ai/AIConsultationDetail';
import ConsultationCompletedBanner from './components/ai/ConsultationCompletedBanner';

import PortfolioList from './pages/Admin/Portfolios/PortfolioList';
import { PortfolioProvider } from './contexts/PortfolioContext';

// ============================================
// ✅ Admin Panel Components
// ============================================
import AdminLayout from './pages/Admin/AdminLayout';
import AdminDashboard from './pages/Admin/Dashboard/Dashboard';
import UserList from './pages/Admin/Users/UserList';
import UserDetail from './pages/Admin/Users/UserDetail';
import UserEdit from './pages/Admin/Users/UserEdit';
import SubscriptionList from './pages/Admin/Subscriptions/SubscriptionList';
import SubscriptionDetail from './pages/Admin/Subscriptions/SubscriptionDetail';
import TransactionList from './pages/Admin/Finance/TransactionList';
import SalesReport from './pages/Admin/Finance/SalesReport';
import DiscountList from './pages/Admin/Discounts/DiscountList';
import SymbolList from './pages/Admin/Symbols/SymbolList';
import ConsultationList from './pages/Admin/Consultations/ConsultationList';
import ConsultationDetail from './pages/Admin/Consultations/ConsultationDetail';
import ConsultationAnalytics from './pages/Admin/Consultations/ConsultationAnalytics';
import AdminTradeList from './pages/Admin/Trades/TradeList';
import AdminTradeDetail from './pages/Admin/Trades/TradeDetail';
import AdminMessageList from './pages/Admin/Messages/MessageList';
import VersionList from './pages/Admin/Versions/VersionList';
import Settings from './pages/Admin/Settings/Settings';
import PlanList from './pages/Admin/Subscriptions/PlanList';

// Messaging Components
import MessageList from './components/messaging/MessageList';
import MessageForm from './components/messaging/MessageForm';

// Styles
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <ConsultationProvider>
            <PortfolioProvider>
              <Router>
                <AppRoutes />
                <ConsultationProgressWidget />
                <ConsultationCompletedBanner />
              </Router>
            </PortfolioProvider>
          </ConsultationProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function AppRoutes() {
  const { isAuthenticated, loading, user } = useAuth();
  const [showVerify, setShowVerify] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const hasRedirected = useRef(false);
  const [isSubscriptionChecked, setIsSubscriptionChecked] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [isSubscriptionExpired, setIsSubscriptionExpired] = useState(false);

  // ============================================
  // بررسی وضعیت اشتراک
  // ============================================
  useEffect(() => {
    const checkSubscription = async () => {
      if (!isAuthenticated || loading) return;

      try {
        const response = await RealApiService.getSubscriptionStatus();
        const status = response.data;
        console.log('📊 Subscription status from server:', status);

        setSubscriptionStatus(status);
        setIsSubscriptionChecked(true);

        if (status.is_admin || (status.has_subscription && !status.is_expired)) {
          setIsSubscriptionExpired(false);
        } else {
          setIsSubscriptionExpired(true);
        }

        if (status.is_admin || location.pathname.startsWith('/admin')) {
          return;
        }

        if (status.has_subscription && status.is_expired) {
          if (location.pathname !== '/profile' && location.pathname !== '/subscription/renew') {
            navigate('/profile', { replace: true });
          }
        } else if (!status.has_subscription) {
          if (location.pathname !== '/profile' && location.pathname !== '/subscription/renew') {
            navigate('/profile', { replace: true });
          }
        }

      } catch (error) {
        console.error('❌ Error checking subscription:', error);
        setIsSubscriptionChecked(true);
      }
    };

    checkSubscription();
  }, [isAuthenticated, loading, location.pathname, navigate]);

  // ============================================
  // هدایت کاربر - صفحات ادمین استثنا
  // ============================================
  useEffect(() => {
    if (user?.is_admin) {
      console.log('👑 Admin user detected, skipping redirect');
      return;
    }

    const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
    const isPaymentPage = location.pathname === '/payment/verify/';
    const isRenewPage = location.pathname === '/subscription/renew';
    const isProfilePage = location.pathname === '/profile';
    const isAdminPage = location.pathname.startsWith('/admin');

    if (isPaymentPage || isRenewPage || isAdminPage) {
      console.log('⏭️ Skipping redirect on payment/renew/admin page');
      return;
    }

    if (isAuthenticated && !loading && isSubscriptionChecked && !hasRedirected.current && !isAuthPage) {
      if (subscriptionStatus?.is_admin ||
          (subscriptionStatus?.has_subscription && !subscriptionStatus?.is_expired)) {
        console.log('🔄 Redirecting to dashboard');
        hasRedirected.current = true;
        navigate('/dashboard', { replace: true });
      } else {
        if (!isProfilePage) {
          console.log('🔄 Redirecting to profile (no active subscription)');
          hasRedirected.current = true;
          navigate('/profile', { replace: true });
        }
      }
    }
  }, [isAuthenticated, loading, isSubscriptionChecked, subscriptionStatus, navigate, location.pathname, user]);

  // ============================================
  // جلوگیری از خروج از صفحات ادمین
  // ============================================
  useEffect(() => {
    if (user?.is_admin) {
      return;
    }

    if (isSubscriptionExpired && isSubscriptionChecked) {
      const currentPath = location.pathname;
      if (currentPath !== '/profile' && currentPath !== '/subscription/renew' && !currentPath.startsWith('/admin')) {
        navigate('/profile', { replace: true });
      }
    }
  }, [isSubscriptionExpired, isSubscriptionChecked, location.pathname, navigate, user]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>در حال اتصال به سرور...</p>
      </div>
    );
  }

  // ============================================
  // توابع کنترل مرحله احراز هویت
  // ============================================
  const handleCodeSent = () => {
    console.log('📱 Moving to verify step');
    setShowVerify(true);
  };

  const handleVerifySuccess = () => {
    console.log('✅ Verification successful');
    setShowVerify(false);
    hasRedirected.current = false;
    navigate('/dashboard', { replace: true });
  };

  const handleBackToLogin = () => {
    console.log('↩️ Back to login');
    setShowVerify(false);
  };

  // ============================================
  // اگر کاربر احراز هویت شده - نمایش صفحات داخلی
  // ============================================
  if (isAuthenticated) {
    return (
      <Routes>
        {/* ===== مسیرهای اصلی کاربر ===== */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/subscription/renew" element={<SubscriptionRenewal />} />
        <Route path="/payment/verify/" element={<PaymentVerify />} />
        <Route path="/trades" element={<TradeList />} />
        <Route path="/trades/new" element={<TradeForm />} />
        <Route path="/trades/edit/:id" element={<TradeEditForm />} />
        <Route path="/trades/:id" element={<TradeDetail />} />
        <Route path="/reports" element={<ReportDashboard />} />

        {/* ===== ✅ مسیر شاخص‌های پیشرفته ===== */}
        <Route path="/advanced-metrics" element={<AdvancedMetricsReport />} />
        <Route path="/portfolio-comparison" element={<PortfolioComparisonPage />} />
        <Route path="/analytics" element={<AnalyticsDashboard />} />
        <Route path="/messages" element={<MessageList />} />
        <Route path="/messages/new" element={<MessageForm />} />
        <Route path="/ai-consultation" element={<AIConsultation />} />
        <Route path="/ai-history" element={<AIConsultationHistory />} />
        <Route path="/ai-consultation/detail/:id" element={<AIConsultationDetail />} />

        {/* ========================================== */}
        {/* مسیرهای پنل ادمین */}
        {/* ========================================== */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="portfolios" element={<PortfolioList />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<UserList />} />
          <Route path="users/:id" element={<UserDetail />} />
          <Route path="users/:id/edit" element={<UserEdit />} />
          <Route path="subscriptions" element={<SubscriptionList />} />
          <Route path="subscriptions/:id" element={<SubscriptionDetail />} />
          <Route path="finance" element={<TransactionList />} />
          <Route path="finance/report" element={<SalesReport />} />
          <Route path="discounts" element={<DiscountList />} />
          <Route path="symbols" element={<SymbolList />} />
          <Route path="consultations" element={<ConsultationList />} />
          <Route path="consultations/:id" element={<ConsultationDetail />} />
          <Route path="consultations/analytics" element={<ConsultationAnalytics />} />
          <Route path="trades" element={<AdminTradeList />} />
          <Route path="trades/:id" element={<AdminTradeDetail />} />
          <Route path="messages" element={<AdminMessageList />} />
          <Route path="versions" element={<VersionList />} />
          <Route path="settings" element={<Settings />} />
          <Route path="subscription-plans" element={<PlanList />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    );
  }

  // ============================================
  // کاربر احراز هویت نشده - نمایش صفحات لاگین
  // ============================================
  return (
    <Routes>
      <Route
        path="/login"
        element={
          showVerify ? (
            <VerifyCode
              onVerifySuccess={handleVerifySuccess}
              onBack={handleBackToLogin}
            />
          ) : (
            <LoginStep1 onCodeSent={handleCodeSent} />
          )
        }
      />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;