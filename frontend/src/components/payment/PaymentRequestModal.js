// frontend/src/components/payment/PaymentRequestModal.js
import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useToast } from '../../contexts/ToastContext';
import RealApiService from '../../services/realApiService';
import SubmitReceiptForm from './SubmitReceiptForm';
import './PaymentRequestModal.css';

const PaymentRequestModal = ({ paymentRequest, onClose, onSuccess }) => {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [localStatus, setLocalStatus] = useState(paymentRequest?.status || 'pending_payment');

  // ============================================
  // ✅ محاسبه دقیق زمان باقیمانده از expires_at
  // ============================================
  const computeRemaining = useCallback((expiresAt) => {
    if (!expiresAt) return 0;
    const expires = new Date(expiresAt).getTime();
    const now = Date.now();
    return Math.max(0, Math.floor((expires - now) / 1000));
  }, []);

  // ============================================
  // ✅ Effect: تایمر زنده
  // ============================================
  useEffect(() => {
    if (!paymentRequest?.expires_at) {
      setRemainingSeconds(0);
      return;
    }

    const initial = computeRemaining(paymentRequest.expires_at);
    setRemainingSeconds(initial);

    if (initial <= 0) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [paymentRequest?.expires_at, computeRemaining]);

  // ============================================
  // ✅ Effect: همگام‌سازی وضعیت با props
  // ============================================
  useEffect(() => {
    if (paymentRequest?.status) {
      setLocalStatus(paymentRequest.status);
    }
  }, [paymentRequest?.status]);

  // ============================================
  // ✅ Effect: قفل کردن اسکرول body وقتی هر مودالی باز است
  // ============================================
  useEffect(() => {
    const anyModalOpen = !!paymentRequest;
    if (anyModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [paymentRequest]);

  const formatTime = useCallback((seconds) => {
    if (seconds <= 0) return '۰۰:۰۰';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const pad = (n) => String(n).padStart(2, '0');
    if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
    return `${pad(m)}:${pad(s)}`;
  }, []);

  const handleCopy = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      showToast('✅ کپی شد', 'success');
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      showToast('❌ خطا در کپی', 'error');
    }
  };

  const formatCardNumber = (number) => {
    if (!number || number.length !== 16) return number;
    return number.match(/.{1,4}/g)?.join(' - ') || number;
  };

  const formatAmount = (amount) => {
    return Number(amount || 0).toLocaleString('fa-IR');
  };

  // ============================================
  // ✅ موفقیت ثبت فیش
  // ============================================
  const handleReceiptSuccess = () => {
    // ارسال رویداد برای رفرش بنر
    window.dispatchEvent(new CustomEvent('payment-request-updated'));
    showToast('✅ اطلاعات فیش ثبت شد. در انتظار تأیید ادمین.', 'success');
    // بستن مودال ثبت فیش
    setShowReceiptModal(false);
    // بستن مودال اصلی + اطلاع به والد
    if (onSuccess) onSuccess();
    onClose();
  };

  // ============================================
  // ✅ لغو مودال ثبت فیش
  // ============================================
  const handleReceiptCancel = () => {
    setShowReceiptModal(false);
  };

  // ============================================
  // ✅ لغو درخواست پرداخت
  // ============================================
  const handleCancel = async () => {
    if (!window.confirm('آیا از لغو این درخواست پرداخت اطمینان دارید؟ این عملیات قابل بازگشت نیست.')) {
      return;
    }

    setCanceling(true);
    try {
      const response = await RealApiService.cancelPaymentRequest(paymentRequest.id);
      if (response.data?.success) {
        showToast('✅ درخواست با موفقیت لغو شد', 'success');
        window.dispatchEvent(new CustomEvent('payment-request-updated'));
        onClose();
        if (onSuccess) onSuccess();
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

  if (!paymentRequest) return null;

  const isExpired = remainingSeconds <= 0;
  const isPendingPayment = localStatus === 'pending_payment';
  const isAwaitingReview = localStatus === 'awaiting_review';
  const canCancel = isPendingPayment;
  const canSubmitReceipt = isPendingPayment && !isExpired;

  // ============================================
  // ✅ مودال اصلی
  // ============================================
  const mainModal = (
    <div className="payment-modal-overlay" onClick={onClose}>
      <div className="payment-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* ===== Header ===== */}
        <div className="payment-modal-header">
          <h2>
            {isAwaitingReview
              ? '⏳ جزئیات پرداخت (در انتظار بررسی)'
              : '💳 اطلاعات پرداخت کارت به کارت'}
          </h2>
          <button className="payment-modal-close" onClick={onClose}>×</button>
        </div>

        {/* ===== Timer / Status Banner ===== */}
        {isPendingPayment && (
          <div
            className={`payment-timer ${
              isExpired ? 'expired' : remainingSeconds < 600 ? 'warning' : ''
            }`}
          >
            <span className="timer-icon">⏱️</span>
            <span className="timer-text">
              {isExpired
                ? 'مهلت پرداخت به پایان رسیده — لطفاً درخواست را لغو و مجدداً ثبت کنید'
                : `مهلت پرداخت: ${formatTime(remainingSeconds)}`}
            </span>
          </div>
        )}

        {isAwaitingReview && (
          <div className="payment-timer awaiting">
            <span className="timer-icon">⏳</span>
            <span className="timer-text">
              اطلاعات فیش شما ثبت شده و در انتظار تأیید ادمین است.
            </span>
          </div>
        )}

        {/* ===== Card Info ===== */}
        <div className="payment-card-info">
          <div className="payment-card-row">
            <span className="payment-label">💳 شماره کارت:</span>
            <div className="payment-value-with-copy">
              <span className="payment-value card-number" dir="ltr">
                {formatCardNumber(paymentRequest.destination_card_number)}
              </span>
              <button
                className="copy-btn"
                onClick={() =>
                  handleCopy(paymentRequest.destination_card_number, 'card')
                }
                title="کپی شماره کارت"
              >
                {copied === 'card' ? '✓' : '📋'}
              </button>
            </div>
          </div>

          <div className="payment-card-row">
            <span className="payment-label">👤 صاحب کارت:</span>
            <span className="payment-value">
              {paymentRequest.destination_card_holder}
            </span>
          </div>

          <div className="payment-card-row">
            <span className="payment-label">🏦 نام بانک:</span>
            <span className="payment-value">
              {paymentRequest.destination_bank_name}
            </span>
          </div>

          <div className="payment-card-row highlight">
            <span className="payment-label">💰 مبلغ قابل پرداخت:</span>
            <div className="payment-value-with-copy">
              <span className="payment-value amount">
                {formatAmount(paymentRequest.amount)} تومان
              </span>
              <button
                className="copy-btn"
                onClick={() => handleCopy(String(paymentRequest.amount), 'amount')}
                title="کپی مبلغ"
              >
                {copied === 'amount' ? '✓' : '📋'}
              </button>
            </div>
          </div>

          <div className="payment-card-row">
            <span className="payment-label">🆔 کد درخواست:</span>
            <span className="payment-value code" dir="ltr">
              {paymentRequest.unique_code}
            </span>
          </div>

          {/* ✅ اطلاعات فیش ثبت‌شده (فقط در awaiting_review) */}
          {isAwaitingReview && paymentRequest.tracking_number && (
            <>
              <div className="payment-card-row">
                <span className="payment-label">🔢 شماره پیگیری:</span>
                <span className="payment-value" dir="ltr">
                  {paymentRequest.tracking_number}
                </span>
              </div>
              {paymentRequest.payer_name && (
                <div className="payment-card-row">
                  <span className="payment-label">👤 واریزکننده:</span>
                  <span className="payment-value">{paymentRequest.payer_name}</span>
                </div>
              )}
              {paymentRequest.payer_card_last4 && (
                <div className="payment-card-row">
                  <span className="payment-label">💳 ۴ رقم آخر کارت:</span>
                  <span className="payment-value" dir="ltr">
                    ****{paymentRequest.payer_card_last4}
                  </span>
                </div>
              )}
              {paymentRequest.submitted_at && (
                <div className="payment-card-row">
                  <span className="payment-label">📅 زمان ثبت فیش:</span>
                  <span className="payment-value">
                    {new Date(paymentRequest.submitted_at).toLocaleString('fa-IR')}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* ===== Instructions (فقط برای pending_payment) ===== */}
        {isPendingPayment && (
          <div className="payment-instructions">
            <p>
              لطفاً مبلغ{' '}
              <strong>{formatAmount(paymentRequest.amount)} تومان</strong> را دقیقاً به کارت{' '}
              <strong dir="ltr">
                {formatCardNumber(paymentRequest.destination_card_number)}
              </strong>{' '}
              به نام <strong>{paymentRequest.destination_card_holder}</strong> در
              بانک <strong>{paymentRequest.destination_bank_name}</strong> واریز کنید.
            </p>
            <p>
              پس از واریز، دکمه «واریز کردم / ثبت اطلاعات پرداخت» را بزنید و
              شماره پیگیری و سایر مشخصات را وارد کنید.
            </p>
          </div>
        )}

        {/* ===== Info Banner (فقط برای awaiting_review) ===== */}
        {isAwaitingReview && (
          <div className="payment-info-banner">
            <p>
              📌 اطلاعات پرداخت شما در سیستم ثبت شده است. پس از بررسی توسط
              ادمین، نتیجه از طریق پیامک به شما اعلام می‌شود. لطفاً منتظر بمانید.
            </p>
          </div>
        )}

        {/* ===== Actions ===== */}
        <div className="payment-modal-actions">
          {/* ✅ دکمه لغو فقط در pending_payment */}
          {canCancel && (
            <button
              className="btn-cancel-request"
              onClick={handleCancel}
              disabled={canceling}
              title="لغو درخواست"
            >
              {canceling ? '⏳ در حال لغو...' : '❌ لغو درخواست'}
            </button>
          )}

          <button className="btn-close-modal" onClick={onClose}>
            بستن
          </button>

          {canSubmitReceipt && (
            <button
              className="btn-primary"
              onClick={() => setShowReceiptModal(true)}
            >
              ✓ واریز کردم / ثبت اطلاعات پرداخت
            </button>
          )}

          {isPendingPayment && isExpired && (
            <button className="btn-primary expired-btn" disabled>
              ⏰ مهلت تمام شده
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // ============================================
  // ✅ مودال ثبت فیش — با ReactDOM.createPortal در body
  // این تضمین می‌کند که مودال همیشه روی همه چیز نمایش داده شود
  // ============================================
  const receiptModal = showReceiptModal
    ? ReactDOM.createPortal(
        <div
          className="receipt-modal-overlay-fixed"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleReceiptCancel();
          }}
        >
          <div
            className="receipt-modal-content-fixed"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="payment-modal-header receipt-modal-header">
              <h2>📋 ثبت اطلاعات پرداخت</h2>
              <button
                className="payment-modal-close"
                onClick={handleReceiptCancel}
                title="بستن"
              >
                ×
              </button>
            </div>
            <div className="receipt-modal-body">
              <SubmitReceiptForm
                paymentRequest={paymentRequest}
                onSuccess={handleReceiptSuccess}
                onCancel={handleReceiptCancel}
              />
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      {mainModal}
      {receiptModal}
    </>
  );
};

export default PaymentRequestModal;