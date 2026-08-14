// frontend/src/pages/Admin/Subscriptions/SubscriptionList.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../../../services/adminService';
import DataTable from '../../../components/Admin/DataTable';
import FilterBar from '../../../components/Admin/FilterBar';
import StatusBadge from '../../../components/Admin/StatusBadge';
import ExtendModal from './ExtendModal';
import GiftModal from './GiftModal';
import './SubscriptionList.css';

const SubscriptionList = () => {
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [filters, setFilters] = useState({});
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState(null);

  const columns = [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'user_phone', label: 'شماره تلفن' },
    { key: 'user_name', label: 'نام کاربر' },
    { key: 'plan_name', label: 'پلن' },
    {
      key: 'is_active',
      label: 'وضعیت',
      render: (val) => <StatusBadge status={val ? 'active' : 'inactive'} label={val ? 'فعال' : 'غیرفعال'} />
    },
    {
      key: 'is_trial',
      label: 'آزمایشی',
      render: (val) => <StatusBadge status={val ? 'orange' : 'gray'} label={val ? 'بله' : 'خیر'} />
    },
    {
      key: 'remaining_days',
      label: 'روزهای باقیمانده',
      render: (val) => <span style={{ color: val < 7 ? '#dc3545' : val < 30 ? '#e67e22' : '#28a745' }}>{val}</span>
    },
    {
      key: 'end_date',
      label: 'تاریخ انقضا',
      render: (val) => new Date(val).toLocaleDateString('fa-IR')
    },
    { key: 'amount_paid', label: 'مبلغ پرداختی', render: (val) => `${val?.toLocaleString()} تومان` },
  ];

  const actions = [
    {
      label: 'جزئیات',
      icon: '👁️',
      onClick: (row) => navigate(`/admin/subscriptions/${row.id}`)
    },
    {
      label: 'تمدید',
      icon: '📅',
      className: 'success',
      onClick: (row) => {
        setSelectedSubscription(row);
        setShowExtendModal(true);
      }
    }
  ];

  useEffect(() => {
    loadSubscriptions();
  }, [page, filters]);

  const loadSubscriptions = async () => {
    setLoading(true);
    try {
      const response = await adminService.getSubscriptions({
        page,
        page_size: pageSize,
        ...filters
      });
      setSubscriptions(response.data.results || response.data);
      setTotal(response.data.count || response.data.length || 0);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (newFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  return (
    <div className="subscription-list-page">
      <div className="page-header">
        <h1>مدیریت اشتراک‌ها</h1>
        <div className="header-actions">
          <button onClick={() => setShowGiftModal(true)} className="btn-gift">
            🎁 هدیه گروهی
          </button>
        </div>
      </div>

      <FilterBar
        fields={[
          { key: 'search', label: 'جستجو', type: 'text', placeholder: 'شماره تلفن، نام...' },
          { key: 'is_active', label: 'وضعیت', type: 'select', options: [{ value: '', label: 'همه' }, { value: 'true', label: 'فعال' }, { value: 'false', label: 'غیرفعال' }] },
          { key: 'is_trial', label: 'آزمایشی', type: 'select', options: [{ value: '', label: 'همه' }, { value: 'true', label: 'بله' }, { value: 'false', label: 'خیر' }] },
          { key: 'payment_status', label: 'وضعیت پرداخت', type: 'select', options: [{ value: '', label: 'همه' }, { value: 'paid', label: 'پرداخت شده' }, { value: 'pending', label: 'در انتظار' }, { value: 'failed', label: 'خطا' }] },
        ]}
        onFilter={handleFilter}
        initialValues={filters}
      />

      <DataTable
        columns={columns}
        data={subscriptions}
        loading={loading}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onRowClick={(row) => navigate(`/admin/subscriptions/${row.id}`)}
        actions={actions}
      />

      {showExtendModal && (
        <ExtendModal
          subscription={selectedSubscription}
          onClose={() => setShowExtendModal(false)}
          onSuccess={loadSubscriptions}
        />
      )}

      {showGiftModal && (
        <GiftModal
          onClose={() => setShowGiftModal(false)}
          onSuccess={loadSubscriptions}
        />
      )}
    </div>
  );
};

export default SubscriptionList;