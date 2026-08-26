// frontend/src/pages/Admin/Settings/Settings.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import LoadingSpinner from '../../../components/Admin/LoadingSpinner';
import './Settings.css';

// ============================================
// ✅ تعریف نوع تأثیر هر تنظیم
// ============================================
const SETTING_IMPACT = {
  // 🔵 نیاز به ریستارت بک‌اند (ستاره آبی)
  backend_restart: [
    'secret_key', 'debug', 'allowed_hosts',
    'db_name', 'db_user', 'db_password', 'db_host', 'db_port',
    'cors_allowed_origins',
    'ollama_url', 'ollama_model', 'ollama_timeout',
    'ai_model', 'ai_timeout',
    'live_price_provider',
    'twelvedata_api_key', 'twelvedata_base_url',
    'finnhub_api_key', 'finnhub_base_url',
    'alphavantage_api_key',
    'zarinpal_merchant_id', 'zarinpal_sandbox', 'zarinpal_callback_url',
    'sms_api_key', 'sms_sender_number', 'sms_otp_template',
    // ✅ تنظیمات جدید Gapgpt.app
    'ai_provider_mode',
    'gapgpt_api_key',
    'gapgpt_base_url',
    'gapgpt_default_model',
    'gapgpt_available_models',
  ],
  // 🔴 نیاز به ریستارت فرانت‌اند (ستاره قرمز)
  frontend_restart: [
    'app_name', 'app_version', 'default_font',
    'primary_color', 'secondary_color',
    'logo_path', 'favicon_path', 'bg_image_path',
    'footer_text',
    'site_email', 'site_phone', 'site_address',
  ],
  // بدون ستاره - بدون نیاز به ریستارت
  no_restart: [
    'max_trades_per_day', 'min_trade_interval',
    'trial_days', 'trial_trades_limit', 'trial_ai_consultations_limit',
    'max_image_width', 'max_image_height', 'image_quality',
    'max_image_size_mb', 'show_screenshot_upload',
    'sms_enabled', 'enable_payment',
    'ollama_available_models', 'ai_temperature',
    'save_ai_prompt', 'admin_phone_number',
  ]
};

// ============================================
// ✅ تابع تشخیص نوع تأثیر یک تنظیم
// ============================================
const getSettingImpact = (key) => {
  if (SETTING_IMPACT.backend_restart.includes(key)) {
    return 'backend';
  }
  if (SETTING_IMPACT.frontend_restart.includes(key)) {
    return 'frontend';
  }
  return 'none';
};

// ============================================
// ✅ گروه‌بندی تنظیمات
// ============================================
const groups = {
  'عمومی': [
    'app_name', 'app_version', 'default_font', 'primary_color', 'secondary_color'
  ],
  'سایت': [
    'site_email', 'site_phone', 'site_address', 'footer_text'
  ],
  'ظاهر': [
    'logo_path', 'favicon_path', 'bg_image_path'
  ],
  'ترید': [
    'max_trades_per_day', 'min_trade_interval', 'trial_days',
    'trial_trades_limit', 'trial_ai_consultations_limit'
  ],
  'هوش مصنوعی': [
    'ai_model', 'ai_temperature', 'ai_timeout',
    'ollama_url', 'ollama_model', 'ollama_available_models', 'ollama_timeout',
    'save_ai_prompt',
    // ✅ تنظیمات جدید Gapgpt.app
    'ai_provider_mode',
    'gapgpt_api_key',
    'gapgpt_base_url',
    'gapgpt_default_model',
    'gapgpt_available_models'
  ],
  'تصاویر': [
    'max_image_width', 'max_image_height', 'image_quality',
    'max_image_size_mb', 'show_screenshot_upload'
  ],
  'پیامک (SMS)': [
    'sms_enabled', 'sms_api_key', 'sms_sender_number', 'sms_otp_template'
  ],
  'پرداخت (زرین‌پال)': [
    'zarinpal_merchant_id', 'zarinpal_sandbox', 'zarinpal_callback_url', 'enable_payment'
  ],
  'قیمت لحظه‌ای': [
    'live_price_provider', 'twelvedata_api_key', 'twelvedata_base_url',
    'finnhub_api_key', 'finnhub_base_url', 'alphavantage_api_key'
  ],
  'امنیت': [
    'secret_key', 'debug', 'allowed_hosts'
  ],
  'دیتابیس': [
    'db_name', 'db_user', 'db_password', 'db_host', 'db_port'
  ],
  'CORS': [
    'cors_allowed_origins'
  ],
  'ادمین': [
    'admin_phone_number'
  ],
};

const Settings = () => {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      let allSettings = [];
      let nextPage = '/api/admin/settings/?page_size=100';

      while (nextPage) {
        const response = await axios.get(nextPage, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.data && response.data.results) {
          allSettings = [...allSettings, ...response.data.results];
          nextPage = response.data.next;
        } else {
          break;
        }
      }

      console.log('📊 Total settings loaded:', allSettings.length);
      setSettings(allSettings);

      const aiSettings = allSettings.filter(s =>
        s.setting_key.includes('ollama') || s.setting_key.includes('ai_') || s.setting_key.includes('gapgpt')
      );
      console.log('🤖 AI Settings found:', aiSettings);

    } catch (error) {
      console.error('Error loading settings:', error);
      setError('خطا در بارگذاری تنظیمات');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, value) => {
    setSettings(prev =>
      prev.map(s => s.setting_key === key ? { ...s, setting_value: value } : s)
    );
  };

  // ============================================
  // ✅ اصلاح شده: متد handleSubmit با آدرس صحیح و متد POST
  // ============================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const data = {};
      settings.forEach(s => {
        if (s.is_editable !== false) {
          data[s.setting_key] = s.setting_value;
        }
      });

      // ✅ لاگ کامل برای دیباگ
      console.log('📤 ===== SENDING SETTINGS =====');
      console.log('📤 All keys:', Object.keys(data));
      console.log('📤 gapgpt_api_key:', data.gapgpt_api_key);
      console.log('📤 gapgpt_api_key type:', typeof data.gapgpt_api_key);
      console.log('📤 gapgpt_api_key length:', data.gapgpt_api_key?.length || 0);
      console.log('📤 Full data:', JSON.stringify(data, null, 2));

      const token = localStorage.getItem('token');

      // ✅ اصلاح: آدرس صحیح و متد POST
      const response = await axios({
        method: 'POST',
        url: '/api/admin/settings/update/',
        data: data,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📥 ===== RESPONSE =====');
      console.log('📥 Response:', response.data);

      setSuccess(response.data.message || 'تنظیمات با موفقیت ذخیره شد');
      setTimeout(() => setSuccess(null), 5000);

      // ✅ بعد از ذخیره، دوباره بارگذاری کن
      await loadSettings();

    } catch (error) {
      console.error('❌ ===== ERROR =====');
      console.error('❌ Error saving settings:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);

      // نمایش پیام خطای دقیق‌تر
      const errorMessage = error.response?.data?.detail ||
                          error.response?.data?.error ||
                          error.response?.data?.message ||
                          'خطا در ذخیره تنظیمات';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('آیا از بازنشانی تنظیمات به مقادیر پیش‌فرض اطمینان دارید؟')) {
      loadSettings();
      setSuccess('تنظیمات بازنشانی شد');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  if (loading) return <LoadingSpinner />;

  const getGroupSettings = (keys) => {
    if (!Array.isArray(settings)) return [];
    return settings.filter(s => keys.includes(s.setting_key));
  };

  // ============================================
  // ✅ رندر تنظیمات بر اساس نوع
  // ============================================
  const renderSettingInput = (setting) => {
    const value = setting.setting_value || '';

    const sensitiveKeys = [
      'secret_key', 'db_password', 'sms_api_key',
      'twelvedata_api_key', 'finnhub_api_key',
      'alphavantage_api_key', 'zarinpal_merchant_id',
      'gapgpt_api_key'
    ];
    const isSensitive = sensitiveKeys.includes(setting.setting_key);

    // ===== تنظیم ai_provider_mode با select =====
    if (setting.setting_key === 'ai_provider_mode') {
      return (
        <select
          id={setting.setting_key}
          value={value || 'hybrid'}
          onChange={(e) => handleChange(setting.setting_key, e.target.value)}
          disabled={setting.is_editable === false}
          className="setting-select"
        >
          <option value="offline">🔴 فقط آفلاین (Ollama)</option>
          <option value="online">🟢 فقط آنلاین (Gapgpt.app)</option>
          <option value="hybrid">🔵 ترکیبی (آنلاین + آفلاین)</option>
        </select>
      );
    }

    // ===== تنظیم gapgpt_available_models با textarea و توضیحات کامل =====
    if (setting.setting_key === 'gapgpt_available_models') {
      // لیست کامل مدل‌های پیشنهادی (همان ۳۶ مدل موجود)
      const fullModelList = [
        '🟢 رایگان: GapGPT 5.6 Lite',
        '🟢 اقتصادی: GPT-5.6 Luna, DeepSeek V4 Flash, Gemini 3.5 Flash Lite, GPT-5.4 nano, GPT-5.4 mini',
        '🟡 میان‌رده: Grok 4.1 Fast, Claude 4.5 Haiku, Gemini 3.7 Flash, DeepSeek, GPT-5.6 Terra',
        '🟠 حرفه‌ای: GapGPT 5.6, Claude 4.6 Sonnet, Claude 5 Sonnet, Gemini 3.1 Pro, Grok 4.3, DeepSeek V4 Pro, GPT-5.4, GPT-5.4 Pro',
        '🔴 VIP: GPT-5.6 Sol, Claude Fable 5, Claude Opus 5, o4-mini, o4-mini-high, DeepSeek R1, Grok 4.6, Gemini 2.5 pro, o3, o3 pro, Perplexity, Qwen 3, Qwen 3 Max, Minimax M2, GLM 5, Kimi 2.5, Kimi K3'
      ];

      return (
        <div>
          <textarea
            id={setting.setting_key}
            value={value}
            onChange={(e) => handleChange(setting.setting_key, e.target.value)}
            rows={8}
            disabled={setting.is_editable === false}
            placeholder="لیست مدل‌ها با کاما جدا شوند..."
            style={{ fontFamily: 'monospace', fontSize: '13px', direction: 'ltr' }}
          />
          <small className="hint">
            📌 <strong>راهنمای فعال/غیرفعال کردن مدل‌ها:</strong>
            <br />
            ✅ برای <strong>فعال</strong> کردن یک مدل، نام دقیق آن را به لیست اضافه کنید.
            <br />
            ❌ برای <strong>غیرفعال</strong> کردن یک مدل، نام آن را از لیست حذف کنید.
            <br />
            🔹 نام مدل‌ها باید با <strong>کاما (،)</strong> از هم جدا شوند.
            <br />
            <br />
            💡 <strong>لیست کامل مدل‌های Gapgpt.app (۳۶ مدل):</strong>
            <br />
            {fullModelList.map((line, i) => (
              <span key={i}>
                {line}
                <br />
              </span>
            ))}
          </small>
        </div>
      );
    }

    switch (setting.setting_type) {
      case 'boolean':
        return (
          <div className="toggle-wrapper">
            <input
              type="checkbox"
              id={setting.setting_key}
              checked={value === 'true' || value === true}
              onChange={(e) => handleChange(setting.setting_key, String(e.target.checked))}
              disabled={setting.is_editable === false}
            />
            <span className="toggle-label">
              {value === 'true' || value === true ? 'فعال' : 'غیرفعال'}
            </span>
          </div>
        );

      case 'integer':
        return (
          <input
            type="number"
            id={setting.setting_key}
            value={value}
            onChange={(e) => handleChange(setting.setting_key, e.target.value)}
            disabled={setting.is_editable === false}
          />
        );

      case 'text':
        return (
          <textarea
            id={setting.setting_key}
            value={value}
            onChange={(e) => handleChange(setting.setting_key, e.target.value)}
            rows={3}
            disabled={setting.is_editable === false}
            placeholder="متن را وارد کنید..."
          />
        );

      default:
        return (
          <input
            type="text"
            id={setting.setting_key}
            value={value}
            onChange={(e) => handleChange(setting.setting_key, e.target.value)}
            disabled={setting.is_editable === false}
            placeholder={isSensitive ? '⚠️ مقدار حساس - با احتیاط تغییر دهید' : 'مقدار را وارد کنید...'}
          />
        );
    }
  };

  // ============================================
  // ✅ رندر افسانه (Legend) ستاره‌ها
  // ============================================
  const renderLegend = () => {
    return (
      <div className="settings-legend">
        <div className="legend-title">📌 راهنمای تأثیر تغییرات:</div>
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-star blue">★</span>
            <span className="legend-text">نیاز به <strong>ریستارت بک‌اند</strong> (سرور)</span>
          </div>
          <div className="legend-item">
            <span className="legend-star red">★</span>
            <span className="legend-text">نیاز به <strong>ریستارت فرانت‌اند</strong> (مرورگر)</span>
          </div>
          <div className="legend-item">
            <span className="legend-star none">☆</span>
            <span className="legend-text">بدون نیاز به ریستارت – <strong>بلافاصله</strong> اعمال می‌شود</span>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // ✅ نمایش تنظیمات دسته‌بندی شده
  // ============================================
  const renderSettings = () => {
    const hasSettings = Object.entries(groups).some(([_, keys]) => {
      return getGroupSettings(keys).length > 0;
    });

    if (!hasSettings) {
      return (
        <div className="empty-message">
          <p>هیچ تنظیماتی یافت نشد</p>
        </div>
      );
    }

    return Object.entries(groups).map(([groupName, keys]) => {
      const groupSettings = getGroupSettings(keys);
      if (groupSettings.length === 0) return null;

      const sensitiveKeys = [
        'secret_key', 'db_password', 'sms_api_key',
        'twelvedata_api_key', 'finnhub_api_key',
        'alphavantage_api_key', 'zarinpal_merchant_id',
        'gapgpt_api_key'
      ];
      const hasSensitive = groupSettings.some(s =>
        sensitiveKeys.includes(s.setting_key)
      );

      return (
        <div key={groupName} className="settings-group">
          <h2>
            {groupName}
            {hasSensitive && <span className="sensitive-badge">🔒 حساس</span>}
          </h2>
          <div className="settings-grid">
            {groupSettings.map((setting) => {
              const isSensitive = sensitiveKeys.includes(setting.setting_key);
              const impact = getSettingImpact(setting.setting_key);

              let starIcon = '☆';
              let starClass = 'none';

              if (impact === 'backend') {
                starIcon = '★';
                starClass = 'blue';
              } else if (impact === 'frontend') {
                starIcon = '★';
                starClass = 'red';
              }

              return (
                <div key={setting.setting_key} className={`setting-item ${isSensitive ? 'sensitive' : ''}`}>
                  <label htmlFor={setting.setting_key}>
                    <span className={`impact-star ${starClass}`}>
                      {starIcon}
                    </span>
                    {setting.description || setting.setting_key}
                    {isSensitive && <span className="sensitive-icon">🔒</span>}
                    {setting.is_editable === false && (
                      <span className="readonly-badge">(فقط خواندنی)</span>
                    )}
                  </label>
                  {renderSettingInput(setting)}
                  {isSensitive && (
                    <small className="sensitive-hint">⚠️ تغییر این مقدار با احتیاط انجام شود</small>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    });
  };

  // ============================================
  // ✅ رندر اصلی
  // ============================================
  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>⚙️ تنظیمات سیستم</h1>
        <div className="header-actions">
          <button onClick={handleReset} className="btn-reset-settings">
            🔄 بازنشانی
          </button>
        </div>
      </div>

      {error && (
        <div className="alert error">
          <span className="alert-icon">❌</span>
          {error}
        </div>
      )}

      {success && (
        <div className="alert success">
          <span className="alert-icon">✅</span>
          {success}
        </div>
      )}

      {/* ===== افسانه (Legend) ===== */}
      {renderLegend()}

      <form onSubmit={handleSubmit}>
        {renderSettings()}

        <div className="form-actions">
          <button
            type="submit"
            disabled={saving}
            className="btn-save"
          >
            {saving ? (
              <>
                <span className="spinner"></span>
                در حال ذخیره...
              </>
            ) : (
              '💾 ذخیره همه تنظیمات'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;