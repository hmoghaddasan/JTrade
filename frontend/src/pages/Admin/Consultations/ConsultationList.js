// frontend/src/pages/Admin/Consultations/ConsultationList.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../../../services/adminService';
import DataTable from '../../../components/Admin/DataTable';
import FilterBar from '../../../components/Admin/FilterBar';
import StatusBadge from '../../../components/Admin/StatusBadge';
import './ConsultationList.css';

const ConsultationList = () => {
  const navigate = useNavigate();
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [filters, setFilters] = useState({});

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'created_at', label: 'تاریخ', render: (val) => new Date(val).toLocaleString('fa-IR') },
    { key: 'user_phone', label: 'کاربر' },
    { key: 'symbol', label: 'نماد' },
    {
      key: 'direction',
      label: 'جهت',
      render: (val) => <StatusBadge status={val === 'Buy' ? 'green' : 'red'} label={val === 'Buy' ? 'خرید' : 'فروش'} />
    },
    {
      key: 'status',
      label: 'وضعیت',
      render: (val) => (
        <StatusBadge
          status={val === 'completed' ? 'green' : val === 'processing' ? 'blue' : val === 'failed' ? 'red' : 'gray'}
          label={val === 'completed' ? 'تکمیل شده' : val === 'processing' ? 'در حال پردازش' : val === 'failed' ? 'خطا' : 'در انتظار'}
        />
      )
    },
    { key: 'ai_score', label: 'امتیاز AI', render: (val) => val > 0 ? `${val}/100` : '—' },
    {
      key: 'feedback_score',
      label: 'بازخورد',
      render: (val) => val ? `${'⭐'.repeat(val)}` : '—'
    },
    { key: 'model_used', label: 'مدل' },
  ];

  useEffect(() => {
    loadConsultations();
  }, [page, filters]);

  const loadConsultations = async () => {
    setLoading(true);
    try {
      const response = await adminService.getConsultations({
        page,
        page_size: pageSize,
        ...filters
      });
      setConsultations(response.data.results || response.data);
      setTotal(response.data.count || response.data.length || 0);
    } catch (error) {
      console.error('Error loading consultations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (newFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  return (
    <div className="consultation-list-page">
      <div className="page-header">
        <h1>مدیریت مشاوره‌های AI</h1>
        <button onClick={() => navigate('/admin/consultations/analytics')} className="btn-analytics">
          📊 تحلیل عملکرد
        </button>
      </div>

      <FilterBar
        fields={[
          { key: 'search', label: 'جستجو', type: 'text', placeholder: 'شماره تلفن، نماد...' },
          { key: 'status', label: 'وضعیت', type: 'select', options: [
            { value: '', label: 'همه' },
            { value: 'pending', label: 'در انتظار' },
            { value: 'processing', label: 'در حال پردازش' },
            { value: 'completed', label: 'تکمیل شده' },
            { value: 'failed', label: 'خطا' }
          ]},
          { key: 'model_used', label: 'مدل', type: 'select', options: [
            { value: '', label: 'همه' },
            { value: 'llama3.1:8b', label: 'Llama 3.1 8B' },
            { value: 'llama3.2:3b', label: 'Llama 3.2 3B' },
            { value: 'gemma4:4b', label: 'Gemma 4 4B' },
          ]},
          { key: 'has_feedback', label: 'بازخورد', type: 'select', options: [
            { value: '', label: 'همه' },
            { value: 'true', label: 'دارد' },
            { value: 'false', label: 'ندارد' }
          ]},
        ]}
        onFilter={handleFilter}
        initialValues={filters}
      />

      <DataTable
        columns={columns}
        data={consultations}
        loading={loading}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onRowClick={(row) => navigate(`/admin/consultations/${row.id}`)}
      />
    </div>
  );
};

export default ConsultationList;