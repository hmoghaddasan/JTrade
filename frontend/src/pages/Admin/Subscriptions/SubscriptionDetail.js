// frontend/src/pages/Admin/Subscriptions/SubscriptionDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import adminService from '../../../services/adminService';
import LoadingSpinner from '../../../components/Admin/LoadingSpinner';
import StatusBadge from '../../../components/Admin/StatusBadge';
import ExtendModal from './ExtendModal';
import './SubscriptionDetail.css';

const SubscriptionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showExtendModal, setShowExtendModal] = useState(false);

  useEffect(() => {
    loadSubscription();
  }, [id]);

  const loadSubscription = async () => {
    setLoading(true);
    try {
      const response = await adminService.getSubscription(id);
      setSubscription(response.data);
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('آیا از لغو این اشتراک اطمینان دارید؟')) return;

    try {
      await adminService.cancelSubscription(id);
      loadSubscription();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      alert('خطا در لغو اشتراک');
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!subscription) return <div className="error">اشتراک یافت نشد</div>;

  const isExpired = new Date(subscription.end_date) < new Date();
  const remainingDays = subscription.remaining_days;

  return (
    <div className="subscription-detail-page">
      <div className="page-header">
        <h1>جزئیات اشتراک #{subscription.id}</h1>
        <div className="header-actions">
          <button onClick={() => setShowExtendModal(true)} className="btn-extend">
            📅 تمدید اشتراک
          </button>
          {subscription.is_active && !subscription.is_trial && (
            <button onClick={handleCancel} className="btn-cancel">
              ❌ لغو اشتراک
            </button>
          )}
          <button onClick={() => navigate('/admin/subscriptions')} className="btn-back">
            🔙 بازگشت
          </button>
        </div>
      </div>

      <div className="detail-grid">
        <div className="info-card">
          <h3>اطلاعات کاربر</h3>
          <div className="info-row">
            <span className="label">شماره تلفن:</span>
            <span className="value">{subscription.user_phone}</span>
          </div>
          <div className="info-row">
            <span className="label">نام:</span>
            <span className="value">{subscription.user_name || '—'}</span>
          </div>
          <div className="info-row">
            <span className="label">شناسه کاربر:</span>
            <span className="value">{subscription.user}</span>
          </div>
        </div>

        <div className="info-card">
          <h3>اطلاعات پلن</h3>
          <div className="info-row">
            <span className="label">نام پلن:</span>
            <span className="value">{subscription.plan_name}</span>
          </div>
          <div className="info-row">
            <span className="label">نوع پلن:</span>
            <span className="value">{subscription.plan_type === 'basic' ? 'پایه' : subscription.plan_type === 'professional' ? 'حرفه‌ای' : 'VIP'}</span>
          </div>
          <div className="info-row">
            <span className="label">آزمایشی:</span>
            <StatusBadge status={subscription.is_trial ? 'orange' : 'gray'} label={subscription.is_trial ? 'بله' : 'خیر'} />
          </div>
          <div className="info-row">
            <span className="label">وضعیت:</span>
            <StatusBadge
              status={subscription.is_active && !isExpired ? 'active' : 'inactive'}
              label={subscription.is_active && !isExpired ? 'فعال' : 'غیرفعال'}
            />
          </div>
          {isExpired && (
            <div className="info-row">
              <span className="label">وضعیت انقضا:</span>
              <StatusBadge status="red" label="منقضی شده" />
            </div>
          )}
        </div>

        <div className="info-card">
          <h3>بازه زمانی</h3>
          <div className="info-row">
            <span className="label">تاریخ شروع:</span>
            <span className="value">{new Date(subscription.start_date).toLocaleDateString('fa-IR')}</span>
          </div>
          <div className="info-row">
            <span className="label">تاریخ پایان:</span>
            <span className="value">{new Date(subscription.end_date).toLocaleDateString('fa-IR')}</span>
          </div>
          <div className="info-row">
            <span className="label">روزهای باقیمانده:</span>
            <span className="value" style={{ color: remainingDays < 7 ? '#dc3545' : remainingDays < 30 ? '#e67e22' : '#28a745', fontWeight: 'bold' }}>
              {remainingDays > 0 ? `${remainingDays} روز` : 'منقضی شده'}
            </span>
          </div>
        </div>

        <div className="info-card">
          <h3>محدودیت‌ها و استفاده</h3>
          <div className="info-row">
            <span className="label">تریدهای استفاده‌شده:</span>
            <span className="value">{subscription.trades_used} / {subscription.trades_limit}</span>
          </div>
          <div className="info-row">
            <span className="label">تریدهای باقیمانده:</span>
            <span className="value" style={{ color: subscription.remaining_trades < 5 ? '#dc3545' : '#28a745' }}>
              {subscription.remaining_trades}
            </span>
          </div>
          <div className="info-row">
            <span className="label">مشاوره‌های استفاده‌شده:</span>
            <span className="value">{subscription.ai_consultations_used} / {subscription.ai_consultations_limit}</span>
          </div>
          <div className="info-row">
            <span className="label">مشاوره‌های باقیمانده:</span>
            <span className="value" style={{ color: subscription.remaining_ai < 3 ? '#dc3545' : '#28a745' }}>
              {subscription.remaining_ai}
            </span>
          </div>
        </div>

        <div className="info-card">
          <h3>اطلاعات مالی</h3>
          <div className="info-row">
            <span className="label">مبلغ پرداختی:</span>
            <span className="value">{subscription.amount_paid?.toLocaleString()} تومان</span>
          </div>
          <div className="info-row">
            <span className="label">وضعیت پرداخت:</span>
            <StatusBadge
              status={subscription.payment_status === 'paid' ? 'green' : subscription.payment_status === 'pending' ? 'orange' : 'red'}
              label={subscription.payment_status === 'paid' ? 'پرداخت شده' : subscription.payment_status === 'pending' ? 'در انتظار' : 'خطا'}
            />
          </div>
        </div>

        <div className="info-card">
          <h3>اطلاعات ثبت</h3>
          <div className="info-row">
            <span className="label">تاریخ ثبت:</span>
            <span className="value">{new Date(subscription.created_at).toLocaleString('fa-IR')}</span>
          </div>
        </div>
      </div>

      {showExtendModal && (
        <ExtendModal
          subscription={subscription}
          onClose={() => setShowExtendModal(false)}
          onSuccess={loadSubscription}
        />
      )}
    </div>
  );
};

export default SubscriptionDetail;