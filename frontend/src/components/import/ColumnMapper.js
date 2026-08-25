// frontend/src/components/import/ColumnMapper.js
import React from 'react';
import './ColumnMapper.css';

const ColumnMapper = ({
  headers,
  suggestedMapping,
  columnMapping,
  onMappingChange,
  detectedBroker,
  savedMappings,
  onApplySavedMapping,
  onNext,
  onBack,
}) => {
  // ✅ اضافه شدن time_ny به لیست فیلدها
  const modelFields = [
    { key: 'trade_date', label: '📅 تاریخ', required: true },
    { key: 'time_ny', label: '⏰ ساعت (به وقت نیویورک)', required: false },   // ← اضافه شد
    { key: 'symbol', label: '🔠 نماد', required: true },
    { key: 'trade_type', label: '🔄 جهت (Buy/Sell)' },
    { key: 'entry_price', label: '💰 قیمت ورود' },
    { key: 'close_price', label: '💸 قیمت خروج' },
    { key: 'stop_loss', label: '🛑 حد ضرر' },
    { key: 'take_profit', label: '🎯 حد سود' },
    { key: 'profit', label: '📊 سود/زیان' },
    { key: 'lots', label: '📦 حجم (لات)' },
    { key: 'commission', label: '🧾 کارمزد' },
    { key: 'swap', label: '🔄 سواپ' },
    { key: 'ticket', label: '🎫 شماره ترید' },
    { key: 'close_reason', label: '📝 دلیل بسته شدن' },
    { key: 'bias', label: '📈 جهت‌گیری (Bullish/Bearish/Neutral)' },
    { key: 'strategy_type', label: '📋 نوع استراتژی (LTP/ITP/STP)' },
  ];

  const handleFieldChange = (fieldKey, value) => {
    const newMapping = { ...columnMapping };
    if (value === '') {
      delete newMapping[fieldKey];
    } else {
      newMapping[fieldKey] = value;
    }
    onMappingChange(newMapping);
  };

  const getFieldStatus = (fieldKey) => {
    const mapped = !!columnMapping[fieldKey];
    const suggested = !!suggestedMapping[fieldKey];
    if (mapped) return 'mapped';
    if (suggested) return 'suggested';
    return 'empty';
  };

  return (
    <div className="column-mapper">
      <h2>🔗 نگاشت ستون‌ها</h2>
      {detectedBroker && (
        <div className="detected-broker">
          ✅ کارگزار شناسایی‌شده: <strong>{detectedBroker}</strong>
        </div>
      )}

      {savedMappings.length > 0 && (
        <div className="saved-mappings">
          <span>نگاشت‌های ذخیره‌شده:</span>
          {savedMappings.map((m) => (
            <button
              key={m.id}
              className="btn-saved-mapping"
              onClick={() => onApplySavedMapping(m)}
            >
              {m.broker_name || 'پیش‌فرض'}
            </button>
          ))}
        </div>
      )}

      <div className="mapping-grid">
        {modelFields.map((field) => (
          <div key={field.key} className="mapping-row">
            <div className="field-label">
              {field.label}
              {field.required && <span className="required-star">*</span>}
            </div>
            <div className="field-select-wrapper">
              <select
                value={columnMapping[field.key] || ''}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                className={`field-select ${getFieldStatus(field.key)}`}
              >
                <option value="">— انتخاب کنید —</option>
                {headers.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
              {getFieldStatus(field.key) === 'suggested' && (
                <span className="badge-suggested">پیشنهادی</span>
              )}
              {getFieldStatus(field.key) === 'mapped' && (
                <span className="badge-mapped">✓</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mapper-actions">
        <button className="btn-secondary" onClick={onBack}>→ قبلی</button>
        <button className="btn-primary" onClick={onNext}>بعدی ←</button>
      </div>
    </div>
  );
};

export default ColumnMapper;