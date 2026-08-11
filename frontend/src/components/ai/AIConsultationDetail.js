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
        // ✅ اصلاح: getConsultationDetail مستقیماً داده را برمی‌گرداند (نه در response.data)
        const data = await AIService.getConsultationDetail(id);
        setConsultation(data);
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

  const getFollowStatus = (status) => {
    const map = {
      'full': 'کاملاً',
      'partial': 'تا حدی',
      'none': 'خیر'
    };
    return map[status] || status;
  };

  const getTradeResult = (result) => {
    const map = {
      'win': 'سود',
      'loss': 'زیان',
      'breakeven': 'مساوی'
    };
    return map[result] || result;
  };

  const renderAIResponse = (aiResponse) => {
    if (!aiResponse) return <p>پاسخ AI موجود نیست.</p>;

    if (typeof aiResponse === 'object') {
      return (
        <div className="ai-response-content">
          {aiResponse.score !== undefined && (
            <div className="response-item">
              <strong>امتیاز اعتبار:</strong> {aiResponse.score}/۱۰۰
            </div>
          )}
          {aiResponse.strengths && aiResponse.strengths.length > 0 && (
            <div className="response-section strengths">
              <h4>✅ نقاط قوت</h4>
              <ul>
                {aiResponse.strengths.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {aiResponse.warnings && aiResponse.warnings.length > 0 && (
            <div className="response-section warnings">
              <h4>⚠️ هشدارها</h4>
              <ul>
                {aiResponse.warnings.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {aiResponse.suggestion && (
            <div className="response-section suggestion">
              <h4>💡 پیشنهاد عملی</h4>
              <p>{aiResponse.suggestion}</p>
            </div>
          )}
          {aiResponse.tip && (
            <div className="response-section tip">
              <h4>📖 نکته آموزشی</h4>
              <p>{aiResponse.tip}</p>
            </div>
          )}
          {aiResponse.psychology && (
            <div className="response-section psychology">
              <h4>🧠 تحلیل روانشناختی</h4>
              <p>{aiResponse.psychology}</p>
            </div>
          )}
          {aiResponse.suggested_sl && (
            <div className="response-item">
              <strong>حد ضرر پیشنهادی:</strong> {aiResponse.suggested_sl}
            </div>
          )}
          {aiResponse.suggested_tp && (
            <div className="response-item">
              <strong>حد سود پیشنهادی:</strong> {aiResponse.suggested_tp}
            </div>
          )}
          {aiResponse.suggested_timing && (
            <div className="response-item">
              <strong>زمان‌بندی پیشنهادی:</strong> {aiResponse.suggested_timing}
            </div>
          )}
          {aiResponse.suggested_position && (
            <div className="response-item">
              <strong>اندازه پوزیشن پیشنهادی:</strong> {aiResponse.suggested_position}
            </div>
          )}
        </div>
      );
    }

    return <p>{aiResponse}</p>;
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
          {consultation.session_type && (
            <div className="detail-row">
              <span className="label">نوع جلسه</span>
              <span className="value">{consultation.session_type}</span>
            </div>
          )}
          {consultation.strategy_type && (
            <div className="detail-row">
              <span className="label">نوع استراتژی</span>
              <span className="value">{consultation.strategy_type}</span>
            </div>
          )}
          {consultation.timeframes && (
            <div className="detail-row">
              <span className="label">تایم‌فریم‌ها</span>
              <span className="value">{consultation.timeframes}</span>
            </div>
          )}
          {consultation.risk_percent && (
            <div className="detail-row">
              <span className="label">درصد ریسک</span>
              <span className="value">{consultation.risk_percent}%</span>
            </div>
          )}
          {consultation.volume && (
            <div className="detail-row">
              <span className="label">حجم (لات)</span>
              <span className="value">{consultation.volume}</span>
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
          {renderAIResponse(consultation.ai_response)}
        </div>

        {consultation.comparison_stats && (
          <div className="detail-ai-response">
            <h3>📊 تحلیل داخلی از تاریخچه شما</h3>
            <div className="info-grid">
              <div className="detail-row">
                <span className="label">کل تریدها</span>
                <span className="value">{consultation.comparison_stats.total_trades || 0}</span>
              </div>
              <div className="detail-row">
                <span className="label">نرخ برد کلی</span>
                <span className={`value ${(consultation.comparison_stats.win_rate || 0) >= 50 ? 'positive' : 'negative'}`}>
                  {(consultation.comparison_stats.win_rate || 0).toFixed(1)}%
                </span>
              </div>
              <div className="detail-row">
                <span className="label">سود کل</span>
                <span className="value">{consultation.comparison_stats.total_profit ? `$${consultation.comparison_stats.total_profit.toFixed(2)}` : '-'}</span>
              </div>
              <div className="detail-row">
                <span className="label">میانگین R:R</span>
                <span className="value">{consultation.comparison_stats.avg_rr ? consultation.comparison_stats.avg_rr.toFixed(2) : '-'}</span>
              </div>
              {consultation.comparison_stats.best_strategy && (
                <div className="detail-row">
                  <span className="label">بهترین استراتژی</span>
                  <span className="value positive">{consultation.comparison_stats.best_strategy}</span>
                </div>
              )}
              {consultation.comparison_stats.best_hour && (
                <div className="detail-row">
                  <span className="label">بهترین ساعت</span>
                  <span className="value positive">{consultation.comparison_stats.best_hour}:۰۰</span>
                </div>
              )}
              {consultation.comparison_stats.most_common_emotion && (
                <div className="detail-row">
                  <span className="label">احساس غالب</span>
                  <span className="value">{consultation.comparison_stats.most_common_emotion}</span>
                </div>
              )}
            </div>
          </div>
        )}

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
                <span className="feedback-value">{getFollowStatus(consultation.is_followed)}</span>
              </div>
              <div className="feedback-row">
                <span className="feedback-label">نتیجه معامله:</span>
                <span className="feedback-value">{getTradeResult(consultation.trade_result)}</span>
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

        <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button className="btn-back" onClick={() => navigate('/ai-history')}>
            📋 بازگشت به تاریخچه
          </button>
          <button
            className="btn-back"
            style={{ background: '#1a237e', color: '#fff' }}
            onClick={() => navigate('/ai-consultation')}
          >
            🧠 مشاوره جدید
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIConsultationDetail;