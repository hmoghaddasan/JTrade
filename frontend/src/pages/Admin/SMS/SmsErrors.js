// frontend/src/pages/Admin/SMS/SmsErrors.js

import React, { useState, useEffect } from 'react';
import adminService from '../../../services/adminService';
import { useToast } from '../../../contexts/ToastContext';
import LoadingSpinner from '../../../components/Admin/LoadingSpinner';
import './SmsErrors.css';

const SmsErrors = () => {
  const { showToast } = useToast();
  const [errors, setErrors] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [filters, setFilters] = useState({
    provider: '',
    severity: '',
    error_type: '',
    is_resolved: '',
    date_from: '',
    date_to: '',
  });
  const [selectedError, setSelectedError] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolveNote, setResolveNote] = useState('');

  const severityOptions = [
    { value: '', label: 'همه' },
    { value: 'low', label: '🟢 پایین' },
    { value: 'medium', label: '🟡 متوسط' },
    { value: 'high', label: '🟠 بالا' },
    { value: 'critical', label: '🔴 بحرانی' },
  ];

  const typeOptions = [
    { value: '', label: 'همه' },
    { value: 'api_error', label: '🌐 خطای API' },
    { value: 'network_error', label: '📡 خطای شبکه' },
    { value: 'credit_low', label: '💰 کمبود اعتبار' },
    { value: 'config_error', label: '⚙️ خطای تنظیمات' },
    { value: 'template_error', label: '📋 خطای قالب' },
    { value: 'auth_error', label: '🔐 خطای احراز هویت' },
    { value: 'rate_limit', label: '⏱️ محدودیت نرخ' },
    { value: 'unknown', label: '❓ نامشخص' },
  ];

  useEffect(() => {
    loadErrors();
    loadStats();
  }, [page, filters]);

  const loadErrors = async () => {
    setLoading(true);
    try {
      const params = { page, page_size: pageSize };
      Object.keys(filters).forEach(key => {
        if (filters[key] !== '') params[key] = filters[key];
      });

      const response = await adminService.getSmsErrors(params);
      const data = response.data.results || response.data;
      setErrors(Array.isArray(data) ? data : []);
      setTotal(response.data.count || data.length || 0);
    } catch (error) {
      console.error('Error loading errors:', error);
      showToast('خطا در بارگذاری خطاها', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await adminService.getSmsErrorsStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleViewDetail = (error) => {
    setSelectedError(error);
    setShowDetailModal(true);
  };

  const handleOpenResolve = (error) => {
    setSelectedError(error);
    setResolveNote('');
    setShowResolveModal(true);
  };

  const handleResolve = async () => {
    if (!selectedError) return;

    try {
      await adminService.resolveSmsError(selectedError.id, { note: resolveNote });
      showToast('✅ خطا برطرف شد', 'success');
      setShowResolveModal(false);
      loadErrors();
      loadStats();
    } catch (error) {
      console.error('Error resolving:', error);
      showToast('خطا در برطرف کردن', 'error');
    }
  };

  const getSeverityBadge = (severity) => {
    const map = {
      'low': { label: '🟢 پایین', color: 'success' },
      'medium': { label: '🟡 متوسط', color: 'warning' },
      'high': { label: '🟠 بالا', color: 'orange' },
      'critical': { label: '🔴 بحرانی', color: 'danger' },
    };
    return map[severity] || { label: severity, color: 'secondary' };
  };

  const getTypeLabel = (type) => {
    const option = typeOptions.find(o => o.value === type);
    return option ? option.label : type;
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
    <div className="sms-errors">
      {/* ===== Header ===== */}
      <div className="errors-header">
        <div>
          <h2>⚠️ لاگ خطاهای پیامک</h2>
          <p className="errors-hint">مجموع: {total.toLocaleString()} خطا</p>
        </div>
      </div>

      {/* ===== Stats Cards ===== */}
      {stats && (
        <div className="errors-stats-grid">
          <div className="error-stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-info">
              <span className="stat-label">کل خطاها</span>
              <span className="stat-value">{stats.total || 0}</span>
            </div>
          </div>

          <div className="error-stat-card danger">
            <div className="stat-icon">🔴</div>
            <div className="stat-info">
              <span className="stat-label">برطرف نشده</span>
              <span className="stat-value">{stats.unresolved || 0}</span>
            </div>
          </div>

          <div className="error-stat-card info">
            <div className="stat-icon">📤</div>
            <div className="stat-info">
              <span className="stat-label">اطلاع به ادمین</span>
              <span className="stat-value">{stats.admin_notified || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* ===== Filters ===== */}
      <div className="errors-filters">
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
          <label>🔴 شدت</label>
          <select
            value={filters.severity}
            onChange={(e) => handleFilterChange('severity', e.target.value)}
          >
            {severityOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <label>📋 نوع خطا</label>
          <select
            value={filters.error_type}
            onChange={(e) => handleFilterChange('error_type', e.target.value)}
          >
            {typeOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <label>✅ وضعیت برطرف</label>
          <select
            value={filters.is_resolved}
            onChange={(e) => handleFilterChange('is_resolved', e.target.value)}
          >
            <option value="">همه</option>
            <option value="false">🔴 برطرف نشده</option>
            <option value="true">✅ برطرف شده</option>
          </select>
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
            provider: '', severity: '', error_type: '',
            is_resolved: '', date_from: '', date_to: '',
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
          <div className="errors-table-wrapper">
            <table className="errors-table">
              <thead>
                <tr>
                  <th>تاریخ</th>
                  <th>Provider</th>
                  <th>نوع خطا</th>
                  <th>شدت</th>
                  <th>پیام خطا</th>
                  <th>وضعیت</th>
                  <th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {errors.map((error) => {
                  const badge = getSeverityBadge(error.severity);
                  return (
                    <tr key={error.id} className={error.is_resolved ? 'resolved-row' : ''}>
                      <td className="date-cell">{formatDate(error.created_at)}</td>
                      <td>
                        <span className={`provider-chip ${error.provider}`}>
                          {error.provider_display || error.provider}
                        </span>
                      </td>
                      <td className="type-cell">{getTypeLabel(error.error_type)}</td>
                      <td>
                        <span className={`severity-badge severity-${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="error-message-cell">
                        <span className="error-preview">
                          {error.error_message.length > 60
                            ? `${error.error_message.substring(0, 60)}...`
                            : error.error_message}
                        </span>
                      </td>
                      <td>
                        {error.is_resolved ? (
                          <span className="status-resolved">✅ برطرف شده</span>
                        ) : (
                          <span className="status-unresolved">🔴 برطرف نشده</span>
                        )}
                      </td>
                      <td className="actions-cell">
                        <button
                          className="btn-icon"
                          onClick={() => handleViewDetail(error)}
                          title="مشاهده"
                        >
                          👁️
                        </button>
                        {!error.is_resolved && (
                          <button
                            className="btn-icon"
                            onClick={() => handleOpenResolve(error)}
                            title="برطرف کردن"
                          >
                            ✅
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {errors.length === 0 && (
              <div className="empty-state">
                <p>🎉 هیچ خطایی یافت نشد</p>
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
      {showDetailModal && selectedError && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content sms-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚠️ جزئیات خطا</h3>
              <button className="btn-close" onClick={() => setShowDetailModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="detail-row">
                <span className="detail-label">شناسه:</span>
                <span className="detail-value" dir="ltr">#{selectedError.id}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Provider:</span>
                <span className="detail-value">{selectedError.provider_display || selectedError.provider}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">نوع خطا:</span>
                <span className="detail-value">{getTypeLabel(selectedError.error_type)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">شدت:</span>
                <span className="detail-value">{getSeverityBadge(selectedError.severity).label}</span>
              </div>
              {selectedError.error_code && (
                <div className="detail-row">
                  <span className="detail-label">کد خطا:</span>
                  <span className="detail-value" dir="ltr">{selectedError.error_code}</span>
                </div>
              )}
              <div className="detail-row">
                <span className="detail-label">تاریخ:</span>
                <span className="detail-value">{formatDate(selectedError.created_at)}</span>
              </div>
              {selectedError.admin_notified && (
                <div className="detail-row">
                  <span className="detail-label">اطلاع به ادمین:</span>
                  <span className="detail-value">
                    ✅ {formatDate(selectedError.admin_notified_at)}
                    {selectedError.notified_via_provider && (
                      <span> (از طریق {selectedError.notified_via_provider})</span>
                    )}
                  </span>
                </div>
              )}
              <div className="detail-row full">
                <span className="detail-label">پیام خطا:</span>
                <div className="detail-message error-message">
                  {selectedError.error_message}
                </div>
              </div>
              {selectedError.is_resolved && (
                <>
                  <div className="detail-row">
                    <span className="detail-label">برطرف توسط:</span>
                    <span className="detail-value">{selectedError.resolved_by_name || '—'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">تاریخ برطرف:</span>
                    <span className="detail-value">{formatDate(selectedError.resolved_at)}</span>
                  </div>
                  {selectedError.resolution_note && (
                    <div className="detail-row full">
                      <span className="detail-label">یادداشت برطرف:</span>
                      <div className="detail-message">{selectedError.resolution_note}</div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== Resolve Modal ===== */}
      {showResolveModal && selectedError && (
        <div className="modal-overlay" onClick={() => setShowResolveModal(false)}>
          <div className="modal-content resolve-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✅ برطرف کردن خطا</h3>
              <button className="btn-close" onClick={() => setShowResolveModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <p className="resolve-info">
                آیا از برطرف کردن این خطا اطمینان دارید؟
              </p>

              <div className="resolve-error-preview">
                <strong>پیام خطا:</strong>
                <p>{selectedError.error_message}</p>
              </div>

              <div className="form-group">
                <label>یادداشت (اختیاری):</label>
                <textarea
                  value={resolveNote}
                  onChange={(e) => setResolveNote(e.target.value)}
                  placeholder="یادداشتی برای علت برطرف کردن..."
                  rows={3}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowResolveModal(false)}>
                انصراف
              </button>
              <button className="btn-confirm" onClick={handleResolve}>
                ✅ برطرف کن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmsErrors;