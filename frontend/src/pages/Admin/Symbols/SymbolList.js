// frontend/src/pages/Admin/Symbols/SymbolList.js
import React, { useState, useEffect } from 'react';
import adminService from '../../../services/adminService';
import DataTable from '../../../components/Admin/DataTable';
import FilterBar from '../../../components/Admin/FilterBar';
import StatusBadge from '../../../components/Admin/StatusBadge';
import SymbolForm from './SymbolForm';
import './SymbolList.css';

const SymbolList = () => {
  const [symbols, setSymbols] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [filters, setFilters] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [editingSymbol, setEditingSymbol] = useState(null);

  const columns = [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'symbol', label: 'نماد', sortable: true },
    { key: 'base_currency', label: 'ارز پایه' },
    { key: 'quote_currency', label: 'ارز متقابل' },
    { key: 'pair_type_display', label: 'نوع' },
    { key: 'description', label: 'توضیحات' },
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
        setEditingSymbol(row);
        setShowForm(true);
      }
    },
    {
      label: 'حذف',
      icon: '🗑️',
      className: 'danger',
      onClick: async (row) => {
        if (window.confirm(`آیا از حذف نماد "${row.symbol}" اطمینان دارید؟`)) {
          try {
            await adminService.deleteSymbol(row.id);
            loadSymbols();
          } catch (error) {
            console.error('Error deleting symbol:', error);
            alert('خطا در حذف نماد');
          }
        }
      }
    }
  ];

  useEffect(() => {
    loadSymbols();
  }, [page, filters]);

  const loadSymbols = async () => {
    setLoading(true);
    try {
      const response = await adminService.getSymbols({
        page,
        page_size: pageSize,
        ...filters
      });
      setSymbols(response.data.results || response.data);
      setTotal(response.data.count || response.data.length || 0);
    } catch (error) {
      console.error('Error loading symbols:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (newFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  return (
    <div className="symbol-list-page">
      <div className="page-header">
        <h1>مدیریت نمادها (جفت ارزها)</h1>
        <button onClick={() => setShowForm(true)} className="btn-add">
          ➕ افزودن نماد جدید
        </button>
      </div>

      <FilterBar
        fields={[
          { key: 'search', label: 'جستجو', type: 'text', placeholder: 'نماد، توضیحات...' },
          { key: 'pair_type', label: 'نوع', type: 'select', options: [
            { value: '', label: 'همه' },
            { value: 'forex', label: 'فارکس' },
            { value: 'crypto', label: 'کریپتو' },
            { value: 'index', label: 'شاخص' },
            { value: 'commodity', label: 'کالا' }
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
        data={symbols}
        loading={loading}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        actions={actions}
      />

      {showForm && (
        <SymbolForm
          symbol={editingSymbol}
          onClose={() => {
            setShowForm(false);
            setEditingSymbol(null);
          }}
          onSuccess={loadSymbols}
        />
      )}
    </div>
  );
};

export default SymbolList;