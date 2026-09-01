// frontend/src/components/ai/AIConsultationDetail.js

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import AIService from '../../services/aiService';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, PieChart, Pie,
} from 'recharts';
import './AIConsultationDetail.css';

// ============================================
// ✅ کامپوننت باکس تحلیل جداگانه (با فونت معمولی برای محتوا)
// ============================================
const AnalysisBox = ({ icon, title, content, type = 'text', color = '#6C63FF', bgColor = 'rgba(108, 99, 255, 0.06)' }) => {
  if (!content) return null;

  const formatBold = (text) => {
    if (!text) return text;
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const content = part.slice(2, -2);
        return <strong key={index}>{content}</strong>;
      }
      return part;
    });
  };

  const boxStyle = {
    borderRight: `4px solid ${color}`,
    background: bgColor,
  };

  return (
    <div className="analysis-box" style={boxStyle}>
      <div className="analysis-box-header">
        <span className="analysis-box-icon">{icon}</span>
        <h4 className="analysis-box-title">{title}</h4>
      </div>
      <div className="analysis-box-content">
        {type === 'list' ? (
          <ul>
            {Array.isArray(content) && content.map((item, idx) => (
              <li key={idx}>{formatBold(item)}</li>
            ))}
          </ul>
        ) : (
          <p>{formatBold(content)}</p>
        )}
      </div>
    </div>
  );
};

// ============================================
// ✅ کامپوننت رندر سناریو با سطرهای جداگانه (الگوریتم جدید)
// ============================================
const ScenarioRenderer = ({ scenarioText }) => {
  if (!scenarioText) return null;

  // تمیز کردن متن ورودی
  const cleanText = scenarioText
    .replace(/\*\*/g, '') // حذف **
    .replace(/[،,.]/g, ' ') // تبدیل ویرگول به فاصله
    .trim();

  // پیدا کردن سناریوها با الگوی دقیق‌تر
  const scenarios = [];

  // الگوی 1: جستجوی عبارات کلیدی
  const bullishMatch = cleanText.match(/(?:خوش‌بینانه|خوش بینانه)\s*[:]\s*([^]*?)(?=(?:محافظه‌کارانه|محافظه کارانه|بدبینانه|بد بینانه)|$)/i);
  const conservativeMatch = cleanText.match(/(?:محافظه‌کارانه|محافظه کارانه)\s*[:]\s*([^]*?)(?=(?:خوش‌بینانه|خوش بینانه|بدبینانه|بد بینانه)|$)/i);
  const bearishMatch = cleanText.match(/(?:بدبینانه|بد بینانه)\s*[:]\s*([^]*?)(?=(?:خوش‌بینانه|خوش بینانه|محافظه‌کارانه|محافظه کارانه)|$)/i);

  // استخراج محتوای هر سناریو
  const getContent = (match) => {
    if (!match) return null;
    let content = match[1].trim();
    // حذف عبارات تکراری از ابتدای متن
    content = content.replace(/^[-•*]\s*/, '');
    // حذف برچسب‌های تکراری
    content = content.replace(/^(خوش‌بینانه|خوش بینانه|محافظه‌کارانه|محافظه کارانه|بدبینانه|بد بینانه)\s*[:]\s*/i, '');
    // حذف خط تیره‌های اضافی
    content = content.replace(/^\s*[-•*]\s*/, '');
    return content || null;
  };

  const bullishContent = getContent(bullishMatch);
  const conservativeContent = getContent(conservativeMatch);
  const bearishContent = getContent(bearishMatch);

  // اگر با الگوی بالا چیزی پیدا نشد، از روش تقسیم با خط تیره استفاده کن
  if (!bullishContent && !conservativeContent && !bearishContent) {
    // تقسیم با خط تیره و ستون
    const parts = cleanText.split(/\s*[-•*]\s*(?=(?:خوش‌بینانه|خوش بینانه|محافظه‌کارانه|محافظه کارانه|بدبینانه|بد بینانه)\s*[:])/i);

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      let content = trimmed;
      let label = '';

      if (trimmed.match(/(?:خوش‌بینانه|خوش بینانه)/i)) {
        label = '🚀 خوش‌بینانه';
        content = trimmed.replace(/(?:خوش‌بینانه|خوش بینانه)\s*[:]\s*/i, '').trim();
      } else if (trimmed.match(/(?:محافظه‌کارانه|محافظه کارانه)/i)) {
        label = '⚖️ محافظه‌کارانه';
        content = trimmed.replace(/(?:محافظه‌کارانه|محافظه کارانه)\s*[:]\s*/i, '').trim();
      } else if (trimmed.match(/(?:بدبینانه|بد بینانه)/i)) {
        label = '⚠️ بدبینانه';
        content = trimmed.replace(/(?:بدبینانه|بد بینانه)\s*[:]\s*/i, '').trim();
      }

      if (label && content && content.length > 3) {
        scenarios.push({ label, content });
      }
    }
  } else {
    // اضافه کردن سناریوهای پیدا شده
    if (bullishContent && bullishContent.length > 3) {
      scenarios.push({ label: '🚀 خوش‌بینانه', content: bullishContent });
    }
    if (conservativeContent && conservativeContent.length > 3) {
      scenarios.push({ label: '⚖️ محافظه‌کارانه', content: conservativeContent });
    }
    if (bearishContent && bearishContent.length > 3) {
      scenarios.push({ label: '⚠️ بدبینانه', content: bearishContent });
    }
  }

  // اگر باز هم چیزی پیدا نشد، کل متن را به عنوان یک مورد نمایش بده
  if (scenarios.length === 0) {
    // بررسی کنید آیا اصلاً سناریویی در متن هست
    if (cleanText.includes('خوش') || cleanText.includes('محافظه') || cleanText.includes('بدبین') || cleanText.includes('بد بین')) {
      // هنوز سناریو هست ولی پیدا نشده، با روش ساده‌تر
      const simpleParts = cleanText.split(/\s*[-•*]\s*/);
      let currentLabel = '';
      let currentContent = '';

      for (const part of simpleParts) {
        const trimmed = part.trim();
        if (!trimmed) continue;

        if (trimmed.match(/(?:خوش‌بینانه|خوش بینانه)/i)) {
          if (currentLabel && currentContent) {
            scenarios.push({ label: currentLabel, content: currentContent });
          }
          currentLabel = '🚀 خوش‌بینانه';
          currentContent = trimmed.replace(/(?:خوش‌بینانه|خوش بینانه)\s*[:]\s*/i, '').trim();
        } else if (trimmed.match(/(?:محافظه‌کارانه|محافظه کارانه)/i)) {
          if (currentLabel && currentContent) {
            scenarios.push({ label: currentLabel, content: currentContent });
          }
          currentLabel = '⚖️ محافظه‌کارانه';
          currentContent = trimmed.replace(/(?:محافظه‌کارانه|محافظه کارانه)\s*[:]\s*/i, '').trim();
        } else if (trimmed.match(/(?:بدبینانه|بد بینانه)/i)) {
          if (currentLabel && currentContent) {
            scenarios.push({ label: currentLabel, content: currentContent });
          }
          currentLabel = '⚠️ بدبینانه';
          currentContent = trimmed.replace(/(?:بدبینانه|بد بینانه)\s*[:]\s*/i, '').trim();
        } else if (currentLabel) {
          currentContent += ' ' + trimmed;
        }
      }

      if (currentLabel && currentContent) {
        scenarios.push({ label: currentLabel, content: currentContent });
      }
    }
  }

  // اگر هیچ سناریویی پیدا نشد، کل متن را نمایش بده
  if (scenarios.length === 0) {
    return (
      <div className="analysis-box" style={{ borderRight: '4px solid #2E86C1', background: 'rgba(46, 134, 193, 0.06)' }}>
        <div className="analysis-box-header">
          <span className="analysis-box-icon">🎯</span>
          <h4 className="analysis-box-title">تحلیل سناریو</h4>
        </div>
        <div className="analysis-box-content">
          <p>{scenarioText}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analysis-box" style={{ borderRight: '4px solid #2E86C1', background: 'rgba(46, 134, 193, 0.06)' }}>
      <div className="analysis-box-header">
        <span className="analysis-box-icon">🎯</span>
        <h4 className="analysis-box-title">تحلیل سناریو</h4>
      </div>
      <div className="analysis-box-content">
        {scenarios.map((item, idx) => {
          let type = 'neutral';
          if (item.label.includes('خوش')) {
            type = 'bullish';
          } else if (item.label.includes('محافظه')) {
            type = 'conservative';
          } else if (item.label.includes('بدبین') || item.label.includes('بد بین')) {
            type = 'bearish';
          }
          return (
            <div key={idx} className={`scenario-item ${type}`}>
              <span className="scenario-label">{item.label}:</span>
              <span>{item.content}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const AIConsultationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { showToast } = useToast();

  const [consultation, setConsultation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedChart, setExpandedChart] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({
    is_followed: 'full', trade_result: 'win', feedback_score: 3,
    feedback_helpfulness: 'somewhat_helpful', feedback_comment: '',
  });
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const data = await AIService.getConsultationDetail(id);
        setConsultation(data);
        if (data.feedback_score) setFeedbackSubmitted(true);
      } catch (err) {
        console.error('Error fetching consultation detail:', err);
        setError('خطا در دریافت اطلاعات مشاوره');
        showToast('❌ خطا در دریافت اطلاعات', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id, showToast]);

  // ===== ترجمه فیلدها =====
  const translateSessionType = (type) => {
    const map = { 'High Pro': 'حرفه‌ای', 'Low Pro': 'مبتدی' };
    return map[type] || type;
  };

  const translateStrategyType = (type) => {
    const map = { 'LTP': 'بلندمدت', 'ITP': 'میان‌مدت', 'STP': 'کوتاه‌مدت' };
    return map[type] || type;
  };

  const translateMarketCondition = (condition) => {
    const map = { 'trending': 'رونددار', 'ranging': 'رنج', 'neutral': 'خنثی', 'volatile': 'پرنوسان' };
    return map[condition] || condition;
  };

  const translateEmotion = (emotion) => {
    const map = {
      'calm': 'آرام', 'excited': 'هیجان', 'fear': 'ترس', 'greed': 'طمع',
      'patient': 'صبر', 'stress': 'استرس', 'confident': 'بااعتمادبه‌نفس', 'uncertain': 'مردد'
    };
    return map[emotion] || emotion;
  };

  // ===== استخراج تحلیل‌ها از پاسخ =====
  const extractAnalysis = (psychologyText) => {
    if (!psychologyText) return { psychology: null, technical: null, scenario: null };

    let psychology = psychologyText;
    let technical = null;
    let scenario = null;

    // استخراج تحلیل تکنیکال هوشمند
    const techMatch = psychologyText.match(/تحلیل\s*تکنیکال\s*هوشمند\s*[:]\s*([\s\S]*?)(?=تحلیل\s*سناریو|$)/i);
    if (techMatch) {
      technical = techMatch[1].trim();
      psychology = psychologyText.replace(/تحلیل\s*تکنیکال\s*هوشمند\s*[:]\s*[\s\S]*?(?=تحلیل\s*سناریو|$)/i, '').trim();
    }

    // استخراج تحلیل سناریو
    const scenarioMatch = psychologyText.match(/تحلیل\s*سناریو\s*[:]\s*([\s\S]*?)$/i);
    if (scenarioMatch) {
      scenario = scenarioMatch[1].trim();
      psychology = psychology.replace(/تحلیل\s*سناریو\s*[:]\s*[\s\S]*?$/i, '').trim();
    }

    psychology = psychology.replace(/^\s*[:]\s*/, '').trim();
    if (!psychology || psychology.length < 5) {
      psychology = psychologyText;
    }

    return { psychology, technical, scenario };
  };

  // ===== بازخورد =====
  const handleOpenFeedback = () => {
    if (!consultation) return;
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
    if (!consultation) return;
    try {
      await AIService.submitFeedback(consultation.id, feedbackForm);
      showToast('✅ بازخورد با موفقیت ثبت شد', 'success');
      setShowFeedbackModal(false);
      setFeedbackSubmitted(true);
      const data = await AIService.getConsultationDetail(id);
      setConsultation(data);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      showToast('❌ خطا در ثبت بازخورد', 'error');
    }
  };

  // ===== چاپ =====
  const handlePrint = () => { window.print(); };

  // ===== نمایش =====
  if (loading) {
    return (
      <div className="detail-loading">
        <div className="spinner"></div>
        <p>در حال بارگذاری...</p>
      </div>
    );
  }

  if (error || !consultation) {
    return (
      <div className="detail-error">
        <p>{error || 'مشاوره یافت نشد'}</p>
        <button onClick={() => navigate('/ai-history')} className="btn-back">↩️ بازگشت</button>
      </div>
    );
  }

  const { ai_response, internal_analytics, ...rest } = consultation;
  const response = ai_response || {};
  const analytics = internal_analytics || {};
  const score = rest.ai_score || 0;
  const strengths = response?.strengths || [];
  const warnings = response?.warnings || [];

  // ===== استخراج تحلیل‌ها از response.psychology =====
  const extracted = extractAnalysis(response?.psychology || '');
  const psychologyContent = extracted.psychology;
  const technicalContent = extracted.technical;
  const scenarioContent = extracted.scenario;

  // ===== قیمت لحظه‌ای =====
  const livePrice = rest.live_price ? parseFloat(rest.live_price) : null;
  const entryPrice = parseFloat(rest.entry_price) || 0;

  let diffPercent = 0;
  if (livePrice !== null && entryPrice > 0) {
    diffPercent = ((entryPrice - livePrice) / livePrice) * 100;
  }

  const getPriceStatus = (diff) => {
    const absDiff = Math.abs(diff);
    if (absDiff <= 2) return { level: 'perfect', label: '✅ عالی', color: '#2e7d32' };
    if (absDiff <= 5) return { level: 'good', label: '✅ خوب', color: '#4caf50' };
    if (absDiff <= 10) return { level: 'warning', label: '⚠️ توجه', color: '#f57c00' };
    if (absDiff <= 20) return { level: 'danger', label: '⚠️ هشدار', color: '#e65100' };
    return { level: 'critical', label: '❌ خطر', color: '#c62828' };
  };
  const priceStatus = getPriceStatus(diffPercent);

  // ===== نمودارها =====
  const radarData = [
    { subject: 'مدیریت ریسک', value: Math.min(100, strengths.length * 25 + score * 0.3) },
    { subject: 'تحلیل تکنیکال', value: Math.min(100, score * 0.5 + 20) },
    { subject: 'روانشناسی', value: Math.min(100, warnings.length * -10 + 70) },
    { subject: 'مدیریت سرمایه', value: Math.min(100, response?.suggested_sl ? 75 : 50) },
    { subject: 'انضباط', value: Math.min(100, warnings.length * -8 + 80) },
  ];

  const strengthData = [
    { name: 'نقاط قوت', value: strengths.length },
    { name: 'هشدارها', value: warnings.length },
  ];

  const pieData = [
    { name: 'نقاط قوت', value: strengths.length, fill: '#2e7d32' },
    { name: 'هشدارها', value: warnings.length, fill: '#c62828' },
  ];

  const chartTypes = [
    { id: 'radar', title: '📊 تحلیل چندبعدی', component: (
      <RadarChart data={radarData}>
        <PolarGrid />
        <PolarAngleAxis dataKey="subject" tick={{ fill: isDark ? '#ccc' : '#555', fontSize: 11 }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: isDark ? '#ccc' : '#555', fontSize: 10 }} />
        <Radar name="امتیاز" dataKey="value" stroke="#1a237e" fill="#1a237e" fillOpacity={0.5} />
      </RadarChart>
    )},
    { id: 'bar', title: '📊 تعادل نقاط قوت و هشدارها', component: (
      <BarChart data={strengthData}>
        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#444' : '#ddd'} />
        <XAxis dataKey="name" tick={{ fill: isDark ? '#ccc' : '#555' }} />
        <YAxis tick={{ fill: isDark ? '#ccc' : '#555' }} />
        <Tooltip contentStyle={{ background: isDark ? '#2d2d44' : '#fff', border: 'none', borderRadius: '8px' }} />
        <Bar dataKey="value" fill="#1a237e" radius={[4,4,0,0]} />
        <Cell fill="#2e7d32" />
        <Cell fill="#c62828" />
      </BarChart>
    )},
    { id: 'pie', title: '📊 تحلیل قدرت معامله', component: (
      <PieChart>
        <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={80} fill="#8884d8" paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
          {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
        </Pie>
        <Tooltip contentStyle={{ background: isDark ? '#2d2d44' : '#fff', border: 'none', borderRadius: '8px' }} />
      </PieChart>
    )},
  ];

  const toggleChartExpand = (chartId) => {
    setExpandedChart(expandedChart === chartId ? null : chartId);
  };

  const formatBold = (text) => {
    if (!text) return text;
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const content = part.slice(2, -2);
        return <strong key={index}>{content}</strong>;
      }
      return part;
    });
  };

  return (
    <div className={`detail-container ${isDark ? 'dark' : 'light'}`} id="print-area">
      <div className="detail-header">
        <h2>🧠 جزئیات مشاوره هوشمند</h2>
        <div className="header-actions">
          <button onClick={() => navigate('/ai-history')} className="btn-back">↩️ بازگشت</button>
          <button onClick={() => navigate('/ai-consultation')} className="btn-new">🆕 مشاوره جدید</button>
          <button onClick={handlePrint} className="btn-print">🖨️ چاپ</button>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-inputs">
          <h3>📝 اطلاعات ورودی</h3>
          <div className="input-grid">
            <div className="input-item"><span className="label">نماد</span><span className="value">{rest.symbol}</span></div>
            <div className="input-item"><span className="label">جهت</span><span className="value">{rest.direction === 'Buy' ? 'خرید' : 'فروش'}</span></div>
            <div className="input-item"><span className="label">قیمت ورود</span><span className="value">{rest.entry_price}</span></div>
            {rest.stop_loss && <div className="input-item"><span className="label">حد ضرر</span><span className="value">{rest.stop_loss}</span></div>}
            {rest.take_profit && <div className="input-item"><span className="label">حد سود</span><span className="value">{rest.take_profit}</span></div>}
            {rest.session_type && <div className="input-item"><span className="label">نوع جلسه</span><span className="value">{translateSessionType(rest.session_type)}</span></div>}
            {rest.strategy_type && <div className="input-item"><span className="label">نوع استراتژی</span><span className="value">{translateStrategyType(rest.strategy_type)}</span></div>}
            {rest.timeframes && <div className="input-item"><span className="label">تایم‌فریم‌ها</span><span className="value">{rest.timeframes}</span></div>}
            {rest.risk_percent && <div className="input-item"><span className="label">درصد ریسک</span><span className="value">{rest.risk_percent}%</span></div>}
            {rest.volume && <div className="input-item"><span className="label">حجم (لات)</span><span className="value">{rest.volume}</span></div>}
            {rest.market_condition && <div className="input-item"><span className="label">وضعیت بازار</span><span className="value">{translateMarketCondition(rest.market_condition)}</span></div>}
            {rest.emotion && <div className="input-item"><span className="label">احساسات</span><span className="value">{translateEmotion(rest.emotion)}</span></div>}
            {rest.time_ny && <div className="input-item"><span className="label">ساعت نیویورک</span><span className="value">{rest.time_ny}</span></div>}
            {rest.user_question && <div className="input-item full-width"><span className="label">سوال کاربر</span><span className="value">{rest.user_question}</span></div>}
            <div className="input-item"><span className="label">مدل AI</span><span className="value">{rest.model_used || 'پیش‌فرض'}</span></div>
            <div className="input-item"><span className="label">وضعیت</span><span className="value">
              {rest.status === 'pending' && '⏳ در انتظار'}
              {rest.status === 'processing' && '🔄 در حال پردازش'}
              {rest.status === 'completed' && '✅ تکمیل شده'}
              {rest.status === 'failed' && '❌ خطا'}
            </span></div>
            <div className="input-item full-width"><span className="label">تاریخ ایجاد</span><span className="value">{new Date(rest.created_at).toLocaleString('fa-IR')}</span></div>
          </div>

          {/* ✅ نمایش قیمت لحظه‌ای فقط در صورت وجود */}
          {livePrice !== null && (
            <div className="live-price-comparison">
              <h4>📊 مقایسه قیمت لحظه‌ای</h4>
              <div className="price-row">
                <span className="label">قیمت لحظه‌ای:</span>
                <span className="value">{livePrice.toFixed(4)}</span>
              </div>
              <div className="price-row">
                <span className="label">تفاوت با ورود:</span>
                <span className={`value ${Math.abs(diffPercent) > 20 ? 'danger' : Math.abs(diffPercent) > 10 ? 'warning' : 'good'}`}>
                  {diffPercent.toFixed(2)}%
                </span>
              </div>
              <div className="price-row">
                <span className="label">وضعیت:</span>
                <span className={`status-badge ${priceStatus.level}`}>{priceStatus.label}</span>
              </div>
              <div className="price-row full-width">
                <span className="label">💡 توصیه:</span>
                <span className="value">{priceStatus.message || '-'}</span>
              </div>
              {rest.price_warning && (
                <div className="price-row full-width warning">
                  <span className="label">⚠️ هشدار:</span>
                  <span className="value">{rest.price_warning}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="detail-outputs">
          <h3>🤖 تحلیل AI</h3>

          <div className={`score-box ${rest.ai_score >= 70 ? 'high' : rest.ai_score >= 40 ? 'medium' : 'low'}`}>
            <span className="score-number">{rest.ai_score}</span>
            <span className="score-label">امتیاز اعتبار (از ۱۰۰)</span>
            <span className="score-text">
              {rest.ai_score >= 70 ? '✅ شرایط مطلوب' : rest.ai_score >= 40 ? '⚖️ شرایط متوسط' : '⚠️ شرایط نامطلوب'}
            </span>
          </div>

          {!response?.is_connection_error && (
            <div className="charts-container">
              {chartTypes.map((chart) => (
                <div key={chart.id} className={`chart-box ${expandedChart === chart.id ? 'expanded' : ''}`} onClick={() => toggleChartExpand(chart.id)}>
                  <h4>{chart.title}</h4>
                  <div className="chart-wrapper">
                    <ResponsiveContainer width="100%" height={expandedChart === chart.id ? 400 : 220}>
                      {chart.component}
                    </ResponsiveContainer>
                  </div>
                  <div className="chart-expand-hint">🔄 کلیک برای بزرگ‌نمایی</div>
                </div>
              ))}
            </div>
          )}

          {/* ===== باکس‌های قدیمی با رنگ‌آمیزی ===== */}

          {/* نقاط قوت - سبز */}
          {strengths && strengths.length > 0 && (
            <div className="result-card strengths-card">
              <h4>✅ نقاط قوت</h4>
              <ul>
                {strengths.map((item, idx) => (
                  <li key={idx}>{formatBold(item)}</li>
                ))}
              </ul>
            </div>
          )}

          {/* هشدارها - قرمز */}
          {warnings && warnings.length > 0 && (
            <div className="result-card warnings-card">
              <h4>⚠️ هشدارها</h4>
              <ul>
                {warnings.map((item, idx) => (
                  <li key={idx}>{formatBold(item)}</li>
                ))}
              </ul>
            </div>
          )}

          {/* پیشنهاد عملی - آبی */}
          {response?.suggestion && response.suggestion !== 'پیشنهادی موجود نیست.' && (
            <div className="result-card suggestion-card">
              <h4>💡 پیشنهاد عملی</h4>
              <p>{formatBold(response.suggestion)}</p>
            </div>
          )}

          {/* جزئیات پیشنهادی - بنفش */}
          {(response?.suggested_sl || response?.suggested_tp || response?.suggested_position || response?.suggested_timing) && (
            <div className="result-card details-card">
              <h4>📋 جزئیات پیشنهادی</h4>
              <div className="suggestion-details">
                {response.suggested_sl && (
                  <div className="detail-row">
                    <span className="detail-label">حد ضرر پیشنهادی:</span>
                    <span className="detail-value">{formatBold(response.suggested_sl)}</span>
                  </div>
                )}
                {response.suggested_tp && (
                  <div className="detail-row">
                    <span className="detail-label">حد سود پیشنهادی:</span>
                    <span className="detail-value">{formatBold(response.suggested_tp)}</span>
                  </div>
                )}
                {response.suggested_position && (
                  <div className="detail-row">
                    <span className="detail-label">اندازه پوزیشن:</span>
                    <span className="detail-value">{formatBold(response.suggested_position)}</span>
                  </div>
                )}
                {response.suggested_timing && (
                  <div className="detail-row">
                    <span className="detail-label">⏰ زمان‌بندی:</span>
                    <span className="detail-value">{formatBold(response.suggested_timing)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== باکس‌های جدید با آیکون و رنگ ===== */}

          {/* تحلیل روانشناختی - بنفش */}
          {psychologyContent && psychologyContent !== 'تحلیل روانشناختی موجود نیست.' && (
            <AnalysisBox
              icon="🧠"
              title="تحلیل روانشناختی"
              content={psychologyContent}
              type="text"
              color="#6C63FF"
              bgColor="rgba(108, 99, 255, 0.06)"
            />
          )}

          {/* تحلیل تکنیکال هوشمند - نارنجی */}
          {technicalContent && (
            <AnalysisBox
              icon="📊"
              title="تحلیل تکنیکال هوشمند"
              content={technicalContent}
              type="text"
              color="#FF6B35"
              bgColor="rgba(255, 107, 53, 0.06)"
            />
          )}

          {/* تحلیل سناریو - آبی با سطرهای جداگانه */}
          {scenarioContent && (
            <ScenarioRenderer scenarioText={scenarioContent} />
          )}

          {/* نکته آموزشی - طلایی */}
          {response?.tip && response.tip !== 'همیشه به مدیریت ریسک توجه کنید.' && (
            <div className="result-card tip-card">
              <h4>📖 نکته آموزشی</h4>
              <p>{formatBold(response.tip)}</p>
            </div>
          )}

          {/* تحلیل داخلی - فیروزه‌ای */}
          {analytics && Object.keys(analytics).length > 0 && (
            <div className="result-card internal-analysis">
              <h4>📊 تحلیل داخلی از تاریخچه شما</h4>
              <div className="stats-grid">
                <div className="stat-item"><span className="label">کل تریدها</span><span className="value">{analytics.total_trades || 0}</span></div>
                <div className="stat-item"><span className="label">نرخ برد کلی</span><span className={`value ${(analytics.win_rate || 0) >= 50 ? 'positive' : 'negative'}`}>{(analytics.win_rate || 0).toFixed(1)}%</span></div>
                <div className="stat-item"><span className="label">سود کل</span><span className="value">{analytics.total_profit ? `$${analytics.total_profit.toFixed(2)}` : '-'}</span></div>
                <div className="stat-item"><span className="label">میانگین R:R</span><span className="value">{analytics.avg_rr ? analytics.avg_rr.toFixed(2) : '-'}</span></div>
                {analytics.best_strategy && <div className="stat-item"><span className="label">بهترین استراتژی</span><span className="value positive">{analytics.best_strategy}</span></div>}
                {analytics.best_hour && <div className="stat-item"><span className="label">بهترین ساعت</span><span className="value positive">{analytics.best_hour}:۰۰</span></div>}
                {analytics.most_common_emotion && <div className="stat-item"><span className="label">احساس غالب</span><span className="value">{analytics.most_common_emotion}</span></div>}
              </div>
            </div>
          )}

          {/* بازخورد - ارغوانی */}
          <div className="result-card feedback-section">
            <h4>📝 بازخورد</h4>
            {feedbackSubmitted && consultation.feedback_score ? (
              <div className="feedback-status">
                <div className="feedback-info"><span className="feedback-label">امتیاز شما:</span><span className="feedback-value">{consultation.feedback_score}/۵</span></div>
                <div className="feedback-info"><span className="feedback-label">پیروی از پیشنهاد:</span><span className="feedback-value">
                  {consultation.is_followed === 'full' ? 'کاملاً' : consultation.is_followed === 'partial' ? 'تا حدی' : consultation.is_followed === 'none' ? 'خیر' : '—'}
                </span></div>
                {consultation.trade_result && <div className="feedback-info"><span className="feedback-label">نتیجه معامله:</span><span className="feedback-value">
                  {consultation.trade_result === 'win' ? '🟢 سود' : consultation.trade_result === 'loss' ? '🔴 زیان' : '🟡 مساوی'}
                </span></div>}
                {consultation.feedback_comment && <div className="feedback-info"><span className="feedback-label">نظر شما:</span><span className="feedback-value">{consultation.feedback_comment}</span></div>}
                <div className="feedback-done-badge">✅ بازخورد ثبت شده</div>
              </div>
            ) : (
              <div className="feedback-actions">
                <p className="feedback-hint">پس از بسته شدن معامله، بازخورد خود را ثبت کنید تا سیستم بتواند تحلیل‌های بهتری ارائه دهد.</p>
                <button className="btn-feedback" onClick={handleOpenFeedback}>⭐ ثبت بازخورد</button>
              </div>
            )}
          </div>

          <div className="print-actions">
            <button onClick={handlePrint} className="btn-print-full">🖨️ چاپ گزارش کامل</button>
          </div>
        </div>
      </div>

      {/* مودال بازخورد */}
      {showFeedbackModal && (
        <div className="modal-overlay" onClick={() => setShowFeedbackModal(false)}>
          <div className="modal-content feedback-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>📝 ثبت بازخورد</h3><button className="modal-close" onClick={() => setShowFeedbackModal(false)}>✕</button></div>
            <div className="modal-body">
              <div className="feedback-info">
                <p><strong>نماد:</strong> {consultation.symbol}</p>
                <p><strong>جهت:</strong> {consultation.direction === 'Buy' ? 'خرید' : 'فروش'}</p>
                <p><strong>تاریخ:</strong> {new Date(consultation.created_at).toLocaleDateString('fa-IR')}</p>
                <p><strong>امتیاز AI:</strong> {consultation.ai_score}/۱۰۰</p>
              </div>
              <div className="feedback-form">
                <div className="form-group"><label>آیا از پیشنهاد AI پیروی کردید؟</label><select name="is_followed" value={feedbackForm.is_followed} onChange={handleFeedbackChange}><option value="full">کاملاً</option><option value="partial">تا حدی</option><option value="none">خیر</option></select></div>
                <div className="form-group"><label>نتیجه معامله چه بود؟</label><select name="trade_result" value={feedbackForm.trade_result} onChange={handleFeedbackChange}><option value="win">سود</option><option value="loss">زیان</option><option value="breakeven">مساوی</option></select></div>
                <div className="form-group"><label>پیشنهاد AI چقدر به شما کمک کرد؟</label><select name="feedback_helpfulness" value={feedbackForm.feedback_helpfulness} onChange={handleFeedbackChange}><option value="very_helpful">بسیار مفید</option><option value="somewhat_helpful">نسبتاً مفید</option><option value="little_helpful">کم‌فایده</option><option value="not_helpful">بی‌فایده</option></select></div>
                <div className="form-group"><label>امتیاز شما به این مشاوره (۱-۵)</label><div className="star-rating">{[1,2,3,4,5].map(s => <button key={s} type="button" className={`star-btn ${feedbackForm.feedback_score >= s ? 'active' : ''}`} onClick={() => setFeedbackForm(prev => ({...prev, feedback_score: s}))}>⭐</button>)}</div></div>
                <div className="form-group"><label>نظر شما (اختیاری)</label><textarea name="feedback_comment" value={feedbackForm.feedback_comment} onChange={handleFeedbackChange} placeholder="نظر خود را در مورد این مشاوره بنویسید..." rows="3"/></div>
              </div>
            </div>
            <div className="modal-footer"><button className="btn-cancel" onClick={() => setShowFeedbackModal(false)}>انصراف</button><button className="btn-submit-feedback" onClick={handleSubmitFeedback}>💾 ثبت بازخورد</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIConsultationDetail;