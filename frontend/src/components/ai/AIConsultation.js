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

  // ===== State برای نمایش پیشرفت =====
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isTimeout, setIsTimeout] = useState(false);
  const progressIntervalRef = useRef(null);
  const timeIntervalRef = useRef(null);
  const startTimeRef = useRef(null);

  // ===== State برای مودال خطا =====
  const [errorModal, setErrorModal] = useState({
    open: false,
    title: '',
    message: '',
    details: null
  });

  // فرم ورودی
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
    // فیلدهای جدید
    session_type: '',
    strategy_type: '',
    timeframes: '',
    risk_percent: '',
    volume: '',
  });

  // لیست نمادها
  const [symbols, setSymbols] = useState([]);
  const [symbolsLoading, setSymbolsLoading] = useState(true);

  // ✅ لیست مدل‌های هوش مصنوعی
  const [availableModels, setAvailableModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(true);

  // Ref برای المان استریم
  const streamingContainerRef = useRef(null);

  // ============================================
  // بارگذاری نمادها
  // ============================================
  useEffect(() => {
    const loadSymbols = async () => {
      setSymbolsLoading(true);
      try {
        const response = await RealApiService.getAllSymbols();
        console.log('📊 Symbols response:', response.data);

        let symbolList = [];
        if (Array.isArray(response.data)) {
          symbolList = response.data.filter(Boolean);
        } else if (response.data && response.data.results) {
          symbolList = response.data.results.filter(Boolean);
        }

        console.log('📊 Extracted symbols count:', symbolList.length);

        if (symbolList.length > 0) {
          setSymbols(symbolList);
        } else {
          console.warn('⚠️ No symbols received, using fallback list');
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
  // ✅ بارگذاری لیست مدل‌های AI
  // ============================================
  useEffect(() => {
    const loadModels = async () => {
      setModelsLoading(true);
      try {
        const response = await RealApiService.getAvailableModels();
        console.log('🤖 Available models:', response.data);
        if (Array.isArray(response.data) && response.data.length > 0) {
          setAvailableModels(response.data);
        } else {
          setAvailableModels(['llama3.1:8b']);
        }
      } catch (error) {
        console.error('❌ Error loading models:', error);
        setAvailableModels(['llama3.1:8b']);
      } finally {
        setModelsLoading(false);
      }
    };
    loadModels();
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
  // تغییرات فرم
  // ============================================
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ============================================
  // شروع و توقف تایمرهای پیشرفت
  // ============================================
  const startProgressTimers = () => {
    setIsTimeout(false);
    setProgress(0);
    setElapsedTime(0);
    startTimeRef.current = Date.now();

    // تایمر پیشرفت (هر ۱۰۰ میلی‌ثانیه ۰.۵٪ افزایش)
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      setProgress(prev => Math.min(prev + 0.5, 95));
    }, 100);

    // تایمر زمان (هر ثانیه)
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
  };

  // ============================================
  // تابع parse پاسخ کامل (با مدیریت خطا)
  // ============================================
  const parseAIResponse = (text) => {
    const result = {
      score: 0,
      strengths: [],
      warnings: [],
      suggestion: 'پیشنهادی موجود نیست.',
      tip: 'همیشه به مدیریت ریسک توجه کنید.',
      psychology: 'تحلیل روانشناختی موجود نیست.',
      suggested_sl: null,
      suggested_tp: null,
      suggested_position: null,
      suggested_timing: null,
      is_connection_error: false,
    };

    // بررسی خطای اتصال
    if (text.includes('❌ خطای اتصال به سرویس هوش مصنوعی') || text.includes('❌ پاسخ نامعتبر از سرویس هوش مصنوعی')) {
      result.is_connection_error = true;
      result.score = 0;
      result.warnings = ['⚠️ سرویس هوش مصنوعی در دسترس نیست'];
      result.suggestion = 'لطفاً اتصال به Ollama را بررسی کنید.';
      return result;
    }

    if (!text || !text.trim()) {
      return result;
    }

    try {
      const lines = text.split('\n');
      let currentSection = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // ===== تشخیص بخش‌ها با الگوهای مختلف =====
        if (/امتیاز\s*:/.test(line)) {
          const parts = line.split(':');
          if (parts.length > 1) {
            const scorePart = parts[1].trim();
            const scoreMatch = scorePart.match(/(\d+)/);
            if (scoreMatch) {
              const score = parseInt(scoreMatch[1]);
              result.score = Math.min(100, Math.max(0, score));
            }
          }
          currentSection = 'score';
          continue;
        }

        if (/نقاط\s*قوت\s*:/.test(line)) {
          currentSection = 'strengths';
          continue;
        }

        if (/هشدارها\s*:/.test(line)) {
          currentSection = 'warnings';
          continue;
        }

        if (/پیشنهاد\s*:/.test(line)) {
          currentSection = 'suggestion';
          // اگر در همان خط متن وجود دارد
          const parts = line.split(':');
          if (parts.length > 1 && parts[1].trim().length > 5) {
            result.suggestion = parts[1].trim();
          }
          continue;
        }

        if (/تحلیل\s*روانشناختی\s*:/.test(line)) {
          currentSection = 'psychology';
          const parts = line.split(':');
          if (parts.length > 1 && parts[1].trim().length > 5) {
            result.psychology = parts[1].trim();
          }
          continue;
        }

        if (/نکته\s*:/.test(line)) {
          currentSection = 'tip';
          const parts = line.split(':');
          if (parts.length > 1 && parts[1].trim().length > 5) {
            result.tip = parts[1].trim();
          }
          continue;
        }

        // ===== جمع‌آوری محتوای هر بخش =====
        if (currentSection === 'strengths') {
          if (/^[-•\d.]/.test(line)) {
            const item = line.replace(/^[-•\d.]+\s*/, '').trim();
            if (item && item.length > 3) {
              result.strengths.push(item);
            }
          } else if (line.length > 5 && result.strengths.length > 0) {
            // ادامه متن قبلی
            result.strengths[result.strengths.length - 1] += ' ' + line;
          }
        } else if (currentSection === 'warnings') {
          if (/^[-•\d.]/.test(line)) {
            const item = line.replace(/^[-•\d.]+\s*/, '').trim();
            if (item && item.length > 3) {
              result.warnings.push(item);
            }
          } else if (line.length > 5 && result.warnings.length > 0) {
            result.warnings[result.warnings.length - 1] += ' ' + line;
          }
        } else if (currentSection === 'suggestion') {
          if (/^[-•\d.]/.test(line)) {
            const cleanLine = line.replace(/^[-•\d.]+\s*/, '').trim();
            if (/حد ضرر/.test(line)) {
              const val = cleanLine.split(':').length > 1 ? cleanLine.split(':')[1].trim() : cleanLine;
              result.suggested_sl = val;
            } else if (/حد سود/.test(line)) {
              const val = cleanLine.split(':').length > 1 ? cleanLine.split(':')[1].trim() : cleanLine;
              result.suggested_tp = val;
            } else if (/اندازه پوزیشن/.test(line) || /پوزیشن/.test(line)) {
              const val = cleanLine.split(':').length > 1 ? cleanLine.split(':')[1].trim() : cleanLine;
              result.suggested_position = val;
            } else if (/زمان‌بندی/.test(line) || /زمان/.test(line)) {
              const val = cleanLine.split(':').length > 1 ? cleanLine.split(':')[1].trim() : cleanLine;
              result.suggested_timing = val;
            } else if (cleanLine && cleanLine.length > 3) {
              if (result.suggestion === 'پیشنهادی موجود نیست.') {
                result.suggestion = cleanLine;
              } else {
                result.suggestion += ' ' + cleanLine;
              }
            }
          } else if (line.length > 5 && !/تحلیل/.test(line) && !/نکته/.test(line)) {
            if (result.suggestion === 'پیشنهادی موجود نیست.') {
              result.suggestion = line;
            } else {
              result.suggestion += ' ' + line;
            }
          }
        } else if (currentSection === 'psychology') {
          if (line.length > 5 && !/نکته/.test(line)) {
            if (result.psychology === 'تحلیل روانشناختی موجود نیست.') {
              result.psychology = line;
            } else {
              result.psychology += ' ' + line;
            }
          }
        } else if (currentSection === 'tip') {
          if (line.length > 5 && !/تحلیل/.test(line)) {
            if (result.tip === 'همیشه به مدیریت ریسک توجه کنید.') {
              result.tip = line;
            } else {
              result.tip += ' ' + line;
            }
          }
        }
      }

      // ===== استخراج از کل متن در صورت عدم موفقیت =====
      if ((!result.strengths || result.strengths.length === 0) && text.length > 100) {
        const sentences = text.split(/[.!\n]/);
        for (const sent of sentences) {
          const s = sent.trim();
          if (s.length < 10) continue;
          if (/قوت|مزیت|خوب|موفق/.test(s) && result.strengths.length < 5) {
            result.strengths.push(s.slice(0, 120));
          } else if (/هشدار|خطر|ضعف|ریسک/.test(s) && result.warnings.length < 5) {
            result.warnings.push(s.slice(0, 120));
          } else if (/پیشنهاد|توصیه|بهتر|مناسب/.test(s) && result.suggestion === 'پیشنهادی موجود نیست.') {
            result.suggestion = s.slice(0, 150);
          }
        }
      }

      // ===== تخمین امتیاز در صورت عدم وجود =====
      if (result.score === 0 && (result.strengths.length > 0 || result.warnings.length > 0 || text.length > 50)) {
        const lower = text.toLowerCase();
        if (/عالی|بسیار خوب/.test(lower)) result.score = 75;
        else if (/خوب|مناسب/.test(lower)) result.score = 65;
        else if (/متوسط/.test(lower)) result.score = 50;
        else if (/ضعیف|نامناسب/.test(lower)) result.score = 25;
        else if (/خطر|هشدار/.test(lower)) result.score = 35;
        else result.score = 45;
      }

    } catch (e) {
      console.error('Error parsing AI response:', e);
      // در صورت خطای کامل، از کل متن استفاده کن
      if (text.length > 50) {
        result.suggestion = text.slice(0, 200);
      }
    }

    return result;
  };

  // ============================================
  // دریافت مشاوره با استریم
  // ============================================
  const handleConsult = async (e) => {
    e.preventDefault();

    // اعتبارسنجی
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
    setIsTimeout(false);
    startProgressTimers();

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
        model: formData.model || null,
        session_type: formData.session_type || null,
        strategy_type: formData.strategy_type || null,
        timeframes: formData.timeframes || null,
        risk_percent: formData.risk_percent ? parseFloat(formData.risk_percent) : null,
        volume: formData.volume ? parseFloat(formData.volume) : null,
      };

      await AIService.getConsultationStream(
        requestData,
        (chunk) => {
          fullText += chunk;
          const el = document.getElementById('streaming-response');
          if (el) {
            el.innerText = fullText;
            el.scrollTop = el.scrollHeight;
          }
          // وقتی داده می‌آید، پیشرفت را به ۹۵٪ می‌رسانیم
          setProgress(95);
        }
      );

      stopProgressTimers();
      const parsed = parseAIResponse(fullText);
      setResult({ score: parsed.score, response: parsed });
      setComparisonStats(parsed.comparison_stats || null);

      if (parsed.is_connection_error) {
        showToast('🔌 خطای اتصال به سرویس هوش مصنوعی', 'error');
        setErrorModal({
          open: true,
          title: '🔌 خطای اتصال به AI',
          message: parsed.suggestion || 'لطفاً اتصال به Ollama را بررسی کنید.'
        });
      } else if (parsed.score > 0 || parsed.strengths.length > 0 || parsed.warnings.length > 0) {
        showToast('✅ تحلیل با موفقیت انجام شد', 'success');
      } else {
        showToast('⚠️ تحلیل کامل نشد. لطفاً دوباره تلاش کنید.', 'warning');
      }

      // به‌روزرسانی وضعیت اشتراک
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

      // تشخیص انواع خطاها
      if (error.name === 'TimeoutError' || error.message?.includes('timeout') || error.message?.includes('timed out')) {
        setIsTimeout(true);
        errorTitle = '⏰ زمان پاسخگویی به پایان رسید';
        errorMessage = `
⏰ زمان پاسخگویی سرویس هوش مصنوعی به پایان رسید.

این ممکن است به دلیل سنگین بودن مدل یا کندی سیستم باشد.
لطفاً چند لحظه صبر کنید و دوباره تلاش کنید.

💡 نکته: می‌توانید مدل سبک‌تری مانند 'mistral:7b' را انتخاب کنید.
        `;
      } else if (error.message?.includes('Ollama') || error.message?.includes('اتصال') || error.message?.includes('404')) {
        errorTitle = '🔌 خطای اتصال به AI';
        errorMessage = `
🔌 خطای اتصال به سرویس هوش مصنوعی

${error.message}

لطفاً موارد زیر را بررسی کنید:
1. آیا Ollama در حال اجراست؟ (دستور: ollama serve)
2. آیا مدل مناسب نصب شده است؟ (دستور: ollama pull llama3.1:8b)
3. آیا آدرس Ollama صحیح است؟ (پیش‌فرض: http://localhost:11434)

💡 برای ادامه، می‌توانید از تحلیل دستی استفاده کنید.
        `;
      } else if (error.response?.data) {
        const data = error.response.data;
        if (data.message) errorMessage = data.message;
        else if (data.error) errorMessage = data.error;
        else if (data.detail) errorMessage = data.detail;
        else if (data.non_field_errors) errorMessage = data.non_field_errors.join(' ');
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
    setResult(null);
    setStreamingText('');
    stopProgressTimers();
    setProgress(0);
    setElapsedTime(0);
    const el = document.getElementById('streaming-response');
    if (el) el.remove();
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

    const scoreColor = score >= 70 ? 'مطلوب' : score >= 40 ? 'متوسط' : 'نامطلوب';
    const now = new Date().toLocaleString('fa-IR');

    const strengthsHtml = response?.strengths?.length > 0
      ? response.strengths.map(s => `<li>${s}</li>`).join('')
      : '<li>نقاط قوتی یافت نشد</li>';

    const warningsHtml = response?.warnings?.length > 0
      ? response.warnings.map(w => `<li>${w}</li>`).join('')
      : '<li>هشدار خاصی وجود ندارد</li>';

    const isConnectionError = response?.is_connection_error || false;

    const htmlContent = `
      <!DOCTYPE html>
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
          .connection-error { background: #ffebee; border: 2px solid #c62828; padding: 16px; border-radius: 8px; margin-bottom: 16px; text-align: center; }
          .connection-error .icon { font-size: 48px; }
          .connection-error .msg { font-size: 16px; color: #c62828; font-weight: 600; margin-top: 8px; }
          @media print { body { padding: 12px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🧠 گزارش مشاوره هوشمند معاملاتی</h1>
          <p>تاریخ: ${now} | نماد: ${formData.symbol} | جهت: ${formData.direction === 'Buy' ? 'خرید' : 'فروش'}</p>
        </div>

        ${isConnectionError ? `
        <div class="connection-error">
          <div class="icon">🔌</div>
          <div class="msg">خطای اتصال به سرویس هوش مصنوعی</div>
          <p style="margin-top:8px;color:#555;font-size:14px;">${response?.suggestion || 'لطفاً اتصال به Ollama را بررسی کنید.'}</p>
        </div>
        ` : ''}

        <div class="summary">
          <div class="summary-card">
            <div class="label">امتیاز اعتبار</div>
            <div class="value" style="color: ${score >= 70 ? '#2e7d32' : score >= 40 ? '#f57c00' : '#c62828'}">${score}</div>
            <div style="font-size:12px;color:#888;">وضعیت: ${scoreColor}</div>
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
              ${formData.session_type ? `<div class="detail-row"><span class="label-text">نوع جلسه</span><span class="value-text">${formData.session_type}</span></div>` : ''}
              ${formData.strategy_type ? `<div class="detail-row"><span class="label-text">نوع استراتژی</span><span class="value-text">${formData.strategy_type}</span></div>` : ''}
              ${formData.timeframes ? `<div class="detail-row"><span class="label-text">تایم‌فریم‌ها</span><span class="value-text">${formData.timeframes}</span></div>` : ''}
              ${formData.risk_percent ? `<div class="detail-row"><span class="label-text">درصد ریسک</span><span class="value-text">${formData.risk_percent}%</span></div>` : ''}
              ${formData.volume ? `<div class="detail-row"><span class="label-text">حجم (لات)</span><span class="value-text">${formData.volume}</span></div>` : ''}
              ${formData.market_condition ? `<div class="detail-row"><span class="label-text">وضعیت بازار</span><span class="value-text">${formData.market_condition}</span></div>` : ''}
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

        ${response?.suggestion ? `
        <div class="section">
          <div class="section-title">💡 پیشنهاد عملی</div>
          <div class="section-body">
            <p style="font-size:14px;line-height:1.8;">${response.suggestion}</p>
            ${response.suggested_sl ? `<div class="detail-row"><span class="label-text">حد ضرر پیشنهادی</span><span class="value-text" style="color:#2e7d32;">${response.suggested_sl}</span></div>` : ''}
            ${response.suggested_tp ? `<div class="detail-row"><span class="label-text">حد سود پیشنهادی</span><span class="value-text" style="color:#2e7d32;">${response.suggested_tp}</span></div>` : ''}
            ${response.suggested_position ? `<div class="detail-row"><span class="label-text">اندازه پوزیشن پیشنهادی</span><span class="value-text" style="color:#2e7d32;">${response.suggested_position}</span></div>` : ''}
            ${response.suggested_timing ? `<div class="detail-row"><span class="label-text">زمان‌بندی پیشنهادی</span><span class="value-text" style="color:#2e7d32;">${response.suggested_timing}</span></div>` : ''}
          </div>
        </div>
        ` : ''}

        ${response?.psychology ? `
        <div class="section">
          <div class="section-title">🧠 تحلیل روانشناختی</div>
          <div class="section-body">
            <p style="font-size:14px;line-height:1.8;">${response.psychology}</p>
          </div>
        </div>
        ` : ''}

        ${response?.tip ? `
        <div class="section">
          <div class="section-title">📖 نکته آموزشی</div>
          <div class="section-body">
            <p style="font-size:14px;line-height:1.8;background:#fff8e1;padding:12px;border-radius:6px;border-right:4px solid #f57c00;">${response.tip}</p>
          </div>
        </div>
        ` : ''}

        ${comparisonStats ? `
        <div class="section">
          <div class="section-title">🔍 مقایسه با تریدهای مشابه شما</div>
          <div class="section-body">
            <div class="grid-2">
              <div class="detail-row"><span class="label-text">تعداد تریدهای مشابه</span><span class="value-text">${comparisonStats.count || 0}</span></div>
              <div class="detail-row"><span class="label-text">نرخ برد</span><span class="value-text ${(comparisonStats.win_rate || 0) >= 50 ? 'positive' : 'negative'}">${(comparisonStats.win_rate || 0).toFixed(1)}%</span></div>
              <div class="detail-row"><span class="label-text">تعداد برد</span><span class="value-text positive">${comparisonStats.win_count || 0}</span></div>
              <div class="detail-row"><span class="label-text">تعداد باخت</span><span class="value-text negative">${comparisonStats.loss_count || 0}</span></div>
              <div class="detail-row"><span class="label-text">میانگین سود</span><span class="value-text">${comparisonStats.avg_profit ? `$${comparisonStats.avg_profit.toFixed(2)}` : '-'}</span></div>
              <div class="detail-row"><span class="label-text">میانگین R:R</span><span class="value-text">${comparisonStats.avg_rr ? comparisonStats.avg_rr.toFixed(2) : '-'}</span></div>
            </div>
          </div>
        </div>
        ` : ''}

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
            <div>
              <h4>وارد کردن شرایط فعلی</h4>
              <p>نماد، جهت، قیمت، حد ضرر، حد سود و سایر اطلاعات را وارد کنید. هرچه اطلاعات دقیق‌تر باشد، تحلیل دقیق‌تر خواهد بود.</p>
            </div>
          </div>
          <div className="guide-step">
            <span className="step-number">۲</span>
            <div>
              <h4>بررسی تاریخچه شما</h4>
              <p>سیستم به‌طور خودکار عملکرد شما را در شرایط مشابه تحلیل می‌کند (همان نماد، روز هفته، احساسات و ...).</p>
            </div>
          </div>
          <div className="guide-step">
            <span className="step-number">۳</span>
            <div>
              <h4>دریافت تحلیل هوشمند</h4>
              <p>AI با ترکیب داده‌های شما و شرایط فعلی، موارد زیر را ارائه می‌دهد:</p>
              <ul>
                <li>امتیاز اعتبار (۰-۱۰۰)</li>
                <li>نقاط قوت و ضعف</li>
                <li>هشدارهای رفتاری</li>
                <li>پیشنهاد عملی برای مدیریت معامله</li>
                <li>نکته آموزشی اختصاصی</li>
                <li>تحلیل روانشناختی</li>
              </ul>
            </div>
          </div>
          <div className="guide-step">
            <span className="step-number">۴</span>
            <div>
              <h4>ثبت بازخورد (اختیاری)</h4>
              <p>پس از بسته شدن معامله، می‌توانید نتیجه را ثبت کنید تا سیستم برای دفعات بعدی دقیق‌تر شود.</p>
            </div>
          </div>
          <div className="guide-step">
            <span className="step-number">۵</span>
            <div>
              <h4>📊 تأثیر تعداد ترید بر دقت پیش‌بینی</h4>
              <table className="guide-table">
                <thead><tr><th>تعداد ترید</th><th>سطح دقت</th><th>توضیح</th></tr></thead>
                <tbody>
                  <tr><td>۰ تا ۵</td><td>🟡 پایین (۳۰-۴۰%)</td><td>داده‌های کافی برای شناسایی الگو وجود ندارد</td></tr>
                  <tr><td>۶ تا ۲۰</td><td>🟢 متوسط (۴۰-۶۰%)</td><td>الگوهای اولیه شکل می‌گیرند</td></tr>
                  <tr><td>۲۱ تا ۵۰</td><td>🟢 خوب (۶۰-۷۵%)</td><td>الگوهای معنی‌دار قابل شناسایی هستند</td></tr>
                  <tr><td>۵۱ تا ۱۰۰</td><td>🟢 عالی (۷۵-۸۵%)</td><td>الگوهای قوی و قابل اتکا</td></tr>
                  <tr><td>۱۰۰+</td><td>🟢 بسیار عالی (۸۵-۹۰%+)</td><td>پیش‌بینی‌ها بسیار دقیق هستند</td></tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="guide-step">
            <span className="step-number">۶</span>
            <div>
              <h4>📋 داده‌های استفاده‌شده از تاریخچه شما</h4>
              <table className="guide-table">
                <thead><tr><th>داده</th><th>نحوه استفاده</th><th>اهمیت</th></tr></thead>
                <tbody>
                  <tr><td>کل تریدها</td><td>محاسبه نرخ برد کلی و فاکتور سود</td><td>ارزیابی توانایی کلی</td></tr>
                  <tr><td>عملکرد نماد</td><td>بررسی سابقه معاملات همان نماد</td><td>تشخیص نقاط قوت/ضعف در هر نماد</td></tr>
                  <tr><td>عملکرد روز هفته</td><td>الگوی عملکرد در روزهای مختلف</td><td>شناسایی بهترین روزهای معاملاتی</td></tr>
                  <tr><td>عملکرد با احساسات مشابه</td><td>تأثیر احساسات بر نتیجه</td><td>تشخیص احساسات پرهزینه</td></tr>
                  <tr><td>پایبندی به چک‌لیست</td><td>بررسی رعایت قوانین معاملاتی</td><td>اندازه‌گیری انضباط</td></tr>
                  <tr><td>بهترین ساعت معاملاتی</td><td>شناسایی زمان‌های پربازده</td><td>بهینه‌سازی زمان معامله</td></tr>
                  <tr><td>میانگین R:R</td><td>کیفیت مدیریت ریسک</td><td>ارزیابی نسبت ریسک به ریوارد</td></tr>
                  <tr><td>بهترین استراتژی</td><td>شناسایی الگوی موفق</td><td>بهبود تصمیم‌گیری</td></tr>
                  <tr><td>تریدهای مشابه</td><td>مقایسه با شرایط مشابه</td><td>پیش‌بینی دقیق‌تر</td></tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="guide-tip">
            💡 <strong>نکات کلیدی:</strong>
            <ul>
              <li>هرچه تعداد تریدهای شما بیشتر باشد، تحلیل‌ها دقیق‌تر و شخصی‌تر خواهند بود!</li>
              <li>سیستم از <strong>نتایج تریدهای قبلی شما</strong> برای پیش‌بینی استفاده می‌کند.</li>
              <li>با هر ترید جدید، داده‌های شما کامل‌تر شده و دقت پیش‌بینی افزایش می‌یابد.</li>
              <li>تاریخچه معاملاتی شما (نمادها، احساسات، نتایج) به‌صورت خودکار در تحلیل لحاظ می‌شود.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );

  // ============================================
  // رندر نتیجه با نمودارهای جذاب
  // ============================================
  const renderResult = () => {
    if (!result) return null;

    const { score, response } = result;
    const scoreColor = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
    const isConnectionError = response?.is_connection_error || false;

    // داده‌های نمودار رادار
    const radarData = [
      { subject: 'مدیریت ریسک', value: Math.min(100, (response?.strengths?.length || 0) * 25 + (score * 0.3)) },
      { subject: 'تحلیل تکنیکال', value: Math.min(100, score * 0.5 + 20) },
      { subject: 'روانشناسی', value: Math.min(100, (response?.warnings?.length || 0) * -10 + 70) },
      { subject: 'مدیریت سرمایه', value: Math.min(100, (response?.suggested_sl ? 75 : 50)) },
      { subject: 'انضباط', value: Math.min(100, (response?.warnings?.length || 0) * -8 + 80) },
    ];

    // داده‌های نمودار میله‌ای نقاط قوت و ضعف
    const strengthData = [
      { name: 'نقاط قوت', value: response?.strengths?.length || 0 },
      { name: 'هشدارها', value: response?.warnings?.length || 0 },
    ];

    // داده‌های نمودار دایره‌ای
    const pieData = [
      { name: 'نقاط قوت', value: response?.strengths?.length || 0, fill: '#2e7d32' },
      { name: 'هشدارها', value: response?.warnings?.length || 0, fill: '#c62828' },
    ];

    return (
      <div id="ai-result" className="result-section">
        <h3>🤖 تحلیل هوشمند</h3>

        {isConnectionError && (
          <div className="connection-error-banner">
            <span className="error-icon">🔌</span>
            <div className="error-content">
              <h4>خطای اتصال به سرویس هوش مصنوعی</h4>
              <p>{response?.suggestion || 'لطفاً اتصال به Ollama را بررسی کنید.'}</p>
            </div>
          </div>
        )}

        <div className={`result-score ${scoreColor}`}>
          <span className="score-number">{score}</span>
          <span className="score-label">امتیاز اعتبار (از ۱۰۰)</span>
          <span className="score-text">
            {score >= 70 ? '✅ شرایط مطلوب' : score >= 40 ? '⚖️ شرایط متوسط' : '⚠️ شرایط نامطلوب'}
          </span>
        </div>

        {/* ===== نمودارهای تحلیلی ===== */}
        {!isConnectionError && (
          <div className="charts-container">
            <div className="chart-box">
              <h4>📊 تحلیل چندبعدی</h4>
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: isDark ? '#ccc' : '#555', fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: isDark ? '#ccc' : '#555', fontSize: 10 }} />
                  <Radar name="امتیاز" dataKey="value" stroke="#1a237e" fill="#1a237e" fillOpacity={0.5} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-box">
              <h4>📊 تعادل نقاط قوت و هشدارها</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={strengthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#444' : '#ddd'} />
                  <XAxis dataKey="name" tick={{ fill: isDark ? '#ccc' : '#555' }} />
                  <YAxis tick={{ fill: isDark ? '#ccc' : '#555' }} />
                  <Tooltip contentStyle={{ background: isDark ? '#2d2d44' : '#fff', border: 'none', borderRadius: '8px' }} />
                  <Bar dataKey="value" fill="#1a237e" radius={[4, 4, 0, 0]} />
                  <Cell fill="#2e7d32" />
                  <Cell fill="#c62828" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-box">
              <h4>📊 تحلیل قدرت معامله</h4>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: isDark ? '#2d2d44' : '#fff', border: 'none', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {response?.strengths?.length > 0 && (
          <div className="result-strengths">
            <h4>✅ نقاط قوت</h4>
            <ul>
              {response.strengths.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {response?.warnings?.length > 0 && (
          <div className="result-warnings">
            <h4>⚠️ هشدارها</h4>
            <ul>
              {response.warnings.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {response?.suggestion && (
          <div className="result-suggestion">
            <h4>💡 پیشنهاد عملی</h4>
            <p>{response.suggestion}</p>
            {response.suggested_sl && (
              <div className="suggestion-detail">
                <span className="detail-label">حد ضرر پیشنهادی:</span>
                <span className="detail-value">{response.suggested_sl}</span>
              </div>
            )}
            {response.suggested_tp && (
              <div className="suggestion-detail">
                <span className="detail-label">حد سود پیشنهادی:</span>
                <span className="detail-value">{response.suggested_tp}</span>
              </div>
            )}
            {response.suggested_position && (
              <div className="suggestion-detail">
                <span className="detail-label">اندازه پوزیشن:</span>
                <span className="detail-value">{response.suggested_position}</span>
              </div>
            )}
            {response.suggested_timing && (
              <div className="suggestion-detail">
                <span className="detail-label">زمان‌بندی:</span>
                <span className="detail-value">{response.suggested_timing}</span>
              </div>
            )}
          </div>
        )}

        {response?.psychology && (
          <div className="result-psychology">
            <h4>🧠 تحلیل روانشناختی</h4>
            <p>{response.psychology}</p>
          </div>
        )}

        {response?.tip && (
          <div className="result-tip">
            <h4>📖 نکته آموزشی</h4>
            <p>{response.tip}</p>
          </div>
        )}

        {comparisonStats && (
          <div className="result-comparison">
            <h4>🔍 مقایسه با تریدهای مشابه شما</h4>
            <div className="comparison-grid">
              <div className="comparison-item">
                <span className="label">تعداد مشابه</span>
                <span className="value">{comparisonStats.count || 0}</span>
              </div>
              <div className="comparison-item">
                <span className="label">نرخ برد</span>
                <span className={`value ${(comparisonStats.win_rate || 0) >= 50 ? 'positive' : 'negative'}`}>
                  {(comparisonStats.win_rate || 0).toFixed(1)}%
                </span>
              </div>
              <div className="comparison-item">
                <span className="label">تعداد برد</span>
                <span className="value positive">{comparisonStats.win_count || 0}</span>
              </div>
              <div className="comparison-item">
                <span className="label">تعداد باخت</span>
                <span className="value negative">{comparisonStats.loss_count || 0}</span>
              </div>
              <div className="comparison-item">
                <span className="label">میانگین سود</span>
                <span className="value">{comparisonStats.avg_profit ? `$${comparisonStats.avg_profit.toFixed(2)}` : '-'}</span>
              </div>
              <div className="comparison-item">
                <span className="label">میانگین R:R</span>
                <span className="value">{comparisonStats.avg_rr ? comparisonStats.avg_rr.toFixed(2) : '-'}</span>
              </div>
            </div>
          </div>
        )}

        <div className="result-actions">
          <button className="btn-secondary" onClick={handleReset}>
            ↩️ بازگشت به فرم
          </button>
          <button className="btn-secondary" onClick={handlePrintReport}>
            🖨️ چاپ گزارش کامل
          </button>
          <button className="btn-primary" onClick={() => navigate('/ai-history')}>
            📋 تاریخچه مشاوره‌ها
          </button>
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
          <button className="btn-history" onClick={() => navigate('/ai-history')}>
            📋 تاریخچه مشاوره‌ها
          </button>
          <button className="btn-back" onClick={() => navigate('/dashboard')}>
            ↩️ بازگشت به داشبورد
          </button>
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
                <input
                  type="text"
                  name="symbol"
                  list="symbol-list"
                  value={formData.symbol}
                  onChange={handleChange}
                  placeholder={symbolsLoading ? "در حال بارگذاری نمادها..." : "جستجو و انتخاب نماد..."}
                  required
                  disabled={limitReached || symbolsLoading}
                  className="symbol-input"
                  autoComplete="off"
                />
                <datalist id="symbol-list">
                  {symbols.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
                {symbolsLoading && <span className="field-hint">⏳ در حال بارگذاری لیست نمادها...</span>}
                {!symbolsLoading && symbols.length > 0 && (
                  <span className="field-hint">🔍 {symbols.length} نماد موجود است. با تایپ کردن جستجو کنید.</span>
                )}
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
                <input
                  type="number"
                  name="entry_price"
                  value={formData.entry_price}
                  onChange={handleChange}
                  step="0.00001"
                  placeholder="0.00000"
                  required
                  disabled={limitReached}
                />
              </div>
              <div className="form-group">
                <label>حد ضرر (اختیاری)</label>
                <input
                  type="number"
                  name="stop_loss"
                  value={formData.stop_loss}
                  onChange={handleChange}
                  step="0.00001"
                  placeholder="0.00000"
                  disabled={limitReached}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>حد سود (اختیاری)</label>
                <input
                  type="number"
                  name="take_profit"
                  value={formData.take_profit}
                  onChange={handleChange}
                  step="0.00001"
                  placeholder="0.00000"
                  disabled={limitReached}
                />
              </div>
              <div className="form-group">
                <label>ساعت (به وقت نیویورک)</label>
                <input
                  type="time"
                  name="time_ny"
                  value={formData.time_ny}
                  onChange={handleChange}
                  disabled={limitReached}
                />
              </div>
            </div>

            {/* ===== فیلدهای جدید ===== */}
            <div className="form-row">
              <div className="form-group">
                <label>نوع جلسه</label>
                <select name="session_type" value={formData.session_type} onChange={handleChange} disabled={limitReached}>
                  <option value="">انتخاب کنید</option>
                  <option value="High Pro">حرفه‌ای (High Pro)</option>
                  <option value="Low Pro">مبتدی (Low Pro)</option>
                </select>
              </div>
              <div className="form-group">
                <label>نوع استراتژی</label>
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
                <input
                  type="text"
                  name="timeframes"
                  value={formData.timeframes}
                  onChange={handleChange}
                  placeholder="مثلاً: D1, H4, H1"
                  disabled={limitReached}
                />
              </div>
              <div className="form-group">
                <label>درصد ریسک از سرمایه</label>
                <input
                  type="number"
                  name="risk_percent"
                  value={formData.risk_percent}
                  onChange={handleChange}
                  step="0.01"
                  placeholder="مثلاً 1.5"
                  disabled={limitReached}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>حجم معامله (لات)</label>
                <input
                  type="number"
                  name="volume"
                  value={formData.volume}
                  onChange={handleChange}
                  step="0.01"
                  placeholder="مثلاً 0.5"
                  disabled={limitReached}
                />
              </div>
              <div className="form-group">
                <label>وضعیت بازار</label>
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
                  {availableModels.map((model) => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
                {modelsLoading && <span className="field-hint">⏳ در حال بارگذاری لیست مدل‌ها...</span>}
                {!modelsLoading && availableModels.length > 1 && (
                  <span className="field-hint">🧠 {availableModels.length} مدل موجود است.</span>
                )}
              </div>
            </div>

            <div className="form-group full-width">
              <label>سوال شما (اختیاری)</label>
              <textarea
                name="user_question"
                value={formData.user_question}
                onChange={handleChange}
                placeholder="مثلاً: آیا با توجه به شرایط، وارد این معامله شوم؟"
                rows="2"
                disabled={limitReached}
              />
            </div>

            {/* ===== نوار پیشرفت و تایمر ===== */}
            {consulting && (
              <div className="progress-container">
                <div className="progress-header">
                  <span className="progress-label">⏳ در حال دریافت تحلیل...</span>
                  <span className="progress-time">{elapsedTime}s</span>
                </div>
                <div className="progress-bar-wrapper">
                  <div className={`progress-bar ${isTimeout ? 'timeout' : ''}`} style={{ width: `${Math.min(progress, 100)}%` }} />
                </div>
                <div className="progress-hint">
                  {progress < 30 && '🔄 اتصال به سرویس AI...'}
                  {progress >= 30 && progress < 60 && '🧠 در حال تحلیل شرایط شما...'}
                  {progress >= 60 && progress < 90 && '📊 ترکیب داده‌ها و تولید تحلیل...'}
                  {progress >= 90 && progress < 100 && '✍️ نهایی‌سازی پاسخ...'}
                  {progress >= 100 && '✅ تحلیل کامل شد!'}
                </div>
              </div>
            )}

            <div className="form-actions">
              <button
                type="submit"
                className="btn-consult"
                disabled={consulting || limitReached || (subscriptionStatus?.remaining_ai_consultations !== undefined && subscriptionStatus.remaining_ai_consultations <= 0)}
              >
                {consulting ? (
                  <><span className="spinner">⏳</span> در حال تحلیل...</>
                ) : (limitReached || (subscriptionStatus?.remaining_ai_consultations !== undefined && subscriptionStatus.remaining_ai_consultations <= 0)) ? (
                  '⛔ محدودیت مشاوره به پایان رسیده'
                ) : (
                  '🔍 دریافت تحلیل'
                )}
              </button>
              <button type="button" className="btn-reset" onClick={handleReset} disabled={consulting}>
                🗑️ پاک کردن فرم
              </button>
            </div>

            {subscriptionStatus && !limitReached && (
              <div className="remaining-info">
                <span>🧠 مشاوره‌های باقیمانده: {
                  subscriptionStatus.remaining_ai_consultations !== undefined &&
                  subscriptionStatus.remaining_ai_consultations !== null
                    ? (subscriptionStatus.remaining_ai_consultations >= 999999
                        ? '∞'
                        : subscriptionStatus.remaining_ai_consultations)
                    : '۰'
                }</span>
              </div>
            )}
          </form>
        </div>

        {renderResult()}
      </div>

      {/* مودال خطا */}
      {errorModal.open && (
        <div className="modal-overlay" onClick={closeErrorModal}>
          <div className="modal-content feedback-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>❌ {errorModal.title}</h3>
              <button className="modal-close" onClick={closeErrorModal}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '15px', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
                {errorModal.message}
              </p>
              {errorModal.details && (
                <details style={{ marginTop: '12px', fontSize: '13px', color: '#888' }}>
                  <summary>جزئیات فنی</summary>
                  <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '6px', fontSize: '12px', maxHeight: '200px', overflow: 'auto', color: '#333' }}>
                    {JSON.stringify(errorModal.details, null, 2)}
                  </pre>
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