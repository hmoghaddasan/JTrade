// frontend/src/components/TradeDetail.js

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import './TradeDetail.css';

const TradeDetail = () => {
  const { id } = useParams();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [trade, setTrade] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('general');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const loadData = () => {
      try {
        const savedCategories = localStorage.getItem('categories');
        if (savedCategories) {
          setCategories(JSON.parse(savedCategories));
        }

        const savedTrades = localStorage.getItem('trades');
        if (savedTrades) {
          const trades = JSON.parse(savedTrades);
          const found = trades.find(t => t.id === parseInt(id));
          if (found) {
            setTrade(found);
          } else {
            navigate('/trades');
          }
        } else {
          navigate('/trades');
        }
      } catch (error) {
        console.error('Error loading trade:', error);
        navigate('/trades');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, navigate]);

  const handleEdit = () => {
    localStorage.setItem('editTradeId', trade.id.toString());
    navigate('/trades/edit');
  };

  // ============================================
  // تابع پرینت با طراحی چک‌لیست حرفه‌ای
  // ============================================
  const handlePrint = () => {
    if (!trade) return;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      alert('لطفاً pop-up را فعال کنید');
      return;
    }

    const t = trade;
    const categoryName = categories.find(c => c.id === t.category_id)?.name || '-';

    // تبدیل احساسات به لیست
    const emotionsList = t.emotions?.map(e => e) || [];

    // تعیین وضعیت کلی
    const overallStatus = t.profit > 0 ? 'موفق' : t.profit < 0 ? 'نا موفق' : 'مساوی';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="fa">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>گزارش ترید - ${t.symbol}</title>
        <style>
          /* ============================================
             استایل‌های پایه - مشابه چک‌لیست
             ============================================ */
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Vazir', 'Segoe UI', Tahoma, sans-serif;
            padding: 25px 35px;
            background: #f8f9fc;
            color: #1a1a2e;
            direction: rtl;
            line-height: 1.6;
          }
          
          /* ============================================
             هدر اصلی
             ============================================ */
          .print-header {
            text-align: center;
            padding: 20px 0 16px 0;
            margin-bottom: 20px;
            border-bottom: 3px solid #1a237e;
            position: relative;
          }
          
          .print-header .logo-icon {
            font-size: 36px;
          }
          
          .print-header h1 {
            font-size: 26px;
            color: #1a237e;
            letter-spacing: 2px;
            font-weight: 700;
            margin: 4px 0 2px 0;
          }
          
          .print-header .sub-title {
            color: #555;
            font-size: 14px;
            letter-spacing: 1px;
          }
          
          .print-header .print-date {
            position: absolute;
            left: 0;
            top: 50%;
            transform: translateY(-50%);
            font-size: 12px;
            color: #888;
            background: #f0f0f5;
            padding: 4px 14px;
            border-radius: 20px;
          }
          
          /* ============================================
             عنوان ترید - باکس رنگی
             ============================================ */
          .trade-title-box {
            background: linear-gradient(135deg, #1a237e, #0d47a1);
            color: white;
            padding: 14px 24px;
            border-radius: 12px;
            margin-bottom: 22px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 4px 15px rgba(26, 35, 126, 0.25);
          }
          
          .trade-title-box .symbol-info {
            font-size: 22px;
            font-weight: 700;
          }
          
          .trade-title-box .symbol-info .type-badge {
            font-size: 16px;
            font-weight: 600;
            background: rgba(255,255,255,0.2);
            padding: 2px 16px;
            border-radius: 20px;
            margin-right: 12px;
          }
          
          .trade-title-box .profit-info {
            font-size: 20px;
            font-weight: 700;
          }
          
          .trade-title-box .profit-info.positive {
            color: #81c784;
          }
          
          .trade-title-box .profit-info.negative {
            color: #ef9a9a;
          }
          
          .trade-title-box .profit-info .profit-label {
            font-size: 14px;
            font-weight: 400;
            opacity: 0.8;
          }
          
          /* ============================================
             خلاصه سریع - ۴ کارت
             ============================================ */
          .quick-summary {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 22px;
          }
          
          .quick-summary .qs-item {
            background: white;
            border-radius: 10px;
            padding: 12px 16px;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            border: 1px solid #e8ecf4;
          }
          
          .quick-summary .qs-item .qs-label {
            font-size: 11px;
            color: #888;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          
          .quick-summary .qs-item .qs-value {
            font-size: 18px;
            font-weight: 700;
            color: #1a1a2e;
            margin-top: 2px;
          }
          
          .quick-summary .qs-item .qs-value.positive {
            color: #2e7d32;
          }
          
          .quick-summary .qs-item .qs-value.negative {
            color: #c62828;
          }
          
          .quick-summary .qs-item .qs-value.green {
            color: #2e7d32;
          }
          
          .quick-summary .qs-item .qs-value.orange {
            color: #e65100;
          }
          
          /* ============================================
             بخش‌های اصلی - مانند چک‌لیست
             ============================================ */
          .section {
            background: white;
            border-radius: 12px;
            margin-bottom: 16px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            border: 1px solid #e8ecf4;
            overflow: hidden;
          }
          
          .section-header {
            background: #e8eaf6;
            padding: 10px 20px;
            font-weight: 700;
            font-size: 16px;
            color: #1a237e;
            border-bottom: 2px solid #c5cae9;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          
          .section-header .section-icon {
            font-size: 20px;
          }
          
          .section-body {
            padding: 14px 20px;
          }
          
          /* ============================================
             ردیف‌های اطلاعات - مانند چک‌لیست
             ============================================ */
          .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 7px 0;
            border-bottom: 1px dashed #f0f2f7;
          }
          
          .detail-row:last-child {
            border-bottom: none;
          }
          
          .detail-row .label {
            color: #666;
            font-size: 13px;
          }
          
          .detail-row .value {
            font-weight: 600;
            font-size: 13px;
            color: #1a1a2e;
            text-align: left;
          }
          
          .detail-row .value.buy {
            color: #2e7d32;
          }
          
          .detail-row .value.sell {
            color: #c62828;
          }
          
          .detail-row .value.positive {
            color: #2e7d32;
          }
          
          .detail-row .value.negative {
            color: #c62828;
          }
          
          .detail-row .value.checked {
            color: #2e7d32;
          }
          
          .detail-row .value.unchecked {
            color: #c62828;
          }
          
          .detail-row .value.bias-Bullish {
            color: #2e7d32;
          }
          
          .detail-row .value.bias-Bearish {
            color: #c62828;
          }
          
          .detail-row .value.bias-Neutral {
            color: #f57f17;
          }
          
          .detail-row .value.quality-high {
            color: #2e7d32;
          }
          
          .detail-row .value.quality-medium {
            color: #f57f17;
          }
          
          .detail-row .value.quality-low {
            color: #c62828;
          }
          
          .detail-row .value.sleep-خوب {
            color: #2e7d32;
          }
          
          .detail-row .value.sleep-متوسط {
            color: #f57f17;
          }
          
          .detail-row .value.sleep-بد {
            color: #c62828;
          }
          
          /* ============================================
             برچسب‌ها (Badges)
             ============================================ */
          .badge-list {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
          }
          
          .badge {
            padding: 3px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
            background: #e8ecf4;
            color: #555;
          }
          
          .badge.timeframe {
            background: #e3f2fd;
            color: #0d47a1;
          }
          
          .badge.emotion {
            background: #fce4ec;
            color: #c62828;
          }
          
          .badge.success {
            background: #e8f5e9;
            color: #2e7d32;
          }
          
          .badge.danger {
            background: #ffebee;
            color: #c62828;
          }
          
          .badge.warning {
            background: #fff3e0;
            color: #e65100;
          }
          
          /* ============================================
             وضعیت کلی - پایین صفحه
             ============================================ */
          .overall-status {
            background: linear-gradient(135deg, #1a237e, #0d47a1);
            color: white;
            padding: 14px 24px;
            border-radius: 12px;
            margin-top: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .overall-status .status-label {
            font-size: 14px;
            opacity: 0.8;
          }
          
          .overall-status .status-value {
            font-size: 20px;
            font-weight: 700;
          }
          
          .overall-status .status-value.success {
            color: #81c784;
          }
          
          .overall-status .status-value.fail {
            color: #ef9a9a;
          }
          
          .overall-status .status-value.neutral {
            color: #ffd54f;
          }
          
          /* ============================================
             فوتر صفحه
             ============================================ */
          .print-footer {
            text-align: center;
            padding-top: 16px;
            border-top: 1px solid #e0e0e0;
            margin-top: 16px;
            color: #999;
            font-size: 12px;
          }
          
          .print-footer .footer-logo {
            font-size: 14px;
            font-weight: 600;
            color: #1a237e;
          }
          
          /* ============================================
             واکنش‌گرا برای چاپ
             ============================================ */
          @media print {
            body {
              padding: 15px 20px;
              background: white;
            }
            
            .print-header .print-date {
              background: #f0f0f5;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            
            .trade-title-box {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            
            .quick-summary .qs-item {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            
            .section {
              break-inside: avoid;
            }
            
            .overall-status {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <!-- ==========================================
        هدر اصلی
        ========================================== -->
        <div class="print-header">
          <span class="print-date">📅 ${new Date().toLocaleDateString('fa-IR')}</span>
          <div class="logo-icon">📊</div>
          <h1>ژورنال حرفه‌ای ترید</h1>
          <div class="sub-title">گزارش جزئیات معامله</div>
        </div>

        <!-- ==========================================
        عنوان ترید
        ========================================== -->
        <div class="trade-title-box">
          <div class="symbol-info">
            ${t.symbol}
            <span class="type-badge">${t.trade_type === 'Buy' ? 'خرید' : 'فروش'}</span>
          </div>
          <div class="profit-info ${t.profit >= 0 ? 'positive' : 'negative'}">
            <span class="profit-label">سود/زیان:</span>
            ${t.profit >= 0 ? '+' : ''}${t.profit || 0}$
          </div>
        </div>

        <!-- ==========================================
        خلاصه سریع - ۴ کارت
        ========================================== -->
        <div class="quick-summary">
          <div class="qs-item">
            <div class="qs-label">📅 تاریخ</div>
            <div class="qs-value">${t.trade_date}</div>
          </div>
          <div class="qs-item">
            <div class="qs-label">📊 دسته‌بندی</div>
            <div class="qs-value">${categoryName}</div>
          </div>
          <div class="qs-item">
            <div class="qs-label">🎯 کیفیت اجرا</div>
            <div class="qs-value ${t.execution_quality_score >= 7 ? 'green' : t.execution_quality_score >= 4 ? 'orange' : 'negative'}">
              ${t.execution_quality_score || '-'}/10
            </div>
          </div>
          <div class="qs-item">
            <div class="qs-label">📈 وضعیت</div>
            <div class="qs-value ${t.profit > 0 ? 'positive' : t.profit < 0 ? 'negative' : ''}">
              ${t.profit > 0 ? '✅ موفق' : t.profit < 0 ? '❌ ناموفق' : '⚖️ مساوی'}
            </div>
          </div>
        </div>

        <!-- ==========================================
        بخش 1: اطلاعات عمومی
        ========================================== -->
        <div class="section">
          <div class="section-header">
            <span class="section-icon">📋</span>
            اطلاعات عمومی
          </div>
          <div class="section-body">
            <div class="detail-row"><span class="label">نماد معاملاتی</span><span class="value">${t.symbol}</span></div>
            <div class="detail-row"><span class="label">تاریخ معامله</span><span class="value">${t.trade_date}</span></div>
            <div class="detail-row"><span class="label">روز هفته</span><span class="value">${t.day_of_week || '-'}</span></div>
            <div class="detail-row"><span class="label">ساعت (به وقت نیویورک)</span><span class="value">${t.time_ny || '-'}</span></div>
            <div class="detail-row"><span class="label">نوع ترید</span><span class="value ${t.trade_type === 'Buy' ? 'buy' : 'sell'}">${t.trade_type === 'Buy' ? 'خرید' : 'فروش'}</span></div>
            <div class="detail-row"><span class="label">نوع جلسه</span><span class="value">${t.session_type || '-'}</span></div>
            <div class="detail-row"><span class="label">دسته‌بندی</span><span class="value">${categoryName}</span></div>
            <div class="detail-row"><span class="label">بایاس</span><span class="value bias-${t.bias}">${t.bias === 'Bullish' ? '📈 صعودی' : t.bias === 'Bearish' ? '📉 نزولی' : t.bias === 'Neutral' ? '⚖️ خنثی' : '-'}</span></div>
            <div class="detail-row"><span class="label">استراتژی</span><span class="value">${t.strategy_type || '-'}</span></div>
            <div class="detail-row"><span class="label">مدل ورودی</span><span class="value">${t.retirement_model || '-'}</span></div>
            <div class="detail-row"><span class="label">تایم‌فریم‌ها</span><span class="value"><span class="badge-list">${t.timeframes?.map(tf => `<span class="badge timeframe">${tf}</span>`).join(' ') || '-'}</span></span></div>
            <div class="detail-row"><span class="label">یادداشت پروفایل هفتگی</span><span class="value">${t.weekly_profile_note || '-'}</span></div>
          </div>
        </div>

        <!-- ==========================================
        بخش 2: وضعیت روحی و ذهنی
        ========================================== -->
        <div class="section">
          <div class="section-header">
            <span class="section-icon">🧠</span>
            وضعیت روحی و ذهنی
          </div>
          <div class="section-body">
            <div class="detail-row"><span class="label">کیفیت خواب</span><span class="value sleep-${t.sleep_quality}">${t.sleep_quality || '-'}</span></div>
            <div class="detail-row"><span class="label">تغذیه مناسب</span><span class="value ${t.food_status ? 'checked' : 'unchecked'}">${t.food_status ? '✅ بله' : '❌ خیر'}</span></div>
            <div class="detail-row"><span class="label">احساسات</span><span class="value"><span class="badge-list">${emotionsList.map(e => `<span class="badge emotion">${e}</span>`).join(' ') || '-'}</span></span></div>
            <div class="detail-row"><span class="label">احساس غالب</span><span class="value">${t.dominant_feeling || '-'}</span></div>
            <div class="detail-row"><span class="label">استرس قبل معامله</span><span class="value">${t.pre_trade_stress || '-'}</span></div>
            <div class="detail-row"><span class="label">کنترل هیجان هنگام ورود</span><span class="value">${t.entry_emotion_control || '-'}</span></div>
          </div>
        </div>

        <!-- ==========================================
        بخش 3: جزئیات اجرا
        ========================================== -->
        <div class="section">
          <div class="section-header">
            <span class="section-icon">💰</span>
            جزئیات اجرا
          </div>
          <div class="section-body">
            <div class="detail-row"><span class="label">قیمت ورود</span><span class="value">${t.entry_price || '-'}</span></div>
            <div class="detail-row"><span class="label">قیمت خروج</span><span class="value">${t.close_price || '-'}</span></div>
            <div class="detail-row"><span class="label">حد ضرر (SL)</span><span class="value">${t.stop_loss || '-'}</span></div>
            <div class="detail-row"><span class="label">حد سود اول (TP1)</span><span class="value">${t.take_profit_1 || '-'}</span></div>
            <div class="detail-row"><span class="label">حد سود دوم (TP2)</span><span class="value">${t.take_profit_2 || '-'}</span></div>
            <div class="detail-row"><span class="label">حد سود سوم (TP3)</span><span class="value">${t.take_profit_3 || '-'}</span></div>
            <div class="detail-row"><span class="label">حد خورده شده</span><span class="value">${t.tp_sl_hit ? `<span class="badge ${t.tp_sl_hit === 'SL' ? 'danger' : 'success'}">${t.tp_sl_hit}</span>` : '-'}</span></div>
            <div class="detail-row"><span class="label">نسبت ریسک به ریوارد (R:R)</span><span class="value">${t.risk_reward_ratio || '-'}</span></div>
            <div class="detail-row"><span class="label">مقدار ریسک (دلار)</span><span class="value">${t.risk_usd || '0'}$</span></div>
            <div class="detail-row"><span class="label">درصد ریسک از کل سرمایه</span><span class="value">${t.risk_percent || '0'}%</span></div>
            <div class="detail-row"><span class="label">سود/زیان نهایی</span><span class="value ${t.profit >= 0 ? 'positive' : 'negative'}">${t.profit >= 0 ? '+' : ''}${t.profit || 0}$</span></div>
            <div class="detail-row"><span class="label">کیفیت اجرا</span><span class="value quality-${t.execution_quality_score >= 7 ? 'high' : t.execution_quality_score >= 4 ? 'medium' : 'low'}">${t.execution_quality_score || '-'}/10</span></div>
          </div>
        </div>

        <!-- ==========================================
        بخش 4: چک‌لیست روزانه
        ========================================== -->
        <div class="section">
          <div class="section-header">
            <span class="section-icon">✅</span>
            چک‌لیست روزانه
          </div>
          <div class="section-body">
            <div class="detail-row"><span class="label">SMT تایید شد</span><span class="value ${t.smt_confirmed ? 'checked' : 'unchecked'}">${t.smt_confirmed ? '✅ بله' : '❌ خیر'}</span></div>
            <div class="detail-row"><span class="label">سطوح کلیدی بررسی شد</span><span class="value ${t.key_levels_reviewed ? 'checked' : 'unchecked'}">${t.key_levels_reviewed ? '✅ بله' : '❌ خیر'}</span></div>
            <div class="detail-row"><span class="label">حمایت BOND/DXY</span><span class="value ${t.bond_dxy_support ? 'checked' : 'unchecked'}">${t.bond_dxy_support ? '✅ بله' : '❌ خیر'}</span></div>
            <div class="detail-row"><span class="label">اخبار هفتگی چاپ شد</span><span class="value ${t.weekly_news_printed ? 'checked' : 'unchecked'}">${t.weekly_news_printed ? '✅ بله' : '❌ خیر'}</span></div>
            <div class="detail-row"><span class="label">ساعت صفر مشخص شد</span><span class="value ${t.zero_hour_identified ? 'checked' : 'unchecked'}">${t.zero_hour_identified ? '✅ بله' : '❌ خیر'}</span></div>
            <div class="detail-row"><span class="label">رنج آسیا مشخص شد</span><span class="value ${t.asian_range_identified ? 'checked' : 'unchecked'}">${t.asian_range_identified ? '✅ بله' : '❌ خیر'}</span></div>
            <div class="detail-row"><span class="label">رنج لندن مشخص شد</span><span class="value ${t.london_range_identified ? 'checked' : 'unchecked'}">${t.london_range_identified ? '✅ بله' : '❌ خیر'}</span></div>
            <div class="detail-row"><span class="label">Judas LO مشخص شد</span><span class="value ${t.judas_lo_identified ? 'checked' : 'unchecked'}">${t.judas_lo_identified ? '✅ بله' : '❌ خیر'}</span></div>
            <div class="detail-row"><span class="label">توضیحات تکمیلی</span><span class="value">${t.checklist_extra || '-'}</span></div>
          </div>
        </div>

        <!-- ==========================================
        بخش 5: بازبینی و اشتباهات
        ========================================== -->
        <div class="section">
          <div class="section-header">
            <span class="section-icon">🔄</span>
            بازبینی و اشتباهات
          </div>
          <div class="section-body">
            <div class="detail-row"><span class="label">کد اشتباه</span><span class="value">${t.mistake_code || 'بدون اشتباه'}</span></div>
            <div class="detail-row"><span class="label">وزن اشتباه</span><span class="value">${t.mistake_weight || '-'}</span></div>
            <div class="detail-row"><span class="label">پایبندی به حد ضرر</span><span class="value ${t.stop_loss_adherence ? 'checked' : 'unchecked'}">${t.stop_loss_adherence ? '✅ بله' : '❌ خیر'}</span></div>
            <div class="detail-row"><span class="label">پایبندی به استراتژی</span><span class="value ${t.strategy_adherence ? 'checked' : 'unchecked'}">${t.strategy_adherence ? '✅ بله' : '❌ خیر'}</span></div>
            <div class="detail-row"><span class="label">پایبندی به مدیریت سرمایه</span><span class="value ${t.capital_management_adherence ? 'checked' : 'unchecked'}">${t.capital_management_adherence ? '✅ بله' : '❌ خیر'}</span></div>
            <div class="detail-row"><span class="label">اورترید</span><span class="value ${t.over_trade ? 'checked' : 'unchecked'}">${t.over_trade ? '⚠️ بله' : '✅ خیر'}</span></div>
            <div class="detail-row"><span class="label">اسکن پس از معامله</span><span class="value ${t.post_trade_scan ? 'checked' : 'unchecked'}">${t.post_trade_scan ? '✅ انجام شد' : '❌ انجام نشد'}</span></div>
            <div class="detail-row"><span class="label">دلیل ورود یادداشت شد</span><span class="value ${t.entry_reason_written ? 'checked' : 'unchecked'}">${t.entry_reason_written ? '✅ بله' : '❌ خیر'}</span></div>
            <div class="detail-row"><span class="label">دلیل خروج یادداشت شد</span><span class="value ${t.exit_reason_written ? 'checked' : 'unchecked'}">${t.exit_reason_written ? '✅ بله' : '❌ خیر'}</span></div>
            <div class="detail-row"><span class="label">اشتباهات ثبت شد</span><span class="value ${t.mistakes_recorded ? 'checked' : 'unchecked'}">${t.mistakes_recorded ? '✅ بله' : '❌ خیر'}</span></div>
          </div>
        </div>

        <!-- ==========================================
        بخش 6: تحلیل ICT
        ========================================== -->
        <div class="section">
          <div class="section-header">
            <span class="section-icon">📊</span>
            تحلیل ICT
          </div>
          <div class="section-body">
            <div class="detail-row"><span class="label">FVG (Fair Value Gap)</span><span class="value">${t.fvg || '-'}</span></div>
            <div class="detail-row"><span class="label">Order Block</span><span class="value">${t.order_block || '-'}</span></div>
            <div class="detail-row"><span class="label">BOS (Break of Structure)</span><span class="value">${t.bos || '-'}</span></div>
            <div class="detail-row"><span class="label">CHOCH (Change of Character)</span><span class="value">${t.choch || '-'}</span></div>
            <div class="detail-row"><span class="label">MSS (Market Structure Shift)</span><span class="value">${t.mss || '-'}</span></div>
            <div class="detail-row"><span class="label">Liquidity Sweep</span><span class="value">${t.liquidity_sweep || '-'}</span></div>
            <div class="detail-row"><span class="label">POI (Point of Interest)</span><span class="value">${t.poi || '-'}</span></div>
            <div class="detail-row"><span class="label">Demand Zone</span><span class="value">${t.demand_zone || '-'}</span></div>
            <div class="detail-row"><span class="label">Supply Zone</span><span class="value">${t.supply_zone || '-'}</span></div>
          </div>
        </div>

        <!-- ==========================================
        وضعیت کلی
        ========================================== -->
        <div class="overall-status">
          <div>
            <div class="status-label">وضعیت کلی ترید</div>
            <div style="font-size:14px;opacity:0.8;">${t.symbol} - ${t.trade_date}</div>
          </div>
          <div class="status-value ${t.profit > 0 ? 'success' : t.profit < 0 ? 'fail' : 'neutral'}">
            ${overallStatus}
          </div>
        </div>

        <!-- ==========================================
        فوتر
        ========================================== -->
        <div class="print-footer">
          <span class="footer-logo">📊 ژورنال حرفه‌ای ترید</span>
          &nbsp;|&nbsp; چاپ شده در: ${new Date().toLocaleDateString('fa-IR')} - ${new Date().toLocaleTimeString('fa-IR')}
          &nbsp;|&nbsp; نسخه 1.4.1
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExportExcel = () => {
    if (!trade) return;

    const t = trade;
    const categoryName = categories.find(c => c.id === t.category_id)?.name || '';
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
      t.trade_date, t.symbol, t.trade_type === 'Buy' ? 'خرید' : 'فروش', categoryName,
      t.session_type || '', t.time_ny || '', t.day_of_week || '', t.bias || '',
      t.strategy_type || '', t.retirement_model || '', t.timeframes?.join('، ') || '',
      t.sleep_quality || '', t.food_status ? 'بله' : 'خیر', t.emotions?.join('، ') || '',
      t.dominant_feeling || '', t.pre_trade_stress || '', t.entry_emotion_control || '',
      t.entry_price || '', t.close_price || '', t.stop_loss || '',
      t.take_profit_1 || '', t.take_profit_2 || '', t.take_profit_3 || '',
      t.tp_sl_hit || '', t.risk_reward_ratio || '', t.risk_usd || '0',
      t.risk_percent || '0', t.profit || 0, t.execution_quality_score || '',
      t.smt_confirmed ? 'بله' : 'خیر', t.key_levels_reviewed ? 'بله' : 'خیر',
      t.bond_dxy_support ? 'بله' : 'خیر', t.weekly_news_printed ? 'بله' : 'خیر',
      t.zero_hour_identified ? 'بله' : 'خیر', t.asian_range_identified ? 'بله' : 'خیر',
      t.london_range_identified ? 'بله' : 'خیر', t.judas_lo_identified ? 'بله' : 'خیر',
      t.checklist_extra || '', t.mistake_code || '', t.mistake_weight || '',
      t.stop_loss_adherence ? 'بله' : 'خیر', t.strategy_adherence ? 'بله' : 'خیر',
      t.capital_management_adherence ? 'بله' : 'خیر', t.over_trade ? 'بله' : 'خیر',
      t.post_trade_scan ? 'بله' : 'خیر', t.entry_reason_written ? 'بله' : 'خیر',
      t.exit_reason_written ? 'بله' : 'خیر', t.mistakes_recorded ? 'بله' : 'خیر',
      t.fvg || '', t.order_block || '', t.bos || '', t.choch || '',
      t.mss || '', t.liquidity_sweep || '', t.poi || '',
      t.demand_zone || '', t.supply_zone || ''
    ];

    csvContent += row.join(',') + '\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `trade_${t.symbol}_${t.trade_date}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

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
        <div className="detail-item"><span className="label">تاریخ معامله</span><span className="value">{trade.trade_date}</span></div>
        <div className="detail-item"><span className="label">نوع ترید</span><span className={`value ${trade.trade_type === 'Buy' ? 'buy' : 'sell'}`}>{trade.trade_type === 'Buy' ? 'خرید' : 'فروش'}</span></div>
        <div className="detail-item"><span className="label">دسته‌بندی</span><span className="value">{categories.find(c => c.id === trade.category_id)?.name || '-'}</span></div>
        <div className="detail-item"><span className="label">نوع جلسه</span><span className="value">{trade.session_type || '-'}</span></div>
        <div className="detail-item"><span className="label">ساعت (نیویورک)</span><span className="value">{trade.time_ny || '-'}</span></div>
        <div className="detail-item"><span className="label">روز هفته</span><span className="value">{trade.day_of_week || '-'}</span></div>
        <div className="detail-item"><span className="label">بایاس</span><span className={`value bias-${trade.bias}`}>{trade.bias === 'Bullish' ? '📈 صعودی' : trade.bias === 'Bearish' ? '📉 نزولی' : trade.bias === 'Neutral' ? '⚖️ خنثی' : '-'}</span></div>
        <div className="detail-item"><span className="label">استراتژی</span><span className="value">{trade.strategy_type || '-'}</span></div>
        <div className="detail-item"><span className="label">مدل ورودی</span><span className="value">{trade.retirement_model || '-'}</span></div>
        <div className="detail-item"><span className="label">تایم‌فریم‌ها</span><span className="value">{trade.timeframes?.map((tf, i) => <span key={i} className="tf-badge">{tf}</span>) || '-'}</span></div>
      </div>
    </div>
  );

  const renderExecution = () => (
    <div className="detail-section">
      <h3>💰 جزئیات اجرا</h3>
      <div className="detail-grid">
        <div className="detail-item"><span className="label">قیمت ورود</span><span className="value">{trade.entry_price || '-'}</span></div>
        <div className="detail-item"><span className="label">قیمت خروج</span><span className="value">{trade.close_price || '-'}</span></div>
        <div className="detail-item"><span className="label">حد ضرر (SL)</span><span className="value">{trade.stop_loss || '-'}</span></div>
        <div className="detail-item"><span className="label">حد سود اول (TP1)</span><span className="value">{trade.take_profit_1 || '-'}</span></div>
        <div className="detail-item"><span className="label">حد سود دوم (TP2)</span><span className="value">{trade.take_profit_2 || '-'}</span></div>
        <div className="detail-item"><span className="label">حد سود سوم (TP3)</span><span className="value">{trade.take_profit_3 || '-'}</span></div>
        <div className="detail-item"><span className="label">حد خورده شده</span><span className="value">{trade.tp_sl_hit ? <span className={`badge ${trade.tp_sl_hit === 'SL' ? 'danger' : 'success'}`}>{trade.tp_sl_hit}</span> : '-'}</span></div>
        <div className="detail-item"><span className="label">نسبت R:R</span><span className="value">{trade.risk_reward_ratio || '-'}</span></div>
        <div className="detail-item"><span className="label">ریسک (دلار)</span><span className="value">${trade.risk_usd || '0'}</span></div>
        <div className="detail-item"><span className="label">درصد ریسک</span><span className="value">{trade.risk_percent || '0'}%</span></div>
        <div className="detail-item"><span className="label">سود/زیان</span><span className={`value ${trade.profit >= 0 ? 'profit' : 'loss'}`}>{trade.profit >= 0 ? '+' : ''}{trade.profit || 0}$</span></div>
        <div className="detail-item"><span className="label">کیفیت اجرا</span><span className={`value quality-${trade.execution_quality_score >= 7 ? 'high' : trade.execution_quality_score >= 4 ? 'medium' : 'low'}`}>{trade.execution_quality_score || '-'}/10</span></div>
      </div>
    </div>
  );

  const renderPsychology = () => (
    <div className="detail-section">
      <h3>🧠 وضعیت روحی و ذهنی</h3>
      <div className="detail-grid">
        <div className="detail-item"><span className="label">کیفیت خواب</span><span className={`value sleep-${trade.sleep_quality}`}>{trade.sleep_quality || '-'}</span></div>
        <div className="detail-item"><span className="label">تغذیه مناسب</span><span className={`value ${trade.food_status ? 'checked' : 'unchecked'}`}>{trade.food_status ? '✅ بله' : '❌ خیر'}</span></div>
        <div className="detail-item"><span className="label">احساسات</span><span className="value">{trade.emotions?.map((e, i) => <span key={i} className="emotion-badge">{e}</span>) || '-'}</span></div>
        <div className="detail-item"><span className="label">احساس غالب</span><span className="value">{trade.dominant_feeling || '-'}</span></div>
        <div className="detail-item"><span className="label">استرس قبل معامله</span><span className="value">{trade.pre_trade_stress || '-'}</span></div>
        <div className="detail-item"><span className="label">کنترل هیجان هنگام ورود</span><span className="value">{trade.entry_emotion_control || '-'}</span></div>
      </div>
    </div>
  );

  const renderChecklist = () => {
    const items = [
      { key: 'smt_confirmed', label: 'SMT تایید شد' },
      { key: 'key_levels_reviewed', label: 'سطوح کلیدی بررسی شد' },
      { key: 'bond_dxy_support', label: 'حمایت BOND/DXY' },
      { key: 'weekly_news_printed', label: 'اخبار هفتگی چاپ شد' },
      { key: 'zero_hour_identified', label: 'ساعت صفر مشخص شد' },
      { key: 'asian_range_identified', label: 'رنج آسیا مشخص شد' },
      { key: 'london_range_identified', label: 'رنج لندن مشخص شد' },
      { key: 'judas_lo_identified', label: 'Judas LO مشخص شد' },
    ];
    return (
      <div className="detail-section">
        <h3>✅ چک‌لیست روزانه</h3>
        <div className="detail-grid">
          {items.map(item => (
            <div key={item.key} className="detail-item">
              <span className="label">{item.label}</span>
              <span className={`value ${trade[item.key] ? 'checked' : 'unchecked'}`}>
                {trade[item.key] ? '✅ بله' : '❌ خیر'}
              </span>
            </div>
          ))}
          <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
            <span className="label">توضیحات تکمیلی</span>
            <span className="value">{trade.checklist_extra || '-'}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderReview = () => (
    <div className="detail-section">
      <h3>🔄 بازبینی و اشتباهات</h3>
      <div className="detail-grid">
        <div className="detail-item"><span className="label">کد اشتباه</span><span className="value">{trade.mistake_code || 'بدون اشتباه'}</span></div>
        <div className="detail-item"><span className="label">وزن اشتباه</span><span className="value">{trade.mistake_weight || '-'}</span></div>
        <div className="detail-item"><span className="label">پایبندی به حد ضرر</span><span className={`value ${trade.stop_loss_adherence ? 'checked' : 'unchecked'}`}>{trade.stop_loss_adherence ? '✅ بله' : '❌ خیر'}</span></div>
        <div className="detail-item"><span className="label">پایبندی به استراتژی</span><span className={`value ${trade.strategy_adherence ? 'checked' : 'unchecked'}`}>{trade.strategy_adherence ? '✅ بله' : '❌ خیر'}</span></div>
        <div className="detail-item"><span className="label">پایبندی به مدیریت سرمایه</span><span className={`value ${trade.capital_management_adherence ? 'checked' : 'unchecked'}`}>{trade.capital_management_adherence ? '✅ بله' : '❌ خیر'}</span></div>
        <div className="detail-item"><span className="label">اورترید</span><span className={`value ${trade.over_trade ? 'checked' : 'unchecked'}`}>{trade.over_trade ? '⚠️ بله' : '✅ خیر'}</span></div>
        <div className="detail-item"><span className="label">اسکن پس از معامله</span><span className={`value ${trade.post_trade_scan ? 'checked' : 'unchecked'}`}>{trade.post_trade_scan ? '✅ انجام شد' : '❌ انجام نشد'}</span></div>
        <div className="detail-item"><span className="label">دلیل ورود یادداشت شد</span><span className={`value ${trade.entry_reason_written ? 'checked' : 'unchecked'}`}>{trade.entry_reason_written ? '✅ بله' : '❌ خیر'}</span></div>
        <div className="detail-item"><span className="label">دلیل خروج یادداشت شد</span><span className={`value ${trade.exit_reason_written ? 'checked' : 'unchecked'}`}>{trade.exit_reason_written ? '✅ بله' : '❌ خیر'}</span></div>
        <div className="detail-item"><span className="label">اشتباهات ثبت شد</span><span className={`value ${trade.mistakes_recorded ? 'checked' : 'unchecked'}`}>{trade.mistakes_recorded ? '✅ بله' : '❌ خیر'}</span></div>
      </div>
    </div>
  );

  const renderICT = () => (
    <div className="detail-section">
      <h3>📊 تحلیل ICT</h3>
      <div className="detail-grid">
        <div className="detail-item"><span className="label">FVG</span><span className="value">{trade.fvg || '-'}</span></div>
        <div className="detail-item"><span className="label">Order Block</span><span className="value">{trade.order_block || '-'}</span></div>
        <div className="detail-item"><span className="label">BOS</span><span className="value">{trade.bos || '-'}</span></div>
        <div className="detail-item"><span className="label">CHOCH</span><span className="value">{trade.choch || '-'}</span></div>
        <div className="detail-item"><span className="label">MSS</span><span className="value">{trade.mss || '-'}</span></div>
        <div className="detail-item"><span className="label">Liquidity Sweep</span><span className="value">{trade.liquidity_sweep || '-'}</span></div>
        <div className="detail-item"><span className="label">POI</span><span className="value">{trade.poi || '-'}</span></div>
        <div className="detail-item"><span className="label">Demand Zone</span><span className="value">{trade.demand_zone || '-'}</span></div>
        <div className="detail-item"><span className="label">Supply Zone</span><span className="value">{trade.supply_zone || '-'}</span></div>
      </div>
    </div>
  );

  const renderSection = () => {
    switch(activeSection) {
      case 'general': return renderGeneral();
      case 'execution': return renderExecution();
      case 'psychology': return renderPsychology();
      case 'checklist': return renderChecklist();
      case 'review': return renderReview();
      case 'ict': return renderICT();
      default: return renderGeneral();
    }
  };

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
        <div className="summary-item"><span className="summary-label">سود/زیان</span><span className={`summary-value ${trade.profit >= 0 ? 'positive' : 'negative'}`}>{trade.profit >= 0 ? '+' : ''}{trade.profit || 0}$</span></div>
        <div className="summary-item"><span className="summary-label">نوع</span><span className={`summary-value ${trade.trade_type === 'Buy' ? 'buy' : 'sell'}`}>{trade.trade_type === 'Buy' ? 'خرید' : 'فروش'}</span></div>
        <div className="summary-item"><span className="summary-label">کیفیت اجرا</span><span className={`summary-value quality-${trade.execution_quality_score >= 7 ? 'high' : trade.execution_quality_score >= 4 ? 'medium' : 'low'}`}>{trade.execution_quality_score || '-'}/10</span></div>
      </div>

      <div className="section-tabs">
        {sections.map(section => (
          <button key={section.id} className={`tab-btn ${activeSection === section.id ? 'active' : ''}`} onClick={() => setActiveSection(section.id)}>{section.label}</button>
        ))}
      </div>

      <div className="trade-detail-content">{renderSection()}</div>

      <div className="detail-footer">
        <button className="btn-print" onClick={handlePrint} title="چاپ ترید">🖨️ چاپ</button>
        <button className="btn-excel" onClick={handleExportExcel} title="خروجی اکسل">📄 اکسل</button>
        <button className="btn-edit" onClick={handleEdit}>✏️ ویرایش</button>
      </div>
    </div>
  );
};

export default TradeDetail;