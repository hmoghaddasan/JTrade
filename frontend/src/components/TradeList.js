// frontend/src/components/TradeList.js

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import RealApiService from '../services/realApiService';
import './TradeList.css';

const TradeList = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { showToast } = useToast();
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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // ============================================
  // بارگذاری داده‌ها از دیتابیس
  // ============================================
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const groupsResponse = await RealApiService.getTradeGroups();
        let groupsData = groupsResponse.data.results || groupsResponse.data || [];

        const userGroups = groupsData.filter(g => g.user_id === user?.id);

        const allCategory = { id: 0, name: 'همه دسته‌بندی‌ها', icon: '📊' };
        setCategories([allCategory, ...userGroups.map(g => ({
          id: g.id,
          name: g.group_name,
          icon: g.icon || '📁'
        }))]);

        const tradesResponse = await RealApiService.getTrades();
        const tradesData = tradesResponse.data.results || tradesResponse.data || [];
        setTrades(tradesData);

      } catch (error) {
        console.error('Error loading data:', error);
        showToast('خطا در بارگذاری داده‌ها', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, showToast]);

  // ============================================
  // فیلتر کردن تریدها
  // ============================================
  const filteredTrades = useMemo(() => {
    let result = [...trades];

    if (filter.symbol) {
      result = result.filter(t =>
        t.symbol?.toLowerCase().includes(filter.symbol.toLowerCase())
      );
    }

    if (filter.type) {
      result = result.filter(t => t.trade_type === filter.type);
    }

    if (filter.status) {
      result = result.filter(t => {
        const profit = parseFloat(t.profit);
        if (filter.status === 'win') return profit > 0;
        if (filter.status === 'loss') return profit < 0;
        if (filter.status === 'breakeven') return profit === 0;
        return true;
      });
    }

    if (filter.dateFrom) {
      result = result.filter(t => t.trade_date >= filter.dateFrom);
    }

    if (filter.dateTo) {
      result = result.filter(t => t.trade_date <= filter.dateTo);
    }

    if (filter.category && filter.category !== '0') {
      result = result.filter(t =>
        t.group === parseInt(filter.category) ||
        t.group_id === parseInt(filter.category)
      );
    }

    return result;
  }, [trades, filter]);

  // ============================================
  // محاسبه آمار
  // ============================================
  const totalTrades = filteredTrades.length;
  const winningTrades = filteredTrades.filter(t => parseFloat(t.profit) > 0).length;
  const losingTrades = filteredTrades.filter(t => parseFloat(t.profit) < 0).length;

  const totalProfit = filteredTrades.reduce((sum, t) => {
    const profit = parseFloat(t.profit) || 0;
    return sum + profit;
  }, 0);

  const winRate = totalTrades > 0 ? (winningTrades / totalTrades * 100).toFixed(1) : 0;

  // ============================================
  // صفحه‌بندی
  // ============================================
  const paginatedTrades = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredTrades.slice(start, end);
  }, [filteredTrades, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredTrades.length / itemsPerPage);

  // ============================================
  // توابع اقدامات
  // ============================================
  const handleFilterChange = (e) => {
    setFilter({ ...filter, [e.target.name]: e.target.value });
    setCurrentPage(1);
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
    setCurrentPage(1);
  };

  // ============================================
  // ✅ مشاهده جزئیات - استفاده از navigate با مسیر کامل
  // ============================================
  const handleViewDetails = (tradeId) => {
    if (!tradeId) {
      showToast('شناسه ترید معتبر نیست', 'error');
      return;
    }
    navigate(`/trades/${tradeId}`);
  };

  // ============================================
  // ویرایش
  // ============================================
  const handleEditTrade = (tradeId) => {
    if (!tradeId) {
      showToast('شناسه ترید معتبر نیست', 'error');
      return;
    }
    localStorage.setItem('editTradeId', tradeId.toString());
    localStorage.setItem('returnToDashboard', 'false');
    navigate(`/trades/edit/${tradeId}`);
  };

  // ============================================
  // حذف
  // ============================================
  const handleDelete = async (tradeId) => {
    if (!window.confirm('آیا از حذف این ترید اطمینان دارید؟')) return;

    try {
      await RealApiService.deleteTrade(tradeId);
      setTrades(prev => prev.filter(t => t.id !== tradeId));
      showToast('✅ ترید با موفقیت حذف شد', 'success');
    } catch (error) {
      console.error('Error deleting trade:', error);
      showToast('❌ خطا در حذف ترید', 'error');
    }
  };

  // ============================================
  // ✅ چاپ لیست تریدها
  // ============================================
  const handlePrintList = () => {
    if (filteredTrades.length === 0) {
      showToast('هیچ تریدی برای چاپ وجود ندارد', 'warning');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      showToast('لطفاً pop-up را فعال کنید', 'warning');
      return;
    }

    let tableRows = '';
    filteredTrades.forEach(trade => {
      tableRows += `
        <tr>
          <td>${trade.trade_date || '-'}</td>
          <td>${trade.symbol || '-'}</td>
          <td>${trade.trade_type === 'Buy' ? 'خرید' : 'فروش'}</td>
          <td>${getCategoryName(trade.group || trade.group_id)}</td>
          <td>${trade.entry_price || '-'}</td>
          <td>${trade.close_price || '-'}</td>
          <td class="${parseFloat(trade.profit) >= 0 ? 'positive' : 'negative'}">
            ${parseFloat(trade.profit) >= 0 ? '+' : ''}${parseFloat(trade.profit) || 0}$
          </td>
          <td>${trade.risk_reward_ratio || '-'}</td>
          <td>${trade.execution_quality_score || '-'}/10</td>
        </tr>
      `;
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="fa">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>لیست تریدها</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Vazir', 'Segoe UI', Tahoma, sans-serif;
            padding: 25px 30px;
            background: #ffffff;
            color: #1a1a2e;
            direction: rtl;
          }
          .print-header {
            text-align: center;
            padding: 15px 0;
            border-bottom: 3px solid #1a237e;
            margin-bottom: 20px;
          }
          .print-header h1 {
            font-size: 22px;
            color: #1a237e;
          }
          .print-header .sub-title {
            color: #666;
            font-size: 13px;
            margin-top: 4px;
          }
          .print-header .print-date {
            font-size: 12px;
            color: #888;
            margin-top: 4px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-top: 10px;
          }
          th {
            background: #1a237e;
            color: white;
            padding: 8px 10px;
            text-align: center;
            font-weight: 600;
          }
          td {
            padding: 6px 10px;
            border-bottom: 1px solid #e8ecf4;
            text-align: center;
          }
          .positive { color: #2e7d32; font-weight: 600; }
          .negative { color: #c62828; font-weight: 600; }
          .print-footer {
            text-align: center;
            padding-top: 15px;
            border-top: 1px solid #e0e0e0;
            margin-top: 15px;
            color: #999;
            font-size: 11px;
          }
          .summary-stats {
            display: flex;
            gap: 20px;
            justify-content: center;
            padding: 10px;
            background: #f5f5f5;
            border-radius: 8px;
            margin-bottom: 15px;
            flex-wrap: wrap;
          }
          .summary-item {
            display: flex;
            gap: 6px;
          }
          .summary-label { color: #666; font-size: 13px; }
          .summary-value { font-weight: 700; font-size: 14px; }
          .summary-value.positive { color: #2e7d32; }
          .summary-value.negative { color: #c62828; }
          @media print {
            body { padding: 15px; }
          }
        </style>
      </head>
      <body>
        <div class="print-header">
          <h1>📊 لیست تریدها</h1>
          <div class="sub-title">ژورنال حرفه‌ای ترید</div>
          <div class="print-date">تاریخ چاپ: ${new Date().toLocaleDateString('fa-IR')} - ساعت: ${new Date().toLocaleTimeString('fa-IR')}</div>
        </div>
        <div class="summary-stats">
          <div class="summary-item">
            <span class="summary-label">کل تریدها:</span>
            <span class="summary-value">${totalTrades}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">سود کل:</span>
            <span class="summary-value ${totalProfit >= 0 ? 'positive' : 'negative'}">
              ${totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)}$
            </span>
          </div>
          <div class="summary-item">
            <span class="summary-label">نرخ برد:</span>
            <span class="summary-value">${winRate}%</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">برنده:</span>
            <span class="summary-value positive">${winningTrades}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">بازنده:</span>
            <span class="summary-value negative">${losingTrades}</span>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>تاریخ</th>
              <th>نماد</th>
              <th>نوع</th>
              <th>دسته‌بندی</th>
              <th>قیمت ورود</th>
              <th>قیمت خروج</th>
              <th>سود/زیان</th>
              <th>R:R</th>
              <th>کیفیت</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <div class="print-footer">
          ژورنال حرفه‌ای ترید - تمامی حقوق محفوظ است
        </div>
        <script>
          window.onload = function() { 
            setTimeout(function() { window.print(); }, 500);
          }
        <\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // ============================================
  // ✅ خروجی اکسل لیست تریدها
  // ============================================
  const handleExportExcel = () => {
    if (filteredTrades.length === 0) {
      showToast('هیچ تریدی برای خروجی وجود ندارد', 'warning');
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
        trade.trade_date || '',
        trade.symbol || '',
        trade.trade_type === 'Buy' ? 'خرید' : 'فروش',
        getCategoryName(trade.group || trade.group_id),
        trade.entry_price || '',
        trade.close_price || '',
        parseFloat(trade.profit) || 0,
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

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `trades_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    showToast('✅ خروجی اکسل با موفقیت دانلود شد', 'success');
  };

  // ============================================
  // توابع کمکی
  // ============================================
  const getStatusBadge = (profit) => {
    const p = parseFloat(profit);
    if (p > 0) return <span className="badge-success">✅ سود</span>;
    if (p < 0) return <span className="badge-danger">❌ زیان</span>;
    return <span className="badge-warning">⚖️ مساوی</span>;
  };

  const getCategoryName = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat ? cat.name : 'بدون دسته‌بندی';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('fa-IR');
    } catch {
      return dateStr;
    }
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
          <button className="btn-print-list" onClick={handlePrintList} title="چاپ لیست تریدها">
            🖨️ چاپ
          </button>
          <button className="btn-excel-list" onClick={handleExportExcel} title="خروجی اکسل">
            📄 اکسل
          </button>
          <button className="btn-secondary" onClick={() => navigate('/dashboard')}>
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
            {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(2)}$
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
            {categories.map(cat => (
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
        {filteredTrades.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>هیچ تریدی یافت نشد</h3>
            <p>با فیلترهای انتخاب شده، هیچ تریدی یافت نشد.</p>
          </div>
        ) : (
          <>
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
                {paginatedTrades.map((trade) => (
                  <tr
                    key={trade.id}
                    onDoubleClick={() => handleViewDetails(trade.id)}
                    style={{ cursor: 'pointer' }}
                    className="trade-row"
                  >
                    <td>{formatDate(trade.trade_date)}</td>
                    <td><strong>{trade.symbol}</strong></td>
                    <td>
                      <span className={`type-badge ${trade.trade_type === 'Buy' ? 'buy' : 'sell'}`}>
                        {trade.trade_type === 'Buy' ? 'خرید' : 'فروش'}
                      </span>
                    </td>
                    <td>{getCategoryName(trade.group || trade.group_id)}</td>
                    <td>{trade.entry_price}</td>
                    <td>{trade.close_price}</td>
                    <td className={parseFloat(trade.profit) >= 0 ? 'positive' : 'negative'}>
                      {parseFloat(trade.profit) >= 0 ? '+' : ''}{parseFloat(trade.profit) || 0}$
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
                        {/* ✅ کلید مشاهده جزئیات */}
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
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  قبلی
                </button>
                <span className="page-info">
                  صفحه {currentPage} از {totalPages}
                </span>
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  بعدی
                </button>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="items-per-page"
                >
                  <option value={5}>۵</option>
                  <option value={10}>۱۰</option>
                  <option value={20}>۲۰</option>
                  <option value={50}>۵۰</option>
                </select>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TradeList;