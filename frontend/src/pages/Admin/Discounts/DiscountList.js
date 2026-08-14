// frontend/src/pages/Admin/Discounts/DiscountList.js
import React, { useState, useEffect } from 'react';
import adminService from '../../../services/adminService';
import DataTable from '../../../components/Admin/DataTable';
import FilterBar from '../../../components/Admin/FilterBar';
import StatusBadge from '../../../components/Admin/StatusBadge';
import DiscountForm from './DiscountForm';
import './DiscountList.css';

const DiscountList = () => {
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [filters, setFilters] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);

  const columns = [
    { key: 'code', label: 'کد تخفیف' },
    { key: 'discount_percent', label: 'درصد تخفیف', render: (val) => `${val}%` },
    { key: 'plan_name', label: 'پلن مربوطه' },
    { key: 'used_count', label: 'تعداد استفاده', render: (val, row) => `${val} / ${row.max_uses || 'نامحدود'}` },
    { key: 'usage_percentage', label: 'درصد استفاده', render: (val) => `${val}%` },
    {
      key: 'is_active',
      label: 'وضعیت',
      render: (val) => <StatusBadge status={val ? 'active' : 'inactive'} label={val ? 'فعال' : 'غیرفعال'} />
    },
    {
      key: 'is_valid',
      label: 'اعتبار',
      render: (val) => <StatusBadge status={val ? 'green' : 'red'} label={val ? 'معتبر' : 'منقضی شده'} />
    },
    {
      key: 'expires_at',
      label: 'تاریخ انقضا',
      render: (val) => val ? new Date(val).toLocaleDateString('fa-IR') : 'نامحدود'
    },
  ];

  const actions = [
    {
      label: 'ویرایش',
      icon: '✏️',
      onClick: (row) => {
        setEditingDiscount(row);
        setShowForm(true);
      }
    },
    {
      label: 'حذف',
      icon: '🗑️',
      className: 'danger',
      onClick: async (row) => {
        if (window.confirm(`آیا از حذف کد تخفیف "${row.code}" اطمینان دارید؟`)) {
          try {
            await adminService.deleteDiscount(row.id);
            loadDiscounts();
          } catch (error) {
            console.error('Error deleting discount:', error);
            alert('خطا در حذف کد تخفیف');
          }
        }
      }
    }
  ];

  useEffect(() => {
    loadDiscounts();
  }, [page, filters]);

  const loadDiscounts = async () => {
    setLoading(true);
    try {
      const response = await adminService.getDiscounts({
        page,
        page_size: pageSize,
        ...filters
      });
      setDiscounts(response.data.results || response.data);
      setTotal(response.data.count || response.data.length || 0);
    } catch (error) {
      console.error('Error loading discounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (newFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingDiscount(null);
  };

  const handleFormSuccess = () => {
    loadDiscounts();
    handleFormClose();
  };

  return (
    <div className="discount-list-page">
      <div className="page-header">
        <h1>مدیریت کدهای تخفیف</h1>
        <button onClick={() => setShowForm(true)} className="btn-add">
          ➕ ایجاد تخفیف جدید
        </button>
      </div>

      <FilterBar
        fields={[
          { key: 'search', label: 'جستجو', type: 'text', placeholder: 'کد تخفیف...' },
          { key: 'is_active', label: 'وضعیت', type: 'select', options: [{ value: '', label: 'همه' }, { value: 'true', label: 'فعال' }, { value: 'false', label: 'غیرفعال' }] },
        ]}
        onFilter={handleFilter}
        initialValues={filters}
      />

      <DataTable
        columns={columns}
        data={discounts}
        loading={loading}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        actions={actions}
      />

      {showForm && (
        <DiscountForm
          discount={editingDiscount}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
};

export default DiscountList;