// frontend/src/components/Profile.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import RealApiService from '../services/realApiService';
import RulesManager from './rules/RulesManager';
import './Profile.css';
import LoadingBar from './common/LoadingBar';

// ============================================
// ✅ کامپوننت راهنمای جمع‌شونده قوانین معاملاتی
// ============================================
const RulesGuide = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rules-guide-wrapper">
      <button
        className="rules-guide-toggle"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <span className="guide-icon">📖</span>
        <span className="guide-title">راهنمای قوانین معاملاتی</span>
        <span className="guide-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && (
        <div className="rules-guide-content">
          <div className="guide-section">
            <h4>🎯 هدف قوانین معاملاتی</h4>
            <p>
              قوانین معاملاتی به شما کمک می‌کنند تا یک چارچوب مشخص برای ورود، خروج و مدیریت ریسک داشته باشید.
              با ثبت و پایبندی به این قوانین، می‌توانید عملکرد خود را بهبود بخشیده و از تصمیمات احساسی جلوگیری کنید.
            </p>
          </div>

          <div className="guide-section">
            <h4>📋 انواع قوانین</h4>
            <ul>
              <li><strong>قوانین ورود:</strong> معیارهایی که قبل از ورود به معامله باید بررسی شوند (مانند تأیید SMT، بررسی سطوح کلیدی).</li>
              <li><strong>قوانین خروج:</strong> معیارهایی که برای بستن معامله در نظر گرفته می‌شوند (مانند حد سود، حد ضرر).</li>
              <li><strong>مدیریت ریسک:</strong> قوانین مربوط به حجم معامله، درصد ریسک و سقف ضرر.</li>
              <li><strong>روانشناختی:</strong> قوانین مربوط به کنترل احساسات و رفتار معاملاتی.</li>
              <li><strong>قوانین زمانی:</strong> محدودیت‌های زمانی مانند حداکثر ترید در روز.</li>
              <li><strong>متفرقه:</strong> سایر قوانین شخصی.</li>
            </ul>
          </div>

          <div className="guide-section">
            <h4>✅ نحوه استفاده</h4>
            <ol>
              <li>قوانین خود را در این بخش ثبت کنید.</li>
              <li>قوانین <strong>اجباری</strong> در هنگام ثبت ترید باید تأیید شوند.</li>
              <li>در صفحه ثبت ترید، می‌توانید قوانین رعایت‌شده را علامت بزنید.</li>
              <li>گزارش پایبندی به قوانین در بخش گزارشات قابل مشاهده است.</li>
            </ol>
          </div>

          <div className="guide-section">
            <h4>💡 نکته مهم</h4>
            <p className="guide-tip">
              هرچه تعداد قوانین شما بیشتر باشد، پایبندی به همه‌ی آنها دشوارتر است.
              بهتر است با ۳-۵ قانون کلیدی شروع کنید و به‌مرور زمان قوانین جدید اضافه کنید.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

const Profile = () => {
  const { user, updateUser, logout } = useAuth();
  const { isDark } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: ''
  });
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showVersions, setShowVersions] = useState(false);
  const [showAllVersions, setShowAllVersions] = useState(false);
  const [trades, setTrades] = useState([]);
  const [appVersions, setAppVersions] = useState([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState('info');
  const [subscription, setSubscription] = useState({
    plan: 'آزمایشی',
    remainingDays: 7,
    remainingTrades: 50,
    remainingAiConsultations: 5,
    aiConsultationsUsed: 0,
    aiConsultationsLimit: 5,
    totalTrades: 0,
    startDate: '',
    endDate: '',
    isActive: true,
    isExpired: false,
    isTrial: false,
  });

  // ============================================
  // بارگذاری داده‌ها از سرور
  // ============================================
  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone_number || ''
      });
    }

    const fetchTrades = async () => {
      try {
        const response = await RealApiService.getTrades();
        const tradesData = response.data.results || response.data || [];
        setTrades(tradesData);
        setSubscription(prev => ({
          ...prev,
          totalTrades: tradesData.length
        }));
      } catch (error) {
        console.error('Error fetching trades from server:', error);
      }
    };

    const fetchSubscription = async () => {
      try {
        const response = await RealApiService.getSubscriptionStatus();
        const data = response.data;
        console.log('📊 Subscription from server:', data);

        const isAdmin = user?.is_admin || data.plan_type === 'admin';

        if (isAdmin) {
          setSubscription({
            plan: 'ادمین (نامحدود)',
            remainingDays: '♾️',
            remainingTrades: '♾️',
            remainingAiConsultations: '♾️',
            aiConsultationsUsed: 0,
            aiConsultationsLimit: '♾️',
            startDate: '—',
            endDate: '♾️ بدون محدودیت',
            isActive: true,
            isExpired: false,
            totalTrades: trades.length,
            isTrial: false,
          });
          return;
        }

        if (data && data.has_subscription) {
          const endDate = new Date(data.end_date);
          const now = new Date();
          const remainingDays = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

          setSubscription({
            plan: data.plan_name || 'حرفه‌ای',
            remainingDays: remainingDays > 0 ? remainingDays : 0,
            remainingTrades: data.remaining_trades ?? 0,
            remainingAiConsultations: data.remaining_ai_consultations ?? 0,
            aiConsultationsUsed: data.ai_consultations_used ?? 0,
            aiConsultationsLimit: data.ai_consultations_limit ?? 0,
            startDate: data.start_date ? new Date(data.start_date).toLocaleDateString('fa-IR') : '-',
            endDate: data.end_date ? new Date(data.end_date).toLocaleDateString('fa-IR') : '-',
            isActive: data.is_active,
            isExpired: data.is_expired || remainingDays <= 0,
            totalTrades: trades.length,
            isTrial: data.is_trial || false,
          });
        } else {
          console.log('ℹ️ کاربر اشتراک فعال ندارد');
          setSubscription(prev => ({
            ...prev,
            plan: 'بدون اشتراک',
            remainingDays: 0,
            remainingTrades: 0,
            remainingAiConsultations: 0,
            aiConsultationsUsed: 0,
            aiConsultationsLimit: 0,
            isActive: false,
            isExpired: true,
            isTrial: false,
          }));
        }
      } catch (error) {
        console.error('Error fetching subscription from server:', error);
      }
    };

    fetchTrades();
    fetchSubscription();
    fetchAppVersions();
  }, [user]);

  // ============================================
  // دریافت نسخه‌ها از سرور
  // ============================================
  const fetchAppVersions = async () => {
    setVersionsLoading(true);
    try {
      const response = await RealApiService.getAppVersions();
      let versions = [];

      // بررسی ساختار پاسخ
      if (response.data && response.data.results && Array.isArray(response.data.results)) {
        versions = response.data.results;
      } else if (response.data && Array.isArray(response.data)) {
        versions = response.data;
      } else {
        versions = getFallbackVersions();
      }

      // مرتب‌سازی نزولی بر اساس تاریخ (جدیدترین اول)
      const sortedVersions = versions.sort((a, b) =>
        new Date(b.release_date) - new Date(a.release_date)
      );

      console.log(`📱 ${sortedVersions.length} نسخه دریافت شد`);
      setAppVersions(sortedVersions);
    } catch (error) {
      console.error('❌ Error fetching app versions:', error);
      setAppVersions(getFallbackVersions());
    } finally {
      setVersionsLoading(false);
    }
  };

  // ============================================
  // ✅ Fallback برای زمانی که سرور پاسخ نمی‌دهد
  // ============================================
  const getFallbackVersions = () => {
    // این تابع فقط زمانی استفاده می‌شود که سرور در دسترس نباشد
    // در حالت عادی، داده‌ها از سرور دریافت می‌شوند
    return [
      { version_number: '1.11.2', release_date: '2026-08-27T00:00:00Z', release_notes: '🐛 رفع برخی خطاها و مشکلات جزیی', is_current: true },
      { version_number: '1.11.1', release_date: '2026-08-27T00:00:00Z', release_notes: '📈 بهبود خروجی مشاوره هوش مصنوعی', is_current: false },
      { version_number: '1.11.0', release_date: '2026-08-27T00:00:00Z', release_notes: '🧠 استفاده از مدل‌های جدید هوش مصنوعی', is_current: false },
      { version_number: '1.10.4', release_date: '2026-08-27T00:00:00Z', release_notes: '🌐 اتصال به Gapgpt.app و رفع خطاهای AI', is_current: false },
      { version_number: '1.10.3', release_date: '2026-08-27T00:00:00Z', release_notes: '🎯 بهبود نمایش سناریو به صورت سطرهای جداگانه', is_current: false },
      { version_number: '1.10.2', release_date: '2026-08-27T00:00:00Z', release_notes: '📊 جداسازی تحلیل‌ها با باکس‌های مجزا و رنگ‌آمیزی', is_current: false },
      { version_number: '1.10.1', release_date: '2026-08-27T00:00:00Z', release_notes: '🔄 دکمه رفرش و غیرفعال‌سازی در حالت بارگذاری', is_current: false },
      { version_number: '1.10.0', release_date: '2026-08-27T00:00:00Z', release_notes: '🧠 کش هوشمند مدل‌های AI و کوتاه‌سازی نام‌ها', is_current: false },
      { version_number: '1.9.7', release_date: '2026-08-23T00:00:00Z', release_notes: '🧠 تکمیل دریافت پویا لیست مدل‌های Ollama', is_current: false },
      { version_number: '1.9.6', release_date: '2026-08-22T00:00:00Z', release_notes: '🗑️ اصلاح حذف گروه و نمایش نام پورتفولیو', is_current: false },
      { version_number: '1.9.5', release_date: '2026-08-22T00:00:00Z', release_notes: '📱 بهبود نمایش موبایل آمار سریع پروفایل', is_current: false },
      { version_number: '1.9.4', release_date: '2026-08-22T00:00:00Z', release_notes: '🧠 دریافت پویا لیست مدل‌های Ollama از سرور', is_current: false },
      { version_number: '1.9.3', release_date: '2026-08-22T00:00:00Z', release_notes: '🔘 اصلاح چیدمان کلیدهای هدر و عملیات', is_current: false },
      { version_number: '1.9.2', release_date: '2026-08-22T00:00:00Z', release_notes: '📐 تمام‌صفحه شدن صفحات پروفایل و گزارشات', is_current: false },
      { version_number: '1.9.1', release_date: '2026-08-22T00:00:00Z', release_notes: '🎨 اصلاح استایل دکمه‌های نمایش بیشتر/کمتر', is_current: false },
      { version_number: '1.9.0', release_date: '2026-08-22T00:00:00Z', release_notes: '✏️ بهبود فرم ثبت و ویرایش ترید', is_current: false },
    ];
  };


  // ============================================
  // تمدید اشتراک
  // ============================================
  const handleRenewSubscription = () => {
    navigate('/subscription/renew');
  };

  // ============================================
  // خروج از سیستم
  // ============================================
  const handleLogout = () => {
    if (window.confirm('آیا از خروج از سیستم اطمینان دارید؟')) {
      logout();
      navigate('/login');
    }
  };

  // ============================================
  // تغییرات فرم
  // ============================================
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ============================================
  // ذخیره تغییرات پروفایل
  // ============================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      await RealApiService.updateProfile({
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email
      });

      const updatedUser = {
        ...user,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email
      };

      if (updateUser) {
        updateUser(updatedUser);
      }

      setMessage({ type: 'success', text: '✅ اطلاعات با موفقیت به‌روزرسانی شد' });
      setEditMode(false);
      showToast('✅ اطلاعات با موفقیت به‌روزرسانی شد', 'success');
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: '❌ خطا در به‌روزرسانی اطلاعات' });
      showToast('❌ خطا در به‌روزرسانی اطلاعات', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // رندر تب‌های پروفایل
  // ============================================
  const renderProfileTabs = () => (
    <div className="profile-tabs">
      <button
        className={`profile-tab-btn ${activeProfileTab === 'info' ? 'active' : ''}`}
        onClick={() => setActiveProfileTab('info')}
      >
        👤 اطلاعات شخصی
      </button>
      <button
        className={`profile-tab-btn ${activeProfileTab === 'rules' ? 'active' : ''}`}
        onClick={() => setActiveProfileTab('rules')}
      >
        📋 قوانین معاملاتی
      </button>
    </div>
  );

  // ============================================
  // محاسبه آمار
  // ============================================
  const totalTrades = trades.length;
  const winningTrades = trades.filter(t => parseFloat(t.profit) > 0).length;
  const losingTrades = trades.filter(t => parseFloat(t.profit) < 0).length;
  const totalProfit = trades.reduce((sum, t) => sum + (parseFloat(t.profit) || 0), 0);
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades * 100).toFixed(1) : 0;
  const avgProfit = totalTrades > 0 ? (totalProfit / totalTrades).toFixed(2) : 0;
  const bestTrade = trades.length > 0 ? Math.max(...trades.map(t => parseFloat(t.profit) || 0)) : 0;
  const worstTrade = trades.length > 0 ? Math.min(...trades.map(t => parseFloat(t.profit) || 0)) : 0;
  const todayTrades = trades.filter(t => t.trade_date === new Date().toISOString().split('T')[0]).length;
  const thisWeekTrades = trades.filter(t => {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(t.trade_date) >= weekAgo;
  }).length;

  const formatLimit = (value) => {
    if (value === '♾️' || value === Infinity || value === 999999) return '♾️';
    return value;
  };

  // ============================================
  // رندر لیست نسخه‌ها (با قابلیت نمایش بیشتر)
  // ============================================
  const renderVersions = () => {
    const displayLimit = 15;
    const hasMoreVersions = appVersions.length > displayLimit;
    const displayedVersions = showAllVersions ? appVersions : appVersions.slice(0, displayLimit);

    return (
      <div className="versions-list">
        {versionsLoading ? (
          <LoadingBar text="در حال بارگذاری..." />
        ) : appVersions.length > 0 ? (
          <>
            <div className="versions-header-info">
              <span className="versions-count">
                نمایش {displayedVersions.length} از {appVersions.length} نسخه
              </span>
              {hasMoreVersions && (
                <button
                  className="versions-toggle-btn"
                  onClick={() => setShowAllVersions(!showAllVersions)}
                  type="button"
                >
                  {showAllVersions ? '🔽 نمایش کمتر' : `🔼 نمایش ${appVersions.length - displayLimit} نسخه بیشتر`}
                </button>
              )}
            </div>
            <div className="versions-table-wrapper">
              <table className="versions-table">
                <thead>
                  <tr>
                    <th>نسخه</th>
                    <th>تاریخ انتشار</th>
                    <th>تغییرات</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedVersions.map((item, index) => (
                    <tr key={index} className={item.is_current ? 'current-version' : ''}>
                      <td><strong>v{item.version_number}</strong></td>
                      <td>
                        {/* ✅ استفاده از release_date_persian اگر وجود دارد */}
                        {item.release_date_persian ||
                          (item.release_date ? new Date(item.release_date).toLocaleDateString('fa-IR') : '-')}
                      </td>
                      <td>{item.release_notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="empty-state">هیچ نسخه‌ای یافت نشد</div>
        )}
      </div>
    );
  };


  // ============================================
  // رندر اصلی
  // ============================================
  return (
    <div className={`profile-container ${isDark ? 'dark' : 'light'}`}>
      <div className="profile-header">
        <h2>👤 پنل کاربری</h2>
        <button className="btn-back" onClick={() => navigate('/dashboard')}>
          ↩️ بازگشت
        </button>
      </div>

      {renderProfileTabs()}

      <div className="profile-content">
        {/* تب اطلاعات شخصی */}
        {activeProfileTab === 'info' && (
          <>
            {/* اطلاعات شخصی */}
            <div className="profile-card">
              <div className="card-header">
                <h3>📋 اطلاعات شخصی</h3>
                <div className="card-actions">
                  <button
                    className="btn-edit"
                    onClick={() => setEditMode(!editMode)}
                  >
                    {editMode ? '❌ لغو' : '✏️ ویرایش'}
                  </button>
                </div>
              </div>

              {message.text && (
                <div className={`message ${message.type}`}>
                  {message.text}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label>شماره تلفن</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      disabled
                      className="disabled-input"
                    />
                    <span className="field-hint">شماره تلفن قابل تغییر نیست</span>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>نام</label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      disabled={!editMode || loading}
                      className={!editMode ? 'disabled-input' : ''}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>نام خانوادگی</label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      disabled={!editMode || loading}
                      className={!editMode ? 'disabled-input' : ''}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>ایمیل</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={!editMode || loading}
                    className={!editMode ? 'disabled-input' : ''}
                    placeholder="example@email.com"
                  />
                </div>

                {editMode && (
                  <button type="submit" className="btn-save" disabled={loading}>
                    {loading ? 'در حال ذخیره...' : '💾 ذخیره تغییرات'}
                  </button>
                )}
              </form>
            </div>

            {/* آمار سریع */}
            <div className="profile-card">
              <div className="card-header">
                <h3>📊 آمار سریع</h3>
              </div>

              <div className="quick-stats">
                <div className="stat-item"><span className="stat-icon">📈</span><div><span className="stat-label">کل تریدها</span><span className="stat-value">{totalTrades}</span></div></div>
                <div className="stat-item"><span className="stat-icon">✅</span><div><span className="stat-label">تریدهای برنده</span><span className="stat-value success">{winningTrades}</span></div></div>
                <div className="stat-item"><span className="stat-icon">❌</span><div><span className="stat-label">تریدهای بازنده</span><span className="stat-value danger">{losingTrades}</span></div></div>
                <div className="stat-item"><span className="stat-icon">📊</span><div><span className="stat-label">نرخ برد</span><span className="stat-value">{winRate}%</span></div></div>
                <div className="stat-item"><span className="stat-icon">💰</span><div><span className="stat-label">سود کل</span><span className={`stat-value ${totalProfit >= 0 ? 'success' : 'danger'}`}>${totalProfit}</span></div></div>
                <div className="stat-item"><span className="stat-icon">📏</span><div><span className="stat-label">میانگین سود</span><span className="stat-value">${avgProfit}</span></div></div>
                <div className="stat-item"><span className="stat-icon">🏆</span><div><span className="stat-label">بهترین ترید</span><span className="stat-value success">+${bestTrade}</span></div></div>
                <div className="stat-item"><span className="stat-icon">📉</span><div><span className="stat-label">بدترین ترید</span><span className="stat-value danger">${worstTrade}</span></div></div>
                <div className="stat-item"><span className="stat-icon">📅</span><div><span className="stat-label">تریدهای امروز</span><span className="stat-value">{todayTrades}</span></div></div>
                <div className="stat-item"><span className="stat-icon">📆</span><div><span className="stat-label">تریدهای این هفته</span><span className="stat-value">{thisWeekTrades}</span></div></div>
                <div className="stat-item"><span className="stat-icon">🧠</span><div><span className="stat-label">مشاوره‌های استفاده شده</span><span className="stat-value">{subscription.aiConsultationsUsed || 0}</span></div></div>
              </div>
            </div>

            {/* اطلاعات اشتراک */}
            <div className="profile-card">
              <div className="card-header">
                <h3>📊 اطلاعات اشتراک</h3>
                {subscription.isTrial && (
                  <span className="expiry-badge trial-badge" style={{ background: '#6a1b9a', color: 'white', padding: '4px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
                    🔬 آزمایشی
                  </span>
                )}
                {user?.is_admin && (
                  <span className="expiry-badge admin-badge" style={{ background: '#1a237e', color: 'white', padding: '4px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
                    👑 مدیر
                  </span>
                )}
                {!user?.is_admin && !subscription.isTrial && subscription.isExpired && (
                  <span className="expiry-badge">⏰ منقضی شده</span>
                )}
                {!user?.is_admin && !subscription.isTrial && !subscription.isExpired && subscription.remainingDays <= 3 && subscription.remainingDays !== '♾️' && (
                  <span className="expiry-badge warning">⚠️ در حال اتمام</span>
                )}
              </div>

              <div className="subscription-info">
                <div className="sub-item">
                  <span className="sub-label">نوع پلن</span>
                  <span className={`sub-value ${user?.is_admin ? 'admin' : subscription.isTrial ? 'trial' : subscription.plan === 'حرفه‌ای' ? 'premium' : subscription.plan === 'بدون اشتراک' ? 'danger' : ''}`}>
                    {user?.is_admin ? '👑 ادمین (نامحدود)' : subscription.isTrial ? '🔬 آزمایشی' : subscription.plan}
                  </span>
                </div>
                <div className="sub-item">
                  <span className="sub-label">روزهای باقیمانده</span>
                  <span className={`sub-value ${user?.is_admin ? 'admin' : subscription.remainingDays === '♾️' ? 'admin' : subscription.remainingDays < 3 && subscription.remainingDays !== '♾️' ? 'danger' : ''}`}>
                    {user?.is_admin ? '♾️ نامحدود' : subscription.remainingDays === '♾️' ? '♾️' : `${subscription.remainingDays} روز`}
                  </span>
                </div>
                <div className="sub-item">
                  <span className="sub-label">📈 تریدهای باقیمانده</span>
                  <span className={`sub-value ${subscription.remainingTrades <= 0 && !user?.is_admin && !subscription.isTrial ? 'danger' : ''}`}>
                    {user?.is_admin ? '♾️ نامحدود' : subscription.remainingTrades === '♾️' ? '♾️' : `${subscription.remainingTrades} عدد`}
                  </span>
                </div>
                <div className="sub-item">
                  <span className="sub-label">🧠 مشاوره‌های باقیمانده</span>
                  <span className={`sub-value ${subscription.remainingAiConsultations <= 0 && !user?.is_admin && !subscription.isTrial ? 'danger' : ''}`}>
                    {user?.is_admin ? '♾️ نامحدود' : subscription.remainingAiConsultations === '♾️' ? '♾️' : `${subscription.remainingAiConsultations} عدد`}
                  </span>
                </div>
                <div className="sub-item">
                  <span className="sub-label">تاریخ شروع</span>
                  <span className="sub-value">{user?.is_admin ? '—' : subscription.startDate || '-'}</span>
                </div>
                <div className="sub-item">
                  <span className="sub-label">تاریخ پایان</span>
                  <span className={`sub-value ${user?.is_admin ? 'admin' : subscription.isExpired ? 'danger' : ''}`}>
                    {user?.is_admin ? '♾️ بدون محدودیت' : subscription.endDate || '-'}
                  </span>
                </div>
              </div>

              <button
                className="btn-renew"
                onClick={handleRenewSubscription}
                disabled={loading}
              >
                {loading ? '⏳ در حال تمدید...' : '🔄 تمدید اشتراک'}
              </button>

              {!user?.is_admin && subscription.isExpired && (
                <button
                  className="btn-logout"
                  onClick={handleLogout}
                  style={{
                    marginTop: '10px',
                    width: '100%',
                    padding: '12px',
                    background: '#c62828',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    fontFamily: 'inherit'
                  }}
                  onMouseEnter={(e) => { e.target.style.background = '#b71c1c'; e.target.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { e.target.style.background = '#c62828'; e.target.style.transform = 'translateY(0)'; }}
                >
                  🚪 خروج از سیستم
                </button>
              )}
            </div>

            {/* نسخه نرم‌افزار و تغییرات - نمایش همه نسخه‌ها */}
            <div className="profile-card">
              <div className="card-header">
                <h3>📱 درباره نرم‌افزار</h3>
              </div>

              <div className="version-info">
                <div className="version-item">
                  <span className="version-label">نسخه فعلی</span>
                  <span className="version-value">
                    {appVersions.find(v => v.is_current)?.version_number || '1.11.2'}
                  </span>
                </div>
                <div className="version-item">
                  <span className="version-label">تاریخ انتشار</span>
                  <span className="version-value">
                    {appVersions.find(v => v.is_current)?.release_date
                      ? new Date(appVersions.find(v => v.is_current).release_date).toLocaleDateString('fa-IR')
                      : '۱۴۰۳/۱۰/۰۱'}
                  </span>
                </div>
                <div className="version-item">
                  <span className="version-label">تعداد نسخه‌ها</span>
                  <span className="version-value">{appVersions.length}</span>
                </div>
              </div>

              <button className="btn-versions" onClick={() => setShowVersions(!showVersions)}>
                {showVersions ? '🔽 بستن تاریخچه تغییرات' : '📜 مشاهده تاریخچه تغییرات'}
              </button>

              {showVersions && renderVersions()}
            </div>

            {/* تماس با ما */}
            <div className="profile-card">
              <div className="card-header">
                <h3>📞 تماس با ما</h3>
              </div>
              <div className="contact-info">
                <p>در صورت داشتن هرگونه سؤال، مشکل یا پیشنهاد، می‌توانید از طریق فرم زیر با ما در ارتباط باشید.</p>
                <p className="contact-note">📌 همکاران ما پس از دریافت پیام شما، در اسرع وقت بررسی کرده و در صورت نیاز با شما تماس خواهند گرفت.</p>
                <div className="contact-buttons">
                  <button className="btn-contact" onClick={() => navigate('/messages/new')}>✉️ ارسال پیام جدید</button>
                  <button className="btn-messages" onClick={() => navigate('/messages')}>📬 مشاهده پیام‌ها</button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* تب قوانین معاملاتی */}
        {activeProfileTab === 'rules' && (
          <>
            <RulesGuide />
            <RulesManager />
          </>
        )}
      </div>
    </div>
  );
};

export default Profile;