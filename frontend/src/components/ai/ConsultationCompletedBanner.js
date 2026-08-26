// frontend/src/components/ai/ConsultationCompletedBanner.js

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useConsultation } from '../../contexts/ConsultationContext';
import './ConsultationCompletedBanner.css';

const ConsultationCompletedBanner = () => {
  const navigate = useNavigate();
  const { completedConsultations, dismissCompleted } = useConsultation();

  console.log('🖥️ [BANNER] Rendering with completedConsultations:', completedConsultations);

  if (completedConsultations.length === 0) {
    return null;
  }

  // ✅ اصلاح: مسیر بدون /detail اضافی
  const handleView = (consultationId) => {
    navigate(`/ai-consultation/${consultationId}`);
    dismissCompleted(consultationId);
  };

  const handleDismiss = (consultationId) => {
    dismissCompleted(consultationId);
  };

  return (
    <div className="completed-banner-container">
      {completedConsultations.map((item) => (
        <div key={item.id} className={`completed-banner ${item.isError ? 'error' : 'success'}`}>
          <div className="banner-icon">{item.isError ? '❌' : '✅'}</div>
          <div className="banner-content">
            <div className="banner-title">
              {item.isError
                ? `❌ مشاوره ${item.symbol} با خطا مواجه شد`
                : `✅ مشاوره ${item.symbol} با موفقیت تکمیل شد!`
              }
            </div>
            <div className="banner-message">
              {item.isError
                ? (item.error || 'لطفاً دوباره تلاش کنید.')
                : 'برای مشاهده تحلیل کامل، روی دکمه زیر کلیک کنید.'
              }
            </div>
          </div>
          <div className="banner-actions">
            {!item.isError && (
              <button
                className="banner-btn-view"
                onClick={() => handleView(item.id)}
              >
                👁️ مشاهده نتیجه
              </button>
            )}
            <button
              className="banner-btn-close"
              onClick={() => handleDismiss(item.id)}
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ConsultationCompletedBanner;