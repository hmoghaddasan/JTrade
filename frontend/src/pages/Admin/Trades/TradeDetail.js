// frontend/src/pages/Admin/Trades/TradeDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import adminService from '../../../services/adminService';
import LoadingSpinner from '../../../components/Admin/LoadingSpinner';
import StatusBadge from '../../../components/Admin/StatusBadge';
import './TradeDetail.css';

const TradeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trade, setTrade] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrade();
  }, [id]);

  const loadTrade = async () => {
    setLoading(true);
    try {
      const response = await adminService.getTrade(id);
      setTrade(response.data);
    } catch (error) {
      console.error('Error loading trade:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!trade) return <div className="error">ترید یافت نشد</div>;

  return (
    <div className="trade-detail-page">
      <div className="page-header">
        <h1>جزئیات ترید #{trade.id}</h1>
        <button onClick={() => navigate('/admin/trades')} className="btn-back">
          🔙 بازگشت
        </button>
      </div>

      <div className="detail-grid">
        <div className="info-card">
          <h3>اطلاعات کاربر</h3>
          <div className="info-row">
            <span className="label">شماره تلفن:</span>
            <span className="value">{trade.user_phone}</span>
          </div>
          <div className="info-row">
            <span className="label">نام:</span>
            <span className="value">{trade.user_name || '—'}</span>
          </div>
        </div>

        <div className="info-card">
          <h3>اطلاعات معامله</h3>
          <div className="info-row">
            <span className="label">تاریخ:</span>
            <span className="value">{new Date(trade.trade_date).toLocaleDateString('fa-IR')}</span>
          </div>
          <div className="info-row">
            <span className="label">روز هفته:</span>
            <span className="value">{trade.day_of_week}</span>
          </div>
          <div className="info-row">
            <span className="label">ساعت (NY):</span>
            <span className="value">{trade.time_ny || '—'}</span>
          </div>
          <div className="info-row">
            <span className="label">نماد:</span>
            <span className="value">{trade.symbol}</span>
          </div>
          <div className="info-row">
            <span className="label">نوع:</span>
            <StatusBadge status={trade.trade_type === 'Buy' ? 'green' : 'red'} label={trade.trade_type === 'Buy' ? 'خرید' : 'فروش'} />
          </div>
          <div className="info-row">
            <span className="label">دسته‌بندی:</span>
            <span className="value">{trade.group_name || '—'}</span>
          </div>
          <div className="info-row">
            <span className="label">نوع جلسه:</span>
            <span className="value">{trade.session_type || '—'}</span>
          </div>
          <div className="info-row">
            <span className="label">استراتژی:</span>
            <span className="value">{trade.strategy_type || '—'}</span>
          </div>
        </div>

        <div className="info-card">
          <h3>قیمت‌ها و ریسک</h3>
          <div className="info-row">
            <span className="label">قیمت ورود:</span>
            <span className="value">{trade.entry_price}</span>
          </div>
          <div className="info-row">
            <span className="label">حد ضرر:</span>
            <span className="value">{trade.stop_loss || '—'}</span>
          </div>
          <div className="info-row">
            <span className="label">حد سود ۱:</span>
            <span className="value">{trade.take_profit_1 || '—'}</span>
          </div>
          <div className="info-row">
            <span className="label">حد سود ۲:</span>
            <span className="value">{trade.take_profit_2 || '—'}</span>
          </div>
          <div className="info-row">
            <span className="label">ریسک (دلار):</span>
            <span className="value">{trade.risk_usd?.toLocaleString() || '—'}</span>
          </div>
          <div className="info-row">
            <span className="label">درصد ریسک:</span>
            <span className="value">{trade.risk_percent ? `${trade.risk_percent}%` : '—'}</span>
          </div>
          <div className="info-row">
            <span className="label">نسبت R:R:</span>
            <span className="value">{trade.risk_reward_ratio?.toFixed(2) || '—'}</span>
          </div>
        </div>

        <div className="info-card">
          <h3>نتیجه معامله</h3>
          <div className="info-row">
            <span className="label">قیمت بسته‌شده:</span>
            <span className="value">{trade.close_price || '—'}</span>
          </div>
          <div className="info-row">
            <span className="label">حد خورده شده:</span>
            <span className="value">{trade.tp_sl_hit || '—'}</span>
          </div>
          <div className="info-row">
            <span className="label">سود/زیان:</span>
            <span className="value" style={{ color: trade.profit > 0 ? 'green' : trade.profit < 0 ? 'red' : 'gray', fontWeight: 'bold', fontSize: '18px' }}>
              {trade.profit?.toLocaleString() || '—'} تومان
            </span>
          </div>
          <div className="info-row">
            <span className="label">کیفیت اجرا:</span>
            <span className="value">{trade.execution_quality_score ? `${trade.execution_quality_score}/10` : '—'}</span>
          </div>
        </div>

        <div className="info-card full-width">
          <h3>روانشناسی و مدیریت</h3>
          <div className="info-grid-3">
            <div>
              <span className="label">استرس قبل معامله:</span>
              <span className="value">{trade.pre_trade_stress || '—'}</span>
            </div>
            <div>
              <span className="label">کنترل هیجان:</span>
              <span className="value">{trade.entry_emotion_control || '—'}</span>
            </div>
            <div>
              <span className="label">مدیریت انتظار:</span>
              <span className="value">{trade.expectation_management || '—'}</span>
            </div>
            <div>
              <span className="label">پایبندی به حد ضرر:</span>
              <StatusBadge status={trade.stop_loss_adherence ? 'active' : 'inactive'} label={trade.stop_loss_adherence ? 'بله' : 'خیر'} />
            </div>
            <div>
              <span className="label">پایبندی به استراتژی:</span>
              <StatusBadge status={trade.strategy_adherence ? 'active' : 'inactive'} label={trade.strategy_adherence ? 'بله' : 'خیر'} />
            </div>
            <div>
              <span className="label">اورترید:</span>
              <StatusBadge status={trade.over_trade ? 'red' : 'active'} label={trade.over_trade ? 'بله' : 'خیر'} />
            </div>
          </div>
          {trade.mistake_code && (
            <div className="info-row">
              <span className="label">کد اشتباه:</span>
              <span className="value">{trade.mistake_code}</span>
            </div>
          )}
          {trade.emotion_after_losses && (
            <div className="info-row">
              <span className="label">کنترل احساسات پس از ضرر:</span>
              <span className="value">{trade.emotion_after_losses}</span>
            </div>
          )}
        </div>

        {trade.screenshot && (
          <div className="info-card full-width">
            <h3>تصویر چارت</h3>
            <img src={trade.screenshot} alt="چارت معامله" className="screenshot-image" />
          </div>
        )}
      </div>
    </div>
  );
};

export default TradeDetail;