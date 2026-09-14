// frontend/src/App.js

import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { ConsultationProvider } from './contexts/ConsultationContext';
import { PortfolioProvider, usePortfolio } from './contexts/PortfolioContext';
import ConsultationProgressWidget from './components/ai/ConsultationProgressWidget';
import SubscriptionRenewal from './components/auth/SubscriptionRenewal';
import PaymentVerify from './components/PaymentVerify';
import RealApiService from './services/realApiService';
import PortfolioComparisonPage from './pages/PortfolioComparisonPage';
import DisciplineDashboard from './pages/DisciplineDashboard';
import SmsDashboard from './pages/Admin/SMS/SmsDashboard';
// ===== Finance Tabs و صفحات جدید =====
import FinanceTabs from './pages/Admin/Finance/FinanceTabs';

// ===== کامپوننت Layout =====
import AppLayout from './components/common/AppLayout';

// ===== صفحات جدید =====
import AboutPage from './pages/AboutPage';
import TermsPage from './pages/TermsPage';
import ContactPage from './pages/ContactPage';

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

// Advanced Metrics
import AdvancedMetricsReport from './components/reports/AdvancedMetricsReport';

// Analytics
import AnalyticsDashboard from './components/analytics/AnalyticsDashboard';

// AI Consultation
import AIConsultation from './components/ai/AIConsultation';
import AIConsultationHistory from './components/ai/AIConsultationHistory';
import AIConsultationDetail from './components/ai/AIConsultationDetail';
import ConsultationCompletedBanner from './components/ai/ConsultationCompletedBanner';
import BrokerList from './pages/Admin/Brokers/BrokerList';
import PortfolioList from './pages/Admin/Portfolios/PortfolioList';
import ImportPage from './pages/ImportPage';

// ===== پیام‌های سیستمی =====
import SystemMessageList from './pages/Admin/Messages/SystemMessageList';
import SystemMessageForm from './pages/Admin/Messages/SystemMessageForm';

// ============================================
// Admin Panel Components
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
  const { loadPortfolios } = usePortfolio();
  const [showVerify, setShowVerify] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const hasRedirected = useRef(false);
  const [isSubscriptionChecked, setIsSubscriptionChecked] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [isSubscriptionExpired, setIsSubscriptionExpired] = useState(false);
  const hasLoadedPortfolios = useRef(false);

  // ============================================
  // ✅ بارگذاری پورتفولیوها فقط یک بار پس از احراز هویت
  // ============================================
  useEffect(() => {
    if (isAuthenticated && !loading && user && !hasLoadedPortfolios.current) {
      console.log('🔄 Loading portfolios once after authentication...');
      hasLoadedPortfolios.current = true;
      loadPortfolios();
    }
  }, [isAuthenticated, loading, user, loadPortfolios]);

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
    const isPublicPage = location.pathname === '/about' || location.pathname === '/terms' || location.pathname === '/contact';
    const isPaymentPage = location.pathname === '/payment/verify/';
    const isRenewPage = location.pathname === '/subscription/renew';
    const isProfilePage = location.pathname === '/profile';
    const isAdminPage = location.pathname.startsWith('/admin');

    if (isPaymentPage || isRenewPage || isAdminPage || isPublicPage) {
      console.log('⏭️ Skipping redirect on public/payment/renew/admin page');
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
        <div className="loading-bar"></div>
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

    localStorage.removeItem('jtrade_system_messages_data');
    console.log('🗑️ localStorage پیام‌های سیستمی پاک شد');

    setShowVerify(false);
    hasRedirected.current = false;
    hasLoadedPortfolios.current = false;
    loadPortfolios();
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
        {/* ===== مسیرهای اصلی کاربر با Layout ===== */}
        <Route path="/" element={
          <AppLayout>
            <Dashboard />
          </AppLayout>
        } />
        <Route path="/dashboard" element={
          <AppLayout>
            <Dashboard />
          </AppLayout>
        } />
        <Route path="/profile" element={
          <AppLayout>
            <Profile />
          </AppLayout>
        } />
        <Route path="/about" element={
          <AppLayout>
            <AboutPage />
          </AppLayout>
        } />
        <Route path="/contact" element={
          <AppLayout>
            <ContactPage />
          </AppLayout>
        } />
        <Route path="/terms" element={
          <AppLayout>
            <TermsPage />
          </AppLayout>
        } />
        <Route path="/subscription/renew" element={
          <AppLayout>
            <SubscriptionRenewal />
          </AppLayout>
        } />
        <Route path="/payment/verify/" element={
          <AppLayout>
            <PaymentVerify />
          </AppLayout>
        } />
        <Route path="/trades" element={
          <AppLayout>
            <TradeList />
          </AppLayout>
        } />
        <Route path="/trades/new" element={
          <AppLayout>
            <TradeForm />
          </AppLayout>
        } />
        <Route path="/trades/edit/:id" element={
          <AppLayout>
            <TradeEditForm />
          </AppLayout>
        } />
        <Route path="/trades/:id" element={
          <AppLayout>
            <TradeDetail />
          </AppLayout>
        } />
        <Route path="/reports" element={
          <AppLayout>
            <ReportDashboard />
          </AppLayout>
        } />
        <Route path="/import" element={
          <AppLayout>
            <ImportPage />
          </AppLayout>
        } />
        <Route path="/discipline" element={
          <AppLayout>
            <DisciplineDashboard />
          </AppLayout>
        } />
        <Route path="/advanced-metrics" element={
          <AppLayout>
            <AdvancedMetricsReport />
          </AppLayout>
        } />
        <Route path="/portfolio-comparison" element={
          <AppLayout>
            <PortfolioComparisonPage />
          </AppLayout>
        } />
        <Route path="/analytics" element={
          <AppLayout>
            <AnalyticsDashboard />
          </AppLayout>
        } />
        <Route path="/messages" element={
          <AppLayout>
            <MessageList />
          </AppLayout>
        } />
        <Route path="/messages/new" element={
          <AppLayout>
            <MessageForm />
          </AppLayout>
        } />
        <Route path="/ai-consultation" element={
          <AppLayout>
            <AIConsultation />
          </AppLayout>
        } />
        <Route path="/ai-history" element={
          <AppLayout>
            <AIConsultationHistory />
          </AppLayout>
        } />
        <Route path="/ai-consultation/:id" element={
          <AppLayout>
            <AIConsultationDetail />
          </AppLayout>
        } />

        {/* ========================================== */}
        {/* مسیرهای پنل ادمین - بدون Layout جداگانه */}
        {/* ========================================== */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<UserList />} />
          <Route path="users/:id" element={<UserDetail />} />
          <Route path="users/:id/edit" element={<UserEdit />} />
          <Route path="subscriptions" element={<SubscriptionList />} />
          <Route path="subscriptions/:id" element={<SubscriptionDetail />} />
          <Route path="subscription-plans" element={<PlanList />} />
          <Route path="finance" element={<FinanceTabs />} />
          <Route path="finance/payment-requests" element={<FinanceTabs />} />
          <Route path="finance/payment-cards" element={<FinanceTabs />} />
          <Route path="finance/report" element={<FinanceTabs />} />
          <Route path="discounts" element={<DiscountList />} />
          <Route path="symbols" element={<SymbolList />} />
          <Route path="brokers" element={<BrokerList />} />
          <Route path="consultations" element={<ConsultationList />} />
          <Route path="consultations/:id" element={<ConsultationDetail />} />
          <Route path="consultations/analytics" element={<ConsultationAnalytics />} />
          <Route path="trades" element={<AdminTradeList />} />
          <Route path="trades/:id" element={<AdminTradeDetail />} />
          <Route path="messages" element={<AdminMessageList />} />
          <Route path="system-messages" element={<SystemMessageList />} />
          <Route path="system-messages/new" element={<SystemMessageForm />} />
          <Route path="system-messages/:id/edit" element={<SystemMessageForm />} />
          <Route path="portfolios" element={<PortfolioList />} />
          <Route path="versions" element={<VersionList />} />
          <Route path="sms/*" element={<SmsDashboard />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    );
  }

  // ============================================
  // کاربر احراز هویت نشده - نمایش صفحات عمومی + لاگین
  // ============================================
  return (
    <Routes>
      {/* ===== مسیرهای عمومی (بدون نیاز به لاگین) ===== */}
      <Route path="/about" element={
        <AppLayout>
          <AboutPage />
        </AppLayout>
      } />
      <Route path="/terms" element={
        <AppLayout>
          <TermsPage />
        </AppLayout>
      } />
      <Route path="/contact" element={
        <AppLayout>
          <ContactPage />
        </AppLayout>
      } />

      {/* ===== مسیرهای احراز هویت ===== */}
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