// frontend/src/pages/Admin/Finance/PaymentRequestsManagement.js
import React, { useState, useEffect, useCallback } from 'react';
import adminService from '../../../services/adminService';
import DataTable from '../../../components/Admin/DataTable';
import FilterBar from '../../../components/Admin/FilterBar';
import StatusBadge from '../../../components/Admin/StatusBadge';
import ExportButton from '../../../components/Admin/ExportButton';
import PaymentRequestDetailModal from './PaymentRequestDetailModal';
import { useToast } from '../../../contexts/ToastContext';
import './Finance.css';
import './PaymentRequestsManagement.css';

const PaymentRequestsManagement = () => {
  const { showToast } = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [filters, setFilters] = useState({});
  const [cards, setCards] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('all');

  // ============================================
  // بارگذاری کارت‌ها (برای فیلتر)
  // ============================================
  useEffect(() => {
    const loadCards = async () => {
      try {
        const response = await adminService.getPaymentCards({ is_active: true });
        setCards(response.data?.results || response.data || []);
      } catch (error) {
        console.error('Error loading cards:', error);
      }
    };
    loadCards();
    loadStats();
  }, []);

  // ============================================
  // بارگذاری درخواست‌ها
  // ============================================
  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: pageSize,
        ...filters,
      };
      if (selectedStatus !== 'all') params.status = selectedStatus;

      const response = await adminService.getPaymentRequests(params);
      setRequests(response.data?.results || response.data || []);
      setTotal(response.data?.count || response.data?.length || 0);
    } catch (error) {
      console.error('Error loading payment requests:', error);
      showToast('خطا در بارگذاری درخواست‌ها', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters, selectedStatus, showToast]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // ============================================
  // بارگذاری آمار
  // ============================================
  const loadStats = async () => {
    try {
      const response = await adminService.getPaymentRequestStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  // ============================================
  // تغییر وضعیت
  // ============================================
  const handleStatusChange = (status) => {
    setSelectedStatus(status);
    setPage(1);
  };

  // ============================================
  // ستون‌های جدول
  // ============================================
  const columns = [
    { key: 'id', label: 'ID' },
    {
      key: 'created_at',
      label: 'تاریخ ایجاد',
      render: (val) => val ? new Date(val).toLocaleString('fa-IR') : '-',
    },
    { key: 'user_phone', label: 'کاربر' },
    { key: 'user_name', label: 'نام' },
    { key: 'plan_name', label: 'پلن' },
    {
      key: 'amount',
      label: 'مبلغ',
      render: (val) => `${Number(val || 0).toLocaleString()} تومان`,
    },
    {
      key: 'payment_card',
      label: 'کارت مقصد',
      render: (val, row) => (
        <span style={{ fontSize: '12px' }}>
          {row.destination_card_number
            ? `****${row.destination_card_number.slice(-4)}`
            : '-'}
        </span>
      ),
    },
    {
      key: 'tracking_number',
      label: 'شماره پیگیری',
      render: (val) => val || '-',
    },
    {
      key: 'status',
      label: 'وضعیت',
      render: (val, row) => {
        const statusMap = {
          pending_payment: { color: 'orange', label: '⏳ در انتظار واریز' },
          awaiting_review: { color: 'blue', label: '🔍 در انتظار بررسی' },
          approved: { color: 'green', label: '✅ تأیید شده' },
          rejected: { color: 'red', label: '❌ رد شده' },
          expired: { color: 'gray', label: '⏰ منقضی شده' },
          canceled: { color: 'gray', label: '🚫 لغو شده' },
        };
        const s = statusMap[val] || { color: 'gray', label: val };
        return <StatusBadge status={s.color} label={s.label} />;
      },
    },
    {
      key: 'reviewed_by_name',
      label: 'بررسی‌کننده',
      render: (val) => val || '-',
    },
  ];

  // ============================================
  // دکمه‌های عملیات
  // ============================================
  const actions = [
    {
      icon: '🔍',
      label: 'جزئیات',
      className: '',
      onClick: (row) => setSelectedRequest(row),
    },
  ];

  // ============================================
  // خروجی اکسل
  // ============================================
  const handleExport = () => {
    // TODO: Add export endpoint
    showToast('خروجی اکسل به زودی اضافه می‌شود', 'info');
  };

  // ============================================
  // پس از تأیید/رد
  // ============================================
  const handleModalClose = () => {
    setSelectedRequest(null);
  };

  const handleModalSuccess = () => {
    setSelectedRequest(null);
    loadRequests();
    loadStats();
  };

  return (
    <div className="payment-requests-management">
      {/* ===== Header ===== */}
      <div className="page-header">
        <h1>💳 درخواست‌های پرداخت کارت به کارت</h1>
        <ExportButton onExport={handleExport} />
      </div>

      {/* ===== Stats Cards ===== */}
      {stats && (
        <div className="payment-requests-stats">
          <div className="stat-card-sm">
            <div className="stat-icon-sm">📊</div>
            <div className="stat-info-sm">
              <div className="stat-value-sm">{stats.total || 0}</div>
              <div className="stat-label-sm">کل درخواست‌ها</div>
            </div>
          </div>
          <div className="stat-card-sm orange">
            <div className="stat-icon-sm">⏳</div>
            <div className="stat-info-sm">
              <div className="stat-value-sm">
                {stats.by_status?.pending_payment?.count || 0}
              </div>
              <div className="stat-label-sm">در انتظار واریز</div>
            </div>
          </div>
          <div className="stat-card-sm blue">
            <div className="stat-icon-sm">🔍</div>
            <div className="stat-info-sm">
              <div className="stat-value-sm">
                {stats.by_status?.awaiting_review?.count || 0}
              </div>
              <div className="stat-label-sm">در انتظار بررسی</div>
            </div>
          </div>
          <div className="stat-card-sm green">
            <div className="stat-icon-sm">✅</div>
            <div className="stat-info-sm">
              <div className="stat-value-sm">
                {stats.by_status?.approved?.count || 0}
              </div>
              <div className="stat-label-sm">تأیید شده</div>
            </div>
          </div>
          <div className="stat-card-sm red">
            <div className="stat-icon-sm">❌</div>
            <div className="stat-info-sm">
              <div className="stat-value-sm">
                {stats.by_status?.rejected?.count || 0}
              </div>
              <div className="stat-label-sm">رد شده</div>
            </div>
          </div>
          <div className="stat-card-sm purple">
            <div className="stat-icon-sm">💰</div>
            <div className="stat-info-sm">
              <div className="stat-value-sm">
                {Number(stats.total_amount_approved || 0).toLocaleString()}
              </div>
              <div className="stat-label-sm">مبلغ تأییدشده (تومان)</div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Status Filter Tabs ===== */}
      <div className="status-filter-tabs">
        {[
          { key: 'all', label: 'همه', icon: '📋' },
          { key: 'pending_payment', label: 'در انتظار واریز', icon: '⏳' },
          { key: 'awaiting_review', label: 'در انتظار بررسی', icon: '🔍' },
          { key: 'approved', label: 'تأیید شده', icon: '✅' },
          { key: 'rejected', label: 'رد شده', icon: '❌' },
          { key: 'expired', label: 'منقضی شده', icon: '⏰' },
          { key: 'canceled', label: 'لغو شده', icon: '🚫' },
        ].map((tab) => (
          <button
            key={tab.key}
            className={`status-tab-btn ${selectedStatus === tab.key ? 'active' : ''}`}
            onClick={() => handleStatusChange(tab.key)}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ===== Filters ===== */}
      <FilterBar
        fields={[
          {
            key: 'search',
            label: 'جستجو',
            type: 'text',
            placeholder: 'شماره تلفن، نام، شماره پیگیری...',
          },
          {
            key: 'card_id',
            label: 'کارت مقصد',
            type: 'select',
            options: [
              { value: '', label: 'همه کارت‌ها' },
              ...cards.map((c) => ({
                value: c.id,
                label: `${c.bank_name} - ****${c.card_number?.slice(-4)}`,
              })),
            ],
          },
          { key: 'date_from', label: 'از تاریخ', type: 'date' },
          { key: 'date_to', label: 'تا تاریخ', type: 'date' },
          { key: 'min_amount', label: 'حداقل مبلغ', type: 'text' },
          { key: 'max_amount', label: 'حداکثر مبلغ', type: 'text' },
        ]}
        onFilter={(newFilters) => {
          setFilters(newFilters);
          setPage(1);
        }}
        initialValues={filters}
      />

      {/* ===== Table ===== */}
      <DataTable
        columns={columns}
        data={requests}
        loading={loading}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        actions={actions}
        emptyMessage="هیچ درخواست پرداختی یافت نشد"
      />

      {/* ===== Detail Modal ===== */}
      {selectedRequest && (
        <PaymentRequestDetailModal
          request={selectedRequest}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
};

export default PaymentRequestsManagement;