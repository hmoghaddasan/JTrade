// frontend/src/pages/Admin/Users/UserEdit.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import adminService from '../../../services/adminService';
import LoadingSpinner from '../../../components/Admin/LoadingSpinner';
import './UserEdit.css';

const UserEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    is_active: true,
    is_admin: false,
    is_verified: true,
  });

  useEffect(() => {
    loadUser();
  }, [id]);

  const loadUser = async () => {
    setLoading(true);
    try {
      const response = await adminService.getUser(id);
      const user = response.data;
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        is_active: user.is_active,
        is_admin: user.is_admin,
        is_verified: user.is_verified,
      });
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
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
    setSaving(true);
    try {
      await adminService.updateUser(id, formData);
      navigate(`/admin/users/${id}`);
    } catch (error) {
      console.error('Error updating user:', error);
      alert('خطا در به‌روزرسانی کاربر');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="user-edit-page">
      <div className="page-header">
        <h1>ویرایش کاربر</h1>
        <button onClick={() => navigate(`/admin/users/${id}`)} className="btn-back">
          🔙 بازگشت
        </button>
      </div>

      <form onSubmit={handleSubmit} className="edit-form">
        <div className="form-grid">
          <div className="form-group">
            <label>نام</label>
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              placeholder="نام"
            />
          </div>

          <div className="form-group">
            <label>نام خانوادگی</label>
            <input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              placeholder="نام خانوادگی"
            />
          </div>

          <div className="form-group">
            <label>ایمیل</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="ایمیل"
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

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                name="is_admin"
                checked={formData.is_admin}
                onChange={handleChange}
              />
              ادمین
            </label>
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                name="is_verified"
                checked={formData.is_verified}
                onChange={handleChange}
              />
              تأیید شده
            </label>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" disabled={saving} className="btn-save">
            {saving ? 'در حال ذخیره...' : '💾 ذخیره تغییرات'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserEdit;