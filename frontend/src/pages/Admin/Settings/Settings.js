// frontend/src/pages/Admin/Settings/Settings.js

import React, { useState, useEffect } from 'react';
import adminService from '../../../services/adminService';
import LoadingSpinner from '../../../components/Admin/LoadingSpinner';
import './Settings.css';

// ============================================
// ✅ تعریف نوع تأثیر هر تنظیم
// ============================================
const SETTING_IMPACT = {
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
    'ai_provider_mode',
    'gapgpt_api_key',
    'gapgpt_base_url',
    'gapgpt_default_model',
    'gapgpt_available_models',
  ],
  frontend_restart: [
    'app_name', 'app_version', 'default_font',
    'primary_color', 'secondary_color',
    'logo_path', 'favicon_path', 'bg_image_path',
    'footer_text',
    'site_email', 'site_phone', 'site_address',
  ],
  no_restart: [
    'max_trades_per_day', 'min_trade_interval',
    'trial_days', 'trial_trades_limit', 'trial_ai_consultations_limit',
    'max_image_width', 'max_image_height', 'image_quality',
    'max_image_size_mb', 'show_screenshot_upload',
    'enable_payment',
    'ollama_available_models', 'ai_temperature',
    'save_ai_prompt', 'admin_phone_number',
    'admin_bypass_otp',
  ]
};

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
    'admin_phone_number',
    'admin_bypass_otp'
  ],
    'روش‌های پرداخت': [
    'bank_payment_enabled',
    'card_payment_enabled'
  ],
};

// ============================================
// ✅ اطلاعات فایل هر تنظیم
// ============================================
const getSettingFileInfo = (key) => {
  const fileInfo = {
    // از .env
    'debug': { file: '.env', field: 'DEBUG' },
    'secret_key': { file: '.env', field: 'SECRET_KEY' },
    'db_name': { file: '.env', field: 'DB_NAME' },
    'db_user': { file: '.env', field: 'DB_USER' },
    'db_password': { file: '.env', field: 'DB_PASSWORD' },
    'db_host': { file: '.env', field: 'DB_HOST' },
    'db_port': { file: '.env', field: 'DB_PORT' },
    'zarinpal_merchant_id': { file: '.env', field: 'ZARINPAL_MERCHANT_ID' },
    'zarinpal_sandbox': { file: '.env', field: 'ZARINPAL_SANDBOX' },
    'zarinpal_callback_url': { file: '.env', field: 'ZARINPAL_CALLBACK_URL' },
    'live_price_provider': { file: '.env', field: 'LIVE_PRICE_PROVIDER' },
    'twelvedata_api_key': { file: '.env', field: 'TWELVEDATA_API_KEY' },
    'twelvedata_base_url': { file: '.env', field: 'TWELVEDATA_BASE_URL' },
    'finnhub_api_key': { file: '.env', field: 'FINNHUB_API_KEY' },
    'finnhub_base_url': { file: '.env', field: 'FINNHUB_BASE_URL' },
    'alphavantage_api_key': { file: '.env', field: 'ALPHA_VANTAGE_API_KEY' },
    'ollama_url': { file: '.env', field: 'OLLAMA_URL' },
    'ollama_model': { file: '.env', field: 'OLLAMA_MODEL' },
    'ollama_available_models': { file: '.env', field: 'OLLAMA_AVAILABLE_MODELS' },
    'ollama_timeout': { file: '.env', field: 'OLLAMA_TIMEOUT' },
    'admin_phone_number': { file: '.env', field: 'ADMIN_PHONE_NUMBER' },
    'max_image_width': { file: '.env', field: 'MAX_IMAGE_WIDTH' },
    'max_image_height': { file: '.env', field: 'MAX_IMAGE_HEIGHT' },
    'image_quality': { file: '.env', field: 'IMAGE_QUALITY' },
    'max_image_size_mb': { file: '.env', field: 'MAX_IMAGE_SIZE_MB' },
    'show_screenshot_upload': { file: '.env', field: 'SHOW_SCREENSHOT_UPLOAD' },
    'gapgpt_api_key': { file: '.env', field: 'GAPGPT_API_KEY' },
    'gapgpt_base_url': { file: '.env', field: 'GAPGPT_BASE_URL' },
    'gapgpt_default_model': { file: '.env', field: 'GAPGPT_DEFAULT_MODEL' },
    'gapgpt_available_models': { file: '.env', field: 'GAPGPT_AVAILABLE_MODELS' },
    'ai_provider_mode': { file: '.env', field: 'AI_PROVIDER_MODE' },

    // از دیتابیس
    'app_name': { file: 'دیتابیس', field: 'app_name' },
    'app_version': { file: 'دیتابیس', field: 'app_version' },
    'default_font': { file: 'دیتابیس', field: 'default_font' },
    'primary_color': { file: 'دیتابیس', field: 'primary_color' },
    'secondary_color': { file: 'دیتابیس', field: 'secondary_color' },
    'site_email': { file: 'دیتابیس', field: 'site_email' },
    'site_phone': { file: 'دیتابیس', field: 'site_phone' },
    'site_address': { file: 'دیتابیس', field: 'site_address' },
    'footer_text': { file: 'دیتابیس', field: 'footer_text' },
    'logo_path': { file: 'دیتابیس', field: 'logo_path' },
    'favicon_path': { file: 'دیتابیس', field: 'favicon_path' },
    'bg_image_path': { file: 'دیتابیس', field: 'bg_image_path' },
    'max_trades_per_day': { file: 'دیتابیس', field: 'max_trades_per_day' },
    'min_trade_interval': { file: 'دیتابیس', field: 'min_trade_interval' },
    'trial_days': { file: 'دیتابیس', field: 'trial_days' },
    'trial_trades_limit': { file: 'دیتابیس', field: 'trial_trades_limit' },
    'trial_ai_consultations_limit': { file: 'دیتابیس', field: 'trial_ai_consultations_limit' },
    'ai_model': { file: 'دیتابیس', field: 'ai_model' },
    'ai_temperature': { file: 'دیتابیس', field: 'ai_temperature' },
    'ai_timeout': { file: 'دیتابیس', field: 'ai_timeout' },
    'enable_payment': { file: 'دیتابیس', field: 'enable_payment' },
    'cors_allowed_origins': { file: 'دیتابیس', field: 'cors_allowed_origins' },
    'admin_bypass_otp': { file: 'دیتابیس', field: 'admin_bypass_otp' },
    'save_ai_prompt': { file: 'دیتابیس', field: 'save_ai_prompt' },
  };

  return fileInfo[key] || { file: 'دیتابیس', field: key };
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
    setError(null);
    try {
      const response = await adminService.getSettings();
      let allSettings = [];

      if (response.data && response.data.results) {
        allSettings = response.data.results;
      } else if (Array.isArray(response.data)) {
        allSettings = response.data;
      }

      console.log('📊 Total settings loaded:', allSettings.length);
      setSettings(allSettings);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const data = {};
      settings.forEach(s => {
        if (s.is_editable !== false && s.setting_key) {
          data[s.setting_key] = s.setting_value;
        }
      });

      console.log('📤 SENDING SETTINGS:', data);

      const response = await adminService.updateSettings(data);
      setSuccess(response.data.message || 'تنظیمات با موفقیت ذخیره شد');
      setTimeout(() => setSuccess(null), 5000);
      await loadSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('خطا در ذخیره تنظیمات');
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

  const renderSettingInput = (setting) => {
    const value = setting.setting_value || '';
    const fileInfo = getSettingFileInfo(setting.setting_key);

    const sensitiveKeys = [
      'secret_key', 'db_password', 'sms_api_key',
      'twelvedata_api_key', 'finnhub_api_key',
      'alphavantage_api_key', 'zarinpal_merchant_id',
      'gapgpt_api_key', 'smsir_api_key'
    ];
    const isSensitive = sensitiveKeys.includes(setting.setting_key);

    // ===== تنظیم admin_bypass_otp =====
    if (setting.setting_key === 'admin_bypass_otp') {
      return (
        <div>
          <div className="toggle-wrapper">
            <input
              type="checkbox"
              id={setting.setting_key}
              checked={value === 'true' || value === true || value === 'True' || value === '1'}
              onChange={(e) => handleChange(setting.setting_key, String(e.target.checked))}
              disabled={setting.is_editable === false}
            />
            <span className="toggle-label">
              {value === 'true' || value === true || value === 'True' || value === '1' ? 'فعال' : 'غیرفعال'}
            </span>
          </div>
          <small className="hint">
            ⚠️ با فعال کردن این گزینه، <strong>ادمین</strong> با شماره تماس خود مستقیماً وارد نرم‌افزار می‌شود
            <strong style={{ color: '#d32f2f' }}> بدون نیاز به کد تایید</strong>. فقط برای کاربران ادمین اعمال می‌شود.
          </small>
          <div className="file-info">📁 {fileInfo.file} → {fileInfo.field}</div>
        </div>
      );
    }

    // ===== تنظیم sms_provider (انتخاب ارائه‌دهنده) =====
    if (setting.setting_key === 'sms_provider') {
      return (
        <div>
          <select
            id={setting.setting_key}
            value={value || 'smsir'}
            onChange={(e) => handleChange(setting.setting_key, e.target.value)}
            disabled={setting.is_editable === false}
            className="setting-select"
          >
            <option value="smsir">📱 فقط SMS.IR</option>
            <option value="ghasedak">📱 فقط قاصدک (Ghasedak)</option>
          </select>
          <div className="file-info">📁 {fileInfo.file} → {fileInfo.field}</div>
        </div>
      );
    }

    // ===== تنظیم smsir_api_key (معمولی - نه کد شده) =====
    if (setting.setting_key === 'smsir_api_key') {
      return (
        <div>
          <input
            type="text"
            id={setting.setting_key}
            value={value}
            onChange={(e) => handleChange(setting.setting_key, e.target.value)}
            disabled={setting.is_editable === false}
            placeholder="کلید API SMS.IR را وارد کنید"
            style={{ direction: 'ltr' }}
          />
          <small className="hint">🔑 کلید API را از پنل SMS.IR (بخش برنامه‌نویسان) دریافت کنید.</small>
          <div className="file-info">📁 {fileInfo.file} → {fileInfo.field}</div>
        </div>
      );
    }

    // ===== تنظیم smsir_line_number =====
    if (setting.setting_key === 'smsir_line_number') {
      return (
        <div>
          <input
            type="text"
            id={setting.setting_key}
            value={value}
            onChange={(e) => handleChange(setting.setting_key, e.target.value)}
            disabled={setting.is_editable === false}
            placeholder="مثال: 30002108036135"
            style={{ direction: 'ltr' }}
          />
          <small className="hint">📞 شماره خط اختصاصی خود را وارد کنید (بدون صفر ابتدا).</small>
          <div className="file-info">📁 {fileInfo.file} → {fileInfo.field}</div>
        </div>
      );
    }

    // ===== تنظیم ai_provider_mode =====
    if (setting.setting_key === 'ai_provider_mode') {
      return (
        <div>
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
          <div className="file-info">📁 {fileInfo.file} → {fileInfo.field}</div>
        </div>
      );
    }

    // ===== تنظیم gapgpt_available_models =====
    if (setting.setting_key === 'gapgpt_available_models') {
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
            rows={6}
            disabled={setting.is_editable === false}
            placeholder="لیست مدل‌ها با کاما جدا شوند..."
            style={{ fontFamily: 'monospace', fontSize: '13px', direction: 'ltr' }}
          />
          <small className="hint">
            📌 نام مدل‌ها باید با <strong>کاما (،)</strong> از هم جدا شوند.
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
          <div className="file-info">📁 {fileInfo.file} → {fileInfo.field}</div>
        </div>
      );
    }

    // ===== سایر تنظیمات =====
    switch (setting.setting_type) {
      case 'boolean':
        return (
          <div>
            <div className="toggle-wrapper">
              <input
                type="checkbox"
                id={setting.setting_key}
                checked={value === 'true' || value === true || value === 'True' || value === '1'}
                onChange={(e) => handleChange(setting.setting_key, String(e.target.checked))}
                disabled={setting.is_editable === false}
              />
              <span className="toggle-label">
                {value === 'true' || value === true || value === 'True' || value === '1' ? 'فعال' : 'غیرفعال'}
              </span>
            </div>
            <div className="file-info">📁 {fileInfo.file} → {fileInfo.field}</div>
          </div>
        );

      case 'integer':
        return (
          <div>
            <input
              type="number"
              id={setting.setting_key}
              value={value}
              onChange={(e) => handleChange(setting.setting_key, e.target.value)}
              disabled={setting.is_editable === false}
            />
            <div className="file-info">📁 {fileInfo.file} → {fileInfo.field}</div>
          </div>
        );

      case 'text':
        return (
          <div>
            <textarea
              id={setting.setting_key}
              value={value}
              onChange={(e) => handleChange(setting.setting_key, e.target.value)}
              rows={3}
              disabled={setting.is_editable === false}
              placeholder="متن را وارد کنید..."
            />
            <div className="file-info">📁 {fileInfo.file} → {fileInfo.field}</div>
          </div>
        );

      default:
        return (
          <div>
            <input
              type="text"
              id={setting.setting_key}
              value={value}
              onChange={(e) => handleChange(setting.setting_key, e.target.value)}
              disabled={setting.is_editable === false}
              placeholder={isSensitive ? '⚠️ مقدار حساس - با احتیاط تغییر دهید' : 'مقدار را وارد کنید...'}
            />
            <div className="file-info">📁 {fileInfo.file} → {fileInfo.field}</div>
          </div>
        );
    }
  };

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
        'gapgpt_api_key', 'smsir_api_key'
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