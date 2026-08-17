// frontend/src/components/TradeDetail.js

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import RealApiService from '../services/realApiService';
import ImageZoom from './ImageZoom';
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
  const [ruleChecks, setRuleChecks] = useState([]);
  const [ruleCompliance, setRuleCompliance] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        console.log('📊 Loading trade with id:', id);

        const tradeResponse = await RealApiService.getTrade(id);
        console.log('📊 Trade loaded:', tradeResponse.data);
        setTrade(tradeResponse.data);

        if (tradeResponse.data.rule_checks_detail) {
          setRuleChecks(tradeResponse.data.rule_checks_detail);
        }
        if (tradeResponse.data.rule_compliance) {
          setRuleCompliance(tradeResponse.data.rule_compliance);
        }

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

  // ===== تابع دریافت نام پورتفولیو =====
  const getPortfolioName = () => {
    if (trade.portfolio_info) {
      return `${trade.portfolio_info.icon || '📊'} ${trade.portfolio_info.name}`;
    }
    if (trade.portfolio && typeof trade.portfolio === 'object') {
      return `${trade.portfolio.icon || '📊'} ${trade.portfolio.name}`;
    }
    return 'بدون پورتفولیو';
  };

  // ===== تابع دریافت اطلاعات پورتفولیو =====
  const getPortfolioData = () => {
    if (trade.portfolio_info) {
      return trade.portfolio_info;
    }
    if (trade.portfolio && typeof trade.portfolio === 'object') {
      return trade.portfolio;
    }
    return null;
  };

  // توابع چاپ و اکسل و بقیه...
  const handlePrint = () => {
    if (!trade) return;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      showToast('لطفاً pop-up را فعال کنید', 'warning');
      return;
    }

    const categoryName = categories.find(c => c.id === (trade.group || trade.group_id))?.group_name || 'بدون دسته‌بندی';
    const portfolioName = getPortfolioName();

    const emotionLabels = {
      focus: 'تمرکز', calm: 'آرامش', excited: 'هیجان', fear: 'ترس',
      greed: 'طمع', relaxed: 'ریلکس', happy: 'خوشحال', sad: 'غمگین',
      energetic: 'پرانرژی', tired: 'خسته', fomo: 'FOMO', patience: 'صبر',
      contentment: 'قناعت'
    };
    const emotions = Object.keys(emotionLabels)
      .filter(key => trade[key])
      .map(key => emotionLabels[key])
      .join('، ') || '-';

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="fa">
      <head>
        <meta charset="UTF-8">
        <title>گزارش کامل ترید - ${trade.symbol}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Vazir', Tahoma, sans-serif; padding: 20px; background: #fff; color: #333; direction: rtl; }
          .print-header { text-align: center; padding-bottom: 15px; border-bottom: 3px solid #1a237e; margin-bottom: 15px; }
          .print-header h1 { font-size: 24px; color: #1a237e; }
          .print-header p { color: #666; font-size: 14px; }
          .trade-title { background: #1a237e; color: white; padding: 12px 20px; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: space-between; flex-wrap: wrap; }
          .trade-title .left { font-size: 18px; font-weight: 700; }
          .trade-title .right { font-size: 18px; font-weight: 700; }
          .section { margin-bottom: 15px; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }
          .section-title { background: #e8eaf6; padding: 10px 16px; font-weight: 700; color: #1a237e; font-size: 15px; }
          .section-body { padding: 12px 16px; }
          .detail-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f5f5f5; font-size: 13px; }
          .detail-row:last-child { border-bottom: none; }
          .detail-label { color: #555; font-weight: 500; }
          .detail-value { font-weight: 600; }
          .positive { color: #2e7d32; }
          .negative { color: #c62828; }
          .checked { color: #2e7d32; }
          .unchecked { color: #c62828; }
          .sleep-خوب { color: #2e7d32; }
          .sleep-متوسط { color: #f57c00; }
          .sleep-بد { color: #c62828; }
          .quality-high { color: #2e7d32; }
          .quality-medium { color: #f57c00; }
          .quality-low { color: #c62828; }
          .emotion-badge { display: inline-block; background: #e3f2fd; padding: 2px 10px; border-radius: 12px; margin: 2px 4px; font-size: 12px; }
          .print-footer { text-align: center; padding-top: 15px; border-top: 1px solid #e0e0e0; margin-top: 20px; color: #999; font-size: 11px; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 20px; }
          .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px 20px; }
          .full-width { grid-column: 1 / -1; }
          @media print { body { padding: 12px; } }
          .badge { display: inline-block; padding: 2px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
          .badge-buy { background: #c8e6c9; color: #1b5e20; }
          .badge-sell { background: #ffcdd2; color: #b71c1c; }
        </style>
      </head>
      <body>
        <div class="print-header">
          <h1>📊 ژورنال حرفه‌ای ترید</h1>
          <p>گزارش کامل جزئیات معامله</p>
        </div>

        <div class="trade-title">
          <span class="left">${trade.symbol} — ${trade.trade_type === 'Buy' ? 'خرید' : 'فروش'} (${trade.trade_date})</span>
          <span class="right ${parseFloat(trade.profit) >= 0 ? 'positive' : 'negative'}">
            سود/زیان: ${parseFloat(trade.profit) >= 0 ? '+' : ''}${parseFloat(trade.profit) || 0}$
          </span>
        </div>

        <!-- بخش ۰: اطلاعات پورتفولیو -->
        <div class="section">
          <div class="section-title">📊 پورتفولیو</div>
          <div class="section-body">
            <div class="detail-row">
              <span class="detail-label">پورتفولیو</span>
              <span class="detail-value">${portfolioName}</span>
            </div>
          </div>
        </div>

        <!-- بقیه بخش‌ها... -->
        <div class="section">
          <div class="section-title">📋 اطلاعات عمومی</div>
          <div class="section-body">
            <div class="grid-2">
              <div class="detail-row"><span class="detail-label">نماد</span><span class="detail-value">${trade.symbol}</span></div>
              <div class="detail-row"><span class="detail-label">تاریخ</span><span class="detail-value">${trade.trade_date}</span></div>
              <div class="detail-row"><span class="detail-label">نوع</span><span class="detail-value"><span class="badge ${trade.trade_type === 'Buy' ? 'badge-buy' : 'badge-sell'}">${trade.trade_type === 'Buy' ? 'خرید' : 'فروش'}</span></span></div>
              <div class="detail-row"><span class="detail-label">دسته‌بندی</span><span class="detail-value">${categoryName}</span></div>
              <div class="detail-row"><span class="detail-label">پورتفولیو</span><span class="detail-value">${portfolioName}</span></div>
              <div class="detail-row"><span class="detail-label">سود/زیان</span><span class="detail-value ${parseFloat(trade.profit) >= 0 ? 'positive' : 'negative'}">${parseFloat(trade.profit) >= 0 ? '+' : ''}${parseFloat(trade.profit) || 0}$</span></div>
              <div class="detail-row"><span class="detail-label">کیفیت اجرا</span><span class="detail-value quality-${trade.execution_quality_score >= 7 ? 'high' : trade.execution_quality_score >= 4 ? 'medium' : 'low'}">${trade.execution_quality_score || '-'}/10</span></div>
              <div class="detail-row"><span class="detail-label">نوع جلسه</span><span class="detail-value">${trade.session_type || '-'}</span></div>
              <div class="detail-row"><span class="detail-label">ساعت (نیویورک)</span><span class="detail-value">${trade.time_ny || '-'}</span></div>
              <div class="detail-row"><span class="detail-label">روز هفته</span><span class="detail-value">${trade.day_of_week || '-'}</span></div>
              <div class="detail-row full-width"><span class="detail-label">یادداشت هفتگی</span><span class="detail-value">${trade.weekly_profile_note || '-'}</span></div>
            </div>
          </div>
        </div>

        <!-- بقیه بخش‌ها مانند قبل... -->
        <!-- بخش ۲: اجرا -->
        <div class="section">
          <div class="section-title">💰 جزئیات اجرا</div>
          <div class="section-body">
            <div class="grid-2">
              <div class="detail-row"><span class="detail-label">قیمت ورود</span><span class="detail-value">${trade.entry_price || '-'}</span></div>
              <div class="detail-row"><span class="detail-label">قیمت خروج</span><span class="detail-value">${trade.close_price || '-'}</span></div>
              <div class="detail-row"><span class="detail-label">حد ضرر (SL)</span><span class="detail-value">${trade.stop_loss || '-'}</span></div>
              <div class="detail-row"><span class="detail-label">حد سود اول (TP1)</span><span class="detail-value">${trade.take_profit_1 || '-'}</span></div>
              <div class="detail-row"><span class="detail-label">حد سود دوم (TP2)</span><span class="detail-value">${trade.take_profit_2 || '-'}</span></div>
              <div class="detail-row"><span class="detail-label">حد سود سوم (TP3)</span><span class="detail-value">${trade.take_profit_3 || '-'}</span></div>
              <div class="detail-row"><span class="detail-label">حد خورده شده</span><span class="detail-value">${trade.tp_sl_hit || '-'}</span></div>
              <div class="detail-row"><span class="detail-label">نسبت R:R</span><span class="detail-value">${trade.risk_reward_ratio || '-'}</span></div>
              <div class="detail-row"><span class="detail-label">ریسک (دلار)</span><span class="detail-value">$${trade.risk_usd || '0'}</span></div>
              <div class="detail-row"><span class="detail-label">درصد ریسک</span><span class="detail-value">${trade.risk_percent || '0'}%</span></div>
              <div class="detail-row full-width"><span class="detail-label">کیفیت اجرا</span><span class="detail-value quality-${trade.execution_quality_score >= 7 ? 'high' : trade.execution_quality_score >= 4 ? 'medium' : 'low'}">${trade.execution_quality_score || '-'}/10</span></div>
            </div>
          </div>
        </div>

        <!-- بخش ۳: روانشناسی -->
        <div class="section">
          <div class="section-title">🧠 روانشناسی معامله</div>
          <div class="section-body">
            <div class="grid-2">
              <div class="detail-row"><span class="detail-label">کیفیت خواب</span><span class="detail-value sleep-${trade.sleep_quality}">${trade.sleep_quality || '-'}</span></div>
              <div class="detail-row"><span class="detail-label">تغذیه مناسب</span><span class="detail-value ${trade.food_status ? 'checked' : 'unchecked'}">${trade.food_status ? '✅ بله' : '❌ خیر'}</span></div>
              <div class="detail-row"><span class="detail-label">احساس غالب</span><span class="detail-value">${trade.dominant_feeling || '-'}</span></div>
              <div class="detail-row"><span class="detail-label">استرس قبل معامله</span><span class="detail-value">${trade.pre_trade_stress || '-'}</span></div>
              <div class="detail-row"><span class="detail-label">کنترل هیجان هنگام ورود</span><span class="detail-value">${trade.entry_emotion_control || '-'}</span></div>
              <div class="detail-row"><span class="detail-label">واکنش به سود</span><span class="detail-value">${trade.reaction_to_profit || '-'}</span></div>
              <div class="detail-row"><span class="detail-label">مدیریت انتظار</span><span class="detail-value">${trade.expectation_management || '-'}</span></div>
              <div class="detail-row full-width"><span class="detail-label">کنترل احساسات پس از ضرر</span><span class="detail-value">${trade.emotion_after_losses || '-'}</span></div>
              <div class="detail-row full-width"><span class="detail-label">احساسات</span><span class="detail-value">${emotions}</span></div>
            </div>
          </div>
        </div>

        <!-- بخش ۴: چک‌لیست -->
        <div class="section">
          <div class="section-title">✅ چک‌لیست روزانه</div>
          <div class="section-body">
            <div class="grid-2">
              <div class="detail-row"><span class="detail-label">SMT تایید شد</span><span class="detail-value ${trade.smt_confirmed ? 'checked' : 'unchecked'}">${trade.smt_confirmed ? '✅ بله' : '❌ خیر'}</span></div>
              <div class="detail-row"><span class="detail-label">سطوح کلیدی بررسی شد</span><span class="detail-value ${trade.key_levels_reviewed ? 'checked' : 'unchecked'}">${trade.key_levels_reviewed ? '✅ بله' : '❌ خیر'}</span></div>
              <div class="detail-row"><span class="detail-label">حمایت BOND/DXY</span><span class="detail-value ${trade.bond_dxy_support ? 'checked' : 'unchecked'}">${trade.bond_dxy_support ? '✅ بله' : '❌ خیر'}</span></div>
              <div class="detail-row"><span class="detail-label">اخبار هفتگی چاپ شد</span><span class="detail-value ${trade.weekly_news_printed ? 'checked' : 'unchecked'}">${trade.weekly_news_printed ? '✅ بله' : '❌ خیر'}</span></div>
              <div class="detail-row"><span class="detail-label">ساعت صفر مشخص شد</span><span class="detail-value ${trade.zero_hour_identified ? 'checked' : 'unchecked'}">${trade.zero_hour_identified ? '✅ بله' : '❌ خیر'}</span></div>
              <div class="detail-row"><span class="detail-label">رنج آسیا مشخص شد</span><span class="detail-value ${trade.asian_range_identified ? 'checked' : 'unchecked'}">${trade.asian_range_identified ? '✅ بله' : '❌ خیر'}</span></div>
              <div class="detail-row"><span class="detail-label">رنج لندن مشخص شد</span><span class="detail-value ${trade.london_range_identified ? 'checked' : 'unchecked'}">${trade.london_range_identified ? '✅ بله' : '❌ خیر'}</span></div>
              <div class="detail-row"><span class="detail-label">Judas LO مشخص شد</span><span class="detail-value ${trade.judas_lo_identified ? 'checked' : 'unchecked'}">${trade.judas_lo_identified ? '✅ بله' : '❌ خیر'}</span></div>
              <div class="detail-row full-width"><span class="detail-label">توضیحات تکمیلی</span><span class="detail-value">${trade.checklist_extra || '-'}</span></div>
            </div>
          </div>
        </div>

        <!-- بخش ۵: بازبینی -->
        <div class="section">
          <div class="section-title">🔄 بازبینی و اشتباهات</div>
          <div class="section-body">
            <div class="grid-2">
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
        </div>

        <!-- بخش ۶: ICT -->
        <div class="section">
          <div class="section-title">📊 تحلیل ICT</div>
          <div class="section-body">
            <div class="grid-2">
              <div class="detail-row"><span class="detail-label">FVG</span><span class="detail-value">${trade.fvg || '-'}</span></div>
              <div class="detail-row"><span class="detail-label">Order Block</span><span class="detail-value">${trade.order_block || '-'}</span></div>
              <div class="detail-row"><span class="detail-label">BOS</span><span class="detail-value">${trade.bos || '-'}</span></div>
              <div class="detail-row"><span class="detail-label">CHOCH</span><span class="detail-value">${trade.choch || '-'}</span></div>
              <div class="detail-row"><span class="detail-label">MSS</span><span class="detail-value">${trade.mss || '-'}</span></div>
              <div class="detail-row"><span class="detail-label">Liquidity Sweep</span><span class="detail-value">${trade.liquidity_sweep || '-'}</span></div>
              <div class="detail-row"><span class="detail-label">POI</span><span class="detail-value">${trade.poi || '-'}</span></div>
              <div class="detail-row"><span class="detail-label">Demand Zone</span><span class="detail-value">${trade.demand_zone || '-'}</span></div>
              <div class="detail-row"><span class="detail-label">Supply Zone</span><span class="detail-value">${trade.supply_zone || '-'}</span></div>
            </div>
          </div>
        </div>

        <!-- بخش ۷: تصویر چارت -->
        ${trade.screenshot ? `
        <div class="section">
          <div class="section-title">🖼️ تصویر چارت</div>
          <div class="section-body" style="text-align: center;">
            <img src="${trade.screenshot}" 
                 alt="چارت ${trade.symbol}" 
                 style="max-width: 100%; max-height: 500px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
          </div>
        </div>
        ` : ''}

        <div class="print-footer">
          چاپ شده در: ${new Date().toLocaleDateString('fa-IR')} — ${new Date().toLocaleTimeString('fa-IR')}
          <br>تولید شده توسط ژورنال حرفه‌ای ترید
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 600);
          };
        <\/script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleExportExcel = () => {
    if (!trade) return;

    const BOM = '\uFEFF';
    const categoryName = categories.find(c => c.id === (trade.group || trade.group_id))?.group_name || 'بدون دسته‌بندی';
    const portfolioName = getPortfolioName();

    const headers = [
      'شناسه', 'تاریخ', 'روز هفته', 'ماه', 'ساعت (نیویورک)', 'نماد',
      'نوع ترید', 'نوع جلسه', 'یادداشت هفتگی', 'کیفیت خواب', 'تغذیه مناسب',
      'تمرکز', 'آرامش', 'هیجان', 'ترس', 'طمع', 'ریلکس', 'خوشحال', 'غمگین',
      'پرانرژی', 'خسته', 'FOMO', 'صبر', 'قناعت', 'احساس غالب',
      'بایاس', 'نوع استراتژی', 'تایم‌فریم D1', 'تایم‌فریم H4', 'تایم‌فریم H1',
      'تایم‌فریم M15', 'تایم‌فریم M5', 'تایم‌فریم M1', 'مدل ورودی',
      'اخبار هفتگی چاپ شد', 'ساعت صفر مشخص شد', 'رنج آسیا مشخص شد',
      'رنج لندن مشخص شد', 'Judas LO مشخص شد', 'سطوح کلیدی بررسی شد',
      'SMT تایید شد', 'حمایت BOND/DXY', 'توضیحات تکمیلی',
      'قیمت ورود', 'حد ضرر', 'حد سود TP1', 'حد سود TP2', 'حد سود TP3',
      'ریسک (دلار)', 'درصد ریسک', 'نسبت R:R', 'قیمت خروج', 'حد خورده شده',
      'سود/زیان', 'استرس قبل معامله', 'کنترل هیجان هنگام ورود',
      'واکنش به سود', 'پایبندی به حد ضرر', 'مدیریت انتظار',
      'پایبندی به استراتژی', 'پایبندی به مدیریت سرمایه', 'اورترید',
      'کنترل احساسات پس از ضرر', 'کد اشتباه', 'وزن اشتباه',
      'اسکن پس از معامله', 'دلیل ورود یادداشت شد', 'دلیل خروج یادداشت شد',
      'اشتباهات ثبت شد', 'کیفیت اجرا', 'FVG', 'Order Block', 'BOS',
      'CHOCH', 'MSS', 'Liquidity Sweep', 'POI', 'Demand Zone', 'Supply Zone',
      'دسته‌بندی', 'پورتفولیو', 'تاریخ ایجاد', 'تاریخ بروزرسانی',
      'تصویر چارت'
    ];

    let csvContent = BOM + headers.join(',') + '\n';

    const row = [
      trade.id || '',
      trade.trade_date || '',
      trade.day_of_week || '',
      trade.month || '',
      trade.time_ny || '',
      trade.symbol || '',
      trade.trade_type === 'Buy' ? 'خرید' : 'فروش',
      trade.session_type || '',
      `"${(trade.weekly_profile_note || '').replace(/"/g, '""')}"`,
      trade.sleep_quality || '',
      trade.food_status ? 'بله' : 'خیر',
      trade.focus ? 'بله' : 'خیر',
      trade.calm ? 'بله' : 'خیر',
      trade.excited ? 'بله' : 'خیر',
      trade.fear ? 'بله' : 'خیر',
      trade.greed ? 'بله' : 'خیر',
      trade.relaxed ? 'بله' : 'خیر',
      trade.happy ? 'بله' : 'خیر',
      trade.sad ? 'بله' : 'خیر',
      trade.energetic ? 'بله' : 'خیر',
      trade.tired ? 'بله' : 'خیر',
      trade.fomo ? 'بله' : 'خیر',
      trade.patience ? 'بله' : 'خیر',
      trade.contentment ? 'بله' : 'خیر',
      trade.dominant_feeling || '',
      trade.bias || '',
      trade.strategy_type || '',
      trade.timeframe_d ? 'بله' : 'خیر',
      trade.timeframe_h4 ? 'بله' : 'خیر',
      trade.timeframe_h1 ? 'بله' : 'خیر',
      trade.timeframe_m15 ? 'بله' : 'خیر',
      trade.timeframe_m5 ? 'بله' : 'خیر',
      trade.timeframe_m1 ? 'بله' : 'خیر',
      trade.retirement_model || '',
      trade.weekly_news_printed ? 'بله' : 'خیر',
      trade.zero_hour_identified ? 'بله' : 'خیر',
      trade.asian_range_identified ? 'بله' : 'خیر',
      trade.london_range_identified ? 'بله' : 'خیر',
      trade.judas_lo_identified ? 'بله' : 'خیر',
      trade.key_levels_reviewed ? 'بله' : 'خیر',
      trade.smt_confirmed ? 'بله' : 'خیر',
      trade.bond_dxy_support ? 'بله' : 'خیر',
      `"${(trade.checklist_extra || '').replace(/"/g, '""')}"`,
      trade.entry_price || '',
      trade.stop_loss || '',
      trade.take_profit_1 || '',
      trade.take_profit_2 || '',
      trade.take_profit_3 || '',
      trade.risk_usd || '0',
      trade.risk_percent || '0',
      trade.risk_reward_ratio || '',
      trade.close_price || '',
      trade.tp_sl_hit || '',
      trade.profit || 0,
      trade.pre_trade_stress || '',
      trade.entry_emotion_control || '',
      trade.reaction_to_profit || '',
      trade.stop_loss_adherence ? 'بله' : 'خیر',
      trade.expectation_management || '',
      trade.strategy_adherence ? 'بله' : 'خیر',
      trade.capital_management_adherence ? 'بله' : 'خیر',
      trade.over_trade ? 'بله' : 'خیر',
      `"${(trade.emotion_after_losses || '').replace(/"/g, '""')}"`,
      trade.mistake_code || '',
      trade.mistake_weight || '',
      trade.post_trade_scan ? 'بله' : 'خیر',
      trade.entry_reason_written ? 'بله' : 'خیر',
      trade.exit_reason_written ? 'بله' : 'خیر',
      trade.mistakes_recorded ? 'بله' : 'خیر',
      trade.execution_quality_score || '',
      trade.fvg || '',
      trade.order_block || '',
      trade.bos || '',
      trade.choch || '',
      trade.mss || '',
      trade.liquidity_sweep || '',
      trade.poi || '',
      trade.demand_zone || '',
      trade.supply_zone || '',
      categoryName,
      portfolioName,
      trade.created_at || '',
      trade.updated_at || '',
      trade.screenshot || ''
    ];

    csvContent += row.join(',') + '\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `trade_${trade.symbol}_${trade.trade_date}_full.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    showToast('✅ خروجی اکسل کامل با موفقیت دانلود شد', 'success');
  };

  const sections = [
    { id: 'general', label: '📋 عمومی' },
    { id: 'execution', label: '💰 اجرا' },
    { id: 'psychology', label: '🧠 روانشناسی' },
    { id: 'checklist', label: '✅ چک‌لیست' },
    { id: 'review', label: '🔄 بازبینی' },
    { id: 'ict', label: '📊 ICT' },
    { id: 'rules', label: '📋 قوانین' },
    { id: 'screenshot', label: '🖼️ چارت' },
  ];

  const renderGeneral = () => {
    const portfolioData = getPortfolioData();
    return (
      <div className="detail-section">
        <h3>📋 اطلاعات عمومی</h3>
        <div className="detail-grid">
          <div className="detail-item"><span className="label">نماد</span><span className="value">{trade.symbol}</span></div>
          <div className="detail-item"><span className="label">تاریخ</span><span className="value">{trade.trade_date}</span></div>
          <div className="detail-item"><span className="label">نوع</span><span className={`value ${trade.trade_type === 'Buy' ? 'buy' : 'sell'}`}>{trade.trade_type === 'Buy' ? 'خرید' : 'فروش'}</span></div>
          <div className="detail-item"><span className="label">دسته‌بندی</span><span className="value">{categories.find(c => c.id === (trade.group || trade.group_id))?.group_name || 'بدون دسته‌بندی'}</span></div>
          <div className="detail-item"><span className="label">پورتفولیو</span><span className="value">{portfolioData ? `${portfolioData.icon || '📊'} ${portfolioData.name}` : 'بدون پورتفولیو'}</span></div>
          <div className="detail-item"><span className="label">سود/زیان</span><span className={`value ${parseFloat(trade.profit) >= 0 ? 'profit' : 'loss'}`}>{parseFloat(trade.profit) >= 0 ? '+' : ''}{parseFloat(trade.profit) || 0}$</span></div>
          <div className="detail-item"><span className="label">کیفیت اجرا</span><span className={`value quality-${trade.execution_quality_score >= 7 ? 'high' : trade.execution_quality_score >= 4 ? 'medium' : 'low'}`}>{trade.execution_quality_score || '-'}/10</span></div>
          <div className="detail-item"><span className="label">نوع جلسه</span><span className="value">{trade.session_type || '-'}</span></div>
          <div className="detail-item"><span className="label">ساعت (نیویورک)</span><span className="value">{trade.time_ny || '-'}</span></div>
          <div className="detail-item"><span className="label">روز هفته</span><span className="value">{trade.day_of_week || '-'}</span></div>
          <div className="detail-item full-width"><span className="label">یادداشت هفتگی</span><span className="value">{trade.weekly_profile_note || '-'}</span></div>
        </div>
      </div>
    );
  };

  // بقیه توابع رندر (همانند قبل با اضافه شدن پورتفولیو در عمومی)
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
        <div className="detail-item"><span className="label">حد خورده شده</span><span className="value">{trade.tp_sl_hit || '-'}</span></div>
        <div className="detail-item"><span className="label">نسبت R:R</span><span className="value">{trade.risk_reward_ratio || '-'}</span></div>
        <div className="detail-item"><span className="label">ریسک (دلار)</span><span className="value">${trade.risk_usd || '0'}</span></div>
        <div className="detail-item"><span className="label">درصد ریسک</span><span className="value">{trade.risk_percent || '0'}%</span></div>
        <div className="detail-item"><span className="label">کیفیت اجرا</span><span className={`value quality-${trade.execution_quality_score >= 7 ? 'high' : trade.execution_quality_score >= 4 ? 'medium' : 'low'}`}>{trade.execution_quality_score || '-'}/10</span></div>
      </div>
    </div>
  );

  const renderPsychology = () => {
    const emotionLabels = {
      focus: 'تمرکز', calm: 'آرامش', excited: 'هیجان', fear: 'ترس',
      greed: 'طمع', relaxed: 'ریلکس', happy: 'خوشحال', sad: 'غمگین',
      energetic: 'پرانرژی', tired: 'خسته', fomo: 'FOMO', patience: 'صبر',
      contentment: 'قناعت'
    };
    const emotions = Object.keys(emotionLabels)
      .filter(key => trade[key])
      .map(key => emotionLabels[key]);

    return (
      <div className="detail-section">
        <h3>🧠 روانشناسی معامله</h3>
        <div className="detail-grid">
          <div className="detail-item"><span className="label">کیفیت خواب</span><span className={`value sleep-${trade.sleep_quality}`}>{trade.sleep_quality || '-'}</span></div>
          <div className="detail-item"><span className="label">تغذیه مناسب</span><span className={`value ${trade.food_status ? 'checked' : 'unchecked'}`}>{trade.food_status ? '✅ بله' : '❌ خیر'}</span></div>
          <div className="detail-item"><span className="label">احساس غالب</span><span className="value">{trade.dominant_feeling || '-'}</span></div>
          <div className="detail-item"><span className="label">استرس قبل معامله</span><span className="value">{trade.pre_trade_stress || '-'}</span></div>
          <div className="detail-item"><span className="label">کنترل هیجان هنگام ورود</span><span className="value">{trade.entry_emotion_control || '-'}</span></div>
          <div className="detail-item"><span className="label">واکنش به سود</span><span className="value">{trade.reaction_to_profit || '-'}</span></div>
          <div className="detail-item"><span className="label">مدیریت انتظار</span><span className="value">{trade.expectation_management || '-'}</span></div>
          <div className="detail-item full-width"><span className="label">کنترل احساسات پس از ضرر</span><span className="value">{trade.emotion_after_losses || '-'}</span></div>
          <div className="detail-item full-width">
            <span className="label">احساسات</span>
            <span className="value">
              {emotions.length > 0 ? emotions.map((em, i) => <span key={i} className="emotion-badge">{em}</span>) : '-'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderChecklist = () => (
    <div className="detail-section">
      <h3>✅ چک‌لیست روزانه</h3>
      <div className="detail-grid">
        <div className="detail-item"><span className="label">SMT تایید شد</span><span className={`value ${trade.smt_confirmed ? 'checked' : 'unchecked'}`}>{trade.smt_confirmed ? '✅ بله' : '❌ خیر'}</span></div>
        <div className="detail-item"><span className="label">سطوح کلیدی بررسی شد</span><span className={`value ${trade.key_levels_reviewed ? 'checked' : 'unchecked'}`}>{trade.key_levels_reviewed ? '✅ بله' : '❌ خیر'}</span></div>
        <div className="detail-item"><span className="label">حمایت BOND/DXY</span><span className={`value ${trade.bond_dxy_support ? 'checked' : 'unchecked'}`}>{trade.bond_dxy_support ? '✅ بله' : '❌ خیر'}</span></div>
        <div className="detail-item"><span className="label">اخبار هفتگی چاپ شد</span><span className={`value ${trade.weekly_news_printed ? 'checked' : 'unchecked'}`}>{trade.weekly_news_printed ? '✅ بله' : '❌ خیر'}</span></div>
        <div className="detail-item"><span className="label">ساعت صفر مشخص شد</span><span className={`value ${trade.zero_hour_identified ? 'checked' : 'unchecked'}`}>{trade.zero_hour_identified ? '✅ بله' : '❌ خیر'}</span></div>
        <div className="detail-item"><span className="label">رنج آسیا مشخص شد</span><span className={`value ${trade.asian_range_identified ? 'checked' : 'unchecked'}`}>{trade.asian_range_identified ? '✅ بله' : '❌ خیر'}</span></div>
        <div className="detail-item"><span className="label">رنج لندن مشخص شد</span><span className={`value ${trade.london_range_identified ? 'checked' : 'unchecked'}`}>{trade.london_range_identified ? '✅ بله' : '❌ خیر'}</span></div>
        <div className="detail-item"><span className="label">Judas LO مشخص شد</span><span className={`value ${trade.judas_lo_identified ? 'checked' : 'unchecked'}`}>{trade.judas_lo_identified ? '✅ بله' : '❌ خیر'}</span></div>
        <div className="detail-item full-width"><span className="label">توضیحات تکمیلی</span><span className="value">{trade.checklist_extra || '-'}</span></div>
      </div>
    </div>
  );

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

  const renderRules = () => {
    if (!ruleChecks || ruleChecks.length === 0) {
      return (
        <div className="detail-section">
          <h3>📋 قوانین معاملاتی</h3>
          <p className="no-data-message">هیچ قانونی برای این ترید ثبت نشده است.</p>
        </div>
      );
    }

    const checkedCount = ruleChecks.filter(r => r.is_checked).length;
    const totalCount = ruleChecks.length;
    const percentage = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

    const grouped = ruleChecks.reduce((acc, item) => {
      const cat = item.rule_category || 'متفرقه';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
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
      <div className="detail-section">
        <div className="rules-compliance-header">
          <h3>📋 قوانین معاملاتی</h3>
          <div className="compliance-badge">
            <span className="compliance-number">{percentage}%</span>
            <span className="compliance-label">پایبندی</span>
          </div>
        </div>

        <div className="rules-summary-bar">
          <span>{checkedCount} از {totalCount} قانون رعایت شده</span>
          <div className="compliance-bar">
            <div className="compliance-fill" style={{ width: `${percentage}%` }} />
          </div>
        </div>

        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="rules-category-detail">
            <div className="category-header">
              <span className="category-icon">{categoryIcons[category] || '📋'}</span>
              <span className="category-name">{category}</span>
              <span className="category-count">
                {items.filter(r => r.is_checked).length}/{items.length}
              </span>
            </div>
            <div className="rules-list-detail">
              {items.map((item, index) => (
                <div key={index} className={`rule-detail-item ${item.is_checked ? 'checked' : 'unchecked'}`}>
                  <span className="rule-status">{item.is_checked ? '✅' : '❌'}</span>
                  <span className="rule-text">{item.rule_text}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderScreenshot = () => {
    if (!trade.screenshot) {
      return (
        <div className="detail-section">
          <h3>🖼️ تصویر چارت</h3>
          <p className="no-data-message">هیچ تصویری برای این ترید آپلود نشده است.</p>
        </div>
      );
    }

    const imageUrl = trade.screenshot;

    return (
      <div className="detail-section">
        <h3>🖼️ تصویر چارت</h3>
        <div className="screenshot-container">
          <ImageZoom src={imageUrl} alt={`چارت ${trade.symbol}`} />
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'general': return renderGeneral();
      case 'execution': return renderExecution();
      case 'psychology': return renderPsychology();
      case 'checklist': return renderChecklist();
      case 'review': return renderReview();
      case 'ict': return renderICT();
      case 'rules': return renderRules();
      case 'screenshot': return renderScreenshot();
      default: return null;
    }
  };

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
        <div className="summary-item">
          <span className="summary-label">تاریخ</span>
          <span className="summary-value">{trade.trade_date}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">سود/زیان</span>
          <span className={`summary-value ${parseFloat(trade.profit) >= 0 ? 'positive' : 'negative'}`}>
            {parseFloat(trade.profit) >= 0 ? '+' : ''}{parseFloat(trade.profit) || 0}$
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">نوع</span>
          <span className={`summary-value ${trade.trade_type === 'Buy' ? 'buy' : 'sell'}`}>
            {trade.trade_type === 'Buy' ? 'خرید' : 'فروش'}
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">کیفیت اجرا</span>
          <span className={`summary-value quality-${trade.execution_quality_score >= 7 ? 'high' : trade.execution_quality_score >= 4 ? 'medium' : 'low'}`}>
            {trade.execution_quality_score || '-'}/10
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">پورتفولیو</span>
          <span className="summary-value">{getPortfolioData() ? `${getPortfolioData().icon || '📊'} ${getPortfolioData().name}` : 'بدون پورتفولیو'}</span>
        </div>
      </div>

      <div className="section-tabs">
        {sections.map(section => (
          <button
            key={section.id}
            className={`tab-btn ${activeSection === section.id ? 'active' : ''}`}
            onClick={() => setActiveSection(section.id)}
          >
            {section.label}
          </button>
        ))}
      </div>

      <div className="trade-detail-content">
        {renderContent()}
      </div>

      <div className="detail-footer">
        <button className="btn-print" onClick={handlePrint} title="چاپ کامل">🖨️ چاپ کامل</button>
        <button className="btn-excel" onClick={handleExportExcel} title="خروجی اکسل کامل">📄 اکسل کامل</button>
        <button className="btn-edit" onClick={handleEdit}>✏️ ویرایش</button>
      </div>
    </div>
  );
};

export default TradeDetail;