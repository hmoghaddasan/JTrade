// frontend/src/contexts/ToastContext.js

import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, duration }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // ============================================
  // استایل‌های هر نوع توست (با رنگ‌های خنثی)
  // ============================================
  const getToastStyle = (type) => {
    const baseStyle = {
      pointerEvents: 'auto',
      padding: '18px 36px',
      borderRadius: '14px',
      fontSize: '17px',
      fontWeight: '600',
      textAlign: 'center',
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
      animation: 'toastFadeIn 0.4s ease, toastFadeOut 0.4s ease 2.8s forwards',
      minWidth: '220px',
      maxWidth: '550px',
      width: 'auto',
      cursor: 'pointer',
      userSelect: 'none',
      direction: 'rtl',
      fontFamily: 'inherit',
      lineHeight: '1.6',
      margin: '0',
      border: 'none',
      color: '#ffffff',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
    };

    switch(type) {
      case 'success':
        return {
          ...baseStyle,
          background: 'rgba(46, 125, 50, 0.85)',
          border: '1px solid rgba(76, 175, 80, 0.3)',
          boxShadow: '0 10px 40px rgba(46, 125, 50, 0.2)',
        };
      case 'error':
        return {
          ...baseStyle,
          background: 'rgba(183, 28, 28, 0.85)',
          border: '1px solid rgba(239, 83, 80, 0.3)',
          boxShadow: '0 10px 40px rgba(183, 28, 28, 0.2)',
        };
      case 'warning':
        return {
          ...baseStyle,
          background: 'rgba(230, 81, 0, 0.85)',
          border: '1px solid rgba(255, 152, 0, 0.3)',
          boxShadow: '0 10px 40px rgba(230, 81, 0, 0.2)',
        };
      default: // info - رنگ خنثی
        return {
          ...baseStyle,
          background: 'rgba(60, 60, 70, 0.88)',
          border: '1px solid rgba(200, 200, 210, 0.15)',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
        };
    }
  };

  // ============================================
  // استایل کانتینر
  // ============================================
  const containerStyle = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 10000,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    width: 'auto',
    maxWidth: '90vw',
  };

  const value = {
    toasts,
    showToast,
    removeToast,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* نمایش توست‌ها با استایل inline */}
      <div style={containerStyle}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            style={getToastStyle(toast.type)}
            onClick={() => removeToast(toast.id)}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {/* انیمیشن‌ها با استایل inline */}
      <style>{`
        @keyframes toastFadeIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes toastFadeOut {
          from {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
          to {
            opacity: 0;
            transform: scale(0.9) translateY(-20px);
          }
        }

        @media (max-width: 768px) {
          .toast-responsive {
            padding: 14px 24px !important;
            font-size: 15px !important;
            min-width: 160px !important;
            max-width: 85vw !important;
            border-radius: 10px !important;
          }
        }

        @media (max-width: 480px) {
          .toast-responsive {
            padding: 12px 18px !important;
            font-size: 14px !important;
            min-width: 140px !important;
            max-width: 90vw !important;
            border-radius: 8px !important;
          }
        }

        @media (max-width: 360px) {
          .toast-responsive {
            padding: 10px 14px !important;
            font-size: 13px !important;
            min-width: 120px !important;
            border-radius: 6px !important;
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default ToastContext;