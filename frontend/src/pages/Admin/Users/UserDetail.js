// frontend/src/pages/Admin/Users/UserDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import adminService from '../../../services/adminService';
import LoadingSpinner from '../../../components/Admin/LoadingSpinner';
import StatusBadge from '../../../components/Admin/StatusBadge';
import './UserDetail.css';

const UserDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, [id]);

  const loadUser = async () => {
    setLoading(true);
    try {
      const response = await adminService.getUser(id);
      setUser(response.data);
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!user) return <div className="error">کاربر یافت نشد</div>;

  return (
    <div className="user-detail-page">
      <div className="page-header">
        <h1>جزئیات کاربر</h1>
        <div className="header-actions">
          <button onClick={() => navigate(`/admin/users/${id}/edit`)} className="btn-edit">
            ✏️ ویرایش
          </button>
          <button onClick={() => navigate('/admin/users')} className="btn-back">
            🔙 بازگشت
          </button>
        </div>
      </div>

      <div className="user-info-grid">
        <div className="info-card">
          <h3>اطلاعات شخصی</h3>
          <div className="info-row">
            <span className="label">شماره تلفن:</span>
            <span className="value">{user.phone_number}</span>
          </div>
          <div className="info-row">
            <span className="label">نام:</span>
            <span className="value">{user.full_name}</span>
          </div>
          <div className="info-row">
            <span className="label">ایمیل:</span>
            <span className="value">{user.email || '—'}</span>
          </div>
          <div className="info-row">
            <span className="label">وضعیت:</span>
            <StatusBadge status={user.is_active ? 'active' : 'inactive'} label={user.is_active ? 'فعال' : 'غیرفعال'} />
          </div>
          <div className="info-row">
            <span className="label">تایید شده:</span>
            <StatusBadge status={user.is_verified ? 'active' : 'inactive'} label={user.is_verified ? 'بله' : 'خیر'} />
          </div>
          <div className="info-row">
            <span className="label">ادمین:</span>
            <StatusBadge status={user.is_admin ? 'active' : 'inactive'} label={user.is_admin ? 'بله' : 'خیر'} />
          </div>
          <div className="info-row">
            <span className="label">تاریخ ثبت:</span>
            <span className="value">{new Date(user.created_at).toLocaleString('fa-IR')}</span>
          </div>
          <div className="info-row">
            <span className="label">آخرین ورود:</span>
            <span className="value">{user.last_login ? new Date(user.last_login).toLocaleString('fa-IR') : '—'}</span>
          </div>
        </div>

        <div className="info-card">
          <h3>اطلاعات اشتراک</h3>
          <div className="info-row">
            <span className="label">وضعیت اشتراک:</span>
            <StatusBadge status={user.subscription_status ? 'active' : 'inactive'} label={user.subscription_status ? 'فعال' : 'غیرفعال'} />
          </div>
          <div className="info-row">
            <span className="label">پلن:</span>
            <span className="value">{user.subscription_plan || '—'}</span>
          </div>
          <div className="info-row">
            <span className="label">تاریخ انقضا:</span>
            <span className="value">{user.subscription_expiry ? new Date(user.subscription_expiry).toLocaleDateString('fa-IR') : '—'}</span>
          </div>
          <div className="info-row">
            <span className="label">روزهای باقیمانده:</span>
            <span className="value">{user.remaining_days > 0 ? `${user.remaining_days} روز` : 'منقضی شده'}</span>
          </div>
          <div className="info-row">
            <span className="label">تریدهای باقیمانده:</span>
            <span className="value">{user.remaining_trades}</span>
          </div>
          <div className="info-row">
            <span className="label">مشاوره‌های باقیمانده:</span>
            <span className="value">{user.remaining_ai}</span>
          </div>
        </div>

        <div className="info-card">
          <h3>آمار عملکرد</h3>
          <div className="info-row">
            <span className="label">تعداد تریدها:</span>
            <span className="value">{user.total_trades}</span>
          </div>
          <div className="info-row">
            <span className="label">سود/زیان کل:</span>
            <span className="value" style={{ color: user.total_profit > 0 ? 'green' : user.total_profit < 0 ? 'red' : 'gray' }}>
              {user.total_profit.toLocaleString()} تومان
            </span>
          </div>
          <div className="info-row">
            <span className="label">تعداد مشاوره‌ها:</span>
            <span className="value">{user.total_consultations}</span>
          </div>
        </div>
      </div>

      {/* نمایش تریدهای اخیر کاربر */}
      {user.recent_trades && user.recent_trades.length > 0 && (
        <div className="info-card full-width">
          <h3>تریدهای اخیر</h3>
          <table className="mini-table">
            <thead>
              <tr>
                <th>تاریخ</th>
                <th>نماد</th>
                <th>نوع</th>
                <th>قیمت ورود</th>
                <th>سود/زیان</th>
              </tr>
            </thead>
            <tbody>
              {user.recent_trades.map((trade) => (
                <tr key={trade.id}>
                  <td>{new Date(trade.trade_date).toLocaleDateString('fa-IR')}</td>
                  <td>{trade.symbol}</td>
                  <td>{trade.trade_type}</td>
                  <td>{trade.entry_price}</td>
                  <td style={{ color: trade.profit > 0 ? 'green' : trade.profit < 0 ? 'red' : 'gray' }}>
                    {trade.profit?.toLocaleString() || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UserDetail;