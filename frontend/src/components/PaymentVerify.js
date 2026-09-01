// frontend/src/components/PaymentVerify.js

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import RealApiService from '../services/realApiService';
import { useAuth } from '../contexts/AuthContext';
import './PaymentVerify.css';
import LoadingBar from './common/LoadingBar';
const PaymentVerify = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [refId, setRefId] = useState('');
  const [subscriptionDetails, setSubscriptionDetails] = useState(null);

  useEffect(() => {
    const verifyPayment = async () => {
      const authority = searchParams.get('Authority');
      const status = searchParams.get('Status');
      const subscriptionId = searchParams.get('subscription_id');

      console.log('🔍 PaymentVerify started!');
      console.log('📥 Authority:', authority);
      console.log('📥 Status:', status);
      console.log('📥 Subscription ID:', subscriptionId);

      // اعتبارسنجی اولیه
      if (!authority) {
        setMessage({ type: 'error', text: '❌ اطلاعات پرداخت یافت نشد' });
        setLoading(false);
        return;
      }

      if (status !== 'OK') {
        setMessage({ type: 'error', text: '❌ پرداخت توسط کاربر لغو شد' });
        setLoading(false);
        return;
      }

      if (!subscriptionId) {
        setMessage({ type: 'error', text: '❌ شناسه اشتراک یافت نشد' });
        setLoading(false);
        return;
      }

      try {
        // تایید پرداخت
        console.log('📤 Verifying payment...');
        const response = await RealApiService.verifyPayment(
          authority,
          status,
          subscriptionId
        );
        console.log('📊 Payment verification response:', response.data);

        if (!response.data.success) {
          setMessage({ type: 'error', text: response.data.message || '❌ پرداخت ناموفق بود' });
          setLoading(false);
          return;
        }

        // دریافت اطلاعات اشتراک
        setRefId(response.data.ref_id || '');
        console.log('📤 Getting subscription details...');

        const subResponse = await RealApiService.getUserSubscription();
        console.log('📊 Subscription details:', subResponse.data);

        const subData = subResponse.data;

        // تنظیم جزئیات اشتراک
        if (subData && subData.is_admin === true) {
          console.log('👑 Admin user detected!');
          setSubscriptionDetails({
            plan_name: 'ادمین (نامحدود)',
            start_date: '—',
            end_date: '♾️ بدون محدودیت',
            remaining_days: '♾️',
            trades_limit: '♾️',
            amount_paid: 0,
            is_admin: true,
            message: 'شما به عنوان ادمین دسترسی نامحدود دارید.'
          });
        } else if (subData && subData.plan_name) {
          console.log('👤 Normal user with subscription');
          const endDate = new Date(subData.end_date);
          const startDate = new Date(subData.start_date);
          const now = new Date();
          const remainingDays = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

          setSubscriptionDetails({
            plan_name: subData.plan_name || 'حرفه‌ای',
            start_date: startDate.toLocaleDateString('fa-IR'),
            end_date: endDate.toLocaleDateString('fa-IR'),
            remaining_days: remainingDays > 0 ? remainingDays : 0,
            trades_limit: subData.trades_limit || 50,
            amount_paid: subData.amount_paid || 0,
            is_admin: false,
            message: null
          });
        } else {
          console.log('📋 Default subscription details');
          setSubscriptionDetails({
            plan_name: 'حرفه‌ای',
            start_date: new Date().toLocaleDateString('fa-IR'),
            end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('fa-IR'),
            remaining_days: 30,
            trades_limit: 50,
            amount_paid: 0,
            is_admin: false,
            message: null
          });
        }

        // به‌روزرسانی localStorage
        const savedSubscription = localStorage.getItem('subscription');
        if (savedSubscription) {
          const subData = JSON.parse(savedSubscription);
          const newEndDate = new Date();
          newEndDate.setDate(newEndDate.getDate() + 30);
          subData.endDate = newEndDate.toISOString();
          subData.remainingDays = 30;
          subData.isActive = true;
          subData.isExpired = false;
          localStorage.setItem('subscription', JSON.stringify(subData));
        }

        // تنظیم پیام موفقیت
        setMessage({
          type: 'success',
          text: '✅ پرداخت با موفقیت انجام شد!'
        });

        setLoading(false);

      } catch (error) {
        console.error('❌ Payment verification error:', error);
        setMessage({
          type: 'error',
          text: error.response?.data?.message || '❌ خطا در تایید پرداخت'
        });
        setLoading(false);
      }
    };

    verifyPayment();
  }, [searchParams]);

  // ============================================
  // صفحه بارگذاری
  // ============================================
  if (loading) {
    return (
      <div className="payment-verify-container">
        <LoadingBar text="در حال بارگذاری..." />
        <p>لطفاً صبر کنید</p>
      </div>
    );
  }

  // ============================================
  // صفحه نتیجه - فقط یک دکمه
  // ============================================
  return (
    <div className="payment-verify-container">
      <div className={`payment-result ${message.type}`}>
        {/* آیکون */}
        <div className="payment-icon">
          {message.type === 'success' ? '🎉' : '❌'}
        </div>

        {/* عنوان */}
        <h2>
          {message.type === 'success'
            ? '🎊 تمدید اشتراک با موفقیت انجام شد!'
            : '❌ پرداخت ناموفق'}
        </h2>

        {/* پیام اصلی */}
        <p className="payment-message">{message.text}</p>

        {/* جزئیات تمدید */}
        {subscriptionDetails && (
          <div className="subscription-details">
            <div className="detail-card">
              <div className="detail-item">
                <span className="detail-label">📊 پلن</span>
                <span className={`detail-value ${subscriptionDetails.is_admin ? 'admin' : 'premium'}`}>
                  {subscriptionDetails.plan_name}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">📅 تاریخ شروع</span>
                <span className="detail-value">{subscriptionDetails.start_date}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">📅 تاریخ پایان</span>
                <span className="detail-value">{subscriptionDetails.end_date}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">⏳ روزهای باقیمانده</span>
                <span className="detail-value highlight">{subscriptionDetails.remaining_days}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">📈 تریدهای ماهانه</span>
                <span className="detail-value">{subscriptionDetails.trades_limit}</span>
              </div>
              {!subscriptionDetails.is_admin && (
                <div className="detail-item">
                  <span className="detail-label">💰 مبلغ پرداختی</span>
                  <span className="detail-value price">{subscriptionDetails.amount_paid.toLocaleString()} تومان</span>
                </div>
              )}
            </div>

            {refId && (
              <div className="ref-id">
                <span>📋 شماره پیگیری:</span>
                <strong>{refId}</strong>
              </div>
            )}

            <div className="thank-you-message">
              <p>🙏 از اعتماد شما سپاسگزاریم</p>
              {subscriptionDetails.message && (
                <p className="admin-message">{subscriptionDetails.message}</p>
              )}
              <p>امیدواریم تجربه‌ی خوبی با ژورنال حرفه‌ای ترید داشته باشید.</p>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* ✅ فقط یک دکمه - رفتن به داشبورد */}
        {/* ========================================== */}
        <div className="payment-actions">
          <button
            className="btn-back-dashboard"
            onClick={() => navigate('/dashboard')}
          >
            🏠 رفتن به داشبورد
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentVerify;