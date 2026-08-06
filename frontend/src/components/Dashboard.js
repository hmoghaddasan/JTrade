// frontend/src/components/Dashboard.js

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import RealApiService from '../services/realApiService';
import SystemMessages from './SystemMessages';
import PnLCalendar from './dashboard/PnLCalendar';
import './Dashboard.css';

// لیست ۵۰ آیکون برای دسته‌بندی‌ها
const GROUP_ICONS = [
  '📁', '📊', '💱', '₿', '📈', '📉', '🏆', '⭐', '🔥', '💰',
  '🚀', '🎯', '💎', '🔮', '🌈', '⚡', '💫', '🌟', '✨', '🌙',
  '☀️', '🌍', '🌎', '🌏', '🌊', '🌋', '🌌', '🌠', '🎨', '🎪',
  '🎭', '🎵', '🎶', '🎼', '🎹', '🎸', '🎺', '🎻', '🥁', '🎧',
  '🎤', '🎬', '🎮', '🎯', '🎲', '🎳', '🎪', '🎨', '🎭', '🎫'
];

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // ===== State جدید برای نسخه =====
  const [appVersion, setAppVersion] = useState('1.0.0');

  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [trades, setTrades] = useState([]);
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showDeleteCategoryModal, setShowDeleteCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('📁');
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [subscriptionStats, setSubscriptionStats] = useState({
    remaining_trades: 0,
    remaining_ai_consultations: 0,
    total_trades: 0,
    plan_name: 'بدون اشتراک',
    remaining_days: 0,
    is_trial: false,
  });

  // State برای نمایش بیشتر
  const [showAllTrades, setShowAllTrades] = useState(false);
  const [showAllGroups, setShowAllGroups] = useState(false);
  const DISPLAY_LIMIT = 15;

  // ============================================
  // دریافت نسخه جاری از سرور
  // ============================================
  useEffect(() => {
    const loadVersion = async () => {
      try {
        const response = await RealApiService.getCurrentVersion();
        if (response.data && response.data.version_number) {
          setAppVersion(response.data.version_number);
        }
      } catch (error) {
        console.warn('⚠️ Unable to fetch version, using fallback:', error);
        // در صورت خطا، از متغیر محیطی استفاده کن (در صورت وجود)
        const envVersion = process.env.REACT_APP_VERSION;
        if (envVersion) {
          setAppVersion(envVersion);
        }
      }
    };
    loadVersion();
  }, []);

  // ============================================
  // دریافت آمار اشتراک
  // ============================================
  useEffect(() => {
    const loadSubscriptionStats = async () => {
      try {
        const response = await RealApiService.getSubscriptionStatus();
        const data = response.data;
        console.log('📊 Subscription data:', data);
        setSubscriptionStats({
          remaining_trades: data.remaining_trades ?? 0,
          remaining_ai_consultations: data.remaining_ai_consultations ?? 0,
          total_trades: trades.length || 0,
          plan_name: data.is_trial ? 'آزمایشی' : (data.plan_name || 'بدون اشتراک'),
          remaining_days: data.remaining_days || 0,
          is_trial: data.is_trial || false,
        });
      } catch (error) {
        console.error('Error loading subscription stats:', error);
      }
    };

    if (user) {
      loadSubscriptionStats();
    }
  }, [user, trades]);

  // ============================================
  // بارگذاری داده‌ها از دیتابیس
  // ============================================
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      setLoading(true);
      setError(null);

      try {
        console.log('📁 Loading data for user:', user.id);

        const groupsResponse = await RealApiService.getTradeGroups();
        let groupsData = groupsResponse.data.results || groupsResponse.data || [];
        console.log('📁 All groups:', groupsData);

        const userGroups = groupsData.filter(g => g.user_id === user.id);
        console.log('📁 User groups:', userGroups);

        const allCategory = {
          id: 0,
          name: 'همه دسته‌بندی‌ها',
          icon: '📊',
          is_default: true,
          is_active: true
        };

        const categoriesData = [
          allCategory,
          ...userGroups.map(g => ({
            id: g.id,
            name: g.group_name,
            icon: g.icon || '📁',
            is_active: g.is_active,
            is_default: g.is_default,
            description: g.description || ''
          }))
        ];

        console.log('📁 Final categories:', categoriesData);
        setCategories(categoriesData);

        const tradesResponse = await RealApiService.getTrades();
        const tradesData = tradesResponse.data.results || tradesResponse.data || [];
        console.log('📊 Trades loaded:', tradesData.length);

        tradesData.forEach(t => {
          console.log(`📊 Trade ${t.id}: ${t.symbol} -> group: ${t.group || t.group_id}`);
        });

        setTrades(tradesData);

        if (categoriesData.length > 0) {
          setSelectedCategory(categoriesData[0]);
        }

      } catch (error) {
        console.error('❌ Error loading data:', error);
        setError('خطا در بارگذاری داده‌ها');
        showToast('خطا در بارگذاری داده‌ها', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, showToast]);

  // ============================================
  // محاسبه تعداد تریدهای هر دسته‌بندی
  // ============================================
  const getTradeCount = (categoryId) => {
    if (categoryId === 0) return trades.length;
    return trades.filter(t => t.group === categoryId || t.group_id === categoryId).length;
  };

  // ============================================
  // فیلتر تریدها بر اساس دسته‌بندی انتخاب شده
  // ============================================
  const filteredTrades = useMemo(() => {
    if (!trades || trades.length === 0) return [];

    if (selectedCategory?.id === 0) {
      return trades;
    }

    return trades.filter(t => {
      const tradeGroupId = t.group || t.group_id;
      return tradeGroupId === selectedCategory?.id;
    });
  }, [trades, selectedCategory]);

  // ============================================
  // نمایش داده‌های محدود شده
  // ============================================
  const displayedTrades = useMemo(() => {
    if (showAllTrades) return filteredTrades;
    return filteredTrades.slice(0, DISPLAY_LIMIT);
  }, [filteredTrades, showAllTrades]);

  const displayedGroups = useMemo(() => {
    if (showAllGroups) return categories;
    return categories.slice(0, DISPLAY_LIMIT);
  }, [categories, showAllGroups]);

  // ============================================
  // دریافت جزئیات کامل یک ترید از سرور
  // ============================================
  const fetchTradeDetail = async (tradeId) => {
    if (!tradeId) return;
    setLoadingDetail(true);
    try {
      const response = await RealApiService.getTrade(tradeId);
      setSelectedTrade(response.data);
      console.log('📋 Trade detail loaded:', response.data);
    } catch (error) {
      console.error('Error fetching trade detail:', error);
      showToast('خطا در دریافت جزئیات ترید', 'error');
      setSelectedTrade(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  // ============================================
  // انتخاب خودکار اولین ترید هر دسته‌بندی
  // ============================================
  const prevFirstTradeIdRef = useRef(null);

  useEffect(() => {
    if (filteredTrades.length > 0) {
      const firstTrade = filteredTrades[0];
      if (prevFirstTradeIdRef.current !== firstTrade.id) {
        prevFirstTradeIdRef.current = firstTrade.id;
        fetchTradeDetail(firstTrade.id);
      }
    } else {
      setSelectedTrade(null);
      prevFirstTradeIdRef.current = null;
    }
  }, [filteredTrades]);

  // ============================================
  // انتخاب دسته‌بندی
  // ============================================
  const handleCategorySelect = (category) => {
    if (selectedCategory?.id !== category.id) {
      setSelectedCategory(category);
      setSelectedDate(null);
      setShowAllTrades(false);
      console.log('📁 Selected category:', category);
    }
  };

  // ============================================
  // انتخاب ترید
  // ============================================
  const handleTradeSelect = (trade) => {
    if (selectedTrade && selectedTrade.id === trade.id) return;
    fetchTradeDetail(trade.id);
  };

  // ============================================
  // کلیک روی روز تقویم
  // ============================================
  const handleCalendarDayClick = (date) => {
    setSelectedDate(date);
    const dayTrades = trades.filter(t => t.trade_date === date);
    if (dayTrades.length > 0) {
      fetchTradeDetail(dayTrades[0].id);
      showToast(`✅ ${dayTrades.length} ترید در این روز یافت شد`, 'info');
    } else {
      showToast('📭 هیچ تریدی در این روز وجود ندارد', 'info');
      setSelectedTrade(null);
    }
  };

  // ============================================
  // ویرایش ترید
  // ============================================
  const handleEditTrade = () => {
    if (selectedTrade) {
      localStorage.setItem('editTradeId', selectedTrade.id.toString());
      localStorage.setItem('returnToDashboard', 'true');
      navigate(`/trades/edit/${selectedTrade.id}`);
    }
  };

  // ============================================
  // حذف ترید
  // ============================================
  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (selectedTrade) {
      try {
        await RealApiService.deleteTrade(selectedTrade.id);
        const updatedTrades = trades.filter(t => t.id !== selectedTrade.id);
        setTrades(updatedTrades);
        setShowDeleteModal(false);
        setSelectedTrade(null);
        showToast('✅ ترید با موفقیت حذف شد', 'success');
      } catch (error) {
        console.error('Error deleting trade:', error);
        showToast('❌ خطا در حذف ترید', 'error');
      }
    }
  };

  // ============================================
  // ایجاد دسته‌بندی جدید
  // ============================================
  const handleAddCategory = () => {
    setShowCategoryModal(true);
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      showToast('لطفاً نام دسته‌بندی را وارد کنید', 'warning');
      return;
    }

    if (categories.some(c => c.name === newCategoryName.trim())) {
      showToast('این نام قبلاً استفاده شده است', 'warning');
      return;
    }

    try {
      const newGroup = {
        group_name: newCategoryName.trim(),
        icon: newCategoryIcon,
        user_id: user.id,
        is_active: true,
        is_default: false,
        created_by: user.id,
        order_index: categories.length
      };

      const response = await RealApiService.createTradeGroup(newGroup);
      const savedGroup = response.data;

      const newCategory = {
        id: savedGroup.id,
        name: savedGroup.group_name,
        icon: savedGroup.icon || newCategoryIcon,
        is_active: true,
        is_default: false
      };

      const updatedCategories = [categories[0], newCategory, ...categories.slice(1)];
      setCategories(updatedCategories);
      setSelectedCategory(newCategory);
      setShowCategoryModal(false);
      setNewCategoryName('');
      setNewCategoryIcon('📁');
      showToast('✅ دسته‌بندی با موفقیت ایجاد شد', 'success');
    } catch (error) {
      console.error('Error creating group:', error);
      showToast('❌ خطا در ایجاد دسته‌بندی', 'error');
    }
  };

  // ============================================
  // حذف دسته‌بندی
  // ============================================
  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    const categoryTrades = trades.filter(t => t.group === categoryToDelete.id || t.group_id === categoryToDelete.id);
    if (categoryTrades.length > 0) {
      showToast(`⚠️ این دسته‌بندی دارای ${categoryTrades.length} ترید است. ابتدا تریدهای آن را حذف کنید.`, 'warning');
      setShowDeleteCategoryModal(false);
      setCategoryToDelete(null);
      return;
    }

    try {
      await RealApiService.deleteTradeGroup(categoryToDelete.id);

      const updatedCategories = categories.filter(c => c.id !== categoryToDelete.id);
      setCategories(updatedCategories);

      if (updatedCategories.length > 0) {
        setSelectedCategory(updatedCategories[0]);
      }
      setShowDeleteCategoryModal(false);
      setCategoryToDelete(null);
      showToast('✅ دسته‌بندی با موفقیت حذف شد', 'success');
    } catch (error) {
      console.error('Error deleting group:', error);
      showToast('❌ خطا در حذف دسته‌بندی', 'error');
    }
  };

  // ============================================
  // چاپ و اکسل
  // ============================================
  const handlePrintTrade = () => {
    if (!selectedTrade) {
      showToast('لطفاً یک ترید را انتخاب کنید', 'warning');
      return;
    }
    window.print();
  };

  const handleExportTradeExcel = () => {
    if (!selectedTrade) {
      showToast('لطفاً یک ترید را انتخاب کنید', 'warning');
      return;
    }

    const trade = selectedTrade;
    const BOM = '\uFEFF';
    const headers = [
      'تاریخ', 'نماد', 'نوع', 'دسته‌بندی', 'نوع جلسه', 'ساعت (نیویورک)',
      'روز هفته', 'بایاس', 'استراتژی', 'مدل ورودی', 'تایم‌فریم‌ها',
      'کیفیت خواب', 'تغذیه مناسب', 'احساسات', 'احساس غالب',
      'استرس قبل معامله', 'کنترل هیجان', 'قیمت ورود', 'قیمت خروج',
      'حد ضرر', 'حد سود TP1', 'حد سود TP2', 'حد سود TP3',
      'حد خورده شده', 'نسبت R:R', 'ریسک (دلار)', 'درصد ریسک',
      'سود/زیان', 'کیفیت اجرا', 'SMT تایید شد', 'سطوح کلیدی بررسی شد',
      'حمایت BOND/DXY', 'اخبار هفتگی چاپ شد', 'ساعت صفر مشخص شد',
      'رنج آسیا مشخص شد', 'رنج لندن مشخص شد', 'Judas LO مشخص شد',
      'توضیحات تکمیلی', 'کد اشتباه', 'وزن اشتباه',
      'پایبندی به حد ضرر', 'پایبندی به استراتژی', 'پایبندی به مدیریت سرمایه',
      'اورترید', 'اسکن پس از معامله', 'دلیل ورود یادداشت شد',
      'دلیل خروج یادداشت شد', 'اشتباهات ثبت شد',
      'FVG', 'Order Block', 'BOS', 'CHOCH', 'MSS', 'Liquidity Sweep',
      'POI', 'Demand Zone', 'Supply Zone'
    ];

    let csvContent = BOM + headers.join(',') + '\n';
    const categoryName = categories.find(c => c.id === (trade.group || trade.group_id))?.name || 'بدون دسته‌بندی';

    const row = [
      trade.trade_date, trade.symbol, trade.trade_type === 'Buy' ? 'خرید' : 'فروش',
      categoryName,
      trade.session_type || '', trade.time_ny || '', trade.day_of_week || '', trade.bias || '',
      trade.strategy_type || '', trade.retirement_model || '', trade.timeframes?.join('، ') || '',
      trade.sleep_quality || '', trade.food_status ? 'بله' : 'خیر', trade.emotions?.join('، ') || '',
      trade.dominant_feeling || '', trade.pre_trade_stress || '', trade.entry_emotion_control || '',
      trade.entry_price || '', trade.close_price || '', trade.stop_loss || '',
      trade.take_profit_1 || '', trade.take_profit_2 || '', trade.take_profit_3 || '',
      trade.tp_sl_hit || '', trade.risk_reward_ratio || '', trade.risk_usd || '0',
      trade.risk_percent || '0', trade.profit || 0, trade.execution_quality_score || '',
      trade.smt_confirmed ? 'بله' : 'خیر', trade.key_levels_reviewed ? 'بله' : 'خیر',
      trade.bond_dxy_support ? 'بله' : 'خیر', trade.weekly_news_printed ? 'بله' : 'خیر',
      trade.zero_hour_identified ? 'بله' : 'خیر', trade.asian_range_identified ? 'بله' : 'خیر',
      trade.london_range_identified ? 'بله' : 'خیر', trade.judas_lo_identified ? 'بله' : 'خیر',
      trade.checklist_extra || '', trade.mistake_code || '', trade.mistake_weight || '',
      trade.stop_loss_adherence ? 'بله' : 'خیر', trade.strategy_adherence ? 'بله' : 'خیر',
      trade.capital_management_adherence ? 'بله' : 'خیر', trade.over_trade ? 'بله' : 'خیر',
      trade.post_trade_scan ? 'بله' : 'خیر', trade.entry_reason_written ? 'بله' : 'خیر',
      trade.exit_reason_written ? 'بله' : 'خیر', trade.mistakes_recorded ? 'بله' : 'خیر',
      trade.fvg || '', trade.order_block || '', trade.bos || '', trade.choch || '',
      trade.mss || '', trade.liquidity_sweep || '', trade.poi || '',
      trade.demand_zone || '', trade.supply_zone || ''
    ];
    csvContent += row.join(',') + '\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `trade_${trade.symbol}_${trade.trade_date}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // ============================================
  // خروج از سیستم
  // ============================================
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // ============================================
  // تب‌ها
  // ============================================
  const tabs = [
    { id: 'general', label: '📋 عمومی' },
    { id: 'execution', label: '💰 اجرا' },
    { id: 'psychology', label: '🧠 روانشناسی' },
    { id: 'checklist', label: '✅ چک‌لیست' },
    { id: 'review', label: '🔄 بازبینی' },
    { id: 'ict', label: '📊 ICT' },
  ];

  // ============================================
  // لودینگ و خطا
  // ============================================
  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner">⏳</div>
        <p>در حال بارگذاری...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <div className="error-icon">❌</div>
        <h3>خطا در بارگذاری</h3>
        <p>{error}</p>
        <button className="btn-retry" onClick={() => window.location.reload()}>
          تلاش مجدد
        </button>
      </div>
    );
  }

  // ============================================
  // رندر اصلی
  // ============================================
  return (
    <div className={`dashboard-new ${isDark ? 'dark' : 'light'}`}>
      {/* ===== هدر ===== */}
      <header className="dashboard-header">
        <div className="header-left">
          <h1>📊 ژورنال حرفه‌ای ترید <span className="header-version">v{appVersion}</span></h1>
        </div>
        <div className="header-right">
          <button className="theme-toggle" onClick={toggleTheme}>
            {isDark ? '☀️' : '🌙'}
          </button>
          <span className="user-name">{user?.first_name || user?.phone_number}</span>
          <button className="logout-btn" onClick={handleLogout}>🚪 خروج</button>
        </div>
      </header>

      {/* ===== دکمه‌های اقدام سریع ===== */}
      <div className="quick-actions">
        <button className="action-btn primary" onClick={() => navigate('/trades/new')}>
          <span className="action-icon">➕</span><span>ترید جدید</span>
        </button>
        <button className="action-btn secondary" onClick={() => navigate('/trades')}>
          <span className="action-icon">📋</span><span>لیست تریدها</span>
        </button>
        <button className="action-btn success" onClick={() => navigate('/analytics')}>
          <span className="action-icon">📊</span><span>تحلیل عملکرد</span>
        </button>
        <button className="action-btn warning" onClick={() => navigate('/reports')}>
          <span className="action-icon">📈</span><span>گزارش‌های پیشرفته</span>
        </button>
        <button className="action-btn ai" onClick={() => navigate('/ai-consultation')}>
          <span className="action-icon">🧠</span><span>مشاور AI</span>
        </button>
        <button className="action-btn info" onClick={() => navigate('/profile')}>
          <span className="action-icon">👤</span><span>پروفایل</span>
        </button>
      </div>

      {/* ===== پیام‌های سیستم ===== */}
      <SystemMessages />

      {/* ===== سه ستون اصلی ===== */}
      <div className="three-column-layout">
        {/* ستون ۱: دسته‌بندی‌ها */}
        <div className="col-groups">
          <div className="col-header">
            <h3>📁 دسته‌بندی‌ها</h3>
            <div className="group-actions">
              <button className="btn-add-group" onClick={handleAddCategory} title="افزودن دسته‌بندی">+</button>
              <button
                className="btn-delete-group"
                onClick={() => {
                  if (selectedCategory && selectedCategory.id !== 0) {
                    setCategoryToDelete(selectedCategory);
                    setShowDeleteCategoryModal(true);
                  } else {
                    showToast('دسته‌بندی "همه دسته‌بندی‌ها" قابل حذف نیست', 'warning');
                  }
                }}
                title="حذف دسته‌بندی"
              >−</button>
            </div>
          </div>
          <div className="groups-list">
            {displayedGroups.map(category => (
              <div
                key={category.id}
                className={`group-item ${selectedCategory?.id === category.id ? 'active' : ''}`}
                onClick={() => handleCategorySelect(category)}
              >
                <span className="group-icon">{category.icon}</span>
                <span className="group-name">{category.name}</span>
                <span className="group-count">{getTradeCount(category.id)}</span>
                {category.is_default && category.id !== 0 && (
                  <span className="group-status default">پیش‌فرض</span>
                )}
                {!category.is_active && (
                  <span className="group-status inactive">غیرفعال</span>
                )}
              </div>
            ))}
            {categories.length > DISPLAY_LIMIT && (
              <button
                className="show-more-btn"
                onClick={() => setShowAllGroups(!showAllGroups)}
              >
                {showAllGroups ? '🔽 نمایش کمتر' : `🔼 نمایش ${categories.length - DISPLAY_LIMIT} دسته‌بندی بیشتر`}
              </button>
            )}
          </div>
        </div>

        {/* ستون ۲: لیست تریدها */}
        <div className="col-trades">
          <div className="col-header">
            <h3>📈 تریدها</h3>
            <span className="trade-count">
              {filteredTrades.length} عدد
            </span>
          </div>
          <div className="trades-list">
            {displayedTrades.length === 0 ? (
              <div className="empty-trades">
                <p>هیچ تریدی در این دسته‌بندی وجود ندارد</p>
                {selectedCategory?.id !== 0 && (
                  <button
                    className="btn-add-trade"
                    onClick={() => navigate('/trades/new')}
                  >
                    ➕ ثبت ترید جدید
                  </button>
                )}
              </div>
            ) : (
              <>
                {displayedTrades.map(trade => (
                  <div
                    key={trade.id}
                    className={`trade-item ${selectedTrade?.id === trade.id ? 'active' : ''}`}
                    onClick={() => handleTradeSelect(trade)}
                  >
                    <div className="trade-item-header">
                      <span className="trade-symbol">{trade.symbol || 'نامشخص'}</span>
                      <span className={`trade-type ${trade.trade_type === 'Buy' ? 'buy' : 'sell'}`}>
                        {trade.trade_type === 'Buy' ? 'خرید' : 'فروش'}
                      </span>
                    </div>
                    <div className="trade-item-info">
                      <span className="trade-date">{trade.trade_date || new Date(trade.created_at).toLocaleDateString('fa-IR')}</span>
                      <span className={`trade-profit ${parseFloat(trade.profit) >= 0 ? 'positive' : 'negative'}`}>
                        {parseFloat(trade.profit) >= 0 ? '+' : ''}{parseFloat(trade.profit) || 0}$</span>
                    </div>
                  </div>
                ))}
                {filteredTrades.length > DISPLAY_LIMIT && (
                  <button
                    className="show-more-btn"
                    onClick={() => setShowAllTrades(!showAllTrades)}
                  >
                    {showAllTrades ? '🔽 نمایش کمتر' : `🔼 نمایش ${filteredTrades.length - DISPLAY_LIMIT} ترید بیشتر`}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* ستون ۳: جزئیات ترید */}
        <div className="col-details">
          {loadingDetail ? (
            <div className="loading-detail">
              <div className="loading-spinner">⏳</div>
              <p>در حال دریافت جزئیات...</p>
            </div>
          ) : selectedTrade ? (
            <>
              <div className="col-header">
                <h3>📋 جزئیات ترید</h3>
                <div className="detail-actions">
                  <button className="btn-print-detail" onClick={handlePrintTrade} title="چاپ ترید">🖨️ چاپ</button>
                  <button className="btn-excel-detail" onClick={handleExportTradeExcel} title="خروجی اکسل">📄 اکسل</button>
                  <button className="btn-edit" onClick={handleEditTrade}>✏️ ویرایش</button>
                  <button className="btn-delete" onClick={handleDeleteClick}>🗑️ حذف</button>
                  <button className="btn-close" onClick={() => setSelectedTrade(null)}>✕</button>
                </div>
              </div>
              <div className="detail-tabs">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="detail-content">
                {/* تب عمومی */}
                {activeTab === 'general' && (
                  <div className="tab-panel">
                    <div className="detail-row">
                      <span className="detail-label">نماد</span>
                      <span className="detail-value">{selectedTrade.symbol}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">تاریخ</span>
                      <span className="detail-value">{selectedTrade.trade_date || new Date(selectedTrade.created_at).toLocaleDateString('fa-IR')}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">نوع</span>
                      <span className={`detail-value ${selectedTrade.trade_type === 'Buy' ? 'buy' : 'sell'}`}>
                        {selectedTrade.trade_type === 'Buy' ? 'خرید' : 'فروش'}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">دسته‌بندی</span>
                      <span className="detail-value">
                        {categories.find(c => c.id === (selectedTrade.group || selectedTrade.group_id))?.name || 'بدون دسته‌بندی'}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">سود/زیان</span>
                      <span className={`detail-value ${parseFloat(selectedTrade.profit) >= 0 ? 'profit' : 'loss'}`}>
                        {parseFloat(selectedTrade.profit) >= 0 ? '+' : ''}{parseFloat(selectedTrade.profit) || 0}$</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">کیفیت اجرا</span>
                      <span className={`detail-value quality-${selectedTrade.execution_quality_score >= 7 ? 'high' : selectedTrade.execution_quality_score >= 4 ? 'medium' : 'low'}`}>
                        {selectedTrade.execution_quality_score || '-'}/10
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">نوع جلسه</span>
                      <span className="detail-value">{selectedTrade.session_type || '-'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">ساعت (نیویورک)</span>
                      <span className="detail-value">{selectedTrade.time_ny || '-'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">روز هفته</span>
                      <span className="detail-value">{selectedTrade.day_of_week || '-'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">یادداشت هفتگی</span>
                      <span className="detail-value">{selectedTrade.weekly_profile_note || '-'}</span>
                    </div>
                  </div>
                )}

                {/* تب اجرا */}
                {activeTab === 'execution' && (
                  <div className="tab-panel">
                    <div className="detail-row">
                      <span className="detail-label">قیمت ورود</span>
                      <span className="detail-value">{selectedTrade.entry_price || '-'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">قیمت خروج</span>
                      <span className="detail-value">{selectedTrade.close_price || '-'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">حد ضرر (SL)</span>
                      <span className="detail-value">{selectedTrade.stop_loss || '-'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">حد سود اول (TP1)</span>
                      <span className="detail-value">{selectedTrade.take_profit_1 || '-'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">حد سود دوم (TP2)</span>
                      <span className="detail-value">{selectedTrade.take_profit_2 || '-'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">حد سود سوم (TP3)</span>
                      <span className="detail-value">{selectedTrade.take_profit_3 || '-'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">حد خورده شده</span>
                      <span className="detail-value">{selectedTrade.tp_sl_hit || '-'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">نسبت R:R</span>
                      <span className="detail-value">{selectedTrade.risk_reward_ratio || '-'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">ریسک (دلار)</span>
                      <span className="detail-value">${selectedTrade.risk_usd || '0'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">درصد ریسک</span>
                      <span className="detail-value">{selectedTrade.risk_percent || '0'}%</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">کیفیت اجرا</span>
                      <span className={`detail-value quality-${selectedTrade.execution_quality_score >= 7 ? 'high' : selectedTrade.execution_quality_score >= 4 ? 'medium' : 'low'}`}>
                        {selectedTrade.execution_quality_score || '-'}/10
                      </span>
                    </div>
                  </div>
                )}

                {/* تب روانشناسی */}
                {activeTab === 'psychology' && (
                  <div className="tab-panel">
                    <div className="detail-row">
                      <span className="detail-label">کیفیت خواب</span>
                      <span className={`detail-value sleep-${selectedTrade.sleep_quality}`}>{selectedTrade.sleep_quality || '-'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">تغذیه مناسب</span>
                      <span className={`detail-value ${selectedTrade.food_status ? 'checked' : 'unchecked'}`}>
                        {selectedTrade.food_status ? '✅ بله' : '❌ خیر'}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">احساس غالب</span>
                      <span className="detail-value">{selectedTrade.dominant_feeling || '-'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">استرس قبل معامله</span>
                      <span className="detail-value">{selectedTrade.pre_trade_stress || '-'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">کنترل هیجان هنگام ورود</span>
                      <span className="detail-value">{selectedTrade.entry_emotion_control || '-'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">واکنش به سود</span>
                      <span className="detail-value">{selectedTrade.reaction_to_profit || '-'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">مدیریت انتظار</span>
                      <span className="detail-value">{selectedTrade.expectation_management || '-'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">کنترل احساسات پس از ضرر</span>
                      <span className="detail-value">{selectedTrade.emotion_after_losses || '-'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">احساسات</span>
                      <span className="detail-value">
                        {Object.keys(selectedTrade)
                          .filter(key => ['focus', 'calm', 'excited', 'fear', 'greed', 'relaxed', 'happy', 'sad', 'energetic', 'tired', 'fomo', 'patience', 'contentment'].includes(key) && selectedTrade[key])
                          .map(key => {
                            const labels = { focus: 'تمرکز', calm: 'آرامش', excited: 'هیجان', fear: 'ترس', greed: 'طمع', relaxed: 'ریلکس', happy: 'خوشحال', sad: 'غمگین', energetic: 'پرانرژی', tired: 'خسته', fomo: 'FOMO', patience: 'صبر', contentment: 'قناعت' };
                            return <span key={key} className="emotion-badge">{labels[key]}</span>;
                          }) || '-'}
                      </span>
                    </div>
                  </div>
                )}

                {/* تب چک‌لیست */}
                {activeTab === 'checklist' && (
                  <div className="tab-panel">
                    <div className="detail-row">
                      <span className="detail-label">SMT تایید شد</span>
                      <span className={`detail-value ${selectedTrade.smt_confirmed ? 'checked' : 'unchecked'}`}>
                        {selectedTrade.smt_confirmed ? '✅ بله' : '❌ خیر'}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">سطوح کلیدی بررسی شد</span>
                      <span className={`detail-value ${selectedTrade.key_levels_reviewed ? 'checked' : 'unchecked'}`}>
                        {selectedTrade.key_levels_reviewed ? '✅ بله' : '❌ خیر'}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">حمایت BOND/DXY</span>
                      <span className={`detail-value ${selectedTrade.bond_dxy_support ? 'checked' : 'unchecked'}`}>
                        {selectedTrade.bond_dxy_support ? '✅ بله' : '❌ خیر'}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">اخبار هفتگی چاپ شد</span>
                      <span className={`detail-value ${selectedTrade.weekly_news_printed ? 'checked' : 'unchecked'}`}>
                        {selectedTrade.weekly_news_printed ? '✅ بله' : '❌ خیر'}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">ساعت صفر مشخص شد</span>
                      <span className={`detail-value ${selectedTrade.zero_hour_identified ? 'checked' : 'unchecked'}`}>
                        {selectedTrade.zero_hour_identified ? '✅ بله' : '❌ خیر'}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">رنج آسیا مشخص شد</span>
                      <span className={`detail-value ${selectedTrade.asian_range_identified ? 'checked' : 'unchecked'}`}>
                        {selectedTrade.asian_range_identified ? '✅ بله' : '❌ خیر'}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">رنج لندن مشخص شد</span>
                      <span className={`detail-value ${selectedTrade.london_range_identified ? 'checked' : 'unchecked'}`}>
                        {selectedTrade.london_range_identified ? '✅ بله' : '❌ خیر'}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Judas LO مشخص شد</span>
                      <span className={`detail-value ${selectedTrade.judas_lo_identified ? 'checked' : 'unchecked'}`}>
                        {selectedTrade.judas_lo_identified ? '✅ بله' : '❌ خیر'}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">توضیحات تکمیلی</span>
                      <span className="detail-value">{selectedTrade.checklist_extra || '-'}</span>
                    </div>
                  </div>
                )}

                {/* تب بازبینی */}
                {activeTab === 'review' && (
                  <div className="tab-panel">
                    <div className="detail-row">
                      <span className="detail-label">کد اشتباه</span>
                      <span className="detail-value">{selectedTrade.mistake_code || 'بدون اشتباه'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">وزن اشتباه</span>
                      <span className="detail-value">{selectedTrade.mistake_weight || '-'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">پایبندی به حد ضرر</span>
                      <span className={`detail-value ${selectedTrade.stop_loss_adherence ? 'checked' : 'unchecked'}`}>
                        {selectedTrade.stop_loss_adherence ? '✅ بله' : '❌ خیر'}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">پایبندی به استراتژی</span>
                      <span className={`detail-value ${selectedTrade.strategy_adherence ? 'checked' : 'unchecked'}`}>
                        {selectedTrade.strategy_adherence ? '✅ بله' : '❌ خیر'}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">پایبندی به مدیریت سرمایه</span>
                      <span className={`detail-value ${selectedTrade.capital_management_adherence ? 'checked' : 'unchecked'}`}>
                        {selectedTrade.capital_management_adherence ? '✅ بله' : '❌ خیر'}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">اورترید</span>
                      <span className={`detail-value ${selectedTrade.over_trade ? 'checked' : 'unchecked'}`}>
                        {selectedTrade.over_trade ? '⚠️ بله' : '✅ خیر'}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">اسکن پس از معامله</span>
                      <span className={`detail-value ${selectedTrade.post_trade_scan ? 'checked' : 'unchecked'}`}>
                        {selectedTrade.post_trade_scan ? '✅ انجام شد' : '❌ انجام نشد'}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">دلیل ورود یادداشت شد</span>
                      <span className={`detail-value ${selectedTrade.entry_reason_written ? 'checked' : 'unchecked'}`}>
                        {selectedTrade.entry_reason_written ? '✅ بله' : '❌ خیر'}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">دلیل خروج یادداشت شد</span>
                      <span className={`detail-value ${selectedTrade.exit_reason_written ? 'checked' : 'unchecked'}`}>
                        {selectedTrade.exit_reason_written ? '✅ بله' : '❌ خیر'}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">اشتباهات ثبت شد</span>
                      <span className={`detail-value ${selectedTrade.mistakes_recorded ? 'checked' : 'unchecked'}`}>
                        {selectedTrade.mistakes_recorded ? '✅ بله' : '❌ خیر'}
                      </span>
                    </div>
                  </div>
                )}

                {/* تب ICT */}
                {activeTab === 'ict' && (
                  <div className="tab-panel">
                    <div className="detail-row">
                      <span className="detail-label">FVG</span>
                      <span className="detail-value">{selectedTrade.fvg || '-'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Order Block</span>
                      <span className="detail-value">{selectedTrade.order_block || '-'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">BOS</span>
                      <span className="detail-value">{selectedTrade.bos || '-'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">CHOCH</span>
                      <span className="detail-value">{selectedTrade.choch || '-'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">MSS</span>
                      <span className="detail-value">{selectedTrade.mss || '-'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Liquidity Sweep</span>
                      <span className="detail-value">{selectedTrade.liquidity_sweep || '-'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">POI</span>
                      <span className="detail-value">{selectedTrade.poi || '-'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Demand Zone</span>
                      <span className="detail-value">{selectedTrade.demand_zone || '-'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Supply Zone</span>
                      <span className="detail-value">{selectedTrade.supply_zone || '-'}</span>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="no-trade-selected">
              <div className="empty-icon">📭</div>
              <p>یک ترید را برای مشاهده جزئیات انتخاب کنید</p>
            </div>
          )}
        </div>
      </div>

      {/* ===== تقویم رنگی P&L ===== */}
      <PnLCalendar
        trades={trades}
        onDayClick={handleCalendarDayClick}
        selectedDate={selectedDate}
        compact={true}
      />

      {/* ===== کارت‌های آمار ===== */}
      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <span className="stat-label">کل تریدها</span>
            <span className="stat-value">{trades.length}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-info">
            <span className="stat-label">تریدهای باقیمانده</span>
            <span className={`stat-value ${subscriptionStats.remaining_trades > 0 ? 'active' : 'danger'}`}>
              {subscriptionStats.remaining_trades >= 999999 ? '∞' : subscriptionStats.remaining_trades}
            </span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🧠</div>
          <div className="stat-info">
            <span className="stat-label">مشاوره‌های باقیمانده</span>
            <span className={`stat-value ${subscriptionStats.remaining_ai_consultations > 0 ? 'active' : 'danger'}`}>
              {subscriptionStats.remaining_ai_consultations >= 999999 ? '∞' : subscriptionStats.remaining_ai_consultations}
            </span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-info">
            <span className="stat-label">روزهای باقیمانده</span>
            <span className={`stat-value ${subscriptionStats.remaining_days > 0 ? 'active' : 'danger'}`}>
              {subscriptionStats.remaining_days >= 999999 ? '∞' : `${subscriptionStats.remaining_days} روز`}
            </span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <span className="stat-label">وضعیت اشتراک</span>
            <span className={`stat-value ${subscriptionStats.is_trial ? 'trial' : subscriptionStats.plan_name !== 'بدون اشتراک' ? 'active' : 'inactive'}`}>
              {subscriptionStats.is_trial ? '🔬 آزمایشی' : subscriptionStats.plan_name}
            </span>
          </div>
        </div>
      </div>

      {/* ===== مودال‌ها ===== */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">🗑️</div>
            <h3>حذف ترید</h3>
            <p>آیا از حذف ترید <strong>{selectedTrade?.symbol}</strong> با تاریخ <strong>{selectedTrade?.trade_date}</strong> اطمینان دارید؟</p>
            <p className="modal-warning">این عمل غیرقابل بازگشت است!</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowDeleteModal(false)}>انصراف</button>
              <button className="btn-confirm-delete" onClick={confirmDelete}>حذف</button>
            </div>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div className="modal-overlay" onClick={() => setShowCategoryModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">📁</div>
            <h3>ایجاد دسته‌بندی جدید</h3>
            <div className="modal-form">
              <div className="form-group">
                <label>نام دسته‌بندی</label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="نام دسته‌بندی را وارد کنید"
                  className="modal-input"
                />
              </div>
              <div className="form-group">
                <label>آیکون</label>
                <select
                  value={newCategoryIcon}
                  onChange={(e) => setNewCategoryIcon(e.target.value)}
                  className="modal-select"
                >
                  {GROUP_ICONS.map((icon, index) => (
                    <option key={index} value={icon}>{icon}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowCategoryModal(false)}>انصراف</button>
              <button className="btn-confirm-create" onClick={handleCreateCategory}>ایجاد دسته‌بندی</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteCategoryModal && categoryToDelete && (
        <div className="modal-overlay" onClick={() => setShowDeleteCategoryModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">🗑️</div>
            <h3>حذف دسته‌بندی</h3>
            <p>آیا از حذف دسته‌بندی <strong>{categoryToDelete.name}</strong> اطمینان دارید؟</p>
            <p className="modal-warning">این عمل غیرقابل بازگشت است!</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowDeleteCategoryModal(false)}>انصراف</button>
              <button className="btn-confirm-delete" onClick={handleDeleteCategory}>حذف دسته‌بندی</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;