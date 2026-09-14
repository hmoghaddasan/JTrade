// frontend/src/pages/Admin/SMS/SmsTemplates.js

import React, { useState, useEffect } from 'react';
import adminService from '../../../services/adminService';
import { useToast } from '../../../contexts/ToastContext';
import LoadingSpinner from '../../../components/Admin/LoadingSpinner';
import './SmsTemplates.css';

const SmsTemplates = () => {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filterActive, setFilterActive] = useState('all');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const response = await adminService.getSmsTemplates();
      const data = response.data.results || response.data;
      setTemplates(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading templates:', error);
      showToast('خطا در بارگذاری قالب‌ها', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate({
      ...template,
      send_method: template.send_method || 'single', // ✅ مقدار پیش‌فرض
      ghasedak_params_text: (template.ghasedak_params || []).join(', '),
      smsir_params_text: (template.smsir_params || []).join(', '),
      single_params_text: (template.single_params || []).join(', '),
    });
  };

  const handleCancel = () => {
    setEditingTemplate(null);
  };

  const handleChange = (field, value) => {
    setEditingTemplate(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!editingTemplate) return;

    setSaving(true);
    try {
      const payload = {
        event_name: editingTemplate.event_name,
        description: editingTemplate.description,
        send_method: editingTemplate.send_method, // ✅ ارسال send_method
        ghasedak_template: editingTemplate.ghasedak_template,
        ghasedak_params: (editingTemplate.ghasedak_params_text || '')
          .split(',').map(p => p.trim()).filter(Boolean),
        smsir_template_id: editingTemplate.smsir_template_id
          ? parseInt(editingTemplate.smsir_template_id) : null,
        smsir_params: (editingTemplate.smsir_params_text || '')
          .split(',').map(p => p.trim()).filter(Boolean),
        single_message: editingTemplate.single_message,
        single_params: (editingTemplate.single_params_text || '')
          .split(',').map(p => p.trim()).filter(Boolean),
        is_active: editingTemplate.is_active,
      };

      await adminService.updateSmsTemplate(editingTemplate.id, payload);
      showToast('✅ قالب با موفقیت ذخیره شد', 'success');
      setEditingTemplate(null);
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      showToast('خطا در ذخیره قالب', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredTemplates = templates.filter(t => {
    if (filterActive === 'active') return t.is_active;
    if (filterActive === 'inactive') return !t.is_active;
    return true;
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="sms-templates">
      {/* ===== Header ===== */}
      <div className="templates-header">
        <div>
          <h2>📋 قالب‌های پیامک</h2>
          <p className="templates-hint">
            برای هر رویداد، سه نسخه تعریف کنید:
            <br />
            🅰️ <strong>قالب قاصدک</strong> (OTP با نام قالب) &nbsp;|&nbsp;
            🅱️ <strong>قالب sms.ir</strong> (با شناسه قالب) &nbsp;|&nbsp;
            🅲 <strong>متن تکی</strong> (بدون قالب، با متغیرها)
          </p>
        </div>

        <div className="templates-filter">
          <button
            className={`filter-btn ${filterActive === 'all' ? 'active' : ''}`}
            onClick={() => setFilterActive('all')}
          >
            همه ({templates.length})
          </button>
          <button
            className={`filter-btn ${filterActive === 'active' ? 'active' : ''}`}
            onClick={() => setFilterActive('active')}
          >
            فعال ({templates.filter(t => t.is_active).length})
          </button>
          <button
            className={`filter-btn ${filterActive === 'inactive' ? 'active' : ''}`}
            onClick={() => setFilterActive('inactive')}
          >
            غیرفعال ({templates.filter(t => !t.is_active).length})
          </button>
        </div>
      </div>

      {/* ===== Templates List ===== */}
      <div className="templates-list">
        {filteredTemplates.map((template) => {
          const isEditing = editingTemplate?.id === template.id;
          const data = isEditing ? editingTemplate : template;

          return (
            <div
              key={template.id}
              className={`template-card ${template.is_active ? '' : 'inactive'}`}
            >
              {/* ===== Card Header ===== */}
              <div className="template-card-header">
                <div className="template-title">
                  <span className="template-event-key">{template.event_key}</span>
                  <span className="template-event-name">{template.event_name}</span>
                  {template.is_system && (
                    <span className="template-system-badge">🔒 سیستمی</span>
                  )}
                </div>
                <div className="template-status">
                  {template.is_active ? (
                    <span className="status-active">✅ فعال</span>
                  ) : (
                    <span className="status-inactive">⛔ غیرفعال</span>
                  )}
                </div>
              </div>

              {/* ===== Description ===== */}
              {template.description && (
                <p className="template-description">{template.description}</p>
              )}

              {/* ===== Send Method Selector ===== */}
              <div className="template-send-method">
                <label className="send-method-label">
                  <strong>روش ارسال:</strong>
                </label>
                {isEditing ? (
                  <select
                    value={data.send_method || 'single'}
                    onChange={(e) => handleChange('send_method', e.target.value)}
                    className="send-method-select"
                  >
                    <option value="single">📝 ارسال تکی (متن ساده)</option>
                    <option value="otp">🔐 ارسال OTP (با قالب provider)</option>
                  </select>
                ) : (
                  <span className={`send-method-badge ${template.send_method}`}>
                    {template.send_method === 'otp' ? '🔐 OTP (قالب)' : '📝 تکی (متن)'}
                  </span>
                )}
              </div>

              {/* ===== Three Columns ===== */}
              <div className="template-columns">
                {/* Column 1: Ghasedak */}
                <div className="template-column ghasedak">
                  <div className="column-header">
                    <span className="column-icon">📱</span>
                    <span className="column-title">قاصدک (OTP)</span>
                  </div>

                  {isEditing ? (
                    <>
                      <div className="field">
                        <label>نام قالب</label>
                        <input
                          type="text"
                          value={data.ghasedak_template || ''}
                          onChange={(e) => handleChange('ghasedak_template', e.target.value)}
                          placeholder="مثال: Verify"
                          dir="ltr"
                        />
                      </div>
                      <div className="field">
                        <label>پارامترها (با کاما جدا کنید)</label>
                        <input
                          type="text"
                          value={data.ghasedak_params_text || ''}
                          onChange={(e) => handleChange('ghasedak_params_text', e.target.value)}
                          placeholder="مثال: param1"
                          dir="ltr"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="field-value">
                        <span className="field-label">نام قالب:</span>
                        <strong dir="ltr">{template.ghasedak_template || '—'}</strong>
                      </div>
                      <div className="field-value">
                        <span className="field-label">پارامترها:</span>
                        <div className="params-list">
                          {(template.ghasedak_params || []).length > 0 ? (
                            template.ghasedak_params.map((p, i) => (
                              <span key={i} className="param-chip">{p}</span>
                            ))
                          ) : (
                            <span className="empty-value">—</span>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Column 2: SMS.IR */}
                <div className="template-column smsir">
                  <div className="column-header">
                    <span className="column-icon">📲</span>
                    <span className="column-title">sms.ir (Verify)</span>
                  </div>

                  {isEditing ? (
                    <>
                      <div className="field">
                        <label>شناسه قالب (ID)</label>
                        <input
                          type="number"
                          value={data.smsir_template_id || ''}
                          onChange={(e) => handleChange('smsir_template_id', e.target.value)}
                          placeholder="مثال: 201692"
                          dir="ltr"
                        />
                      </div>
                      <div className="field">
                        <label>پارامترها (با کاما جدا کنید)</label>
                        <input
                          type="text"
                          value={data.smsir_params_text || ''}
                          onChange={(e) => handleChange('smsir_params_text', e.target.value)}
                          placeholder="مثال: CODE"
                          dir="ltr"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="field-value">
                        <span className="field-label">شناسه قالب:</span>
                        <strong dir="ltr">{template.smsir_template_id || '—'}</strong>
                      </div>
                      <div className="field-value">
                        <span className="field-label">پارامترها:</span>
                        <div className="params-list">
                          {(template.smsir_params || []).length > 0 ? (
                            template.smsir_params.map((p, i) => (
                              <span key={i} className="param-chip">{p}</span>
                            ))
                          ) : (
                            <span className="empty-value">—</span>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Column 3: Single Message */}
                <div className="template-column single">
                  <div className="column-header">
                    <span className="column-icon">📝</span>
                    <span className="column-title">متن تکی</span>
                  </div>

                  {isEditing ? (
                    <>
                      <div className="field">
                        <label>متن پیام</label>
                        <textarea
                          value={data.single_message || ''}
                          onChange={(e) => handleChange('single_message', e.target.value)}
                          placeholder="مثال: کد ورود: {code}"
                          rows={4}
                        />
                      </div>
                      <div className="field">
                        <label>متغیرها (با کاما جدا کنید)</label>
                        <input
                          type="text"
                          value={data.single_params_text || ''}
                          onChange={(e) => handleChange('single_params_text', e.target.value)}
                          placeholder="مثال: code, user_name"
                          dir="ltr"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="single-message-preview">
                        {template.single_message || '—'}
                      </div>
                      <div className="field-value">
                        <span className="field-label">متغیرها:</span>
                        <div className="params-list">
                          {(template.single_params || []).length > 0 ? (
                            template.single_params.map((p, i) => (
                              <span key={i} className="param-chip">{`{${p}}`}</span>
                            ))
                          ) : (
                            <span className="empty-value">—</span>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* ===== Card Actions ===== */}
              <div className="template-card-actions">
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

                    {isEditing && (
                      <label className="toggle-active">
                        <input
                          type="checkbox"
                          checked={data.is_active || false}
                          onChange={(e) => handleChange('is_active', e.target.checked)}
                        />
                        <span>فعال باشد</span>
                      </label>
                    )}
                  </>
                ) : (
                  <button
                    className="btn-edit"
                    onClick={() => handleEdit(template)}
                  >
                    ✏️ ویرایش قالب
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filteredTemplates.length === 0 && (
          <div className="empty-state">
            <p>هیچ قالبی یافت نشد</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmsTemplates;