// frontend/src/pages/Admin/Users/SendSMSModal.js
import React, { useState, useEffect, useMemo } from 'react';
import adminService from '../../../services/adminService';
import './SendSMSModal.css';

// برچسب فارسی برای پارامترها
const PARAM_LABELS = {
  code: 'کد تایید',
  user_name: 'نام کاربر',
  plan_name: 'نام پلن',
  days: 'تعداد روز',
  end_date: 'تاریخ انقضا',
  amount: 'مبلغ (تومان)',
  reason: 'دلیل / یادداشت',
  subject: 'موضوع پیام',
  trial_days: 'تعداد روز آزمایشی',
  message: 'متن پیام',
  provider: 'ارائه‌دهنده',
  error_type: 'نوع خطا',
  error_code: 'کد خطا',
  error_message: 'پیام خطا',
  time: 'زمان',
  // param1..param10
  param1: 'پارامتر ۱',
  param2: 'پارامتر ۲',
  param3: 'پارامتر ۳',
  param4: 'پارامتر ۴',
  param5: 'پارامتر ۵',
  param6: 'پارامتر ۶',
  param7: 'پارامتر ۷',
  param8: 'پارامتر ۸',
  param9: 'پارامتر ۹',
  param10: 'پارامتر ۱۰',
  // نام‌های دیگر
  Code: 'کد تایید',
  PARAM1: 'پارامتر ۱',
  PARAM2: 'پارامتر ۲',
  PARAM3: 'پارامتر ۳',
  PARAM4: 'پارامتر ۴',
  PARAM5: 'پارامتر ۵',
  PARAM6: 'پارامتر ۶',
  PARAM7: 'پارامتر ۷',
  PARAM8: 'پارامتر ۸',
  PARAM9: 'پارامتر ۹',
  PARAM10: 'پارامتر ۱۰',
};

// ✅ راهنمای هر پارامتر (بر اساس نام)
const PARAM_HINTS = {
  param1: '⚠️ این پارامتر برای قالب قاصدک است. اگر خالی بگذارید، کد تصادفی تولید می‌شود.',
  param2: 'نام کامل کاربر (مثال: حسین مقدسان)',
  param3: 'نام پلن اشتراک (مثال: پایه، حرفه‌ای، VIP)',
  param4: 'تعداد روز (عدد صحیح، مثال: 30)',
  param5: 'تاریخ انقضا به فرمت YYYY/MM/DD',
  param6: 'مبلغ به تومان (مثال: 250000)',
  param7: 'دلیل یا یادداشت (متن آزاد)',
  param8: 'موضوع پیام (متن کوتاه)',
  param9: 'تعداد روز دوره آزمایشی',
  param10: 'متن پیام (چند خطی)',
  code: 'کد ۶ رقمی تایید',
  user_name: 'نام کامل کاربر',
  plan_name: 'نام پلن اشتراک',
  days: 'تعداد روز (عدد صحیح)',
  end_date: 'تاریخ انقضا (YYYY/MM/DD)',
  amount: 'مبلغ به تومان',
  reason: 'دلیل یا یادداشت',
  subject: 'موضوع پیام',
  trial_days: 'تعداد روز دوره آزمایشی',
  message: 'متن پیام',
  provider: 'نام provider (قاصدک/sms.ir)',
  error_type: 'نوع خطا',
  error_code: 'کد خطا',
  error_message: 'متن خطا',
  time: 'زمان خطا',
};

const SendSMSModal = ({ onClose, onSuccess, initialUserIds = [] }) => {
  const [message, setMessage] = useState('');
  const [sendToAll, setSendToAll] = useState(initialUserIds.length === 0);
  const [useTemplate, setUseTemplate] = useState(false);
  const [templateEvent, setTemplateEvent] = useState('');
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [paramValues, setParamValues] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [result, setResult] = useState(null);

  // بارگذاری قالب‌ها وقتی تیک زده می‌شود
  useEffect(() => {
    if (useTemplate) {
      loadTemplates();
    }
  }, [useTemplate]);

  // وقتی قالب انتخاب شد، فرم پارامترها را reset کن
  useEffect(() => {
    if (templateEvent) {
      const t = templates.find(x => x.event_key === templateEvent);
      setSelectedTemplate(t || null);

      if (t) {
        // ✅ تعیین لیست پارامترها بر اساس send_method و provider
        let paramNames = [];

        const ghasedakParams = t.ghasedak_params || [];
        const smsirParams = t.smsir_params || [];
        const singleParams = t.single_params || [];

        if (t.send_method === 'otp') {
          // برای OTP، پارامترهای provider را استفاده کن
          // (اگر ghasedak_params خالی بود، از smsir_params استفاده کن)
          if (ghasedakParams.length > 0) {
            paramNames = [...ghasedakParams];
          } else if (smsirParams.length > 0) {
            paramNames = [...smsirParams];
          }
        } else {
          // برای single، از single_params استفاده کن (مثلاً ['message'])
          paramNames = [...singleParams];
        }

        // حذف تکراری‌ها (case-insensitive)
        const seen = new Set();
        paramNames = paramNames.filter(p => {
          const key = p.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        // ساخت initial values
        const initial = {};
        paramNames.forEach(p => { initial[p] = ''; });
        setParamValues(initial);

        console.log('📋 Template selected:', t.event_key);
        console.log('   send_method:', t.send_method);
        console.log('   ghasedak_params:', ghasedakParams);
        console.log('   smsir_params:', smsirParams);
        console.log('   single_params:', singleParams);
        console.log('   → final paramNames:', paramNames);
      }
    } else {
      setSelectedTemplate(null);
      setParamValues({});
    }
  }, [templateEvent, templates]);

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const response = await adminService.getSmsTemplates();
      const data = response.data.results || response.data;
      const activeTemplates = (Array.isArray(data) ? data : []).filter(t => t.is_active);
      setTemplates(activeTemplates);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleParamChange = (key, value) => {
    setParamValues(prev => ({ ...prev, [key]: value }));
  };

  // ✅ برچسب فارسی برای پارامتر
  const getParamLabel = (key) => {
    // اول برچسب مستقیم
    if (PARAM_LABELS[key]) return PARAM_LABELS[key];
    if (PARAM_LABELS[key.toLowerCase()]) return PARAM_LABELS[key.toLowerCase()];
    if (PARAM_LABELS[key.toUpperCase()]) return PARAM_LABELS[key.toUpperCase()];

    return key;
  };

  // ✅ راهنمای پارامتر
  const getParamHint = (key) => {
    if (PARAM_HINTS[key]) return PARAM_HINTS[key];
    if (PARAM_HINTS[key.toLowerCase()]) return PARAM_HINTS[key.toLowerCase()];
    if (PARAM_HINTS[key.toUpperCase()]) return PARAM_HINTS[key.toUpperCase()];
    return '';
  };

  // ✅ آیا این پارامتر مربوط به متن طولانی است؟
  const isLongTextField = (key) => {
    const lower = key.toLowerCase();
    return (
      lower === 'message' ||
      lower === 'reason' ||
      lower === 'error_message' ||
      lower === 'param7' ||
      lower === 'param10'
    );
  };

  // پیش‌نمایش پیام بر اساس قالب
  const previewMessage = useMemo(() => {
    if (!selectedTemplate) return '';

    if (selectedTemplate.send_method === 'single') {
      // برای single، متن single_message را با مقادیر جایگزین کن
      let text = selectedTemplate.single_message || '';
      Object.keys(paramValues).forEach(key => {
        const value = paramValues[key] || `{${key}}`;
        text = text.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
      });
      return text;
    } else {
      // برای OTP، پارامترها را نمایش بده
      let text = `[قالب ${selectedTemplate.ghasedak_template || selectedTemplate.smsir_template_id}]\n\n`;
      Object.keys(paramValues).forEach(key => {
        text += `${getParamLabel(key)}: ${paramValues[key] || '—'}\n`;
      });
      return text;
    }
  }, [selectedTemplate, paramValues]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // اعتبارسنجی
    if (useTemplate) {
      if (!templateEvent) {
        alert('لطفاً یک قالب انتخاب کنید');
        return;
      }

      // ✅ بررسی پر بودن پارامترها
      // استثنا: param1 (کد OTP) در قالب otp_login می‌تواند خالی باشد (خودکار پر می‌شود)
      const isOtpLogin = selectedTemplate?.event_key === 'otp_login';
      const emptyParams = Object.keys(paramValues).filter(k => {
        const isEmpty = !paramValues[k] || !paramValues[k].toString().trim();
        if (!isEmpty) return false;

        // اگر OTP login است و پارامتر مربوط به code است، اجازه خالی بودن بده
        if (isOtpLogin) {
          const lower = k.toLowerCase();
          if (lower === 'param1' || lower === 'code') {
            return false;
          }
        }
        return true;
      });

      if (emptyParams.length > 0) {
        alert(`لطفاً مقادیر زیر را پر کنید:\n${emptyParams.map(getParamLabel).join('\n')}`);
        return;
      }
    } else {
      if (!message.trim()) {
        alert('لطفاً متن پیامک را وارد کنید');
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        user_ids: sendToAll ? [] : initialUserIds,
        send_to_all: sendToAll,
        use_template: useTemplate,
        template_event: useTemplate ? templateEvent : '',
      };

      if (!useTemplate) {
        payload.message = message;
      } else {
        // ✅ context = مقادیر پارامترها با کلید اصلی (همان نام در ghasedak_params/smsir_params)
        // این context مستقیماً به backend ارسال می‌شود و backend مقدار را از context[pname] می‌خواند
        const context = {};

        Object.keys(paramValues).forEach(key => {
          const value = paramValues[key];
          if (value === null || value === undefined || String(value).trim() === '') {
            return;
          }
          context[key] = value;
        });

        console.log('📤 Sending context:', context);
        payload.context = context;
      }

      const response = await adminService.sendSMS(payload);
      setResult(response.data);
      setTimeout(onSuccess, 2000);
    } catch (error) {
      setResult({ error: error.response?.data?.error || 'خطا در ارسال پیامک' });
    } finally {
      setLoading(false);
    }
  };

  const getMethodBadge = (template) => {
    if (template.send_method === 'otp') {
      return <span className="badge badge-otp">📋 OTP</span>;
    }
    return <span className="badge badge-single">📝 تکی (سرشماره)</span>;
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content sms-send-modal">
        <h2>📱 ارسال پیامک</h2>
        <form onSubmit={handleSubmit}>

          {/* ===== Send To All ===== */}
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={sendToAll}
                onChange={(e) => setSendToAll(e.target.checked)}
              />
              ارسال به همه کاربران فعال
            </label>
          </div>

          {!sendToAll && initialUserIds.length > 0 && (
            <div className="info-box">
              📤 ارسال به <strong>{initialUserIds.length}</strong> کاربر انتخاب‌شده
            </div>
          )}

          {/* ===== Use Template Toggle ===== */}
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={useTemplate}
                onChange={(e) => setUseTemplate(e.target.checked)}
              />
              استفاده از قالب آماده
            </label>
            <small className="hint">
              با فعال کردن این گزینه، لیست قالب‌های آماده نمایش داده می‌شود.
            </small>
          </div>

          {/* ===== Template Selector ===== */}
          {useTemplate && (
            <div className="form-group">
              <label>📋 انتخاب قالب</label>
              {loadingTemplates ? (
                <div className="loading-templates">⏳ در حال بارگذاری...</div>
              ) : templates.length === 0 ? (
                <div className="empty-templates">هیچ قالب فعالی یافت نشد</div>
              ) : (
                <select
                  value={templateEvent}
                  onChange={(e) => setTemplateEvent(e.target.value)}
                  required={useTemplate}
                  className="template-select"
                >
                  <option value="">--- انتخاب کنید ---</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.event_key}>
                      {t.event_name} ({t.event_key}) — {t.send_method === 'otp' ? 'OTP' : 'تکی'}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* ===== Selected Template Info ===== */}
          {selectedTemplate && (
            <div className="template-info-box">
              <div className="template-info-header">
                <strong>{selectedTemplate.event_name}</strong>
                {getMethodBadge(selectedTemplate)}
              </div>
              {selectedTemplate.description && (
                <p className="template-info-desc">{selectedTemplate.description}</p>
              )}
            </div>
          )}

          {/* ===== Dynamic Parameter Form ===== */}
          {useTemplate && selectedTemplate && Object.keys(paramValues).length > 0 && (
            <div className="params-form">
              <label className="form-title">📝 مقادیر پارامترها</label>
              <small className="hint" style={{ marginBottom: '12px', display: 'block' }}>
                این مقادیر به عنوان context به backend ارسال می‌شوند و با نام اصلی به provider فرستاده می‌شوند.
              </small>
              {Object.keys(paramValues).map((key) => (
                <div key={key} className="param-field">
                  <label>
                    {getParamLabel(key)}
                    <span className="param-key">({key})</span>
                  </label>
                  {isLongTextField(key) ? (
                    <textarea
                      value={paramValues[key]}
                      onChange={(e) => handleParamChange(key, e.target.value)}
                      rows={3}
                      placeholder={`مقدار ${getParamLabel(key)}...`}
                    />
                  ) : (
                    <input
                      type="text"
                      value={paramValues[key]}
                      onChange={(e) => handleParamChange(key, e.target.value)}
                      placeholder={`مقدار ${getParamLabel(key)}...`}
                    />
                  )}
                  {getParamHint(key) && (
                    <small
                      className="hint"
                      style={{
                        marginTop: '4px',
                        display: 'block',
                        fontSize: '11px',
                        color: '#6c757d',
                      }}
                    >
                      💡 {getParamHint(key)}
                    </small>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ===== Live Preview ===== */}
          {useTemplate && selectedTemplate && previewMessage && (
            <div className="preview-box">
              <label className="form-title">👁️ پیش‌نمایش پیام</label>
              <div className="preview-content">{previewMessage}</div>
            </div>
          )}

          {/* ===== Free Text (بدون قالب) ===== */}
          {!useTemplate && (
            <div className="form-group">
              <label>📝 متن پیامک (الزامی)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="متن پیامک را وارد کنید..."
                rows={5}
                required
              />
              <small className="hint">
                تعداد کاراکترها: {message.length}
              </small>
            </div>
          )}

          {/* ===== Result ===== */}
          {result && (
            <div className={`result-box ${result.error ? 'error' : 'success'}`}>
              {result.error || `${result.sent_count || 0} پیامک با موفقیت ارسال شد`}
              {result.failed_count > 0 && ` (${result.failed_count} خطا)`}
            </div>
          )}

          {/* ===== Actions ===== */}
          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={loading}>
              انصراف
            </button>
            <button type="submit" disabled={loading} className="btn-send">
              {loading ? '⏳ در حال ارسال...' : '📤 ارسال پیامک'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SendSMSModal;