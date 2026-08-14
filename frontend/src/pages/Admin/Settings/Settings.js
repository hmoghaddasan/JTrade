// frontend/src/pages/Admin/Settings/Settings.js

import React, { useState, useEffect } from 'react';
import adminService from '../../../services/adminService';
import LoadingSpinner from '../../../components/Admin/LoadingSpinner';
import './Settings.css';

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
      const response = await adminService.getSettings();
      console.log('📊 Settings API Response:', response);

      let settingsData = response.data;

      if (settingsData && !Array.isArray(settingsData)) {
        if (settingsData.results) {
          settingsData = settingsData.results;
        } else if (settingsData.data) {
          settingsData = settingsData.data;
        } else {
          settingsData = Object.entries(settingsData).map(([key, value]) => ({
            setting_key: key,
            setting_value: typeof value === 'object' ? JSON.stringify(value) : String(value),
            setting_type: typeof value === 'boolean' ? 'boolean' : 'string',
            description: key,
            is_editable: true,
          }));
        }
      }

      setSettings(Array.isArray(settingsData) ? settingsData : []);
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
        if (s.is_editable !== false) {
          data[s.setting_key] = s.setting_value;
        }
      });

      const response = await adminService.updateSettings(data);
      setSuccess(response.data.message || 'تنظیمات با موفقیت ذخیره شد');
      setTimeout(() => setSuccess(null), 5000);
    } catch (error) {
      setError(error.response?.data?.error || 'خطا در ذخیره تنظیمات');
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

  // ============================================
  // ✅ گروه‌بندی تنظیمات (همه دسته‌ها با تمام فیلدها)
  // ============================================
  const groups = {
    'عمومی': [
      'app_name',
      'app_version',
      'default_font',
      'primary_color',
      'secondary_color'
    ],
    'سایت': [
      'site_email',
      'site_phone',
      'site_address',
      'footer_text'
    ],
    'ظاهر': [
      'logo_path',
      'favicon_path',
      'bg_image_path'
    ],
    'ترید': [
      'max_trades_per_day',
      'min_trade_interval',
      'trial_days',
      'trial_trades_limit',
      'trial_ai_consultations_limit'
    ],
    'هوش مصنوعی': [
      'ai_model',
      'ai_temperature',
      'ai_timeout',
      'ollama_url',
      'ollama_model',
      'ollama_available_models',
      'ollama_timeout'
    ],
    'تصاویر': [
      'max_image_width',
      'max_image_height',
      'image_quality',
      'max_image_size_mb',
      'show_screenshot_upload'
    ],
    'پیامک (SMS)': [
      'sms_enabled',
      'sms_api_key',
      'sms_sender_number',
      'sms_otp_template'
    ],
    'پرداخت (زرین‌پال)': [
      'zarinpal_merchant_id',
      'zarinpal_sandbox',
      'zarinpal_callback_url',
      'enable_payment'
    ],
    'قیمت لحظه‌ای': [
      'live_price_provider',
      'twelvedata_api_key',
      'twelvedata_base_url',
      'finnhub_api_key',
      'finnhub_base_url',
      'alphavantage_api_key'
    ],
    'امنیت': [
      'secret_key',
      'debug',
      'allowed_hosts'
    ],
    'دیتابیس': [
      'db_name',
      'db_user',
      'db_password',
      'db_host',
      'db_port'
    ],
    'CORS': [
      'cors_allowed_origins'
    ],
    'ادمین': [
      'admin_phone_number'
    ],
  };

  const getGroupSettings = (keys) => {
    if (!Array.isArray(settings)) return [];
    return settings.filter(s => keys.includes(s.setting_key));
  };

  // ============================================
  // رندر تنظیمات بر اساس نوع
  // ============================================
  const renderSettingInput = (setting) => {
    const value = setting.setting_value || '';

    // تنظیمات حساس
    const sensitiveKeys = [
      'secret_key', 'db_password', 'sms_api_key',
      'twelvedata_api_key', 'finnhub_api_key',
      'alphavantage_api_key', 'zarinpal_merchant_id'
    ];
    const isSensitive = sensitiveKeys.includes(setting.setting_key);

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
  // نمایش تنظیمات دسته‌بندی شده
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

      // بررسی آیا تنظیمات حساس در این گروه وجود دارد
      const sensitiveKeys = [
        'secret_key', 'db_password', 'sms_api_key',
        'twelvedata_api_key', 'finnhub_api_key',
        'alphavantage_api_key', 'zarinpal_merchant_id'
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
              return (
                <div key={setting.setting_key} className={`setting-item ${isSensitive ? 'sensitive' : ''}`}>
                  <label htmlFor={setting.setting_key}>
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
  // رندر اصلی
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