// frontend/src/components/discipline/DisciplineWidget.js

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import disciplineService from '../../services/disciplineService';
import './DisciplineWidget.css';

const DisciplineWidget = ({ onNavigate }) => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isCollapsed, setIsCollapsed] = useState(true); // حالت پیش‌فرض: جمع‌شده

    useEffect(() => {
        loadStatus();
        const interval = setInterval(loadStatus, 60000); // هر دقیقه
        return () => clearInterval(interval);
    }, []);

    const loadStatus = async () => {
        try {
            const response = await disciplineService.getStatus();
            setStatus(response.data);
        } catch (error) {
            console.error('Error loading discipline status:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleCollapse = () => setIsCollapsed(prev => !prev);

    if (loading) {
        return (
            <div className="discipline-widget loading">
                <div className="spinner">⏳</div>
            </div>
        );
    }

    if (!status) {
        return null;
    }

    const {
        tiltmeter_score,
        compliance_rate,
        trades_today,
        max_trades_per_day,
        daily_loss,
        daily_loss_limit,
        is_cooldown_active,
        cooldown_remaining,
        consecutive_losses,
        cooldown_consecutive_losses,
        is_locked,
        date,
    } = status;

    // محاسبه درصد برای نوار پیشرفت
    const tiltmeterPercent = Math.min(tiltmeter_score, 100);
    const tradesPercent = max_trades_per_day > 0 ? Math.min((trades_today / max_trades_per_day) * 100, 100) : 0;
    const lossPercent = daily_loss_limit > 0 ? Math.min((daily_loss / daily_loss_limit) * 100, 100) : 0;

    // تعیین رنگ Tiltmeter
    const getTiltmeterColor = (score) => {
        if (score >= 80) return '#2e7d32';
        if (score >= 60) return '#f9a825';
        if (score >= 40) return '#ef6c00';
        return '#c62828';
    };

    // تعیین وضعیت کلی
    const getStatusIcon = () => {
        if (is_locked || is_cooldown_active) return '🔒';
        if (tiltmeter_score >= 80) return '🟢';
        if (tiltmeter_score >= 60) return '🟡';
        return '🔴';
    };

    const getStatusText = () => {
        if (is_locked) return 'قفل تا پایان روز';
        if (is_cooldown_active) return `کول‌داون ${cooldown_remaining} دقیقه`;
        if (tiltmeter_score >= 80) return 'انضباط عالی';
        if (tiltmeter_score >= 60) return 'انضباط خوب';
        if (tiltmeter_score >= 40) return 'نیاز به توجه';
        return 'هشدار';
    };

    return (
        <div className={`discipline-widget ${isCollapsed ? 'collapsed' : 'expanded'} ${is_cooldown_active || is_locked ? 'locked' : ''}`}>
            {/* ===== هدر ویجت (همیشه قابل مشاهده) ===== */}
            <div className="widget-header" onClick={toggleCollapse}>
                <div className="header-left">
                    <span className="widget-icon">🛡️</span>
                    <span className="widget-title">وضعیت انضباط</span>
                    <span className="widget-date">{new Date(date).toLocaleDateString('fa-IR')}</span>
                </div>
                <div className="header-right">
                    <span className="widget-status-icon">{getStatusIcon()}</span>
                    <span className="widget-status-text">{getStatusText()}</span>
                    <button className="toggle-btn" aria-label="جمع/باز کردن">
                        {isCollapsed ? '▼' : '▲'}
                    </button>
                </div>
            </div>

            {/* ===== محتوای ویجت (فقط در حالت باز) ===== */}
            {!isCollapsed && (
                <div className="widget-body">
                    {/* Tiltmeter */}
                    <div className="tiltmeter-section">
                        <div className="tiltmeter-label">
                            <span>Tiltmeter</span>
                            <span className="tiltmeter-value">{tiltmeter_score.toFixed(1)}%</span>
                        </div>
                        <div className="progress-bar">
                            <div
                                className="progress-fill"
                                style={{
                                    width: `${tiltmeterPercent}%`,
                                    backgroundColor: getTiltmeterColor(tiltmeter_score),
                                }}
                            />
                        </div>
                    </div>

                    {/* آمار روزانه */}
                    <div className="stats-grid">
                        <div className="stat-item">
                            <span className="stat-label">📊 ترید امروز</span>
                            <span className={`stat-value ${tradesPercent >= 90 ? 'warning' : ''}`}>
                                {trades_today} / {max_trades_per_day}
                            </span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">💰 ضرر امروز</span>
                            <span className={`stat-value ${lossPercent >= 90 ? 'danger' : lossPercent >= 70 ? 'warning' : ''}`}>
                                ${daily_loss} / ${daily_loss_limit}
                            </span>
                        </div>
                    </div>

                    {/* کول‌داون */}
                    {(is_cooldown_active || is_locked) && (
                        <div className="cooldown-alert">
                            <span>⛔</span>
                            <span>
                                {is_locked ? 'قفل تا پایان روز' : `کول‌داون: ${cooldown_remaining} دقیقه`}
                            </span>
                        </div>
                    )}

                    {/* ضرر متوالی */}
                    {consecutive_losses > 0 && (
                        <div className="consecutive-losses">
                            <span>⚠️ ضرر متوالی: {consecutive_losses} / {cooldown_consecutive_losses}</span>
                        </div>
                    )}

                    {/* نرخ پایبندی */}
                    <div className="compliance-section">
                        <span className="compliance-label">✅ پایبندی: {compliance_rate.toFixed(1)}%</span>
                    </div>

                    {/* دکمه مشاهده جزئیات */}
                    <div className="widget-footer">
                        <button
                            className="btn-details"
                            onClick={() => onNavigate && onNavigate('/discipline')}
                        >
                            مشاهده جزئیات →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DisciplineWidget;