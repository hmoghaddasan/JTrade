// frontend/src/pages/Admin/Versions/VersionList.js
import React, { useState, useEffect } from 'react';
import adminService from '../../../services/adminService';
import DataTable from '../../../components/Admin/DataTable';
import StatusBadge from '../../../components/Admin/StatusBadge';
import VersionForm from './VersionForm';
import './VersionList.css';

const VersionList = () => {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVersion, setEditingVersion] = useState(null);

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'version_number', label: 'نسخه' },
    {
      key: 'release_date',
      label: 'تاریخ انتشار',
      render: (val) => new Date(val).toLocaleString('fa-IR')
    },
    { key: 'release_notes', label: 'توضیحات', render: (val) => val?.length > 50 ? `${val.substring(0, 50)}...` : val },
    {
      key: 'is_current',
      label: 'نسخه فعلی',
      render: (val) => val ? <StatusBadge status="active" label="✅ فعلی" /> : null
    },
  ];

  const actions = [
    {
      label: 'ویرایش',
      icon: '✏️',
      onClick: (row) => {
        setEditingVersion(row);
        setShowForm(true);
      }
    },
    {
      label: 'حذف',
      icon: '🗑️',
      className: 'danger',
      onClick: async (row) => {
        if (row.is_current) {
          alert('امکان حذف نسخه فعلی وجود ندارد');
          return;
        }
        if (window.confirm(`آیا از حذف نسخه "${row.version_number}" اطمینان دارید؟`)) {
          try {
            await adminService.deleteVersion(row.id);
            loadVersions();
          } catch (error) {
            console.error('Error deleting version:', error);
            alert('خطا در حذف نسخه');
          }
        }
      }
    }
  ];

  useEffect(() => {
    loadVersions();
  }, []);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const response = await adminService.getVersions();
      setVersions(response.data);
    } catch (error) {
      console.error('Error loading versions:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="version-list-page">
      <div className="page-header">
        <h1>مدیریت نسخه‌های نرم‌افزار</h1>
        <button onClick={() => setShowForm(true)} className="btn-add">
          ➕ افزودن نسخه جدید
        </button>
      </div>

      <DataTable
        columns={columns}
        data={versions}
        loading={loading}
        total={versions.length}
        page={1}
        pageSize={50}
        onPageChange={() => {}}
        actions={actions}
      />

      {showForm && (
        <VersionForm
          version={editingVersion}
          onClose={() => {
            setShowForm(false);
            setEditingVersion(null);
          }}
          onSuccess={loadVersions}
        />
      )}
    </div>
  );
};

export default VersionList;