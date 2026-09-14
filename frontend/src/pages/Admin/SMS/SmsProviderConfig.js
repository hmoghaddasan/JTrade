// frontend/src/pages/Admin/SMS/SmsProviderConfig.js

import React, { useState, useEffect } from 'react';
import adminService from '../../../services/adminService';
import { useToast } from '../../../contexts/ToastContext';
import LoadingSpinner from '../../../components/Admin/LoadingSpinner';
import './SmsProviderConfig.css';

const SmsProviderConfig = () => {
  const { showToast } = useToast();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProvider, setEditingProvider] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(null);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    setLoading(true);
    try {
      const response = await adminService.getSmsProviders();
      const data = response.data.results || response.data;
      setProviders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading providers:', error);
      showToast('خطا در بارگذاری providers', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (provider) => {
    setEditingProvider({ ...provider });
  };

  const handleCancel = () => {
    setEditingProvider(null);
  };

  const handleChange = (field, value) => {
    setEditingProvider(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!editingProvider) return;

    setSaving(true);
    try {
      await adminService.updateSmsProvider(editingProvider.id, {
        api_key: editingProvider.api_key,
        line_number: editingProvider.line_number,
        send_method: editingProvider.send_method,
        notes: editingProvider.notes,
        is_configured: !!(editingProvider.api_key && editingProvider.line_number),
      });

      showToast('✅ provider با موفقیت ذخیره شد', 'success');
      setEditingProvider(null);
      loadProviders();
    } catch (error) {
      console.error('Error saving provider:', error);
      showToast('خطا در ذخیره provider', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (provider) => {
    if (!provider.is_configured) {
      showToast('ابتدا کلید API و شماره خط را تنظیم کنید', 'warning');
      return;
    }

    try {
      await adminService.activateSmsProvider(provider.id);
      showToast(`✅ ${provider.provider_display} فعال شد`, 'success');
      loadProviders();
    } catch (error) {
      console.error('Error activating provider:', error);
      showToast('خطا در فعال‌سازی provider', 'error');
    }
  };

  const handleTest = async (provider) => {
    setTesting(provider.id);
    try {
      const response = await adminService.testSmsProvider(provider.id);
      const result = response.data;

      if (result.success) {
        showToast(`✅ اتصال ${provider.provider_display} موفق بود`, 'success');
      } else {
        showToast(`❌ خطا: ${result.error || 'اتصال ناموفق'}`, 'error');
      }
      loadProviders();
    } catch (error) {
      console.error('Error testing provider:', error);
      showToast('خطا در تست اتصال', 'error');
    } finally {
      setTesting(null);
    }
  };

  const handleRefreshCredit = async (provider) => {
    try {
      const response = await adminService.refreshSmsProviderCredit(provider.id);
      const result = response.data;

      if (result.success) {
        showToast(`💰 اعتبار: ${(result.credit || 0).toLocaleString()} ریال`, 'success');
        loadProviders();
      } else {
        showToast(`❌ ${result.error || 'دریافت اعتبار ناموفق'}`, 'error');
      }
    } catch (error) {
      console.error('Error refreshing credit:', error);
      showToast('خطا در دریافت اعتبار', 'error');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'هرگز';
    try {
      return new Date(dateStr).toLocaleString('fa-IR');
    } catch {
      return dateStr;
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="sms-provider-config">
      <div className="config-header">
        <h2>⚙️ پیکربندی Providers</h2>
        <p className="config-hint">
          در هر زمان فقط <strong>یکی از دو provider</strong> می‌تواند فعال باشد.
          برای فعال‌سازی، ابتدا کلید API و شماره خط را ذخیره کنید، سپس روی «فعال‌سازی» کلیک کنید.
        </p>
      </div>

      <div className="providers-grid">
        {providers.map((provider) => {
          const isEditing = editingProvider?.id === provider.id;
          const data = isEditing ? editingProvider : provider;

          return (
            <div
              key={provider.id}
              className={`provider-card ${provider.is_active ? 'active' : ''}`}
            >
              {/* ===== Header ===== */}
              <div className="provider-card-header">
                <div className="provider-title">
                  <span className="provider-icon">
                    {provider.provider === 'ghasedak' ? '📱' : '📲'}
                  </span>
                  <span className="provider-name">{provider.provider_display}</span>
                </div>
                <div className="provider-badges">
                  {provider.is_active && (
                    <span className="badge badge-active">✅ فعال</span>
                  )}
                  {!provider.is_active && provider.is_configured && (
                    <span className="badge badge-ready">🟢 آماده</span>
                  )}
                  {!provider.is_configured && (
                    <span className="badge badge-warning">⚠️ تنظیم نشده</span>
                  )}
                </div>
              </div>

              {/* ===== Body ===== */}
              <div className="provider-card-body">
                {/* API Key */}
                <div className="provider-field">
                  <label>🔑 کلید API</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={data.api_key || ''}
                      onChange={(e) => handleChange('api_key', e.target.value)}
                      placeholder="کلید API را وارد کنید"
                      dir="ltr"
                    />
                  ) : (
                    <div className="field-value" dir="ltr">
                      {provider.api_key
                        ? `${provider.api_key.substring(0, 20)}...${provider.api_key.slice(-8)}`
                        : '—'}
                    </div>
                  )}
                </div>

                {/* Line Number */}
                <div className="provider-field">
                  <label>📞 شماره خط</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={data.line_number || ''}
                      onChange={(e) => handleChange('line_number', e.target.value)}
                      placeholder="شماره خط اختصاصی"
                      dir="ltr"
                    />
                  ) : (
                    <div className="field-value" dir="ltr">{provider.line_number || '—'}</div>
                  )}
                </div>

                {/* Send Method */}
                <div className="provider-field">
                  <label>🎯 روش ارسال پیش‌فرض</label>
                  {isEditing ? (
                    <select
                      value={data.send_method || 'otp'}
                      onChange={(e) => handleChange('send_method', e.target.value)}
                    >
                      <option value="otp">OTP (با قالب)</option>
                      <option value="single">تکی (بدون قالب)</option>
                    </select>
                  ) : (
                    <div className="field-value">
                      {provider.send_method === 'otp' ? '📋 OTP (با قالب)' : '📝 تکی (بدون قالب)'}
                    </div>
                  )}
                </div>

                {/* Credit */}
                {provider.credit !== null && provider.credit !== undefined && (
                  <div className="provider-field">
                    <label>💰 اعتبار</label>
                    <div className="field-value credit-value">
                      {provider.credit.toLocaleString()} ریال
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div className="provider-field">
                  <label>📝 یادداشت</label>
                  {isEditing ? (
                    <textarea
                      value={data.notes || ''}
                      onChange={(e) => handleChange('notes', e.target.value)}
                      placeholder="یادداشت اختیاری..."
                      rows={2}
                    />
                  ) : (
                    <div className="field-value">{provider.notes || '—'}</div>
                  )}
                </div>

                {/* Last Checked */}
                <div className="provider-field">
                  <label>⏰ آخرین بررسی</label>
                  <div className="field-value">{formatDate(provider.last_checked_at)}</div>
                </div>
              </div>

              {/* ===== Actions ===== */}
              <div className="provider-card-actions">
                {isEditing ? (
                  <>
                    <button
                      className="btn-save"
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? '⏳ در حال ذخیره...' : '💾 ذخیره'}
                    </button>
                    <button
                      className="btn-cancel"
                      onClick={handleCancel}
                      disabled={saving}
                    >
                      انصراف
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="btn-edit"
                      onClick={() => handleEdit(provider)}
                    >
                      ✏️ ویرایش
                    </button>

                    <button
                      className="btn-test"
                      onClick={() => handleTest(provider)}
                      disabled={testing === provider.id || !provider.is_configured}
                    >
                      {testing === provider.id ? '⏳ در حال تست...' : '🔍 تست اتصال'}
                    </button>

                    {provider.provider === 'sms_ir' && (
                      <button
                        className="btn-credit"
                        onClick={() => handleRefreshCredit(provider)}
                        disabled={!provider.is_configured}
                      >
                        💰 دریافت اعتبار
                      </button>
                    )}

                    {!provider.is_active && (
                      <button
                        className="btn-activate"
                        onClick={() => handleActivate(provider)}
                        disabled={!provider.is_configured}
                      >
                        ✅ فعال‌سازی
                      </button>
                    )}

                    {provider.is_active && (
                      <span className="active-label">⚡ این provider فعال است</span>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SmsProviderConfig;