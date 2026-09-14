// frontend/src/components/common/AppLayout.js

import React from 'react';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import PendingPaymentBanner from '../payment/PendingPaymentBanner';
import './AppLayout.css';

/**
 * چیدمان اصلی اپلیکیشن
 * - AppHeader (هدر اصلی)
 * - PendingPaymentBanner (بنر پرداخت‌های در انتظار - چسبیده به هدر)
 * - محتوای اصلی
 * - AppFooter (فوتر - در انتهای صفحه)
 */
const AppLayout = ({ children }) => {
  return (
    <div className="app-main-layout">
      <AppHeader />

      {/* ✅ بنر پرداخت‌های در انتظار - زیر هدر با فاصله 2 پیکسل */}
      <PendingPaymentBanner />

      <main className="app-main-content">
        {children}
      </main>

      {/* ✅ فوتر */}
      <AppFooter />
    </div>
  );
};

export default AppLayout;