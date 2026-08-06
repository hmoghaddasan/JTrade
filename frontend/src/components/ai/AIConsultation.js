// frontend/src/components/ai/AIConsultation.js

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import AIService from '../../services/aiService';
import RealApiService from '../../services/realApiService';
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

  // ✅ State برای مودال خطا (به‌جای Toast)
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
  // تابع کمکی برای parse پاسخ کامل
  // ============================================
  const parseAIResponse = (text) => {
    const result = {
      score: 50,
      strengths: [],
      warnings: [],
      suggestion: 'پیشنهادی موجود نیست.',
      tip: 'همیشه به مدیریت ریسک توجه کنید.',
    };

    try {
      const lines = text.split('\n');

      for (const line of lines) {
        if (line.includes('امتیاز:')) {
          const parts = line.split(':');
          if (parts.length > 1) {
            const scoreText = parts[1].trim();
            const scoreNum = scoreText.replace(/\D/g, '');
            if (scoreNum) {
              result.score = Math.min(100, Math.max(0, parseInt(scoreNum)));
            }
          }
          break;
        }
      }

      let strengthsSection = false;
      for (const line of lines) {
        if (line.includes('نقاط قوت:')) {
          strengthsSection = true;
          continue;
        }
        if (strengthsSection) {
          if (line.includes('هشدارها:') || line.includes('پیشنهاد:') || line.includes('نکته:')) {
            strengthsSection = false;
          } else if (line.trim().startssWith('-') || line.trim().startsWith('•')) {
            result.strengths.push(line.trim().replace(/^[-•]\s*/, ''));
          }
        }
      }

      let warningsSection = false;
      for (const line of lines) {
        if (line.includes('هشدارها:')) {
          warningsSection = true;
          continue;
        }
        if (warningsSection) {
          if (line.includes('پیشنهاد:') || line.includes('نکته:')) {
            warningsSection = false;
          } else if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
            result.warnings.push(line.trim().replace(/^[-•]\s*/, ''));
          }
        }
      }

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('پیشنهاد:')) {
          let suggestionText = lines[i].split(':', 1)[1].trim();
          for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
            if (lines[j].includes('نکته:')) break;
            if (lines[j].trim() && !lines[j].trim().startsWith('-')) {
              suggestionText += ' ' + lines[j].trim();
            }
          }
          result.suggestion = suggestionText;
          break;
        }
      }

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('نکته:')) {
          let tipText = lines[i].split(':', 1)[1].trim();
          for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
            if (lines[j].trim() && !lines[j].trim().startsWith('-')) {
              tipText += ' ' + lines[j].trim();
            }
          }
          result.tip = tipText;
          break;
        }
      }

      if (result.tip === 'همیشه به مدیریت ریسک توجه کنید.' && text) {
        const sentences = text.split('.');
        if (sentences.length > 1) {
          const lastSentence = sentences[sentences.length - 2]?.trim() || sentences[sentences.length - 1]?.trim();
          if (lastSentence && lastSentence.length > 10) {
            result.tip = lastSentence;
          }
        }
      }
    } catch (e) {
      console.error('Error parsing AI response:', e);
    }

    return result;
  };

  // ============================================
  // دریافت مشاوره با استریم
  // ============================================
  const handleConsult = async (e) => {
    e.preventDefault();

    // ✅ اعتبارسنجی ساده در فرانت‌اند
    if (!formData.symbol) {
      setErrorModal({
        open: true,
        title: 'خطا در فرم',
        message: 'لطفاً نماد معاملاتی را انتخاب کنید.'
      });
      return;
    }
    if (!formData.direction) {
      setErrorModal({
        open: true,
        title: 'خطا در فرم',
        message: 'لطفاً جهت معامله را انتخاب کنید.'
      });
      return;
    }
    if (!formData.entry_price || parseFloat(formData.entry_price) <= 0) {
      setErrorModal({
        open: true,
        title: 'خطا در فرم',
        message: 'لطفاً قیمت ورود را به‌صورت عدد معتبر وارد کنید.'
      });
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
      // ✅ ساخت داده‌های درخواست با تبدیل فیلدهای خالی به null
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
        }
      );

      const parsed = parseAIResponse(fullText);
      setResult({ score: parsed.score, response: parsed });
      showToast('✅ تحلیل با موفقیت انجام شد', 'success');

      const subResponse = await RealApiService.getSubscriptionStatus();
      const data = subResponse.data;
      setSubscriptionStatus(data);
      if (data.remaining_ai_consultations <= 0) {
        setLimitReached(true);
      }

    } catch (error) {
      console.error('Error getting consultation:', error);

      let errorMessage = '❌ خطا در دریافت مشاوره';
      let errorDetails = null;

      if (error.response?.data) {
        const data = error.response.data;
        if (data.message) {
          errorMessage = data.message;
        } else if (data.error) {
          errorMessage = data.error;
        } else if (data.detail) {
          errorMessage = data.detail;
        } else if (data.non_field_errors) {
          errorMessage = data.non_field_errors.join(' ');
        } else if (typeof data === 'object') {
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
        title: 'خطا در دریافت مشاوره',
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
    });
    setResult(null);
    setStreamingText('');
    const el = document.getElementById('streaming-response');
    if (el) el.remove();
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
                <thead>
                  <tr><th>تعداد ترید</th><th>سطح دقت</th><th>توضیح</th></tr>
                </thead>
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
                <thead>
                  <tr><th>داده</th><th>نحوه استفاده</th><th>اهمیت</th></tr>
                </thead>
                <tbody>
                  <tr><td>کل تریدها</td><td>محاسبه نرخ برد کلی و فاکتور سود</td><td>ارزیابی توانایی کلی</td></tr>
                  <tr><td>عملکرد نماد</td><td>بررسی سابقه معاملات همان نماد</td><td>تشخیص نقاط قوت/ضعف در هر نماد</td></tr>
                  <tr><td>عملکرد روز هفته</td><td>الگوی عملکرد در روزهای مختلف</td><td>شناسایی بهترین روزهای معاملاتی</td></tr>
                  <tr><td>عملکرد با احساسات مشابه</td><td>تأثیر احساسات بر نتیجه</td><td>تشخیص احساسات پرهزینه</td></tr>
                  <tr><td>پایبندی به چک‌لیست</td><td>بررسی رعایت قوانین معاملاتی</td><td>اندازه‌گیری انضباط</td></tr>
                  <tr><td>بهترین ساعت معاملاتی</td><td>شناسایی زمان‌های پربازده</td><td>بهینه‌سازی زمان معامله</td></tr>
                  <tr><td>میانگین R:R</td><td>کیفیت مدیریت ریسک</td><td>ارزیابی نسبت ریسک به ریوارد</td></tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="guide-tip">
            💡 <strong>نکات کلیدی:</strong>
            <ul style={{ marginTop: '6px', paddingRight: '20px' }}>
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
  // رندر نتیجه
  // ============================================
  const renderResult = () => {
    if (!result) return null;

    const { score, response } = result;
    const scoreColor = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';

    return (
      <div id="ai-result" className="result-section">
        <h3>🤖 تحلیل AI</h3>

        <div className={`result-score ${scoreColor}`}>
          <span className="score-number">{score}</span>
          <span className="score-label">امتیاز اعتبار (از ۱۰۰)</span>
          <span className="score-text">
            {score >= 70 ? '✅ شرایط مطلوب' : score >= 40 ? '⚖️ شرایط متوسط' : '⚠️ شرایط نامطلوب'}
          </span>
        </div>

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
          </div>
        )}

        {response?.tip && (
          <div className="result-tip">
            <h4>📖 نکته آموزشی</h4>
            <p>{response.tip}</p>
          </div>
        )}

        <div className="result-actions">
          <button className="btn-secondary" onClick={handleReset}>
            ↩️ بازگشت به فرم
          </button>
          <button className="btn-primary" onClick={() => navigate('/ai-history')}>
            📋 مشاهده تاریخچه مشاوره‌ها
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
            <p>
              شما {subscriptionStatus?.ai_consultations_limit || 0} مشاوره در پلن خود دارید
              که همه را استفاده کرده‌اید.
            </p>
            <button
              className="btn-upgrade"
              onClick={() => navigate('/profile')}
            >
              🚀 تمدید اشتراک
            </button>
          </div>
        </div>
      )}

      <div className="ai-content">
        <div className="form-section">
          <h3>📝 شرایط فعلی خود را وارد کنید</h3>

          <form onSubmit={handleConsult}>
            <div className="form-row">
              <div className="form-group">
                <label>نماد معاملاتی <span className="required">*</span></label>
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
                {symbolsLoading && (
                  <span className="field-hint">⏳ در حال بارگذاری لیست نمادها...</span>
                )}
                {!symbolsLoading && symbols.length > 0 && (
                  <span className="field-hint">🔍 {symbols.length} نماد موجود است. با تایپ کردن جستجو کنید.</span>
                )}
              </div>
              <div className="form-group">
                <label>جهت معامله <span className="required">*</span></label>
                <select
                  name="direction"
                  value={formData.direction}
                  onChange={handleChange}
                  required
                  disabled={limitReached}
                >
                  <option value="Buy">خرید (Buy)</option>
                  <option value="Sell">فروش (Sell)</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>قیمت ورود <span className="required">*</span></label>
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

            <div className="form-row">
              <div className="form-group">
                <label>وضعیت بازار</label>
                <select
                  name="market_condition"
                  value={formData.market_condition}
                  onChange={handleChange}
                  disabled={limitReached}
                >
                  <option value="">انتخاب کنید</option>
                  <option value="trending">رونددار</option>
                  <option value="ranging">رنج</option>
                  <option value="neutral">خنثی</option>
                  <option value="volatile">پرنوسان</option>
                </select>
              </div>
              <div className="form-group">
                <label>احساسات فعلی</label>
                <select
                  name="emotion"
                  value={formData.emotion}
                  onChange={handleChange}
                  disabled={limitReached}
                >
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
            </div>

            {/* ✅ فیلد جدید: انتخاب مدل هوش مصنوعی */}
            <div className="form-row">
              <div className="form-group">
                <label>مدل هوش مصنوعی</label>
                <select
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  disabled={limitReached || modelsLoading}
                >
                  <option value="">پیش‌فرض ({availableModels[0] || 'llama3.1:8b'})</option>
                  {availableModels.map((model) => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
                {modelsLoading && (
                  <span className="field-hint">⏳ در حال بارگذاری لیست مدل‌ها...</span>
                )}
                {!modelsLoading && availableModels.length > 1 && (
                  <span className="field-hint">🧠 {availableModels.length} مدل موجود است.</span>
                )}
              </div>
              <div className="form-group">
                {/* فضای خالی برای هم‌ترازی */}
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

            <div className="form-actions">
              <button
                type="submit"
                className="btn-consult"
                disabled={consulting || limitReached || (subscriptionStatus?.remaining_ai_consultations !== undefined && subscriptionStatus.remaining_ai_consultations <= 0)}
              >
                {consulting ? (
                  <>
                    <span className="spinner">⏳</span>
                    در حال تحلیل...
                  </>
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

      {/* ✅ مودال خطا با دکمه بسته شدن */}
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
                  <pre style={{
                    background: '#f5f5f5',
                    padding: '10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    maxHeight: '200px',
                    overflow: 'auto',
                    color: '#333'
                  }}>
                    {JSON.stringify(errorModal.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-submit-feedback" onClick={closeErrorModal}>
                ✅ متوجه شدم
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIConsultation;