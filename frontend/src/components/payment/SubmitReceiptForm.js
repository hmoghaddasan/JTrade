// frontend/src/components/payment/SubmitReceiptForm.js
import React, { useState } from 'react';
import { useToast } from '../../contexts/ToastContext';
import RealApiService from '../../services/realApiService';
import './SubmitReceiptForm.css';

/**
 * فرم ثبت اطلاعات فیش واریزی
 * - شماره پیگیری (اجباری)
 * - نام واریزکننده
 * - ۴ رقم آخر کارت مبدأ
 * - تاریخ واریز
 * - تصویر فیش (اختیاری)
 * - یادداشت
 */
const SubmitReceiptForm = ({ paymentRequest, onSuccess, onCancel }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tracking_number: '',
    payer_name: '',
    payer_card_last4: '',
    paid_at: '',
    user_note: '',
  });
  const [receiptImage, setReceiptImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // بررسی حجم (حداکثر 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('❌ حجم تصویر نباید بیشتر از ۵ مگابایت باشد', 'error');
      return;
    }

    // بررسی نوع
    if (!file.type.startsWith('image/')) {
      showToast('❌ فقط فایل‌های تصویری مجاز هستند', 'error');
      return;
    }

    setReceiptImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.tracking_number.trim()) {
      newErrors.tracking_number = 'شماره پیگیری الزامی است';
    }
    if (formData.payer_card_last4 && !/^\d{4}$/.test(formData.payer_card_last4)) {
      newErrors.payer_card_last4 = '۴ رقم آخر کارت باید دقیقاً ۴ رقم عددی باشد';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const data = new FormData();
      data.append('tracking_number', formData.tracking_number.trim());
      if (formData.payer_name.trim()) {
        data.append('payer_name', formData.payer_name.trim());
      }
      if (formData.payer_card_last4) {
        data.append('payer_card_last4', formData.payer_card_last4);
      }
      if (formData.paid_at) {
        data.append('paid_at', formData.paid_at);
      }
      if (formData.user_note.trim()) {
        data.append('user_note', formData.user_note.trim());
      }
      if (receiptImage) {
        data.append('receipt_image', receiptImage);
      }

      const response = await RealApiService.submitPaymentReceipt(
        paymentRequest.id,
        data
      );

      if (response.data?.success) {
        // ✅ ارسال رویداد سراسری برای رفرش بنر
        window.dispatchEvent(new CustomEvent('payment-request-updated'));

        // ✅ فراخوانی onSuccess (که منجر به بستن مودال می‌شود)
        onSuccess(response.data.payment_request);
      } else {
        showToast(response.data?.error || 'خطا در ثبت اطلاعات', 'error');
      }
    } catch (error) {
      console.error('Error submitting receipt:', error);
      const errorMsg =
        error.response?.data?.error ||
        error.response?.data?.tracking_number?.[0] ||
        'خطا در ثبت اطلاعات فیش';
      showToast(`❌ ${errorMsg}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  
  return (
    <form className="submit-receipt-form" onSubmit={handleSubmit}>
      <div className="form-title">
        <span className="title-icon">📋</span>
        <h3>ثبت اطلاعات پرداخت</h3>
      </div>

      {/* شماره پیگیری */}
      <div className="form-group">
        <label>
          شماره پیگیری بانکی <span className="required">*</span>
        </label>
        <input
          type="text"
          name="tracking_number"
          value={formData.tracking_number}
          onChange={handleChange}
          placeholder="مثال: 123456789"
          className={errors.tracking_number ? 'error' : ''}
          dir="ltr"
          autoFocus
        />
        {errors.tracking_number && (
          <span className="field-error">{errors.tracking_number}</span>
        )}
      </div>

      {/* نام واریزکننده */}
      <div className="form-group">
        <label>نام واریزکننده</label>
        <input
          type="text"
          name="payer_name"
          value={formData.payer_name}
          onChange={handleChange}
          placeholder="نام و نام خانوادگی واریزکننده"
        />
      </div>

      {/* ۴ رقم آخر کارت */}
      <div className="form-group">
        <label>۴ رقم آخر کارت مبدأ</label>
        <input
          type="text"
          name="payer_card_last4"
          value={formData.payer_card_last4}
          onChange={handleChange}
          placeholder="1234"
          maxLength={4}
          dir="ltr"
          className={errors.payer_card_last4 ? 'error' : ''}
        />
        {errors.payer_card_last4 && (
          <span className="field-error">{errors.payer_card_last4}</span>
        )}
      </div>

      {/* تاریخ واریز */}
      <div className="form-group">
        <label>تاریخ و ساعت واریز</label>
        <input
          type="datetime-local"
          name="paid_at"
          value={formData.paid_at}
          onChange={handleChange}
        />
      </div>

      {/* تصویر فیش */}
      <div className="form-group">
        <label>تصویر فیش (اختیاری - حداکثر ۵ مگابایت)</label>
        <div className="file-upload-wrapper">
          <input
            type="file"
            id="receipt-image-input"
            accept="image/*"
            onChange={handleImageChange}
            style={{ display: 'none' }}
          />
          <label htmlFor="receipt-image-input" className="file-upload-label">
            <span className="upload-icon">📎</span>
            {receiptImage ? 'تغییر تصویر' : 'انتخاب تصویر'}
          </label>
          {receiptImage && (
            <span className="file-name">{receiptImage.name}</span>
          )}
        </div>
        {imagePreview && (
          <div className="image-preview">
            <img src={imagePreview} alt="پیش‌نمایش فیش" />
            <button
              type="button"
              className="remove-image"
              onClick={() => {
                setReceiptImage(null);
                setImagePreview(null);
              }}
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* یادداشت */}
      <div className="form-group">
        <label>یادداشت (اختیاری)</label>
        <textarea
          name="user_note"
          value={formData.user_note}
          onChange={handleChange}
          rows={2}
          placeholder="هر توضیح اضافه‌ای..."
        />
      </div>

      {/* Actions */}
      <div className="form-actions">
        <button
          type="button"
          className="btn-cancel"
          onClick={onCancel}
          disabled={loading}
        >
          انصراف
        </button>
        <button
          type="submit"
          className="btn-submit"
          disabled={loading}
        >
          {loading ? '⏳ در حال ثبت...' : '✓ ثبت اطلاعات'}
        </button>
      </div>
    </form>
  );
};

export default SubmitReceiptForm;