// frontend/src/utils/aiResponseParser.js

/**
 * فایل ابزارهای پردازش پاسخ AI
 * این فایل شامل توابع جداسازی و پردازش جیسان دریافتی از بک‌اند است
 */

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
// تابع تولید هشدار قیمت استاندارد (پله‌ای)
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
// تابع اصلی پردازش JSON پاسخ AI (برای ai_response از دیتابیس)
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

  // ===== تابع کمکی: تبدیل **...** به <strong>...</strong> =====
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

  // ===== 1. امتیاز =====
  const score = aiResponse.score || 0;

  // ===== 2. نقاط قوت =====
  let strengths = [];
  if (aiResponse.strengths && Array.isArray(aiResponse.strengths)) {
    strengths = processArray(aiResponse.strengths);
  }

  // ===== 3. هشدارها =====
  let warnings = [];
  if (aiResponse.warnings && Array.isArray(aiResponse.warnings)) {
    warnings = processArray(aiResponse.warnings);
  }

  // ===== 4. پیشنهاد عملی =====
  let suggestion = aiResponse.suggestion || 'پیشنهادی موجود نیست.';
  suggestion = processText(suggestion) || suggestion;

  // ===== 5. تحلیل روانشناختی =====
  let psychology = aiResponse.psychology || 'تحلیل روانشناختی موجود نیست.';
  psychology = translateEmotion(psychology);
  psychology = processText(psychology) || psychology;

  // ===== 6. نکته آموزشی =====
  let tip = aiResponse.tip || 'همیشه به مدیریت ریسک توجه کنید.';
  tip = processText(tip) || tip;

  // ===== 7. مقادیر پیشنهادی =====
  const suggested_sl = aiResponse.suggested_sl || null;
  const suggested_tp = aiResponse.suggested_tp || null;
  const suggested_timing = aiResponse.suggested_timing || null;
  const suggested_position = aiResponse.suggested_position || null;

  // ===== 8. هشدار قیمت استاندارد =====
  let price_warning = null;
  if (livePriceData && entryPrice) {
    price_warning = generateStandardPriceWarning(entryPrice, livePriceData);
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
    live_price: livePriceData || null,
    price_warning,
  };

  console.log('📤 processAIResponse - Output:', JSON.stringify(result, null, 2));
  return result;
};

// ============================================
// تابع پردازش متن استریم (fullText)
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

  // ===== استخراج امتیاز =====
  const scoreMatch = text.match(/امتیاز\s*[:]\s*(\d+)/i);
  if (scoreMatch) {
    result.score = Math.min(100, Math.max(0, parseInt(scoreMatch[1])));
    console.log('✅ استخراج امتیاز:', result.score);
  }

  // ===== استخراج نقاط قوت =====
  const strengthsMatch = text.match(/نقاط\s*قوت\s*[:]\s*([\s\S]*?)(?=\s*هشدارها\s*[:]|\s*پیشنهاد\s*[:]|$)/i);
  if (strengthsMatch) {
    const strengthsText = strengthsMatch[1].trim();
    console.log('🔍 متن نقاط قوت:', strengthsText.substring(0, 100) + '...');
    const items = strengthsText.match(/(?:[-•\d.]+)\s*([^\n]*?)(?=(?:[-•\d.]+)|$)/g);
    if (items) {
      for (const item of items) {
        const cleanItem = item.replace(/^[-•\d.]+\s*/, '').trim();
        if (cleanItem && cleanItem.length > 5) {
          result.strengths.push(cleanItem);
        }
      }
    }
    console.log('✅ استخراج نقاط قوت:', result.strengths.length, 'مورد');
  }

  // ===== استخراج هشدارها =====
  const warningsMatch = text.match(/هشدارها\s*[:]\s*([\s\S]*?)(?=\s*پیشنهاد\s*[:]|\s*تحلیل\s*روانشناختی\s*[:]|$)/i);
  if (warningsMatch) {
    const warningsText = warningsMatch[1].trim();
    console.log('🔍 متن هشدارها:', warningsText.substring(0, 100) + '...');
    const items = warningsText.match(/(?:[-•\d.]+)\s*([^\n]*?)(?=(?:[-•\d.]+)|$)/g);
    if (items) {
      for (const item of items) {
        const cleanItem = item.replace(/^[-•\d.]+\s*/, '').trim();
        if (cleanItem && cleanItem.length > 5) {
          result.warnings.push(cleanItem);
        }
      }
    }
    console.log('✅ استخراج هشدارها:', result.warnings.length, 'مورد');
  }

  // ===== استخراج پیشنهاد =====
  const suggestionMatch = text.match(/پیشنهاد\s*[:]\s*([\s\S]*?)(?=\s*تحلیل\s*روانشناختی\s*[:]|\s*نکته\s*[:]|$)/i);
  if (suggestionMatch) {
    const suggestionText = suggestionMatch[1].trim();
    if (suggestionText && suggestionText.length > 5) {
      result.suggestion = suggestionText;
      console.log('✅ استخراج پیشنهاد:', result.suggestion.substring(0, 100) + '...');
    }
  }

  // ===== استخراج تحلیل روانشناختی =====
  const psychologyMatch = text.match(/تحلیل\s*روانشناختی\s*[:]\s*([\s\S]*?)(?=\s*نکته\s*[:]|$)/i);
  if (psychologyMatch) {
    const psychologyText = psychologyMatch[1].trim();
    if (psychologyText && psychologyText.length > 5) {
      result.psychology = translateEmotion(psychologyText);
      console.log('✅ استخراج تحلیل روانشناختی:', result.psychology.substring(0, 100) + '...');
    }
  }

  // ===== استخراج نکته =====
  const tipMatch = text.match(/نکته\s*[:]\s*([\s\S]*?)$/i);
  if (tipMatch) {
    const tipText = tipMatch[1].trim();
    if (tipText && tipText.length > 5) {
      result.tip = tipText;
      console.log('✅ استخراج نکته:', result.tip.substring(0, 100) + '...');
    }
  }

  // ===== تولید هشدار قیمت استاندارد =====
  if (livePriceData && entryPrice) {
    result.price_warning = generateStandardPriceWarning(entryPrice, livePriceData);
  }

  // اگر هیچ داده‌ای استخراج نشد، از داده‌های پیش‌فرض استفاده کن
  if (result.strengths.length === 0 && result.warnings.length === 0) {
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
// تابع نمایش زیبای جیسان برای دیباگ
// ============================================
const prettyPrintJSON = (obj, label = 'JSON') => {
  console.log(`📋 ${label}:`);
  console.log(JSON.stringify(obj, null, 2));
  return obj;
};

// ============================================
// خروجی‌های ماژول
// ============================================
export {
  processAIResponse,
  processStreamText,
  generateStandardPriceWarning,
  translateEmotion,
  emotionMap,
  prettyPrintJSON,
};