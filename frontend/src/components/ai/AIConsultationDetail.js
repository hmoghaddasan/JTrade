// frontend/src/components/ai/AIConsultationDetail.js

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import AIService from '../../services/aiService';
import './AIConsultationDetail.css';

const AIConsultationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [consultation, setConsultation] = useState(null);

  useEffect(() => {
    const loadDetail = async () => {
      setLoading(true);
      try {
        const response = await AIService.getConsultationDetail(id);
        setConsultation(response.data);
      } catch (error) {
        console.error('Error loading consultation detail:', error);
        showToast('❌ خطا در دریافت جزئیات مشاوره', 'error');
        navigate('/ai-history');
      } finally {
        setLoading(false);
      }
    };
    if (id) loadDetail();
  }, [id, navigate, showToast]);

  if (loading) {
    return (
      <div className="ai-detail-loading">
        <div className="loading-spinner">⏳</div>
        <p>در حال بارگذاری جزئیات...</p>
      </div>
    );
  }

  if (!consultation) {
    return (
      <div className="ai-detail-error">
        <div className="error-icon">❌</div>
        <p>مشاوره یافت نشد</p>
        <button className="btn-back" onClick={() => navigate('/ai-history')}>
          ↩️ بازگشت به تاریخچه
        </button>
      </div>
    );
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('fa-IR') + ' ' +
             new Date(dateStr).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  const getDirectionLabel = (dir) => {
    return dir === 'Buy' ? 'خرید' : 'فروش';
  };

  const getEmotionLabel = (emotion) => {
    const map = {
      'calm': 'آرام', 'excited': 'هیجان', 'fear': 'ترس', 'greed': 'طمع',
      'patient': 'صبر', 'stress': 'استرس', 'confident': 'بااعتمادبه‌نفس', 'uncertain': 'مردد'
    };
    return map[emotion] || emotion;
  };

  const getMarketConditionLabel = (condition) => {
    const map = {
      'trending': 'رونددار', 'ranging': 'رنج', 'neutral': 'خنثی', 'volatile': 'پرنوسان'
    };
    return map[condition] || condition;
  };

  return (
    <div className={`ai-consultation-detail ${isDark ? 'dark' : 'light'}`}>
      <div className="detail-header">
        <h2>🧠 جزئیات مشاوره هوشمند</h2>
        <button className="btn-back" onClick={() => navigate('/ai-history')}>
          ↩️ بازگشت به تاریخچه
        </button>
      </div>

      <div className="detail-content">
        <div className="detail-summary">
          <div className="summary-item">
            <span className="summary-label">نماد</span>
            <span className="summary-value">{consultation.symbol}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">جهت</span>
            <span className={`summary-value ${consultation.direction === 'Buy' ? 'buy' : 'sell'}`}>
              {getDirectionLabel(consultation.direction)}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">امتیاز AI</span>
            <span className={`summary-value score-${consultation.ai_score >= 70 ? 'high' : consultation.ai_score >= 40 ? 'medium' : 'low'}`}>
              {consultation.ai_score}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">تاریخ</span>
            <span className="summary-value">{formatDate(consultation.created_at)}</span>
          </div>
        </div>

        <div className="detail-grid">
          <div className="detail-row">
            <span className="label">قیمت ورود</span>
            <span className="value">{consultation.entry_price}</span>
          </div>
          {consultation.stop_loss && (
            <div className="detail-row">
              <span className="label">حد ضرر</span>
              <span className="value">{consultation.stop_loss}</span>
            </div>
          )}
          {consultation.take_profit && (
            <div className="detail-row">
              <span className="label">حد سود</span>
              <span className="value">{consultation.take_profit}</span>
            </div>
          )}
          {consultation.market_condition && (
            <div className="detail-row">
              <span className="label">وضعیت بازار</span>
              <span className="value">{getMarketConditionLabel(consultation.market_condition)}</span>
            </div>
          )}
          {consultation.emotion && (
            <div className="detail-row">
              <span className="label">احساسات</span>
              <span className="value">{getEmotionLabel(consultation.emotion)}</span>
            </div>
          )}
          {consultation.time_ny && (
            <div className="detail-row">
              <span className="label">ساعت (NY)</span>
              <span className="value">{consultation.time_ny}</span>
            </div>
          )}
          {consultation.user_question && (
            <div className="detail-row">
              <span className="label">سوال کاربر</span>
              <span className="value">{consultation.user_question}</span>
            </div>
          )}
        </div>

        <div className="detail-ai-response">
          <h3>🤖 تحلیل کامل AI</h3>

          {consultation.ai_response?.strengths?.length > 0 && (
            <div className="response-section strengths">
              <h4>✅ نقاط قوت</h4>
              <ul>
                {consultation.ai_response.strengths.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {consultation.ai_response?.warnings?.length > 0 && (
            <div className="response-section warnings">
              <h4>⚠️ هشدارها</h4>
              <ul>
                {consultation.ai_response.warnings.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {consultation.ai_response?.suggestion && (
            <div className="response-section suggestion">
              <h4>💡 پیشنهاد عملی</h4>
              <p>{consultation.ai_response.suggestion}</p>
            </div>
          )}

          {consultation.ai_response?.tip && (
            <div className="response-section tip">
              <h4>📖 نکته آموزشی</h4>
              <p>{consultation.ai_response.tip}</p>
            </div>
          )}
        </div>

        <div className="detail-feedback">
          <h3>📝 بازخورد</h3>
          {consultation.feedback_score ? (
            <div className="feedback-info">
              <div className="feedback-row">
                <span className="feedback-label">امتیاز:</span>
                <span className="feedback-value">{consultation.feedback_score}/۵</span>
              </div>
              <div className="feedback-row">
                <span className="feedback-label">پیروی:</span>
                <span className="feedback-value">{consultation.is_followed}</span>
              </div>
              <div className="feedback-row">
                <span className="feedback-label">نتیجه معامله:</span>
                <span className="feedback-value">{consultation.trade_result}</span>
              </div>
              {consultation.feedback_comment && (
                <div className="feedback-row">
                  <span className="feedback-label">نظر:</span>
                  <span className="feedback-value">{consultation.feedback_comment}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="no-feedback">هنوز بازخوردی برای این مشاوره ثبت نشده است.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIConsultationDetail;