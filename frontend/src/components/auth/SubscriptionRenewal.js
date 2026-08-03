// frontend/src/components/auth/SubscriptionRenewal.js

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import RealApiService from '../../services/realApiService';
import './SubscriptionRenewal.css';

const SubscriptionRenewal = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
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
  const [paymentData, setPaymentData] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const VAT_PERCENT = 10;

  // بارگذاری پلن‌ها از دیتابیس
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const plansResponse = await RealApiService.getPlans();
        console.log('📊 Plans response:', plansResponse.data);

        let plansData = plansResponse.data;
        if (!Array.isArray(plansData)) {
          console.warn('⚠️ Plans data is not an array, converting...');
          if (plansData && plansData.results && Array.isArray(plansData.results)) {
            plansData = plansData.results;
          } else if (plansData && typeof plansData === 'object') {
            plansData = Object.values(plansData);
          } else {
            plansData = [];
          }
        }

        setPlans(plansData);
        console.log('✅ Plans set:', plansData.length);

        try {
          const subResponse = await RealApiService.getUserSubscription();
          console.log('📊 Subscription response:', subResponse.data);
          setCurrentSubscription(subResponse.data);
        } catch (error) {
          console.log('No active subscription found');
          setCurrentSubscription(null);
        }

        if (plansData.length > 0) {
          setSelectedPlan(plansData[0]);
        }

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

  // ============================================
  // گروه‌بندی پلن‌ها بر اساس نوع
  // ============================================
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

  // ============================================
  // انتخاب پلن
  // ============================================
  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    setDiscountApplied(false);
    setDiscountMessage('');
    setDiscountCode('');
    setDiscountPercent(0);
    setPaymentData(null);
  };

  // ============================================
  // اعمال کد تخفیف
  // ============================================
  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) {
      setMessage({ type: 'error', text: 'لطفاً کد تخفیف را وارد کنید' });
      return;
    }

    try {
      const response = await RealApiService.validateDiscount(
        discountCode.trim(),
        selectedPlan?.id
      );

      if (response.data.success) {
        setDiscountApplied(true);
        setDiscountPercent(response.data.discount_percent);
        setDiscountMessage(`✅ کد تخفیف ${response.data.discount_percent}% با موفقیت اعمال شد`);
        setMessage({ type: 'success', text: discountMessage });
      } else {
        setMessage({ type: 'error', text: response.data.error || 'کد تخفیف نامعتبر است' });
      }
    } catch (error) {
      console.error('Error validating discount:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'خطا در اعتبارسنجی کد تخفیف'
      });
    }
  };

  // ============================================
  // محاسبه قیمت با تخفیف
  // ============================================
  const getPriceWithDiscount = (price) => {
    const basePrice = typeof price === 'string' ? parseFloat(price) : price;
    if (discountApplied && discountPercent > 0) {
      return basePrice * (1 - discountPercent / 100);
    }
    return basePrice;
  };

  // ============================================
  // محاسبه مالیات و مبلغ نهایی
  // ============================================
  const calculateTotal = (price) => {
    const basePrice = typeof price === 'string' ? parseFloat(price) : price;
    const discountedPrice = getPriceWithDiscount(basePrice);
    const vat = discountedPrice * (VAT_PERCENT / 100);
    const total = discountedPrice + vat;

    console.log('💰 Price calculation:', {
      originalPrice: basePrice,
      discountedPrice: discountedPrice,
      vatPercent: VAT_PERCENT,
      vat: vat,
      total: total
    });

    return {
      discountedPrice,
      vat,
      total
    };
  };

  // ============================================
  // پرداخت و تمدید
  // ============================================
  const handlePayment = async () => {
    if (!selectedPlan) {
      setMessage({ type: 'error', text: 'لطفاً یک پلن را انتخاب کنید' });
      return;
    }

    setProcessing(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await RealApiService.purchaseSubscription(
        selectedPlan.id,
        discountApplied ? discountCode : ''
      );

      console.log('💰 Purchase response:', response.data);

      if (response.data.success) {
        // ✅ هدایت کاربر به درگاه زرین‌پال
        const paymentUrl = response.data.payment_url;
        if (paymentUrl) {
          // ذخیره subscription_id برای استفاده در تایید پرداخت
          localStorage.setItem('pendingSubscriptionId', response.data.subscription_id);
          window.location.href = paymentUrl;
        } else {
          setMessage({ type: 'error', text: 'آدرس پرداخت یافت نشد' });
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

  // ============================================
  // تایید پرداخت (برای نمایش پیام موفقیت)
  // ============================================
  const confirmPayment = () => {
    setShowPaymentModal(false);

    const { total } = calculateTotal(selectedPlan?.price || 0);

    setMessage({
      type: 'success',
      text: `✅ پرداخت با موفقیت انجام شد! اشتراک ${selectedPlan?.plan_name} فعال شد. مبلغ پرداختی: ${Math.round(total).toLocaleString()} تومان`
    });

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + (selectedPlan?.duration_days || 30));

    const subscriptionData = {
      plan: selectedPlan?.plan_name || 'حرفه‌ای',
      remainingDays: selectedPlan?.duration_days || 30,
      remainingTrades: selectedPlan?.monthly_trades_limit || 50,
      remainingAiConsultations: selectedPlan?.monthly_ai_consultations_limit || 0,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      isActive: true,
      isExpired: false,
      price: total,
      discount: discountPercent || 0
    };

    localStorage.setItem('subscription', JSON.stringify(subscriptionData));

    setTimeout(() => {
      navigate('/profile');
    }, 2000);
  };

  // ============================================
  // توابع کمکی
  // ============================================
  const getPlanTypeLabel = (planType) => {
    switch (planType) {
      case 'professional':
        return 'حرفه‌ای';
      case 'vip':
        return 'ویژه (VIP)';
      case 'admin':
        return 'مدیریت';
      case 'basic':
      default:
        return 'پایه';
    }
  };

  const getPlanBadge = (planType) => {
    switch (planType) {
      case 'professional':
        return 'premium';
      case 'vip':
        return 'vip';
      case 'admin':
        return 'admin';
      case 'basic':
      default:
        return 'basic';
    }
  };

  // ============================================
  // لودینگ
  // ============================================
  if (loading) {
    return (
      <div className="subscription-renewal-container">
        <div className="loading-spinner">⏳ در حال بارگذاری پلن‌ها...</div>
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

  // ============================================
  // رندر اصلی
  // ============================================
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

      {/* وضعیت اشتراک فعلی */}
      {currentSubscription && (
        <div className="current-subscription-card">
          <h3>📊 اشتراک فعلی</h3>
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
            {/* ✅ مشاوره‌های باقیمانده */}
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
        {/* انتخاب پلن */}
        <div className="plans-section">
          <h3>📊 انتخاب پلن اشتراک</h3>

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

                  // ✅ نمایش تعداد مشاوره
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
                        {/* ✅ اضافه شدن خط مشاوره */}
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

        {/* کد تخفیف */}
        <div className="discount-section">
          <h3>🎁 کد تخفیف</h3>
          <div className="discount-input-group">
            <input
              type="text"
              placeholder="کد تخفیف را وارد کنید..."
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
              disabled={discountApplied || processing}
              className="discount-input"
            />
            <button
              className="btn-apply-discount"
              onClick={handleApplyDiscount}
              disabled={discountApplied || processing}
            >
              {discountApplied ? '✅ اعمال شد' : 'اعمال'}
            </button>
          </div>
          {discountMessage && (
            <p className={`discount-message ${discountApplied ? 'success' : ''}`}>
              {discountMessage}
            </p>
          )}
        </div>

        {/* خلاصه و پرداخت */}
        <div className="summary-section">
          <div className="summary-card">
            <h3>📋 خلاصه سفارش</h3>
            {selectedPlan ? (
              <>
                <div className="summary-row">
                  <span>پلن</span>
                  <span>{selectedPlan.plan_name} - {selectedPlan.duration_days} روز</span>
                </div>
                <div className="summary-row">
                  <span>📈 تعداد ترید</span>
                  <span>{selectedPlan.monthly_trades_limit} عدد</span>
                </div>
                {/* ✅ اضافه شدن ردیف مشاوره در خلاصه */}
                <div className="summary-row">
                  <span>🧠 تعداد مشاوره AI</span>
                  <span>
                    {selectedPlan.monthly_ai_consultations_limit >= 999
                      ? '♾️ نامحدود'
                      : `${selectedPlan.monthly_ai_consultations_limit} عدد`}
                  </span>
                </div>
                <div className="summary-row">
                  <span>💰 قیمت پایه</span>
                  <span>{parseFloat(selectedPlan.price).toLocaleString()} تومان</span>
                </div>
                {discountApplied && discountPercent > 0 && (
                  <div className="summary-row discount">
                    <span>تخفیف ({discountPercent}%)</span>
                    <span>-{Math.round(parseFloat(selectedPlan.price) * discountPercent / 100).toLocaleString()} تومان</span>
                  </div>
                )}
                <div className="summary-row">
                  <span>قیمت پس از تخفیف</span>
                  <span>{Math.round(getPriceWithDiscount(selectedPlan.price)).toLocaleString()} تومان</span>
                </div>
                <div className="summary-row">
                  <span>🧾 مالیات بر ارزش افزوده (۱۰٪)</span>
                  <span>{Math.round(calculateTotal(selectedPlan.price).vat).toLocaleString()} تومان</span>
                </div>
                <div className="summary-row total">
                  <span>💳 مبلغ قابل پرداخت</span>
                  <span>
                    {Math.round(calculateTotal(selectedPlan.price).total).toLocaleString()} تومان
                  </span>
                </div>
                <button
                  className="btn-payment"
                  onClick={handlePayment}
                  disabled={processing}
                >
                  {processing ? '⏳ در حال آماده‌سازی پرداخت...' : '💰 پرداخت و تمدید'}
                </button>
                <p className="payment-note">
                  با کلیک روی دکمه پرداخت، به درگاه امن زرین‌پال هدایت می‌شوید.
                </p>
              </>
            ) : (
              <p>لطفاً یک پلن را انتخاب کنید</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionRenewal;