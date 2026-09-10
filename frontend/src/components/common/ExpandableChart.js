// frontend/src/components/common/ExpandableChart.js

import React, { useState, cloneElement, Children } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../contexts/ThemeContext';
import './ExpandableChart.css';

const ExpandableChart = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { isDark } = useTheme();

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // ==========================================================
  // ✅ تنظیمات برای حالت بزرگ‌نمایی (مودال) - برای PieChart
  // ==========================================================

  // ✅ تنظیمات Pie برای بزرگ‌نمایی
  const modalPieProps = {
    innerRadius: '40%',
    outerRadius: '88%',
    paddingAngle: 4,
    label: {
      fontSize: 18,
      dy: 10,
      fontWeight: 500
    },
    labelLine: true,
  };

  const modalPieMargin = {
    top: 50,
    right: 60,
    bottom: 50,
    left: 60
  };

  const modalLegendStyle = {
    paddingTop: 40,
    fontSize: 16
  };

  // ✅ تنظیمات XAxis برای بزرگ‌نمایی
  const modalXAxisProps = {
    angle: -30,
    textAnchor: 'end',
    height: 100,
    tick: {
      fontSize: 14,
      dy: 20
    },
    interval: 0,
    padding: { left: 15, right: 15 }
  };

  const modalYAxisProps = {
    width: 85,
    tick: { fontSize: 14 },
    padding: { top: 15, bottom: 15 }
  };

  // ==========================================================
  // ✅ تابع برای تنظیم فرزندان در مودال
  // ==========================================================

  const enhanceChart = (element) => {
    if (!React.isValidElement(element)) return element;

    // XAxis
    if (element.type && (element.type.name === 'XAxis' || element.type.displayName === 'XAxis')) {
      return cloneElement(element, modalXAxisProps);
    }

    // YAxis
    if (element.type && (element.type.name === 'YAxis' || element.type.displayName === 'YAxis')) {
      return cloneElement(element, modalYAxisProps);
    }

    // Legend
    if (element.type && (element.type.name === 'Legend' || element.type.displayName === 'Legend')) {
      return cloneElement(element, { wrapperStyle: modalLegendStyle });
    }

    // ✅ Pie - تنظیمات برای بزرگ‌نمایی
    if (element.type && (element.type.name === 'Pie' || element.type.displayName === 'Pie')) {
      return cloneElement(element, modalPieProps);
    }

    // ✅ PieChart - تنظیمات margin برای بزرگ‌نمایی
    if (element.type && (element.type.name === 'PieChart' || element.type.displayName === 'PieChart')) {
      const newChildren = Children.map(element.props.children, (child) => enhanceChart(child));
      return cloneElement(element, {
        margin: modalPieMargin,
        children: newChildren,
      });
    }

    // BarChart / ComposedChart / LineChart
    if (element.type && (
      element.type.name === 'BarChart' ||
      element.type.name === 'ComposedChart' ||
      element.type.name === 'LineChart'
    )) {
      const newChildren = Children.map(element.props.children, (child) => enhanceChart(child));
      return cloneElement(element, {
        margin: { top: 50, right: 60, left: 85, bottom: 120 },
        children: newChildren,
      });
    }

    // ResponsiveContainer
    if (element.type && (element.type.name === 'ResponsiveContainer' || element.type.displayName === 'ResponsiveContainer')) {
      const newChildren = Children.map(element.props.children, (child) => enhanceChart(child));
      return cloneElement(element, {
        children: newChildren,
        width: '100%',
        height: '100%'
      });
    }

    // Cell - بدون تغییر
    if (element.type && (element.type.name === 'Cell' || element.type.displayName === 'Cell')) {
      return element;
    }

    // Tooltip - بدون تغییر
    if (element.type && (element.type.name === 'Tooltip' || element.type.displayName === 'Tooltip')) {
      return element;
    }

    // CartesianGrid - بدون تغییر
    if (element.type && (element.type.name === 'CartesianGrid' || element.type.displayName === 'CartesianGrid')) {
      return element;
    }

    // Bar - بدون تغییر
    if (element.type && (element.type.name === 'Bar' || element.type.displayName === 'Bar')) {
      return element;
    }

    // Line - بدون تغییر
    if (element.type && (element.type.name === 'Line' || element.type.displayName === 'Line')) {
      return element;
    }

    // بازگشتی برای فرزندان دیگر
    if (element.props && element.props.children) {
      const newChildren = Children.map(element.props.children, (child) => enhanceChart(child));
      return cloneElement(element, { children: newChildren });
    }

    return element;
  };

  // ==========================================================
  // ✅ حالت عادی و مودال
  // ==========================================================

  const normal = (
    <div
      className="expandable-chart-wrapper"
      onClick={handleOpen}
      style={{ cursor: 'pointer', width: '100%', height: '100%' }}
      title="برای بزرگنمایی کلیک کنید"
    >
      {children}
    </div>
  );

  const modal = isOpen ? createPortal(
    <div className={`expandable-chart-modal ${isDark ? 'dark' : 'light'}`} onClick={handleClose}>
      <div className={`expandable-chart-modal-content ${isDark ? 'dark-theme' : ''}`} onClick={(e) => e.stopPropagation()}>
        <button className="expandable-chart-close" onClick={handleClose}>✕</button>
        <div className="expandable-chart-modal-chart">
          {React.isValidElement(children)
            ? enhanceChart(
                cloneElement(children, {
                  width: '100%',
                  height: '100%',
                  style: { width: '100%', height: '100%' },
                })
              )
            : children}
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      {normal}
      {modal}
    </>
  );
};

export default ExpandableChart;