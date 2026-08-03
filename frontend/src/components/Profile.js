// frontend/src/components/Profile.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import RealApiService from '../services/realApiService';
import './Profile.css';

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
  const [trades, setTrades] = useState([]);
  const [appVersions, setAppVersions] = useState([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
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

    // ✅ دریافت تریدها از سرور
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

    // ✅ دریافت اشتراک از سرور
    const fetchSubscription = async () => {
      try {
        const response = await RealApiService.getSubscriptionStatus();
        const data = response.data;
        console.log('📊 Subscription from server:', data);

        // بررسی اینکه آیا کاربر ادمین است
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
          // کاربر اشتراک ندارد
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
        // در صورت خطا، وضعیت پیش‌فرض را نگه می‌داریم
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
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        setAppVersions(response.data);
      } else {
        setAppVersions(getFallbackVersions());
      }
    } catch (error) {
      console.error('❌ Error fetching app versions:', error);
      setAppVersions(getFallbackVersions());
    } finally {
      setVersionsLoading(false);
    }
  };

  const getFallbackVersions = () => {
    return [
      { version_number: '1.4.1', release_date: '2024-10-01T00:00:00Z', release_notes: 'آخرین به‌روزرسانی و بهبودهای نهایی', is_current: true },
      { version_number: '1.4.0', release_date: '2024-09-15T00:00:00Z', release_notes: 'به‌روزرسانی کامل پنل ادمین', is_current: false },
      { version_number: '1.3.2', release_date: '2024-09-01T00:00:00Z', release_notes: 'افزودن قابلیت پاسخگویی به پیام‌های کاربران', is_current: false },
      { version_number: '1.3.1', release_date: '2024-08-15T00:00:00Z', release_notes: 'بهبود سرعت بارگذاری و تجربه کاربری', is_current: false },
      { version_number: '1.3.0', release_date: '2024-08-01T00:00:00Z', release_notes: 'افزودن سیستم تخفیف و کدهای تخفیف', is_current: false },
      { version_number: '1.2.2', release_date: '2024-07-15T00:00:00Z', release_notes: 'بهبود گزارشات مالی و نمودارها', is_current: false },
      { version_number: '1.2.1', release_date: '2024-07-01T00:00:00Z', release_notes: 'رفع مشکلات امنیتی و بهبود احراز هویت', is_current: false },
      { version_number: '1.2.0', release_date: '2024-06-15T00:00:00Z', release_notes: 'افزودن سیستم پیام‌رسانی کاربران', is_current: false },
      { version_number: '1.1.2', release_date: '2024-06-01T00:00:00Z', release_notes: 'افزودن قابلیت چاپ و خروجی PDF', is_current: false },
      { version_number: '1.1.1', release_date: '2024-05-15T00:00:00Z', release_notes: 'بهبود عملکرد و بهینه‌سازی دیتابیس', is_current: false },
      { version_number: '1.1.0', release_date: '2024-05-01T00:00:00Z', release_notes: 'افزودن گزارشات پیشرفته و نمودارها', is_current: false },
      { version_number: '1.0.3', release_date: '2024-04-15T00:00:00Z', release_notes: 'بهبود رابط کاربری و افزودن تم شب', is_current: false },
      { version_number: '1.0.2', release_date: '2024-04-01T00:00:00Z', release_notes: 'افزودن قابلیت دسته‌بندی تریدها', is_current: false },
      { version_number: '1.0.1', release_date: '2024-03-20T00:00:00Z', release_notes: 'رفع باگ‌های اولیه و بهبود سرعت', is_current: false },
      { version_number: '1.0.0', release_date: '2024-03-15T00:00:00Z', release_notes: 'نسخه اولیه نرم‌افزار ژورنال ترید', is_current: false },
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

  // ============================================
  // تابع کمکی برای نمایش مقدار ∞ یا عدد
  // ============================================
  const formatLimit = (value) => {
    if (value === '♾️' || value === Infinity || value === 999999) return '♾️';
    return value;
  };

  return (
    <div className={`profile-container ${isDark ? 'dark' : 'light'}`}>
      <div className="profile-header">
        <h2>👤 پروفایل کاربری</h2>
        <button className="btn-back" onClick={() => navigate('/dashboard')}>
          ↩️ بازگشت به داشبورد
        </button>
      </div>

      <div className="profile-content">
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
            {/* ✅ مشاوره‌های کل */}
            <div className="stat-item"><span className="stat-icon">🧠</span><div><span className="stat-label">مشاوره‌های استفاده شده</span><span className="stat-value">{subscription.aiConsultationsUsed || 0}</span></div></div>
          </div>
        </div>

        {/* اطلاعات اشتراک - ✅ با مشاوره‌ها */}
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
            {/* ✅ مشاوره‌های باقیمانده */}
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

        {/* نسخه نرم‌افزار و تغییرات */}
        <div className="profile-card">
          <div className="card-header">
            <h3>📱 درباره نرم‌افزار</h3>
          </div>

          <div className="version-info">
            <div className="version-item">
              <span className="version-label">نسخه فعلی</span>
              <span className="version-value">
                {appVersions.find(v => v.is_current)?.version_number || '1.4.1'}
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
          </div>

          <button className="btn-versions" onClick={() => setShowVersions(!showVersions)}>
            {showVersions ? '🔽 بستن تاریخچه تغییرات' : '📜 مشاهده تاریخچه تغییرات'}
          </button>

          {showVersions && (
            <div className="versions-list">
              {versionsLoading ? (
                <div className="loading-spinner">⏳ در حال بارگذاری...</div>
              ) : appVersions.length > 0 ? (
                <table className="versions-table">
                  <thead><tr><th>نسخه</th><th>تاریخ</th><th>تغییرات</th></tr></thead>
                  <tbody>
                    {appVersions.map((item, index) => (
                      <tr key={index} className={item.is_current ? 'current-version' : ''}>
                        <td><strong>v{item.version_number}</strong></td>
                        <td>{item.release_date_persian || new Date(item.release_date).toLocaleDateString('fa-IR')}</td>
                        <td>{item.release_notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-state">هیچ نسخه‌ای یافت نشد</div>
              )}
            </div>
          )}
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
      </div>
    </div>
  );
};

export default Profile;