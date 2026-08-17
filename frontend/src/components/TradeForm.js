// frontend/src/components/TradeForm.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import RealApiService from '../services/realApiService';
import RuleService from '../services/ruleService';
import SystemSettingsService from '../services/systemSettingsService';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { usePortfolio } from '../contexts/PortfolioContext';
import ImageZoom from './ImageZoom';
import './TradeForm.css';

const TradeForm = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { portfolios, loadPortfolios } = usePortfolio();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [errors, setErrors] = useState([]);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [showLimitWarning, setShowLimitWarning] = useState(false);

  const [rules, setRules] = useState([]);
  const [checkedRules, setCheckedRules] = useState([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [screenshotFile, setScreenshotFile] = useState(null);

  // تنظیمات آپلود تصویر
  const [screenshotSettings, setScreenshotSettings] = useState({
    show_upload: true,
    max_size_mb: 5,
    max_width: 2000,
    max_height: 2000,
  });

  // ===== تبدیل فایل به Base64 =====
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

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

  const [formData, setFormData] = useState({
    trade_date: new Date().toISOString().split('T')[0],
    day_of_week: '',
    month: new Date().getMonth() + 1,
    time_ny: '',
    symbol: '',
    trade_type: 'Buy',
    session_type: 'High Pro',
    weekly_profile_note: '',
    group_id: '',
    portfolio_id: '',
    sleep_quality: 'خوب',
    food_status: false,
    focus: false,
    calm: false,
    excited: false,
    fear: false,
    greed: false,
    relaxed: false,
    happy: false,
    sad: false,
    energetic: false,
    tired: false,
    fomo: false,
    patience: false,
    contentment: false,
    dominant_feeling: '',
    bias: 'Neutral',
    strategy_type: 'LTP',
    timeframe_d: false,
    timeframe_h4: false,
    timeframe_h1: false,
    timeframe_m15: false,
    timeframe_m5: false,
    timeframe_m1: false,
    retirement_model: '',
    weekly_news_printed: false,
    zero_hour_identified: false,
    asian_range_identified: false,
    london_range_identified: false,
    judas_lo_identified: false,
    key_levels_reviewed: false,
    smt_confirmed: false,
    bond_dxy_support: false,
    checklist_extra: '',
    entry_price: '',
    stop_loss: '',
    take_profit_1: '',
    take_profit_2: '',
    take_profit_3: '',
    risk_usd: '',
    risk_percent: '',
    risk_reward_ratio: '',
    close_price: '',
    tp_sl_hit: '',
    profit: '',
    pre_trade_stress: 'متوسط',
    entry_emotion_control: 'متوسط',
    reaction_to_profit: '',
    stop_loss_adherence: false,
    expectation_management: 'متوسط',
    strategy_adherence: false,
    capital_management_adherence: false,
    over_trade: false,
    emotion_after_losses: '',
    mistake_code: '',
    mistake_weight: '',
    post_trade_scan: false,
    entry_reason_written: false,
    exit_reason_written: false,
    mistakes_recorded: false,
    execution_quality_score: 5,
    fvg: '',
    order_block: '',
    bos: '',
    choch: '',
    mss: '',
    liquidity_sweep: '',
    poi: '',
    demand_zone: '',
    supply_zone: '',
  });

  // ===== useEffect ها =====
  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const response = await RealApiService.getSubscriptionStatus();
        const data = response.data;
        setSubscriptionStatus(data);
        if (user?.is_admin) {
          setShowLimitWarning(false);
          return;
        }
        if (data.is_trade_limit_reached) {
          setShowLimitWarning(true);
          showToast(`⚠️ محدودیت ترید شما به پایان رسیده است. (${data.trades_limit} ترید)`, 'warning');
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
      }
    };
    checkSubscription();
  }, [user, showToast]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await RealApiService.getTradeGroups();
        const groupsData = response.data.results || response.data || [];
        const userGroups = groupsData.filter(g => g.user_id === user?.id);
        setCategories(userGroups);
      } catch (error) {
        console.error('Error loading categories:', error);
        setCategories([]);
      }
    };
    loadCategories();
  }, [user]);

  useEffect(() => {
    const loadRules = async () => {
      setRulesLoading(true);
      try {
        const response = await RuleService.getRules();
        if (response.success && response.data) {
          setRules(response.data);
          setCheckedRules(response.data.map(r => ({ id: r.id, checked: false })));
        }
      } catch (error) {
        console.error('Error loading rules:', error);
      } finally {
        setRulesLoading(false);
      }
    };
    loadRules();
  }, []);

  useEffect(() => {
    const loadScreenshotSettings = async () => {
      const settings = await SystemSettingsService.getScreenshotSettings();
      setScreenshotSettings(settings);
    };
    loadScreenshotSettings();
  }, []);

  // ===== بررسی وجود پورتفولیو =====
  useEffect(() => {
    if (!loading && portfolios.length === 0) {
      showToast('⚠️ لطفاً ابتدا یک پورتفولیو بسازید.', 'warning');
    }
  }, [portfolios, loading, showToast]);

  // ===== تنظیم پورتفولیو پیش‌فرض =====
  useEffect(() => {
    if (portfolios.length > 0 && !formData.portfolio_id) {
      const defaultPortfolio = portfolios.find(p => p.is_default) || portfolios[0];
      setFormData(prev => ({
        ...prev,
        portfolio_id: defaultPortfolio.id
      }));
    }
  }, [portfolios]);

  // ===== توابع تغییرات =====
  const handleRuleCheck = (ruleId) => {
    setCheckedRules(prev =>
      prev.map(item =>
        item.id === ruleId ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'symbol') {
      setFormData(prev => ({ ...prev, [name]: value.toUpperCase() }));
    } else {
      setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }
    setErrors(prev => prev.filter(err => !err.includes(name)));
  };

  // ===== تغییر فایل =====
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!screenshotSettings.show_upload) {
      showToast('❌ امکان آپلود تصویر غیرفعال است.', 'warning');
      e.target.value = '';
      return;
    }

    const maxSizeMB = screenshotSettings.max_size_mb || 5;
    if (file.size > maxSizeMB * 1024 * 1024) {
      showToast(`❌ حجم فایل نباید بیشتر از ${maxSizeMB} مگابایت باشد.`, 'error');
      e.target.value = '';
      return;
    }

    try {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const maxW = screenshotSettings.max_width || 2000;
      const maxH = screenshotSettings.max_height || 2000;

      if (img.width > maxW || img.height > maxH) {
        showToast(`❌ ابعاد تصویر باید کمتر از ${maxW}x${maxH} پیکسل باشد.`, 'error');
        e.target.value = '';
        URL.revokeObjectURL(objectUrl);
        return;
      }
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Error checking image dimensions:', error);
    }

    try {
      const base64 = await fileToBase64(file);
      setScreenshotFile(base64);
      console.log('📸 File converted to Base64, length:', base64.length);
    } catch (error) {
      console.error('❌ Error converting file to Base64:', error);
      showToast('❌ خطا در خواندن فایل', 'error');
    }
  };

  // ===== اعتبارسنجی =====
  const validateForm = () => {
    const validationErrors = [];
    if (!formData.symbol) validationErrors.push('لطفاً نماد معاملاتی را انتخاب کنید');
    if (!formData.trade_date) validationErrors.push('لطفاً تاریخ معامله را وارد کنید');
    if (!formData.trade_type) validationErrors.push('لطفاً نوع ترید را انتخاب کنید');
    if (!formData.group_id) validationErrors.push('لطفاً دسته‌بندی را انتخاب کنید');
    if (!formData.entry_price || parseFloat(formData.entry_price) <= 0) {
      validationErrors.push('لطفاً قیمت ورود را وارد کنید');
    }
    if (!formData.close_price || parseFloat(formData.close_price) <= 0) {
      validationErrors.push('لطفاً قیمت خروج را وارد کنید');
    }
    if (formData.profit && isNaN(parseFloat(formData.profit))) {
      validationErrors.push('مقدار سود/زیان باید عدد باشد');
    }
    if (formData.execution_quality_score) {
      const score = parseInt(formData.execution_quality_score);
      if (isNaN(score) || score < 1 || score > 10) {
        validationErrors.push('امتیاز کیفیت اجرا باید بین ۱ تا ۱۰ باشد');
      }
    }
    if (formData.risk_reward_ratio && parseFloat(formData.risk_reward_ratio) <= 0) {
      validationErrors.push('نسبت ریسک به ریوارد باید بزرگتر از صفر باشد');
    }
    if (formData.risk_percent) {
      const percent = parseFloat(formData.risk_percent);
      if (isNaN(percent) || percent < 0 || percent > 100) {
        validationErrors.push('درصد ریسک باید بین ۰ تا ۱۰۰ باشد');
      }
    }
    setErrors(validationErrors);
    return validationErrors.length === 0;
  };

  // ===== ارسال فرم =====
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (showLimitWarning || subscriptionStatus?.is_trade_limit_reached) {
      showToast('❌ محدودیت ترید شما به پایان رسیده است. لطفاً اشتراک خود را تمدید کنید.', 'error');
      return;
    }

    setLoading(true);

    if (!validateForm()) {
      alert('❌ لطفاً خطاهای زیر را اصلاح کنید:\n\n' + errors.map((e, i) => `${i+1}. ${e}`).join('\n'));
      setLoading(false);
      return;
    }

    const date = new Date(formData.trade_date);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const day_of_week = days[date.getDay()];
    const month = date.getMonth() + 1;

    const ruleCheckIds = checkedRules.filter(r => r.checked).map(r => r.id);
    const groupId = parseInt(formData.group_id);

    // اگر پورتفولیو انتخاب نشده، از پیش‌فرض استفاده کن
    let portfolioId = formData.portfolio_id;
    if (!portfolioId && portfolios.length > 0) {
      const defaultPortfolio = portfolios.find(p => p.is_default) || portfolios[0];
      portfolioId = defaultPortfolio.id;
    }

    if (isNaN(groupId) || groupId <= 0) {
      alert('لطفاً یک دسته‌بندی معتبر انتخاب کنید.');
      setLoading(false);
      return;
    }

    const payload = {
      ...formData,
      group: groupId,
      group_id: groupId,
      portfolio: portfolioId,
      day_of_week: day_of_week,
      month: month,
      rule_checks: ruleCheckIds,
    };

    if (screenshotFile) {
      payload.screenshot = screenshotFile;
      console.log('✅ Screenshot added to payload, length:', screenshotFile.length);
    } else {
      console.warn('⚠️ No screenshot file');
      delete payload.screenshot;
    }

    const optionalFields = [
      'time_ny', 'stop_loss', 'take_profit_1', 'take_profit_2', 'take_profit_3',
      'risk_usd', 'risk_percent', 'risk_reward_ratio', 'profit', 'tp_sl_hit',
      'mistake_weight', 'dominant_feeling', 'weekly_profile_note', 'retirement_model',
      'checklist_extra', 'reaction_to_profit', 'emotion_after_losses', 'mistake_code',
      'fvg', 'order_block', 'bos', 'choch', 'mss', 'liquidity_sweep', 'poi',
      'demand_zone', 'supply_zone'
    ];
    optionalFields.forEach(field => {
      if (payload[field] === undefined || payload[field] === null || payload[field] === '') {
        delete payload[field];
      }
    });

    console.log('📤 Full payload being sent:', JSON.stringify(payload, null, 2));

    try {
      await RealApiService.createTrade(payload);
      setLoading(false);
      showToast('✅ ترید با موفقیت ثبت شد!', 'success');
      navigate('/dashboard');
    } catch (error) {
      console.error('❌ Error creating trade:', error);
      if (error.response?.data?.limit) {
        showToast(error.response.data.limit, 'error');
        setShowLimitWarning(true);
      } else if (error.response?.data) {
        const errorMessages = Object.values(error.response.data).flat().join('\n');
        showToast(`❌ خطا: ${errorMessages}`, 'error');
      } else {
        showToast('❌ خطا در ثبت ترید', 'error');
      }
      setLoading(false);
    }
  };

  // ===== رندر مراحل =====
  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 10));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const renderStep1 = () => (
    <div className="form-step">
      <h3>📅 شناسه و تاریخ</h3>
      <div className="form-row">
        <div className="form-group">
          <label>تاریخ معامله <span style={{ color: 'red' }}>(اجباری)</span></label>
          <input type="date" name="trade_date" value={formData.trade_date} onChange={handleChange} required disabled={showLimitWarning} />
        </div>
        <div className="form-group">
          <label>ساعت به وقت نیویورک</label>
          <input type="time" name="time_ny" value={formData.time_ny} onChange={handleChange} disabled={showLimitWarning} />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="form-step">
      <h3>📈 جلسه و نماد</h3>
      <div className="form-row">
        <div className="form-group">
          <label>نماد معاملاتی <span style={{ color: 'red' }}>(اجباری)</span></label>
          <select name="symbol" value={formData.symbol} onChange={handleChange} required disabled={showLimitWarning}>
            <option value="">انتخاب نماد</option>
            {Object.entries(symbolGroups).map(([group, items]) => (
              <optgroup key={group} label={group}>
                {items.map(s => <option key={s} value={s}>{s}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>نوع ترید <span style={{ color: 'red' }}>(اجباری)</span></label>
          <select name="trade_type" value={formData.trade_type} onChange={handleChange} disabled={showLimitWarning}>
            <option value="Buy">خرید (Buy)</option><option value="Sell">فروش (Sell)</option>
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>نوع جلسه</label>
          <select name="session_type" value={formData.session_type} onChange={handleChange} disabled={showLimitWarning}>
            <option value="High Pro">حرفه‌ای (High Pro)</option><option value="Low Pro">مبتدی (Low Pro)</option>
          </select>
        </div>
        <div className="form-group">
          <label>دسته‌بندی <span style={{ color: 'red' }}>(اجباری)</span></label>
          <select name="group_id" value={formData.group_id} onChange={handleChange} required disabled={showLimitWarning}>
            <option value="">انتخاب دسته‌بندی</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.icon || '📁'} {cat.group_name}
              </option>
            ))}
          </select>
          {!formData.group_id && <span className="field-error">لطفاً یک دسته‌بندی انتخاب کنید</span>}
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>پورتفولیو</label>
          <select name="portfolio_id" value={formData.portfolio_id || ''} onChange={handleChange} disabled={showLimitWarning}>
            <option value="">بدون پورتفولیو</option>
            {portfolios.map(p => (
              <option key={p.id} value={p.id}>
                {p.icon || '📊'} {p.name} {p.is_default ? '(پیش‌فرض)' : ''}
              </option>
            ))}
          </select>
          <small className="hint-text">انتخاب پورتفولیو برای تفکیک آمار</small>
        </div>
        <div className="form-group">
          <label>یادداشت پروفایل هفتگی</label>
          <textarea name="weekly_profile_note" value={formData.weekly_profile_note} onChange={handleChange} placeholder="توضیحات مربوط به پروفایل هفتگی..." rows="2" disabled={showLimitWarning} />
        </div>
      </div>
    </div>
  );

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
            <select name="sleep_quality" value={formData.sleep_quality} onChange={handleChange} disabled={showLimitWarning}>
              <option value="خوب">خوب</option><option value="متوسط">متوسط</option><option value="بد">بد</option>
            </select>
          </div>
          <div className="form-group">
            <label>تغذیه مناسب</label>
            <div className="checkbox-group">
              <input type="checkbox" name="food_status" checked={formData.food_status} onChange={handleChange} disabled={showLimitWarning} />
              <label>آیا تغذیه مناسب داشتید؟</label>
            </div>
          </div>
        </div>
        <div className="emotions-grid">
          {emotions.map(emotion => (
            <div key={emotion.key} className="checkbox-group">
              <input type="checkbox" name={emotion.key} checked={formData[emotion.key]} onChange={handleChange} disabled={showLimitWarning} />
              <label>{emotion.label}</label>
            </div>
          ))}
        </div>
        <div className="form-group">
          <label>احساس غالب</label>
          <input type="text" name="dominant_feeling" value={formData.dominant_feeling} onChange={handleChange} placeholder="مثلاً: آرامش، استرس، هیجان..." disabled={showLimitWarning} />
        </div>
      </div>
    );
  };

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
            <select name="bias" value={formData.bias} onChange={handleChange} disabled={showLimitWarning}>
              <option value="Bullish">صعودی (Bullish)</option><option value="Bearish">نزولی (Bearish)</option><option value="Neutral">خنثی (Neutral)</option>
            </select>
          </div>
          <div className="form-group">
            <label>نوع استراتژی</label>
            <select name="strategy_type" value={formData.strategy_type} onChange={handleChange} disabled={showLimitWarning}>
              <option value="LTP">LTP</option><option value="ITP">ITP</option><option value="STP">STP</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>تایم‌فریم‌های استفاده شده</label>
          <div className="checkbox-grid">
            {timeframes.map(tf => (
              <div key={tf.key} className="checkbox-group">
                <input type="checkbox" name={tf.key} checked={formData[tf.key]} onChange={handleChange} disabled={showLimitWarning} />
                <label>{tf.label}</label>
              </div>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label>مدل ورودی</label>
          <input type="text" name="retirement_model" value={formData.retirement_model} onChange={handleChange} placeholder="مثلاً: ERL TO IRL" disabled={showLimitWarning} />
        </div>
        <div className="form-group">
          <label>چک‌لیست روزانه</label>
          <div className="checkbox-grid">
            {checklistItems.map(item => (
              <div key={item.key} className="checkbox-group">
                <input type="checkbox" name={item.key} checked={formData[item.key]} onChange={handleChange} disabled={showLimitWarning} />
                <label>{item.label}</label>
              </div>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label>توضیحات تکمیلی چک‌لیست</label>
          <textarea name="checklist_extra" value={formData.checklist_extra} onChange={handleChange} placeholder="توضیحات اضافی..." rows="2" disabled={showLimitWarning} />
        </div>
      </div>
    );
  };

  const renderStep5 = () => (
    <div className="form-step">
      <h3>💰 جزئیات اجرای معامله</h3>
      <div className="form-row">
        <div className="form-group">
          <label>قیمت ورود <span style={{ color: 'red' }}>(اجباری)</span></label>
          <input type="number" name="entry_price" value={formData.entry_price} onChange={handleChange} step="0.00001" placeholder="0.00000" disabled={showLimitWarning} />
        </div>
        <div className="form-group">
          <label>حد ضرر (SL)</label>
          <input type="number" name="stop_loss" value={formData.stop_loss} onChange={handleChange} step="0.00001" placeholder="0.00000" disabled={showLimitWarning} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>حد سود اول (TP1)</label>
          <input type="number" name="take_profit_1" value={formData.take_profit_1} onChange={handleChange} step="0.00001" placeholder="0.00000" disabled={showLimitWarning} />
        </div>
        <div className="form-group">
          <label>حد سود دوم (TP2)</label>
          <input type="number" name="take_profit_2" value={formData.take_profit_2} onChange={handleChange} step="0.00001" placeholder="0.00000" disabled={showLimitWarning} />
        </div>
      </div>
      <div className="form-group">
        <label>حد سود سوم (TP3)</label>
        <input type="number" name="take_profit_3" value={formData.take_profit_3} onChange={handleChange} step="0.00001" placeholder="0.00000" disabled={showLimitWarning} />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>مقدار ریسک به دلار</label>
          <input type="number" name="risk_usd" value={formData.risk_usd} onChange={handleChange} step="0.01" placeholder="0.00" disabled={showLimitWarning} />
        </div>
        <div className="form-group">
          <label>درصد ریسک از کل سرمایه</label>
          <input type="number" name="risk_percent" value={formData.risk_percent} onChange={handleChange} step="0.01" placeholder="0.00" disabled={showLimitWarning} />
        </div>
      </div>
      <div className="form-group">
        <label>نسبت ریسک به ریوارد (R:R)</label>
        <input type="number" name="risk_reward_ratio" value={formData.risk_reward_ratio} onChange={handleChange} step="0.01" placeholder="مثلاً 2.0" disabled={showLimitWarning} />
      </div>
    </div>
  );

  const renderStep6 = () => (
    <div className="form-step">
      <h3>📊 نتیجه معامله</h3>
      <div className="form-row">
        <div className="form-group">
          <label>قیمت بسته‌شدن <span style={{ color: 'red' }}>(اجباری)</span></label>
          <input type="number" name="close_price" value={formData.close_price} onChange={handleChange} step="0.00001" placeholder="0.00000" disabled={showLimitWarning} />
        </div>
        <div className="form-group">
          <label>حد خورده شده</label>
          <select name="tp_sl_hit" value={formData.tp_sl_hit} onChange={handleChange} disabled={showLimitWarning}>
            <option value="">انتخاب کنید</option>
            <option value="TP1">TP1</option>
            <option value="TP2">TP2</option>
            <option value="TP3">TP3</option>
            <option value="SL">SL</option>
            <option value="BE">BE</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label>سود یا زیان نهایی (دلار)</label>
        <input type="number" name="profit" value={formData.profit} onChange={handleChange} step="0.01" placeholder="0.00" disabled={showLimitWarning} />
      </div>
    </div>
  );

  const renderStep7 = () => (
    <div className="form-step">
      <h3>🔄 احساسات و بازبینی</h3>
      <div className="form-row">
        <div className="form-group">
          <label>استرس قبل معامله</label>
          <select name="pre_trade_stress" value={formData.pre_trade_stress} onChange={handleChange} disabled={showLimitWarning}>
            <option value="کم">کم</option><option value="متوسط">متوسط</option><option value="زیاد">زیاد</option>
          </select>
        </div>
        <div className="form-group">
          <label>کنترل هیجان هنگام ورود</label>
          <select name="entry_emotion_control" value={formData.entry_emotion_control} onChange={handleChange} disabled={showLimitWarning}>
            <option value="بله">بله</option><option value="خیر">خیر</option><option value="متوسط">متوسط</option>
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>واکنش به سود</label>
          <input type="text" name="reaction_to_profit" value={formData.reaction_to_profit} onChange={handleChange} placeholder="مثلاً: محتاطانه، شتابزده..." disabled={showLimitWarning} />
        </div>
        <div className="form-group">
          <label>مدیریت انتظار</label>
          <select name="expectation_management" value={formData.expectation_management} onChange={handleChange} disabled={showLimitWarning}>
            <option value="ضعیف">ضعیف</option><option value="متوسط">متوسط</option><option value="خوب">خوب</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label>کنترل احساسات پس از ضرر</label>
        <textarea name="emotion_after_losses" value={formData.emotion_after_losses} onChange={handleChange} placeholder="اگر ضرر قبلی در روز داشتید، کنترل احساسات چگونه بود؟" rows="2" disabled={showLimitWarning} />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>کد اشتباه</label>
          <input type="text" name="mistake_code" value={formData.mistake_code} onChange={handleChange} placeholder="مثلاً: ورود زودهنگام" disabled={showLimitWarning} />
        </div>
        <div className="form-group">
          <label>وزن اشتباه (0.1 تا 0.9)</label>
          <input type="number" name="mistake_weight" value={formData.mistake_weight} onChange={handleChange} step="0.1" min="0.1" max="0.9" placeholder="0.5" disabled={showLimitWarning} />
        </div>
      </div>
      <div className="form-group">
        <label>امتیاز کیفیت اجرا (۱-۱۰)</label>
        <input type="number" name="execution_quality_score" value={formData.execution_quality_score} onChange={handleChange} min="1" max="10" placeholder="5" disabled={showLimitWarning} />
      </div>
      <div className="checkbox-grid">
        <div className="checkbox-group"><input type="checkbox" name="stop_loss_adherence" checked={formData.stop_loss_adherence} onChange={handleChange} disabled={showLimitWarning} /><label>پایبندی به حد ضرر</label></div>
        <div className="checkbox-group"><input type="checkbox" name="strategy_adherence" checked={formData.strategy_adherence} onChange={handleChange} disabled={showLimitWarning} /><label>پایبندی به استراتژی</label></div>
        <div className="checkbox-group"><input type="checkbox" name="capital_management_adherence" checked={formData.capital_management_adherence} onChange={handleChange} disabled={showLimitWarning} /><label>پایبندی به مدیریت سرمایه</label></div>
        <div className="checkbox-group"><input type="checkbox" name="over_trade" checked={formData.over_trade} onChange={handleChange} disabled={showLimitWarning} /><label>اورترید محسوب می‌شود</label></div>
        <div className="checkbox-group"><input type="checkbox" name="post_trade_scan" checked={formData.post_trade_scan} onChange={handleChange} disabled={showLimitWarning} /><label>اسکن پس از معامله انجام شد</label></div>
        <div className="checkbox-group"><input type="checkbox" name="entry_reason_written" checked={formData.entry_reason_written} onChange={handleChange} disabled={showLimitWarning} /><label>دلیل ورود یادداشت شد</label></div>
        <div className="checkbox-group"><input type="checkbox" name="exit_reason_written" checked={formData.exit_reason_written} onChange={handleChange} disabled={showLimitWarning} /><label>دلیل خروج یادداشت شد</label></div>
        <div className="checkbox-group"><input type="checkbox" name="mistakes_recorded" checked={formData.mistakes_recorded} onChange={handleChange} disabled={showLimitWarning} /><label>اشتباهات ثبت شد</label></div>
      </div>
    </div>
  );

  const renderICTStep = () => (
    <div className="form-step">
      <h3>📊 تحلیل ICT</h3>
      <div className="form-row">
        <div className="form-group"><label>FVG (Fair Value Gap)</label><input type="text" name="fvg" value={formData.fvg} onChange={handleChange} placeholder="مثلاً: FVG خرید" disabled={showLimitWarning} /></div>
        <div className="form-group"><label>Order Block</label><input type="text" name="order_block" value={formData.order_block} onChange={handleChange} placeholder="مثلاً: OB فروش" disabled={showLimitWarning} /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label>BOS (Break of Structure)</label><input type="text" name="bos" value={formData.bos} onChange={handleChange} placeholder="مثلاً: BOS صعودی" disabled={showLimitWarning} /></div>
        <div className="form-group"><label>CHOCH (Change of Character)</label><input type="text" name="choch" value={formData.choch} onChange={handleChange} placeholder="مثلاً: CHOCH نزولی" disabled={showLimitWarning} /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label>MSS (Market Structure Shift)</label><input type="text" name="mss" value={formData.mss} onChange={handleChange} placeholder="مثلاً: MSS تایید شده" disabled={showLimitWarning} /></div>
        <div className="form-group"><label>Liquidity Sweep</label><input type="text" name="liquidity_sweep" value={formData.liquidity_sweep} onChange={handleChange} placeholder="مثلاً: Sweep High" disabled={showLimitWarning} /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label>POI (Point of Interest)</label><input type="text" name="poi" value={formData.poi} onChange={handleChange} placeholder="مثلاً: POI ورود" disabled={showLimitWarning} /></div>
        <div className="form-group"><label>Demand Zone</label><input type="text" name="demand_zone" value={formData.demand_zone} onChange={handleChange} placeholder="مثلاً: 1.0850-1.0870" disabled={showLimitWarning} /></div>
      </div>
      <div className="form-group"><label>Supply Zone</label><input type="text" name="supply_zone" value={formData.supply_zone} onChange={handleChange} placeholder="مثلاً: 1.0920-1.0940" disabled={showLimitWarning} /></div>
    </div>
  );

  const renderRulesStep = () => {
    if (rulesLoading) {
      return (
        <div className="form-step">
          <h3>📋 قوانین معاملاتی</h3>
          <div className="loading-spinner">⏳ در حال بارگذاری قوانین...</div>
        </div>
      );
    }

    if (rules.length === 0) {
      return (
        <div className="form-step">
          <h3>📋 قوانین معاملاتی</h3>
          <div className="empty-rules-message">
            <p>هیچ قانون معاملاتی تعریف نشده است.</p>
            <p className="hint">برای تعریف قوانین، به بخش <strong>پروفایل → قوانین معاملاتی</strong> بروید.</p>
          </div>
        </div>
      );
    }

    const groupedRules = rules.reduce((acc, rule) => {
      const category = rule.category_label || 'متفرقه';
      if (!acc[category]) acc[category] = [];
      acc[category].push(rule);
      return acc;
    }, {});

    const categoryIcons = {
      'قوانین ورود': '📈',
      'قوانین خروج': '🚪',
      'مدیریت ریسک': '🛡️',
      'روانشناختی': '🧠',
      'قوانین زمانی': '⏰',
      'متفرقه': '📋',
    };

    return (
      <div className="form-step rules-step">
        <h3>📋 قوانین معاملاتی</h3>
        <p className="rules-hint">
          قبل از ثبت ترید، قوانین رعایت‌شده را علامت بزنید.
          <span className="required-hint">قوانین با * اجباری هستند.</span>
        </p>

        {Object.entries(groupedRules).map(([category, categoryRules]) => (
          <div key={category} className="rules-category">
            <div className="rules-category-header">
              <span className="category-icon">{categoryIcons[category] || '📋'}</span>
              <span className="category-name">{category}</span>
              <span className="category-count">{categoryRules.length} قانون</span>
            </div>
            <div className="rules-list">
              {categoryRules.map(rule => {
                const isChecked = checkedRules.find(r => r.id === rule.id)?.checked || false;
                return (
                  <div key={rule.id} className={`rule-item ${isChecked ? 'checked' : ''}`}>
                    <div className="rule-checkbox">
                      <input
                        type="checkbox"
                        id={`rule-${rule.id}`}
                        checked={isChecked}
                        onChange={() => handleRuleCheck(rule.id)}
                        disabled={showLimitWarning}
                      />
                      <label htmlFor={`rule-${rule.id}`}>
                        <span className="rule-text">{rule.rule_text}</span>
                        {rule.is_required && <span className="rule-required">*</span>}
                      </label>
                    </div>
                    {isChecked && <span className="rule-checked-icon">✅</span>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="rules-summary">
          <span>
            قوانین رعایت‌شده: {checkedRules.filter(r => r.checked).length} از {rules.length}
          </span>
          <span className="rules-compliance">
            {rules.length > 0 ? Math.round((checkedRules.filter(r => r.checked).length / rules.length) * 100) : 0}%
          </span>
        </div>
      </div>
    );
  };

  const renderStep10 = () => {
    const maxSize = screenshotSettings.max_size_mb || 5;
    const maxW = screenshotSettings.max_width || 2000;
    const maxH = screenshotSettings.max_height || 2000;

    return (
      <div className="form-step">
        <h3>🖼️ تصویر چارت</h3>
        {screenshotSettings.show_upload ? (
          <div className="form-group">
            <label>آپلود تصویر چارت (اختیاری)</label>
            <input type="file" accept="image/*" onChange={handleFileChange} disabled={showLimitWarning} />
            {screenshotFile && (
              <div className="file-preview">
                <ImageZoom
                  src={screenshotFile}
                  alt="پیش‌نمایش چارت"
                  className="thumbnail-image"
                />
                <button
                  type="button"
                  className="btn-remove-file"
                  onClick={() => {
                    setScreenshotFile(null);
                    document.querySelector('input[type="file"]').value = '';
                  }}
                >
                  ✕ حذف
                </button>
              </div>
            )}
            <small className="hint-text">
              📌 حداکثر حجم: {maxSize} مگابایت &nbsp;|&nbsp;
              حداکثر ابعاد: {maxW}×{maxH} پیکسل &nbsp;|&nbsp;
              فرمت‌های مجاز: JPG, PNG, GIF, WebP
            </small>
          </div>
        ) : (
          <p className="upload-disabled-message">⛔ بخش آپلود تصویر توسط ادمین غیرفعال شده است.</p>
        )}
      </div>
    );
  };

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
      case 9: return renderRulesStep();
      case 10: return renderStep10();
      default: return null;
    }
  };

  // ===== بررسی وجود پورتفولیو =====
  if (!loading && portfolios.length === 0) {
    return (
      <div className="trade-form-container no-portfolio">
        <div className="no-portfolio-message">
          <div className="icon">📊</div>
          <h3>هیچ پورتفولیویی ایجاد نشده است</h3>
          <p>برای ثبت ترید، ابتدا باید یک پورتفولیو بسازید.</p>
          <button
            className="btn-create-portfolio"
            onClick={() => {
              showToast('لطفاً از منوی بالای صفحه، گزینه "افزودن پورتفولیو جدید" را انتخاب کنید.', 'info');
            }}
          >
            ➕ ساخت پورتفولیو جدید
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`trade-form-container ${isDark ? 'dark' : 'light'}`}>
      <div className="trade-form-header">
        <h2>📝 ثبت ترید جدید</h2>
        <button className="btn-back" onClick={() => navigate('/dashboard')}>↩️ بازگشت</button>
      </div>

      {showLimitWarning && (
        <div className="limit-warning">
          <div className="warning-icon">⚠️</div>
          <div className="warning-content">
            <h4>محدودیت ترید به پایان رسیده!</h4>
            <p>شما {subscriptionStatus?.trades_limit || 0} ترید در پلن خود دارید که همه را استفاده کرده‌اید.</p>
            <button className="btn-upgrade" onClick={() => navigate('/profile')}>🚀 تمدید اشتراک</button>
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div className="validation-errors">
          <span className="error-icon">⚠️</span>
          <span className="error-count">{errors.length} خطا</span>
          <button className="error-toggle" onClick={() => alert('❌ لطفاً خطاهای زیر را اصلاح کنید:\n\n' + errors.map((e, i) => `${i+1}. ${e}`).join('\n'))}>مشاهده</button>
        </div>
      )}

      <div className="step-indicator">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(step => (
          <React.Fragment key={step}>
            <div
              className={`step-dot ${step <= currentStep ? 'active' : ''} ${step === currentStep ? 'current' : ''}`}
              onClick={() => setCurrentStep(step)}
            >
              {step}
            </div>
            {step < 10 && <div className={`step-line ${step < currentStep ? 'active' : ''} ${step === currentStep ? 'current' : ''}`} />}
          </React.Fragment>
        ))}
      </div>

      <div className="step-labels">
        <span className={currentStep === 1 ? 'current' : currentStep > 1 ? 'active' : ''}>تاریخ</span>
        <span className={currentStep === 2 ? 'current' : currentStep > 2 ? 'active' : ''}>نماد</span>
        <span className={currentStep === 3 ? 'current' : currentStep > 3 ? 'active' : ''}>روحی</span>
        <span className={currentStep === 4 ? 'current' : currentStep > 4 ? 'active' : ''}>برنامه</span>
        <span className={currentStep === 5 ? 'current' : currentStep > 5 ? 'active' : ''}>اجرا</span>
        <span className={currentStep === 6 ? 'current' : currentStep > 6 ? 'active' : ''}>نتیجه</span>
        <span className={currentStep === 7 ? 'current' : currentStep > 7 ? 'active' : ''}>بازبینی</span>
        <span className={currentStep === 8 ? 'current' : currentStep > 8 ? 'active' : ''}>ICT</span>
        <span className={currentStep === 9 ? 'current' : currentStep > 9 ? 'active' : ''}>قوانین</span>
        <span className={currentStep === 10 ? 'current' : currentStep > 10 ? 'active' : ''}>تصویر</span>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-content">{renderStep()}</div>
        <div className="form-actions">
          {currentStep > 1 && (
            <button type="button" className="btn-prev" onClick={prevStep} disabled={loading || showLimitWarning}>
              ← قبلی
            </button>
          )}
          {currentStep < 10 && (
            <button type="button" className="btn-next" onClick={nextStep} disabled={loading || showLimitWarning}>
              بعدی →
            </button>
          )}
          {currentStep === 10 && (
            <button type="submit" className="btn-submit" disabled={loading || showLimitWarning}>
              {loading ? 'در حال ثبت...' : '✅ ثبت ترید'}
            </button>
          )}
        </div>
      </form>

      {subscriptionStatus && !showLimitWarning && !user?.is_admin && (
        <div className="subscription-info">
          <span>📈 تریدهای باقیمانده: {subscriptionStatus.remaining_trades >= 999999 ? '∞' : subscriptionStatus.remaining_trades}</span>
        </div>
      )}
    </div>
  );
};

export default TradeForm;