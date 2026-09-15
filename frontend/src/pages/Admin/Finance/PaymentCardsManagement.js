// frontend/src/pages/Admin/Finance/PaymentCardsManagement.js
import React, { useState, useEffect } from 'react';
import adminService from '../../../services/adminService';
import DataTable from '../../../components/Admin/DataTable';
import StatusBadge from '../../../components/Admin/StatusBadge';
import { useToast } from '../../../contexts/ToastContext';
import './PaymentCardsManagement.css';

const PaymentCardsManagement = () => {
  const { showToast } = useToast();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [formData, setFormData] = useState({
    card_number: '',
    card_holder: '',
    bank_name: '',
    is_active: true,
    is_default: false,
    order_index: 0,
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // ============================================
  // ✅ State جدید برای حالت انتخاب کارت
  // ============================================
  const [selectionMode, setSelectionMode] = useState('random');
  const [originalSelectionMode, setOriginalSelectionMode] = useState('random');
  const [loadingMode, setLoadingMode] = useState(true);
  const [savingMode, setSavingMode] = useState(false);

  // ============================================
  // بارگذاری کارت‌ها
  // ============================================
  const loadCards = async () => {
    setLoading(true);
    try {
      const response = await adminService.getPaymentCards();
      setCards(response.data?.results || response.data || []);
    } catch (error) {
      console.error('Error loading cards:', error);
      showToast('خطا در بارگذاری کارت‌ها', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // ✅ بارگذاری حالت انتخاب کارت از تنظیمات
  // ============================================
  const loadSelectionMode = async () => {
    setLoadingMode(true);
    try {
      const response = await adminService.getSettings();
      const allSettings = response.data?.results || response.data || [];

      const modeSetting = allSettings.find(
        (s) => s.setting_key === 'payment_card_selection_mode'
      );

      if (modeSetting && modeSetting.setting_value) {
        setSelectionMode(modeSetting.setting_value);
        setOriginalSelectionMode(modeSetting.setting_value);
      }
    } catch (error) {
      console.error('Error loading selection mode:', error);
      showToast('خطا در بارگذاری حالت انتخاب کارت', 'error');
    } finally {
      setLoadingMode(false);
    }
  };

  useEffect(() => {
    loadCards();
    loadSelectionMode();
  }, []);

  // ============================================
  // ✅ ذخیره حالت انتخاب کارت
  // ============================================
  const handleSaveSelectionMode = async () => {
    if (selectionMode === originalSelectionMode) {
      showToast('ℹ️ تغییری برای ذخیره وجود ندارد', 'info');
      return;
    }

    setSavingMode(true);
    try {
      const payload = {
        payment_card_selection_mode: selectionMode,
      };

      await adminService.updateSettings(payload);
      setOriginalSelectionMode(selectionMode);
      showToast('✅ حالت انتخاب کارت با موفقیت ذخیره شد', 'success');
    } catch (error) {
      console.error('Error saving selection mode:', error);
      showToast('❌ خطا در ذخیره حالت انتخاب کارت', 'error');
      setSelectionMode(originalSelectionMode);
    } finally {
      setSavingMode(false);
    }
  };

  // ============================================
  // ✅ انصراف از تغییر حالت
  // ============================================
  const handleCancelSelectionMode = () => {
    setSelectionMode(originalSelectionMode);
  };

  // ============================================
  // باز کردن مودال ایجاد
  // ============================================
  const handleCreate = () => {
    setEditingCard(null);
    setFormData({
      card_number: '',
      card_holder: '',
      bank_name: '',
      is_active: true,
      is_default: cards.length === 0,
      order_index: cards.length,
      notes: '',
    });
    setErrors({});
    setShowModal(true);
  };

  // ============================================
  // باز کردن مودال ویرایش
  // ============================================
  const handleEdit = (card) => {
    setEditingCard(card);
    setFormData({
      card_number: card.card_number || '',
      card_holder: card.card_holder || '',
      bank_name: card.bank_name || '',
      is_active: card.is_active ?? true,
      is_default: card.is_default ?? false,
      order_index: card.order_index ?? 0,
      notes: card.notes || '',
    });
    setErrors({});
    setShowModal(true);
  };

  // ============================================
  // تغییر مقادیر فرم
  // ============================================
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  // ============================================
  // اعتبارسنجی
  // ============================================
  const validate = () => {
    const newErrors = {};
    if (!formData.card_number.trim()) {
      newErrors.card_number = 'شماره کارت الزامی است';
    } else if (!/^\d{16}$/.test(formData.card_number.trim())) {
      newErrors.card_number = 'شماره کارت باید ۱۶ رقم عددی باشد';
    }
    if (!formData.card_holder.trim()) {
      newErrors.card_holder = 'نام صاحب کارت الزامی است';
    }
    if (!formData.bank_name.trim()) {
      newErrors.bank_name = 'نام بانک الزامی است';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ============================================
  // ذخیره کارت (ایجاد یا ویرایش)
  // ============================================
  const handleSubmit = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        card_number: formData.card_number.trim(),
        card_holder: formData.card_holder.trim(),
        bank_name: formData.bank_name.trim(),
        is_active: formData.is_active,
        is_default: formData.is_default,
        order_index: Number(formData.order_index) || 0,
        notes: formData.notes || '',
      };

      if (editingCard) {
        await adminService.updatePaymentCard(editingCard.id, payload);
        showToast('✅ کارت با موفقیت به‌روزرسانی شد', 'success');
      } else {
        await adminService.createPaymentCard(payload);
        showToast('✅ کارت با موفقیت ایجاد شد', 'success');
      }

      setShowModal(false);
      await loadCards();
    } catch (error) {
      console.error('Error saving card:', error);
      const errorMsg =
        error.response?.data?.error ||
        error.response?.data?.card_number?.[0] ||
        error.response?.data?.message ||
        'خطا در ذخیره کارت';
      showToast(`❌ ${errorMsg}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // حذف کارت
  // ============================================
  const handleDelete = async (card) => {
    if (!window.confirm(`آیا از حذف کارت «${card.card_holder} - ${card.bank_name}» اطمینان دارید؟`)) {
      return;
    }

    try {
      await adminService.deletePaymentCard(card.id);
      showToast('✅ کارت با موفقیت حذف شد', 'success');
      await loadCards();
    } catch (error) {
      console.error('Error deleting card:', error);
      const errorMsg =
        error.response?.data?.error ||
        'خطا در حذف کارت. اگر این کارت در درخواست‌ها استفاده شده باشد، فقط می‌توانید آن را غیرفعال کنید.';
      showToast(`❌ ${errorMsg}`, 'error');
    }
  };

  // ============================================
  // ✅ Toggle پیش‌فرض: تنظیم یا حذف
  // ============================================
  const handleToggleDefault = async (card) => {
    if (!card.is_active) {
      showToast('❌ ابتدا کارت را فعال کنید', 'error');
      return;
    }

    try {
      if (card.is_default) {
        // برداشتن پیش‌فرض با PUT کامل
        await adminService.updatePaymentCard(card.id, {
          card_number: card.card_number,
          card_holder: card.card_holder,
          bank_name: card.bank_name,
          is_active: card.is_active,
          is_default: false,
          order_index: card.order_index,
          notes: card.notes || '',
        });
        showToast('✅ پیش‌فرض برداشته شد', 'success');
      } else {
        // تنظیم به‌عنوان پیش‌فرض با action اختصاصی
        await adminService.setDefaultPaymentCard(card.id);
        showToast('✅ کارت به‌عنوان پیش‌فرض تنظیم شد', 'success');
      }
      await loadCards();
    } catch (error) {
      console.error('Error toggling default:', error);
      showToast(error.response?.data?.error || 'خطا در تغییر پیش‌فرض', 'error');
    }
  };

  // ============================================
  // فعال/غیرفعال
  // ============================================
  const handleToggle = async (card) => {
    try {
      await adminService.togglePaymentCard(card.id);
      showToast(`✅ کارت ${card.is_active ? 'غیرفعال' : 'فعال'} شد`, 'success');
      await loadCards();
    } catch (error) {
      console.error('Error toggling card:', error);
      showToast(error.response?.data?.error || 'خطا در تغییر وضعیت کارت', 'error');
    }
  };

  // ============================================
  // ستون‌های جدول
  // ============================================
  const columns = [
    { key: 'id', label: 'ID' },
    {
      key: 'card_number',
      label: 'شماره کارت',
      render: (val) => (
        <span style={{ fontFamily: 'monospace', fontSize: '13px' }} dir="ltr">
          {val ? val.match(/.{1,4}/g)?.join(' - ') : '-'}
        </span>
      ),
    },
    { key: 'card_holder', label: 'صاحب کارت' },
    { key: 'bank_name', label: 'بانک' },
    {
      key: 'is_default',
      label: 'پیش‌فرض',
      render: (val) =>
        val ? (
          <span
            style={{
              background: 'linear-gradient(135deg, #ffd54f, #ffb300)',
              color: '#4a3800',
              padding: '4px 10px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '700',
              whiteSpace: 'nowrap',
              display: 'inline-block',
            }}
          >
            ⭐ پیش‌فرض
          </span>
        ) : (
          <span style={{ color: '#adb5bd', fontSize: '12px' }}>—</span>
        ),
    },
    {
      key: 'is_active',
      label: 'وضعیت',
      render: (val) => (
        <StatusBadge
          status={val ? 'green' : 'gray'}
          label={val ? '✅ فعال' : '⛔ غیرفعال'}
        />
      ),
    },
    {
      key: 'usage_count',
      label: 'تعداد استفاده',
      render: (val) => val || 0,
    },
    {
      key: 'order_index',
      label: 'ترتیب',
      render: (val) => val || 0,
    },
  ];

  // ============================================
  // دکمه‌های عملیات
  // ============================================
  const actions = [
    {
      icon: '✏️',
      label: 'ویرایش',
      className: '',
      onClick: handleEdit,
    },
    {
      icon: '⭐',
      label: 'پیش‌فرض',
      className: 'success',
      onClick: (row) => handleToggleDefault(row),
    },
    {
      icon: '🔄',
      label: 'تغییر وضعیت',
      className: '',
      onClick: handleToggle,
    },
    {
      icon: '🗑️',
      label: 'حذف',
      className: 'danger',
      onClick: handleDelete,
    },
  ];

  return (
    <div className="payment-cards-management">
      {/* ===== Header ===== */}
      <div className="page-header">
        <h1>🏦 مدیریت کارت‌های بانکی</h1>
        <button className="btn-add-card" onClick={handleCreate}>
          ➕ افزودن کارت جدید
        </button>
      </div>

      {/* ============================================ */}
      {/* ✅ بخش تنظیم حالت انتخاب کارت                */}
      {/* ============================================ */}
      <div className="selection-mode-section">
        <div className="selection-mode-header">
          <h3>🎯 حالت انتخاب کارت برای کاربر</h3>
          <p className="selection-mode-hint">
            تعیین کنید که هنگام پرداخت کارت به کارت، کدام کارت به کاربر نمایش داده شود.
          </p>
        </div>

        {loadingMode ? (
          <div className="selection-mode-loading">⏳ در حال بارگذاری...</div>
        ) : (
          <>
            <div className="selection-mode-options">
              <label className={`mode-option ${selectionMode === 'default' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="selection_mode"
                  value="default"
                  checked={selectionMode === 'default'}
                  onChange={(e) => setSelectionMode(e.target.value)}
                />
                <div className="mode-option-content">
                  <div className="mode-option-icon">⭐</div>
                  <div className="mode-option-info">
                    <div className="mode-option-title">کارت پیش‌فرض</div>
                    <div className="mode-option-desc">
                      کارتی که با علامت ⭐ مشخص شده، به کاربر نمایش داده می‌شود.
                    </div>
                  </div>
                </div>
              </label>

              <label className={`mode-option ${selectionMode === 'random' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="selection_mode"
                  value="random"
                  checked={selectionMode === 'random'}
                  onChange={(e) => setSelectionMode(e.target.value)}
                />
                <div className="mode-option-content">
                  <div className="mode-option-icon">🎲</div>
                  <div className="mode-option-info">
                    <div className="mode-option-title">انتخاب تصادفی (رندوم)</div>
                    <div className="mode-option-desc">
                      هر بار یکی از کارت‌های فعال به صورت تصادفی انتخاب می‌شود.
                    </div>
                  </div>
                </div>
              </label>

              <label className={`mode-option ${selectionMode === 'manual' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="selection_mode"
                  value="manual"
                  checked={selectionMode === 'manual'}
                  onChange={(e) => setSelectionMode(e.target.value)}
                />
                <div className="mode-option-content">
                  <div className="mode-option-icon">✋</div>
                  <div className="mode-option-info">
                    <div className="mode-option-title">انتخاب دستی توسط کاربر</div>
                    <div className="mode-option-desc">
                      کاربر از بین کارت‌های فعال، خودش یکی را انتخاب می‌کند.
                    </div>
                  </div>
                </div>
              </label>
            </div>

            {selectionMode !== originalSelectionMode && (
              <div className="selection-mode-actions">
                <button
                  className="btn-cancel-mode"
                  onClick={handleCancelSelectionMode}
                  disabled={savingMode}
                >
                  انصراف
                </button>
                <button
                  className="btn-save-mode"
                  onClick={handleSaveSelectionMode}
                  disabled={savingMode}
                >
                  {savingMode ? '⏳ در حال ذخیره...' : '💾 ذخیره حالت انتخاب'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ===== Table ===== */}
      <DataTable
        columns={columns}
        data={cards}
        loading={loading}
        total={cards.length}
        page={1}
        pageSize={Math.max(cards.length, 20)}
        onPageChange={() => {}}
        actions={actions}
        emptyMessage="هیچ کارت بانکی تعریف نشده است. اولین کارت را اضافه کنید."
      />

      {/* ===== Modal ===== */}
      {showModal && (
        <div className="modal-overlay" onClick={() => !saving && setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingCard ? '✏️ ویرایش کارت' : '➕ افزودن کارت جدید'}</h2>
              <button
                className="modal-close"
                onClick={() => !saving && setShowModal(false)}
                disabled={saving}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              {/* شماره کارت */}
              <div className="form-group">
                <label>
                  شماره کارت <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={formData.card_number}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 16);
                    handleChange('card_number', val);
                  }}
                  placeholder="6037991234567890"
                  dir="ltr"
                  maxLength={16}
                  className={errors.card_number ? 'error' : ''}
                />
                {errors.card_number && (
                  <span className="field-error">{errors.card_number}</span>
                )}
                {formData.card_number.length > 0 && (
                  <span className="field-hint" dir="ltr">
                    {formData.card_number.match(/.{1,4}/g)?.join(' - ')}
                  </span>
                )}
              </div>

              {/* نام صاحب کارت */}
              <div className="form-group">
                <label>
                  نام صاحب کارت <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={formData.card_holder}
                  onChange={(e) => handleChange('card_holder', e.target.value)}
                  placeholder="مثال: حسین مقدسان"
                  className={errors.card_holder ? 'error' : ''}
                />
                {errors.card_holder && (
                  <span className="field-error">{errors.card_holder}</span>
                )}
              </div>

              {/* نام بانک */}
              <div className="form-group">
                <label>
                  نام بانک <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={formData.bank_name}
                  onChange={(e) => handleChange('bank_name', e.target.value)}
                  placeholder="مثال: بانک ملی ایران"
                  className={errors.bank_name ? 'error' : ''}
                />
                {errors.bank_name && (
                  <span className="field-error">{errors.bank_name}</span>
                )}
              </div>

              {/* ترتیب */}
              <div className="form-group">
                <label>ترتیب نمایش</label>
                <input
                  type="number"
                  value={formData.order_index}
                  onChange={(e) => handleChange('order_index', e.target.value)}
                  placeholder="0"
                  min="0"
                />
                <span className="field-hint">
                  عدد کوچکتر، بالاتر نمایش داده می‌شود.
                </span>
              </div>

              {/* چک‌باکس‌ها */}
              <div className="checkbox-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => handleChange('is_active', e.target.checked)}
                  />
                  <span>فعال باشد</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.is_default}
                    onChange={(e) => handleChange('is_default', e.target.checked)}
                  />
                  <span>کارت پیش‌فرض</span>
                </label>
              </div>

              {/* یادداشت */}
              <div className="form-group">
                <label>یادداشت</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="هر توضیح اضافه‌ای..."
                  rows={2}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowModal(false)}
                disabled={saving}
              >
                انصراف
              </button>
              <button
                className="btn-save"
                onClick={handleSubmit}
                disabled={saving}
              >
                {saving ? '⏳ در حال ذخیره...' : editingCard ? '💾 ذخیره تغییرات' : '➕ افزودن کارت'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentCardsManagement;