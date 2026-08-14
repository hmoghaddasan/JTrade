// frontend/src/pages/Admin/Users/UserList.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../../../services/adminService';
import DataTable from '../../../components/Admin/DataTable';
import FilterBar from '../../../components/Admin/FilterBar';
import ExportButton from '../../../components/Admin/ExportButton';
import SendSMSModal from './SendSMSModal';
import StatusBadge from '../../../components/Admin/StatusBadge';
import './UserList.css';

const UserList = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [filters, setFilters] = useState({});
  const [showSMSModal, setShowSMSModal] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);

  const columns = [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'phone_number', label: 'شماره تلفن', sortable: true },
    { key: 'full_name', label: 'نام', sortable: true },
    { key: 'email', label: 'ایمیل' },
    {
      key: 'subscription_status',
      label: 'اشتراک',
      render: (val) => <StatusBadge status={val ? 'active' : 'inactive'} label={val ? 'فعال' : 'غیرفعال'} />
    },
    {
      key: 'remaining_days',
      label: 'روزهای باقیمانده',
      render: (val) => val > 0 ? `${val} روز` : '—'
    },
    {
      key: 'total_trades',
      label: 'تعداد ترید',
      sortable: true
    },
    {
      key: 'total_profit',
      label: 'سود کل',
      render: (val) => <span style={{ color: val > 0 ? 'green' : val < 0 ? 'red' : 'gray' }}>{val.toLocaleString()}</span>
    },
    {
      key: 'created_at',
      label: 'تاریخ ثبت',
      render: (val) => new Date(val).toLocaleDateString('fa-IR')
    }
  ];

  const actions = [
    {
      label: 'جزئیات',
      icon: '👁️',
      onClick: (row) => navigate(`/admin/users/${row.id}`)
    },
    {
      label: 'ویرایش',
      icon: '✏️',
      onClick: (row) => navigate(`/admin/users/${row.id}/edit`)
    },
    {
      label: 'ارسال پیامک',
      icon: '📱',
      onClick: (row) => {
        setSelectedUsers([row.id]);
        setShowSMSModal(true);
      }
    }
  ];

  useEffect(() => {
    loadUsers();
  }, [page, filters]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await adminService.getUsers({
        page,
        page_size: pageSize,
        ...filters
      });
      setUsers(response.data.results || response.data);
      setTotal(response.data.count || response.data.length || 0);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (newFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleExport = () => {
    adminService.exportUsers(filters).then((response) => {
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `users_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
    });
  };

  return (
    <div className="user-list-page">
      <div className="page-header">
        <h1>مدیریت کاربران</h1>
        <div className="header-actions">
          <button onClick={() => setShowSMSModal(true)} className="btn-sms">📱 ارسال پیامک گروهی</button>
          <ExportButton onExport={handleExport} />
        </div>
      </div>

      <FilterBar
        fields={[
          { key: 'search', label: 'جستجو', type: 'text', placeholder: 'شماره تلفن، نام...' },
          { key: 'is_active', label: 'وضعیت', type: 'select', options: [{ value: '', label: 'همه' }, { value: 'true', label: 'فعال' }, { value: 'false', label: 'غیرفعال' }] },
          { key: 'is_admin', label: 'ادمین', type: 'select', options: [{ value: '', label: 'همه' }, { value: 'true', label: 'بله' }, { value: 'false', label: 'خیر' }] },
          { key: 'has_subscription', label: 'اشتراک فعال', type: 'select', options: [{ value: '', label: 'همه' }, { value: 'true', label: 'دارد' }, { value: 'false', label: 'ندارد' }] },
        ]}
        onFilter={handleFilter}
        initialValues={filters}
      />

      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onRowClick={(row) => navigate(`/admin/users/${row.id}`)}
        actions={actions}
      />

      {showSMSModal && (
        <SendSMSModal
          onClose={() => setShowSMSModal(false)}
          onSuccess={() => {
            setShowSMSModal(false);
            loadUsers();
          }}
          initialUserIds={selectedUsers}
        />
      )}
    </div>
  );
};

export default UserList;