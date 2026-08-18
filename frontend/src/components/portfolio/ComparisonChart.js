// frontend/src/components/portfolio/ComparisonChart.js

import React, { useState } from 'react';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
} from 'recharts';
import { useTheme } from '../../contexts/ThemeContext';
import './ComparisonChart.css';

const CHART_COLORS = [
    '#1a237e', '#2e7d32', '#c62828', '#e65100', '#6a1b9a',
    '#00897b', '#f57f17', '#0d47a1', '#4a148c', '#bf360c'
];

const ComparisonChart = ({ data, type, title, height = 350 }) => {
    const { isDark } = useTheme();
    const [expanded, setExpanded] = useState(false);

    // ===== toggle بزرگ‌نمایی =====
    const toggleExpand = () => {
        setExpanded(!expanded);
    };

    // ===== بررسی داده‌های ورودی =====
    if (!data || !Array.isArray(data) || data.length === 0) {
        return (
            <div className="comparison-chart-empty">
                <span className="empty-icon">📊</span>
                <p>داده‌ای برای نمایش وجود ندارد</p>
            </div>
        );
    }

    const themeColors = {
        text: isDark ? '#e0e0e0' : '#333',
        grid: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        tooltipBg: isDark ? '#1e1e1e' : '#fff',
        tooltipText: isDark ? '#e0e0e0' : '#333',
    };

    const tooltipStyle = {
        backgroundColor: themeColors.tooltipBg,
        border: `1px solid ${isDark ? '#333' : '#ddd'}`,
        borderRadius: '8px',
        padding: '8px 12px',
        color: themeColors.tooltipText,
    };

    // ===== رندر نمودار خطی (سود تجمعی) =====
    const renderCumulativePnL = () => {
        const validSeries = data.filter(series =>
            series.data && Array.isArray(series.data) && series.data.length > 0
        );

        if (validSeries.length === 0) {
            return (
                <div className="chart-empty-message">
                    <span>📭</span>
                    <p>هیچ داده‌ای برای نمایش سود تجمعی وجود ندارد</p>
                </div>
            );
        }

        const allDates = new Set();
        validSeries.forEach(series => {
            series.data.forEach(point => {
                if (point.date) allDates.add(point.date);
            });
        });

        const sortedDates = Array.from(allDates).sort();
        const chartData = sortedDates.map(date => {
            const row = { date: date.substring(5) };
            validSeries.forEach(series => {
                const point = series.data.find(p => p.date === date);
                row[series.portfolio_name] = point ? point.profit : null;
            });
            return row;
        });

        return (
            <ResponsiveContainer width="100%" height={expanded ? 500 : height}>
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} />
                    <XAxis
                        dataKey="date"
                        tick={{ fill: themeColors.text, fontSize: 11 }}
                        stroke={themeColors.text}
                        interval="preserveStartEnd"
                    />
                    <YAxis
                        tick={{ fill: themeColors.text, fontSize: 11 }}
                        stroke={themeColors.text}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend
                        wrapperStyle={{ color: themeColors.text }}
                        formatter={(value) => value}
                    />
                    {validSeries.map((series, index) => {
                        const color = CHART_COLORS[index % CHART_COLORS.length];
                        return (
                            <Line
                                key={series.portfolio_id}
                                type="monotone"
                                dataKey={series.portfolio_name}
                                stroke={color}
                                strokeWidth={2}
                                dot={{ r: 3 }}
                                activeDot={{ r: 6 }}
                            />
                        );
                    })}
                </LineChart>
            </ResponsiveContainer>
        );
    };

    // ===== رندر نمودار راداری =====
    const renderRadar = () => {
        const validItems = data.filter(item =>
            item.metrics && typeof item.metrics === 'object' && Object.keys(item.metrics).length > 0
        );

        if (validItems.length === 0) {
            return (
                <div className="chart-empty-message">
                    <span>🕸️</span>
                    <p>داده‌ای برای نمایش نمودار راداری وجود ندارد</p>
                </div>
            );
        }

        const metricsKeys = ['سودآوری', 'نرخ برد', 'فاکتور سود', 'میانگین R:R', 'کاهش ریسک'];
        const radarData = validItems.map(item => {
            const row = { subject: item.portfolio_name };
            metricsKeys.forEach(key => {
                row[key] = item.metrics[key] || 0;
            });
            return row;
        });

        return (
            <ResponsiveContainer width="100%" height={expanded ? 500 : height}>
                <RadarChart data={radarData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                    <PolarGrid stroke={themeColors.grid} />
                    <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fill: themeColors.text, fontSize: 11 }}
                    />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: themeColors.text, fontSize: 10 }} />
                    {validItems.map((item, index) => {
                        const color = CHART_COLORS[index % CHART_COLORS.length];
                        return (
                            <Radar
                                key={item.portfolio_id}
                                name={item.portfolio_name}
                                dataKey={item.portfolio_name}
                                stroke={color}
                                fill={color}
                                fillOpacity={0.3}
                                data={radarData.map(d => ({
                                    ...d,
                                    [item.portfolio_name]: d[item.portfolio_name] || 0
                                }))}
                            />
                        );
                    })}
                    <Legend wrapperStyle={{ color: themeColors.text }} />
                    <Tooltip contentStyle={tooltipStyle} />
                </RadarChart>
            </ResponsiveContainer>
        );
    };

    // ===== رندر نمودار میله‌ای =====
    const renderBar = () => {
        const validItems = data.filter(item =>
            item.total_profit !== undefined ||
            item.win_rate !== undefined ||
            item.profit_factor !== undefined
        );

        if (validItems.length === 0) {
            return (
                <div className="chart-empty-message">
                    <span>📊</span>
                    <p>داده‌ای برای نمایش نمودار میله‌ای وجود ندارد</p>
                </div>
            );
        }

        const chartData = validItems.map(item => ({
            name: item.portfolio_name,
            'سود کل': item.total_profit || 0,
            'نرخ برد': item.win_rate || 0,
            'فاکتور سود': item.profit_factor || 0,
        }));

        return (
            <ResponsiveContainer width="100%" height={expanded ? 500 : height}>
                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} />
                    <XAxis dataKey="name" tick={{ fill: themeColors.text, fontSize: 11 }} stroke={themeColors.text} />
                    <YAxis tick={{ fill: themeColors.text, fontSize: 11 }} stroke={themeColors.text} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ color: themeColors.text }} />
                    <Bar dataKey="سود کل" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="نرخ برد" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="فاکتور سود" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        );
    };

    // انتخاب نوع نمودار
    let chartContent;
    switch (type) {
        case 'cumulative_pnl':
            chartContent = renderCumulativePnL();
            break;
        case 'radar':
            chartContent = renderRadar();
            break;
        case 'bar':
            chartContent = renderBar();
            break;
        default:
            chartContent = renderCumulativePnL();
    }

    return (
        <div className={`comparison-chart ${expanded ? 'expanded' : ''}`}>
            <div className="chart-header">
                <h4>{title || 'نمودار مقایسه‌ای'}</h4>
                <div className="chart-header-actions">
                    <button className="btn-expand-chart" onClick={toggleExpand}>
                        {expanded ? '🔽 کوچک‌نمایی' : '🔼 بزرگ‌نمایی'}
                    </button>
                </div>
            </div>
            {/* کلیک روی خود نمودار باعث بزرگ‌نمایی می‌شود */}
            <div className="chart-container" onClick={toggleExpand} style={{ cursor: 'pointer' }}>
                {chartContent}
            </div>
            {!expanded && (
                <div className="chart-expand-hint">🔄 کلیک روی نمودار برای بزرگ‌نمایی</div>
            )}
        </div>
    );
};

export default ComparisonChart;