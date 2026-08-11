// frontend/src/components/ai/AIConsultation.js

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import AIService from '../../services/aiService';
import RealApiService from '../../services/realApiService';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import './AIConsultation.css';

// ============================================
// کامپوننت Tooltip راهنما
// ============================================
const HelpTooltip = ({ text }) => {
  const [show, setShow] = useState(false);
  return (
    <span className="help-tooltip" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <span className="help-icon">ⓘ</span>
      {show && <span className="help-content">{text}</span>}
    </span>
  );
};

const AIConsultation = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [consulting, setConsulting] = useState(false);
  const [result, setResult] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [limitReached, setLimitReached] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [consultationId, setConsultationId] = useState(null);
  const [comparisonStats, setComparisonStats] = useState(null);
  const [consultationDetail, setConsultationDetail] = useState(null);
  const [selectedModel, setSelectedModel] = useState('');

  // ===== Stateهای مربوط به بازخورد =====
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({
    is_followed: 'full',
    trade_result: 'win',
    feedback_score: 3,
    feedback_helpfulness: 'somewhat_helpful',
    feedback_comment: '',
  });
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isTimeout, setIsTimeout] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);
  const progressIntervalRef = useRef(null);
  const timeIntervalRef = useRef(null);
  const startTimeRef = useRef(null);

  // ===== State برای قیمت لحظه‌ای =====
  const [livePrice, setLivePrice] = useState(null);
  const [priceWarning, setPriceWarning] = useState(null);
  const [livePriceLoading, setLivePriceLoading] = useState(false);
  const [livePriceStatus, setLivePriceStatus] = useState('idle');

  const [errorModal, setErrorModal] = useState({
    open: false,
    title: '',
    message: '',
    details: null
  });

  const [expandedChart, setExpandedChart] = useState(null);

  const [formData, setFormData] = useState({
    symbol: '',
    direction: 'Buy',
    entry_price: '',
    stop_loss: '',
    take_profit: '',
    market_condition: '',
    emotion: '',
    time_ny: '',
    user_question: '',
    model: '',
    session_type: '',
    strategy_type: '',
    timeframes: '',
    risk_percent: '',
    volume: '',
  });

  const [symbols, setSymbols] = useState([]);
  const [symbolsLoading, setSymbolsLoading] = useState(true);

  const [availableModels, setAvailableModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(true);

  const stages = [
    { id: 0, label: '📊 دریافت قیمت لحظه‌ای', threshold: 10 },
    { id: 1, label: '🔄 اتصال به سرویس AI', threshold: 30 },
    { id: 2, label: '🧠 تحلیل شرایط شما', threshold: 55 },
    { id: 3, label: '📊 ترکیب داده‌ها و تحلیل', threshold: 80 },
    { id: 4, label: '✍️ نهایی‌سازی پاسخ', threshold: 95 },
    { id: 5, label: '✅ تحلیل کامل شد!', threshold: 100 },
  ];

  // ============================================
  // راهنماهای فیلدها
  // ============================================
  const helpTexts = {
    session_type: {
      title: 'نوع جلسه',
      items: [
        'High Pro: جلسات معاملاتی حرفه‌ای که معمولاً در ساعات پرمعامله (London/NY overlap) انجام می‌شود.',
        'Low Pro: جلسات معاملاتی با حجم کمتر مانند آسیا یا ساعات کم‌نوسان.'
      ]
    },
    strategy_type: {
      title: 'نوع استراتژی',
      items: [
        'LTP (Long Term Position): معاملات بلندمدت با هدف سودهای بزرگ و توقف‌های وسیع.',
        'ITP (Intermediate Term Position): معاملات میان‌مدت با تعادل بین ریسک و ریوارد.',
        'STP (Short Term Position): معاملات کوتاه‌مدت با هدف سودهای سریع و توقف‌های محدود.'
      ]
    },
    market_condition: {
      title: 'وضعیت بازار',
      items: [
        'رونددار (Trending): بازار در یک روند صعودی یا نزولی مشخص.',
        'رنج (Ranging): بازار در یک کانال افقی و بدون روند مشخص.',
        'خنثی (Neutral): بازار بدون جهت‌گیری مشخص و در حال تثبیت.',
        'پرنوسان (Volatile): بازار با نوسانات شدید و قیمت‌های غیرمنتظره.'
      ]
    }
  };

  // ============================================
  // ترجمه احساسات انگلیسی به فارسی
  // ============================================
  const emotionMap = {
    'calm': 'آرام',
    'excited': 'هیجان',
    'fear': 'ترس',
    'greed': 'طمع',
    'patient': 'صبر',
    'stress': 'استرس',
    'confident': 'بااعتمادبه‌نفس',
    'uncertain': 'مردد',
  };

  const translateEmotion = (text) => {
    if (!text) return text;
    let result = text;
    for (const [en, fa] of Object.entries(emotionMap)) {
      result = result.replace(new RegExp(`'${en}'`, 'gi'), `'${fa}'`);
      result = result.replace(new RegExp(`"${en}"`, 'gi'), `"${fa}"`);
      result = result.replace(new RegExp(`\\b${en}\\b`, 'gi'), fa);
    }
    return result;
  };

  // ============================================
  // تابع محاسبه وضعیت تفاوت قیمت (پله‌ای)
  // ============================================
  const getPriceStatus = (diffPercent) => {
    const absDiff = Math.abs(diffPercent);
    if (absDiff <= 2) {
      return {
        level: 'perfect',
        label: '✅ عالی',
        color: '#2e7d32',
        message: 'قیمت ورود با قیمت لحظه‌ای کاملاً منطبق است.'
      };
    } else if (absDiff <= 5) {
      return {
        level: 'good',
        label: '✅ خوب',
        color: '#4caf50',
        message: 'تفاوت جزئی با قیمت لحظه‌ای. قابل قبول است.'
      };
    } else if (absDiff <= 10) {
      return {
        level: 'warning',
        label: '⚠️ توجه',
        color: '#f57c00',
        message: 'تفاوت نسبتاً قابل توجه. بررسی مجدد توصیه می‌شود.'
      };
    } else if (absDiff <= 20) {
      return {
        level: 'danger',
        label: '⚠️ هشدار',
        color: '#e65100',
        message: 'تفاوت زیاد. احتمالاً قیمت ورود صحیح نیست.'
      };
    } else {
      return {
        level: 'critical',
        label: '❌ خطر',
        color: '#c62828',
        message: 'تفاوت بسیار زیاد. حتماً قیمت را مجدداً بررسی کنید!'
      };
    }
  };

  // ============================================
  // تولید هشدار قیمت استاندارد
  // ============================================
  const generateStandardPriceWarning = (entryPrice, livePrice) => {
    if (!entryPrice || !livePrice) return null;
    const entry = parseFloat(entryPrice);
    const live = parseFloat(livePrice);
    if (isNaN(entry) || isNaN(live) || live === 0) return null;

    const diffPercent = ((entry - live) / live) * 100;
    const absDiff = Math.abs(diffPercent);

    let warningText = `قیمت وارد شده (${entry}) با قیمت لحظه‌ای (${live.toFixed(4)})`;
    if (absDiff <= 2) {
      warningText += ` کاملاً منطبق است (تفاوت ${diffPercent.toFixed(2)}%).`;
    } else if (absDiff <= 5) {
      warningText += ` تفاوت جزئی دارد (${diffPercent.toFixed(2)}%). قابل قبول است.`;
    } else if (absDiff <= 10) {
      warningText += ` تفاوت قابل توجهی دارد (${diffPercent.toFixed(2)}%). بررسی مجدد توصیه می‌شود.`;
    } else if (absDiff <= 20) {
      warningText += ` تفاوت زیادی دارد (${diffPercent.toFixed(2)}%). احتمالاً قیمت ورود صحیح نیست.`;
    } else {
      warningText += ` تفاوت بسیار زیادی دارد (${diffPercent.toFixed(2)}%). حتماً قیمت را مجدداً بررسی کنید!`;
    }
    return warningText;
  };

  // ============================================
  // تابع پردازش JSON پاسخ AI
  // ============================================
  const processAIResponse = (aiResponse, livePriceData, entryPrice) => {
    console.log('📥 processAIResponse - Input JSON:', JSON.stringify(aiResponse, null, 2));

    if (!aiResponse || typeof aiResponse !== 'object') {
      console.warn('⚠️ aiResponse نامعتبر است، استفاده از داده‌های پیش‌فرض');
      return {
        score: 0,
        strengths: [],
        warnings: [],
        suggestion: 'پیشنهادی موجود نیست.',
        tip: 'همیشه به مدیریت ریسک توجه کنید.',
        psychology: 'تحلیل روانشناختی موجود نیست.',
        suggested_sl: null,
        suggested_tp: null,
        suggested_timing: null,
        suggested_position: null,
        live_price: livePriceData || null,
        price_warning: null,
      };
    }

    const boldText = (text) => {
      if (!text || typeof text !== 'string') return text;
      return text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    };

    const processText = (text) => {
      if (!text || typeof text !== 'string') return null;
      return boldText(text);
    };

    const processArray = (items) => {
      if (!items || !Array.isArray(items)) return [];
      const result = [];
      for (const item of items) {
        if (typeof item === 'string') {
          const processed = processText(item);
          if (processed) {
            result.push(processed);
          }
        }
      }
      return result;
    };

    const score = aiResponse.score || 0;

    let strengths = [];
    if (aiResponse.strengths && Array.isArray(aiResponse.strengths)) {
      strengths = processArray(aiResponse.strengths);
    }

    let warnings = [];
    if (aiResponse.warnings && Array.isArray(aiResponse.warnings)) {
      warnings = processArray(aiResponse.warnings);
    }

    let suggestion = aiResponse.suggestion || 'پیشنهادی موجود نیست.';
    suggestion = processText(suggestion) || suggestion;

    let psychology = aiResponse.psychology || 'تحلیل روانشناختی موجود نیست.';
    psychology = translateEmotion(psychology);
    psychology = processText(psychology) || psychology;

    let tip = aiResponse.tip || 'همیشه به مدیریت ریسک توجه کنید.';
    tip = processText(tip) || tip;

    const suggested_sl = aiResponse.suggested_sl || null;
    const suggested_tp = aiResponse.suggested_tp || null;
    const suggested_timing = aiResponse.suggested_timing || null;
    const suggested_position = aiResponse.suggested_position || null;

    const live_price = livePriceData || null;
    let price_warning = null;
    if (live_price && entryPrice) {
      price_warning = generateStandardPriceWarning(entryPrice, live_price);
    }

    const result = {
      score,
      strengths,
      warnings,
      suggestion,
      tip,
      psychology,
      suggested_sl,
      suggested_tp,
      suggested_timing,
      suggested_position,
      live_price,
      price_warning,
    };

    console.log('📤 processAIResponse - Output:', JSON.stringify(result, null, 2));
    return result;
  };

  // ============================================
  // تابع پردازش متن استریم
  // ============================================
  const processStreamText = (text, livePriceData, entryPrice) => {
    console.log('📥 processStreamText - Input text length:', text?.length || 0);
    console.log('📥 processStreamText - First 200 chars:', text?.substring(0, 200));

    if (!text || text.trim().length < 10) {
      console.warn('⚠️ متن استریم خالی است، استفاده از داده‌های پیش‌فرض');
      return processAIResponse(
        {
          score: 50,
          strengths: ['نقاط قوتی یافت نشد'],
          warnings: ['هشدار خاصی وجود ندارد'],
          suggestion: 'پیشنهادی موجود نیست.',
          tip: 'همیشه به مدیریت ریسک توجه کنید.',
          psychology: 'تحلیل روانشناختی موجود نیست.'
        },
        livePriceData,
        entryPrice
      );
    }

    const result = {
      score: 0,
      strengths: [],
      warnings: [],
      suggestion: 'پیشنهادی موجود نیست.',
      tip: 'همیشه به مدیریت ریسک توجه کنید.',
      psychology: 'تحلیل روانشناختی موجود نیست.',
      suggested_sl: null,
      suggested_tp: null,
      suggested_timing: null,
      suggested_position: null,
      live_price: livePriceData || null,
      price_warning: null,
    };

    // ===== 1. استخراج امتیاز =====
    let scoreMatch = text.match(/\*\*امتیاز\s*اعتبار\s*[:]\*\*\s*(\d+)/i);
    if (!scoreMatch) {
      scoreMatch = text.match(/امتیاز\s*اعتبار\s*[:]\s*(\d+)/i);
    }
    if (!scoreMatch) {
      scoreMatch = text.match(/امتیاز\s*[:]\s*(\d+)/i);
    }
    if (scoreMatch) {
      result.score = Math.min(100, Math.max(0, parseInt(scoreMatch[1])));
      console.log('✅ استخراج امتیاز (عددی):', result.score);
    } else {
      const lowerText = text.toLowerCase();
      if (lowerText.includes('عالی') || lowerText.includes('بسیار خوب')) {
        result.score = 75;
      } else if (lowerText.includes('خوب') || lowerText.includes('مناسب')) {
        result.score = 65;
      } else if (lowerText.includes('متوسط')) {
        result.score = 50;
      } else if (lowerText.includes('ضعیف') || lowerText.includes('نامناسب')) {
        result.score = 25;
      } else if (lowerText.includes('خطر') || lowerText.includes('هشدار')) {
        result.score = 35;
      } else {
        result.score = 45;
      }
      console.log('✅ استخراج امتیاز (تخمینی از کلمات کلیدی):', result.score);
    }

    // ===== 2. استخراج نقاط قوت =====
    let strengthsMatch = text.match(/\*\*نقاط\s*قوت\s*[:]\*\*\s*([\s\S]*?)(?=\*\*هشدارها\s*[:]\*\*|$)/i);
    if (!strengthsMatch) {
      strengthsMatch = text.match(/نقاط\s*قوت\s*[:]\s*([\s\S]*?)(?=\s*هشدارها\s*[:]|$)/i);
    }
    if (strengthsMatch) {
      const strengthsText = strengthsMatch[1].trim();
      console.log('🔍 متن نقاط قوت:', strengthsText.substring(0, 100) + '...');
      const items = strengthsText.match(/(?:[-•])\s*([^\n]*?)(?=(?:[-•])|$)/g);
      if (items) {
        for (const item of items) {
          const cleanItem = item.replace(/^[-•]\s*/, '').trim();
          if (cleanItem && cleanItem.length > 5) {
            result.strengths.push(cleanItem);
          }
        }
      } else {
        const singleItem = strengthsText.replace(/^[-•]\s*/, '').trim();
        if (singleItem && singleItem.length > 5) {
          result.strengths.push(singleItem);
        }
      }
      console.log('✅ استخراج نقاط قوت:', result.strengths.length, 'مورد');
    }

    // ===== 3. استخراج هشدارها =====
    let warningsMatch = text.match(/\*\*هشدارها\s*[:]\*\*\s*([\s\S]*?)(?=\*\*پیشنهاد\s*[:]\*\*|\*\*نکته\s*[:]\*\*|$)/i);
    if (!warningsMatch) {
      warningsMatch = text.match(/هشدارها\s*[:]\s*([\s\S]*?)(?=\s*پیشنهاد\s*[:]|\s*نکته\s*[:]|$)/i);
    }
    if (warningsMatch) {
      const warningsText = warningsMatch[1].trim();
      console.log('🔍 متن هشدارها:', warningsText.substring(0, 100) + '...');
      const items = warningsText.match(/(?:[-•])\s*([^\n]*?)(?=(?:[-•])|$)/g);
      if (items) {
        for (const item of items) {
          const cleanItem = item.replace(/^[-•]\s*/, '').trim();
          if (cleanItem && cleanItem.length > 5) {
            result.warnings.push(cleanItem);
          }
        }
      } else {
        const singleItem = warningsText.replace(/^[-•]\s*/, '').trim();
        if (singleItem && singleItem.length > 5) {
          result.warnings.push(singleItem);
        }
      }
      console.log('✅ استخراج هشدارها:', result.warnings.length, 'مورد');
    }

    // ===== 4. استخراج پیشنهاد =====
    let suggestionMatch = text.match(/\*\*پیشنهاد\s*[:]\*\*\s*([\s\S]*?)(?=\*\*نکته\s*[:]\*\*|$)/i);
    if (!suggestionMatch) {
      suggestionMatch = text.match(/پیشنهاد\s*[:]\s*([\s\S]*?)(?=\s*نکته\s*[:]|$)/i);
    }
    if (suggestionMatch) {
      const suggestionText = suggestionMatch[1].trim();
      if (suggestionText && suggestionText.length > 5) {
        result.suggestion = suggestionText;
        console.log('✅ استخراج پیشنهاد:', result.suggestion.substring(0, 100) + '...');
      }
    }

    // ===== 5. استخراج نکته =====
    let tipMatch = text.match(/\*\*نکته\s*[:]\*\*\s*([\s\S]*?)$/i);
    if (!tipMatch) {
      tipMatch = text.match(/نکته\s*[:]\s*([\s\S]*?)$/i);
    }
    if (tipMatch) {
      const tipText = tipMatch[1].trim();
      if (tipText && tipText.length > 5) {
        result.tip = tipText;
        console.log('✅ استخراج نکته:', result.tip.substring(0, 100) + '...');
      }
    }

    // ===== 6. استخراج تحلیل روانشناختی =====
    let psychologyMatch = text.match(/\*\*تحلیل\s*روانشناختی\s*[:]\*\*\s*([\s\S]*?)(?=\*\*نکته\s*[:]\*\*|$)/i);
    if (!psychologyMatch) {
      psychologyMatch = text.match(/تحلیل\s*روانشناختی\s*[:]\s*([\s\S]*?)(?=\s*نکته\s*[:]|$)/i);
    }
    if (psychologyMatch) {
      const psychologyText = psychologyMatch[1].trim();
      if (psychologyText && psychologyText.length > 5) {
        result.psychology = translateEmotion(psychologyText);
        console.log('✅ استخراج تحلیل روانشناختی:', result.psychology.substring(0, 100) + '...');
      }
    } else {
      const lowerText = text.toLowerCase();
      if (lowerText.includes('احساس') || lowerText.includes('روان') || lowerText.includes('استرس') || lowerText.includes('آرامش')) {
        const emotionSentences = text.match(/[^.!?]*(احساس|روان|استرس|آرامش|ترس|طمع|هیجان)[^.!?]*[.!?]/gi);
        if (emotionSentences) {
          result.psychology = translateEmotion(emotionSentences.join(' '));
          console.log('✅ استخراج تحلیل روانشناختی (از کلمات کلیدی):', result.psychology.substring(0, 100) + '...');
        }
      }
    }

    // ===== 7. تولید هشدار قیمت استاندارد =====
    if (livePriceData && entryPrice) {
      result.price_warning = generateStandardPriceWarning(entryPrice, livePriceData);
    }

    if (result.strengths.length === 0 && result.warnings.length === 0 && result.suggestion === 'پیشنهادی موجود نیست.') {
      console.warn('⚠️ هیچ داده‌ای از متن استریم استخراج نشد، استفاده از داده‌های پیش‌فرض');
      return processAIResponse(
        {
          score: result.score || 50,
          strengths: ['نقاط قوتی یافت نشد'],
          warnings: ['هشدار خاصی وجود ندارد'],
          suggestion: result.suggestion || 'پیشنهادی موجود نیست.',
          tip: result.tip || 'همیشه به مدیریت ریسک توجه کنید.',
          psychology: result.psychology || 'تحلیل روانشناختی موجود نیست.'
        },
        livePriceData,
        entryPrice
      );
    }

    console.log('📤 processStreamText - Output:', JSON.stringify(result, null, 2));
    return result;
  };

  // ============================================
  // تابع تبدیل **...** به <strong>...</strong>
  // ============================================
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

  // ============================================
  // تابع رندر کادر
  // ============================================
  const renderCard = (title, content, type = 'text') => {
    if (!content) return null;
    if (type === 'list') {
      if (!Array.isArray(content) || content.length === 0) return null;
      return (
        <div className="result-card">
          <h4>{title}</h4>
          <ul>
            {content.map((item, idx) => (
              <li key={idx}>{formatBold(item)}</li>
            ))}
          </ul>
        </div>
      );
    }
    return (
      <div className="result-card">
        <h4>{title}</h4>
        <p>{formatBold(content)}</p>
      </div>
    );
  };

  // ============================================
  // رندر راهنمای فیلدها
  // ============================================
  const renderHelpTooltip = (helpKey) => {
    const help = helpTexts[helpKey];
    if (!help) return null;
    return (
      <HelpTooltip text={help.items.map((item, idx) => <div key={idx}>{item}</div>)} />
    );
  };

  // ============================================
  // بارگذاری نمادها
  // ============================================
  useEffect(() => {
    const loadSymbols = async () => {
      setSymbolsLoading(true);
      try {
        const response = await RealApiService.getAllSymbols();
        let symbolList = [];
        if (Array.isArray(response.data)) {
          symbolList = response.data.filter(Boolean);
        } else if (response.data && response.data.results) {
          symbolList = response.data.results.filter(Boolean);
        }
        if (symbolList.length > 0) {
          setSymbols(symbolList);
        } else {
          setSymbols(['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'BTCUSD', 'ETHUSD', 'XAUUSD', 'USOIL']);
        }
      } catch (error) {
        console.error('❌ Error loading symbols:', error);
        setSymbols(['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'BTCUSD', 'ETHUSD', 'XAUUSD', 'USOIL']);
      } finally {
        setSymbolsLoading(false);
      }
    };
    loadSymbols();
  }, []);

  // ============================================
  // بارگذاری لیست مدل‌های AI (با تنظیم پیش‌فرض)
  // ============================================
  useEffect(() => {
    const loadModels = async () => {
      setModelsLoading(true);
      try {
        const response = await RealApiService.getAvailableModels();
        if (Array.isArray(response.data) && response.data.length > 0) {
          setAvailableModels(response.data);
          // ✅ تنظیم اولین مدل به‌عنوان پیش‌فرض
          if (!formData.model) {
            setFormData(prev => ({ ...prev, model: response.data[0] }));
          }
        } else {
          setAvailableModels(['llama3.1:8b']);
          if (!formData.model) {
            setFormData(prev => ({ ...prev, model: 'llama3.1:8b' }));
          }
        }
      } catch (error) {
        console.error('❌ Error loading models:', error);
        setAvailableModels(['llama3.1:8b']);
        if (!formData.model) {
          setFormData(prev => ({ ...prev, model: 'llama3.1:8b' }));
        }
      } finally {
        setModelsLoading(false);
      }
    };
    loadModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================
  // بررسی وضعیت اشتراک
  // ============================================
  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const response = await RealApiService.getSubscriptionStatus();
        const data = response.data;
        setSubscriptionStatus(data);
        const remaining = data.remaining_ai_consultations ?? 0;
        if (remaining <= 0) {
          setLimitReached(true);
          showToast(
            `⚠️ محدودیت مشاوره AI شما به پایان رسیده است. (${data.ai_consultations_limit || 0} مشاوره)`,
            'warning'
          );
        } else {
          setLimitReached(false);
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
      }
    };
    checkSubscription();
  }, []);

  // ============================================
  // تغییرات فرم (با لاگ برای model)
  // ============================================
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'model') {
      console.log('🔍 Model selected in handleChange:', value);
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ============================================
  // شروع و توقف تایمرهای پیشرفت
  // ============================================
  const startProgressTimers = () => {
    setIsTimeout(false);
    setProgress(0);
    setElapsedTime(0);
    setCurrentStage(0);
    startTimeRef.current = Date.now();

    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      setProgress(prev => {
        const newProgress = Math.min(prev + 0.5, 95);
        for (let i = stages.length - 1; i >= 0; i--) {
          if (newProgress >= stages[i].threshold) {
            setCurrentStage(i);
            break;
          }
        }
        return newProgress;
      });
    }, 100);

    if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
    timeIntervalRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
  };

  const stopProgressTimers = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (timeIntervalRef.current) {
      clearInterval(timeIntervalRef.current);
      timeIntervalRef.current = null;
    }
    setProgress(100);
    setCurrentStage(5);
  };

  // ============================================
  // تابع دریافت قیمت لحظه‌ای
  // ============================================
  const fetchLivePrice = async (symbol) => {
    if (!symbol) return null;
    setLivePriceLoading(true);
    setLivePriceStatus('loading');
    try {
      const response = await RealApiService.getLivePrice(symbol);
      if (response && response.price) {
        setLivePriceStatus('success');
        return response.price;
      } else {
        setLivePriceStatus('error');
        return null;
      }
    } catch (error) {
      console.error('❌ Error fetching live price:', error);
      if (error.message?.includes('Network Error') || error.message?.includes('Failed to fetch')) {
        setLivePriceStatus('network_error');
      } else if (error.response?.status === 404) {
        setLivePriceStatus('not_found');
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        setLivePriceStatus('error');
      } else if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
        setLivePriceStatus('error');
      } else {
        setLivePriceStatus('error');
      }
      return null;
    } finally {
      setLivePriceLoading(false);
    }
  };

  // ============================================
  // دریافت مشاوره با استریم
  // ============================================
  const handleConsult = async (e) => {
    e.preventDefault();

    console.log('🔍 formData.model before request:', formData.model);

    if (!formData.symbol) {
      setErrorModal({ open: true, title: 'خطا در فرم', message: 'لطفاً نماد معاملاتی را انتخاب کنید.' });
      return;
    }
    if (!formData.direction) {
      setErrorModal({ open: true, title: 'خطا در فرم', message: 'لطفاً جهت معامله را انتخاب کنید.' });
      return;
    }
    if (!formData.entry_price || parseFloat(formData.entry_price) <= 0) {
      setErrorModal({ open: true, title: 'خطا در فرم', message: 'لطفاً قیمت ورود را به‌صورت عدد معتبر وارد کنید.' });
      return;
    }

    if (limitReached) {
      setErrorModal({
        open: true,
        title: 'محدودیت مشاوره',
        message: 'محدودیت مشاوره AI شما به پایان رسیده است. لطفاً اشتراک خود را تمدید کنید.'
      });
      return;
    }

    setConsulting(true);
    setResult(null);
    setStreamingText('');
    setConsultationId(null);
    setComparisonStats(null);
    setLivePrice(null);
    setPriceWarning(null);
    setLivePriceStatus('idle');
    setIsTimeout(false);
    setCurrentStage(0);
    startProgressTimers();

    // مرحله ۰: دریافت قیمت لحظه‌ای
    setCurrentStage(0);
    let fetchedLivePrice = null;
    let fetchedPriceWarning = null;
    try {
      const livePriceData = await fetchLivePrice(formData.symbol);
      if (livePriceData) {
        fetchedLivePrice = livePriceData;
        setLivePrice(livePriceData);
        const standardWarning = generateStandardPriceWarning(formData.entry_price, livePriceData);
        if (standardWarning) {
          fetchedPriceWarning = standardWarning;
          setPriceWarning(standardWarning);
        }
      } else {
        if (livePriceStatus === 'network_error') {
          setPriceWarning('⚠️ خطا در اتصال به اینترنت. لطفاً اتصال خود را بررسی کنید.');
        } else if (livePriceStatus === 'not_found') {
          setPriceWarning('⚠️ نماد مورد نظر در سرویس قیمت‌یابی موجود نیست. لطفاً قیمت را خودتان وارد کنید.');
        } else {
          setPriceWarning('⚠️ قیمت لحظه‌ای در دسترس نیست. لطفاً قیمت را خودتان بررسی کنید.');
        }
        fetchedPriceWarning = priceWarning;
      }
    } catch (error) {
      console.error('Error fetching live price:', error);
      setLivePriceStatus('error');
      const warning = '⚠️ خطا در دریافت قیمت لحظه‌ای. لطفاً خودتان بررسی کنید.';
      fetchedPriceWarning = warning;
      setPriceWarning(warning);
    }

    // ایجاد المان برای نمایش استریم
    const streamingDiv = document.createElement('div');
    streamingDiv.id = 'streaming-response';
    streamingDiv.style.cssText = `
      padding: 14px 18px;
      background: ${isDark ? '#2d2d44' : '#f5f5f5'};
      border-radius: 8px;
      white-space: pre-wrap;
      font-size: 14px;
      line-height: 1.8;
      min-height: 80px;
      max-height: 400px;
      overflow-y: auto;
      border: 1px solid ${isDark ? '#444' : '#ddd'};
      margin-bottom: 16px;
      color: ${isDark ? '#e0e0e0' : '#333'};
      font-family: inherit;
    `;

    const resultContainer = document.getElementById('ai-result');
    if (resultContainer) {
      const oldEl = document.getElementById('streaming-response');
      if (oldEl) oldEl.remove();
      resultContainer.prepend(streamingDiv);
    }

    let fullText = '';

    try {
      const requestData = {
        symbol: formData.symbol,
        direction: formData.direction,
        entry_price: parseFloat(formData.entry_price),
        stop_loss: formData.stop_loss ? parseFloat(formData.stop_loss) : null,
        take_profit: formData.take_profit ? parseFloat(formData.take_profit) : null,
        market_condition: formData.market_condition || null,
        emotion: formData.emotion || null,
        time_ny: formData.time_ny || null,
        user_question: formData.user_question || null,
        model: formData.model || null,  // ← مقدار model از فرم گرفته می‌شود
        session_type: formData.session_type || null,
        strategy_type: formData.strategy_type || null,
        timeframes: formData.timeframes || null,
        risk_percent: formData.risk_percent ? parseFloat(formData.risk_percent) : null,
        volume: formData.volume ? parseFloat(formData.volume) : null,
      };

      console.log('📤 requestData.model:', requestData.model);

      // دریافت مشاوره با استریم
      const result = await AIService.getConsultationStream(
        requestData,
        (chunk) => {
          fullText += chunk;
          const el = document.getElementById('streaming-response');
          if (el) {
            el.innerText = fullText;
            el.scrollTop = el.scrollHeight;
          }
          setProgress(95);
          setCurrentStage(4);
        }
      );

      stopProgressTimers();

      console.log('📥 === FULL_TEXT (Stream) ===');
      console.log(fullText);
      console.log('📥 === END FULL_TEXT ===');

      const consultationId = result?.consultationId;
      setConsultationId(consultationId);
      console.log('📥 === CONSULTATION_ID ===', consultationId);

      let parsedResult = null;
      if (fullText && fullText.trim().length > 50) {
        parsedResult = processStreamText(fullText, fetchedLivePrice, formData.entry_price);
        console.log('✅ Using stream text (fullText) as primary source:', parsedResult);
      }

      if (consultationId) {
        try {
          console.log('📥 Fetching detail for consultation ID:', consultationId);
          const detailData = await AIService.getConsultationDetail(consultationId);
          setConsultationDetail(detailData);

          if (detailData) {
            console.log('📥 === DETAIL_DATA FROM DATABASE ===');
            console.log(JSON.stringify(detailData, null, 2));
            console.log('📥 === END DETAIL_DATA ===');

            if (detailData.ai_response) {
              console.log('📥 === AI_RESPONSE FROM DATABASE ===');
              console.log(JSON.stringify(detailData.ai_response, null, 2));
              console.log('📥 === END AI_RESPONSE ===');

              const aiParsed = processAIResponse(
                detailData.ai_response,
                fetchedLivePrice,
                formData.entry_price
              );
              if (aiParsed.strengths.length > 0 || aiParsed.warnings.length > 0) {
                if (aiParsed.psychology && aiParsed.psychology !== 'تحلیل روانشناختی موجود نیست.') {
                  parsedResult.psychology = aiParsed.psychology;
                }
                if (aiParsed.suggestion && aiParsed.suggestion !== 'پیشنهادی موجود نیست.') {
                  parsedResult.suggestion = aiParsed.suggestion;
                }
                if (aiParsed.score > 0) {
                  parsedResult.score = aiParsed.score;
                }
                if (aiParsed.strengths.length > parsedResult.strengths.length) {
                  parsedResult.strengths = aiParsed.strengths;
                }
                if (aiParsed.warnings.length > parsedResult.warnings.length) {
                  parsedResult.warnings = aiParsed.warnings;
                }
                console.log('✅ Enhanced with ai_response from database:', parsedResult);
              }
            }

            if (detailData.comparison_stats) {
              setComparisonStats(detailData.comparison_stats);
              console.log('📥 === COMPARISON_STATS FROM DATABASE ===');
              console.log(JSON.stringify(detailData.comparison_stats, null, 2));
              console.log('📥 === END COMPARISON_STATS ===');
            } else if (detailData.internal_analytics) {
              setComparisonStats(detailData.internal_analytics);
              console.log('📥 === USING INTERNAL_ANALYTICS AS FALLBACK ===');
              console.log(JSON.stringify(detailData.internal_analytics, null, 2));
              console.log('📥 === END INTERNAL_ANALYTICS ===');
            }

            if (detailData.feedback_score) {
              setFeedbackSubmitted(true);
            } else {
              setFeedbackSubmitted(false);
            }
          } else {
            console.warn('⚠️ detailData is undefined or null');
          }
        } catch (detailError) {
          console.error('❌ Error fetching consultation detail:', detailError);
          setComparisonStats(null);
        }
      } else {
        console.warn('⚠️ No consultationId received from stream');
      }

      if (!parsedResult) {
        parsedResult = processAIResponse(
          {
            score: 50,
            strengths: ['نقاط قوتی یافت نشد'],
            warnings: ['هشدار خاصی وجود ندارد'],
            suggestion: 'پیشنهادی موجود نیست.',
            tip: 'همیشه به مدیریت ریسک توجه کنید.',
            psychology: 'تحلیل روانشناختی موجود نیست.'
          },
          fetchedLivePrice,
          formData.entry_price
        );
        console.log('⚠️ Using default data');
      }

      if (fetchedLivePrice) {
        parsedResult.live_price = fetchedLivePrice;
      }
      if (fetchedPriceWarning && !parsedResult.price_warning) {
        parsedResult.price_warning = fetchedPriceWarning;
      }

      console.log('📥 === FINAL PARSED RESULT ===');
      console.log(JSON.stringify(parsedResult, null, 2));
      console.log('📥 === END FINAL PARSED RESULT ===');

      setResult({ score: parsedResult.score, response: parsedResult });

      if (parsedResult.score > 0) {
        showToast('✅ تحلیل با موفقیت انجام شد', 'success');
      } else {
        showToast('⚠️ تحلیل کامل نشد. لطفاً دوباره تلاش کنید.', 'warning');
      }

      const subResponse = await RealApiService.getSubscriptionStatus();
      const data = subResponse.data;
      setSubscriptionStatus(data);
      if (data.remaining_ai_consultations <= 0) {
        setLimitReached(true);
      }

    } catch (error) {
      console.error('Error getting consultation:', error);
      stopProgressTimers();

      let errorMessage = '❌ خطا در دریافت مشاوره';
      let errorTitle = '❌ خطا در دریافت مشاوره';
      let errorDetails = null;

      if (error.name === 'TimeoutError' || error.message?.includes('timeout') || error.message?.includes('timed out')) {
        setIsTimeout(true);
        errorTitle = '⏰ زمان پاسخگویی به پایان رسید';
        errorMessage = '⏰ زمان پاسخگویی سرویس هوش مصنوعی به پایان رسید.\nاین ممکن است به دلیل سنگین بودن مدل یا کندی سیستم باشد.\nلطفاً چند لحظه صبر کنید و دوباره تلاش کنید.\n💡 نکته: می‌توانید مدل سبک‌تری مانند \'mistral:7b\' را انتخاب کنید.';
      } else if (error.message?.includes('Ollama') || error.message?.includes('اتصال') || error.message?.includes('404')) {
        errorTitle = '🔌 خطای اتصال به AI';
        errorMessage = `🔌 خطای اتصال به سرویس هوش مصنوعی\n${error.message}\nلطفاً موارد زیر را بررسی کنید:\n1. آیا Ollama در حال اجراست؟ (دستور: ollama serve)\n2. آیا مدل مناسب نصب شده است؟ (دستور: ollama pull llama3.1:8b)\n3. آیا آدرس Ollama صحیح است؟ (پیش‌فرض: http://localhost:11434)`;
      } else if (error.response?.data) {
        const data = error.response.data;
        if (data.message) errorMessage = data.message;
        else if (data.error) errorMessage = data.error;
        else if (data.detail) errorMessage = data.detail;
        else if (typeof data === 'object') {
          const fieldErrors = Object.entries(data)
            .filter(([key, value]) => key !== 'error' && key !== 'message')
            .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
            .join(' | ');
          if (fieldErrors) {
            errorMessage = `خطا در فیلدها: ${fieldErrors}`;
            errorDetails = data;
          }
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      setErrorModal({
        open: true,
        title: errorTitle,
        message: errorMessage,
        details: errorDetails
      });
    } finally {
      setConsulting(false);
    }
  };

  // ============================================
  // بازنشانی فرم
  // ============================================
  const handleReset = () => {
    setFormData({
      symbol: '',
      direction: 'Buy',
      entry_price: '',
      stop_loss: '',
      take_profit: '',
      market_condition: '',
      emotion: '',
      time_ny: '',
      user_question: '',
      model: '',
      session_type: '',
      strategy_type: '',
      timeframes: '',
      risk_percent: '',
      volume: '',
    });
    setSelectedModel('');
    setResult(null);
    setStreamingText('');
    setLivePrice(null);
    setPriceWarning(null);
    setLivePriceStatus('idle');
    setConsultationDetail(null);
    setExpandedChart(null);
    setFeedbackSubmitted(false);
    stopProgressTimers();
    setProgress(0);
    setElapsedTime(0);
    setCurrentStage(0);
    const el = document.getElementById('streaming-response');
    if (el) el.remove();
  };

  // ============================================
  // بزرگ‌نمایی نمودار
  // ============================================
  const toggleChartExpand = (chartId) => {
    setExpandedChart(expandedChart === chartId ? null : chartId);
  };

  // ============================================
  // چاپ گزارش کامل
  // ============================================
  const handlePrintReport = () => {
    if (!result) return;
    const { score, response } = result;
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      showToast('لطفاً pop-up را فعال کنید', 'warning');
      return;
    }

    const now = new Date().toLocaleString('fa-IR');
    const livePriceDisplay = response?.live_price || livePrice;
    const entry = parseFloat(formData.entry_price);
    let diffPercent = 0;
    if (livePriceDisplay && entry) {
      diffPercent = ((entry - livePriceDisplay) / livePriceDisplay) * 100;
    }
    if (!isFinite(diffPercent) || isNaN(diffPercent)) diffPercent = 0;
    const priceStatus = getPriceStatus(Math.abs(diffPercent));

    const boldForPrint = (text) => {
      if (!text) return text;
      return text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    };

    const strengthsHtml = response?.strengths?.length > 0
      ? response.strengths.map(s => `<li>${boldForPrint(s)}</li>`).join('')
      : '<li>نقاط قوتی یافت نشد</li>';

    const warningsHtml = response?.warnings?.length > 0
      ? response.warnings.map(w => `<li>${boldForPrint(w)}</li>`).join('')
      : '<li>هشدار خاصی وجود ندارد</li>';

    const suggestionHtml = response?.suggestion && response.suggestion !== 'پیشنهادی موجود نیست.'
      ? `<p>${boldForPrint(response.suggestion)}</p>`
      : '';

    const psychologyHtml = response?.psychology && response.psychology !== 'تحلیل روانشناختی موجود نیست.'
      ? `<p>${boldForPrint(response.psychology)}</p>`
      : '';

    const tipHtml = response?.tip && response.tip !== 'همیشه به مدیریت ریسک توجه کنید.'
      ? `<p style="background:#fff8e1;padding:12px;border-radius:6px;border-right:4px solid #f57c00;">${boldForPrint(response.tip)}</p>`
      : '';

    const suggestedTimingHtml = response?.suggested_timing
      ? `<div class="detail-row"><span class="label-text">⏰ زمان‌بندی پیشنهادی</span><span class="value-text" style="color:#2e7d32;">${boldForPrint(response.suggested_timing)}</span></div>`
      : '';

    const suggestedSlHtml = response?.suggested_sl
      ? `<div class="detail-row"><span class="label-text">حد ضرر پیشنهادی</span><span class="value-text" style="color:#2e7d32;">${boldForPrint(response.suggested_sl)}</span></div>`
      : '';

    const suggestedTpHtml = response?.suggested_tp
      ? `<div class="detail-row"><span class="label-text">حد سود پیشنهادی</span><span class="value-text" style="color:#2e7d32;">${boldForPrint(response.suggested_tp)}</span></div>`
      : '';

    const suggestedPositionHtml = response?.suggested_position
      ? `<div class="detail-row"><span class="label-text">اندازه پوزیشن پیشنهادی</span><span class="value-text" style="color:#2e7d32;">${boldForPrint(response.suggested_position)}</span></div>`
      : '';

    const internalAnalysisHtml = comparisonStats ? `
      <div class="section">
        <div class="section-title">📊 تحلیل داخلی از تاریخچه شما</div>
        <div class="section-body">
          <div class="grid-2">
            <div class="detail-row"><span class="label-text">کل تریدها</span><span class="value-text">${comparisonStats.total_trades || 0}</span></div>
            <div class="detail-row"><span class="label-text">نرخ برد کلی</span><span class="value-text ${(comparisonStats.win_rate || 0) >= 50 ? 'positive' : 'negative'}">${(comparisonStats.win_rate || 0).toFixed(1)}%</span></div>
            <div class="detail-row"><span class="label-text">سود کل</span><span class="value-text">${comparisonStats.total_profit ? `$${comparisonStats.total_profit.toFixed(2)}` : '-'}</span></div>
            <div class="detail-row"><span class="label-text">میانگین R:R</span><span class="value-text">${comparisonStats.avg_rr ? comparisonStats.avg_rr.toFixed(2) : '-'}</span></div>
            ${comparisonStats.best_strategy ? `<div class="detail-row"><span class="label-text">بهترین استراتژی</span><span class="value-text" style="color:#2e7d32;">${comparisonStats.best_strategy}</span></div>` : ''}
            ${comparisonStats.best_hour ? `<div class="detail-row"><span class="label-text">بهترین ساعت</span><span class="value-text" style="color:#2e7d32;">${comparisonStats.best_hour}:۰۰</span></div>` : ''}
            ${comparisonStats.most_common_emotion ? `<div class="detail-row"><span class="label-text">احساس غالب</span><span class="value-text">${comparisonStats.most_common_emotion}</span></div>` : ''}
          </div>
        </div>
      </div>
    ` : '';

    const htmlContent = `<!DOCTYPE html>
      <html dir="rtl" lang="fa">
      <head>
        <meta charset="UTF-8">
        <title>گزارش مشاوره هوشمند - ${formData.symbol}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Vazir', Tahoma, sans-serif; padding: 24px; background: #fff; color: #333; direction: rtl; }
          .header { text-align: center; padding-bottom: 16px; border-bottom: 3px solid #1a237e; margin-bottom: 20px; }
          .header h1 { font-size: 24px; color: #1a237e; }
          .header p { color: #666; font-size: 14px; margin-top: 4px; }
          .summary { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 20px; }
          .summary-card { background: #f5f7fa; padding: 14px; border-radius: 8px; text-align: center; border: 1px solid #e0e0e0; }
          .summary-card .label { font-size: 12px; color: #888; }
          .summary-card .value { font-size: 24px; font-weight: 700; }
          .section { margin-bottom: 16px; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }
          .section-title { background: #e8eaf6; padding: 10px 16px; font-weight: 700; color: #1a237e; font-size: 15px; }
          .section-body { padding: 12px 16px; }
          .score-section { background: ${score >= 70 ? '#e8f5e9' : score >= 40 ? '#fff3e0' : '#ffebee'}; padding: 16px; border-radius: 8px; text-align: center; margin-bottom: 16px; border: 2px solid ${score >= 70 ? '#2e7d32' : score >= 40 ? '#f57c00' : '#c62828'}; }
          .score-section .score { font-size: 48px; font-weight: 700; }
          .score-section .status { font-size: 16px; font-weight: 600; margin-top: 4px; }
          .detail-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f5f5f5; font-size: 13px; }
          .detail-row:last-child { border-bottom: none; }
          .label-text { color: #555; font-weight: 500; }
          .value-text { font-weight: 600; }
          .positive { color: #2e7d32; }
          .negative { color: #c62828; }
          ul { padding-right: 20px; margin: 4px 0; }
          ul li { margin-bottom: 4px; font-size: 13px; line-height: 1.6; }
          .footer { text-align: center; padding-top: 16px; border-top: 1px solid #e0e0e0; margin-top: 20px; color: #999; font-size: 11px; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 20px; }
          .full-width { grid-column: 1 / -1; }
          .live-price-display { background: #e3f2fd; padding: 10px 16px; border-radius: 8px; margin-bottom: 16px; display: flex; gap: 20px; flex-wrap: wrap; }
          .live-price-item { display: flex; gap: 6px; font-size: 14px; }
          .live-price-item .label { color: #555; }
          .live-price-item .value { font-weight: 700; color: #0d47a1; }
          .live-price-item .diff.warning { color: #f57c00; }
          .live-price-item .diff.positive { color: #2e7d32; }
          .status-badge { padding: 2px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; display: inline-block; }
          .status-badge.perfect { background: #e8f5e9; color: #2e7d32; }
          .status-badge.good { background: #e8f5e9; color: #4caf50; }
          .status-badge.warning { background: #fff3e0; color: #f57c00; }
          .status-badge.danger { background: #ffe0b2; color: #e65100; }
          .status-badge.critical { background: #ffebee; color: #c62828; }
          .status-message { font-size: 13px; color: #555; }
          strong { color: #1a237e; }
          .live-price-error { background: #ffebee; border-color: #ef9a9a; }
          .live-price-error .value { color: #c62828; }
          .live-price-error .status-message { color: #c62828; }
          @media print { body { padding: 12px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🧠 گزارش مشاوره هوشمند معاملاتی</h1>
          <p>تاریخ: ${now} | نماد: ${formData.symbol} | جهت: ${formData.direction === 'Buy' ? 'خرید' : 'فروش'}</p>
        </div>

        ${livePriceDisplay ? `
        <div class="live-price-display">
          <div class="live-price-item">
            <span class="label">📊 قیمت لحظه‌ای:</span>
            <span class="value">${livePriceDisplay.toFixed(4)}</span>
          </div>
          ${formData.entry_price ? `
          <div class="live-price-item">
            <span class="label">📉 تفاوت با ورود:</span>
            <span class="diff ${Math.abs(diffPercent) > 20 ? 'warning' : Math.abs(diffPercent) > 10 ? 'warning' : 'positive'}">
              ${diffPercent.toFixed(2)}%
            </span>
          </div>
          <div class="live-price-item">
            <span class="label">📊 وضعیت:</span>
            <span class="status-badge ${priceStatus.level}">${priceStatus.label}</span>
          </div>
          <div class="live-price-item full-width">
            <span class="label">💡 توصیه:</span>
            <span class="status-message">${priceStatus.message}</span>
          </div>
          ` : ''}
          ${response?.price_warning || priceWarning ? `
          <div class="live-price-item">
            <span class="label">⚠️ هشدار:</span>
            <span class="diff warning">${response?.price_warning || priceWarning}</span>
          </div>
          ` : ''}
        </div>
        ` : `
        <div class="live-price-display live-price-error">
          <div class="live-price-item">
            <span class="label">⚠️ وضعیت قیمت لحظه‌ای:</span>
            <span class="value">در دسترس نیست</span>
          </div>
          <div class="live-price-item full-width">
            <span class="label">💡 توصیه:</span>
            <span class="status-message">${priceWarning || 'لطفاً قیمت را خودتان بررسی کنید.'}</span>
          </div>
        </div>
        `}

        <div class="summary">
          <div class="summary-card">
            <div class="label">امتیاز اعتبار</div>
            <div class="value" style="color: ${score >= 70 ? '#2e7d32' : score >= 40 ? '#f57c00' : '#c62828'}">${score}</div>
            <div style="font-size:12px;color:#888;">وضعیت: ${score >= 70 ? 'مطلوب' : score >= 40 ? 'متوسط' : 'نامطلوب'}</div>
          </div>
          <div class="summary-card">
            <div class="label">نقاط قوت</div>
            <div class="value" style="color:#2e7d32;">${response?.strengths?.length || 0}</div>
            <div style="font-size:12px;color:#888;">مورد</div>
          </div>
          <div class="summary-card">
            <div class="label">هشدارها</div>
            <div class="value" style="color:#c62828;">${response?.warnings?.length || 0}</div>
            <div style="font-size:12px;color:#888;">مورد</div>
          </div>
        </div>

        <div class="score-section">
          <div class="score">${score}</div>
          <div class="status">امتیاز اعتبار (از ۱۰۰) — ${score >= 70 ? '✅ شرایط مطلوب' : score >= 40 ? '⚖️ شرایط متوسط' : '⚠️ شرایط نامطلوب'}</div>
        </div>

        <div class="section">
          <div class="section-title">📊 اطلاعات ورودی</div>
          <div class="section-body">
            <div class="grid-2">
              <div class="detail-row"><span class="label-text">نماد</span><span class="value-text">${formData.symbol}</span></div>
              <div class="detail-row"><span class="label-text">جهت</span><span class="value-text">${formData.direction === 'Buy' ? 'خرید' : 'فروش'}</span></div>
              <div class="detail-row"><span class="label-text">قیمت ورود</span><span class="value-text">${formData.entry_price}</span></div>
              ${formData.stop_loss ? `<div class="detail-row"><span class="label-text">حد ضرر</span><span class="value-text">${formData.stop_loss}</span></div>` : ''}
              ${formData.take_profit ? `<div class="detail-row"><span class="label-text">حد سود</span><span class="value-text">${formData.take_profit}</span></div>` : ''}
              ${formData.session_type ? `<div class="detail-row"><span class="label-text">نوع جلسه <span class="help-indicator">ⓘ</span></span><span class="value-text">${formData.session_type}</span></div>` : ''}
              ${formData.strategy_type ? `<div class="detail-row"><span class="label-text">نوع استراتژی <span class="help-indicator">ⓘ</span></span><span class="value-text">${formData.strategy_type}</span></div>` : ''}
              ${formData.timeframes ? `<div class="detail-row"><span class="label-text">تایم‌فریم‌ها</span><span class="value-text">${formData.timeframes}</span></div>` : ''}
              ${formData.risk_percent ? `<div class="detail-row"><span class="label-text">درصد ریسک</span><span class="value-text">${formData.risk_percent}%</span></div>` : ''}
              ${formData.volume ? `<div class="detail-row"><span class="label-text">حجم (لات)</span><span class="value-text">${formData.volume}</span></div>` : ''}
              ${formData.market_condition ? `<div class="detail-row"><span class="label-text">وضعیت بازار <span class="help-indicator">ⓘ</span></span><span class="value-text">${formData.market_condition}</span></div>` : ''}
              ${formData.emotion ? `<div class="detail-row"><span class="label-text">احساسات</span><span class="value-text">${formData.emotion}</span></div>` : ''}
              ${formData.time_ny ? `<div class="detail-row"><span class="label-text">ساعت نیویورک</span><span class="value-text">${formData.time_ny}</span></div>` : ''}
              ${formData.user_question ? `<div class="detail-row full-width"><span class="label-text">سوال کاربر</span><span class="value-text">${formData.user_question}</span></div>` : ''}
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">✅ نقاط قوت</div>
          <div class="section-body"><ul>${strengthsHtml}</ul></div>
        </div>

        <div class="section">
          <div class="section-title">⚠️ هشدارها</div>
          <div class="section-body"><ul>${warningsHtml}</ul></div>
        </div>

        ${suggestionHtml ? `
        <div class="section">
          <div class="section-title">💡 پیشنهاد عملی</div>
          <div class="section-body">${suggestionHtml}</div>
        </div>
        ` : ''}

        ${suggestedSlHtml || suggestedTpHtml || suggestedPositionHtml || suggestedTimingHtml ? `
        <div class="section">
          <div class="section-title">📋 جزئیات پیشنهادی</div>
          <div class="section-body">
            ${suggestedSlHtml}
            ${suggestedTpHtml}
            ${suggestedPositionHtml}
            ${suggestedTimingHtml}
          </div>
        </div>
        ` : ''}

        ${psychologyHtml ? `
        <div class="section">
          <div class="section-title">🧠 تحلیل روانشناختی</div>
          <div class="section-body">${psychologyHtml}</div>
        </div>
        ` : ''}

        ${tipHtml ? `
        <div class="section">
          <div class="section-title">📖 نکته آموزشی</div>
          <div class="section-body">${tipHtml}</div>
        </div>
        ` : ''}

        ${internalAnalysisHtml}

        <div class="footer">
          این گزارش توسط ژورنال حرفه‌ای ترید تولید شده است.<br>
          تاریخ چاپ: ${now}
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 800);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // ============================================
  // بستن مودال خطا
  // ============================================
  const closeErrorModal = () => {
    setErrorModal({ open: false, title: '', message: '', details: null });
  };

  // ============================================
  // توابع مربوط به بازخورد
  // ============================================
  const handleOpenFeedback = () => {
    if (!consultationId) {
      showToast('❌ شناسه مشاوره یافت نشد', 'error');
      return;
    }
    setFeedbackForm({
      is_followed: 'full',
      trade_result: 'win',
      feedback_score: 3,
      feedback_helpfulness: 'somewhat_helpful',
      feedback_comment: '',
    });
    setShowFeedbackModal(true);
  };

  const handleCloseFeedback = () => {
    setShowFeedbackModal(false);
  };

  const handleFeedbackChange = (e) => {
    const { name, value } = e.target;
    setFeedbackForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitFeedback = async () => {
    if (!consultationId) {
      showToast('❌ شناسه مشاوره یافت نشد', 'error');
      return;
    }

    try {
      await AIService.submitFeedback(consultationId, feedbackForm);
      showToast('✅ بازخورد با موفقیت ثبت شد', 'success');
      setShowFeedbackModal(false);
      setFeedbackSubmitted(true);

      if (consultationId) {
        try {
          const detailData = await AIService.getConsultationDetail(consultationId);
          setConsultationDetail(detailData);
        } catch (error) {
          console.error('Error refreshing consultation detail:', error);
        }
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      showToast('❌ خطا در ثبت بازخورد', 'error');
    }
  };

  // ============================================
  // رندر راهنما
  // ============================================
  const renderGuide = () => (
    <div className={`guide-section ${showGuide ? 'open' : ''}`}>
      <div className="guide-header" onClick={() => setShowGuide(!showGuide)}>
        <span className="guide-icon">❓</span>
        <span className="guide-title">راهنمای فرایند مشاوره هوشمند</span>
        <span className="guide-toggle">{showGuide ? '▲' : '▼'}</span>
      </div>
      {showGuide && (
        <div className="guide-content">
          <div className="guide-step">
            <span className="step-number">۱</span>
            <div><h4>وارد کردن شرایط فعلی</h4><p>نماد، جهت، قیمت، حد ضرر، حد سود و سایر اطلاعات را وارد کنید.</p></div>
          </div>
          <div className="guide-step">
            <span className="step-number">۲</span>
            <div><h4>بررسی تاریخچه شما</h4><p>سیستم به‌طور خودکار عملکرد شما را در شرایط مشابه تحلیل می‌کند.</p></div>
          </div>
          <div className="guide-step">
            <span className="step-number">۳</span>
            <div><h4>دریافت تحلیل هوشمند</h4><p>AI با ترکیب داده‌های شما و شرایط فعلی، تحلیل جامعی ارائه می‌دهد.</p></div>
          </div>
          <div className="guide-step">
            <span className="step-number">۴</span>
            <div><h4>ثبت بازخورد (اختیاری)</h4><p>پس از بسته شدن معامله، نتیجه را ثبت کنید تا سیستم دقیق‌تر شود.</p></div>
          </div>
        </div>
      )}
    </div>
  );

  // ============================================
  // رندر نتیجه نهایی (با بخش بازخورد)
  // ============================================
  const renderResult = () => {
    if (!result) return null;

    const { score, response } = result;
    const scoreColor = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
    const isConnectionError = response?.is_connection_error || false;

    const livePriceDisplay = response?.live_price || livePrice;
    const entry = parseFloat(formData.entry_price);
    let diffPercent = 0;
    if (livePriceDisplay && entry) {
      diffPercent = ((entry - livePriceDisplay) / livePriceDisplay) * 100;
    }
    if (!isFinite(diffPercent) || isNaN(diffPercent)) diffPercent = 0;
    const priceStatus = getPriceStatus(Math.abs(diffPercent));

    const radarData = [
      { subject: 'مدیریت ریسک', value: Math.min(100, (response?.strengths?.length || 0) * 25 + (score * 0.3)) },
      { subject: 'تحلیل تکنیکال', value: Math.min(100, score * 0.5 + 20) },
      { subject: 'روانشناسی', value: Math.min(100, (response?.warnings?.length || 0) * -10 + 70) },
      { subject: 'مدیریت سرمایه', value: Math.min(100, (response?.suggested_sl ? 75 : 50)) },
      { subject: 'انضباط', value: Math.min(100, (response?.warnings?.length || 0) * -8 + 80) },
    ];

    const strengthData = [
      { name: 'نقاط قوت', value: response?.strengths?.length || 0 },
      { name: 'هشدارها', value: response?.warnings?.length || 0 },
    ];

    const pieData = [
      { name: 'نقاط قوت', value: response?.strengths?.length || 0, fill: '#2e7d32' },
      { name: 'هشدارها', value: response?.warnings?.length || 0, fill: '#c62828' },
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
          <Bar dataKey="value" fill="#1a237e" radius={[4, 4, 0, 0]} />
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

    const renderStages = () => {
      return (
        <div className="stages-container compact">
          {stages.map((stage, idx) => {
            let statusIcon = '';
            let statusClass = '';
            if (idx === 0 && (livePriceStatus === 'network_error' || livePriceStatus === 'not_found')) {
              statusIcon = '❌';
              statusClass = 'error';
            } else if (idx === 0 && livePriceStatus === 'success') {
              statusIcon = '✅';
              statusClass = 'success';
            } else if (idx === 0 && livePriceStatus === 'loading') {
              statusIcon = '⏳';
              statusClass = 'loading';
            }
            return (
              <div key={idx} className={`stage-item ${currentStage >= idx ? 'active' : ''} ${statusClass}`}>
                <span className="stage-dot"></span>
                <span className="stage-label">{statusIcon} {stage.label}</span>
              </div>
            );
          })}
        </div>
      );
    };

    return (
      <div id="ai-result" className="result-section">
        <h3>🤖 تحلیل هوشمند</h3>

        {livePriceDisplay ? (
          <div className="live-price-display">
            <div className="price-item">
              <span className="label">📊 قیمت لحظه‌ای:</span>
              <span className="value">{livePriceDisplay.toFixed(4)}</span>
            </div>
            {formData.entry_price && (
              <>
                <div className="price-item">
                  <span className="label">📉 تفاوت با ورود:</span>
                  <span className={`diff ${Math.abs(diffPercent) > 20 ? 'warning' : Math.abs(diffPercent) > 10 ? 'warning' : 'positive'}`}>
                    {diffPercent.toFixed(2)}%
                  </span>
                </div>
                <div className="price-item">
                  <span className="label">📊 وضعیت:</span>
                  <span className={`status-badge ${priceStatus.level}`}>{priceStatus.label}</span>
                </div>
                <div className="price-item full-width">
                  <span className="label">💡 توصیه:</span>
                  <span className="status-message">{priceStatus.message}</span>
                </div>
              </>
            )}
            {(response?.price_warning || priceWarning) && (
              <div className="price-item">
                <span className="label">⚠️ هشدار:</span>
                <span className="diff warning">{response?.price_warning || priceWarning}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="live-price-display error">
            <div className="price-item">
              <span className="label">⚠️ وضعیت قیمت لحظه‌ای:</span>
              <span className="value" style={{ color: '#c62828' }}>در دسترس نیست</span>
            </div>
            <div className="price-item full-width">
              <span className="label">💡 توصیه:</span>
              <span className="status-message" style={{ color: '#c62828' }}>
                {livePriceStatus === 'network_error' && '❌ خطا در اتصال به اینترنت. لطفاً اتصال خود را بررسی کنید.'}
                {livePriceStatus === 'not_found' && '❌ نماد مورد نظر در سرویس قیمت‌یابی موجود نیست.'}
                {livePriceStatus === 'error' && '❌ خطا در دریافت قیمت لحظه‌ای. لطفاً خودتان بررسی کنید.'}
                {!['network_error', 'not_found', 'error'].includes(livePriceStatus) && 'لطفاً قیمت را خودتان بررسی کنید.'}
              </span>
            </div>
          </div>
        )}

        <div className="stages-wrapper">
          <h4>📋 مراحل انجام</h4>
          {renderStages()}
        </div>

        <div className={`result-score ${scoreColor}`}>
          <span className="score-number">{score}</span>
          <span className="score-label">امتیاز اعتبار (از ۱۰۰)</span>
          <span className="score-text">
            {score >= 70 ? '✅ شرایط مطلوب' : score >= 40 ? '⚖️ شرایط متوسط' : '⚠️ شرایط نامطلوب'}
          </span>
        </div>

        {!isConnectionError && (
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

        {renderCard('✅ نقاط قوت', response?.strengths, 'list')}
        {renderCard('⚠️ هشدارها', response?.warnings, 'list')}

        {response?.suggestion && response.suggestion !== 'پیشنهادی موجود نیست.' && (
          renderCard('💡 پیشنهاد عملی', response.suggestion, 'text')
        )}

        {(response?.suggested_sl || response?.suggested_tp || response?.suggested_position || response?.suggested_timing) && (
          <div className="result-card">
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

        {response?.psychology && response.psychology !== 'تحلیل روانشناختی موجود نیست.' && (
          renderCard('🧠 تحلیل روانشناختی', response.psychology, 'text')
        )}

        {response?.tip && response.tip !== 'همیشه به مدیریت ریسک توجه کنید.' && (
          renderCard('📖 نکته آموزشی', response.tip, 'text')
        )}

        {comparisonStats && (
          <div className="result-card internal-analysis">
            <h4>📊 تحلیل داخلی از تاریخچه شما</h4>
            <div className="analysis-grid">
              <div className="analysis-item">
                <span className="label">کل تریدها</span>
                <span className="value">{comparisonStats.total_trades || 0}</span>
              </div>
              <div className="analysis-item">
                <span className="label">نرخ برد کلی</span>
                <span className={`value ${(comparisonStats.win_rate || 0) >= 50 ? 'positive' : 'negative'}`}>
                  {(comparisonStats.win_rate || 0).toFixed(1)}%
                </span>
              </div>
              <div className="analysis-item">
                <span className="label">سود کل</span>
                <span className="value">{comparisonStats.total_profit ? `$${comparisonStats.total_profit.toFixed(2)}` : '-'}</span>
              </div>
              <div className="analysis-item">
                <span className="label">میانگین R:R</span>
                <span className="value">{comparisonStats.avg_rr ? comparisonStats.avg_rr.toFixed(2) : '-'}</span>
              </div>
              {comparisonStats.best_strategy && (
                <div className="analysis-item">
                  <span className="label">بهترین استراتژی</span>
                  <span className="value positive">{comparisonStats.best_strategy}</span>
                </div>
              )}
              {comparisonStats.best_hour && (
                <div className="analysis-item">
                  <span className="label">بهترین ساعت</span>
                  <span className="value positive">{comparisonStats.best_hour}:۰۰</span>
                </div>
              )}
              {comparisonStats.most_common_emotion && (
                <div className="analysis-item">
                  <span className="label">احساس غالب</span>
                  <span className="value">{comparisonStats.most_common_emotion}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== ✅ بخش بازخورد ===== */}
        <div className="feedback-section">
          <h4>📝 بازخورد</h4>
          {consultationDetail?.feedback_score ? (
            <div className="feedback-status">
              <div className="feedback-info">
                <span className="feedback-label">امتیاز شما:</span>
                <span className="feedback-value">{consultationDetail.feedback_score}/۵</span>
              </div>
              <div className="feedback-info">
                <span className="feedback-label">پیروی از پیشنهاد:</span>
                <span className="feedback-value">
                  {consultationDetail.is_followed === 'full' ? 'کاملاً' :
                   consultationDetail.is_followed === 'partial' ? 'تا حدی' :
                   consultationDetail.is_followed === 'none' ? 'خیر' : '—'}
                </span>
              </div>
              {consultationDetail.trade_result && (
                <div className="feedback-info">
                  <span className="feedback-label">نتیجه معامله:</span>
                  <span className="feedback-value">
                    {consultationDetail.trade_result === 'win' ? '🟢 سود' :
                     consultationDetail.trade_result === 'loss' ? '🔴 زیان' :
                     consultationDetail.trade_result === 'breakeven' ? '🟡 مساوی' : '—'}
                  </span>
                </div>
              )}
              {consultationDetail.feedback_comment && (
                <div className="feedback-info">
                  <span className="feedback-label">نظر شما:</span>
                  <span className="feedback-value">{consultationDetail.feedback_comment}</span>
                </div>
              )}
              <div className="feedback-done-badge">
                ✅ بازخورد ثبت شده
              </div>
            </div>
          ) : (
            <div className="feedback-actions">
              <p className="feedback-hint">
                پس از بسته شدن معامله، بازخورد خود را ثبت کنید تا سیستم بتواند تحلیل‌های بهتری ارائه دهد.
              </p>
              <button
                className="btn-feedback"
                onClick={handleOpenFeedback}
                disabled={!consultationId}
              >
                ⭐ ثبت بازخورد
              </button>
            </div>
          )}
        </div>

        <div className="result-actions">
          <button className="btn-secondary" onClick={handleReset}>↩️ بازگشت به فرم</button>
          <button className="btn-secondary" onClick={handlePrintReport}>🖨️ چاپ گزارش کامل</button>
          <button className="btn-primary" onClick={() => navigate('/ai-history')}>📋 تاریخچه مشاوره‌ها</button>
        </div>
      </div>
    );
  };

  // ============================================
  // رندر اصلی
  // ============================================
  return (
    <div className={`ai-consultation ${isDark ? 'dark' : 'light'}`}>
      <div className="ai-header">
        <h2>🧠 مشاور هوشمند معاملاتی</h2>
        <div className="header-buttons">
          <button className="btn-history" onClick={() => navigate('/ai-history')}>📋 تاریخچه مشاوره‌ها</button>
          <button className="btn-back" onClick={() => navigate('/dashboard')}>↩️ بازگشت به داشبورد</button>
        </div>
      </div>

      {renderGuide()}

      {limitReached && (
        <div className="limit-warning ai-limit">
          <div className="warning-icon">🧠</div>
          <div className="warning-content">
            <h4>محدودیت مشاوره AI به پایان رسیده!</h4>
            <p>شما {subscriptionStatus?.ai_consultations_limit || 0} مشاوره در پلن خود دارید که همه را استفاده کرده‌اید.</p>
            <button className="btn-upgrade" onClick={() => navigate('/profile')}>🚀 تمدید اشتراک</button>
          </div>
        </div>
      )}

      <div className="ai-content">
        <div className="form-section">
          <h3>📝 شرایط فعلی خود را وارد کنید</h3>
          <form onSubmit={handleConsult}>
            <div className="form-row">
              <div className="form-group">
                <label>نماد معاملاتی <span style={{ color: 'red' }}>(اجباری)</span></label>
                <input type="text" name="symbol" list="symbol-list" value={formData.symbol} onChange={handleChange} placeholder={symbolsLoading ? "در حال بارگذاری نمادها..." : "جستجو و انتخاب نماد..."} required disabled={limitReached || symbolsLoading} className="symbol-input" autoComplete="off" />
                <datalist id="symbol-list">{symbols.map((s) => <option key={s} value={s} />)}</datalist>
                {symbolsLoading && <span className="field-hint">⏳ در حال بارگذاری لیست نمادها...</span>}
                {!symbolsLoading && symbols.length > 0 && <span className="field-hint">🔍 {symbols.length} نماد موجود است. با تایپ کردن جستجو کنید.</span>}
              </div>
              <div className="form-group">
                <label>جهت معامله <span style={{ color: 'red' }}>(اجباری)</span></label>
                <select name="direction" value={formData.direction} onChange={handleChange} required disabled={limitReached}>
                  <option value="Buy">خرید (Buy)</option>
                  <option value="Sell">فروش (Sell)</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>قیمت ورود <span style={{ color: 'red' }}>(اجباری)</span></label>
                <input type="number" name="entry_price" value={formData.entry_price} onChange={handleChange} step="0.00001" placeholder="0.00000" required disabled={limitReached} />
              </div>
              <div className="form-group">
                <label>حد ضرر (اختیاری)</label>
                <input type="number" name="stop_loss" value={formData.stop_loss} onChange={handleChange} step="0.00001" placeholder="0.00000" disabled={limitReached} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>حد سود (اختیاری)</label>
                <input type="number" name="take_profit" value={formData.take_profit} onChange={handleChange} step="0.00001" placeholder="0.00000" disabled={limitReached} />
              </div>
              <div className="form-group">
                <label>ساعت (به وقت نیویورک)</label>
                <input type="time" name="time_ny" value={formData.time_ny} onChange={handleChange} disabled={limitReached} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>نوع جلسه <HelpTooltip text={helpTexts.session_type.items.map((item, i) => <div key={i}>{item}</div>)} /></label>
                <select name="session_type" value={formData.session_type} onChange={handleChange} disabled={limitReached}>
                  <option value="">انتخاب کنید</option>
                  <option value="High Pro">حرفه‌ای (High Pro)</option>
                  <option value="Low Pro">مبتدی (Low Pro)</option>
                </select>
              </div>
              <div className="form-group">
                <label>نوع استراتژی <HelpTooltip text={helpTexts.strategy_type.items.map((item, i) => <div key={i}>{item}</div>)} /></label>
                <select name="strategy_type" value={formData.strategy_type} onChange={handleChange} disabled={limitReached}>
                  <option value="">انتخاب کنید</option>
                  <option value="LTP">LTP</option>
                  <option value="ITP">ITP</option>
                  <option value="STP">STP</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>تایم‌فریم‌های استفاده‌شده</label>
                <input type="text" name="timeframes" value={formData.timeframes} onChange={handleChange} placeholder="مثلاً: D1, H4, H1" disabled={limitReached} />
              </div>
              <div className="form-group">
                <label>درصد ریسک از سرمایه</label>
                <input type="number" name="risk_percent" value={formData.risk_percent} onChange={handleChange} step="0.01" placeholder="مثلاً 1.5" disabled={limitReached} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>حجم معامله (لات)</label>
                <input type="number" name="volume" value={formData.volume} onChange={handleChange} step="0.01" placeholder="مثلاً 0.5" disabled={limitReached} />
              </div>
              <div className="form-group">
                <label>وضعیت بازار <HelpTooltip text={helpTexts.market_condition.items.map((item, i) => <div key={i}>{item}</div>)} /></label>
                <select name="market_condition" value={formData.market_condition} onChange={handleChange} disabled={limitReached}>
                  <option value="">انتخاب کنید</option>
                  <option value="trending">رونددار</option>
                  <option value="ranging">رنج</option>
                  <option value="neutral">خنثی</option>
                  <option value="volatile">پرنوسان</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>احساسات فعلی</label>
                <select name="emotion" value={formData.emotion} onChange={handleChange} disabled={limitReached}>
                  <option value="">انتخاب کنید</option>
                  <option value="calm">آرام</option>
                  <option value="excited">هیجان</option>
                  <option value="fear">ترس</option>
                  <option value="greed">طمع</option>
                  <option value="patient">صبر</option>
                  <option value="stress">استرس</option>
                  <option value="confident">بااعتمادبه‌نفس</option>
                  <option value="uncertain">مردد</option>
                </select>
              </div>
              <div className="form-group">
                <label>مدل هوش مصنوعی</label>
                <select name="model" value={formData.model} onChange={handleChange} disabled={limitReached || modelsLoading}>
                  <option value="">پیش‌فرض ({availableModels[0] || 'llama3.1:8b'})</option>
                  {availableModels.map((model) => <option key={model} value={model}>{model}</option>)}
                </select>
                {modelsLoading && <span className="field-hint">⏳ در حال بارگذاری لیست مدل‌ها...</span>}
                {!modelsLoading && availableModels.length > 1 && <span className="field-hint">🧠 {availableModels.length} مدل موجود است.</span>}
              </div>
            </div>

            <div className="form-group full-width">
              <label>سوال شما (اختیاری)</label>
              <textarea name="user_question" value={formData.user_question} onChange={handleChange} placeholder="مثلاً: آیا با توجه به شرایط، وارد این معامله شوم؟" rows="2" disabled={limitReached} />
            </div>

            {consulting && (
              <div className="progress-container">
                <div className="progress-header">
                  <span className="progress-label">⏳ در حال دریافت تحلیل...</span>
                  <span className="progress-time"><span className="timer-icon">⏱️</span> {elapsedTime}s</span>
                </div>
                <div className="progress-bar-wrapper">
                  <div className={`progress-bar ${isTimeout ? 'timeout' : ''}`} style={{ width: `${Math.min(progress, 100)}%` }} />
                </div>
                <div className="stages-container compact">
                  {stages.map((stage, idx) => {
                    let statusIcon = '';
                    let statusClass = '';
                    if (idx === 0 && (livePriceStatus === 'network_error' || livePriceStatus === 'not_found')) {
                      statusIcon = '❌';
                      statusClass = 'error';
                    } else if (idx === 0 && livePriceStatus === 'success') {
                      statusIcon = '✅';
                      statusClass = 'success';
                    } else if (idx === 0 && livePriceStatus === 'loading') {
                      statusIcon = '⏳';
                      statusClass = 'loading';
                    }
                    return (
                      <div key={idx} className={`stage-item ${currentStage >= idx ? 'active' : ''} ${statusClass}`}>
                        <span className="stage-dot"></span>
                        <span className="stage-label">{statusIcon} {stage.label}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="progress-hint">
                  {progress < 10 && '📊 دریافت قیمت لحظه‌ای...'}
                  {progress >= 10 && progress < 30 && '🔄 اتصال به سرویس AI...'}
                  {progress >= 30 && progress < 55 && '🧠 در حال تحلیل شرایط شما...'}
                  {progress >= 55 && progress < 80 && '📊 ترکیب داده‌ها و تولید تحلیل...'}
                  {progress >= 80 && progress < 100 && '✍️ نهایی‌سازی پاسخ...'}
                  {progress >= 100 && '✅ تحلیل کامل شد!'}
                </div>
              </div>
            )}

            <div className="form-actions">
              <button type="submit" className="btn-consult" disabled={consulting || limitReached || (subscriptionStatus?.remaining_ai_consultations !== undefined && subscriptionStatus.remaining_ai_consultations <= 0)}>
                {consulting ? <><span className="spinner">⏳</span> در حال تحلیل...</> : (limitReached || (subscriptionStatus?.remaining_ai_consultations !== undefined && subscriptionStatus.remaining_ai_consultations <= 0)) ? '⛔ محدودیت مشاوره به پایان رسیده' : '🔍 دریافت تحلیل'}
              </button>
              <button type="button" className="btn-reset" onClick={handleReset} disabled={consulting}>🗑️ پاک کردن فرم</button>
            </div>

            {subscriptionStatus && !limitReached && (
              <div className="remaining-info">
                <span>🧠 مشاوره‌های باقیمانده: {subscriptionStatus.remaining_ai_consultations >= 999999 ? '∞' : subscriptionStatus.remaining_ai_consultations || 0}</span>
              </div>
            )}
          </form>
        </div>

        {renderResult()}
      </div>

      {/* ===== مودال بازخورد ===== */}
      {showFeedbackModal && (
        <div className="modal-overlay" onClick={handleCloseFeedback}>
          <div className="modal-content feedback-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📝 ثبت بازخورد</h3>
              <button className="modal-close" onClick={handleCloseFeedback}>✕</button>
            </div>

            <div className="modal-body">
              <div className="feedback-info">
                <p><strong>نماد:</strong> {formData.symbol}</p>
                <p><strong>جهت:</strong> {formData.direction === 'Buy' ? 'خرید' : 'فروش'}</p>
                <p><strong>تاریخ:</strong> {new Date().toLocaleDateString('fa-IR')}</p>
                <p><strong>امتیاز AI:</strong> {result?.score || 0}/۱۰۰</p>
              </div>

              <div className="feedback-form">
                <div className="form-group">
                  <label>آیا از پیشنهاد AI پیروی کردید؟</label>
                  <select
                    name="is_followed"
                    value={feedbackForm.is_followed}
                    onChange={handleFeedbackChange}
                  >
                    <option value="full">کاملاً</option>
                    <option value="partial">تا حدی</option>
                    <option value="none">خیر</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>نتیجه معامله چه بود؟</label>
                  <select
                    name="trade_result"
                    value={feedbackForm.trade_result}
                    onChange={handleFeedbackChange}
                  >
                    <option value="win">سود</option>
                    <option value="loss">زیان</option>
                    <option value="breakeven">مساوی</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>پیشنهاد AI چقدر به شما کمک کرد؟</label>
                  <select
                    name="feedback_helpfulness"
                    value={feedbackForm.feedback_helpfulness}
                    onChange={handleFeedbackChange}
                  >
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
              <button className="btn-cancel" onClick={handleCloseFeedback}>
                انصراف
              </button>
              <button className="btn-submit-feedback" onClick={handleSubmitFeedback}>
                💾 ثبت بازخورد
              </button>
            </div>
          </div>
        </div>
      )}

      {errorModal.open && (
        <div className="modal-overlay" onClick={closeErrorModal}>
          <div className="modal-content feedback-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>❌ {errorModal.title}</h3>
              <button className="modal-close" onClick={closeErrorModal}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '15px', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>{errorModal.message}</p>
              {errorModal.details && (
                <details style={{ marginTop: '12px', fontSize: '13px', color: '#888' }}>
                  <summary>جزئیات فنی</summary>
                  <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '6px', fontSize: '12px', maxHeight: '200px', overflow: 'auto', color: '#333' }}>{JSON.stringify(errorModal.details, null, 2)}</pre>
                </details>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-submit-feedback" onClick={closeErrorModal}>✅ متوجه شدم</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIConsultation;