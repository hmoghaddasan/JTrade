// frontend/src/components/rules/RulesManager.js

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import RuleService from '../../services/ruleService';
import './RulesManager.css';

const RulesManager = () => {
  const { isDark } = useTheme();
  const { showToast } = useToast();

  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // State فرم
  const [formData, setFormData] = useState({
    rule_text: '',
    category: 'general',
    is_required: true,
    is_active: true,
    order_index: 0,
  });

  // ============================================
  // بارگذاری قوانین
  // ============================================
  const loadRules = async () => {
    setLoading(true);
    try {
      const response = await RuleService.getRules();
      if (response.success) {
        setRules(response.data);
      } else {
        showToast('خطا در دریافت قوانین', 'error');
      }
    } catch (error) {
      console.error('Error loading rules:', error);
      showToast('خطا در دریافت قوانین', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  // ============================================
  // مدیریت فرم
  // ============================================
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const resetForm = () => {
    setFormData({
      rule_text: '',
      category: 'general',
      is_required: true,
      is_active: true,
      order_index: 0,
    });
    setEditingRule(null);
    setShowForm(false);
  };

  // ============================================
  // ایجاد قانون جدید
  // ============================================
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.rule_text.trim()) {
      showToast('لطفاً متن قانون را وارد کنید', 'warning');
      return;
    }

    try {
      const response = await RuleService.createRule(formData);
      if (response.success) {
        showToast('✅ قانون با موفقیت ایجاد شد', 'success');
        resetForm();
        loadRules();
      } else {
        showToast(response.error || 'خطا در ایجاد قانون', 'error');
      }
    } catch (error) {
      console.error('Error creating rule:', error);
      showToast('خطا در ایجاد قانون', 'error');
    }
  };

  // ============================================
  // ویرایش قانون
  // ============================================
  const handleEdit = (rule) => {
    setEditingRule(rule.id);
    setFormData({
      rule_text: rule.rule_text,
      category: rule.category,
      is_required: rule.is_required,
      is_active: rule.is_active,
      order_index: rule.order_index || 0,
    });
    setShowForm(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!formData.rule_text.trim()) {
      showToast('لطفاً متن قانون را وارد کنید', 'warning');
      return;
    }

    try {
      const response = await RuleService.updateRule(editingRule, formData);
      if (response.success) {
        showToast('✅ قانون با موفقیت به‌روزرسانی شد', 'success');
        resetForm();
        loadRules();
      } else {
        showToast(response.error || 'خطا در به‌روزرسانی قانون', 'error');
      }
    } catch (error) {
      console.error('Error updating rule:', error);
      showToast('خطا در به‌روزرسانی قانون', 'error');
    }
  };

  // ============================================
  // حذف قانون (غیرفعال‌سازی)
  // ============================================
  const handleDelete = async (id) => {
    if (!window.confirm('آیا از حذف این قانون اطمینان دارید؟')) return;

    try {
      const response = await RuleService.deleteRule(id);
      if (response.success) {
        showToast('✅ قانون با موفقیت حذف شد', 'success');
        loadRules();
      } else {
        showToast(response.error || 'خطا در حذف قانون', 'error');
      }
    } catch (error) {
      console.error('Error deleting rule:', error);
      showToast('خطا در حذف قانون', 'error');
    }
  };

  // ============================================
  // تغییر وضعیت قانون (فعال/غیرفعال)
  // ============================================
  const handleToggleActive = async (rule) => {
    try {
      const response = await RuleService.updateRule(rule.id, {
        ...rule,
        is_active: !rule.is_active,
      });
      if (response.success) {
        showToast(
          `قانون ${rule.is_active ? 'غیرفعال' : 'فعال'} شد`,
          'success'
        );
        loadRules();
      } else {
        showToast(response.error || 'خطا در تغییر وضعیت قانون', 'error');
      }
    } catch (error) {
      console.error('Error toggling rule:', error);
      showToast('خطا در تغییر وضعیت قانون', 'error');
    }
  };

  // ============================================
  // گروه‌بندی قوانین بر اساس دسته‌بندی
  // ============================================
  const groupedRules = rules.reduce((acc, rule) => {
    const category = rule.category_label || 'متفرقه';
    if (!acc[category]) acc[category] = [];
    acc[category].push(rule);
    return acc;
  }, {});

  // ============================================
  // دسته‌بندی‌های موجود برای انتخاب
  // ============================================
  const categoryOptions = [
    { value: 'entry', label: 'قوانین ورود' },
    { value: 'exit', label: 'قوانین خروج' },
    { value: 'risk', label: 'مدیریت ریسک' },
    { value: 'psychology', label: 'روانشناختی' },
    { value: 'time', label: 'قوانین زمانی' },
    { value: 'general', label: 'متفرقه' },
  ];

  // ============================================
  // رندر
  // ============================================
  if (loading) {
    return (
      <div className="rules-manager-loading">
        <div className="loading-spinner">⏳</div>
        <p>در حال بارگذاری قوانین...</p>
      </div>
    );
  }

  return (
    <div className={`rules-manager ${isDark ? 'dark' : 'light'}`}>
      <div className="rules-manager-header">
        <h3>📋 مدیریت قوانین معاملاتی</h3>
        <button
          className="btn-add-rule"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          ➕ قانون جدید
        </button>
      </div>

      {/* فرم ایجاد/ویرایش */}
      {showForm && (
        <div className="rules-form-container">
          <form onSubmit={editingRule ? handleUpdate : handleCreate}>
            <div className="form-row">
              <div className="form-group full-width">
                <label>متن قانون <span className="required">*</span></label>
                <textarea
                  name="rule_text"
                  value={formData.rule_text}
                  onChange={handleChange}
                  placeholder="مثلاً: حد ضرر حداکثر ۱٪ از سرمایه"
                  rows="2"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>دسته‌بندی</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                >
                  {categoryOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>ترتیب نمایش</label>
                <input
                  type="number"
                  name="order_index"
                  value={formData.order_index}
                  onChange={handleChange}
                  min="0"
                  step="1"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group checkbox-group">
                <input
                  type="checkbox"
                  name="is_required"
                  checked={formData.is_required}
                  onChange={handleChange}
                  id="is_required"
                />
                <label htmlFor="is_required">اجباری (قانون باید در هر ترید رعایت شود)</label>
              </div>
              <div className="form-group checkbox-group">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  id="is_active"
                />
                <label htmlFor="is_active">فعال</label>
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={resetForm}>
                انصراف
              </button>
              <button type="submit" className="btn-submit">
                {editingRule ? '💾 ذخیره تغییرات' : '➕ ایجاد قانون'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* لیست قوانین */}
      {rules.length === 0 ? (
        <div className="no-rules-message">
          <p>هیچ قانونی تعریف نشده است.</p>
          <p className="hint">با کلیک روی دکمه «قانون جدید» اولین قانون خود را ثبت کنید.</p>
        </div>
      ) : (
        <div className="rules-list-container">
          {Object.entries(groupedRules).map(([category, categoryRules]) => (
            <div key={category} className="rules-category-group">
              <div className="category-group-header">
                <span className="category-icon">
                  {category === 'قوانین ورود' && '📈'}
                  {category === 'قوانین خروج' && '🚪'}
                  {category === 'مدیریت ریسک' && '🛡️'}
                  {category === 'روانشناختی' && '🧠'}
                  {category === 'قوانین زمانی' && '⏰'}
                  {category === 'متفرقه' && '📋'}
                </span>
                <span className="category-name">{category}</span>
                <span className="category-count">{categoryRules.length} قانون</span>
              </div>
              <div className="rules-list">
                {categoryRules.map(rule => (
                  <div key={rule.id} className={`rule-card ${!rule.is_active ? 'inactive' : ''}`}>
                    <div className="rule-card-header">
                      <div className="rule-text-display">
                        <span className="rule-status-icon">
                          {rule.is_active ? '✅' : '⛔'}
                        </span>
                        <span className="rule-text">{rule.rule_text}</span>
                        {rule.is_required && (
                          <span className="rule-required-badge">اجباری</span>
                        )}
                      </div>
                      <div className="rule-actions">
                        <button
                          className="btn-toggle"
                          onClick={() => handleToggleActive(rule)}
                          title={rule.is_active ? 'غیرفعال کردن' : 'فعال کردن'}
                        >
                          {rule.is_active ? '🔕' : '🔊'}
                        </button>
                        <button
                          className="btn-edit-rule"
                          onClick={() => handleEdit(rule)}
                          title="ویرایش"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-delete-rule"
                          onClick={() => handleDelete(rule.id)}
                          title="حذف"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    <div className="rule-card-footer">
                      <span className="rule-category-badge">
                        {category}
                      </span>
                      <span className="rule-order">ترتیب: {rule.order_index || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RulesManager;