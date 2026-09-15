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

  // ============================================
  // ✅ State برای پلن‌ها و آمار
  // ============================================
  const [plans, setPlans] = useState([]);
  const [summary, setSummary] = useState({
    count: 0,
    total_amount: 0,
    paid_count: 0,
    paid_amount: 0,
  });

  // ============================================
  // ✅ بارگذاری پلن‌ها (یک بار)
  // ============================================
  useEffect(() => {
    const loadPlans = async () => {
      try {
        const response = await adminService.getPlans();
        setPlans(response.data?.results || response.data || []);
      } catch (error) {
        console.error('Error loading plans:', error);
      }
    };
    loadPlans();
  }, []);

  // ============================================
  // ✅ محاسبه جمع مبلغ و تعداد از داده‌های جاری
  // ============================================
  useEffect(() => {
    if (!transactions || transactions.length === 0) {
      setSummary({ count: 0, total_amount: 0, paid_count: 0, paid_amount: 0 });
      return;
    }

    const paidTransactions = transactions.filter((t) => t.payment_status === 'paid');

    setSummary({
      count: transactions.length,
      total_amount: transactions.reduce(
        (sum, t) => sum + Number(t.total_amount || 0),
        0
      ),
      paid_count: paidTransactions.length,
      paid_amount: paidTransactions.reduce(
        (sum, t) => sum + Number(t.total_amount || 0),
        0
      ),
    });
  }, [transactions]);

  const columns = [
    { key: 'id', label: 'ID' },
    {
      key: 'created_at',
      label: 'تاریخ',
      render: (val) => (val ? new Date(val).toLocaleString('fa-IR') : '—'),
    },
    { key: 'user_phone', label: 'کاربر' },
    { key: 'plan_name', label: 'پلن' },
    {
      key: 'amount',
      label: 'مبلغ',
      render: (val) => `${Number(val || 0).toLocaleString('fa-IR')} تومان`,
    },
    {
      key: 'vat_amount',
      label: 'مالیات',
      render: (val) => `${Number(val || 0).toLocaleString('fa-IR')} تومان`,
    },
    {
      key: 'total_amount',
      label: 'مبلغ کل',
      render: (val) => `${Number(val || 0).toLocaleString('fa-IR')} تومان`,
    },
    {
      key: 'payment_status',
      label: 'وضعیت',
      render: (val) => (
        <StatusBadge
          status={val === 'paid' ? 'green' : val === 'pending' ? 'orange' : 'red'}
          label={
            val === 'paid'
              ? 'پرداخت شده'
              : val === 'pending'
              ? 'در انتظار'
              : 'خطا'
          }
        />
      ),
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
        ...filters,
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
      link.setAttribute(
        'download',
        `transactions_${new Date().toISOString().slice(0, 10)}.csv`
      );
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

      {/* ============================================ */}
      {/* ✅ کارت‌های خلاصه (Header Summary)           */}
      {/* ============================================ */}
      <div className="transaction-summary">
        <div className="summary-card summary-total">
          <div className="summary-icon">📋</div>
          <div className="summary-info">
            <div className="summary-value">{summary.count}</div>
            <div className="summary-label">تعداد تراکنش (این صفحه)</div>
          </div>
        </div>

        <div className="summary-card summary-amount">
          <div className="summary-icon">💰</div>
          <div className="summary-info">
            <div className="summary-value">
              {summary.total_amount.toLocaleString('fa-IR')} تومان
            </div>
            <div className="summary-label">جمع کل مبالغ</div>
          </div>
        </div>

        <div className="summary-card summary-paid">
          <div className="summary-icon">✅</div>
          <div className="summary-info">
            <div className="summary-value">{summary.paid_count}</div>
            <div className="summary-label">پرداخت‌شده</div>
          </div>
        </div>

        <div className="summary-card summary-paid-amount">
          <div className="summary-icon">💵</div>
          <div className="summary-info">
            <div className="summary-value">
              {summary.paid_amount.toLocaleString('fa-IR')} تومان
            </div>
            <div className="summary-label">جمع مبالغ پرداخت‌شده</div>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* ✅ فیلترها (شامل فیلتر پلن جدید)              */}
      {/* ============================================ */}
      <FilterBar
        fields={[
          {
            key: 'search',
            label: 'جستجو',
            type: 'text',
            placeholder: 'شماره تلفن، مرجع پرداخت...',
          },
          {
            key: 'plan_id',
            label: 'پلن',
            type: 'select',
            options: [
              { value: '', label: 'همه پلن‌ها' },
              ...plans.map((p) => ({
                value: p.id,
                label: p.plan_name,
              })),
            ],
          },
          {
            key: 'payment_status',
            label: 'وضعیت',
            type: 'select',
            options: [
              { value: '', label: 'همه' },
              { value: 'paid', label: 'پرداخت شده' },
              { value: 'pending', label: 'در انتظار' },
              { value: 'failed', label: 'خطا' },
            ],
          },
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