// frontend/src/pages/Admin/Subscriptions/PlanList.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import LoadingSpinner from '../../../components/Admin/LoadingSpinner';
import './PlanList.css';

const PlanList = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({
    plan_name: '',
    plan_type: 'basic',
    duration_days: 30,
    monthly_trades_limit: 10,
    monthly_ai_consultations_limit: 5,
    price: 0,
    is_active: true,
    description: ''
  });

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/admin/subscription-plans/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('📊 Plans loaded:', response.data);
      const data = response.data.results || response.data;
      setPlans(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading plans:', error);
      setError('خطا در بارگذاری پلن‌ها');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const url = editingPlan
        ? `/api/admin/subscription-plans/${editingPlan.id}/`
        : '/api/admin/subscription-plans/';
      const method = editingPlan ? 'put' : 'post';

      await axios[method](url, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      await loadPlans();
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving plan:', error);
      setError(error.response?.data?.error || 'خطا در ذخیره پلن');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('آیا از حذف این پلن اطمینان دارید؟')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/admin/subscription-plans/${id}/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      await loadPlans();
    } catch (error) {
      console.error('Error deleting plan:', error);
      setError(error.response?.data?.error || 'خطا در حذف پلن');
    }
  };

  const handleEdit = (plan) => {
    console.log('✏️ Editing plan:', plan);
    if (!plan) {
      console.error('❌ Plan is undefined!');
      return;
    }
    setEditingPlan(plan);
    setFormData({
      plan_name: plan.plan_name || '',
      plan_type: plan.plan_type || 'basic',
      duration_days: plan.duration_days || 30,
      monthly_trades_limit: plan.monthly_trades_limit || 10,
      monthly_ai_consultations_limit: plan.monthly_ai_consultations_limit || 5,
      price: plan.price || 0,
      is_active: plan.is_active !== undefined ? plan.is_active : true,
      description: plan.description || ''
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingPlan(null);
    setFormData({
      plan_name: '',
      plan_type: 'basic',
      duration_days: 30,
      monthly_trades_limit: 10,
      monthly_ai_consultations_limit: 5,
      price: 0,
      is_active: true,
      description: ''
    });
  };

  const getPlanTypeDisplay = (type) => {
    const map = {
      'basic': 'پایه',
      'professional': 'حرفه‌ای',
      'vip': 'VIP'
    };
    return map[type] || type;
  };

  const getPriceDisplay = (price) => {
    return price ? `${Number(price).toLocaleString()} تومان` : 'رایگان';
  };

  if (loading && !showModal) return <LoadingSpinner />;

  return (
    <div className="plan-list-page">
      <div className="page-header">
        <h1>📊 مدیریت پلن‌های اشتراک</h1>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-add">
          ➕ افزودن پلن جدید
        </button>
      </div>

      {error && (
        <div className="alert error">
          <span className="alert-icon">❌</span>
          {error}
          <button onClick={() => setError(null)} className="alert-close">×</button>
        </div>
      )}

      {plans.length === 0 ? (
        <div className="empty-message">
          <p>هیچ پلنی یافت نشد</p>
        </div>
      ) : (
        <div className="plans-table">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>نام پلن</th>
                <th>نوع</th>
                <th>مدت (روز)</th>
                <th>محدودیت ترید</th>
                <th>مشاوره AI</th>
                <th>قیمت</th>
                <th>وضعیت</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.id}>
                  <td>{plan.id}</td>
                  <td><strong>{plan.plan_name}</strong></td>
                  <td>{getPlanTypeDisplay(plan.plan_type)}</td>
                  <td>{plan.duration_days}</td>
                  <td>{plan.monthly_trades_limit}</td>
                  <td>{plan.monthly_ai_consultations_limit}</td>
                  <td className="price">{getPriceDisplay(plan.price)}</td>
                  <td>
                    <span className={`status-badge ${plan.is_active ? 'active' : 'inactive'}`}>
                      {plan.is_active ? 'فعال' : 'غیرفعال'}
                    </span>
                  </td>
                  <td>
                    <div className="actions">
                      <button
                        onClick={() => handleEdit(plan)}
                        className="btn-edit"
                        title="ویرایش"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(plan.id)}
                        className="btn-delete"
                        title="حذف"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal افزودن/ویرایش پلن */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingPlan ? '✏️ ویرایش پلن' : '➕ افزودن پلن جدید'}</h2>
              <button className="btn-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="plan-form">
              <div className="form-group">
                <label>نام پلن *</label>
                <input
                  type="text"
                  value={formData.plan_name}
                  onChange={(e) => setFormData({...formData, plan_name: e.target.value})}
                  required
                  placeholder="مثل: پایه، حرفه‌ای، VIP"
                />
              </div>

              <div className="form-group">
                <label>نوع پلن *</label>
                <select
                  value={formData.plan_type}
                  onChange={(e) => setFormData({...formData, plan_type: e.target.value})}
                  required
                >
                  <option value="basic">پایه</option>
                  <option value="professional">حرفه‌ای</option>
                  <option value="vip">VIP</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>مدت (روز) *</label>
                  <input
                    type="number"
                    value={formData.duration_days}
                    onChange={(e) => setFormData({...formData, duration_days: parseInt(e.target.value) || 0})}
                    required
                    min="1"
                  />
                </div>
                <div className="form-group">
                  <label>قیمت (تومان) *</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                    required
                    min="0"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>محدودیت ترید در ماه</label>
                  <input
                    type="number"
                    value={formData.monthly_trades_limit}
                    onChange={(e) => setFormData({...formData, monthly_trades_limit: parseInt(e.target.value) || 0})}
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>محدودیت مشاوره AI در ماه</label>
                  <input
                    type="number"
                    value={formData.monthly_ai_consultations_limit}
                    onChange={(e) => setFormData({...formData, monthly_ai_consultations_limit: parseInt(e.target.value) || 0})}
                    min="0"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>توضیحات</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows="3"
                  placeholder="توضیحات کامل پلن..."
                />
              </div>

              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  />
                  فعال
                </label>
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">
                  لغو
                </button>
                <button type="submit" className="btn-save" disabled={loading}>
                  {loading ? 'در حال ذخیره...' : '💾 ذخیره'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanList;