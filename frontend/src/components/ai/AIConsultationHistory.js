// frontend/src/components/ai/AIConsultationHistory.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { useConsultation } from '../../contexts/ConsultationContext';
import AIService from '../../services/aiService';
import './AIConsultationHistory.css';

const AIConsultationHistory = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { activeConsultations } = useConsultation();

  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState(null);

  const [feedbackForm, setFeedbackForm] = useState({
    is_followed: 'full',
    trade_result: 'win',
    feedback_score: 3,
    feedback_helpfulness: 'somewhat_helpful',
    feedback_comment: '',
  });

  const loadHistory = async (page = 1) => {
    setLoading(true);
    try {
      const response = await AIService.getHistory(page);
      setConsultations(response.results || []);
      setTotalPages(response.total_pages || 1);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error loading consultation history:', error);
      showToast('❌ خطا در دریافت تاریخچه مشاوره‌ها', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleOpenFeedback = (consultation) => {
    setSelectedConsultation(consultation);
    setFeedbackForm({
      is_followed: consultation.is_followed || 'full',
      trade_result: consultation.trade_result || 'win',
      feedback_score: consultation.feedback_score || 3,
      feedback_helpfulness: consultation.feedback_helpfulness || 'somewhat_helpful',
      feedback_comment: consultation.feedback_comment || '',
    });
    setShowFeedbackModal(true);
  };

  const handleFeedbackChange = (e) => {
    const { name, value } = e.target;
    setFeedbackForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitFeedback = async () => {
    if (!selectedConsultation) return;

    try {
      await AIService.submitFeedback(selectedConsultation.id, feedbackForm);
      showToast('✅ بازخورد با موفقیت ثبت شد', 'success');
      setShowFeedbackModal(false);
      loadHistory(currentPage);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      showToast('❌ خطا در ثبت بازخورد', 'error');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fa-IR') + ' ' + date.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  // ===== ترجمه فیلدها (مورد ۱۰) =====
  const translateSessionType = (type) => {
    const map = { 'High Pro': 'حرفه‌ای', 'Low Pro': 'مبتدی' };
    return map[type] || type;
  };

  const translateStrategyType = (type) => {
    const map = { 'LTP': 'بلندمدت', 'ITP': 'میان‌مدت', 'STP': 'کوتاه‌مدت' };
    return map[type] || type;
  };

  const translateMarketCondition = (condition) => {
    const map = {
      'trending': 'رونددار',
      'ranging': 'رنج',
      'neutral': 'خنثی',
      'volatile': 'پرنوسان'
    };
    return map[condition] || condition;
  };

  const translateEmotion = (emotion) => {
    const map = {
      'calm': 'آرام',
      'excited': 'هیجان',
      'fear': 'ترس',
      'greed': 'طمع',
      'patient': 'صبر',
      'stress': 'استرس',
      'confident': 'بااعتمادبه‌نفس',
      'uncertain': 'مردد'
    };
    return map[emotion] || emotion;
  };

  const getFeedbackStatus = (consultation) => {
    // مورد ۱۲: دکمه ثبت بازخورد در صورت ثبت نشدن
    if (consultation.feedback_score) {
      return <span className="feedback-done">✅ امتیاز {consultation.feedback_score}/۵</span>;
    }
    return (
      <button className="btn-feedback" onClick={() => handleOpenFeedback(consultation)}>
        ⭐ ثبت بازخورد
      </button>
    );
  };

  // ... سایر توابع کمکی ...

  const hasActiveConsultation = activeConsultations.length > 0;

  // ===== تابع چاپ (مورد ۱۱) =====
  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="ai-history-loading">
        <div className="loading-spinner">⏳</div>
        <p>در حال بارگذاری تاریخچه مشاوره‌ها...</p>
      </div>
    );
  }

  return (
    <div className={`ai-history-container ${isDark ? 'dark' : 'light'}`}>
      <div className="ai-history-header">
        <h2>🤖 تاریخچه مشاوره هوشمند</h2>
        <div className="header-actions">
          <button className="btn-back" onClick={() => navigate('/dashboard')}>
            ↩️ بازگشت به داشبورد
          </button>
          <button
            className="btn-consult"
            onClick={() => navigate('/ai-consultation')}
            disabled={hasActiveConsultation}  // ✅ غیرفعال در صورت وجود مشاوره فعال
          >
            {hasActiveConsultation ? '⏳ مشاوره در حال انجام...' : '🧠 مشاوره جدید'}
          </button>
          <span className="history-count">{consultations.length} مشاوره</span>
        </div>
      </div>

      {/* مورد ۷: نمایش هشدار مشاوره فعال */}
      {hasActiveConsultation && (
        <div className="active-consultation-warning">
          <span className="warning-icon">⏳</span>
          <div className="warning-content">
            <h4>یک مشاوره در حال پردازش است</h4>
            <p>
              مشاوره برای نماد {activeConsultations.map(c => c.symbol).join('، ')} در حال انجام است.
              لطفاً منتظر بمانید تا تکمیل شود.
            </p>
            <div className="warning-progress">
              {activeConsultations.map(c => (
                <div key={c.id} className="progress-item">
                  <span>{c.symbol}</span>
                  <div className="progress-bar-wrapper">
                    <div className="progress-bar" style={{ width: `${c.progress}%` }} />
                  </div>
                  <span>{c.progress}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {consultations.length === 0 ? (
        <div className="empty-history">
          <div className="empty-icon">📭</div>
          <h3>هیچ مشاوره‌ای ثبت نشده است</h3>
          <p>از مشاور هوشمند استفاده کنید تا تاریخچه شما در اینجا نمایش داده شود.</p>
          <button className="btn-consult" onClick={() => navigate('/ai-consultation')}>
            🧠 استفاده از مشاور AI
          </button>
        </div>
      ) : (
        <div className="history-list">
          {consultations.map((item) => (
            <div key={item.id} className="history-item">
              <div className="item-header">
                <div className="item-info">
                  <span className="item-symbol">{item.symbol}</span>
                  <span className={`item-direction ${item.direction === 'Buy' ? 'buy' : 'sell'}`}>
                    {item.direction === 'Buy' ? 'خرید' : 'فروش'}
                  </span>
                  <span className={`item-score ${item.ai_score >= 70 ? 'high' : item.ai_score >= 40 ? 'medium' : 'low'}`}>
                    امتیاز: {item.ai_score}
                  </span>
                </div>
                <span className="item-date">{formatDate(item.created_at)}</span>
              </div>

              <div className="item-body">
                <div className="item-price">
                  <span>💰 قیمت ورود: {item.entry_price}</span>
                  {item.stop_loss && <span>⛔ حد ضرر: {item.stop_loss}</span>}
                  {item.take_profit && <span>🎯 حد سود: {item.take_profit}</span>}
                </div>

                <div className="item-conditions">
                  {item.session_type && (
                    <span className="condition-badge">📋 {translateSessionType(item.session_type)}</span>
                  )}
                  {item.strategy_type && (
                    <span className="condition-badge">📊 {translateStrategyType(item.strategy_type)}</span>
                  )}
                  {item.market_condition && (
                    <span className="condition-badge">📊 {translateMarketCondition(item.market_condition)}</span>
                  )}
                  {item.emotion && (
                    <span className="emotion-badge">🧠 {translateEmotion(item.emotion)}</span>
                  )}
                  {item.user_question && (
                    <span className="question-badge" title={item.user_question}>
                      ❓ {item.user_question.substring(0, 50)}...
                    </span>
                  )}
                </div>

                {/* مورد ۱۲: دکمه ثبت بازخورد در صورت عدم ثبت */}
                <div className="item-feedback">
                  {item.is_followed && (
                    <span className="follow-status">
                      پیروی: {item.is_followed === 'full' ? '✅ کامل' : item.is_followed === 'partial' ? '⚡ تا حدی' : '❌ خیر'}
                    </span>
                  )}
                  {item.trade_result && (
                    <span className="trade-result">
                      نتیجه: {item.trade_result === 'win' ? '🟢 سود' : item.trade_result === 'loss' ? '🔴 زیان' : '🟡 مساوی'}
                    </span>
                  )}
                  {getFeedbackStatus(item)}
                </div>

                <div className="item-actions">
                  <button
                    className="btn-view-detail"
                    onClick={() => navigate(`/ai-consultation/detail/${item.id}`)}
                  >
                    👁️ مشاهده تحلیل کامل
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button className="btn-page" onClick={() => loadHistory(currentPage - 1)} disabled={currentPage === 1}>
            قبلی
          </button>
          <span className="page-info">صفحه {currentPage} از {totalPages}</span>
          <button className="btn-page" onClick={() => loadHistory(currentPage + 1)} disabled={currentPage === totalPages}>
            بعدی
          </button>
        </div>
      )}

      {/* مودال بازخورد */}
      {showFeedbackModal && selectedConsultation && (
        <div className="modal-overlay" onClick={() => setShowFeedbackModal(false)}>
          <div className="modal-content feedback-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📝 ثبت بازخورد</h3>
              <button className="modal-close" onClick={() => setShowFeedbackModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="feedback-info">
                <p><strong>نماد:</strong> {selectedConsultation.symbol}</p>
                <p><strong>جهت:</strong> {selectedConsultation.direction === 'Buy' ? 'خرید' : 'فروش'}</p>
                <p><strong>تاریخ:</strong> {formatDate(selectedConsultation.created_at)}</p>
                <p><strong>امتیاز AI:</strong> {selectedConsultation.ai_score}/۱۰۰</p>
              </div>
              <div className="feedback-form">
                {/* ... فیلدهای فرم بازخورد ... */}
                <div className="form-group">
                  <label>آیا از پیشنهاد AI پیروی کردید؟</label>
                  <select name="is_followed" value={feedbackForm.is_followed} onChange={handleFeedbackChange}>
                    <option value="full">کاملاً</option>
                    <option value="partial">تا حدی</option>
                    <option value="none">خیر</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>نتیجه معامله چه بود؟</label>
                  <select name="trade_result" value={feedbackForm.trade_result} onChange={handleFeedbackChange}>
                    <option value="win">سود</option>
                    <option value="loss">زیان</option>
                    <option value="breakeven">مساوی</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>پیشنهاد AI چقدر به شما کمک کرد؟</label>
                  <select name="feedback_helpfulness" value={feedbackForm.feedback_helpfulness} onChange={handleFeedbackChange}>
                    <option value="very_helpful">بسیار مفید</option>
                    <option value="somewhat_helpful">نسبتاً مفید</option>
                    <option value="little_helpful">کم‌فایده</option>
                    <option value="not_helpful">بی‌فایده</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>امتیاز شما به این مشاوره (۱-۵)</label>
                  <div className="star-rating">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className={`star-btn ${feedbackForm.feedback_score >= star ? 'active' : ''}`}
                        onClick={() => setFeedbackForm(prev => ({ ...prev, feedback_score: star }))}
                      >
                        ⭐
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label>نظر شما (اختیاری)</label>
                  <textarea
                    name="feedback_comment"
                    value={feedbackForm.feedback_comment}
                    onChange={handleFeedbackChange}
                    placeholder="نظر خود را در مورد این مشاوره بنویسید..."
                    rows="3"
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowFeedbackModal(false)}>انصراف</button>
              <button className="btn-submit-feedback" onClick={handleSubmitFeedback}>💾 ثبت بازخورد</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIConsultationHistory;