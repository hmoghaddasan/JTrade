// frontend/src/pages/AboutPage.js

import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Link } from 'react-router-dom';
import RealApiService from '../services/realApiService';
import './AboutPage.css';

const AboutPage = () => {
  const { isDark } = useTheme();
  const [appVersion, setAppVersion] = useState('1.0.0');

  // ============================================
  // ✅ دریافت نسخه از سرور
  // ============================================
  useEffect(() => {
    const loadVersion = async () => {
      try {
        const response = await RealApiService.getCurrentVersion();
        if (response.data && response.data.version_number) {
          setAppVersion(response.data.version_number);
          console.log('📌 AboutPage - Version loaded from server:', response.data.version_number);
        }
      } catch (error) {
        console.warn('⚠️ Unable to fetch version from server, using fallback:', error);
        const envVersion = process.env.REACT_APP_VERSION;
        if (envVersion) {
          setAppVersion(envVersion);
        }
      }
    };
    loadVersion();
  }, []);

  // ============================================
  // ✅ امکانات کلیدی نرم‌افزار
  // ============================================
  const features = [
    {
      icon: '🎁',
      title: 'تست رایگان ۷ روزه',
      description: 'تمام امکانات نرم‌افزار را به مدت ۷ روز به‌صورت رایگان تست کنید. بدون نیاز به کارت بانکی، بدون محدودیت در ترید و مشاوره AI',
      color: '#00897b',
      badge: '7-Day Free Trial'
    },
    {
      icon: '📊',
      title: 'گزارشات پیشرفته و متنوع',
      description: 'بیش از ۱۲ گزارش تخصصی شامل P&L، نسبت R:R، عملکرد هفتگی، چک‌لیست، خواب و تغذیه، نقشه احساسات، واکنش‌ها، اشتباهات، کیفیت اجرا، بایاس، تایم‌فریم و مدیریت ریسک',
      color: '#0d47a1',
      badge: '12+ Reports'
    },
    {
      icon: '🧠',
      title: 'مشاوره هوشمند AI',
      description: 'تحلیل عملکرد کاربر و ارائه بازخورد اختصاصی به زبان طبیعی با مدل‌های پیشرفته هوش مصنوعی، ذخیره و نمایش کامل تاریخچه مشاوره‌ها',
      color: '#7c4dff',
      badge: 'AI Consultation'
    },
    {
      icon: '📋',
      title: 'ژورنال کامل ترید با تصویر',
      description: 'ثبت، ویرایش و نمایش کامل تریدها در ۶ تب تخصصی (عمومی، اجرا، روانشناسی، چک‌لیست، بازبینی، ICT) با قابلیت آپلود تصویر چارت و بزرگ‌نمایی',
      color: '#1565c0',
      badge: '6 Tabs + Chart'
    },
    {
      icon: '📈',
      title: 'پشتیبانی از تحلیل ICT',
      description: 'تب تخصصی ICT برای تحلیل‌های پیشرفته معاملاتی شامل مفاهیم تکنیکال و سناریوهای معاملاتی حرفه‌ای',
      color: '#e65100',
      badge: 'ICT Support'
    },
    {
      icon: '🛡️',
      title: 'قوانین انضباطی شخصی',
      description: 'تعریف قوانین معاملاتی شخصی، چک‌لیست پیش‌از معامله، گزارش پایبندی به قوانین با درصد دقیق و گروه‌بندی قوانین',
      color: '#4caf50',
      badge: 'Custom Rules'
    },
    {
      icon: '💰',
      title: 'پورتفولیوهای متنوع',
      description: 'ایجاد و مدیریت چندین پورتفولیو با انتخابگر در هدر، فیلتر تریدها، مقایسه عملکرد با نمودارهای راداری و میله‌ای',
      color: '#2e7d32',
      badge: 'Multi Portfolio'
    },
    {
      icon: '📁',
      title: 'دسته‌بندی‌های سفارشی',
      description: 'گروه‌بندی تریدها در دسته‌بندی‌های سفارشی با آیکون‌های دلخواه برای سازماندهی بهتر معاملات',
      color: '#6a1b9a',
      badge: 'Custom Groups'
    },
    {
      icon: '📈',
      title: 'نمودارهای پیشرفته در گزارشات',
      description: 'رسم انواع نمودارهای خطی، میله‌ای و راداری در گزارشات با قابلیت بزرگ‌نمایی و پشتیبانی از تم تاریک',
      color: '#ff6d00',
      badge: 'Charts'
    },
    {
      icon: '📥',
      title: 'ایمپورت هوشمند CSV',
      description: 'انتقال آسان داده‌های معاملاتی با ۴ مرحله (آپلود، نگاشت، پیش‌نمایش، نتیجه)، نرمال‌سازی تاریخ، تطبیق نمادها و تشخیص کارگزار',
      color: '#00838f',
      badge: 'Smart Import'
    },
    {
      icon: '🎯',
      title: 'شاخص‌های حرفه‌ای',
      description: '۵ شاخص اصلی (Sharpe, Sortino, Calmar, Profit Factor, Max Drawdown, Kelly Criterion) با صفحه اختصاصی، جدول، نمودار و راهنمای کامل فرمول‌ها',
      color: '#c62828',
      badge: '5 Metrics'
    },
    {
      icon: '📱',
      title: 'تم روشن/تاریک یکپارچه',
      description: 'پشتیبانی کامل از تم‌های روشن و تاریک با تجربه کاربری یکپارچه در تمام صفحات و ابزارها',
      color: '#37474f',
      badge: 'Dark/Light'
    },
    {
      icon: '🔒',
      title: 'امنیت و احراز هویت',
      description: 'ورود با شماره تلفن و کد تأیید (OTP)، احراز هویت با JWT، ورود مستقیم ادمین (Admin Bypass OTP)، سیستم اشتراک با پلن‌های متنوع',
      color: '#c62828',
      badge: 'Secure'
    },
    {
      icon: '💬',
      title: 'سیستم پیام‌رسانی داخلی',
      description: 'ارسال و دریافت پیام بین کاربر و ادمین، اعلان‌های سیستم با نمایش فقط در لاگین جدید، پیام‌های سیستمی',
      color: '#4e342e',
      badge: 'Messaging'
    },
    {
      icon: '📊',
      title: 'داشبورد سه‌ستونی',
      description: 'داشبورد کامل با تقویم رنگی P&L، نمایش آمار کلی، انتخابگر پورتفولیو و دسترسی سریع به تمام گزارشات',
      color: '#0d47a1',
      badge: 'Dashboard'
    },
    {
      icon: '🔄',
      title: 'به‌روزرسانی مداوم',
      description: 'نسخه‌های منظم با امکانات جدید و بهبودهای مستمر بر اساس بازخورد کاربران',
      color: '#00897b',
      badge: `v${appVersion}`
    }
  ];

  // ============================================
  // ✅ آمار و دستاوردها
  // ============================================
  const stats = [
    { value: appVersion, label: 'نسخه فعلی', icon: '📌' },
    { value: '۱۴۰۵', label: 'سال انتشار', icon: '📅' },
    { value: '۱۲+', label: 'گزارش تخصصی', icon: '📊' },
    { value: '۵', label: 'شاخص حرفه‌ای', icon: '🎯' },
    { value: '۳', label: 'پلن اشتراک', icon: '💎' },
    { value: '۱۰', label: 'ابزار انضباطی', icon: '🛡️' },
    { value: '۶', label: 'تب تخصصی ترید', icon: '📋' },
    { value: '۷', label: 'روز تست رایگان', icon: '🎁' }
  ];

  // ============================================
  // ✅ تیم توسعه
  // ============================================
  const team = [
    {
      name: 'محمد حسین مقدسان',
      role: 'توسعه‌دهنده ارشد',
      avatar: '👨‍💻',
      description: 'طراحی و پیاده‌سازی معماری نرم‌افزار، توسعه بک‌اند و فرانت‌اند، یکپارچه‌سازی هوش مصنوعی'
    },
    {
      name: 'تیم JTrade',
      role: 'توسعه و پشتیبانی',
      avatar: '🤝',
      description: 'پشتیبانی فنی، بهبود مستمر، توسعه امکانات جدید و پاسخگویی به کاربران'
    }
  ];

  // ============================================
  // ✅ دسته‌بندی قابلیت‌ها
  // ============================================
  const categories = [
    {
      title: '🎁 دوره آزمایشی',
      items: ['۷ روز استفاده رایگان', 'دسترسی کامل به امکانات', 'بدون نیاز به کارت بانکی', 'بدون تعهد و محدودیت', 'پشتیبانی کامل']
    },
    {
      title: '📊 گزارشات و تحلیل',
      items: ['۱۲+ گزارش تخصصی', 'نمودارهای پیشرفته', 'شاخص‌های حرفه‌ای', 'تحلیل روانشناسی', 'مدیریت ریسک']
    },
    {
      title: '🧠 هوش مصنوعی',
      items: ['مشاوره هوشمند AI', 'تاریخچه مشاوره‌ها', 'تحلیل روانشناختی', 'تحلیل تکنیکال', 'سناریوهای معاملاتی']
    },
    {
      title: '📋 مدیریت ترید',
      items: ['۶ تب تخصصی', 'آپلود تصویر چارت', 'تحلیل ICT', 'دسته‌بندی سفارشی', 'قوانین انضباطی']
    },
    {
      title: '💰 مدیریت مالی',
      items: ['پورتفولیوهای متنوع', 'مقایسه عملکرد', 'سیستم اشتراک', 'پرداخت امن', 'تخفیف‌ها']
    }
  ];

  // ============================================
  // ✅ مسیر توسعه
  // ============================================
  const roadmap = [
    { status: 'done', title: '🎁 تست رایگان ۷ روزه', description: 'دسترسی کامل به تمام امکانات نرم‌افزار به مدت ۷ روز به‌صورت رایگان، بدون نیاز به کارت بانکی' },
    { status: 'done', title: 'گزارشات پیشرفته (۱۲+ گزارش)', description: 'گزارشات P&L، R:R، عملکرد هفتگی، چک‌لیست، خواب و تغذیه، نقشه احساسات، واکنش‌ها، اشتباهات، کیفیت اجرا، بایاس، تایم‌فریم، مدیریت ریسک' },
    { status: 'done', title: 'مشاوره هوشمند AI', description: 'تحلیل عملکرد کاربر و ارائه بازخورد اختصاصی به زبان طبیعی با مدل‌های پیشرفته' },
    { status: 'done', title: 'ژورنال کامل ترید با تصویر', description: 'ثبت ترید با ۶ تب تخصصی، آپلود تصویر چارت و نمایش جزئیات کامل' },
    { status: 'done', title: 'ابزارهای انضباطی (۱۰ شاخص)', description: 'محدودیت ترید روزانه، سقف ضرر، کول‌داون، چک‌لیست پیش‌از معامله، Tiltmeter و پایبندی به قوانین' },
    { status: 'done', title: 'سیستم پورتفولیو و دسته‌بندی', description: 'ایجاد و مدیریت چندین پورتفولیو، گروه‌بندی سفارشی تریدها' },
    { status: 'done', title: 'ایمپورت هوشمند CSV', description: '۴ مرحله آپلود، نگاشت، پیش‌نمایش و نتیجه با نرمال‌سازی داده‌ها' },
    { status: 'done', title: 'شاخص‌های حرفه‌ای (۵ شاخص)', description: 'Sharpe, Sortino, Calmar, Profit Factor, Max Drawdown, Kelly Criterion' },
    { status: 'done', title: 'پشتیبانی از تحلیل ICT', description: 'تب تخصصی ICT برای تحلیل‌های پیشرفته معاملاتی' },
    { status: 'done', title: 'سیستم پیام‌رسانی داخلی', description: 'ارسال و دریافت پیام بین کاربر و ادمین با اعلان‌های سیستم' },
    { status: 'done', title: 'سیستم پیامک (SMS)', description: 'ارسال پیامک خودکار برای رویدادهای مختلف (OTP، تمدید، اطلاع‌رسانی)' },
    { status: 'done', title: 'پرداخت کارت به کارت', description: 'سیستم کامل پرداخت کارت به کارت با تأیید ادمین' },
    { status: 'in-progress', title: 'گیمیفیکیشن (Gamification)', description: 'سیستم سطح‌بندی، کوئست‌های روزانه، نشان‌های افتخار و امتیازدهی' },
    { status: 'in-progress', title: 'شبیه‌سازی (Simulation)', description: 'شبیه‌سازی سناریوهای مختلف بر اساس تاریخچه معاملات کاربر' },
    { status: 'in-progress', title: 'مربی هوش مصنوعی (AI Coach)', description: 'تحلیل عمیق عملکرد کاربر و ارائه بازخورد منتور حرفه‌ای' },
    { status: 'planned', title: 'ایمپورت آنلاین از بروکرها', description: 'اتصال مستقیم به بروکرها و ایمپورت خودکار تریدها' },
    { status: 'planned', title: 'قابلیت اشتراک‌گذاری عملکرد', description: 'اشتراک‌گذاری گزارش عملکرد با منتور از طریق لینک یکتا' },
    { status: 'planned', title: 'کتابخانه الگوها (Pattern Library)', description: 'مطالعه سبک‌های معامله‌گری بزرگان و الگوهای معروف' }
  ];

  const getStatusBadge = (status) => {
    switch(status) {
      case 'done': return { label: '✅ انجام شده', class: 'status-done' };
      case 'in-progress': return { label: '🔄 در حال توسعه', class: 'status-progress' };
      case 'planned': return { label: '📋 برنامه‌ریزی شده', class: 'status-planned' };
      default: return { label: '📋 برنامه‌ریزی شده', class: 'status-planned' };
    }
  };

  return (
    <div className={`about-page ${isDark ? 'dark' : 'light'}`}>
      <div className="about-container">
        {/* ============================================
            هدر صفحه با لوگو
            ============================================ */}
        <div className="about-header">
          <div className="about-header-logo">
            <img
              src={process.env.PUBLIC_URL + '/logo.svg'}
              alt="JTrade Logo"
              className="about-logo-img"
            />
          </div>
          <h1>🚀 ژورنال حرفه‌ای ترید</h1>
          <p className="about-subtitle">
            پلتفرم جامع ثبت، تحلیل و بهبود عملکرد معاملاتی با بهره‌گیری از هوش مصنوعی
          </p>
          <div className="about-version-badge">
            <span>📌 نسخه {appVersion}</span>
            <span className="version-date">۱۴۰۵</span>
          </div>
        </div>

        {/* ============================================
            ✅ بنر تست رایگان ۷ روزه
            ============================================ */}
        <div className="trial-banner">
          <div className="trial-banner-content">
            <div className="trial-banner-icon">🎁</div>
            <div className="trial-banner-text">
              <h3>۷ روز استفاده رایگان از تمام امکانات</h3>
              <p>
                بدون نیاز به کارت بانکی، بدون تعهد. همین حالا شروع کنید و تمام
                قابلیت‌های حرفه‌ای نرم‌افزار را تست کنید.
              </p>
            </div>
          </div>
          <Link to="/register" className="trial-banner-cta">
            شروع تست رایگان ←
          </Link>
        </div>

        {/* ============================================
            بخش معرفی
            ============================================ */}
        <div className="about-intro">
          <div className="intro-content">
            <h2>📖 داستان ما</h2>
            <p>
              ژورنال حرفه‌ای ترید، با هدف توانمندسازی معامله‌گران در مسیر
              موفقیت و رشد مستمر طراحی و توسعه یافته است. ما معتقدیم که ثبت و تحلیل
              دقیق معاملات، کلید اصلی دستیابی به عملکرد پایدار در بازارهای مالی است.
            </p>
            <p>
              این پلتفرم با بهره‌گیری از جدیدترین فناوری‌های روز، از جمله هوش مصنوعی
              و تحلیل‌های پیشرفته، ابزاری جامع برای معامله‌گران حرفه‌ای فراهم کرده است
              تا بتوانند نقاط قوت و ضعف خود را شناسایی کرده و مسیر رشد خود را هموار سازند.
            </p>
            <div className="intro-tags">
              <span className="tag">🎁 ۷ روز رایگان</span>
              <span className="tag">📊 ۱۲+ گزارش</span>
              <span className="tag">🧠 AI مشاور</span>
              <span className="tag">🛡️ ۱۰ ابزار انضباطی</span>
              <span className="tag">💰 پورتفولیو</span>
              <span className="tag">📋 ۶ تب ترید</span>
            </div>
          </div>
          <div className="intro-stats-mini">
            <div className="mini-stat">
              <span className="mini-stat-number">{appVersion}</span>
              <span className="mini-stat-label">نسخه پایدار</span>
            </div>
            <div className="mini-stat">
              <span className="mini-stat-number">۱۲+</span>
              <span className="mini-stat-label">گزارش تخصصی</span>
            </div>
            <div className="mini-stat">
              <span className="mini-stat-number">۵</span>
              <span className="mini-stat-label">شاخص حرفه‌ای</span>
            </div>
            <div className="mini-stat">
              <span className="mini-stat-number">۷</span>
              <span className="mini-stat-label">روز تست رایگان</span>
            </div>
          </div>
        </div>

        {/* ============================================
            دسته‌بندی قابلیت‌ها
            ============================================ */}
        <div className="about-categories">
          <h2>📂 دسته‌بندی قابلیت‌ها</h2>
          <p className="categories-subtitle">
            همه امکانات نرم‌افزار در ۵ دسته اصلی
          </p>
          <div className="categories-grid">
            {categories.map((category, index) => (
              <div key={index} className="category-card">
                <h3>{category.title}</h3>
                <ul>
                  {category.items.map((item, i) => (
                    <li key={i}>✅ {item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* ============================================
            ویژگی‌های کلیدی (کارت‌های کامل)
            ============================================ */}
        <div className="about-features">
          <h2>✨ ویژگی‌های کلیدی</h2>
          <p className="features-subtitle">
            مجموعه‌ای کامل از ابزارهای حرفه‌ای برای معامله‌گران
          </p>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card" style={{ borderTopColor: feature.color }}>
                <div className="feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <span className="feature-badge" style={{ background: feature.color }}>
                  {feature.badge}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ============================================
            آمار و دستاوردها
            ============================================ */}
        <div className="about-stats">
          <div className="stats-grid">
            {stats.map((stat, index) => (
              <div key={index} className="stat-item">
                <span className="stat-icon">{stat.icon}</span>
                <span className="stat-value">{stat.value}</span>
                <span className="stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ============================================
            مسیر توسعه (Roadmap)
            ============================================ */}
        <div className="about-roadmap">
          <h2>🗺️ مسیر توسعه</h2>
          <p className="roadmap-subtitle">
            امکاناتی که در حال حاضر فعال هستند و برنامه‌های آینده
          </p>
          <div className="roadmap-grid">
            {roadmap.map((item, index) => {
              const status = getStatusBadge(item.status);
              return (
                <div key={index} className={`roadmap-item ${item.status}`}>
                  <div className="roadmap-status">
                    <span className={`status-badge ${status.class}`}>{status.label}</span>
                  </div>
                  <h4>{item.title}</h4>
                  <p>{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ============================================
            تیم توسعه
            ============================================ */}
        <div className="about-team">
          <h2>👨‍💻 تیم توسعه</h2>
          <p className="team-description">
            این پروژه توسط تیمی از متخصصین حوزه فناوری اطلاعات و بازارهای مالی
            با هدف ارائه بهترین ابزار ممکن به معامله‌گران عزیز طراحی و پیاده‌سازی شده است.
          </p>
          <div className="team-grid">
            {team.map((member, index) => (
              <div key={index} className="team-member">
                <div className="member-avatar">{member.avatar}</div>
                <div className="member-info">
                  <h4>{member.name}</h4>
                  <span className="member-role">{member.role}</span>
                  <p className="member-desc">{member.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ============================================
            دعوت به اقدام (CTA)
            ============================================ */}
        <div className="about-cta">
          <div className="cta-content">
            <span className="cta-icon">🚀</span>
            <h3>آماده‌اید معاملات خود را متحول کنید؟</h3>
            <p>همین حالا ۷ روز تست رایگان را شروع کنید و از تمام امکانات حرفه‌ای ژورنال ترید استفاده کنید</p>
            <div className="cta-buttons">
              <Link to="/register" className="cta-btn primary">
                🎁 شروع تست رایگان ۷ روزه
              </Link>
              <Link to="/login" className="cta-btn secondary">ورود به حساب</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;