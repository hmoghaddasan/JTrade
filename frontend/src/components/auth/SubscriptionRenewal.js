// frontend/src/components/auth/SubscriptionRenewal.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import './SubscriptionRenewal.css';

const SubscriptionRenewal = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState(null);

  // پلن‌های اشتراک
  const plans = [
    {
      id: 1,
      name: 'پایه',
      type: 'basic',
      duration: '۱ ماهه',
      durationDays: 30,
      price: 250000,
      tradesLimit: 10,
      features: [
        'ثبت تا ۱۰ ترید در ماه',
        'دسترسی به ۵ گزارش پایه',
        'پشتیبانی ایمیلی',
        'دسته‌بندی محدود'
      ],
      popular: false
    },
    {
      id: 2,
      name: 'پایه',
      type: 'basic',
      duration: '۳ ماهه',
      durationDays: 90,
      price: 600000,
      tradesLimit: 10,
      features: [
        'ثبت تا ۱۰ ترید در ماه',
        'دسترسی به ۵ گزارش پایه',
        'پشتیبانی ایمیلی',
        'دسته‌بندی محدود',
        '۳۰٪ تخفیف نسبت به ماهانه'
      ],
      popular: false
    },
    {
      id: 3,
      name: 'پایه',
      type: 'basic',
      duration: '۶ ماهه',
      durationDays: 180,
      price: 1000000,
      tradesLimit: 10,
      features: [
        'ثبت تا ۱۰ ترید در ماه',
        'دسترسی به ۵ گزارش پایه',
        'پشتیبانی ایمیلی',
        'دسته‌بندی محدود',
        '۴۰٪ تخفیف نسبت به ماهانه'
      ],
      popular: false
    },
    {
      id: 4,
      name: 'حرفه‌ای',
      type: 'professional',
      duration: '۱ ماهه',
      durationDays: 30,
      price: 500000,
      tradesLimit: 50,
      features: [
        'ثبت تا ۵۰ ترید در ماه',
        'دسترسی به ۱۲ گزارش پیشرفته',
        'پشتیبانی اولویت‌دار',
        'دسته‌بندی نامحدود',
        'خروجی اکسل و PDF',
        'تحلیل روانشناسی'
      ],
      popular: true
    },
    {
      id: 5,
      name: 'حرفه‌ای',
      type: 'professional',
      duration: '۳ ماهه',
      durationDays: 90,
      price: 1200000,
      tradesLimit: 50,
      features: [
        'ثبت تا ۵۰ ترید در ماه',
        'دسترسی به ۱۲ گزارش پیشرفته',
        'پشتیبانی اولویت‌دار',
        'دسته‌بندی نامحدود',
        'خروجی اکسل و PDF',
        'تحلیل روانشناسی',
        '۳۰٪ تخفیف نسبت به ماهانه'
      ],
      popular: false
    },
    {
      id: 6,
      name: 'حرفه‌ای',
      type: 'professional',
      duration: '۶ ماهه',
      durationDays: 180,
      price: 2000000,
      tradesLimit: 50,
      features: [
        'ثبت تا ۵۰ ترید در ماه',
        'دسترسی به ۱۲ گزارش پیشرفته',
        'پشتیبانی اولویت‌دار',
        'دسته‌بندی نامحدود',
        'خروجی اکسل و PDF',
        'تحلیل روانشناسی',
        '۴۰٪ تخفیف نسبت به ماهانه'
      ],
      popular: false
    }
  ];

  // بارگذاری اشتراک فعلی
  useEffect(() => {
    const savedSubscription = localStorage.getItem('subscription');
    if (savedSubscription) {
      setSubscription(JSON.parse(savedSubscription));
    }
  }, []);

  const handlePlanSelect = (planId) => {
    setSelectedPlan(planId);
  };

  const handlePurchase = () => {
    if (!selectedPlan) {
      alert('لطفاً یک پلن را انتخاب کنید');
      return;
    }

    setLoading(true);

    const plan = plans.find(p => p.id === selectedPlan);
    if (!plan) {
      setLoading(false);
      return;
    }

    // محاسبه تاریخ جدید
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.durationDays);

    // محاسبه مالیات (۱۰٪)
    const tax = plan.price * 0.1;
    const totalPrice = plan.price + tax;

    // ایجاد اشتراک جدید
    const newSubscription = {
      plan: plan.name,
      planType: plan.type,
      duration: plan.duration,
      durationDays: plan.durationDays,
      price: plan.price,
      tax: tax,
      totalPrice: totalPrice,
      tradesLimit: plan.tradesLimit,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      isActive: true,
      isExpired: false,
      purchasedAt: new Date().toISOString()
    };

    // ذخیره در localStorage
    localStorage.setItem('subscription', JSON.stringify(newSubscription));

    // به‌روزرسانی اطلاعات کاربر
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    userData.subscription = newSubscription;
    localStorage.setItem('userData', JSON.stringify(userData));

    setLoading(false);
    alert(`✅ اشتراک ${plan.name} - ${plan.duration} با موفقیت خریداری شد!`);
    navigate('/');
  };

  // محاسبه قیمت با مالیات
  const getPriceWithTax = (price) => {
    const tax = price * 0.1;
    return (price + tax).toLocaleString('fa-IR');
  };

  return (
    <div className={`subscription-renewal ${isDark ? 'dark' : 'light'}`}>
      <div className="subscription-header">
        <h1>🔄 تمدید اشتراک</h1>
        <p>برای ادامه استفاده از خدمات، یکی از پلن‌های زیر را انتخاب کنید</p>
        {subscription && subscription.isActive && (
          <div className="current-subscription">
            <span>اشتراک فعلی: </span>
            <strong>{subscription.plan}</strong>
            <span> - </span>
            <span>پایان: {new Date(subscription.endDate).toLocaleDateString('fa-IR')}</span>
          </div>
        )}
        <button className="btn-back" onClick={() => navigate('/')}>
          ↩️ بازگشت به داشبورد
        </button>
      </div>

      <div className="plans-grid">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`plan-card ${selectedPlan === plan.id ? 'selected' : ''} ${plan.popular ? 'popular' : ''}`}
            onClick={() => handlePlanSelect(plan.id)}
          >
            {plan.popular && (
              <div className="popular-badge">محبوب‌ترین</div>
            )}
            <div className="plan-header">
              <h3>{plan.name}</h3>
              <span className="plan-type">{plan.type === 'professional' ? 'حرفه‌ای' : 'پایه'}</span>
            </div>
            <div className="plan-duration">{plan.duration}</div>
            <div className="plan-price">
              <span className="price">{plan.price.toLocaleString('fa-IR')}</span>
              <span className="currency">تومان</span>
            </div>
            <div className="plan-tax">
              + {Math.round(plan.price * 0.1).toLocaleString('fa-IR')} تومان مالیات
            </div>
            <div className="plan-total">
              مجموع: {getPriceWithTax(plan.price)} تومان
            </div>
            <div className="plan-trades-limit">
              📊 {plan.tradesLimit} ترید در ماه
            </div>
            <ul className="plan-features">
              {plan.features.map((feature, index) => (
                <li key={index}>✅ {feature}</li>
              ))}
            </ul>
            <button
              className={`btn-select ${selectedPlan === plan.id ? 'selected' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                handlePlanSelect(plan.id);
              }}
            >
              {selectedPlan === plan.id ? '✓ انتخاب شده' : 'انتخاب'}
            </button>
          </div>
        ))}
      </div>

      <div className="subscription-footer">
        <button
          className="btn-purchase"
          onClick={handlePurchase}
          disabled={!selectedPlan || loading}
        >
          {loading ? '⏳ در حال پردازش...' : '💰 خرید اشتراک'}
        </button>
        <p className="footer-note">
          با خرید اشتراک، شرایط و قوانین را می‌پذیرید.
        </p>
        <p className="footer-tax-note">
          * مبلغ نهایی شامل ۱۰٪ مالیات بر ارزش افزوده می‌باشد.
        </p>
      </div>
    </div>
  );
};

export default SubscriptionRenewal;