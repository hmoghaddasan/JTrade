// frontend/src/components/Profile.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import './Profile.css';

// لیست نسخه‌های نرم‌افزار (نمونه)
const APP_VERSIONS = [
  { version: '1.4.1', date: '۱۴۰۳/۱۰/۰۱', notes: 'آخرین به‌روزرسانی و بهبودهای نهایی' },
  { version: '1.4.0', date: '۱۴۰۳/۰۹/۱۵', notes: 'به‌روزرسانی کامل پنل ادمین' },
  { version: '1.3.2', date: '۱۴۰۳/۰۹/۰۱', notes: 'افزودن قابلیت پاسخگویی به پیام‌های کاربران' },
  { version: '1.3.1', date: '۱۴۰۳/۰۸/۱۵', notes: 'بهبود سرعت بارگذاری و تجربه کاربری' },
  { version: '1.3.0', date: '۱۴۰۳/۰۸/۰۱', notes: 'افزودن سیستم تخفیف و کدهای تخفیف' },
  { version: '1.2.2', date: '۱۴۰۳/۰۷/۱۵', notes: 'بهبود گزارشات مالی و نمودارها' },
  { version: '1.2.1', date: '۱۴۰۳/۰۷/۰۱', notes: 'رفع مشکلات امنیتی و بهبود احراز هویت' },
  { version: '1.2.0', date: '۱۴۰۳/۰۶/۱۵', notes: 'افزودن سیستم پیام‌رسانی کاربران' },
  { version: '1.1.2', date: '۱۴۰۳/۰۶/۰۱', notes: 'افزودن قابلیت چاپ و خروجی PDF' },
  { version: '1.1.1', date: '۱۴۰۳/۰۵/۱۵', notes: 'بهبود عملکرد و بهینه‌سازی دیتابیس' },
  { version: '1.1.0', date: '۱۴۰۳/۰۵/۰۱', notes: 'افزودن گزارشات پیشرفته و نمودارها' },
  { version: '1.0.3', date: '۱۴۰۳/۰۴/۱۵', notes: 'بهبود رابط کاربری و افزودن تم شب' },
  { version: '1.0.2', date: '۱۴۰۳/۰۴/۰۱', notes: 'افزودن قابلیت دسته‌بندی تریدها' },
  { version: '1.0.1', date: '۱۴۰۳/۰۳/۲۰', notes: 'رفع باگ‌های اولیه و بهبود سرعت' },
  { version: '1.0.0', date: '۱۴۰۳/۰۳/۱۵', notes: 'نسخه اولیه نرم‌افزار ژورنال ترید' },
];

const Profile = () => {
  const { user, updateUser } = useAuth();
  const { isDark } = useTheme();
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
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  const [trades, setTrades] = useState([]);
  const [subscription, setSubscription] = useState({
    plan: 'حرفه‌ای',
    remainingDays: 25,
    remainingTrades: 45,
    totalTrades: 0,
    startDate: '۱۴۰۳/۰۱/۰۱',
    endDate: '۱۴۰۳/۰۲/۰۱',
    isActive: true,
    isExpired: false
  });

  // بارگذاری اطلاعات کاربر و تریدها
  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone_number || ''
      });
    }

    const savedTrades = localStorage.getItem('trades');
    if (savedTrades) {
      const parsedTrades = JSON.parse(savedTrades);
      setTrades(parsedTrades);
      setSubscription(prev => ({
        ...prev,
        totalTrades: parsedTrades.length
      }));
    }

    // بررسی انقضای اشتراک
    checkSubscriptionExpiry();
  }, [user]);

  // تابع بررسی انقضای اشتراک
  const checkSubscriptionExpiry = () => {
    const savedSubscription = localStorage.getItem('subscription');
    if (savedSubscription) {
      const subData = JSON.parse(savedSubscription);
      const expiryDate = new Date(subData.endDate);
      const now = new Date();

      // اگر اشتراک منقضی شده باشد
      if (expiryDate < now) {
        setSubscription(prev => ({
          ...prev,
          isActive: false,
          isExpired: true,
          remainingDays: 0
        }));

        // نمایش اخطار و هدایت به صفحه تمدید
        alert('⏰ اشتراک شما منقضی شده است. لطفاً برای ادامه استفاده، اشتراک خود را تمدید کنید.');
        navigate('/subscription/renew');
        return;
      }

      // محاسبه روزهای باقیمانده
      const diffTime = expiryDate - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      setSubscription(prev => ({
        ...prev,
        remainingDays: diffDays,
        isActive: true,
        isExpired: false,
        plan: subData.plan || 'حرفه‌ای',
        remainingTrades: subData.remainingTrades || 45,
        startDate: new Date(subData.startDate).toLocaleDateString('fa-IR'),
        endDate: new Date(subData.endDate).toLocaleDateString('fa-IR')
      }));

      // اگر کمتر از 3 روز باقی مانده، اخطار نمایش بده
      if (diffDays <= 3 && diffDays > 0) {
        alert(`⚠️ توجه: ${diffDays} روز تا پایان اشتراک شما باقی مانده است. لطفاً هرچه سریعتر تمدید کنید.`);
      }
    } else {
      // اگر اشتراک در localStorage نبود، یک اشتراک آزمایشی ایجاد کن
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 7);

      const newSubscription = {
        plan: 'آزمایشی',
        remainingDays: 7,
        remainingTrades: 50,
        startDate: new Date().toISOString(),
        endDate: trialEndDate.toISOString(),
        isActive: true,
        isExpired: false
      };

      localStorage.setItem('subscription', JSON.stringify(newSubscription));
      setSubscription({
        plan: 'آزمایشی',
        remainingDays: 7,
        remainingTrades: 50,
        totalTrades: trades.length,
        startDate: new Date().toLocaleDateString('fa-IR'),
        endDate: trialEndDate.toLocaleDateString('fa-IR'),
        isActive: true,
        isExpired: false
      });
    }
  };

  // ============================================
  // تابع تمدید اشتراک (فعال)
  // ============================================
  const handleRenewSubscription = () => {
    setLoading(true);

    try {
      // دریافت اطلاعات اشتراک فعلی
      const savedSubscription = localStorage.getItem('subscription');
      let currentSub = savedSubscription ? JSON.parse(savedSubscription) : null;

      // تعیین تاریخ شروع و پایان جدید
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30); // 30 روز تمدید

      // ایجاد اشتراک جدید
      const updatedSubscription = {
        plan: currentSub?.plan || 'حرفه‌ای',
        remainingDays: 30,
        remainingTrades: 50,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        isActive: true,
        isExpired: false,
        lastRenewed: new Date().toISOString()
      };

      // ذخیره در localStorage
      localStorage.setItem('subscription', JSON.stringify(updatedSubscription));

      // به‌روزرسانی state
      setSubscription({
        plan: updatedSubscription.plan,
        remainingDays: 30,
        remainingTrades: 50,
        totalTrades: trades.length,
        startDate: startDate.toLocaleDateString('fa-IR'),
        endDate: endDate.toLocaleDateString('fa-IR'),
        isActive: true,
        isExpired: false
      });

      alert('✅ اشتراک شما با موفقیت تمدید شد! اعتبار جدید تا تاریخ ' + endDate.toLocaleDateString('fa-IR'));
    } catch (error) {
      console.error('Error renewing subscription:', error);
      alert('❌ خطا در تمدید اشتراک. لطفاً دوباره تلاش کنید.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const updatedUser = {
        ...user,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email
      };

      if (updateUser) {
        updateUser(updatedUser);
      }

      localStorage.setItem('userData', JSON.stringify({
        phone: formData.phone,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email
      }));

      setMessage({ type: 'success', text: '✅ اطلاعات با موفقیت به‌روزرسانی شد' });
      setEditMode(false);
    } catch (error) {
      setMessage({ type: 'error', text: '❌ خطا در به‌روزرسانی اطلاعات' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = () => {
    if (!contactMessage.trim()) {
      alert('لطفاً متن پیام را وارد کنید');
      return;
    }

    const savedMessages = localStorage.getItem('userMessages');
    const messages = savedMessages ? JSON.parse(savedMessages) : [];
    messages.push({
      id: Date.now(),
      user: user.phone_number,
      message: contactMessage,
      date: new Date().toISOString(),
      isReplied: false
    });
    localStorage.setItem('userMessages', JSON.stringify(messages));

    alert('✅ پیام شما با موفقیت ارسال شد. همکاران ما در اسرع وقت با شما تماس خواهند گرفت.');
    setContactMessage('');
    setShowMessageModal(false);
  };

  // محاسبه آمار سریع
  const totalTrades = trades.length;
  const winningTrades = trades.filter(t => t.profit > 0).length;
  const losingTrades = trades.filter(t => t.profit < 0).length;
  const totalProfit = trades.reduce((sum, t) => sum + (t.profit || 0), 0);
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades * 100).toFixed(1) : 0;
  const avgProfit = totalTrades > 0 ? (totalProfit / totalTrades).toFixed(2) : 0;
  const bestTrade = trades.length > 0 ? Math.max(...trades.map(t => t.profit || 0)) : 0;
  const worstTrade = trades.length > 0 ? Math.min(...trades.map(t => t.profit || 0)) : 0;
  const todayTrades = trades.filter(t => t.trade_date === new Date().toISOString().split('T')[0]).length;
  const thisWeekTrades = trades.filter(t => {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(t.trade_date) >= weekAgo;
  }).length;

  return (
    <div className={`profile-container ${isDark ? 'dark' : 'light'}`}>
      <div className="profile-header">
        <h2>👤 پروفایل کاربری</h2>
        <button className="btn-back" onClick={() => navigate('/')}>
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
            <div className="stat-item">
              <span className="stat-icon">📈</span>
              <div>
                <span className="stat-label">کل تریدها</span>
                <span className="stat-value">{totalTrades}</span>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-icon">✅</span>
              <div>
                <span className="stat-label">تریدهای برنده</span>
                <span className="stat-value success">{winningTrades}</span>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-icon">❌</span>
              <div>
                <span className="stat-label">تریدهای بازنده</span>
                <span className="stat-value danger">{losingTrades}</span>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-icon">📊</span>
              <div>
                <span className="stat-label">نرخ برد</span>
                <span className="stat-value">{winRate}%</span>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-icon">💰</span>
              <div>
                <span className="stat-label">سود کل</span>
                <span className={`stat-value ${totalProfit >= 0 ? 'success' : 'danger'}`}>
                  ${totalProfit}
                </span>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-icon">📏</span>
              <div>
                <span className="stat-label">میانگین سود</span>
                <span className="stat-value">${avgProfit}</span>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-icon">🏆</span>
              <div>
                <span className="stat-label">بهترین ترید</span>
                <span className="stat-value success">+${bestTrade}</span>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-icon">📉</span>
              <div>
                <span className="stat-label">بدترین ترید</span>
                <span className="stat-value danger">${worstTrade}</span>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-icon">📅</span>
              <div>
                <span className="stat-label">تریدهای امروز</span>
                <span className="stat-value">{todayTrades}</span>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-icon">📆</span>
              <div>
                <span className="stat-label">تریدهای این هفته</span>
                <span className="stat-value">{thisWeekTrades}</span>
              </div>
            </div>
          </div>
        </div>

        {/* اطلاعات اشتراک */}
        <div className="profile-card">
          <div className="card-header">
            <h3>📊 اطلاعات اشتراک</h3>
            {subscription.isExpired && (
              <span className="expiry-badge">⏰ منقضی شده</span>
            )}
            {!subscription.isExpired && subscription.remainingDays <= 3 && (
              <span className="expiry-badge warning">⚠️ در حال اتمام</span>
            )}
          </div>

          <div className="subscription-info">
            <div className="sub-item">
              <span className="sub-label">نوع پلن</span>
              <span className={`sub-value ${subscription.plan === 'حرفه‌ای' ? 'premium' : 'trial'}`}>
                {subscription.plan}
              </span>
            </div>
            <div className="sub-item">
              <span className="sub-label">روزهای باقیمانده</span>
              <span className={`sub-value ${subscription.remainingDays < 3 ? 'danger' : ''}`}>
                {subscription.remainingDays} روز
              </span>
            </div>
            <div className="sub-item">
              <span className="sub-label">تریدهای باقیمانده</span>
              <span className="sub-value">{subscription.remainingTrades} عدد</span>
            </div>
            <div className="sub-item">
              <span className="sub-label">تاریخ شروع</span>
              <span className="sub-value">{subscription.startDate}</span>
            </div>
            <div className="sub-item">
              <span className="sub-label">تاریخ پایان</span>
              <span className={`sub-value ${subscription.isExpired ? 'danger' : ''}`}>
                {subscription.endDate}
              </span>
            </div>
          </div>

          <button
            className="btn-renew"
            onClick={handleRenewSubscription}
            disabled={loading}
          >
            {loading ? '⏳ در حال تمدید...' : '🔄 تمدید اشتراک (۳۰ روز)'}
          </button>
        </div>

        {/* نسخه نرم‌افزار و تغییرات */}
        <div className="profile-card">
          <div className="card-header">
            <h3>📱 درباره نرم‌افزار</h3>
          </div>

          <div className="version-info">
            <div className="version-item">
              <span className="version-label">نسخه فعلی</span>
              <span className="version-value">v1.4.1</span>
            </div>
            <div className="version-item">
              <span className="version-label">تاریخ انتشار</span>
              <span className="version-value">۱۴۰۳/۱۰/۰۱</span>
            </div>
          </div>

          <button className="btn-versions" onClick={() => setShowVersions(!showVersions)}>
            {showVersions ? '🔽 بستن تاریخچه تغییرات' : '📜 مشاهده تاریخچه تغییرات'}
          </button>

          {showVersions && (
            <div className="versions-list">
              <table className="versions-table">
                <thead>
                  <tr>
                    <th>نسخه</th>
                    <th>تاریخ</th>
                    <th>تغییرات</th>
                  </tr>
                </thead>
                <tbody>
                  {APP_VERSIONS.map((item, index) => (
                    <tr key={index} className={item.version === '1.4.1' ? 'current-version' : ''}>
                      <td><strong>v{item.version}</strong></td>
                      <td>{item.date}</td>
                      <td>{item.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

            <button className="btn-contact" onClick={() => setShowMessageModal(true)}>
              ✉️ ارسال پیام به پشتیبانی
            </button>
          </div>
        </div>
      </div>

      {/* مودال ارسال پیام */}
      {showMessageModal && (
        <div className="modal-overlay" onClick={() => setShowMessageModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">✉️</div>
            <h3>ارسال پیام به پشتیبانی</h3>
            <p className="modal-note">
              لطفاً سؤال یا مشکل خود را به صورت کامل توضیح دهید. همکاران ما در اسرع وقت پاسخ شما را بررسی خواهند کرد.
            </p>
            <div className="modal-form">
              <div className="form-group">
                <label>متن پیام</label>
                <textarea
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="پیام خود را بنویسید..."
                  rows="5"
                  className="modal-textarea"
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowMessageModal(false)}>
                انصراف
              </button>
              <button className="btn-send" onClick={handleSendMessage}>
                ارسال پیام
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;