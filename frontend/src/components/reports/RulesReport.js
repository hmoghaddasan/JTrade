// frontend/src/components/reports/RulesReport.js

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import RuleService from '../../services/ruleService';
import './RulesReport.css';

const RulesReport = () => {
  const { isDark } = useTheme();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const response = await RuleService.getRulesReport();
        if (response.success) {
          setData(response.data);
        } else {
          showToast(response.error || 'خطا در دریافت گزارش قوانین', 'error');
        }
      } catch (error) {
        console.error('Error loading rules report:', error);
        showToast('خطا در دریافت گزارش قوانین', 'error');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [showToast]);

  if (loading) {
    return (
      <div className="rules-report-loading">
        <div className="loading-spinner">⏳</div>
        <p>در حال بارگذاری گزارش قوانین...</p>
      </div>
    );
  }

  if (!data || !data.has_data) {
    return (
      <div className="rules-report-empty">
        <div className="empty-icon">📋</div>
        <h3>هیچ قانونی تعریف نشده است</h3>
        <p>
          برای مشاهده گزارش پایبندی به قوانین، ابتدا قوانین معاملاتی خود را در بخش
          <strong> پروفایل → قوانین معاملاتی</strong> تعریف کنید.
        </p>
      </div>
    );
  }

  const { total_rules, rules_by_category, overall_compliance, rules_stats, compliance_by_category } = data;

  // تعیین رنگ پایبندی
  const getComplianceColor = (value) => {
    if (value >= 70) return 'high';
    if (value >= 40) return 'medium';
    return 'low';
  };

  return (
    <div className={`rules-report ${isDark ? 'dark' : 'light'}`}>
      {/* کارت خلاصه */}
      <div className="report-summary-cards">
        <div className="summary-card">
          <div className="card-icon">📋</div>
          <div className="card-content">
            <span className="card-label">کل قوانین</span>
            <span className="card-value">{total_rules}</span>
          </div>
        </div>
        <div className="summary-card">
          <div className="card-icon">📊</div>
          <div className="card-content">
            <span className="card-label">دسته‌بندی‌ها</span>
            <span className="card-value">{Object.keys(rules_by_category).length}</span>
          </div>
        </div>
        <div className="summary-card">
          <div className="card-icon">✅</div>
          <div className="card-content">
            <span className="card-label">نرخ پایبندی کلی</span>
            <span className={`card-value ${getComplianceColor(overall_compliance)}`}>
              {overall_compliance}%
            </span>
          </div>
        </div>
      </div>

      {/* توزیع دسته‌بندی‌ها */}
      <div className="report-section">
        <h3>📊 توزیع قوانین بر اساس دسته‌بندی</h3>
        <div className="category-distribution">
          {Object.entries(rules_by_category).map(([category, count]) => (
            <div key={category} className="dist-item">
              <span className="dist-label">{category}</span>
              <div className="dist-bar">
                <div
                  className="dist-fill"
                  style={{ width: `${(count / total_rules) * 100}%` }}
                />
              </div>
              <span className="dist-count">{count} قانون</span>
            </div>
          ))}
        </div>
      </div>

      {/* پایبندی به تفکیک دسته‌بندی */}
      <div className="report-section">
        <h3>📈 پایبندی به تفکیک دسته‌بندی</h3>
        <div className="compliance-categories">
          {Object.entries(compliance_by_category).map(([category, value]) => (
            <div key={category} className="comp-item">
              <span className="comp-label">{category}</span>
              <div className="comp-bar">
                <div
                  className={`comp-fill ${getComplianceColor(value)}`}
                  style={{ width: `${value}%` }}
                />
              </div>
              <span className={`comp-value ${getComplianceColor(value)}`}>{value}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* جدول جزئیات قوانین */}
      <div className="report-section">
        <h3>📋 جزئیات قوانین</h3>
        <div className="rules-table-wrapper">
          <table className="rules-table">
            <thead>
              <tr>
                <th>قانون</th>
                <th>دسته‌بندی</th>
                <th>بررسی‌ها</th>
                <th>پایبندی</th>
                <th>سود (رعایت)</th>
                <th>سود (نقض)</th>
                <th>تأثیر</th>
              </tr>
            </thead>
            <tbody>
              {rules_stats.map((rule, index) => (
                <tr key={index}>
                  <td className="rule-text-cell">{rule.rule_text}</td>
                  <td><span className="category-badge">{rule.category}</span></td>
                  <td>{rule.total_checks}</td>
                  <td>
                    <span className={`compliance-badge ${getComplianceColor(rule.compliance_rate)}`}>
                      {rule.compliance_rate}%
                    </span>
                  </td>
                  <td className={rule.profit_checked >= 0 ? 'positive' : 'negative'}>
                    {rule.profit_checked >= 0 ? '+' : ''}{rule.profit_checked.toFixed(2)}$
                  </td>
                  <td className={rule.profit_unchecked >= 0 ? 'positive' : 'negative'}>
                    {rule.profit_unchecked >= 0 ? '+' : ''}{rule.profit_unchecked.toFixed(2)}$
                  </td>
                  <td className={rule.impact >= 0 ? 'positive' : 'negative'}>
                    {rule.impact >= 0 ? '+' : ''}{rule.impact.toFixed(2)}$
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* نکته‌ها و توصیه‌ها */}
      <div className="report-section tips-section">
        <h3>💡 نکات و توصیه‌ها</h3>
        <div className="tips-grid">
          <div className="tip-item">
            <span className="tip-icon">📊</span>
            <div>
              <strong>نرخ پایبندی کلی</strong>
              <p>
                {overall_compliance >= 70
                  ? '✅ پایبندی عالی! شما به خوبی به قوانین خود پایبند هستید.'
                  : overall_compliance >= 40
                  ? '⚠️ پایبندی متوسط. روی قوانینی که بیشتر نقض می‌شوند تمرکز کنید.'
                  : '❌ پایبندی پایین. توصیه می‌شود قبل از هر معامله قوانین خود را مرور کنید.'}
              </p>
            </div>
          </div>
          <div className="tip-item">
            <span className="tip-icon">🎯</span>
            <div>
              <strong>قوانین پربازده</strong>
              <p>
                {rules_stats.filter(r => r.impact > 0).length > 0
                  ? `✅ ${rules_stats.filter(r => r.impact > 0).length} قانون تأثیر مثبت بر سود دارند.`
                  : '⚠️ هیچ قانونی تأثیر مثبت قابل‌توجهی بر سود ندارد.'}
              </p>
            </div>
          </div>
          <div className="tip-item">
            <span className="tip-icon">⚠️</span>
            <div>
              <strong>قوانین پرنقض</strong>
              <p>
                {rules_stats.filter(r => r.compliance_rate < 50).length > 0
                  ? `⚠️ ${rules_stats.filter(r => r.compliance_rate < 50).length} قانون کمتر از ۵۰٪ رعایت شده‌اند.`
                  : '✅ همه قوانین با پایبندی خوبی رعایت شده‌اند.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RulesReport;