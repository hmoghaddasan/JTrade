// frontend/src/components/ai/ConsultationProgressWidget.js

import React from 'react';
import { useConsultation } from '../../contexts/ConsultationContext';
import { useNavigate } from 'react-router-dom';
import './ConsultationProgressWidget.css';

const ConsultationProgressWidget = () => {
  const { activeConsultations, toastMessages, clearToast } = useConsultation();
  const navigate = useNavigate();

  console.log('🖥️ [Widget] Rendering with activeConsultations:', activeConsultations);
  console.log('🖥️ [Widget] toastMessages:', toastMessages);

  if (activeConsultations.length === 0 && toastMessages.length === 0) {
    return null;
  }

  const handleWidgetClick = (consultationId) => {
    navigate(`/ai-consultation/detail/${consultationId}`);
  };

  const handleToastClick = (toast) => {
    if (toast.consultationId) {
      navigate(`/ai-consultation/detail/${toast.consultationId}`);
    }
    clearToast(toast.id);
  };

  const stageEmojis = ['📊', '🔄', '🧠', '📊', '✍️', '✅'];

  const getProgressColor = (status) => {
    if (status === 'completed') return '#2e7d32';
    if (status === 'failed') return '#c62828';
    return '#1a237e';
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return '⏳ در انتظار';
      case 'processing': return '🔄 در حال پردازش';
      case 'completed': return '✅ تکمیل شده';
      case 'failed': return '❌ خطا';
      default: return '⏳ در انتظار';
    }
  };

  return (
    <>
      {/* ویجت مشاوره‌های فعال */}
      {activeConsultations.length > 0 && (
        <div className="consultation-widget">
          <div className="widget-header">
            <span className="widget-icon">🧠</span>
            <span className="widget-title">مشاوره AI</span>
            <span className="widget-badge">{activeConsultations.length}</span>
          </div>
          <div className="widget-body">
            {activeConsultations.map((consult) => {
              const stageIndex = Math.min(consult.stage || 0, consult.stageLabels?.length - 1 || 5);
              const stageEmoji = stageEmojis[stageIndex] || '⏳';
              const stageLabel = consult.stageLabels?.[stageIndex] || 'در حال پردازش';

              return (
                <div
                  key={consult.id}
                  className="widget-item"
                  onClick={() => handleWidgetClick(consult.id)}
                >
                  <div className="item-info">
                    <span className="item-symbol">{consult.symbol}</span>
                    <span className="item-time">⏱️ {consult.elapsed}s</span>
                  </div>
                  <div className="item-stage">
                    <span className="stage-emoji">{stageEmoji}</span>
                    <span className="stage-label">{stageLabel}</span>
                  </div>
                  <div className="item-progress">
                    <div
                      className="progress-bar"
                      style={{
                        width: `${consult.progress}%`,
                        background: getProgressColor(consult.status),
                      }}
                    />
                  </div>
                  <div className="item-status">
                    {getStatusText(consult.status)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* پیام‌های Toast */}
      {toastMessages.length > 0 && (
        <div className="toast-container">
          {toastMessages.map((toast) => (
            <div
              key={toast.id}
              className={`toast-item ${toast.type}`}
              onClick={() => handleToastClick(toast)}
            >
              <span className="toast-icon">
                {toast.type === 'success' ? '✅' : '❌'}
              </span>
              <span className="toast-message">{toast.message}</span>
              <div className="toast-actions">
                {toast.consultationId && toast.action === 'view' && (
                  <button
                    className="toast-btn-view"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/ai-consultation/detail/${toast.consultationId}`);
                      clearToast(toast.id);
                    }}
                  >
                    مشاهده
                  </button>
                )}
                <button
                  className="toast-close"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearToast(toast.id);
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default ConsultationProgressWidget;