// frontend/src/pages/Admin/Consultations/ConsultationDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import adminService from '../../../services/adminService';
import LoadingSpinner from '../../../components/Admin/LoadingSpinner';
import StatusBadge from '../../../components/Admin/StatusBadge';
import './ConsultationDetail.css';

const ConsultationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [consultation, setConsultation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConsultation();
  }, [id]);

  const loadConsultation = async () => {
    setLoading(true);
    try {
      const response = await adminService.getConsultation(id);
      setConsultation(response.data);
    } catch (error) {
      console.error('Error loading consultation:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!consultation) return <div className="error">مشاوره یافت نشد</div>;

  const { ai_response } = consultation;

  return (
    <div className="consultation-detail-page">
      <div className="page-header">
        <h1>جزئیات مشاوره #{consultation.id}</h1>
        <button onClick={() => navigate('/admin/consultations')} className="btn-back">
          ↩️ بازگشت
        </button>
      </div>

      <div className="detail-grid">
        <div className="info-card">
          <h3>اطلاعات کاربر</h3>
          <div className="info-row">
            <span className="label">شماره تلفن:</span>
            <span className="value">{consultation.user_phone}</span>
          </div>
          <div className="info-row">
            <span className="label">نام:</span>
            <span className="value">{consultation.user_name || '—'}</span>
          </div>
        </div>

        <div className="info-card">
          <h3>اطلاعات معامله</h3>
          <div className="info-row">
            <span className="label">نماد:</span>
            <span className="value">{consultation.symbol}</span>
          </div>
          <div className="info-row">
            <span className="label">جهت:</span>
            <StatusBadge status={consultation.direction === 'Buy' ? 'green' : 'red'} label={consultation.direction === 'Buy' ? 'خرید' : 'فروش'} />
          </div>
          <div className="info-row">
            <span className="label">قیمت ورود:</span>
            <span className="value">{consultation.entry_price}</span>
          </div>
          <div className="info-row">
            <span className="label">حد ضرر:</span>
            <span className="value">{consultation.stop_loss || '—'}</span>
          </div>
          <div className="info-row">
            <span className="label">حد سود:</span>
            <span className="value">{consultation.take_profit || '—'}</span>
          </div>
          <div className="info-row">
            <span className="label">وضعیت بازار:</span>
            <span className="value">{consultation.market_condition_display || '—'}</span>
          </div>
          <div className="info-row">
            <span className="label">احساسات:</span>
            <span className="value">{consultation.emotion_display || '—'}</span>
          </div>
        </div>

        <div className="info-card">
          <h3>وضعیت مشاوره</h3>
          <div className="info-row">
            <span className="label">وضعیت:</span>
            <StatusBadge
              status={consultation.status === 'completed' ? 'green' : consultation.status === 'processing' ? 'blue' : consultation.status === 'failed' ? 'red' : 'gray'}
              label={consultation.status_display}
            />
          </div>
          <div className="info-row">
            <span className="label">مدل استفاده‌شده:</span>
            <span className="value">{consultation.model_used || '—'}</span>
          </div>
          <div className="info-row">
            <span className="label">امتیاز AI:</span>
            <span className="value">{consultation.ai_score}/100</span>
          </div>
          <div className="info-row">
            <span className="label">تاریخ ایجاد:</span>
            <span className="value">{new Date(consultation.created_at).toLocaleString('fa-IR')}</span>
          </div>
        </div>

        {consultation.price_warning && (
          <div className="info-card full-width warning-card">
            <h3>⚠️ هشدار قیمت</h3>
            <p>{consultation.price_warning}</p>
            {consultation.live_price && (
              <div className="info-row">
                <span className="label">قیمت لحظه‌ای:</span>
                <span className="value">{consultation.live_price}</span>
              </div>
            )}
            {consultation.price_diff_percent && (
              <div className="info-row">
                <span className="label">درصد تفاوت:</span>
                <span className="value" style={{ color: Math.abs(consultation.price_diff_percent) > 20 ? 'red' : 'green' }}>
                  {consultation.price_diff_percent}%
                </span>
              </div>
            )}
          </div>
        )}

        {ai_response && (
          <>
            <div className="info-card full-width">
              <h3>🧠 تحلیل AI</h3>
              {ai_response.strengths && ai_response.strengths.length > 0 && (
                <>
                  <h4>نقاط قوت</h4>
                  <ul className="response-list strengths">
                    {ai_response.strengths.map((item, i) => (
                      <li key={i}>✅ {item}</li>
                    ))}
                  </ul>
                </>
              )}
              {ai_response.warnings && ai_response.warnings.length > 0 && (
                <>
                  <h4>هشدارها</h4>
                  <ul className="response-list warnings">
                    {ai_response.warnings.map((item, i) => (
                      <li key={i}>⚠️ {item}</li>
                    ))}
                  </ul>
                </>
              )}
              {ai_response.suggestion && (
                <>
                  <h4>پیشنهاد</h4>
                  <p className="suggestion">{ai_response.suggestion}</p>
                </>
              )}
              {ai_response.psychology && (
                <>
                  <h4>تحلیل روانشناختی</h4>
                  <p className="psychology">{ai_response.psychology}</p>
                </>
              )}
              {ai_response.tip && (
                <>
                  <h4>نکته</h4>
                  <p className="tip">💡 {ai_response.tip}</p>
                </>
              )}
            </div>

            {ai_response.suggested_sl || ai_response.suggested_tp && (
              <div className="info-card full-width">
                <h3>📊 پیشنهادات مدیریت معامله</h3>
                {ai_response.suggested_sl && (
                  <div className="info-row">
                    <span className="label">حد ضرر پیشنهادی:</span>
                    <span className="value">{ai_response.suggested_sl}</span>
                  </div>
                )}
                {ai_response.suggested_tp && (
                  <div className="info-row">
                    <span className="label">حد سود پیشنهادی:</span>
                    <span className="value">{ai_response.suggested_tp}</span>
                  </div>
                )}
                {ai_response.suggested_position && (
                  <div className="info-row">
                    <span className="label">اندازه پوزیشن:</span>
                    <span className="value">{ai_response.suggested_position}</span>
                  </div>
                )}
                {ai_response.suggested_timing && (
                  <div className="info-row">
                    <span className="label">زمان‌بندی:</span>
                    <span className="value">{ai_response.suggested_timing}</span>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {consultation.feedback_score && (
          <div className="info-card full-width">
            <h3>⭐ بازخورد کاربر</h3>
            <div className="info-row">
              <span className="label">امتیاز:</span>
              <span className="value">{'⭐'.repeat(consultation.feedback_score)}</span>
            </div>
            {consultation.feedback_helpfulness && (
              <div className="info-row">
                <span className="label">مفید بودن:</span>
                <span className="value">{consultation.feedback_helpfulness}</span>
              </div>
            )}
            {consultation.feedback_comment && (
              <div className="info-row">
                <span className="label">نظر:</span>
                <span className="value">{consultation.feedback_comment}</span>
              </div>
            )}
            {consultation.is_followed && (
              <div className="info-row">
                <span className="label">پایبندی:</span>
                <span className="value">{consultation.is_followed === 'full' ? 'کاملاً' : consultation.is_followed === 'partial' ? 'تا حدی' : 'خیر'}</span>
              </div>
            )}
            {consultation.trade_result && (
              <div className="info-row">
                <span className="label">نتیجه معامله:</span>
                <StatusBadge
                  status={consultation.trade_result === 'win' ? 'green' : consultation.trade_result === 'loss' ? 'red' : 'gray'}
                  label={consultation.trade_result === 'win' ? 'سود' : consultation.trade_result === 'loss' ? 'زیان' : 'مساوی'}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConsultationDetail;