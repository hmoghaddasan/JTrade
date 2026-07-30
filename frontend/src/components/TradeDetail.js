// frontend/src/components/TradeDetail.js

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import RealApiService from '../services/realApiService';
import './TradeDetail.css';

const TradeDetail = () => {
  const { id } = useParams();
  const { isDark } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [trade, setTrade] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('general');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        console.log('📊 Loading trade with id:', id);

        // ✅ دریافت ترید از دیتابیس
        const tradeResponse = await RealApiService.getTrade(id);
        console.log('📊 Trade loaded:', tradeResponse.data);
        setTrade(tradeResponse.data);

        // دریافت دسته‌بندی‌ها
        const groupsResponse = await RealApiService.getTradeGroups();
        let groupsData = groupsResponse.data.results || groupsResponse.data || [];
        setCategories(groupsData);

      } catch (error) {
        console.error('❌ Error loading trade:', error);
        showToast('خطا در دریافت اطلاعات ترید', 'error');
        navigate('/trades');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadData();
    } else {
      navigate('/trades');
    }
  }, [id, navigate, showToast]);

  const handleEdit = () => {
    if (trade) {
      localStorage.setItem('editTradeId', trade.id.toString());
      localStorage.setItem('returnToDashboard', 'false');
      navigate(`/trades/edit/${trade.id}`);
    }
  };

  // ============================================
  // تابع پرینت
  // ============================================
  const handlePrint = () => {
    if (!trade) return;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      showToast('لطفاً pop-up را فعال کنید', 'warning');
      return;
    }

    // ... کد پرینت (همانند نسخه قبل)
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="fa">
      <head>
        <meta charset="UTF-8">
        <title>جزئیات ترید - ${trade.symbol}</title>
        <style>
          /* استایل‌های پرینت */
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Vazir', sans-serif; padding: 25px; background: #fff; color: #333; direction: rtl; }
          .print-header { text-align: center; padding-bottom: 15px; border-bottom: 3px solid #1a237e; margin-bottom: 15px; }
          .print-header h1 { font-size: 22px; color: #1a237e; }
          .trade-title { background: #1a237e; color: white; padding: 10px 18px; border-radius: 8px; margin-bottom: 15px; display: flex; justify-content: space-between; }
          .section { margin-bottom: 15px; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }
          .section-title { background: #e8eaf6; padding: 8px 14px; font-weight: 700; color: #1a237e; }
          .section-body { padding: 10px 14px; }
          .detail-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #f5f5f5; font-size: 13px; }
          .detail-row:last-child { border-bottom: none; }
          .detail-label { color: #666; }
          .detail-value { font-weight: 600; }
          .positive { color: #2e7d32; }
          .negative { color: #c62828; }
          .print-footer { text-align: center; padding-top: 15px; border-top: 1px solid #e0e0e0; margin-top: 15px; color: #999; font-size: 11px; }
          @media print { body { padding: 12px; } }
        </style>
      </head>
      <body>
        <div class="print-header">
          <h1>📊 ژورنال حرفه‌ای ترید</h1>
          <p>گزارش جزئیات معامله</p>
        </div>
        <div class="trade-title">
          <span>${trade.symbol} - ${trade.trade_type === 'Buy' ? 'خرید' : 'فروش'} (${trade.trade_date})</span>
          <span class="${parseFloat(trade.profit) >= 0 ? 'positive' : 'negative'}">
            سود: ${parseFloat(trade.profit) >= 0 ? '+' : ''}${parseFloat(trade.profit) || 0}$
          </span>
        </div>
        <div class="section">
          <div class="section-title">📋 اطلاعات عمومی</div>
          <div class="section-body">
            <div class="detail-row"><span class="detail-label">نماد</span><span class="detail-value">${trade.symbol}</span></div>
            <div class="detail-row"><span class="detail-label">تاریخ</span><span class="detail-value">${trade.trade_date}</span></div>
            <div class="detail-row"><span class="detail-label">نوع</span><span class="detail-value">${trade.trade_type === 'Buy' ? 'خرید' : 'فروش'}</span></div>
            <div class="detail-row"><span class="detail-label">سود/زیان</span><span class="detail-value ${parseFloat(trade.profit) >= 0 ? 'positive' : 'negative'}">${parseFloat(trade.profit) >= 0 ? '+' : ''}${parseFloat(trade.profit) || 0}$</span></div>
          </div>
        </div>
        <div class="print-footer">چاپ شده در: ${new Date().toLocaleDateString('fa-IR')} - ${new Date().toLocaleTimeString('fa-IR')}</div>
        <script>window.onload = function() { setTimeout(function() { window.print(); }, 500); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // ============================================
  // خروجی اکسل
  // ============================================
  const handleExportExcel = () => {
    if (!trade) return;

    const BOM = '\uFEFF';
    const headers = [
      'تاریخ', 'نماد', 'نوع', 'دسته‌بندی', 'قیمت ورود', 'قیمت خروج',
      'سود/زیان', 'حد ضرر', 'حد سود TP1', 'حد سود TP2', 'حد سود TP3',
      'نسبت R:R', 'ریسک (دلار)', 'درصد ریسک', 'کیفیت اجرا'
    ];

    let csvContent = BOM + headers.join(',') + '\n';
    const categoryName = categories.find(c => c.id === (trade.group || trade.group_id))?.group_name || 'بدون دسته‌بندی';

    const row = [
      trade.trade_date || '',
      trade.symbol || '',
      trade.trade_type === 'Buy' ? 'خرید' : 'فروش',
      categoryName,
      trade.entry_price || '',
      trade.close_price || '',
      parseFloat(trade.profit) || 0,
      trade.stop_loss || '',
      trade.take_profit_1 || '',
      trade.take_profit_2 || '',
      trade.take_profit_3 || '',
      trade.risk_reward_ratio || '',
      trade.risk_usd || '0',
      trade.risk_percent || '0',
      trade.execution_quality_score || ''
    ];
    csvContent += row.join(',') + '\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `trade_${trade.symbol}_${trade.trade_date}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    showToast('✅ خروجی اکسل با موفقیت دانلود شد', 'success');
  };

  // ============================================
  // بخش‌های نمایش
  // ============================================
  const sections = [
    { id: 'general', label: '📋 عمومی' },
    { id: 'execution', label: '💰 اجرا' },
    { id: 'psychology', label: '🧠 روانشناسی' },
    { id: 'checklist', label: '✅ چک‌لیست' },
    { id: 'review', label: '🔄 بازبینی' },
    { id: 'ict', label: '📊 ICT' },
  ];

  if (loading) {
    return (
      <div className="trade-detail-container">
        <div className="loading-spinner">⏳ در حال بارگذاری...</div>
      </div>
    );
  }

  if (!trade) {
    return (
      <div className="trade-detail-container">
        <div className="error-message">❌ ترید یافت نشد</div>
      </div>
    );
  }

  // ============================================
  // رندر بخش‌ها
  // ============================================
  const renderGeneral = () => (
    <div className="detail-section">
      <h3>📋 اطلاعات عمومی</h3>
      <div className="detail-grid">
        <div className="detail-item"><span className="label">نماد</span><span className="value">{trade.symbol}</span></div>
        <div className="detail-item"><span className="label">تاریخ</span><span className="value">{trade.trade_date}</span></div>
        <div className="detail-item"><span className="label">نوع</span><span className={`value ${trade.trade_type === 'Buy' ? 'buy' : 'sell'}`}>{trade.trade_type === 'Buy' ? 'خرید' : 'فروش'}</span></div>
        <div className="detail-item"><span className="label">دسته‌بندی</span><span className="value">{categories.find(c => c.id === (trade.group || trade.group_id))?.group_name || 'بدون دسته‌بندی'}</span></div>
        <div className="detail-item"><span className="label">سود/زیان</span><span className={`value ${parseFloat(trade.profit) >= 0 ? 'profit' : 'loss'}`}>{parseFloat(trade.profit) >= 0 ? '+' : ''}{parseFloat(trade.profit) || 0}$</span></div>
        <div className="detail-item"><span className="label">کیفیت اجرا</span><span className={`value quality-${trade.execution_quality_score >= 7 ? 'high' : trade.execution_quality_score >= 4 ? 'medium' : 'low'}`}>{trade.execution_quality_score || '-'}/10</span></div>
      </div>
    </div>
  );

  // ... سایر بخش‌ها (همانند نسخه قبل)

  return (
    <div className={`trade-detail-container ${isDark ? 'dark' : 'light'}`}>
      <div className="trade-detail-header">
        <div className="header-left">
          <h2>📋 جزئیات ترید</h2>
          <span className="trade-symbol-badge">{trade.symbol}</span>
        </div>
        <div className="header-actions">
          <button className="btn-back" onClick={() => navigate('/trades')}>↩️ بازگشت</button>
        </div>
      </div>

      <div className="summary-bar">
        <div className="summary-item"><span className="summary-label">تاریخ</span><span className="summary-value">{trade.trade_date}</span></div>
        <div className="summary-item"><span className="summary-label">سود/زیان</span><span className={`summary-value ${parseFloat(trade.profit) >= 0 ? 'positive' : 'negative'}`}>{parseFloat(trade.profit) >= 0 ? '+' : ''}{parseFloat(trade.profit) || 0}$</span></div>
        <div className="summary-item"><span className="summary-label">نوع</span><span className={`summary-value ${trade.trade_type === 'Buy' ? 'buy' : 'sell'}`}>{trade.trade_type === 'Buy' ? 'خرید' : 'فروش'}</span></div>
        <div className="summary-item"><span className="summary-label">کیفیت اجرا</span><span className={`summary-value quality-${trade.execution_quality_score >= 7 ? 'high' : trade.execution_quality_score >= 4 ? 'medium' : 'low'}`}>{trade.execution_quality_score || '-'}/10</span></div>
      </div>

      <div className="section-tabs">
        {sections.map(section => (
          <button key={section.id} className={`tab-btn ${activeSection === section.id ? 'active' : ''}`} onClick={() => setActiveSection(section.id)}>{section.label}</button>
        ))}
      </div>

      <div className="trade-detail-content">
        {activeSection === 'general' && renderGeneral()}
        {/* سایر بخش‌ها */}
      </div>

      <div className="detail-footer">
        <button className="btn-print" onClick={handlePrint} title="چاپ ترید">🖨️ چاپ</button>
        <button className="btn-excel" onClick={handleExportExcel} title="خروجی اکسل">📄 اکسل</button>
        <button className="btn-edit" onClick={handleEdit}>✏️ ویرایش</button>
      </div>
    </div>
  );
};

export default TradeDetail;