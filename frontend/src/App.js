// frontend/src/App.js

import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
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
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();
  const [authStep, setAuthStep] = useState('login');
  const navigate = useNavigate();
  const location = useLocation();
  const hasRedirected = useRef(false);
  const expiryChecked = useRef(false);
  const [isSubscriptionExpired, setIsSubscriptionExpired] = useState(false);
  const [isSubscriptionExpiryChecked, setIsSubscriptionExpiryChecked] = useState(false);

  // ============================================
  // ✅ فقط زمانی هدایت کن که در صفحات لاگین یا ثبت‌نام هستیم
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
  // بررسی انقضای اشتراک
  // ============================================
  useEffect(() => {
    if (isAuthenticated && !loading && !expiryChecked.current) {
      expiryChecked.current = true;

      const checkSubscription = async () => {
        try {
          const response = await RealApiService.getSubscriptionStatus();
          const status = response.data;

          if (status.has_subscription) {
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
            const savedSubscription = localStorage.getItem('subscription');
            if (savedSubscription) {
              const subData = JSON.parse(savedSubscription);
              const endDate = new Date(subData.endDate);
              const now = new Date();

              if (endDate < now) {
                setIsSubscriptionExpired(true);
                if (location.pathname !== '/profile' && location.pathname !== '/subscription/renew') {
                  navigate('/profile');
                }
                setTimeout(() => {
                  alert('⏰ دوره آزمایشی شما به پایان رسیده است. لطفاً برای ادامه استفاده، اشتراک تهیه کنید.');
                }, 500);
              }
            } else {
              const trialEndDate = new Date();
              trialEndDate.setDate(trialEndDate.getDate() + 7);
              const newSubscription = {
                plan: 'آزمایشی',
                remainingDays: 7,
                remainingTrades: 50,
                startDate: new Date().toISOString(),
                endDate: trialEndDate.toISOString(),
                isActive: true,
                isExpired: false
              };
              localStorage.setItem('subscription', JSON.stringify(newSubscription));
            }
          }
        } catch (error) {
          console.error('Error checking subscription:', error);
          const savedSubscription = localStorage.getItem('subscription');
          if (savedSubscription) {
            const subData = JSON.parse(savedSubscription);
            const endDate = new Date(subData.endDate);
            const now = new Date();
            if (endDate < now) {
              setIsSubscriptionExpired(true);
              if (location.pathname !== '/profile' && location.pathname !== '/subscription/renew') {
                navigate('/profile');
              }
            }
          }
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

  const handleCodeSent = () => {
    console.log('📱 Moving to verify step');
    setAuthStep('verify');
  };

  const handleVerifySuccess = () => {
    console.log('✅ Verification successful');
    setAuthStep('login');
    hasRedirected.current = false;
    navigate('/dashboard', { replace: true });
  };

  const handleBackToLogin = () => {
    console.log('↩️ Back to login');
    setAuthStep('login');
  };

  // ============================================
  // مسیرهای احراز هویت شده
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
  // مسیرهای احراز هویت نشده
  // ============================================
  return (
    <Routes>
      <Route
        path="/login"
        element={
          authStep === 'login' ? (
            <LoginStep1 onCodeSent={handleCodeSent} />
          ) : (
            <VerifyCode
              onVerifySuccess={handleVerifySuccess}
              onBack={handleBackToLogin}
            />
          )
        }
      />
      <Route path="/register" element={<Register />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;