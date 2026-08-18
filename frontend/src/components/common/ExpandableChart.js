// frontend/src/components/common/ExpandableChart.js

import React, { useState, cloneElement } from 'react';
import { createPortal } from 'react-dom';
import './ExpandableChart.css';

const ExpandableChart = ({ children, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // 🟢 حالت عادی: فرزند را بدون تغییر (با ارتفاع ۲۸۰ پیکسل از والد) رندر می‌کند
  const normal = (
    <div
      className={`expandable-chart-wrapper ${className}`}
      onClick={handleOpen}
      style={{ cursor: 'pointer', width: '100%', height: '100%' }}
      title="برای بزرگنمایی کلیک کنید"
    >
      {children}
    </div>
  );

  // 🟢 حالت مودال: فرزند را با height="100%" و width="100%" بازنویسی می‌کند
  const modal = isOpen ? createPortal(
    <div className="expandable-chart-modal" onClick={handleClose}>
      <div className="expandable-chart-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="expandable-chart-close" onClick={handleClose}>✕</button>
        <div className="expandable-chart-modal-chart">
          {React.isValidElement(children)
            ? cloneElement(children, {
                width: '100%',
                height: '100%',
                style: { width: '100%', height: '100%', ...children.props.style },
              })
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