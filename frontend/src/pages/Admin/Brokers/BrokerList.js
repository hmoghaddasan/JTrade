// frontend/src/pages/Admin/Brokers/BrokerList.js
import React, { useState, useEffect } from 'react';
import adminService from '../../../services/adminService';
import DataTable from '../../../components/Admin/DataTable';
import FilterBar from '../../../components/Admin/FilterBar';
import StatusBadge from '../../../components/Admin/StatusBadge';
import BrokerForm from './BrokerForm';
import './BrokerList.css';

const BrokerList = () => {
  const [brokers, setBrokers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [filters, setFilters] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [editingBroker, setEditingBroker] = useState(null);

  const columns = [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'name', label: 'نام بروکر', sortable: true },
    { key: 'category_display', label: 'دسته‌بندی' },
    { key: 'trades_count', label: 'تعداد ترید' },
    { key: 'order_index', label: 'ترتیب' },
    {
      key: 'is_active',
      label: 'وضعیت',
      render: (val) => <StatusBadge status={val ? 'active' : 'inactive'} label={val ? 'فعال' : 'غیرفعال'} />
    },
  ];

  const actions = [
    {
      label: 'ویرایش',
      icon: '✏️',
      onClick: (row) => {
        setEditingBroker(row);
        setShowForm(true);
      }
    },
    {
      label: 'حذف',
      icon: '🗑️',
      className: 'danger',
      onClick: async (row) => {
        if (window.confirm(`آیا از حذف بروکر "${row.name}" اطمینان دارید؟`)) {
          try {
            await adminService.deleteBroker(row.id);
            loadBrokers();
          } catch (error) {
            console.error('Error deleting broker:', error);
            alert('خطا در حذف بروکر');
          }
        }
      }
    }
  ];

  useEffect(() => {
    loadBrokers();
  }, [page, filters]);

  const loadBrokers = async () => {
    setLoading(true);
    try {
      const response = await adminService.getBrokers({
        page,
        page_size: pageSize,
        ...filters
      });
      setBrokers(response.data.results || response.data);
      setTotal(response.data.count || response.data.length || 0);
    } catch (error) {
      console.error('Error loading brokers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (newFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  return (
    <div className="broker-list-page">
      <div className="page-header">
        <h1>🏢 مدیریت بروکرها (کارگزاران)</h1>
        <button onClick={() => setShowForm(true)} className="btn-add">
          ➕ افزودن بروکر جدید
        </button>
      </div>

      <FilterBar
        fields={[
          { key: 'search', label: 'جستجو', type: 'text', placeholder: 'نام بروکر...' },
          { key: 'category', label: 'دسته‌بندی', type: 'select', options: [
            { value: '', label: 'همه' },
            { value: 'international_fx', label: 'بروکرهای بین‌المللی فارکس و CFD' },
            { value: 'international_crypto', label: 'صرافی‌های ارز دیجیتال بین‌المللی' },
            { value: 'iranian_crypto', label: 'صرافی‌های ارز دیجیتال داخلی' },
            { value: 'iranian_stock', label: 'کارگزاری‌های بورس داخلی' }
          ]},
          { key: 'is_active', label: 'وضعیت', type: 'select', options: [
            { value: '', label: 'همه' },
            { value: 'true', label: 'فعال' },
            { value: 'false', label: 'غیرفعال' }
          ]},
        ]}
        onFilter={handleFilter}
        initialValues={filters}
      />

      <DataTable
        columns={columns}
        data={brokers}
        loading={loading}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        actions={actions}
      />

      {showForm && (
        <BrokerForm
          broker={editingBroker}
          onClose={() => {
            setShowForm(false);
            setEditingBroker(null);
          }}
          onSuccess={loadBrokers}
        />
      )}
    </div>
  );
};

export default BrokerList;