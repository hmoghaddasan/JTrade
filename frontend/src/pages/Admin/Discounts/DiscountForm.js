// frontend/src/pages/Admin/Discounts/DiscountForm.js
import React, { useState, useEffect } from 'react';
import adminService from '../../../services/adminService';
import './DiscountForm.css';

const DiscountForm = ({ discount, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    code: '',
    discount_percent: 10,
    max_uses: 0,
    plan: null,
    is_active: true,
    expires_at: '',
    description: '',
  });
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPlans();
    if (discount) {
      setFormData({
        code: discount.code,
        discount_percent: discount.discount_percent,
        max_uses: discount.max_uses || 0,
        plan: discount.plan || null,
        is_active: discount.is_active,
        expires_at: discount.expires_at ? discount.expires_at.split('T')[0] : '',
        description: discount.description || '',
      });
    }
  }, [discount]);

  const loadPlans = async () => {
    try {
      const response = await adminService.getPlans();
      setPlans(response.data);
    } catch (error) {
      console.error('Error loading plans:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = {
        ...formData,
        max_uses: parseInt(formData.max_uses) || 0,
        discount_percent: parseFloat(formData.discount_percent) || 0,
      };
      if (discount) {
        await adminService.updateDiscount(discount.id, data);
      } else {
        await adminService.createDiscount(data);
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving discount:', error);
      alert('خطا در ذخیره کد تخفیف');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{discount ? 'ویرایش کد تخفیف' : 'ایجاد کد تخفیف جدید'}</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>کد تخفیف *</label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                placeholder="مثلاً: SUMMER2024"
                required
              />
            </div>

            <div className="form-group">
              <label>درصد تخفیف *</label>
              <input
                type="number"
                name="discount_percent"
                value={formData.discount_percent}
                onChange={handleChange}
                min="1"
                max="100"
                required
              />
            </div>

            <div className="form-group">
              <label>حداکثر تعداد استفاده</label>
              <input
                type="number"
                name="max_uses"
                value={formData.max_uses}
                onChange={handleChange}
                min="0"
                placeholder="۰ = نامحدود"
              />
            </div>

            <div className="form-group">
              <label>پلن مربوطه</label>
              <select name="plan" value={formData.plan || ''} onChange={handleChange}>
                <option value="">همه پلن‌ها</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>{p.plan_name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>تاریخ انقضا</label>
              <input
                type="date"
                name="expires_at"
                value={formData.expires_at}
                onChange={handleChange}
              />
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                />
                فعال
              </label>
            </div>
          </div>

          <div className="form-group">
            <label>توضیحات</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="توضیحات کد تخفیف..."
            />
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={loading}>
              انصراف
            </button>
            <button type="submit" disabled={loading}>
              {loading ? 'در حال ذخیره...' : '💾 ذخیره'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DiscountForm;