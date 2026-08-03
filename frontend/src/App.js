// frontend/src/App.js

import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import SubscriptionRenewal from './components/auth/SubscriptionRenewal';
import PaymentVerify from './components/PaymentVerify';
import RealApiService from './services/realApiService';

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

// Analytics
import AnalyticsDashboard from './components/analytics/AnalyticsDashboard';

// AI Consultation
import AIConsultation from './components/ai/AIConsultation';
import AIConsultationHistory from './components/ai/AIConsultationHistory';
import AIConsultationDetail from './components/ai/AIConsultationDetail';

// Styles
import './App.css';
import MessageList from './components/messaging/MessageList';
import MessageForm from './components/messaging/MessageForm';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <Router>
            <AppRoutes />
          </Router>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();
  const [showVerify, setShowVerify] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const hasRedirected = useRef(false);
  const [isSubscriptionChecked, setIsSubscriptionChecked] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [isSubscriptionExpired, setIsSubscriptionExpired] = useState(false);

  // ============================================
  // بررسی وضعیت اشتراک هنگام احراز هویت
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

        // اگر کاربر ادمین است یا اشتراک فعال دارد
        if (status.is_admin || (status.has_subscription && !status.is_expired)) {
          setIsSubscriptionExpired(false);
        } else {
          setIsSubscriptionExpired(true);
        }

        // اگر اشتراک منقضی شده و در صفحه‌های مجاز نیستیم، به پروفایل برو
        if (status.is_admin) {
          // ادمین دسترسی کامل دارد
        } else if (status.has_subscription && status.is_expired) {
          // اشتراک منقضی شده
          if (location.pathname !== '/profile' && location.pathname !== '/subscription/renew') {
            navigate('/profile', { replace: true });
            setTimeout(() => {
              alert('⏰ اشتراک شما منقضی شده است. لطفاً برای ادامه استفاده، اشتراک خود را تمدید کنید.');
            }, 500);
          }
        } else if (!status.has_subscription) {
          // کاربر اشتراک ندارد (شاید آزمایشی تمام شده)
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
  // هدایت کاربر به داشبورد یا صفحه مناسب
  // ============================================
  useEffect(() => {
    const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
    const isPaymentPage = location.pathname === '/payment/verify/';
    const isRenewPage = location.pathname === '/subscription/renew';
    const isProfilePage = location.pathname === '/profile';

    // صفحاتی که نیاز به هدایت ندارند
    if (isPaymentPage || isRenewPage) {
      console.log('⏭️ Skipping redirect on payment/renew page');
      return;
    }

    // اگر احراز هویت شده و بررسی اشتراک کامل شده است
    if (isAuthenticated && !loading && isSubscriptionChecked && !hasRedirected.current && !isAuthPage) {
      // اگر ادمین یا اشتراک فعال دارد و منقضی نشده، به داشبورد برو
      if (subscriptionStatus?.is_admin ||
          (subscriptionStatus?.has_subscription && !subscriptionStatus?.is_expired)) {
        console.log('🔄 Redirecting to dashboard');
        hasRedirected.current = true;
        navigate('/dashboard', { replace: true });
      } else {
        // در غیر این صورت، به پروفایل برو (اگر قبلاً آنجا نیست)
        if (!isProfilePage) {
          console.log('🔄 Redirecting to profile (no active subscription)');
          hasRedirected.current = true;
          navigate('/profile', { replace: true });
        }
      }
    }
  }, [isAuthenticated, loading, isSubscriptionChecked, subscriptionStatus, navigate, location.pathname]);

  // ============================================
  // جلوگیری از خروج از پروفایل زمانی که اشتراک منقضی شده
  // ============================================
  useEffect(() => {
    if (isSubscriptionExpired && isSubscriptionChecked) {
      const currentPath = location.pathname;
      if (currentPath !== '/profile' && currentPath !== '/subscription/renew') {
        navigate('/profile', { replace: true });
      }
    }
  }, [isSubscriptionExpired, isSubscriptionChecked, location.pathname, navigate]);

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
        <Route path="/analytics" element={<AnalyticsDashboard />} />
        <Route path="/messages" element={<MessageList />} />
        <Route path="/messages/new" element={<MessageForm />} />
        <Route path="/ai-consultation" element={<AIConsultation />} />
        <Route path="/ai-history" element={<AIConsultationHistory />} />
        <Route path="/ai-consultation/detail/:id" element={<AIConsultationDetail />} />
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