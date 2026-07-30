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
  const expiryChecked = useRef(false);
  const [isSubscriptionExpired, setIsSubscriptionExpired] = useState(false);
  const [isSubscriptionExpiryChecked, setIsSubscriptionExpiryChecked] = useState(false);

  // ============================================
  // هدایت کاربر به داشبورد اگر احراز هویت شده
  // ============================================
  useEffect(() => {
    const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
    const isPaymentPage = location.pathname === '/payment/verify/';
    const isRenewPage = location.pathname === '/subscription/renew';

    if (isPaymentPage || isRenewPage) {
      console.log('⏭️ Skipping redirect on payment/renew page');
      return;
    }

    if (isAuthenticated && !loading && !hasRedirected.current && !isAuthPage) {
      console.log('🔄 Redirecting to dashboard');
      hasRedirected.current = true;
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, loading, navigate, location.pathname]);

  // ============================================
  // ✅ بررسی انقضای اشتراک - کاملاً از سرور
  // ============================================
  useEffect(() => {
    if (isAuthenticated && !loading && !expiryChecked.current) {
      expiryChecked.current = true;

      const checkSubscription = async () => {
        try {
          // ✅ دریافت وضعیت اشتراک از سرور
          const response = await RealApiService.getSubscriptionStatus();
          const status = response.data;
          console.log('📊 Subscription status from server:', status);

          if (status && status.has_subscription) {
            if (status.is_expired) {
              setIsSubscriptionExpired(true);
              if (location.pathname !== '/profile' && location.pathname !== '/subscription/renew') {
                navigate('/profile');
              }
              setTimeout(() => {
                alert('⏰ اشتراک شما منقضی شده است. لطفاً برای ادامه استفاده، اشتراک خود را تمدید کنید.');
              }, 500);
            } else if (status.is_near_expiry) {
              setTimeout(() => {
                alert(`⚠️ توجه: ${status.remaining_days} روز تا پایان اشتراک شما باقی مانده است.`);
              }, 1000);
            }
          } else {
            // کاربر اشتراک فعال ندارد
            console.log('ℹ️ کاربر اشتراک فعال ندارد');
            // فقط در صورتی که در صفحه اشتراک نیستیم
            if (location.pathname !== '/subscription/renew' && location.pathname !== '/profile') {
              // نیازی به هدایت نیست، کاربر می‌تواند از داشبورد استفاده کند
            }
          }
        } catch (error) {
          console.error('❌ Error checking subscription from server:', error);
          // در صورت خطا، چیزی نمایش ندهیم و اجازه دهیم کاربر ادامه دهد
        } finally {
          setIsSubscriptionExpiryChecked(true);
        }
      };

      checkSubscription();
    }
  }, [isAuthenticated, loading, location.pathname, navigate]);

  // ============================================
  // جلوگیری از خروج از پروفایل زمانی که اشتراک منقضی شده
  // ============================================
  useEffect(() => {
    if (isSubscriptionExpired && isSubscriptionExpiryChecked) {
      const currentPath = location.pathname;
      if (currentPath !== '/profile' && currentPath !== '/subscription/renew') {
        navigate('/profile', { replace: true });
      }
    }
  }, [isSubscriptionExpired, isSubscriptionExpiryChecked, location.pathname, navigate]);

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
  // استفاده از navigate با replace برای جلوگیری از بازگشت
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
        <Route path="/messages" element={<MessageList />} />
        <Route path="/messages/new" element={<MessageForm />} />
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