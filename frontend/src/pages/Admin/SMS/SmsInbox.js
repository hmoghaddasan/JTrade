// frontend/src/pages/Admin/SMS/SmsInbox.js

import React, { useState, useEffect } from 'react';
import adminService from '../../../services/adminService';
import { useToast } from '../../../contexts/ToastContext';
import LoadingSpinner from '../../../components/Admin/LoadingSpinner';
import './SmsInbox.css';

const SmsInbox = () => {
  const { showToast } = useToast();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [filters, setFilters] = useState({
    provider: '',
    is_read: '',
    is_flagged: '',
    from_number: '',
    date_from: '',
    date_to: '',
  });
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    loadMessages();
  }, [page, filters]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const params = { page, page_size: pageSize };
      Object.keys(filters).forEach(key => {
        if (filters[key] !== '') params[key] = filters[key];
      });

      const response = await adminService.getSmsInbox(params);
      const data = response.data.results || response.data;
      setMessages(Array.isArray(data) ? data : []);
      setTotal(response.data.count || data.length || 0);
    } catch (error) {
      console.error('Error loading inbox:', error);
      showToast('خطا در بارگذاری پیام‌های دریافتی', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleFetchNew = async () => {
    setFetching(true);
    try {
      const response = await adminService.fetchSmsInbox();
      const { new: newCount, total: totalCount } = response.data;

      if (newCount > 0) {
        showToast(`✅ ${newCount} پیام جدید از ${totalCount} پیام`, 'success');
        loadMessages();
      } else {
        showToast('هیچ پیام جدیدی یافت نشد', 'info');
      }
    } catch (error) {
      console.error('Error fetching inbox:', error);
      showToast('خطا در دریافت پیام‌های جدید', 'error');
    } finally {
      setFetching(false);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await adminService.markSmsInboxRead(id);
      setMessages(prev =>
        prev.map(m => m.id === id ? { ...m, is_read: true } : m)
      );
      showToast('✅ خوانده شد', 'success');
    } catch (error) {
      console.error('Error marking as read:', error);
      showToast('خطا در علامت‌گذاری', 'error');
    }
  };

  const handleFlag = async (id) => {
    try {
      const response = await adminService.flagSmsInbox(id);
      setMessages(prev =>
        prev.map(m => m.id === id ? { ...m, is_flagged: response.data.is_flagged } : m)
      );
      showToast(response.data.is_flagged ? '⭐ علامت‌گذاری شد' : 'علامت برداشته شد', 'success');
    } catch (error) {
      console.error('Error flagging:', error);
      showToast('خطا در علامت‌گذاری', 'error');
    }
  };

  const handleBulkMarkRead = async () => {
    if (selectedMessages.length === 0) {
      showToast('هیچ پیامی انتخاب نشده', 'warning');
      return;
    }

    try {
      await adminService.bulkMarkSmsInboxRead({ ids: selectedMessages });
      showToast(`✅ ${selectedMessages.length} پیام خوانده شد`, 'success');
      loadMessages();
      setSelectedMessages([]);
    } catch (error) {
      console.error('Error bulk marking:', error);
      showToast('خطا در علامت‌گذاری گروهی', 'error');
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedMessages(messages.map(m => m.id));
    } else {
      setSelectedMessages([]);
    }
  };

  const handleSelect = (id) => {
    setSelectedMessages(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleViewDetail = (message) => {
    setSelectedMessage(message);
    setShowDetailModal(true);

    if (!message.is_read) {
      handleMarkRead(message.id);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString('fa-IR');
    } catch {
      return dateStr;
    }
  };

  const unreadCount = messages.filter(m => !m.is_read).length;

  return (
    <div className="sms-inbox">
      {/* ===== Header ===== */}
      <div className="inbox-header">
        <div>
          <h2>📥 پیام‌های دریافتی</h2>
          <p className="inbox-hint">
            مجموع: {total.toLocaleString()} پیام
            {unreadCount > 0 && (
              <span className="unread-count-badge"> 🔴 {unreadCount} خوانده نشده</span>
            )}
          </p>
        </div>

        <div className="header-actions">
          {selectedMessages.length > 0 && (
            <>
              <span className="selected-count">
                {selectedMessages.length} انتخاب‌شده
              </span>
              <button className="btn-bulk-mark" onClick={handleBulkMarkRead}>
                ✅ علامت‌گذاری گروهی
              </button>
            </>
          )}

          <button
            className="btn-fetch-new"
            onClick={handleFetchNew}
            disabled={fetching}
          >
            {fetching ? '⏳ در حال دریافت...' : '🔄 دریافت پیام‌های جدید'}
          </button>
        </div>
      </div>

      {/* ===== Filters ===== */}
      <div className="inbox-filters">
        <div className="filter-item">
          <label>📡 Provider</label>
          <select
            value={filters.provider}
            onChange={(e) => handleFilterChange('provider', e.target.value)}
          >
            <option value="">همه</option>
            <option value="ghasedak">قاصدک</option>
            <option value="sms_ir">sms.ir</option>
          </select>
        </div>

        <div className="filter-item">
          <label>👁️ وضعیت خوانده</label>
          <select
            value={filters.is_read}
            onChange={(e) => handleFilterChange('is_read', e.target.value)}
          >
            <option value="">همه</option>
            <option value="false">🔴 خوانده نشده</option>
            <option value="true">⚪ خوانده شده</option>
          </select>
        </div>

        <div className="filter-item">
          <label>⭐ علامت‌گذاری</label>
          <select
            value={filters.is_flagged}
            onChange={(e) => handleFilterChange('is_flagged', e.target.value)}
          >
            <option value="">همه</option>
            <option value="true">⭐ علامت‌دار</option>
            <option value="false">بدون علامت</option>
          </select>
        </div>

        <div className="filter-item">
          <label>📱 شماره فرستنده</label>
          <input
            type="text"
            value={filters.from_number}
            onChange={(e) => handleFilterChange('from_number', e.target.value)}
            placeholder="جستجوی شماره..."
            dir="ltr"
          />
        </div>

        <div className="filter-item">
          <label>📅 از تاریخ</label>
          <input
            type="date"
            value={filters.date_from}
            onChange={(e) => handleFilterChange('date_from', e.target.value)}
          />
        </div>

        <div className="filter-item">
          <label>📅 تا تاریخ</label>
          <input
            type="date"
            value={filters.date_to}
            onChange={(e) => handleFilterChange('date_to', e.target.value)}
          />
        </div>

        <button
          className="btn-reset-filters"
          onClick={() => setFilters({
            provider: '', is_read: '', is_flagged: '',
            from_number: '', date_from: '', date_to: '',
          })}
        >
          🔄 پاک‌سازی
        </button>
      </div>

      {/* ===== Table ===== */}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="inbox-table-wrapper">
            <table className="inbox-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={selectedMessages.length === messages.length && messages.length > 0}
                    />
                  </th>
                  <th></th>
                  <th>تاریخ دریافت</th>
                  <th>شماره فرستنده</th>
                  <th>Provider</th>
                  <th>متن پیام</th>
                  <th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((msg) => (
                  <tr key={msg.id} className={msg.is_read ? '' : 'unread-row'}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedMessages.includes(msg.id)}
                        onChange={() => handleSelect(msg.id)}
                      />
                    </td>
                    <td className="read-indicator-cell">
                      {msg.is_read ? '⚪' : '🔴'}
                    </td>
                    <td className="date-cell">{formatDate(msg.received_at)}</td>
                    <td className="phone-cell" dir="ltr">{msg.from_number}</td>
                    <td>
                      <span className={`provider-chip ${msg.provider}`}>
                        {msg.provider === 'ghasedak' ? '📱' : '📲'}
                      </span>
                    </td>
                    <td className="message-cell">
                      <span className="message-preview">
                        {msg.message.length > 80
                          ? `${msg.message.substring(0, 80)}...`
                          : msg.message}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button
                        className="btn-icon"
                        onClick={() => handleViewDetail(msg)}
                        title="مشاهده"
                      >
                        👁️
                      </button>
                      <button
                        className={`btn-icon ${msg.is_flagged ? 'flagged' : ''}`}
                        onClick={() => handleFlag(msg.id)}
                        title={msg.is_flagged ? 'برداشتن علامت' : 'علامت‌گذاری'}
                      >
                        {msg.is_flagged ? '⭐' : '☆'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {messages.length === 0 && (
              <div className="empty-state">
                <p>📭 هیچ پیام دریافتی یافت نشد</p>
              </div>
            )}
          </div>

          {/* ===== Pagination ===== */}
          {total > pageSize && (
            <div className="pagination">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                « قبلی
              </button>
              <span>صفحه {page} از {Math.ceil(total / pageSize)}</span>
              <button
                disabled={page >= Math.ceil(total / pageSize)}
                onClick={() => setPage(p => p + 1)}
              >
                بعدی »
              </button>
            </div>
          )}
        </>
      )}

      {/* ===== Detail Modal ===== */}
      {showDetailModal && selectedMessage && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content sms-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📩 جزئیات پیام دریافتی</h3>
              <button className="btn-close" onClick={() => setShowDetailModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="detail-row">
                <span className="detail-label">شناسه:</span>
                <span className="detail-value" dir="ltr">#{selectedMessage.id}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">از شماره:</span>
                <span className="detail-value" dir="ltr">{selectedMessage.from_number}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">به خط:</span>
                <span className="detail-value" dir="ltr">{selectedMessage.line_number || '—'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Provider:</span>
                <span className="detail-value">{selectedMessage.provider_display || selectedMessage.provider}</span>
              </div>
              {selectedMessage.user_name && (
                <div className="detail-row">
                  <span className="detail-label">کاربر مرتبط:</span>
                  <span className="detail-value">{selectedMessage.user_name}</span>
                </div>
              )}
              <div className="detail-row">
                <span className="detail-label">تاریخ دریافت:</span>
                <span className="detail-value">{formatDate(selectedMessage.received_at)}</span>
              </div>
              <div className="detail-row full">
                <span className="detail-label">متن پیام:</span>
                <div className="detail-message">{selectedMessage.message}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmsInbox;