// frontend/src/pages/Admin/Finance/PaymentRequestDetailModal.js
import React, { useState } from 'react';
import adminService from '../../../services/adminService';
import { useToast } from '../../../contexts/ToastContext';
import './PaymentRequestDetailModal.css';

const PaymentRequestDetailModal = ({ request, onClose, onSuccess }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [approveNote, setApproveNote] = useState('');

  if (!request) return null;

  // ============================================
  // تأیید پرداخت
  // ============================================
  const handleApprove = async () => {
    if (!window.confirm('آیا از تأیید این پرداخت اطمینان دارید؟ اشتراک کاربر به صورت خودکار تمدید خواهد شد.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await adminService.approvePaymentRequest(request.id, {
        note: approveNote,
      });

      if (response.data?.success) {
        showToast('✅ پرداخت تأیید و اشتراک تمدید شد', 'success');
        onSuccess();
      } else {
        showToast(response.data?.error || 'خطا در تأیید پرداخت', 'error');
      }
    } catch (error) {
      console.error('Error approving:', error);
      showToast(error.response?.data?.error || 'خطا در تأیید پرداخت', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // رد پرداخت
  // ============================================
  const handleReject = async () => {
    if (!rejectReason.trim()) {
      showToast('❌ لطفاً دلیل رد را وارد کنید', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await adminService.rejectPaymentRequest(request.id, {
        reason: rejectReason.trim(),
      });

      if (response.data?.success) {
        showToast('❌ پرداخت رد شد', 'success');
        onSuccess();
      } else {
        showToast(response.data?.error || 'خطا در رد پرداخت', 'error');
      }
    } catch (error) {
      console.error('Error rejecting:', error);
      showToast(error.response?.data?.error || 'خطا در رد پرداخت', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount) => Number(amount || 0).toLocaleString('fa-IR');
  const formatDate = (date) => date ? new Date(date).toLocaleString('fa-IR') : '-';
  const formatCard = (num) => num ? num.match(/.{1,4}/g)?.join(' - ') : '-';

  const canApproveOrReject = request.status === 'awaiting_review';
  const isAlreadyReviewed = ['approved', 'rejected', 'expired', 'canceled'].includes(request.status);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="payment-detail-modal" onClick={(e) => e.stopPropagation()}>
        {/* ===== Header ===== */}
        <div className="modal-header">
          <h2>💳 جزئیات درخواست پرداخت #{request.id}</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        {/* ===== Body ===== */}
        <div className="modal-body">
          {/* اطلاعات کاربر */}
          <div className="detail-section">
            <h3>👤 اطلاعات کاربر</h3>
            <div className="detail-grid-2">
              <div className="detail-row">
                <span className="detail-label">شماره تلفن:</span>
                <span className="detail-value" dir="ltr">{request.user_phone}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">نام:</span>
                <span className="detail-value">{request.user_name || '-'}</span>
              </div>
            </div>
          </div>

          {/* اطلاعات پلن */}
          <div className="detail-section">
            <h3>📦 اطلاعات پلن</h3>
            <div className="detail-grid-2">
              <div className="detail-row">
                <span className="detail-label">پلن:</span>
                <span className="detail-value">{request.plan_name}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">مبلغ اصلی:</span>
                <span className="detail-value">{formatAmount(request.original_amount)} تومان</span>
              </div>
              {Number(request.discount_amount) > 0 && (
                <div className="detail-row">
                  <span className="detail-label">تخفیف:</span>
                  <span className="detail-value discount">-{formatAmount(request.discount_amount)} تومان</span>
                </div>
              )}
              <div className="detail-row highlight">
                <span className="detail-label">مبلغ نهایی:</span>
                <span className="detail-value amount">{formatAmount(request.amount)} تومان</span>
              </div>
            </div>
          </div>

          {/* اطلاعات کارت مقصد */}
          <div className="detail-section">
            <h3>🏦 کارت مقصد</h3>
            <div className="detail-grid-2">
              <div className="detail-row">
                <span className="detail-label">شماره کارت:</span>
                <span className="detail-value" dir="ltr">{formatCard(request.destination_card_number)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">صاحب کارت:</span>
                <span className="detail-value">{request.destination_card_holder}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">بانک:</span>
                <span className="detail-value">{request.destination_bank_name}</span>
              </div>
            </div>
          </div>

          {/* اطلاعات فیش (اگر ثبت شده) */}
          {request.tracking_number && (
            <div className="detail-section highlight-section">
              <h3>📋 اطلاعات فیش واریزی</h3>
              <div className="detail-grid-2">
                <div className="detail-row">
                  <span className="detail-label">شماره پیگیری:</span>
                  <span className="detail-value tracking" dir="ltr">{request.tracking_number}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">نام واریزکننده:</span>
                  <span className="detail-value">{request.payer_name || '-'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">۴ رقم آخر کارت:</span>
                  <span className="detail-value" dir="ltr">{request.payer_card_last4 ? `****${request.payer_card_last4}` : '-'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">زمان ثبت فیش:</span>
                  <span className="detail-value">{formatDate(request.submitted_at)}</span>
                </div>
              </div>

              {/* تصویر فیش */}
              {request.receipt_image_url && (
                <div className="receipt-image-wrapper">
                  <span className="detail-label">تصویر فیش:</span>
                  <a href={request.receipt_image_url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={request.receipt_image_url}
                      alt="فیش واریزی"
                      className="receipt-image"
                    />
                  </a>
                </div>
              )}

              {request.user_note && (
                <div className="user-note">
                  <span className="detail-label">یادداشت کاربر:</span>
                  <p>{request.user_note}</p>
                </div>
              )}
            </div>
          )}

          {/* اطلاعات بررسی */}
          {isAlreadyReviewed && (
            <div className={`detail-section status-section ${request.status}`}>
              <h3>📊 وضعیت نهایی</h3>
              <div className="detail-grid-2">
                <div className="detail-row">
                  <span className="detail-label">وضعیت:</span>
                  <span className={`detail-value status-${request.status}`}>
                    {request.status_display}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">بررسی‌کننده:</span>
                  <span className="detail-value">{request.reviewed_by_name || '-'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">زمان بررسی:</span>
                  <span className="detail-value">{formatDate(request.reviewed_at)}</span>
                </div>
                {request.reject_reason && (
                  <div className="detail-row full">
                    <span className="detail-label">دلیل رد:</span>
                    <span className="detail-value reject-reason">{request.reject_reason}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* فرم رد */}
          {showRejectForm && (
            <div className="detail-section reject-form">
              <h3>❌ دلیل رد پرداخت</h3>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="دلیل رد را وارد کنید (اجباری)..."
                rows={3}
                className="reject-textarea"
              />
            </div>
          )}
        </div>

        {/* ===== Footer Actions ===== */}
        <div className="modal-footer">
          {canApproveOrReject && !showRejectForm && (
            <>
              <button
                className="btn-reject"
                onClick={() => setShowRejectForm(true)}
                disabled={loading}
              >
                ❌ رد پرداخت
              </button>
              <button
                className="btn-approve"
                onClick={handleApprove}
                disabled={loading}
              >
                {loading ? '⏳ در حال پردازش...' : '✅ تأیید و تمدید اشتراک'}
              </button>
            </>
          )}

          {canApproveOrReject && showRejectForm && (
            <>
              <button
                className="btn-cancel"
                onClick={() => {
                  setShowRejectForm(false);
                  setRejectReason('');
                }}
                disabled={loading}
              >
                انصراف
              </button>
              <button
                className="btn-reject-confirm"
                onClick={handleReject}
                disabled={loading || !rejectReason.trim()}
              >
                {loading ? '⏳ در حال پردازش...' : '❌ تأیید رد'}
              </button>
            </>
          )}

          {!canApproveOrReject && (
            <button className="btn-close-modal" onClick={onClose}>
              بستن
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentRequestDetailModal;