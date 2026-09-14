// frontend/src/pages/Admin/SMS/SmsMessages.js

import React, { useState, useEffect } from 'react';
import adminService from '../../../services/adminService';
import { useToast } from '../../../contexts/ToastContext';
import LoadingSpinner from '../../../components/Admin/LoadingSpinner';
import './SmsMessages.css';

const SmsMessages = () => {
  const { showToast } = useToast();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [filters, setFilters] = useState({
    provider: '',
    status: '',
    event_key: '',
    send_method: '',
    phone: '',
    date_from: '',
    date_to: '',
  });
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const eventOptions = [
    { value: '', label: 'همه رویدادها' },
    { value: 'otp_login', label: 'کد ورود (OTP)' },
    { value: 'welcome_trial', label: 'خوش‌آمد دوره آزمایشی' },
    { value: 'subscription_renewed_by_user', label: 'تمدید توسط کاربر' },
    { value: 'subscription_renewed_by_admin', label: 'تمدید توسط ادمین' },
    { value: 'admin_reply', label: 'پاسخ ادمین' },
    { value: 'admin_single', label: 'پیام تکی ادمین' },
    { value: 'admin_bulk', label: 'پیام گروهی ادمین' },
    { value: 'admin_alert', label: 'هشدار خطا' },
  ];

  const statusOptions = [
    { value: '', label: 'همه وضعیت‌ها' },
    { value: 'pending', label: '⏳ در انتظار' },
    { value: 'sent', label: '📤 ارسال شده' },
    { value: 'delivered', label: '✅ تحویل شده' },
    { value: 'failed', label: '❌ ناموفق' },
    { value: 'blacklist', label: '⛔ لیست سیاه' },
    { value: 'unknown', label: '❓ نامشخص' },
  ];

  useEffect(() => {
    loadMessages();
  }, [page, filters]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const params = { page, page_size: pageSize };
      Object.keys(filters).forEach(key => {
        if (filters[key]) params[key] = filters[key];
      });

      const response = await adminService.getSmsMessages(params);
      const data = response.data.results || response.data;
      setMessages(Array.isArray(data) ? data : []);
      setTotal(response.data.count || data.length || 0);
    } catch (error) {
      console.error('Error loading messages:', error);
      showToast('خطا در بارگذاری پیام‌ها', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
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
  };

  const handleCheckStatus = async (id) => {
    try {
      const response = await adminService.checkSmsMessageStatus(id);
      showToast(`✅ وضعیت بررسی شد: ${response.data.result}`, 'success');
      loadMessages();
    } catch (error) {
      console.error('Error checking status:', error);
      showToast('خطا در بررسی وضعیت', 'error');
    }
  };

  const handleBulkCheck = async () => {
    if (selectedMessages.length === 0) {
      showToast('هیچ پیامی انتخاب نشده', 'warning');
      return;
    }

    try {
      const response = await adminService.bulkCheckSmsMessages({
        message_ids: selectedMessages,
      });
      showToast(`✅ ${response.data.checked} پیام بررسی شد`, 'success');
      loadMessages();
      setSelectedMessages([]);
    } catch (error) {
      console.error('Error bulk checking:', error);
      showToast('خطا در بررسی گروهی', 'error');
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'pending': { label: '⏳ در انتظار', color: 'warning' },
      'sent': { label: '📤 ارسال شده', color: 'info' },
      'delivered': { label: '✅ تحویل شده', color: 'success' },
      'failed': { label: '❌ ناموفق', color: 'danger' },
      'blacklist': { label: '⛔ لیست سیاه', color: 'dark' },
      'unknown': { label: '❓ نامشخص', color: 'secondary' },
    };
    return statusMap[status] || { label: status, color: 'secondary' };
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString('fa-IR');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="sms-messages">
      {/* ===== Header ===== */}
      <div className="messages-header">
        <div>
          <h2>📤 پیام‌های ارسالی</h2>
          <p className="messages-hint">مجموع: {total.toLocaleString()} پیام</p>
        </div>

        <div className="header-actions">
          {selectedMessages.length > 0 && (
            <>
              <span className="selected-count">
                {selectedMessages.length} انتخاب‌شده
              </span>
              <button className="btn-bulk-check" onClick={handleBulkCheck}>
                🔄 بررسی وضعیت گروهی
              </button>
            </>
          )}
        </div>
      </div>

      {/* ===== Filters ===== */}
      <div className="messages-filters">
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
          <label>🚦 وضعیت</label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <label>📋 رویداد</label>
          <select
            value={filters.event_key}
            onChange={(e) => handleFilterChange('event_key', e.target.value)}
          >
            {eventOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <label>🎯 روش ارسال</label>
          <select
            value={filters.send_method}
            onChange={(e) => handleFilterChange('send_method', e.target.value)}
          >
            <option value="">همه</option>
            <option value="otp">OTP</option>
            <option value="single">تکی</option>
          </select>
        </div>

        <div className="filter-item">
          <label>📱 شماره</label>
          <input
            type="text"
            value={filters.phone}
            onChange={(e) => handleFilterChange('phone', e.target.value)}
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
            provider: '', status: '', event_key: '', send_method: '',
            phone: '', date_from: '', date_to: '',
          })}
        >
          🔄 پاک‌سازی فیلترها
        </button>
      </div>

      {/* ===== Table ===== */}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="messages-table-wrapper">
            <table className="messages-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={selectedMessages.length === messages.length && messages.length > 0}
                    />
                  </th>
                  <th>تاریخ</th>
                  <th>شماره</th>
                  <th>Provider</th>
                  <th>روش</th>
                  <th>رویداد</th>
                  <th>وضعیت</th>
                  <th>هزینه</th>
                  <th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((msg) => {
                  const badge = getStatusBadge(msg.status);
                  return (
                    <tr key={msg.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedMessages.includes(msg.id)}
                          onChange={() => handleSelect(msg.id)}
                        />
                      </td>
                      <td className="date-cell">{formatDate(msg.created_at)}</td>
                      <td className="phone-cell" dir="ltr">{msg.phone_number}</td>
                      <td>
                        <span className={`provider-chip ${msg.provider}`}>
                          {msg.provider === 'ghasedak' ? '📱 قاصدک' : '📲 sms.ir'}
                        </span>
                      </td>
                      <td>
                        <span className={`method-chip ${msg.send_method}`}>
                          {msg.send_method === 'otp' ? '📋 OTP' : '📝 تکی'}
                        </span>
                      </td>
                      <td className="event-cell">{msg.event_key || '—'}</td>
                      <td>
                        <span className={`status-badge status-${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="cost-cell">
                        {msg.cost ? `${msg.cost.toLocaleString()} ر` : '—'}
                      </td>
                      <td className="actions-cell">
                        <button
                          className="btn-icon"
                          onClick={() => handleViewDetail(msg)}
                          title="مشاهده"
                        >
                          👁️
                        </button>
                        {msg.status !== 'delivered' && msg.external_id && (
                          <button
                            className="btn-icon"
                            onClick={() => handleCheckStatus(msg.id)}
                            title="بررسی وضعیت"
                          >
                            🔄
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {messages.length === 0 && (
              <div className="empty-state">
                <p>هیچ پیامی یافت نشد</p>
              </div>
            )}
          </div>

          {/* ===== Pagination ===== */}
          {total > pageSize && (
            <div className="pagination">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
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
              <h3>📄 جزئیات پیام</h3>
              <button className="btn-close" onClick={() => setShowDetailModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="detail-row">
                <span className="detail-label">شناسه:</span>
                <span className="detail-value" dir="ltr">#{selectedMessage.id}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">شماره گیرنده:</span>
                <span className="detail-value" dir="ltr">{selectedMessage.phone_number}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Provider:</span>
                <span className="detail-value">{selectedMessage.provider_display || selectedMessage.provider}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">روش ارسال:</span>
                <span className="detail-value">{selectedMessage.send_method_display || selectedMessage.send_method}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">وضعیت:</span>
                <span className="detail-value">{selectedMessage.status_display || selectedMessage.status}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">تاریخ ایجاد:</span>
                <span className="detail-value">{formatDate(selectedMessage.created_at)}</span>
              </div>
              {selectedMessage.sent_at && (
                <div className="detail-row">
                  <span className="detail-label">تاریخ ارسال:</span>
                  <span className="detail-value">{formatDate(selectedMessage.sent_at)}</span>
                </div>
              )}
              {selectedMessage.delivered_at && (
                <div className="detail-row">
                  <span className="detail-label">تاریخ تحویل:</span>
                  <span className="detail-value">{formatDate(selectedMessage.delivered_at)}</span>
                </div>
              )}
              {selectedMessage.external_id && (
                <div className="detail-row">
                  <span className="detail-label">شناسه provider:</span>
                  <span className="detail-value" dir="ltr">{selectedMessage.external_id}</span>
                </div>
              )}
              {selectedMessage.error_message && (
                <div className="detail-row error">
                  <span className="detail-label">خطا:</span>
                  <span className="detail-value">{selectedMessage.error_message}</span>
                </div>
              )}
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

export default SmsMessages;