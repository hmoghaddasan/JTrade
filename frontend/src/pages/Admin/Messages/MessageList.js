// frontend/src/pages/Admin/Messages/MessageList.js
import React, { useState, useEffect } from 'react';
import adminService from '../../../services/adminService';
import DataTable from '../../../components/Admin/DataTable';
import FilterBar from '../../../components/Admin/FilterBar';
import StatusBadge from '../../../components/Admin/StatusBadge';
import MessageReplyModal from './MessageReplyModal';
import './MessageList.css';

const MessageList = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [filters, setFilters] = useState({});
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'created_at', label: 'تاریخ', render: (val) => new Date(val).toLocaleString('fa-IR') },
    { key: 'user_phone', label: 'کاربر' },
    { key: 'user_name', label: 'نام کاربر' },
    { key: 'subject', label: 'موضوع' },
    {
      key: 'status_display',
      label: 'وضعیت',
      render: (val) => {
        const colorMap = {
          '✅ پاسخ داده شده': 'green',
          '📖 خوانده شده': 'blue',
          '🆕 جدید': 'orange'
        };
        return <StatusBadge status={colorMap[val] || 'gray'} label={val} />;
      }
    },
    { key: 'message', label: 'متن', render: (val) => val?.length > 50 ? `${val.substring(0, 50)}...` : val },
  ];

  const actions = [
    {
      label: 'جزئیات',
      icon: '👁️',
      onClick: (row) => {
        setSelectedMessage(row);
        setShowReplyModal(true);
      }
    },
    {
      label: 'پاسخ',
      icon: '✉️',
      className: 'success',
      onClick: (row) => {
        setSelectedMessage(row);
        setShowReplyModal(true);
      }
    },
    {
      label: 'حذف',
      icon: '🗑️',
      className: 'danger',
      onClick: async (row) => {
        if (window.confirm(`آیا از حذف پیام "${row.subject}" اطمینان دارید؟`)) {
          try {
            await adminService.deleteMessage(row.id);
            loadMessages();
          } catch (error) {
            console.error('Error deleting message:', error);
            alert('خطا در حذف پیام');
          }
        }
      }
    }
  ];

  useEffect(() => {
    loadMessages();
  }, [page, filters]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const response = await adminService.getMessages({
        page,
        page_size: pageSize,
        ...filters
      });
      setMessages(response.data.results || response.data);
      setTotal(response.data.count || response.data.length || 0);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (newFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  return (
    <div className="message-list-page">
      <div className="page-header">
        <h1>مدیریت پیام‌های کاربران</h1>
      </div>

      <FilterBar
        fields={[
          { key: 'search', label: 'جستجو', type: 'text', placeholder: 'شماره تلفن، موضوع...' },
          { key: 'is_read', label: 'خوانده شده', type: 'select', options: [
            { value: '', label: 'همه' },
            { value: 'true', label: 'خوانده شده' },
            { value: 'false', label: 'خوانده نشده' }
          ]},
          { key: 'is_replied', label: 'پاسخ داده شده', type: 'select', options: [
            { value: '', label: 'همه' },
            { value: 'true', label: 'پاسخ داده شده' },
            { value: 'false', label: 'پاسخ داده نشده' }
          ]},
        ]}
        onFilter={handleFilter}
        initialValues={filters}
      />

      <DataTable
        columns={columns}
        data={messages}
        loading={loading}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        actions={actions}
      />

      {showReplyModal && (
        <MessageReplyModal
          message={selectedMessage}
          onClose={() => {
            setShowReplyModal(false);
            setSelectedMessage(null);
          }}
          onSuccess={loadMessages}
        />
      )}
    </div>
  );
};

export default MessageList;