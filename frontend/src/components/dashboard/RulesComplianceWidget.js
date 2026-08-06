// frontend/src/components/dashboard/RulesComplianceWidget.js

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import RuleService from '../../services/ruleService';
import './RulesComplianceWidget.css';

const RulesComplianceWidget = () => {
  const { isDark } = useTheme();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const response = await RuleService.getRulesReport();
        if (response.success && response.data.has_data) {
          setData(response.data);
        } else {
          setData(null);
        }
      } catch (error) {
        console.error('Error loading rules compliance:', error);
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [showToast]);

  if (loading) {
    return (
      <div className="rules-widget">
        <div className="rules-widget-header">
          <span className="widget-icon">📋</span>
          <span className="widget-title">پایبندی به قوانین</span>
          <span className="widget-loading">⏳</span>
        </div>
      </div>
    );
  }

  if (!data || !data.has_data) {
    return (
      <div className="rules-widget">
        <div className="rules-widget-header">
          <span className="widget-icon">📋</span>
          <span className="widget-title">پایبندی به قوانین</span>
          <span className="widget-status">بدون قانون</span>
        </div>
        <div className="rules-widget-body">
          <p className="no-rules-message">
            هنوز قانون معاملاتی تعریف نکرده‌اید.
            <br />
            <small>به بخش پروفایل بروید و قوانین خود را ثبت کنید.</small>
          </p>
        </div>
      </div>
    );
  }

  const { overall_compliance, total_rules, rules_by_category } = data;
  const complianceColor = overall_compliance >= 70 ? 'high' : overall_compliance >= 40 ? 'medium' : 'low';

  return (
    <div className={`rules-widget ${isDark ? 'dark' : 'light'}`}>
      <div className="rules-widget-header" onClick={() => setIsExpanded(!isExpanded)}>
        <span className="widget-icon">📋</span>
        <span className="widget-title">پایبندی به قوانین</span>
        <span className={`widget-compliance ${complianceColor}`}>
          {overall_compliance}%
        </span>
        <span className="widget-toggle">{isExpanded ? '▲' : '▼'}</span>
      </div>

      {isExpanded && (
        <div className="rules-widget-body">
          <div className="widget-stats">
            <div className="stat-item">
              <span className="stat-label">کل قوانین</span>
              <span className="stat-value">{total_rules}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">دسته‌بندی‌ها</span>
              <span className="stat-value">{Object.keys(rules_by_category).length}</span>
            </div>
          </div>

          <div className="widget-categories">
            {Object.entries(rules_by_category).map(([category, count]) => (
              <div key={category} className="category-item">
                <span className="category-name">{category}</span>
                <span className="category-count">{count} قانون</span>
              </div>
            ))}
          </div>

          <div className="widget-action">
            <button
              className="btn-view-rules"
              onClick={() => window.location.href = '/profile?tab=rules'}
            >
              مدیریت قوانین →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RulesComplianceWidget;