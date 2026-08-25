// frontend/src/pages/Admin/Messages/SystemMessageList.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import adminService from '../../../services/adminService';
import './SystemMessageList.css';

const SystemMessageList = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState('all');

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminService.getSystemMessages();
      console.log('📥 System messages response:', response);

      // ✅ بررسی انواع مختلف پاسخ
      let data = response.data;

      // اگر data آبجکت است و دارای results است
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        if (data.results && Array.isArray(data.results)) {
          data = data.results;
        } else if (data.data && Array.isArray(data.data)) {
          data = data.data;
        } else if (data.items && Array.isArray(data.items)) {
          data = data.items;
        } else {
          // اگر آبجکت است ولی هیچ کدام از موارد بالا نیست، تبدیل به آرایه
          data = [data];
        }
      }

      // اگر data آرایه نیست، تبدیل به آرایه خالی
      if (!Array.isArray(data)) {
        console.warn('⚠️ Response data is not an array:', data);
        data = [];
      }

      setMessages(data);
    } catch (err) {
      console.error('❌ Error loading system messages:', err);
      setError('خطا در بارگذاری پیام‌های سیستمی');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('آیا از حذف این پیام اطمینان دارید؟')) return;

    try {
      await adminService.deleteSystemMessage(id);
      setMessages(prev => prev.filter(msg => msg.id !== id));
    } catch (err) {
      console.error('Error deleting system message:', err);
      alert('خطا در حذف پیام');
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      const message = messages.find(m => m.id === id);
      if (!message) return;

      const updated = { ...message, is_active: !currentStatus };
      await adminService.updateSystemMessage(id, updated);

      setMessages(prev => prev.map(m =>
        m.id === id ? { ...m, is_active: !currentStatus } : m
      ));
    } catch (err) {
      console.error('Error toggling system message:', err);
      alert('خطا در تغییر وضعیت پیام');
    }
  };

  // ✅ اطمینان از اینکه messages همیشه آرایه است
  const safeMessages = Array.isArray(messages) ? messages : [];

  const filteredMessages = safeMessages.filter(msg => {
    if (!msg) return false;
    const matchesSearch = (msg.title || '').includes(searchTerm) ||
                          (msg.message || '').includes(searchTerm);
    const matchesFilter = filterActive === 'all' ||
                         (filterActive === 'active' && msg.is_active) ||
                         (filterActive === 'inactive' && !msg.is_active);
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner">⏳</div>
        <p>در حال بارگذاری پیام‌ها...</p>
      </div>
    );
  }

  return (
    <div className={`system-message-list ${isDark ? 'dark' : 'light'}`}>
      <div className="page-header">
        <h2>📢 پیام‌های سیستمی</h2>
        <button
          className="btn-primary"
          onClick={() => navigate('/admin/system-messages/new')}
        >
          ➕ پیام جدید
        </button>
      </div>

      <div className="filters">
        <input
          type="text"
          className="search-input"
          placeholder="🔍 جستجو در عنوان یا متن..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="filter-select"
          value={filterActive}
          onChange={(e) => setFilterActive(e.target.value)}
        >
          <option value="all">همه</option>
          <option value="active">فعال</option>
          <option value="inactive">غیرفعال</option>
        </select>
        <button className="btn-refresh" onClick={loadMessages}>🔄</button>
      </div>

      {error && (
        <div className="error-message">
          ❌ {error}
          <button onClick={loadMessages}>تلاش مجدد</button>
        </div>
      )}

      {filteredMessages.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📭</span>
          <p>هیچ پیام سیستمی یافت نشد</p>
        </div>
      ) : (
        <div className="messages-table-wrapper">
          <table className="messages-table">
            <thead>
              <tr>
                <th>عنوان</th>
                <th>متن</th>
                <th>وضعیت</th>
                <th>تاریخ شروع</th>
                <th>تاریخ پایان</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {filteredMessages.map((msg) => (
                <tr key={msg.id}>
                  <td className="title-cell">
                    <span className="msg-icon">📢</span>
                    {msg.title || 'بدون عنوان'}
                  </td>
                  <td className="message-cell">
                    <div className="message-preview">
                      {(msg.message || '').length > 60 ? (msg.message || '').substring(0, 60) + '...' : (msg.message || '')}
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${msg.is_active ? 'active' : 'inactive'}`}>
                      {msg.is_active ? '✅ فعال' : '❌ غیرفعال'}
                    </span>
                  </td>
                  <td>{msg.start_date ? new Date(msg.start_date).toLocaleDateString('fa-IR') : '-'}</td>
                  <td>{msg.end_date ? new Date(msg.end_date).toLocaleDateString('fa-IR') : '-'}</td>
                  <td className="actions-cell">
                    <button
                      className="btn-edit"
                      onClick={() => navigate(`/admin/system-messages/${msg.id}/edit`)}
                      title="ویرایش"
                    >
                      ✏️
                    </button>
                    <button
                      className={`btn-toggle ${msg.is_active ? 'active' : 'inactive'}`}
                      onClick={() => handleToggleActive(msg.id, msg.is_active)}
                      title={msg.is_active ? 'غیرفعال کردن' : 'فعال کردن'}
                    >
                      {msg.is_active ? '🔕' : '🔔'}
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(msg.id)}
                      title="حذف"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SystemMessageList;