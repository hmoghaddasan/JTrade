// frontend/src/pages/Admin/Symbols/SymbolForm.js
import React, { useState, useEffect } from 'react';
import adminService from '../../../services/adminService';
import './SymbolForm.css';

const SymbolForm = ({ symbol, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    symbol: '',
    base_currency: '',
    quote_currency: '',
    pair_type: 'forex',
    description: '',
    is_active: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (symbol) {
      setFormData({
        symbol: symbol.symbol,
        base_currency: symbol.base_currency,
        quote_currency: symbol.quote_currency,
        pair_type: symbol.pair_type,
        description: symbol.description || '',
        is_active: symbol.is_active,
      });
    }
  }, [symbol]);

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
      if (symbol) {
        await adminService.updateSymbol(symbol.id, formData);
      } else {
        await adminService.createSymbol(formData);
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving symbol:', error);
      alert('خطا در ذخیره نماد');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{symbol ? 'ویرایش نماد' : 'افزودن نماد جدید'}</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>نماد *</label>
              <input
                type="text"
                name="symbol"
                value={formData.symbol}
                onChange={handleChange}
                placeholder="مثلاً: BTCUSD"
                required
                disabled={!!symbol}
              />
            </div>

            <div className="form-group">
              <label>ارز پایه *</label>
              <input
                type="text"
                name="base_currency"
                value={formData.base_currency}
                onChange={handleChange}
                placeholder="مثلاً: BTC"
                required
              />
            </div>

            <div className="form-group">
              <label>ارز متقابل *</label>
              <input
                type="text"
                name="quote_currency"
                value={formData.quote_currency}
                onChange={handleChange}
                placeholder="مثلاً: USD"
                required
              />
            </div>

            <div className="form-group">
              <label>نوع *</label>
              <select name="pair_type" value={formData.pair_type} onChange={handleChange} required>
                <option value="forex">فارکس</option>
                <option value="crypto">کریپتو</option>
                <option value="index">شاخص</option>
                <option value="commodity">کالا</option>
              </select>
            </div>

            <div className="form-group full-width">
              <label>توضیحات</label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="توضیحات نماد..."
              />
            </div>

            <div className="form-group checkbox-group full-width">
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

export default SymbolForm;