// frontend/src/components/TradeEditForm.js

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import RealApiService from '../services/realApiService';
import './TradeForm.css';

const TradeEditForm = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [tradeData, setTradeData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [errors, setErrors] = useState([]);

  // لیست کامل نمادها
  const symbols = [
    'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD',
    'EURGBP', 'EURJPY', 'GBPJPY', 'AUDJPY', 'CADJPY', 'CHFJPY', 'NZDJPY',
    'EURAUD', 'EURCHF', 'GBPAUD', 'GBPCAD', 'AUDCHF', 'AUDCAD',
    'GBPCHF', 'GBPNZD', 'EURNZD', 'AUDNZD', 'NZDCAD', 'NZDCHF',
    'USDHKD', 'USDSGD', 'USDSEK', 'USDNOK', 'USDDKK', 'USDZAR',
    'EURSEK', 'EURNOK', 'GBPSEK', 'AUDSEK', 'CHFNOK', 'JPYSEK',
    'NAS100', 'SPX500', 'DAX40', 'UK100', 'CAC40', 'STOXX50', 'AUS200',
    'JPN225', 'US30', 'US500', 'US100', 'HKG50', 'CHN50', 'IND50',
    'SGP30', 'BRA50', 'RUS50', 'SAU30', 'UAE20', 'TUR30',
    'XAUUSD', 'XAGUSD', 'USOIL', 'UKOIL', 'XPDUSD', 'XPTUSD',
    'BTCUSD', 'ETHUSD', 'USDTUSD', 'BNBUSD', 'SOLUSD', 'ADAUSD',
    'XRPUSD', 'DOTUSD', 'DOGEUSD', 'AVAXUSD', 'MATICUSD', 'LINKUSD',
    'UNIUSD', 'ATOMUSD', 'LTCUSD', 'BCHUSD', 'NEARUSD', 'FILUSD',
    'APTUSD', 'ARBUSD', 'OPUSD', 'SUIUSD', 'SEIUSD', 'INJUSD',
    'RUNEUSD', 'AAVEUSD', 'MKRUSD', 'COMPUSD', 'CRVUSD', 'CVXUSD',
    'STXUSD', 'GRTUSD', 'ALGOUSD', 'VETUSD', 'ICPUSD', 'RNDRUSD',
    'IMXUSD', 'EOSUSD', 'THETAUSD', 'FTMUSD', 'XLMUSD', 'HBARUSD',
    'QNTUSD', 'EGLDUSD', 'KASUSD', 'TIAUSD', 'JUPUSD', 'ONDOUSD'
  ];

  const symbolGroups = {
    'فارکس': symbols.filter(s => ['EURUSD','GBPUSD','USDJPY','AUDUSD','USDCAD','USDCHF','NZDUSD',
      'EURGBP','EURJPY','GBPJPY','AUDJPY','CADJPY','CHFJPY','NZDJPY',
      'EURAUD','EURCHF','GBPAUD','GBPCAD','AUDCHF','AUDCAD',
      'GBPCHF','GBPNZD','EURNZD','AUDNZD','NZDCAD','NZDCHF',
      'USDHKD','USDSGD','USDSEK','USDNOK','USDDKK','USDZAR',
      'EURSEK','EURNOK','GBPSEK','AUDSEK','CHFNOK','JPYSEK'].includes(s)),
    'شاخص‌ها': symbols.filter(s => ['NAS100','SPX500','DAX40','UK100','CAC40','STOXX50','AUS200',
      'JPN225','US30','US500','US100','HKG50','CHN50','IND50',
      'SGP30','BRA50','RUS50','SAU30','UAE20','TUR30'].includes(s)),
    'کالاها': symbols.filter(s => ['XAUUSD','XAGUSD','USOIL','UKOIL','XPDUSD','XPTUSD',
      'XCUUSD','XALUSD','XZNUSD','XNIUSD','XPBUSD','XSNUSD',
      'CORN','WHEAT','SOYBN','COFFEE','SUGAR','COTTON',
      'COCOA','ORANGE','LUMBER'].includes(s)),
    'کریپتو': symbols.filter(s => ['BTCUSD','ETHUSD','USDTUSD','BNBUSD','SOLUSD','ADAUSD',
      'XRPUSD','DOTUSD','DOGEUSD','AVAXUSD','MATICUSD','LINKUSD',
      'UNIUSD','ATOMUSD','LTCUSD','BCHUSD','NEARUSD','FILUSD',
      'APTUSD','ARBUSD','OPUSD','SUIUSD','SEIUSD','INJUSD',
      'RUNEUSD','AAVEUSD','MKRUSD','COMPUSD','CRVUSD','CVXUSD',
      'STXUSD','GRTUSD','ALGOUSD','VETUSD','ICPUSD','RNDRUSD',
      'IMXUSD','EOSUSD','THETAUSD','FTMUSD','XLMUSD','HBARUSD',
      'QNTUSD','EGLDUSD','KASUSD','TIAUSD','JUPUSD','ONDOUSD'].includes(s))
  };

  // ============================================
  // دریافت دسته‌بندی‌های کاربر از دیتابیس
  // ============================================
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await RealApiService.getTradeGroups();
        const groupsData = response.data.results || response.data || [];
        const userGroups = groupsData.filter(g => g.user_id === user?.id);
        setCategories(userGroups);
        console.log('📁 Categories loaded:', userGroups);
      } catch (error) {
        console.error('Error loading categories:', error);
        setCategories([]);
      }
    };

    loadCategories();
  }, [user]);

  // ============================================
  // بارگذاری داده‌های ترید
  // ============================================
  useEffect(() => {
    const loadTrade = async () => {
      setLoading(true);
      try {
        const response = await RealApiService.getTrade(id);
        console.log('📊 Trade loaded:', response.data);

        // ✅ اطمینان از اینکه group_id به درستی تنظیم شده است
        const trade = response.data;

        // اگر group_id وجود ندارد اما group وجود دارد، از group استفاده کن
        if (!trade.group_id && trade.group) {
          trade.group_id = trade.group;
        }

        setTradeData(trade);
        console.log('📊 Trade group_id:', trade.group_id);
        console.log('📊 Trade group:', trade.group);

      } catch (error) {
        console.error('Error loading trade:', error);
        showToast('❌ خطا در دریافت اطلاعات ترید', 'error');
        navigate('/trades');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadTrade();
    } else {
      navigate('/trades');
    }
  }, [id, navigate, showToast]);

  // ============================================
  // تغییرات فرم
  // ============================================
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'symbol') {
      setTradeData(prev => ({ ...prev, [name]: value.toUpperCase() }));
    } else if (name === 'group_id') {
      console.log('📁 Group selected:', value);
      setTradeData(prev => ({ ...prev, [name]: parseInt(value) || value }));
    } else {
      setTradeData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }
    setErrors(prev => prev.filter(err => !err.includes(name)));
  };

  // ============================================
  // اعتبارسنجی
  // ============================================
  const validateForm = () => {
    const validationErrors = [];
    if (!tradeData.symbol) validationErrors.push('لطفاً نماد معاملاتی را انتخاب کنید');
    if (!tradeData.trade_date) validationErrors.push('لطفاً تاریخ معامله را وارد کنید');
    if (!tradeData.trade_type) validationErrors.push('لطفاً نوع ترید را انتخاب کنید');
    if (!tradeData.group_id) validationErrors.push('لطفاً دسته‌بندی را انتخاب کنید');
    if (!tradeData.entry_price || parseFloat(tradeData.entry_price) <= 0) validationErrors.push('لطفاً قیمت ورود را وارد کنید');
    if (!tradeData.close_price || parseFloat(tradeData.close_price) <= 0) validationErrors.push('لطفاً قیمت خروج را وارد کنید');
    if (tradeData.profit && isNaN(parseFloat(tradeData.profit))) validationErrors.push('مقدار سود/زیان باید عدد باشد');
    if (tradeData.execution_quality_score) {
      const score = parseInt(tradeData.execution_quality_score);
      if (isNaN(score) || score < 1 || score > 10) validationErrors.push('امتیاز کیفیت اجرا باید بین ۱ تا ۱۰ باشد');
    }
    if (tradeData.risk_reward_ratio && parseFloat(tradeData.risk_reward_ratio) <= 0) validationErrors.push('نسبت ریسک به ریوارد باید بزرگتر از صفر باشد');
    setErrors(validationErrors);
    return validationErrors.length === 0;
  };

  // ============================================
  // ذخیره تغییرات
  // ============================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      alert('❌ لطفاً خطاهای زیر را اصلاح کنید:\n\n' + errors.map((e, i) => `${i+1}. ${e}`).join('\n'));
      return;
    }

    setSaving(true);
    try {
      const date = new Date(tradeData.trade_date);
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      tradeData.day_of_week = days[date.getDay()];
      tradeData.month = date.getMonth() + 1;

      // اطمینان از اینکه group_id عدد است
      const submitData = {
        ...tradeData,
        group_id: parseInt(tradeData.group_id)
      };

      console.log('📤 Submitting trade data:', submitData);
      await RealApiService.updateTrade(id, submitData);

      showToast('✅ ترید با موفقیت ویرایش شد!', 'success');

      const fromDashboard = localStorage.getItem('returnToDashboard') === 'true';

      if (fromDashboard) {
        localStorage.removeItem('returnToDashboard');
        navigate('/dashboard');
      } else {
        navigate('/trades');
      }
    } catch (error) {
      console.error('Error updating trade:', error);
      showToast('❌ خطا در ذخیره تغییرات', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // بازگشت به صفحه مناسب
  // ============================================
  const handleBack = () => {
    const fromDashboard = localStorage.getItem('returnToDashboard') === 'true';
    if (fromDashboard) {
      localStorage.removeItem('returnToDashboard');
      navigate('/dashboard');
    } else {
      navigate('/trades');
    }
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 8));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  // ============================================
  // Step 2: جلسه و نماد (با انتخاب دسته‌بندی)
  // ============================================
  const renderStep2 = () => (
    <div className="form-step">
      <h3>📈 جلسه و نماد</h3>
      <div className="form-row">
        <div className="form-group">
          <label>نماد معاملاتی</label>
          <select name="symbol" value={tradeData.symbol || ''} onChange={handleChange} required>
            <option value="">انتخاب نماد</option>
            {Object.entries(symbolGroups).map(([group, items]) => (
              <optgroup key={group} label={group}>
                {items.map(s => <option key={s} value={s}>{s}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>نوع ترید</label>
          <select name="trade_type" value={tradeData.trade_type || 'Buy'} onChange={handleChange}>
            <option value="Buy">خرید (Buy)</option><option value="Sell">فروش (Sell)</option>
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>نوع جلسه</label>
          <select name="session_type" value={tradeData.session_type || 'High Pro'} onChange={handleChange}>
            <option value="High Pro">حرفه‌ای (High Pro)</option><option value="Low Pro">مبتدی (Low Pro)</option>
          </select>
        </div>
        <div className="form-group">
          <label>دسته‌بندی <span className="required">*</span></label>
          <select
            name="group_id"
            value={tradeData.group_id || ''}
            onChange={handleChange}
            required
          >
            <option value="">انتخاب دسته‌بندی</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.icon || '📁'} {cat.group_name}
              </option>
            ))}
          </select>
          {!tradeData.group_id && (
            <span className="field-error">لطفاً یک دسته‌بندی انتخاب کنید</span>
          )}
        </div>
      </div>
      <div className="form-group">
        <label>یادداشت پروفایل هفتگی</label>
        <textarea name="weekly_profile_note" value={tradeData.weekly_profile_note || ''} onChange={handleChange} placeholder="توضیحات مربوط به پروفایل هفتگی..." rows="2" />
      </div>
    </div>
  );

  // ============================================
  // Step 1: شناسه و تاریخ
  // ============================================
  const renderStep1 = () => (
    <div className="form-step">
      <h3>📅 شناسه و تاریخ</h3>
      <div className="form-row">
        <div className="form-group">
          <label>تاریخ معامله</label>
          <input type="date" name="trade_date" value={tradeData.trade_date || ''} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>ساعت به وقت نیویورک</label>
          <input type="time" name="time_ny" value={tradeData.time_ny || ''} onChange={handleChange} />
        </div>
      </div>
    </div>
  );

  // ============================================
  // Step 3: وضعیت روحی و ذهنی
  // ============================================
  const renderStep3 = () => {
    const emotions = [
      { key: 'focus', label: 'تمرکز' }, { key: 'calm', label: 'آرامش' }, { key: 'excited', label: 'هیجان' },
      { key: 'fear', label: 'ترس' }, { key: 'greed', label: 'طمع' }, { key: 'relaxed', label: 'ریلکس' },
      { key: 'happy', label: 'خوشحال' }, { key: 'sad', label: 'غمگین' }, { key: 'energetic', label: 'پرانرژی' },
      { key: 'tired', label: 'خسته' }, { key: 'fomo', label: 'FOMO' }, { key: 'patience', label: 'صبر' },
      { key: 'contentment', label: 'قناعت' }
    ];
    return (
      <div className="form-step">
        <h3>🧠 وضعیت روحی و ذهنی</h3>
        <div className="form-row">
          <div className="form-group">
            <label>کیفیت خواب</label>
            <select name="sleep_quality" value={tradeData.sleep_quality || 'خوب'} onChange={handleChange}>
              <option value="خوب">خوب</option><option value="متوسط">متوسط</option><option value="بد">بد</option>
            </select>
          </div>
          <div className="form-group">
            <label>تغذیه مناسب</label>
            <div className="checkbox-group">
              <input type="checkbox" name="food_status" checked={tradeData.food_status || false} onChange={handleChange} />
              <label>آیا تغذیه مناسب داشتید؟</label>
            </div>
          </div>
        </div>
        <div className="emotions-grid">
          {emotions.map(emotion => (
            <div key={emotion.key} className="checkbox-group">
              <input type="checkbox" name={emotion.key} checked={tradeData[emotion.key] || false} onChange={handleChange} />
              <label>{emotion.label}</label>
            </div>
          ))}
        </div>
        <div className="form-group">
          <label>احساس غالب</label>
          <input type="text" name="dominant_feeling" value={tradeData.dominant_feeling || ''} onChange={handleChange} placeholder="مثلاً: آرامش، استرس، هیجان..." />
        </div>
      </div>
    );
  };

  // ============================================
  // Step 4: برنامه و بایاس
  // ============================================
  const renderStep4 = () => {
    const timeframes = [
      { key: 'timeframe_d', label: 'D1' }, { key: 'timeframe_h4', label: 'H4' },
      { key: 'timeframe_h1', label: 'H1' }, { key: 'timeframe_m15', label: 'M15' },
      { key: 'timeframe_m5', label: 'M5' }, { key: 'timeframe_m1', label: 'M1' }
    ];
    const checklistItems = [
      { key: 'weekly_news_printed', label: 'اخبار هفتگی چاپ شد' },
      { key: 'zero_hour_identified', label: 'ساعت صفر مشخص شد' },
      { key: 'asian_range_identified', label: 'رنج آسیا مشخص شد' },
      { key: 'london_range_identified', label: 'رنج لندن مشخص شد' },
      { key: 'judas_lo_identified', label: 'Judas LO مشخص شد' },
      { key: 'key_levels_reviewed', label: 'سطوح کلیدی بررسی شد' },
      { key: 'smt_confirmed', label: 'SMT تایید شد (NO SMT = NO Trade)' },
      { key: 'bond_dxy_support', label: 'حمایت BOND/DXY تایید شد' }
    ];
    return (
      <div className="form-step">
        <h3>📋 برنامه و بایاس روزانه</h3>
        <div className="form-row">
          <div className="form-group">
            <label>جهت‌گیری کلی</label>
            <select name="bias" value={tradeData.bias || 'Neutral'} onChange={handleChange}>
              <option value="Bullish">صعودی (Bullish)</option><option value="Bearish">نزولی (Bearish)</option><option value="Neutral">خنثی (Neutral)</option>
            </select>
          </div>
          <div className="form-group">
            <label>نوع استراتژی</label>
            <select name="strategy_type" value={tradeData.strategy_type || 'LTP'} onChange={handleChange}>
              <option value="LTP">LTP</option><option value="ITP">ITP</option><option value="STP">STP</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>تایم‌فریم‌های استفاده شده</label>
          <div className="checkbox-grid">
            {timeframes.map(tf => (
              <div key={tf.key} className="checkbox-group">
                <input type="checkbox" name={tf.key} checked={tradeData[tf.key] || false} onChange={handleChange} />
                <label>{tf.label}</label>
              </div>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label>مدل ورودی</label>
          <input type="text" name="retirement_model" value={tradeData.retirement_model || ''} onChange={handleChange} placeholder="مثلاً: ERL TO IRL" />
        </div>
        <div className="form-group">
          <label>چک‌لیست روزانه</label>
          <div className="checkbox-grid">
            {checklistItems.map(item => (
              <div key={item.key} className="checkbox-group">
                <input type="checkbox" name={item.key} checked={tradeData[item.key] || false} onChange={handleChange} />
                <label>{item.label}</label>
              </div>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label>توضیحات تکمیلی چک‌لیست</label>
          <textarea name="checklist_extra" value={tradeData.checklist_extra || ''} onChange={handleChange} placeholder="توضیحات اضافی..." rows="2" />
        </div>
      </div>
    );
  };

  // ============================================
  // Step 5: جزئیات اجرا
  // ============================================
  const renderStep5 = () => (
    <div className="form-step">
      <h3>💰 جزئیات اجرای معامله</h3>
      <div className="form-row">
        <div className="form-group"><label>قیمت ورود</label><input type="number" name="entry_price" value={tradeData.entry_price || ''} onChange={handleChange} step="0.00001" placeholder="0.00000" /></div>
        <div className="form-group"><label>حد ضرر (SL)</label><input type="number" name="stop_loss" value={tradeData.stop_loss || ''} onChange={handleChange} step="0.00001" placeholder="0.00000" /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label>حد سود اول (TP1)</label><input type="number" name="take_profit_1" value={tradeData.take_profit_1 || ''} onChange={handleChange} step="0.00001" placeholder="0.00000" /></div>
        <div className="form-group"><label>حد سود دوم (TP2)</label><input type="number" name="take_profit_2" value={tradeData.take_profit_2 || ''} onChange={handleChange} step="0.00001" placeholder="0.00000" /></div>
      </div>
      <div className="form-group"><label>حد سود سوم (TP3)</label><input type="number" name="take_profit_3" value={tradeData.take_profit_3 || ''} onChange={handleChange} step="0.00001" placeholder="0.00000" /></div>
      <div className="form-row">
        <div className="form-group"><label>مقدار ریسک به دلار</label><input type="number" name="risk_usd" value={tradeData.risk_usd || ''} onChange={handleChange} step="0.01" placeholder="0.00" /></div>
        <div className="form-group"><label>درصد ریسک از کل سرمایه</label><input type="number" name="risk_percent" value={tradeData.risk_percent || ''} onChange={handleChange} step="0.01" placeholder="0.00" /></div>
      </div>
      <div className="form-group"><label>نسبت ریسک به ریوارد (R:R)</label><input type="number" name="risk_reward_ratio" value={tradeData.risk_reward_ratio || ''} onChange={handleChange} step="0.01" placeholder="مثلاً 2.0" /></div>
    </div>
  );

  // ============================================
  // Step 6: نتیجه معامله
  // ============================================
  const renderStep6 = () => (
    <div className="form-step">
      <h3>📊 نتیجه معامله</h3>
      <div className="form-row">
        <div className="form-group"><label>قیمت بسته‌شدن</label><input type="number" name="close_price" value={tradeData.close_price || ''} onChange={handleChange} step="0.00001" placeholder="0.00000" /></div>
        <div className="form-group"><label>حد خورده شده</label><select name="tp_sl_hit" value={tradeData.tp_sl_hit || ''} onChange={handleChange}><option value="">انتخاب کنید</option><option value="TP1">TP1</option><option value="TP2">TP2</option><option value="TP3">TP3</option><option value="SL">SL</option><option value="BE">BE</option></select></div>
      </div>
      <div className="form-group"><label>سود یا زیان نهایی (دلار)</label><input type="number" name="profit" value={tradeData.profit || ''} onChange={handleChange} step="0.01" placeholder="0.00" /></div>
    </div>
  );

  // ============================================
  // Step 7: احساسات و بازبینی
  // ============================================
  const renderStep7 = () => (
    <div className="form-step">
      <h3>🔄 احساسات و بازبینی</h3>
      <div className="form-row">
        <div className="form-group"><label>استرس قبل معامله</label><select name="pre_trade_stress" value={tradeData.pre_trade_stress || 'متوسط'} onChange={handleChange}><option value="کم">کم</option><option value="متوسط">متوسط</option><option value="زیاد">زیاد</option></select></div>
        <div className="form-group"><label>کنترل هیجان هنگام ورود</label><select name="entry_emotion_control" value={tradeData.entry_emotion_control || 'متوسط'} onChange={handleChange}><option value="بله">بله</option><option value="خیر">خیر</option><option value="متوسط">متوسط</option></select></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label>واکنش به سود</label><input type="text" name="reaction_to_profit" value={tradeData.reaction_to_profit || ''} onChange={handleChange} placeholder="مثلاً: محتاطانه، شتابزده..." /></div>
        <div className="form-group"><label>مدیریت انتظار</label><select name="expectation_management" value={tradeData.expectation_management || 'متوسط'} onChange={handleChange}><option value="ضعیف">ضعیف</option><option value="متوسط">متوسط</option><option value="خوب">خوب</option></select></div>
      </div>
      <div className="form-group"><label>کنترل احساسات پس از ضرر</label><textarea name="emotion_after_losses" value={tradeData.emotion_after_losses || ''} onChange={handleChange} placeholder="اگر ضرر قبلی در روز داشتید، کنترل احساسات چگونه بود؟" rows="2" /></div>
      <div className="form-row">
        <div className="form-group"><label>کد اشتباه</label><input type="text" name="mistake_code" value={tradeData.mistake_code || ''} onChange={handleChange} placeholder="مثلاً: ورود زودهنگام" /></div>
        <div className="form-group"><label>وزن اشتباه (0.1 تا 0.9)</label><input type="number" name="mistake_weight" value={tradeData.mistake_weight || ''} onChange={handleChange} step="0.1" min="0.1" max="0.9" placeholder="0.5" /></div>
      </div>
      <div className="form-group"><label>امتیاز کیفیت اجرا (۱-۱۰)</label><input type="number" name="execution_quality_score" value={tradeData.execution_quality_score || 5} onChange={handleChange} min="1" max="10" placeholder="5" /></div>
      <div className="checkbox-grid">
        <div className="checkbox-group"><input type="checkbox" name="stop_loss_adherence" checked={tradeData.stop_loss_adherence || false} onChange={handleChange} /><label>پایبندی به حد ضرر</label></div>
        <div className="checkbox-group"><input type="checkbox" name="strategy_adherence" checked={tradeData.strategy_adherence || false} onChange={handleChange} /><label>پایبندی به استراتژی</label></div>
        <div className="checkbox-group"><input type="checkbox" name="capital_management_adherence" checked={tradeData.capital_management_adherence || false} onChange={handleChange} /><label>پایبندی به مدیریت سرمایه</label></div>
        <div className="checkbox-group"><input type="checkbox" name="over_trade" checked={tradeData.over_trade || false} onChange={handleChange} /><label>اورترید محسوب می‌شود</label></div>
        <div className="checkbox-group"><input type="checkbox" name="post_trade_scan" checked={tradeData.post_trade_scan || false} onChange={handleChange} /><label>اسکن پس از معامله انجام شد</label></div>
        <div className="checkbox-group"><input type="checkbox" name="entry_reason_written" checked={tradeData.entry_reason_written || false} onChange={handleChange} /><label>دلیل ورود یادداشت شد</label></div>
        <div className="checkbox-group"><input type="checkbox" name="exit_reason_written" checked={tradeData.exit_reason_written || false} onChange={handleChange} /><label>دلیل خروج یادداشت شد</label></div>
        <div className="checkbox-group"><input type="checkbox" name="mistakes_recorded" checked={tradeData.mistakes_recorded || false} onChange={handleChange} /><label>اشتباهات ثبت شد</label></div>
      </div>
    </div>
  );

  // ============================================
  // Step 8: تحلیل ICT
  // ============================================
  const renderICTStep = () => (
    <div className="form-step">
      <h3>📊 تحلیل ICT</h3>
      <div className="form-row">
        <div className="form-group"><label>FVG (Fair Value Gap)</label><input type="text" name="fvg" value={tradeData.fvg || ''} onChange={handleChange} placeholder="مثلاً: FVG خرید" /></div>
        <div className="form-group"><label>Order Block</label><input type="text" name="order_block" value={tradeData.order_block || ''} onChange={handleChange} placeholder="مثلاً: OB فروش" /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label>BOS (Break of Structure)</label><input type="text" name="bos" value={tradeData.bos || ''} onChange={handleChange} placeholder="مثلاً: BOS صعودی" /></div>
        <div className="form-group"><label>CHOCH (Change of Character)</label><input type="text" name="choch" value={tradeData.choch || ''} onChange={handleChange} placeholder="مثلاً: CHOCH نزولی" /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label>MSS (Market Structure Shift)</label><input type="text" name="mss" value={tradeData.mss || ''} onChange={handleChange} placeholder="مثلاً: MSS تایید شده" /></div>
        <div className="form-group"><label>Liquidity Sweep</label><input type="text" name="liquidity_sweep" value={tradeData.liquidity_sweep || ''} onChange={handleChange} placeholder="مثلاً: Sweep High" /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label>POI (Point of Interest)</label><input type="text" name="poi" value={tradeData.poi || ''} onChange={handleChange} placeholder="مثلاً: POI ورود" /></div>
        <div className="form-group"><label>Demand Zone</label><input type="text" name="demand_zone" value={tradeData.demand_zone || ''} onChange={handleChange} placeholder="مثلاً: 1.0850-1.0870" /></div>
      </div>
      <div className="form-group"><label>Supply Zone</label><input type="text" name="supply_zone" value={tradeData.supply_zone || ''} onChange={handleChange} placeholder="مثلاً: 1.0920-1.0940" /></div>
    </div>
  );

  // ============================================
  // رندر بر اساس مرحله
  // ============================================
  const renderStep = () => {
    switch(currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      case 6: return renderStep6();
      case 7: return renderStep7();
      case 8: return renderICTStep();
      default: return null;
    }
  };

  if (loading) {
    return <div className="loading-spinner">⏳ در حال بارگذاری...</div>;
  }

  if (!tradeData) {
    return <div className="error-message">❌ ترید یافت نشد</div>;
  }

  return (
    <div className={`trade-form-container ${isDark ? 'dark' : 'light'}`}>
      <div className="trade-form-header">
        <h2>✏️ ویرایش ترید</h2>
        <button className="btn-back" onClick={handleBack}>↩️ بازگشت</button>
      </div>

      {errors.length > 0 && (
        <div className="validation-errors">
          <span className="error-icon">⚠️</span>
          <span className="error-count">{errors.length} خطا</span>
          <button className="error-toggle" onClick={() => alert('❌ لطفاً خطاهای زیر را اصلاح کنید:\n\n' + errors.map((e, i) => `${i+1}. ${e}`).join('\n'))}>مشاهده</button>
        </div>
      )}

      <div className="step-indicator">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(step => (
          <div key={step} className={`step-dot ${step <= currentStep ? 'active' : ''} ${step === currentStep ? 'current' : ''}`} onClick={() => setCurrentStep(step)}>{step}</div>
        ))}
      </div>

      <div className="step-labels">
        <span>تاریخ</span><span>نماد</span><span>روحی</span><span>برنامه</span><span>اجرا</span><span>نتیجه</span><span>بازبینی</span><span>ICT</span>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-content">{renderStep()}</div>

        <div className="form-actions">
          {currentStep > 1 && (
            <button type="button" className="btn-prev" onClick={prevStep} disabled={saving}>← قبلی</button>
          )}
          {currentStep < 8 && (
            <button type="button" className="btn-next" onClick={nextStep} disabled={saving}>بعدی →</button>
          )}
          {currentStep === 8 && (
            <button type="submit" className="btn-submit" disabled={saving}>
              {saving ? '⏳ در حال ذخیره...' : '💾 ذخیره تغییرات'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default TradeEditForm;