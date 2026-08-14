// frontend/src/pages/Admin/Finance/TransactionList.js
import React, { useState, useEffect } from 'react';
import adminService from '../../../services/adminService';
import DataTable from '../../../components/Admin/DataTable';
import FilterBar from '../../../components/Admin/FilterBar';
import StatusBadge from '../../../components/Admin/StatusBadge';
import ExportButton from '../../../components/Admin/ExportButton';
import './Finance.css';

const TransactionList = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [filters, setFilters] = useState({});

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'created_at', label: 'تاریخ', render: (val) => new Date(val).toLocaleString('fa-IR') },
    { key: 'user_phone', label: 'کاربر' },
    { key: 'plan_name', label: 'پلن' },
    { key: 'amount', label: 'مبلغ', render: (val) => `${val?.toLocaleString()} تومان` },
    { key: 'vat_amount', label: 'مالیات', render: (val) => `${val?.toLocaleString()} تومان` },
    { key: 'total_amount', label: 'مبلغ کل', render: (val) => `${val?.toLocaleString()} تومان` },
    {
      key: 'payment_status',
      label: 'وضعیت',
      render: (val) => (
        <StatusBadge
          status={val === 'paid' ? 'green' : val === 'pending' ? 'orange' : 'red'}
          label={val === 'paid' ? 'پرداخت شده' : val === 'pending' ? 'در انتظار' : 'خطا'}
        />
      )
    },
    { key: 'payment_reference', label: 'مرجع پرداخت' },
  ];

  useEffect(() => {
    loadTransactions();
  }, [page, filters]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const response = await adminService.getTransactions({
        page,
        page_size: pageSize,
        ...filters
      });
      setTransactions(response.data.results || response.data);
      setTotal(response.data.count || response.data.length || 0);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (newFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleExport = () => {
    adminService.exportSales(filters).then((response) => {
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transactions_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
    });
  };

  return (
    <div className="finance-page">
      <div className="page-header">
        <h1>مدیریت تراکنش‌ها</h1>
        <ExportButton onExport={handleExport} />
      </div>

      <FilterBar
        fields={[
          { key: 'search', label: 'جستجو', type: 'text', placeholder: 'شماره تلفن، مرجع پرداخت...' },
          { key: 'payment_status', label: 'وضعیت', type: 'select', options: [{ value: '', label: 'همه' }, { value: 'paid', label: 'پرداخت شده' }, { value: 'pending', label: 'در انتظار' }, { value: 'failed', label: 'خطا' }] },
          { key: 'date_from', label: 'از تاریخ', type: 'date' },
          { key: 'date_to', label: 'تا تاریخ', type: 'date' },
        ]}
        onFilter={handleFilter}
        initialValues={filters}
      />

      <DataTable
        columns={columns}
        data={transactions}
        loading={loading}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
      />
    </div>
  );
};

export default TransactionList;