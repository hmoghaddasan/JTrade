// frontend/src/pages/Admin/Trades/TradeList.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../../../services/adminService';
import DataTable from '../../../components/Admin/DataTable';
import FilterBar from '../../../components/Admin/FilterBar';
import StatusBadge from '../../../components/Admin/StatusBadge';
import ExportButton from '../../../components/Admin/ExportButton';
import './TradeList.css';

const TradeList = () => {
  const navigate = useNavigate();
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [filters, setFilters] = useState({});

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'trade_date', label: 'تاریخ معامله', render: (val) => new Date(val).toLocaleDateString('fa-IR') },
    { key: 'user_phone', label: 'کاربر' },
    { key: 'symbol', label: 'نماد' },
    {
      key: 'trade_type',
      label: 'نوع',
      render: (val) => <StatusBadge status={val === 'Buy' ? 'green' : 'red'} label={val === 'Buy' ? 'خرید' : 'فروش'} />
    },
    { key: 'group_name', label: 'دسته‌بندی' },
    { key: 'entry_price', label: 'قیمت ورود' },
    {
      key: 'profit',
      label: 'سود/زیان',
      render: (val) => {
        if (val === null || val === undefined) return '—';
        const num = parseFloat(val);
        if (isNaN(num)) return '—';
        return (
          <span style={{ color: num > 0 ? 'green' : num < 0 ? 'red' : 'gray', fontWeight: 'bold' }}>
            {num.toLocaleString()}
          </span>
        );
      }
    },
    {
      key: 'risk_reward_ratio',
      label: 'R:R',
      render: (val) => {
        if (val === null || val === undefined) return '—';
        const num = parseFloat(val);
        if (isNaN(num)) return '—';
        return num.toFixed(2);
      }
    },
    {
      key: 'execution_quality_score',
      label: 'کیفیت اجرا',
      render: (val) => {
        if (val === null || val === undefined) return '—';
        return `${val}/10`;
      }
    },
  ];

  const actions = [
    {
      label: 'جزئیات',
      icon: '👁️',
      onClick: (row) => navigate(`/admin/trades/${row.id}`)
    },
    {
      label: 'حذف',
      icon: '🗑️',
      className: 'danger',
      onClick: async (row) => {
        if (window.confirm(`آیا از حذف ترید "${row.symbol}" اطمینان دارید؟`)) {
          try {
            await adminService.deleteTrade(row.id);
            loadTrades();
          } catch (error) {
            console.error('Error deleting trade:', error);
            alert('خطا در حذف ترید');
          }
        }
      }
    }
  ];

  useEffect(() => {
    loadTrades();
  }, [page, filters]);

  const loadTrades = async () => {
    setLoading(true);
    try {
      const response = await adminService.getTrades({
        page,
        page_size: pageSize,
        ...filters
      });
      setTrades(response.data.results || response.data);
      setTotal(response.data.count || response.data.length || 0);
    } catch (error) {
      console.error('Error loading trades:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (newFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleExport = () => {
    adminService.exportTrades(filters).then((response) => {
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `trades_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
    });
  };

  return (
    <div className="trade-list-page">
      <div className="page-header">
        <h1>مدیریت تریدها</h1>
        <ExportButton onExport={handleExport} />
      </div>

      <FilterBar
        fields={[
          { key: 'search', label: 'جستجو', type: 'text', placeholder: 'شماره تلفن، نماد...' },
          { key: 'trade_type', label: 'نوع', type: 'select', options: [
            { value: '', label: 'همه' },
            { value: 'Buy', label: 'خرید' },
            { value: 'Sell', label: 'فروش' }
          ]},
          { key: 'date_from', label: 'از تاریخ', type: 'date' },
          { key: 'date_to', label: 'تا تاریخ', type: 'date' },
          { key: 'user_id', label: 'شناسه کاربر', type: 'text', placeholder: 'آیدی کاربر...' },
        ]}
        onFilter={handleFilter}
        initialValues={filters}
      />

      <DataTable
        columns={columns}
        data={trades}
        loading={loading}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onRowClick={(row) => navigate(`/admin/trades/${row.id}`)}
        actions={actions}
      />
    </div>
  );
};

export default TradeList;