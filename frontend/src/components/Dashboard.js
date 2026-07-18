// frontend/src/components/Dashboard.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import SystemMessages from './SystemMessages';
import './Dashboard.css';

// لیست ۵۰ آیکون برای دسته‌بندی‌ها
const GROUP_ICONS = [
  '📁', '📊', '💱', '₿', '📈', '📉', '🏆', '⭐', '🔥', '💰',
  '🚀', '🎯', '💎', '🔮', '🌈', '⚡', '💫', '🌟', '✨', '🌙',
  '☀️', '🌍', '🌎', '🌏', '🌊', '🌋', '🌌', '🌠', '🎨', '🎪',
  '🎭', '🎵', '🎶', '🎼', '🎹', '🎸', '🎺', '🎻', '🥁', '🎧',
  '🎤', '🎬', '🎮', '🎯', '🎲', '🎳', '🎪', '🎨', '🎭', '🎫'
];

// گروه‌های نمونه (۵ عدد)
const sampleCategories = [
  { id: 1, name: 'همه تریدها', icon: '📊' },
  { id: 2, name: 'فارکس', icon: '💱' },
  { id: 3, name: 'کریپتو', icon: '₿' },
  { id: 4, name: 'شاخص‌ها', icon: '📈' },
  { id: 5, name: 'کالاها', icon: '🏆' },
];

// تریدهای تستی (۲۰ عدد)
const sampleTrades = [
  // فارکس (گروه 2) - 5 ترید
  { id: 1, category_id: 2, trade_date: '2024-01-15', symbol: 'EURUSD', trade_type: 'Buy', entry_price: 1.0850, close_price: 1.0920, profit: 70, tp_sl_hit: 'TP1', risk_reward_ratio: 2.0, execution_quality_score: 8, bias: 'Bullish', strategy_type: 'LTP', sleep_quality: 'خوب', dominant_feeling: 'آرامش', session_type: 'High Pro', timeframes: ['D1', 'H4', 'H1'], checklist: { smt_confirmed: true, key_levels_reviewed: true, bond_dxy_support: false, weekly_news_printed: true }, emotions: ['تمرکز', 'آرامش', 'صبر'] },
  { id: 2, category_id: 2, trade_date: '2024-01-16', symbol: 'GBPUSD', trade_type: 'Sell', entry_price: 1.2700, close_price: 1.2650, profit: 50, tp_sl_hit: 'TP1', risk_reward_ratio: 1.5, execution_quality_score: 7, bias: 'Bearish', strategy_type: 'ITP', sleep_quality: 'خوب', dominant_feeling: 'تمرکز', session_type: 'High Pro', timeframes: ['H4', 'H1'], checklist: { smt_confirmed: true, key_levels_reviewed: true, bond_dxy_support: true, weekly_news_printed: true }, emotions: ['تمرکز', 'صبر'] },
  { id: 3, category_id: 2, trade_date: '2024-01-20', symbol: 'USDJPY', trade_type: 'Sell', entry_price: 148.00, close_price: 147.20, profit: 80, tp_sl_hit: 'TP1', risk_reward_ratio: 2.5, execution_quality_score: 7, bias: 'Bearish', strategy_type: 'LTP', sleep_quality: 'خوب', dominant_feeling: 'صبر', session_type: 'High Pro', timeframes: ['H4', 'H1'], checklist: { smt_confirmed: true, key_levels_reviewed: true, bond_dxy_support: true, weekly_news_printed: true }, emotions: ['صبر', 'تمرکز'] },
  { id: 4, category_id: 2, trade_date: '2024-01-22', symbol: 'AUDUSD', trade_type: 'Buy', entry_price: 0.6550, close_price: 0.6600, profit: 50, tp_sl_hit: 'TP1', risk_reward_ratio: 1.8, execution_quality_score: 6, bias: 'Bullish', strategy_type: 'LTP', sleep_quality: 'متوسط', dominant_feeling: 'هیجان', session_type: 'Low Pro', timeframes: ['H1', 'M15'], checklist: { smt_confirmed: false, key_levels_reviewed: true, bond_dxy_support: false, weekly_news_printed: false }, emotions: ['هیجان', 'FOMO'] },
  { id: 5, category_id: 2, trade_date: '2024-01-25', symbol: 'EURGBP', trade_type: 'Sell', entry_price: 0.8550, close_price: 0.8500, profit: 50, tp_sl_hit: 'TP1', risk_reward_ratio: 1.5, execution_quality_score: 6, bias: 'Bearish', strategy_type: 'STP', sleep_quality: 'متوسط', dominant_feeling: 'استرس', session_type: 'Low Pro', timeframes: ['H1', 'M5'], checklist: { smt_confirmed: false, key_levels_reviewed: false, bond_dxy_support: false, weekly_news_printed: false }, emotions: ['استرس', 'ترس'] },
  // کریپتو (گروه 3) - 5 ترید
  { id: 6, category_id: 3, trade_date: '2024-01-18', symbol: 'BTCUSD', trade_type: 'Buy', entry_price: 43000.00, close_price: 44500.00, profit: 1500, tp_sl_hit: 'TP3', risk_reward_ratio: 4.0, execution_quality_score: 10, bias: 'Bullish', strategy_type: 'LTP', sleep_quality: 'خوب', dominant_feeling: 'آرامش', session_type: 'High Pro', timeframes: ['D1', 'H4', 'H1', 'M15'], checklist: { smt_confirmed: true, key_levels_reviewed: true, bond_dxy_support: true, weekly_news_printed: true }, emotions: ['تمرکز', 'آرامش', 'صبر', 'قناعت'] },
  { id: 7, category_id: 3, trade_date: '2024-01-23', symbol: 'ETHUSD', trade_type: 'Buy', entry_price: 3200.00, close_price: 3350.00, profit: 150, tp_sl_hit: 'TP1', risk_reward_ratio: 1.5, execution_quality_score: 6, bias: 'Bullish', strategy_type: 'LTP', sleep_quality: 'متوسط', dominant_feeling: 'هیجان', session_type: 'Low Pro', timeframes: ['H1', 'M15'], checklist: { smt_confirmed: false, key_levels_reviewed: true, bond_dxy_support: false, weekly_news_printed: false }, emotions: ['هیجان', 'FOMO'] },
  { id: 8, category_id: 3, trade_date: '2024-01-26', symbol: 'SOLUSD', trade_type: 'Sell', entry_price: 98.50, close_price: 95.00, profit: 35, tp_sl_hit: 'TP1', risk_reward_ratio: 2.0, execution_quality_score: 7, bias: 'Bearish', strategy_type: 'ITP', sleep_quality: 'خوب', dominant_feeling: 'تمرکز', session_type: 'High Pro', timeframes: ['H4', 'H1'], checklist: { smt_confirmed: true, key_levels_reviewed: true, bond_dxy_support: false, weekly_news_printed: true }, emotions: ['تمرکز', 'صبر'] },
  { id: 9, category_id: 3, trade_date: '2024-01-28', symbol: 'ADAUSD', trade_type: 'Buy', entry_price: 0.48, close_price: 0.52, profit: 40, tp_sl_hit: 'TP1', risk_reward_ratio: 2.5, execution_quality_score: 7, bias: 'Bullish', strategy_type: 'LTP', sleep_quality: 'خوب', dominant_feeling: 'آرامش', session_type: 'High Pro', timeframes: ['H4', 'H1'], checklist: { smt_confirmed: true, key_levels_reviewed: true, bond_dxy_support: true, weekly_news_printed: true }, emotions: ['آرامش', 'صبر'] },
  { id: 10, category_id: 3, trade_date: '2024-01-30', symbol: 'XRPUSD', trade_type: 'Sell', entry_price: 0.52, close_price: 0.50, profit: 20, tp_sl_hit: 'TP1', risk_reward_ratio: 2.0, execution_quality_score: 6, bias: 'Bearish', strategy_type: 'LTP', sleep_quality: 'خوب', dominant_feeling: 'تمرکز', session_type: 'High Pro', timeframes: ['H4', 'H1'], checklist: { smt_confirmed: true, key_levels_reviewed: false, bond_dxy_support: false, weekly_news_printed: true }, emotions: ['تمرکز', 'صبر'] },
  // شاخص‌ها (گروه 4) - 5 ترید
  { id: 11, category_id: 4, trade_date: '2024-01-17', symbol: 'NAS100', trade_type: 'Buy', entry_price: 17500.00, close_price: 17450.00, profit: -50, tp_sl_hit: 'SL', risk_reward_ratio: 1.5, execution_quality_score: 5, bias: 'Neutral', strategy_type: 'STP', sleep_quality: 'متوسط', dominant_feeling: 'استرس', session_type: 'Low Pro', timeframes: ['H1', 'M15'], checklist: { smt_confirmed: false, key_levels_reviewed: true, bond_dxy_support: false, weekly_news_printed: true }, emotions: ['استرس', 'هیجان'] },
  { id: 12, category_id: 4, trade_date: '2024-01-25', symbol: 'SPX500', trade_type: 'Sell', entry_price: 4780.00, close_price: 4750.00, profit: 30, tp_sl_hit: 'TP1', risk_reward_ratio: 1.8, execution_quality_score: 6, bias: 'Bearish', strategy_type: 'ITP', sleep_quality: 'خوب', dominant_feeling: 'تمرکز', session_type: 'High Pro', timeframes: ['H4', 'H1'], checklist: { smt_confirmed: true, key_levels_reviewed: true, bond_dxy_support: true, weekly_news_printed: true }, emotions: ['تمرکز', 'صبر'] },
  { id: 13, category_id: 4, trade_date: '2024-01-27', symbol: 'DAX40', trade_type: 'Buy', entry_price: 16800.00, close_price: 16950.00, profit: 150, tp_sl_hit: 'TP2', risk_reward_ratio: 2.0, execution_quality_score: 8, bias: 'Bullish', strategy_type: 'LTP', sleep_quality: 'خوب', dominant_feeling: 'آرامش', session_type: 'High Pro', timeframes: ['D1', 'H4', 'H1'], checklist: { smt_confirmed: true, key_levels_reviewed: true, bond_dxy_support: true, weekly_news_printed: true }, emotions: ['تمرکز', 'آرامش'] },
  { id: 14, category_id: 4, trade_date: '2024-01-29', symbol: 'UK100', trade_type: 'Sell', entry_price: 7650.00, close_price: 7600.00, profit: 50, tp_sl_hit: 'TP1', risk_reward_ratio: 2.2, execution_quality_score: 7, bias: 'Bearish', strategy_type: 'LTP', sleep_quality: 'خوب', dominant_feeling: 'صبر', session_type: 'High Pro', timeframes: ['H4', 'H1'], checklist: { smt_confirmed: true, key_levels_reviewed: true, bond_dxy_support: true, weekly_news_printed: true }, emotions: ['صبر', 'تمرکز'] },
  { id: 15, category_id: 4, trade_date: '2024-01-31', symbol: 'JPN225', trade_type: 'Buy', entry_price: 36000.00, close_price: 36200.00, profit: 200, tp_sl_hit: 'TP1', risk_reward_ratio: 2.5, execution_quality_score: 8, bias: 'Bullish', strategy_type: 'ITP', sleep_quality: 'خوب', dominant_feeling: 'آرامش', session_type: 'High Pro', timeframes: ['D1', 'H4'], checklist: { smt_confirmed: true, key_levels_reviewed: true, bond_dxy_support: true, weekly_news_printed: true }, emotions: ['آرامش', 'تمرکز'] },
  // کالاها (گروه 5) - 5 ترید
  { id: 16, category_id: 5, trade_date: '2024-01-19', symbol: 'XAUUSD', trade_type: 'Buy', entry_price: 2020.00, close_price: 2045.00, profit: 250, tp_sl_hit: 'TP2', risk_reward_ratio: 2.5, execution_quality_score: 8, bias: 'Bullish', strategy_type: 'ITP', sleep_quality: 'خوب', dominant_feeling: 'آرامش', session_type: 'High Pro', timeframes: ['D1', 'H4', 'H1'], checklist: { smt_confirmed: true, key_levels_reviewed: true, bond_dxy_support: false, weekly_news_printed: true }, emotions: ['تمرکز', 'آرامش', 'صبر'] },
  { id: 17, category_id: 5, trade_date: '2024-01-21', symbol: 'XAUUSD', trade_type: 'Sell', entry_price: 2050.00, close_price: 2035.00, profit: 150, tp_sl_hit: 'TP2', risk_reward_ratio: 3.0, execution_quality_score: 9, bias: 'Bearish', strategy_type: 'ITP', sleep_quality: 'خوب', dominant_feeling: 'تمرکز', session_type: 'High Pro', timeframes: ['H4', 'H1', 'M15'], checklist: { smt_confirmed: true, key_levels_reviewed: true, bond_dxy_support: true, weekly_news_printed: false }, emotions: ['تمرکز', 'صبر', 'آرامش'] },
  { id: 18, category_id: 5, trade_date: '2024-01-24', symbol: 'USOIL', trade_type: 'Buy', entry_price: 72.50, close_price: 74.00, profit: 150, tp_sl_hit: 'TP1', risk_reward_ratio: 2.0, execution_quality_score: 7, bias: 'Bullish', strategy_type: 'LTP', sleep_quality: 'خوب', dominant_feeling: 'آرامش', session_type: 'High Pro', timeframes: ['H4', 'H1'], checklist: { smt_confirmed: true, key_levels_reviewed: true, bond_dxy_support: true, weekly_news_printed: true }, emotions: ['آرامش', 'صبر'] },
  { id: 19, category_id: 5, trade_date: '2024-01-26', symbol: 'XAGUSD', trade_type: 'Sell', entry_price: 22.80, close_price: 22.40, profit: 40, tp_sl_hit: 'TP1', risk_reward_ratio: 1.8, execution_quality_score: 6, bias: 'Bearish', strategy_type: 'STP', sleep_quality: 'متوسط', dominant_feeling: 'هیجان', session_type: 'Low Pro', timeframes: ['H1', 'M15'], checklist: { smt_confirmed: false, key_levels_reviewed: true, bond_dxy_support: false, weekly_news_printed: false }, emotions: ['هیجان', 'FOMO'] },
  { id: 20, category_id: 5, trade_date: '2024-01-28', symbol: 'UKOIL', trade_type: 'Sell', entry_price: 76.00, close_price: 75.20, profit: 80, tp_sl_hit: 'TP1', risk_reward_ratio: 2.0, execution_quality_score: 7, bias: 'Bearish', strategy_type: 'LTP', sleep_quality: 'خوب', dominant_feeling: 'تمرکز', session_type: 'High Pro', timeframes: ['H4', 'H1'], checklist: { smt_confirmed: true, key_levels_reviewed: true, bond_dxy_support: true, weekly_news_printed: true }, emotions: ['تمرکز', 'صبر'] }
];

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [trades, setTrades] = useState([]);
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showDeleteCategoryModal, setShowDeleteCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('📁');
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [forceSampleData, setForceSampleData] = useState(true);

  // بارگذاری داده‌ها
  useEffect(() => {
    const loadData = () => {
      try {
        if (forceSampleData) {
          setCategories(sampleCategories);
          setSelectedCategory(sampleCategories[0]);
          setTrades(sampleTrades);
          setSelectedTrade(sampleTrades[0]);
          localStorage.setItem('categories', JSON.stringify(sampleCategories));
          localStorage.setItem('trades', JSON.stringify(sampleTrades));
          setLoading(false);
          return;
        }

        const savedTrades = localStorage.getItem('trades');
        const savedCategories = localStorage.getItem('categories');

        if (savedTrades && savedCategories) {
          const parsedTrades = JSON.parse(savedTrades);
          const parsedCategories = JSON.parse(savedCategories);
          setTrades(parsedTrades);
          setCategories(parsedCategories);
          setSelectedCategory(parsedCategories[0]);
          if (parsedTrades.length > 0) {
            setSelectedTrade(parsedTrades[0]);
          }
        } else {
          setCategories(sampleCategories);
          setSelectedCategory(sampleCategories[0]);
          setTrades(sampleTrades);
          setSelectedTrade(sampleTrades[0]);
          localStorage.setItem('categories', JSON.stringify(sampleCategories));
          localStorage.setItem('trades', JSON.stringify(sampleTrades));
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setCategories(sampleCategories);
        setSelectedCategory(sampleCategories[0]);
        setTrades(sampleTrades);
        setSelectedTrade(sampleTrades[0]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [forceSampleData]);

  const getTradeCount = (categoryId) => {
    if (categoryId === 1) {
      return trades.length;
    }
    return trades.filter(t => t.category_id === categoryId).length;
  };

  const handleCategorySelect = (category) => {
    if (selectedCategory?.id !== category.id) {
      setSelectedCategory(category);
      setSelectedTrade(null);
    }
  };

  const handleTradeSelect = (trade) => {
    setSelectedTrade(trade);
  };

  const handleEditTrade = () => {
    if (selectedTrade) {
      localStorage.setItem('editTradeId', selectedTrade.id.toString());
      navigate('/trades/edit');
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (selectedTrade) {
      const updatedTrades = trades.filter(t => t.id !== selectedTrade.id);
      setTrades(updatedTrades);
      localStorage.setItem('trades', JSON.stringify(updatedTrades));

      const remainingTrades = updatedTrades.filter(t =>
        t.category_id === selectedCategory.id || selectedCategory.id === 1
      );
      if (remainingTrades.length > 0) {
        setSelectedTrade(remainingTrades[0]);
      } else {
        setSelectedTrade(null);
      }
      setShowDeleteModal(false);
    }
  };

  const handleAddCategory = () => {
    setShowCategoryModal(true);
  };

  const handleDeleteCategory = () => {
    if (!categoryToDelete) return;

    const categoryTrades = trades.filter(t => t.category_id === categoryToDelete.id);
    if (categoryTrades.length > 0) {
      alert(`⚠️ این دسته‌بندی دارای ${categoryTrades.length} ترید است. برای حذف دسته‌بندی، ابتدا تمام تریدهای آن را حذف کنید.`);
      setShowDeleteCategoryModal(false);
      setCategoryToDelete(null);
      return;
    }

    const updatedCategories = categories.filter(c => c.id !== categoryToDelete.id);
    setCategories(updatedCategories);
    localStorage.setItem('categories', JSON.stringify(updatedCategories));

    if (updatedCategories.length > 0) {
      setSelectedCategory(updatedCategories[0]);
    }

    setShowDeleteCategoryModal(false);
    setCategoryToDelete(null);
  };

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) {
      alert('لطفاً نام دسته‌بندی را وارد کنید');
      return;
    }

    if (categories.some(c => c.name === newCategoryName.trim())) {
      alert('این نام قبلاً استفاده شده است');
      return;
    }

    const newCategory = {
      id: categories.length + 1,
      name: newCategoryName.trim(),
      icon: newCategoryIcon
    };

    setCategories([...categories, newCategory]);
    setShowCategoryModal(false);
    setNewCategoryName('');
    setNewCategoryIcon('📁');
  };

  // ============================================
  // توابع چاپ و اکسل برای ترید فعال
  // ============================================
  const handlePrintTrade = () => {
    if (!selectedTrade) {
      alert('لطفاً یک ترید را انتخاب کنید');
      return;
    }
    window.print();
  };

  const handleExportTradeExcel = () => {
    if (!selectedTrade) {
      alert('لطفاً یک ترید را انتخاب کنید');
      return;
    }

    const trade = selectedTrade;
    const categoryName = categories.find(c => c.id === trade.category_id)?.name || '';
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

    const row = [
      trade.trade_date, trade.symbol, trade.trade_type === 'Buy' ? 'خرید' : 'فروش', categoryName,
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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const tabs = [
    { id: 'general', label: '📋 عمومی' },
    { id: 'execution', label: '💰 اجرا' },
    { id: 'psychology', label: '🧠 روانشناسی' },
    { id: 'checklist', label: '✅ چک‌لیست' },
    { id: 'review', label: '🔄 بازبینی' },
    { id: 'ict', label: '📊 ICT' },
  ];

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner">⏳</div>
        <p>در حال بارگذاری...</p>
      </div>
    );
  }

  return (
    <div className={`dashboard-new ${isDark ? 'dark' : 'light'}`}>
      <header className="dashboard-header">
        <div className="header-left">
          <h1>📊 ژورنال حرفه‌ای ترید <span className="header-version">v1.4.1</span></h1>
        </div>
        <div className="header-right">
          <button className="theme-toggle" onClick={() => {}}>{isDark ? '☀️' : '🌙'}</button>
          <button className="logout-btn" onClick={handleLogout}>خروج</button>
        </div>
      </header>

      <div className="quick-actions">
        <button className="action-btn primary" onClick={() => navigate('/trades/new')}><span className="action-icon">➕</span><span>ترید جدید</span></button>
        <button className="action-btn secondary" onClick={() => navigate('/trades')}><span className="action-icon">📋</span><span>لیست تریدها</span></button>
        <button className="action-btn warning" onClick={() => navigate('/reports')}><span className="action-icon">📊</span><span>تحلیل تریدها</span></button>
        <button className="action-btn info" onClick={() => navigate('/profile')}><span className="action-icon">👤</span><span>پروفایل</span></button>
      </div>

      <SystemMessages />

      <div className="three-column-layout">
        <div className="col-groups">
          <div className="col-header">
            <h3>📁 دسته‌بندی‌ها</h3>
            <div className="group-actions">
              <button className="btn-add-group" onClick={handleAddCategory} title="افزودن دسته‌بندی">+</button>
              <button className="btn-delete-group" onClick={() => { if (selectedCategory && selectedCategory.id !== 1) { setCategoryToDelete(selectedCategory); setShowDeleteCategoryModal(true); } else { alert('دسته‌بندی "همه تریدها" قابل حذف نیست'); } }} title="حذف دسته‌بندی">−</button>
            </div>
          </div>
          <div className="groups-list">
            {categories.map(category => (
              <div key={category.id} className={`group-item ${selectedCategory?.id === category.id ? 'active' : ''}`} onClick={() => handleCategorySelect(category)}>
                <span className="group-icon">{category.icon}</span>
                <span className="group-name">{category.name}</span>
                <span className="group-count">{getTradeCount(category.id)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="col-trades">
          <div className="col-header">
            <h3>📈 تریدها</h3>
            <span className="trade-count">{trades.filter(t => t.category_id === selectedCategory?.id || selectedCategory?.id === 1).length} عدد</span>
          </div>
          <div className="trades-list">
            {trades.filter(t => t.category_id === selectedCategory?.id || selectedCategory?.id === 1).length === 0 ? (
              <div className="empty-trades"><p>هیچ تریدی در این دسته‌بندی وجود ندارد</p></div>
            ) : (
              trades.filter(t => t.category_id === selectedCategory?.id || selectedCategory?.id === 1).map(trade => (
                <div key={trade.id} className={`trade-item ${selectedTrade?.id === trade.id ? 'active' : ''}`} onClick={() => handleTradeSelect(trade)}>
                  <div className="trade-item-header"><span className="trade-symbol">{trade.symbol}</span><span className={`trade-type ${trade.trade_type === 'Buy' ? 'buy' : 'sell'}`}>{trade.trade_type === 'Buy' ? 'خرید' : 'فروش'}</span></div>
                  <div className="trade-item-info"><span className="trade-date">{trade.trade_date}</span><span className={`trade-profit ${trade.profit >= 0 ? 'positive' : 'negative'}`}>{trade.profit >= 0 ? '+' : ''}{trade.profit}$</span></div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="col-details">
          {selectedTrade ? (
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
                {tabs.map(tab => (<button key={tab.id} className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>))}
              </div>
              <div className="detail-content">
                {activeTab === 'general' && (
                  <div className="tab-panel">
                    <div className="detail-row"><span className="detail-label">نماد</span><span className="detail-value">{selectedTrade.symbol}</span></div>
                    <div className="detail-row"><span className="detail-label">تاریخ</span><span className="detail-value">{selectedTrade.trade_date}</span></div>
                    <div className="detail-row"><span className="detail-label">نوع</span><span className={`detail-value ${selectedTrade.trade_type === 'Buy' ? 'buy' : 'sell'}`}>{selectedTrade.trade_type === 'Buy' ? 'خرید' : 'فروش'}</span></div>
                    <div className="detail-row"><span className="detail-label">دسته‌بندی</span><span className="detail-value">{categories.find(c => c.id === selectedTrade.category_id)?.name || '-'}</span></div>
                    <div className="detail-row"><span className="detail-label">سود/زیان</span><span className={`detail-value ${selectedTrade.profit >= 0 ? 'profit' : 'loss'}`}>{selectedTrade.profit >= 0 ? '+' : ''}{selectedTrade.profit}$</span></div>
                    <div className="detail-row"><span className="detail-label">کیفیت اجرا</span><span className={`detail-value quality-${selectedTrade.execution_quality_score >= 7 ? 'high' : selectedTrade.execution_quality_score >= 4 ? 'medium' : 'low'}`}>{selectedTrade.execution_quality_score}/10</span></div>
                  </div>
                )}
                {activeTab === 'ict' && (
                  <div className="tab-panel">
                    <div className="detail-row"><span className="detail-label">FVG</span><span className="detail-value">{selectedTrade.fvg || '-'}</span></div>
                    <div className="detail-row"><span className="detail-label">Order Block</span><span className="detail-value">{selectedTrade.order_block || '-'}</span></div>
                    <div className="detail-row"><span className="detail-label">BOS</span><span className="detail-value">{selectedTrade.bos || '-'}</span></div>
                    <div className="detail-row"><span className="detail-label">CHOCH</span><span className="detail-value">{selectedTrade.choch || '-'}</span></div>
                    <div className="detail-row"><span className="detail-label">MSS</span><span className="detail-value">{selectedTrade.mss || '-'}</span></div>
                    <div className="detail-row"><span className="detail-label">Liquidity Sweep</span><span className="detail-value">{selectedTrade.liquidity_sweep || '-'}</span></div>
                    <div className="detail-row"><span className="detail-label">POI</span><span className="detail-value">{selectedTrade.poi || '-'}</span></div>
                    <div className="detail-row"><span className="detail-label">Demand Zone</span><span className="detail-value">{selectedTrade.demand_zone || '-'}</span></div>
                    <div className="detail-row"><span className="detail-label">Supply Zone</span><span className="detail-value">{selectedTrade.supply_zone || '-'}</span></div>
                  </div>
                )}
                {activeTab !== 'general' && activeTab !== 'ict' && (
                  <div className="tab-panel"><p>اطلاعات بیشتر در تب‌های دیگر</p></div>
                )}
              </div>
            </>
          ) : (
            <div className="no-trade-selected"><div className="empty-icon">📭</div><p>یک ترید را برای مشاهده جزئیات انتخاب کنید</p></div>
          )}
        </div>
      </div>

      <div className="stats-cards">
        <div className="stat-card"><div className="stat-icon">📅</div><div className="stat-info"><span className="stat-label">روزهای باقیمانده</span><span className="stat-value">۲۵</span></div></div>
        <div className="stat-card"><div className="stat-icon">📈</div><div className="stat-info"><span className="stat-label">تریدهای باقیمانده</span><span className="stat-value">۴۵</span></div></div>
        <div className="stat-card"><div className="stat-icon">✅</div><div className="stat-info"><span className="stat-label">وضعیت اشتراک</span><span className="stat-value active">فعال</span></div></div>
        <div className="stat-card"><div className="stat-icon">📊</div><div className="stat-info"><span className="stat-label">کل تریدها</span><span className="stat-value">{trades.length}</span></div></div>
      </div>

      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">🗑️</div>
            <h3>حذف ترید</h3>
            <p>آیا از حذف ترید <strong> {selectedTrade?.symbol}</strong> با تاریخ <strong>{selectedTrade?.trade_date}</strong> اطمینان دارید؟</p>
            <p className="modal-warning">این عمل غیرقابل بازگشت است!</p>
            <div className="modal-actions"><button className="btn-cancel" onClick={() => setShowDeleteModal(false)}>انصراف</button><button className="btn-confirm-delete" onClick={confirmDelete}>حذف</button></div>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div className="modal-overlay" onClick={() => setShowCategoryModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">📁</div>
            <h3>ایجاد دسته‌بندی جدید</h3>
            <div className="modal-form"><div className="form-group"><label>نام دسته‌بندی</label><input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="نام دسته‌بندی را وارد کنید" className="modal-input" /></div><div className="form-group"><label>آیکون</label><select value={newCategoryIcon} onChange={(e) => setNewCategoryIcon(e.target.value)} className="modal-select">{GROUP_ICONS.map((icon, index) => (<option key={index} value={icon}>{icon}</option>))}</select></div></div>
            <div className="modal-actions"><button className="btn-cancel" onClick={() => setShowCategoryModal(false)}>انصراف</button><button className="btn-confirm-create" onClick={handleCreateCategory}>ایجاد دسته‌بندی</button></div>
          </div>
        </div>
      )}

      {showDeleteCategoryModal && categoryToDelete && (
        <div className="modal-overlay" onClick={() => setShowDeleteCategoryModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">🗑️</div>
            <h3>حذف دسته‌بندی</h3>
            <p>آیا از حذف دسته‌بندی <strong> {categoryToDelete.name}</strong> اطمینان دارید؟</p>
            {trades.filter(t => t.category_id === categoryToDelete.id).length > 0 && (<p className="modal-warning">⚠️ توجه: این دسته‌بندی دارای {trades.filter(t => t.category_id === categoryToDelete.id).length} ترید است. برای حذف دسته‌بندی، ابتدا تمام تریدهای آن را حذف کنید.</p>)}
            <div className="modal-actions"><button className="btn-cancel" onClick={() => setShowDeleteCategoryModal(false)}>انصراف</button><button className="btn-confirm-delete" onClick={handleDeleteCategory}>حذف دسته‌بندی</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;