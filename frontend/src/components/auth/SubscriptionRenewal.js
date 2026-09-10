// frontend/src/components/auth/SubscriptionRenewal.js

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import RealApiService from '../../services/realApiService';
import './SubscriptionRenewal.css';
import LoadingBar from './../common/LoadingBar';

const SubscriptionRenewal = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [discountCode, setDiscountCode] = useState('');
  const [discountApplied, setDiscountApplied] = useState(false);
  const [discountMessage, setDiscountMessage] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [bankPaymentEnabled, setBankPaymentEnabled] = useState(true);
  const [cardPaymentEnabled, setCardPaymentEnabled] = useState(true);

  const VAT_PERCENT = 10;

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const plansResponse = await RealApiService.getPlans();
        let plansData = plansResponse.data;
        if (!Array.isArray(plansData)) {
          if (plansData && plansData.results && Array.isArray(plansData.results)) {
            plansData = plansData.results;
          } else if (plansData && typeof plansData === 'object') {
            plansData = Object.values(plansData);
          } else {
            plansData = [];
          }
        }

        setPlans(plansData);

        try {
          const subResponse = await RealApiService.getUserSubscription();
          setCurrentSubscription(subResponse.data);
        } catch (error) {
          console.log('No active subscription found');
          setCurrentSubscription(null);
        }

        if (plansData.length > 0) {
          setSelectedPlan(plansData[0]);
        }

        await loadPaymentSettings();

      } catch (error) {
        console.error('Error loading subscription data:', error);
        setMessage({ type: 'error', text: 'خطا در دریافت اطلاعات اشتراک' });
        setPlans([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const loadPaymentSettings = async () => {
    try {
      const settingsResponse = await RealApiService.getSystemSettings();
      const settings = settingsResponse.data || [];

      const bankPayment = settings.find(s => s.key === 'bank_payment_enabled');
      const cardPayment = settings.find(s => s.key === 'card_payment_enabled');

      setBankPaymentEnabled(bankPayment?.value !== 'false');
      setCardPaymentEnabled(cardPayment?.value !== 'false');
    } catch (error) {
      console.error('Error loading payment settings:', error);
      setBankPaymentEnabled(true);
      setCardPaymentEnabled(true);
    }
  };

  const groupedPlans = useMemo(() => {
    if (!Array.isArray(plans) || plans.length === 0) {
      return {};
    }

    return plans.reduce((acc, plan) => {
      const type = plan.plan_type || 'basic';
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(plan);
      return acc;
    }, {});
  }, [plans]);

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    setDiscountApplied(false);
    setDiscountMessage('');
    setDiscountCode('');
    setDiscountPercent(0);
    setMessage({ type: '', text: '' });
  };

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) {
      const errorMsg = 'لطفاً کد تخفیف را وارد کنید';
      setDiscountMessage(`❌ ${errorMsg}`);
      setMessage({ type: 'error', text: errorMsg });
      setDiscountApplied(false);
      setDiscountPercent(0);
      return;
    }

    setMessage({ type: '', text: '' });
    setDiscountMessage('');

    try {
      const response = await RealApiService.validateDiscount(
        discountCode.trim(),
        selectedPlan?.id
      );

      if (response.data.success) {
        const discountPercentValue = response.data.discount_percent;
        const successMessage = `✅ کد تخفیف ${discountPercentValue}% با موفقیت اعمال شد`;

        setDiscountApplied(true);
        setDiscountPercent(discountPercentValue);
        setDiscountMessage(successMessage);
        setMessage({ type: 'success', text: successMessage });
      } else {
        const errorMsg = response.data.error || 'کد تخفیف نامعتبر است';
        setDiscountMessage(`❌ ${errorMsg}`);
        setMessage({ type: 'error', text: errorMsg });
        setDiscountApplied(false);
        setDiscountPercent(0);
      }
    } catch (error) {
      console.error('Error validating discount:', error);
      let errorMsg = 'خطا در اعتبارسنجی کد تخفیف.';
      if (error.response?.data?.error) {
        errorMsg = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error.message) {
        errorMsg = error.message;
      }

      setDiscountMessage(`❌ ${errorMsg}`);
      setMessage({ type: 'error', text: errorMsg });
      setDiscountApplied(false);
      setDiscountPercent(0);
    }
  };

  const getPriceWithDiscount = (price) => {
    const basePrice = typeof price === 'string' ? parseFloat(price) : price;
    if (discountApplied && discountPercent > 0) {
      return basePrice * (1 - discountPercent / 100);
    }
    return basePrice;
  };

  const calculateTotal = (price) => {
    const basePrice = typeof price === 'string' ? parseFloat(price) : price;
    const discountedPrice = getPriceWithDiscount(basePrice);
    const vat = discountedPrice * (VAT_PERCENT / 100);
    const total = discountedPrice + vat;

    return {
      discountedPrice,
      vat,
      total
    };
  };

  const getPriceWithoutVat = (price) => {
    const basePrice = typeof price === 'string' ? parseFloat(price) : price;
    return getPriceWithDiscount(basePrice);
  };

  const getPlanTypeLabel = (planType) => {
    switch (planType) {
      case 'professional': return 'حرفه‌ای';
      case 'vip': return 'ویژه (VIP)';
      case 'admin': return 'مدیریت';
      case 'basic':
      default: return 'پایه';
    }
  };

  const getPlanBadge = (planType) => {
    switch (planType) {
      case 'professional': return 'premium';
      case 'vip': return 'vip';
      case 'admin': return 'admin';
      case 'basic':
      default: return 'basic';
    }
  };

  const handleBankPayment = async () => {
    if (!selectedPlan) {
      setMessage({ type: 'error', text: 'لطفاً یک پلن را انتخاب کنید.' });
      return;
    }

    setProcessing(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await RealApiService.purchaseSubscription(
        selectedPlan.id,
        discountApplied ? discountCode : ''
      );

      if (response.data.success) {
        const paymentUrl = response.data.payment_url;
        if (paymentUrl) {
          localStorage.setItem('pendingSubscriptionId', response.data.subscription_id);
          window.location.href = paymentUrl;
        } else {
          setMessage({ type: 'error', text: 'آدرس پرداخت یافت نشد.' });
        }
      } else {
        setMessage({ type: 'error', text: response.data.error || 'خطا در ایجاد پرداخت' });
      }
    } catch (error) {
      console.error('Payment error:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.error || '❌ خطا در انجام پرداخت. لطفاً دوباره تلاش کنید.'
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleCardPayment = () => {
    if (!selectedPlan) {
      setMessage({ type: 'error', text: 'لطفاً یک پلن را انتخاب کنید.' });
      return;
    }

    const priceWithoutVat = getPriceWithoutVat(selectedPlan?.price || 0);

    const now = new Date();
    const persianDate = now.toLocaleDateString('fa-IR');
    const persianTime = now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

    const userFullName = user?.full_name || user?.first_name + ' ' + user?.last_name || 'کاربر';
    const userPhone = user?.phone_number || 'نامشخص';
    const userEmail = user?.email || 'ثبت نشده';

    const planName = selectedPlan?.plan_name || 'نامشخص';
    const planType = selectedPlan?.plan_type || 'basic';
    const planTypeLabel = getPlanTypeLabel(planType);
    const durationDays = selectedPlan?.duration_days || 0;
    const tradesLimit = selectedPlan?.monthly_trades_limit || 0;
    const aiLimit = selectedPlan?.monthly_ai_consultations_limit || 0;

    const aiDisplay = aiLimit >= 999 ? '♾️ نامحدود' : `${aiLimit} عدد`;

    const originalPrice = parseFloat(selectedPlan?.price || 0);
    const priceWithoutVatRounded = Math.round(priceWithoutVat);
    const discountedPrice = getPriceWithDiscount(originalPrice);
    const discountedPriceRounded = Math.round(discountedPrice);

    const messageText =
`📋 درخواست پرداخت کارت به کارت
━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 **اطلاعات کاربر:**
• نام و نام خانوادگی: ${userFullName}
• شماره تلفن: ${userPhone}
• ایمیل: ${userEmail}
• شناسه کاربری: #${user?.id || 'نامشخص'}

📌 **اطلاعات پلن انتخابی:**
• نام پلن: ${planName} (${planTypeLabel})
• مدت زمان: ${durationDays} روز
• تعداد ترید: ${tradesLimit} ترید در ماه
• مشاوره AI: ${aiDisplay}
• شناسه پلن: #${selectedPlan?.id || 'نامشخص'}

💰 **جزئیات مالی:`
    + (discountApplied && discountPercent > 0 ? `
• قیمت اصلی: ${originalPrice.toLocaleString()} تومان
• تخفیف (${discountPercent}%): -${Math.round(originalPrice * discountPercent / 100).toLocaleString()} تومان
• قیمت پس از تخفیف: ${discountedPriceRounded.toLocaleString()} تومان` : `
• قیمت: ${originalPrice.toLocaleString()} تومان`)
    + `
• مالیات (۱۰٪): ${Math.round(originalPrice * 0.1).toLocaleString()} تومان (معاف برای کارت به کارت)
• مبلغ قابل پرداخت: ${priceWithoutVatRounded.toLocaleString()} تومان

━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 تاریخ درخواست: ${persianDate} - ${persianTime}

🔹 لطفاً شماره کارت را برای واریز مبلغ ${priceWithoutVatRounded.toLocaleString()} تومان ارسال فرمایید.

با تشکر
${userFullName}`;

    try {
      RealApiService.sendMessage({
        subject: `درخواست پرداخت کارت به کارت - ${userFullName}`,
        message: messageText
      }).then((response) => {
        console.log('📨 Message sent successfully:', response.data);
        showToast('✅ درخواست شما با موفقیت به پشتیبانی ارسال شد.', 'success');
        setMessage({ type: 'success', text: '✅ درخواست شما به پشتیبانی ارسال شد.' });
      }).catch((error) => {
        console.error('❌ Error sending message:', error);
        showToast('❌ خطا در ارسال درخواست.', 'error');
        setMessage({ type: 'error', text: '❌ خطا در ارسال درخواست.' });
      });
    } catch (error) {
      console.error('❌ Error:', error);
      showToast('❌ خطا در ارسال درخواست.', 'error');
      setMessage({ type: 'error', text: '❌ خطا در ارسال درخواست.' });
    }
  };

  if (loading) {
    return (
      <div className="subscription-renewal-container">
        <LoadingBar text="در حال بارگذاری..." />
      </div>
    );
  }

  if (!Array.isArray(plans) || plans.length === 0) {
    return (
      <div className="subscription-renewal-container">
        <div className="subscription-header">
          <h2>🔄 تمدید اشتراک</h2>
          <button className="btn-back" onClick={() => navigate('/profile')}>
            ↩️ بازگشت
          </button>
        </div>
        <div className="message error">
          ⚠️ در حال حاضر هیچ پلن اشتراکی در دسترس نیست. لطفاً بعداً مراجعه کنید.
        </div>
      </div>
    );
  }

  return (
    <div className={`subscription-renewal-container ${isDark ? 'dark' : 'light'}`}>
      <div className="subscription-header">
        <h2>🔄 تمدید اشتراک</h2>
        <button className="btn-back" onClick={() => navigate('/profile')}>
          ↩️ بازگشت
        </button>
      </div>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {currentSubscription && (
        <div className="current-subscription-card">
          <h3>✔️ اشتراک فعلی</h3>
          <div className="sub-info-grid">
            <div className="sub-info-item">
              <span className="sub-label">پلن</span>
              <span className="sub-value">{currentSubscription.plan_name || '-'}</span>
            </div>
            <div className="sub-info-item">
              <span className="sub-label">تاریخ شروع</span>
              <span className="sub-value">
                {currentSubscription.start_date ? new Date(currentSubscription.start_date).toLocaleDateString('fa-IR') : '-'}
              </span>
            </div>
            <div className="sub-info-item">
              <span className="sub-label">تاریخ پایان</span>
              <span className="sub-value">
                {currentSubscription.end_date ? new Date(currentSubscription.end_date).toLocaleDateString('fa-IR') : '-'}
              </span>
            </div>
            <div className="sub-info-item">
              <span className="sub-label">📈 تریدهای باقیمانده</span>
              <span className="sub-value">
                {(currentSubscription.trades_limit || 0) - (currentSubscription.trades_used || 0)}
              </span>
            </div>
            <div className="sub-info-item">
              <span className="sub-label">🧠 مشاوره‌های باقیمانده</span>
              <span className="sub-value">
                {(currentSubscription.ai_consultations_limit || 0) - (currentSubscription.ai_consultations_used || 0)}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="subscription-content">
        <div className="plans-section">
          <h3>📌 انتخاب پلن اشتراک</h3>

          {Object.entries(groupedPlans).map(([planType, planItems]) => (
            <div key={planType} className="plan-group">
              <h4 className={`plan-group-title ${getPlanBadge(planType)}`}>
                {getPlanTypeLabel(planType)}
                {planType === 'vip' && ' ⭐ ویژه'}
                {planType === 'admin' && ' 👑 مدیریت'}
              </h4>
              <div className="plan-cards">
                {planItems.map(plan => {
                  const { discountedPrice, vat, total } = calculateTotal(plan.price);
                  const isSelected = selectedPlan?.id === plan.id;

                  const aiConsultationsDisplay = plan.monthly_ai_consultations_limit >= 999
                    ? '♾️ نامحدود'
                    : `${plan.monthly_ai_consultations_limit} عدد`;

                  return (
                    <div
                      key={plan.id}
                      className={`plan-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => handlePlanSelect(plan)}
                    >
                      <div className="plan-header">
                        <span className="plan-duration">{plan.duration_days} روز</span>
                        <span className="plan-trades">{plan.monthly_trades_limit} ترید</span>
                      </div>
                      <div className="plan-price">
                        {discountApplied && isSelected && discountPercent > 0 ? (
                          <>
                            <span className="price-original">{parseFloat(plan.price).toLocaleString()} تومان</span>
                            <span className="price-discounted">{Math.round(discountedPrice).toLocaleString()} تومان</span>
                            <span className="discount-badge">-{discountPercent}%</span>
                          </>
                        ) : (
                          <span className="price">{parseFloat(plan.price).toLocaleString()} تومان</span>
                        )}
                      </div>
                      {isSelected && (
                        <div className="price-detail">
                          <span>💰 قیمت پایه: {Math.round(discountedPrice).toLocaleString()} تومان</span>
                          <span>🧾 مالیات (۱۰٪): {Math.round(vat).toLocaleString()} تومان</span>
                          <span className="total-price">💳 مبلغ نهایی: {Math.round(total).toLocaleString()} تومان</span>
                        </div>
                      )}
                      <ul className="plan-features">
                        <li>📈 {plan.monthly_trades_limit} ترید در ماه</li>
                        <li>🧠 {aiConsultationsDisplay} مشاوره AI</li>
                        <li>⏳ {plan.duration_days} روز اعتبار</li>
                        {plan.plan_type === 'professional' && <li>✅ تحلیل ICT پیشرفته</li>}
                        {plan.plan_type === 'vip' && <li>✅ مشاوره اختصاصی</li>}
                        {plan.plan_type === 'admin' && <li>👑 دسترسی کامل مدیریتی</li>}
                      </ul>
                      {isSelected && (
                        <div className="selected-badge">✓ انتخاب شده</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="discount-section">
          <h3>🎁 کد تخفیف</h3>
          <div className="discount-input-group">
            <input
              type="text"
              placeholder="کد تخفیف را وارد کنید..."
              value={discountCode}
              onChange={(e) => {
                setDiscountCode(e.target.value);
                if (message.text) {
                  setMessage({ type: '', text: '' });
                  setDiscountMessage('');
                }
              }}
              disabled={discountApplied || processing}
              className="discount-input"
            />
            <button
              className="btn-apply-discount"
              onClick={handleApplyDiscount}
              disabled={discountApplied || processing}
            >
              {discountApplied ? '✅ اعمال شد.' : 'اعمال'}
            </button>
          </div>
          {discountMessage && (
            <p className={`discount-message ${discountApplied ? 'success' : ''}`}>
              {discountMessage}
            </p>
          )}
        </div>

        {/* ============================================
            ✅ باکس اصلی خلاصه سفارش
            ============================================ */}
        <div className="summary-main-box">
          <h3>📋 خلاصه سفارش و روش پرداخت</h3>

          {selectedPlan ? (
            <>
              {/* باکس خلاصه سفارش - کل عرض - کامل‌تر */}
              <div className="summary-order-box">
                <div className="order-info">
                  <span className="order-item">
                    📌 <strong>{selectedPlan.plan_name}</strong>
                    <span className="separator">|</span>
                    🏷️ {getPlanTypeLabel(selectedPlan.plan_type)}
                    <span className="separator">|</span>
                    ⏳ {selectedPlan.duration_days} روز
                    <span className="separator">|</span>
                    📈 {selectedPlan.monthly_trades_limit} ترید
                    <span className="separator">|</span>
                    🧠 {selectedPlan.monthly_ai_consultations_limit >= 999 ? '♾️' : selectedPlan.monthly_ai_consultations_limit}
                  </span>
                </div>
                <div className="order-price-detail">
                  {discountApplied && discountPercent > 0 && (
                    <span className="price-original-small">
                      {parseFloat(selectedPlan.price).toLocaleString()} تومان
                    </span>
                  )}
                  <span className="order-price">
                    {Math.round(calculateTotal(selectedPlan.price).total).toLocaleString()} تومان
                  </span>
                  {discountApplied && discountPercent > 0 && (
                    <span className="discount-badge-small">-{discountPercent}%</span>
                  )}
                  <span className="price-label">(مبلغ نهایی)</span>
                </div>
              </div>

              {/* باکس دو روش پرداخت */}
              <div className="payment-methods-box">
                {/* روش ۱: پرداخت از درگاه بانکی */}
                <div className={`payment-method-item bank-method ${!bankPaymentEnabled ? 'disabled' : ''}`}>
                  <div className="payment-method-header">
                    <span className="method-icon">🏦</span>
                    <span className="method-title">
                      {!bankPaymentEnabled && <span className="disabled-badge">غیرفعال</span>}
                      پرداخت از درگاه بانکی
                    </span>
                  </div>
                  <div className="payment-method-price">
                    <span>💰 مبلغ قابل پرداخت:</span>
                    <strong>{Math.round(calculateTotal(selectedPlan.price).total).toLocaleString()} تومان</strong>
                    <span className="vat-badge">شامل ۱۰٪ مالیات</span>
                  </div>
                  {!bankPaymentEnabled && (
                    <p className="payment-method-note" style={{ borderRightColor: '#dc3545' }}>
                      <strong>⛔ غیرفعال:</strong> این روش پرداخت در حال حاضر توسط ادمین غیرفعال شده است.
                    </p>
                  )}
                  <button
                    className="btn-payment btn-bank"
                    onClick={handleBankPayment}
                    disabled={processing || !bankPaymentEnabled}
                  >
                    {!bankPaymentEnabled ? '⛔ غیرفعال' : processing ? '⏳ در حال آماده‌سازی...' : '💳 پرداخت از درگاه'}
                  </button>
                </div>

                {/* روش ۲: پرداخت کارت به کارت - بدون مالیات */}
                <div className={`payment-method-item card-method ${!cardPaymentEnabled ? 'disabled' : ''}`}>
                  <div className="payment-method-header">
                    <span className="method-icon">💳</span>
                    <span className="method-title">
                      {!cardPaymentEnabled && <span className="disabled-badge">غیرفعال</span>}
                      پرداخت کارت به کارت
                    </span>
                  </div>
                  <div className="payment-method-price">
                    <span>💰 مبلغ قابل پرداخت:</span>
                    <strong>{Math.round(getPriceWithoutVat(selectedPlan.price)).toLocaleString()} تومان</strong>
                    <span className="vat-free-badge">بدون مالیات</span>
                  </div>
                  <p className="payment-method-note">
                    <strong>⚠️ توجه:</strong> پرداخت کارت به کارت <strong>فاقد مالیات بر ارزش افزوده (۱۰٪)</strong> می‌باشد.
                    {!cardPaymentEnabled && (
                      <span style={{ display: 'block', marginTop: '4px', color: '#dc3545' }}>
                        <strong>⛔ غیرفعال:</strong> این روش پرداخت در حال حاضر توسط ادمین غیرفعال شده است.
                      </span>
                    )}
                  </p>
                  <button
                    className="btn-payment btn-card"
                    onClick={handleCardPayment}
                    disabled={processing || !cardPaymentEnabled}
                  >
                    {!cardPaymentEnabled ? '⛔ غیرفعال' : '📨 درخواست شماره کارت از پشتیبانی'}
                  </button>
                </div>
              </div>

              <p className="payment-footer-note">
                🔒 کلیه اطلاعات پرداخت شما به صورت امن منتقل می‌شود.
              </p>
            </>
          ) : (
            <p>لطفاً یک پلن را انتخاب کنید</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionRenewal;