// frontend/src/components/payment/PendingPaymentBanner.js
import React, { useState, useEffect, useCallback } from 'react';
import RealApiService from '../../services/realApiService';
import { useToast } from '../../contexts/ToastContext';
import PaymentRequestModal from './PaymentRequestModal';
import './PendingPaymentBanner.css';

const PendingPaymentBanner = () => {
  const { showToast } = useToast();
  const [activeRequests, setActiveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [canceling, setCanceling] = useState(false);
  const [tick, setTick] = useState(0);

  // ============================================
  // ✅ بارگذاری درخواست‌های فعال
  // ============================================
  const loadActiveRequests = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setActiveRequests([]);
        setLoading(false);
        return;
      }

      const response = await RealApiService.getActivePaymentRequests();
      const requests = response.data?.requests || [];
      console.log('🔄 Banner refresh - active requests:', requests.length);
      setActiveRequests(requests);
    } catch (error) {
      if (error.response?.status !== 401) {
        console.warn('⚠️ Could not load active payment requests:', error.message);
      }
      setActiveRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // ✅ Effect 1: بارگذاری اولیه + interval 30 ثانیه
  // ============================================
  useEffect(() => {
    loadActiveRequests();

    const loadInterval = setInterval(loadActiveRequests, 30000);
    const tickInterval = setInterval(() => setTick(t => t + 1), 1000);

    return () => {
      clearInterval(loadInterval);
      clearInterval(tickInterval);
    };
  }, [loadActiveRequests]);

  // ============================================
  // ✅ Effect 2: گوش دادن به رویداد سراسری
  // ============================================
  useEffect(() => {
    const handleRefresh = () => {
      console.log('🔔 payment-request-updated - refreshing banner immediately');
      loadActiveRequests();
    };

    window.addEventListener('payment-request-updated', handleRefresh);

    return () => {
      window.removeEventListener('payment-request-updated', handleRefresh);
    };
  }, [loadActiveRequests]);

  // ============================================
  // فرمت زمان
  // ============================================
  const formatTime = (seconds) => {
    if (seconds <= 0) return 'منقضی شده';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const pad = (n) => String(n).padStart(2, '0');
    if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
    return `${pad(m)}:${pad(s)}`;
  };

  const getRemainingSeconds = (request) => {
    if (!request?.expires_at) return 0;
    const expiresAt = new Date(request.expires_at).getTime();
    const now = Date.now();
    return Math.max(0, Math.floor((expiresAt - now) / 1000));
  };

  // ============================================
  // ✅ لغو درخواست (فقط در pending_payment)
  // ============================================
  const handleCancel = async (request) => {
    if (request.status !== 'pending_payment') {
      showToast('❌ امکان لغو در این وضعیت وجود ندارد', 'error');
      return;
    }

    if (!window.confirm('آیا از لغو این درخواست پرداخت اطمینان دارید؟')) {
      return;
    }

    setCanceling(true);
    try {
      const response = await RealApiService.cancelPaymentRequest(request.id);
      if (response.data?.success) {
        showToast('✅ درخواست با موفقیت لغو شد', 'success');
        await loadActiveRequests();
      } else {
        showToast(response.data?.error || 'خطا در لغو درخواست', 'error');
      }
    } catch (error) {
      console.error('Error canceling:', error);
      const errorMsg = error.response?.data?.error || 'خطا در لغو درخواست';
      showToast(`❌ ${errorMsg}`, 'error');
    } finally {
      setCanceling(false);
    }
  };

  // ============================================
  // ✅ پس از بستن مودال، رفرش کن
  // ============================================
  const handleModalClose = async () => {
    setSelectedRequest(null);
    await loadActiveRequests();
  };

  // ============================================
  // اگر درخواستی نیست، نمایش نده
  // ============================================
  if (loading || activeRequests.length === 0) {
    return null;
  }

  const mainRequest = activeRequests[0];
  const isAwaitingReview = mainRequest.status === 'awaiting_review';
  const isPendingPayment = mainRequest.status === 'pending_payment';

  return (
    <>
      <div className="pending-payment-banner">
        <div className="banner-inner">
          <div className="banner-icon">
            {isAwaitingReview ? '⏳' : '💳'}
          </div>

          <div className="banner-content">
            {isPendingPayment && (
              <>
                <div className="banner-title">
                  درخواست پرداخت شما در انتظار واریز است
                </div>
                <div className="banner-info">
                  مبلغ: <strong>{Number(mainRequest.amount).toLocaleString('fa-IR')} تومان</strong>
                  <span className="banner-separator">|</span>
                  <span className="banner-timer">
                    ⏱️ {formatTime(getRemainingSeconds(mainRequest))}
                  </span>
                </div>
              </>
            )}

            {isAwaitingReview && (
              <>
                <div className="banner-title">
                  پرداخت شما در حال بررسی است
                </div>
                <div className="banner-info">
                  مبلغ: <strong>{Number(mainRequest.amount).toLocaleString('fa-IR')} تومان</strong>
                  <span className="banner-separator">|</span>
                  <span className="banner-status">در انتظار تأیید ادمین</span>
                </div>
              </>
            )}
          </div>

          <div className="banner-actions">
            {isPendingPayment && (
              <>
                {/* ✅ دکمه لغو فقط در pending_payment */}
                <button
                  className="banner-btn banner-btn-secondary"
                  onClick={() => handleCancel(mainRequest)}
                  disabled={canceling}
                  title="لغو درخواست"
                >
                  {canceling ? '⏳' : '❌ لغو'}
                </button>
                <button
                  className="banner-btn banner-btn-primary"
                  onClick={() => setSelectedRequest(mainRequest)}
                >
                  مشاهده و ثبت فیش
                </button>
              </>
            )}
            {isAwaitingReview && (
              /* ✅ فقط دکمه مشاهده جزئیات — بدون دکمه لغو */
              <button
                className="banner-btn banner-btn-info"
                onClick={() => setSelectedRequest(mainRequest)}
              >
                مشاهده جزئیات
              </button>
            )}
          </div>
        </div>
      </div>

      {selectedRequest && (
        <PaymentRequestModal
          paymentRequest={selectedRequest}
          onClose={handleModalClose}
          onSuccess={handleModalClose}
        />
      )}
    </>
  );
};

export default PendingPaymentBanner;