// frontend/src/components/TradeList.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import './TradeList.css';

const TradeList = () => {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [trades, setTrades] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    symbol: '',
    type: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    category: ''
  });
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // بارگذاری داده‌ها
  useEffect(() => {
    const loadData = () => {
      try {
        const savedTrades = localStorage.getItem('trades');
        const savedCategories = localStorage.getItem('categories');

        if (savedTrades) {
          setTrades(JSON.parse(savedTrades));
        } else {
          setTrades([]);
        }

        if (savedCategories) {
          setCategories(JSON.parse(savedCategories));
        } else {
          setCategories([{ id: 1, name: 'همه تریدها', icon: '📊' }]);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setTrades([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // ذخیره داده‌ها در localStorage
  useEffect(() => {
    if (trades.length > 0) {
      localStorage.setItem('trades', JSON.stringify(trades));
    }
  }, [trades]);

  // ============================================
  // تابع چاپ تک ترید
  // ============================================
  const printTrade = (trade) => {
    if (!trade) return;

    const categoryName = categories.find(c => c.id === trade.category_id)?.name || '-';

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      alert('لطفاً pop-up را فعال کنید');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="fa">
      <head>
        <meta charset="UTF-8">
        <title>جزئیات ترید - ${trade.symbol}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Vazir', 'Segoe UI', Tahoma, sans-serif; 
            padding: 25px; 
            background: #fff; 
            color: #333;
            direction: rtl;
          }
          .print-header {
            text-align: center;
            padding-bottom: 15px;
            border-bottom: 3px solid #1a237e;
            margin-bottom: 15px;
          }
          .print-header h1 {
            font-size: 22px;
            color: #1a237e;
          }
          .print-header p {
            color: #666;
            font-size: 13px;
            margin-top: 4px;
          }
          .trade-title {
            background: #1a237e;
            color: white;
            padding: 10px 18px;
            border-radius: 8px;
            margin-bottom: 15px;
            font-size: 18px;
            font-weight: 700;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .trade-title .profit {
            font-size: 16px;
          }
          .trade-title .profit.positive { color: #a5d6a7; }
          .trade-title .profit.negative { color: #ef9a9a; }
          .section {
            margin-bottom: 15px;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            overflow: hidden;
          }
          .section-title {
            background: #e8eaf6;
            padding: 8px 14px;
            font-weight: 700;
            color: #1a237e;
            border-bottom: 1px solid #e0e0e0;
            font-size: 14px;
          }
          .section-body {
            padding: 10px 14px;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            border-bottom: 1px solid #f5f5f5;
            font-size: 13px;
          }
          .detail-row:last-child {
            border-bottom: none;
          }
          .detail-label {
            color: #666;
          }
          .detail-value {
            font-weight: 600;
          }
          .detail-value.positive { color: #2e7d32; }
          .detail-value.negative { color: #c62828; }
          .detail-value.buy { color: #2e7d32; }
          .detail-value.sell { color: #c62828; }
          .detail-value.checked { color: #2e7d32; }
          .detail-value.unchecked { color: #c62828; }
          .badge {
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
          }
          .badge.success { background: #e8f5e9; color: #2e7d32; }
          .badge.danger { background: #ffebee; color: #c62828; }
          .badge.warning { background: #fff3e0; color: #e65100; }
          .emotion-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            background: #fce4ec;
            color: #c62828;
            margin: 2px 3px;
          }
          .tf-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 10px;
            background: #e3f2fd;
            color: #0d47a1;
            margin: 2px 3px;
          }
          .print-footer {
            text-align: center;
            padding-top: 15px;
            border-top: 1px solid #e0e0e0;
            margin-top: 15px;
            color: #999;
            font-size: 11px;
          }
          @media print {
            body { padding: 12px; }
          }
        </style>
      </head>
      <body>
        <div class="print-header">
          <h1>📊 ژورنال حرفه‌ای ترید</h1>
          <p>گزارش جزئیات ترید</p>
        </div>

        <div class="trade-title">
          <span>${trade.symbol} - ${trade.trade_type === 'Buy' ? 'خرید' : 'فروش'} (${trade.trade_date})</span>
          <span class="profit ${trade.profit >= 0 ? 'positive' : 'negative'}">
            سود: ${trade.profit >= 0 ? '+' : ''}${trade.profit}$
          </span>
        </div>

        <!-- بخش 1: اطلاعات عمومی -->
        <div class="section">
          <div class="section-title">📋 اطلاعات عمومی</div>
          <div class="section-body">
            <div class="detail-row"><span class="detail-label">نماد</span><span class="detail-value">${trade.symbol}</span></div>
            <div class="detail-row"><span class="detail-label">تاریخ معامله</span><span class="detail-value">${trade.trade_date}</span></div>
            <div class="detail-row"><span class="detail-label">نوع ترید</span><span class="detail-value ${trade.trade_type === 'Buy' ? 'buy' : 'sell'}">${trade.trade_type === 'Buy' ? 'خرید' : 'فروش'}</span></div>
            <div class="detail-row"><span class="detail-label">دسته‌بندی</span><span class="detail-value">${categoryName}</span></div>
            <div class="detail-row"><span class="detail-label">نوع جلسه</span><span class="detail-value">${trade.session_type || '-'}</span></div>
            <div class="detail-row"><span class="detail-label">ساعت (نیویورک)</span><span class="detail-value">${trade.time_ny || '-'}</span></div>
            <div class="detail-row"><span class="detail-label">روز هفته</span><span class="detail-value">${trade.day_of_week || '-'}</span></div>
            <div class="detail-row"><span class="detail-label">بایاس</span><span class="detail-value">${trade.bias === 'Bullish' ? '📈 صعودی' : trade.bias === 'Bearish' ? '📉 نزولی' : trade.bias === 'Neutral' ? '⚖️ خنثی' : '-'}</span></div>
            <div class="detail-row"><span class="detail-label">استراتژی</span><span class="detail-value">${trade.strategy_type || '-'}</span></div>
            <div class="detail-row"><span class="detail-label">مدل ورودی</span><span class="detail-value">${trade.retirement_model || '-'}</span></div>
            <div class="detail-row"><span class="detail-label">تایم‌فریم‌ها</span><span class="detail-value">${trade.timeframes?.map(tf => '<span class="tf-badge">' + tf + '</span>').join(' ') || '-'}</span></div>
          </div>
        </div>

        <!-- بخش 2: وضعیت روحی و ذهنی -->
        <div class="section">
          <div class="section-title">🧠 وضعیت روحی و ذهنی</div>
          <div class="section-body">
            <div class="detail-row"><span class="detail-label">کیفیت خواب</span><span class="detail-value">${trade.sleep_quality || '-'}</span></div>
            <div class="detail-row"><span class="detail-label">تغذیه مناسب</span><span class="detail-value ${trade.food_status ? 'checked' : 'unchecked'}">${trade.food_status ? '✅ بله' : '❌ خیر'}</span></div>
            <div class="detail-row"><span class="detail-label">احساسات</span><span class="detail-value">${trade.emotions?.map(e => '<span class="emotion-badge">' + e + '</span>').join(' ') || '-'}</span></div>
            <div class="detail-row"><span class="detail-label">احساس غالب</span><span class="detail-value">${trade.dominant_feeling || '-'}</span></div>
            <div class="detail-row"><span class="detail-label">استرس قبل معامله</span><span class="detail-value">${trade.pre_trade_stress || '-'}</span></div>
            <div class="detail-row"><span class="detail-label">کنترل هیجان هنگام ورود</span><span class="detail-value">${trade.entry_emotion_control || '-'}</span></div>
          </div>
        </div>

        <!-- بخش 3: جزئیات اجرا -->
        <div class="section">
          <div class="section-title">💰 جزئیات اجرا</div>
          <div class="section-body">
            <div class="detail-row"><span class="detail-label">قیمت ورود</span><span class="detail-value">${trade.entry_price || '-'}</span></div>
            <div class="detail-row"><span class="detail-label">قیمت خروج</span><span class="detail-value">${trade.close_price || '-'}</span></div>
            <div class="detail-row"><span class="detail-label">حد ضرر (SL)</span><span class="detail-value">${trade.stop_loss || '-'}</span></div>
            <div class="detail-row"><span class="detail-label">حد سود اول (TP1)</span><span class="detail-value">${trade.take_profit_1 || '-'}</span></div>
            <div class="detail-row"><span class="detail-label">حد سود دوم (TP2)</span><span class="detail-value">${trade.take_profit_2 || '-'}</span></div>
            <div class="detail-row"><span class="detail-label">حد سود سوم (TP3)</span><span class="detail-value">${trade.take_profit_3 || '-'}</span></div>
            <div class="detail-row"><span class="detail-label">حد خورده شده</span><span class="detail-value">${trade.tp_sl_hit ? '<span class="badge ' + (trade.tp_sl_hit === 'SL' ? 'danger' : 'success') + '">' + trade.tp_sl_hit + '</span>' : '-'}</span></div>
            <div class="detail-row"><span class="detail-label">نسبت R:R</span><span class="detail-value">${trade.risk_reward_ratio || '-'}</span></div>
            <div class="detail-row"><span class="detail-label">ریسک (دلار)</span><span class="detail-value">${trade.risk_usd || '0'}$</span></div>
            <div class="detail-row"><span class="detail-label">درصد ریسک</span><span class="detail-value">${trade.risk_percent || '0'}%</span></div>
            <div class="detail-row"><span class="detail-label">کیفیت اجرا</span><span class="detail-value">${trade.execution_quality_score || '-'}/10</span></div>
          </div>
        </div>

        <!-- بخش 4: چک‌لیست -->
        <div class="section">
          <div class="section-title">✅ چک‌لیست روزانه</div>
          <div class="section-body">
            <div class="detail-row"><span class="detail-label">SMT تایید شد</span><span class="detail-value ${trade.smt_confirmed ? 'checked' : 'unchecked'}">${trade.smt_confirmed ? '✅ بله' : '❌ خیر'}</span></div>
            <div class="detail-row"><span class="detail-label">سطوح کلیدی بررسی شد</span><span class="detail-value ${trade.key_levels_reviewed ? 'checked' : 'unchecked'}">${trade.key_levels_reviewed ? '✅ بله' : '❌ خیر'}</span></div>
            <div class="detail-row"><span class="detail-label">حمایت BOND/DXY</span><span class="detail-value ${trade.bond_dxy_support ? 'checked' : 'unchecked'}">${trade.bond_dxy_support ? '✅ بله' : '❌ خیر'}</span></div>
            <div class="detail-row"><span class="detail-label">اخبار هفتگی چاپ شد</span><span class="detail-value ${trade.weekly_news_printed ? 'checked' : 'unchecked'}">${trade.weekly_news_printed ? '✅ بله' : '❌ خیر'}</span></div>
            <div class="detail-row"><span class="detail-label">ساعت صفر مشخص شد</span><span class="detail-value ${trade.zero_hour_identified ? 'checked' : 'unchecked'}">${trade.zero_hour_identified ? '✅ بله' : '❌ خیر'}</span></div>
            <div class="detail-row"><span class="detail-label">رنج آسیا مشخص شد</span><span class="detail-value ${trade.asian_range_identified ? 'checked' : 'unchecked'}">${trade.asian_range_identified ? '✅ بله' : '❌ خیر'}</span></div>
            <div class="detail-row"><span class="detail-label">رنج لندن مشخص شد</span><span class="detail-value ${trade.london_range_identified ? 'checked' : 'unchecked'}">${trade.london_range_identified ? '✅ بله' : '❌ خیر'}</span></div>
            <div class="detail-row"><span class="detail-label">Judas LO مشخص شد</span><span class="detail-value ${trade.judas_lo_identified ? 'checked' : 'unchecked'}">${trade.judas_lo_identified ? '✅ بله' : '❌ خیر'}</span></div>
            <div class="detail-row"><span class="detail-label">توضیحات تکمیلی</span><span class="detail-value">${trade.checklist_extra || '-'}</span></div>
          </div>
        </div>

        <!-- بخش 5: بازبینی و اشتباهات -->
        <div class="section">
          <div class="section-title">🔄 بازبینی و اشتباهات</div>
          <div class="section-body">
            <div class="detail-row"><span class="detail-label">کد اشتباه</span><span class="detail-value">${trade.mistake_code || 'بدون اشتباه'}</span></div>
            <div class="detail-row"><span class="detail-label">وزن اشتباه</span><span class="detail-value">${trade.mistake_weight || '-'}</span></div>
            <div class="detail-row"><span class="detail-label">پایبندی به حد ضرر</span><span class="detail-value ${trade.stop_loss_adherence ? 'checked' : 'unchecked'}">${trade.stop_loss_adherence ? '✅ بله' : '❌ خیر'}</span></div>
            <div class="detail-row"><span class="detail-label">پایبندی به استراتژی</span><span class="detail-value ${trade.strategy_adherence ? 'checked' : 'unchecked'}">${trade.strategy_adherence ? '✅ بله' : '❌ خیر'}</span></div>
            <div class="detail-row"><span class="detail-label">پایبندی به مدیریت سرمایه</span><span class="detail-value ${trade.capital_management_adherence ? 'checked' : 'unchecked'}">${trade.capital_management_adherence ? '✅ بله' : '❌ خیر'}</span></div>
            <div class="detail-row"><span class="detail-label">اورترید</span><span class="detail-value ${trade.over_trade ? 'checked' : 'unchecked'}">${trade.over_trade ? '⚠️ بله' : '✅ خیر'}</span></div>
            <div class="detail-row"><span class="detail-label">اسکن پس از معامله</span><span class="detail-value ${trade.post_trade_scan ? 'checked' : 'unchecked'}">${trade.post_trade_scan ? '✅ انجام شد' : '❌ انجام نشد'}</span></div>
            <div class="detail-row"><span class="detail-label">دلیل ورود یادداشت شد</span><span class="detail-value ${trade.entry_reason_written ? 'checked' : 'unchecked'}">${trade.entry_reason_written ? '✅ بله' : '❌ خیر'}</span></div>
            <div class="detail-row"><span class="detail-label">دلیل خروج یادداشت شد</span><span class="detail-value ${trade.exit_reason_written ? 'checked' : 'unchecked'}">${trade.exit_reason_written ? '✅ بله' : '❌ خیر'}</span></div>
            <div class="detail-row"><span class="detail-label">اشتباهات ثبت شد</span><span class="detail-value ${trade.mistakes_recorded ? 'checked' : 'unchecked'}">${trade.mistakes_recorded ? '✅ بله' : '❌ خیر'}</span></div>
          </div>
        </div>

        <div class="print-footer">
          چاپ شده در تاریخ: ${new Date().toLocaleDateString('fa-IR')} - ساعت: ${new Date().toLocaleTimeString('fa-IR')}
        </div>

        <script>
          window.onload = function() { 
            setTimeout(function() { window.print(); }, 500);
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // ============================================
  // توابع مربوط به ویرایش و مشاهده
  // ============================================
  const handleViewDetails = (tradeId) => {
    localStorage.setItem('viewTradeId', tradeId.toString());
    navigate(`/trades/${tradeId}`);
  };

  const handleEditTrade = (tradeId) => {
    localStorage.setItem('editTradeId', tradeId.toString());
    navigate('/trades/edit');
  };

  const handleDoubleClick = (tradeId) => {
    handleViewDetails(tradeId);
  };

  // ============================================
  // توابع حذف
  // ============================================
  const handleDelete = (id) => {
    setSelectedTrade(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    const updatedTrades = trades.filter(t => t.id !== selectedTrade);
    setTrades(updatedTrades);
    localStorage.setItem('trades', JSON.stringify(updatedTrades));
    setShowDeleteModal(false);
    setSelectedTrade(null);
  };

  // ============================================
  // توابع چاپ و اکسل
  // ============================================
  const handlePrint = () => {
    window.print();
  };

  const handlePrintSingleTrade = (tradeId) => {
    const trade = trades.find(t => t.id === tradeId);
    if (trade) {
      printTrade(trade);
    }
  };

  const handleExportExcel = () => {
    if (filteredTrades.length === 0) {
      alert('هیچ تریدی برای خروجی وجود ندارد');
      return;
    }

    const BOM = '\uFEFF';

    const headers = [
      'تاریخ', 'نماد', 'نوع', 'دسته‌بندی', 'قیمت ورود', 'قیمت خروج',
      'سود/زیان', 'حد خورده', 'نسبت R:R', 'کیفیت اجرا', 'بایاس', 'استراتژی',
      'کیفیت خواب', 'احساس غالب', 'نوع جلسه'
    ];

    let csvContent = BOM + headers.join(',') + '\n';

    filteredTrades.forEach(trade => {
      const row = [
        trade.trade_date,
        trade.symbol,
        trade.trade_type === 'Buy' ? 'خرید' : 'فروش',
        getCategoryName(trade.category_id),
        trade.entry_price || '',
        trade.close_price || '',
        trade.profit || 0,
        trade.tp_sl_hit || '',
        trade.risk_reward_ratio || '',
        trade.execution_quality_score || '',
        trade.bias || '',
        trade.strategy_type || '',
        trade.sleep_quality || '',
        trade.dominant_feeling || '',
        trade.session_type || ''
      ];
      csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;'
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `trades_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // ============================================
  // فیلتر کردن
  // ============================================
  const handleFilterChange = (e) => {
    setFilter({ ...filter, [e.target.name]: e.target.value });
  };

  const clearFilters = () => {
    setFilter({
      symbol: '',
      type: '',
      status: '',
      dateFrom: '',
      dateTo: '',
      category: ''
    });
  };

  const filteredTrades = trades.filter(trade => {
    const matchSymbol = !filter.symbol || trade.symbol?.toLowerCase().includes(filter.symbol.toLowerCase());
    const matchType = !filter.type || trade.trade_type === filter.type;
    const matchStatus = !filter.status ||
      (filter.status === 'win' && trade.profit > 0) ||
      (filter.status === 'loss' && trade.profit < 0) ||
      (filter.status === 'breakeven' && trade.profit === 0);
    const matchDateFrom = !filter.dateFrom || trade.trade_date >= filter.dateFrom;
    const matchDateTo = !filter.dateTo || trade.trade_date <= filter.dateTo;
    const matchCategory = !filter.category ||
      (filter.category === 'all' || trade.category_id === parseInt(filter.category));
    return matchSymbol && matchType && matchStatus && matchDateFrom && matchDateTo && matchCategory;
  });

  // ============================================
  // محاسبه آمار
  // ============================================
  const totalTrades = filteredTrades.length;
  const winningTrades = filteredTrades.filter(t => t.profit > 0).length;
  const losingTrades = filteredTrades.filter(t => t.profit < 0).length;
  const totalProfit = filteredTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades * 100).toFixed(1) : 0;

  // ============================================
  // توابع کمکی نمایش
  // ============================================
  const getStatusBadge = (profit) => {
    if (profit > 0) return <span className="badge-success">✅ سود</span>;
    if (profit < 0) return <span className="badge-danger">❌ زیان</span>;
    return <span className="badge-warning">⚖️ مساوی</span>;
  };

  const getCategoryName = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat ? cat.name : 'بدون دسته‌بندی';
  };

  if (loading) {
    return (
      <div className="tradelist-container">
        <div className="loading-spinner">⏳ در حال بارگذاری...</div>
      </div>
    );
  }

  return (
    <div className={`tradelist-container ${isDark ? 'dark' : 'light'}`}>
      {/* Header */}
      <div className="tradelist-header">
        <h2>📈 لیست تریدها</h2>
        <div className="header-actions">
          <button className="btn-primary" onClick={() => navigate('/trades/new')}>
            ➕ ترید جدید
          </button>
          <button className="btn-print" onClick={handlePrint} title="چاپ لیست تریدها">
            🖨️ چاپ
          </button>
          <button className="btn-excel" onClick={handleExportExcel} title="خروجی اکسل">
            📄 اکسل
          </button>
          <button className="btn-secondary" onClick={() => navigate('/')}>
            ↩️ بازگشت
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-label">کل تریدها</span>
          <span className="stat-value">{totalTrades}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">تریدهای برنده</span>
          <span className="stat-value success">{winningTrades}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">تریدهای بازنده</span>
          <span className="stat-value danger">{losingTrades}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">سود کل</span>
          <span className={`stat-value ${totalProfit >= 0 ? 'success' : 'danger'}`}>
            ${totalProfit}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">نرخ برد</span>
          <span className="stat-value">{winRate}%</span>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="filter-group">
          <input
            type="text"
            name="symbol"
            placeholder="🔍 جستجوی نماد..."
            value={filter.symbol}
            onChange={handleFilterChange}
            className="filter-input"
          />
        </div>
        <div className="filter-group">
          <select
            name="type"
            value={filter.type}
            onChange={handleFilterChange}
            className="filter-select"
          >
            <option value="">همه نوع‌ها</option>
            <option value="Buy">خرید</option>
            <option value="Sell">فروش</option>
          </select>
        </div>
        <div className="filter-group">
          <select
            name="status"
            value={filter.status}
            onChange={handleFilterChange}
            className="filter-select"
          >
            <option value="">همه وضعیت‌ها</option>
            <option value="win">✅ برنده</option>
            <option value="loss">❌ بازنده</option>
            <option value="breakeven">⚖️ مساوی</option>
          </select>
        </div>
        <div className="filter-group">
          <select
            name="category"
            value={filter.category}
            onChange={handleFilterChange}
            className="filter-select"
          >
            <option value="">همه دسته‌بندی‌ها</option>
            {categories.filter(c => c.id !== 1).map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <input
            type="date"
            name="dateFrom"
            value={filter.dateFrom}
            onChange={handleFilterChange}
            className="filter-date"
            placeholder="از تاریخ"
          />
        </div>
        <div className="filter-group">
          <input
            type="date"
            name="dateTo"
            value={filter.dateTo}
            onChange={handleFilterChange}
            className="filter-date"
            placeholder="تا تاریخ"
          />
        </div>
        <button className="btn-clear" onClick={clearFilters}>
          🗑️ پاک کردن
        </button>
      </div>

      {/* Trade Table */}
      <div className="table-container">
        {trades.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>هیچ تریدی ثبت نشده است</h3>
            <p>برای شروع، اولین ترید خود را ثبت کنید.</p>
            <button className="btn-primary" onClick={() => navigate('/trades/new')}>
              ➕ ثبت ترید جدید
            </button>
          </div>
        ) : (
          <table className="tradelist-table">
            <thead>
              <tr>
                <th>تاریخ</th>
                <th>نماد</th>
                <th>نوع</th>
                <th>دسته‌بندی</th>
                <th>قیمت ورود</th>
                <th>قیمت خروج</th>
                <th>سود/زیان</th>
                <th>نتیجه</th>
                <th>R:R</th>
                <th>کیفیت</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan="11" className="empty-state">
                    📭 هیچ تریدی با فیلترهای انتخاب شده یافت نشد
                  </td>
                </tr>
              ) : (
                filteredTrades.map((trade) => (
                  <tr
                    key={trade.id}
                    onDoubleClick={() => handleDoubleClick(trade.id)}
                    style={{ cursor: 'pointer' }}
                    className="trade-row"
                  >
                    <td>{trade.trade_date}</td>
                    <td><strong>{trade.symbol}</strong></td>
                    <td>
                      <span className={`type-badge ${trade.trade_type === 'Buy' ? 'buy' : 'sell'}`}>
                        {trade.trade_type === 'Buy' ? 'خرید' : 'فروش'}
                      </span>
                    </td>
                    <td>{getCategoryName(trade.category_id)}</td>
                    <td>{trade.entry_price}</td>
                    <td>{trade.close_price}</td>
                    <td className={trade.profit >= 0 ? 'positive' : 'negative'}>
                      {trade.profit >= 0 ? '+' : ''}{trade.profit}$
                    </td>
                    <td>{getStatusBadge(trade.profit)}</td>
                    <td>{trade.risk_reward_ratio || '-'}</td>
                    <td>
                      <div className="quality-score">
                        <span className={`score ${trade.execution_quality_score >= 7 ? 'high' : trade.execution_quality_score >= 4 ? 'medium' : 'low'}`}>
                          {trade.execution_quality_score || '-'}/10
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-print-row"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrintSingleTrade(trade.id);
                          }}
                          title="چاپ ترید"
                        >
                          🖨️
                        </button>
                        <button
                          className="btn-view"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(trade.id);
                          }}
                          title="مشاهده جزئیات"
                        >
                          👁️
                        </button>
                        <button
                          className="btn-edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditTrade(trade.id);
                          }}
                          title="ویرایش"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(trade.id);
                          }}
                          title="حذف"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">🗑️</div>
            <h3>حذف ترید</h3>
            <p>
              آیا از حذف این ترید اطمینان دارید؟
            </p>
            {selectedTrade && (
              <p className="modal-info">
                <strong>نماد:</strong> {trades.find(t => t.id === selectedTrade)?.symbol} |
                <strong> تاریخ:</strong> {trades.find(t => t.id === selectedTrade)?.trade_date}
              </p>
            )}
            <p className="modal-warning">⚠️ این عمل غیرقابل بازگشت است!</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowDeleteModal(false)}>
                انصراف
              </button>
              <button className="btn-confirm-delete" onClick={confirmDelete}>
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradeList;