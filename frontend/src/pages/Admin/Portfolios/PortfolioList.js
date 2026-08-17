// frontend/src/pages/Admin/Portfolios/PortfolioList.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTheme } from '../../../contexts/ThemeContext';
import { useToast } from '../../../contexts/ToastContext';
import LoadingSpinner from '../../../components/Admin/LoadingSpinner';
import './PortfolioList.css';

const PortfolioList = () => {
  const { isDark } = useTheme();
  const { showToast } = useToast();
  const [portfolios, setPortfolios] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState(null);
  const [filterUser, setFilterUser] = useState('');
  const [formData, setFormData] = useState({
    user: '',
    name: '',
    description: '',
    icon: '📊',
    initial_balance: 0,
    is_active: true,
    is_default: false,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const [portfoliosRes, usersRes] = await Promise.all([
        axios.get('/api/admin/portfolios/', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        axios.get('/api/admin/users/', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const portfoliosData = portfoliosRes.data.results || portfoliosRes.data || [];
      setPortfolios(portfoliosData);
      setUsers(usersRes.data.results || usersRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('خطا در بارگذاری داده‌ها');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const url = editingPortfolio
        ? `/api/admin/portfolios/${editingPortfolio.id}/`
        : '/api/admin/portfolios/';
      const method = editingPortfolio ? 'put' : 'post';

      await axios[method](url, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      await loadData();
      setShowModal(false);
      resetForm();
      showToast(editingPortfolio ? '✅ پورتفولیو ویرایش شد' : '✅ پورتفولیو ایجاد شد', 'success');
    } catch (error) {
      console.error('Error saving portfolio:', error);
      setError(error.response?.data?.error || 'خطا در ذخیره');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('آیا از حذف این پورتفولیو اطمینان دارید؟')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/admin/portfolios/${id}/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      await loadData();
      showToast('✅ پورتفولیو حذف شد', 'success');
    } catch (error) {
      console.error('Error deleting portfolio:', error);
      setError(error.response?.data?.error || 'خطا در حذف');
    }
  };

  const handleEdit = (portfolio) => {
    setEditingPortfolio(portfolio);
    setFormData({
      user: portfolio.user || '',
      name: portfolio.name || '',
      description: portfolio.description || '',
      icon: portfolio.icon || '📊',
      initial_balance: portfolio.initial_balance || 0,
      is_active: portfolio.is_active !== undefined ? portfolio.is_active : true,
      is_default: portfolio.is_default || false,
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingPortfolio(null);
    setFormData({
      user: '',
      name: '',
      description: '',
      icon: '📊',
      initial_balance: 0,
      is_active: true,
      is_default: false,
    });
  };

  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user ? user.full_name || user.phone_number : 'نامشخص';
  };

  const filteredPortfolios = filterUser
    ? portfolios.filter(p => p.user === parseInt(filterUser))
    : portfolios;

  const icons = ['📊', '💰', '💎', '📈', '🏦', '💱', '🔮', '🧪', '⭐', '🔥', '🚀', '🎯'];

  if (loading && !showModal) return <LoadingSpinner />;

  return (
    <div className={`admin-portfolio-list ${isDark ? 'dark' : 'light'}`}>
      <div className="page-header">
        <h1>📊 مدیریت پورتفولیوها</h1>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-add">
          ➕ افزودن پورتفولیو
        </button>
      </div>

      <div className="filter-bar">
        <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)}>
          <option value="">همه کاربران</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>
              {u.full_name || u.phone_number}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="table-container">
        {filteredPortfolios.length === 0 ? (
          <div className="empty-state">هیچ پورتفولیویی یافت نشد</div>
        ) : (
          <table className="portfolios-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>آیکون</th>
                <th>نام</th>
                <th>کاربر</th>
                <th>سرمایه اولیه</th>
                <th>موجودی فعلی</th>
                <th>تعداد ترید</th>
                <th>وضعیت</th>
                <th>پیش‌فرض</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {filteredPortfolios.map(p => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td className="icon-cell">{p.icon || '📊'}</td>
                  <td><strong>{p.name}</strong></td>
                  <td>{getUserName(p.user)}</td>
                  <td>{p.initial_balance ? Number(p.initial_balance).toFixed(2) : '0'}</td>
                  <td className={p.current_balance >= 0 ? 'positive' : 'negative'}>
                    {p.current_balance !== undefined && p.current_balance !== null
                      ? `$${Number(p.current_balance).toFixed(2)}`
                      : '$0.00'}
                  </td>
                  <td>{p.total_trades || 0}</td>
                  <td>
                    <span className={`status-badge ${p.is_active ? 'active' : 'inactive'}`}>
                      {p.is_active ? 'فعال' : 'غیرفعال'}
                    </span>
                  </td>
                  <td>{p.is_default ? '✅' : ''}</td>
                  <td>
                    <div className="actions">
                      <button onClick={() => handleEdit(p)} className="btn-edit">✏️</button>
                      <button onClick={() => handleDelete(p.id)} className="btn-delete">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* مودال */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingPortfolio ? '✏️ ویرایش پورتفولیو' : '➕ پورتفولیو جدید'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>کاربر *</label>
                <select
                  value={formData.user}
                  onChange={(e) => setFormData({...formData, user: e.target.value})}
                  required
                  disabled={editingPortfolio}
                >
                  <option value="">انتخاب کاربر</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.full_name || u.phone_number}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>نام پورتفولیو *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  placeholder="مثلاً: حساب شخصی"
                />
              </div>

              <div className="form-group">
                <label>آیکون</label>
                <div className="icon-selector">
                  {icons.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      className={`icon-btn ${formData.icon === icon ? 'selected' : ''}`}
                      onClick={() => setFormData({...formData, icon})}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>سرمایه اولیه (دلار)</label>
                <input
                  type="number"
                  value={formData.initial_balance}
                  onChange={(e) => setFormData({...formData, initial_balance: parseFloat(e.target.value) || 0})}
                  min="0"
                  step="100"
                />
              </div>

              <div className="form-group">
                <label>توضیحات</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows="2"
                  placeholder="توضیحات اختیاری..."
                />
              </div>

              <div className="form-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({...formData, is_default: e.target.checked})}
                  />
                  پورتفولیو پیش‌فرض
                </label>
                <label className="checkbox-label">
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

export default PortfolioList;