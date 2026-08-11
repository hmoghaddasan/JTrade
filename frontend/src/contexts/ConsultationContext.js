// frontend/src/contexts/ConsultationContext.js

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import AIService from '../services/aiService';

const ConsultationContext = createContext();

export const ConsultationProvider = ({ children }) => {
  console.log('🧩 [ConsultationProvider] Mounted');

  const [activeConsultations, setActiveConsultations] = useState([]);
  const [completedConsultations, setCompletedConsultations] = useState([]);
  const [toastMessages, setToastMessages] = useState([]);
  const intervalRef = useRef(null);
  const activeConsultationsRef = useRef(activeConsultations);

  // به‌روزرسانی ref هر بار که activeConsultations تغییر می‌کند
  useEffect(() => {
    activeConsultationsRef.current = activeConsultations;
    console.log('🔄 [activeConsultationsRef] Updated:', activeConsultations);
  }, [activeConsultations]);

  // ============================================
  // removeConsultation
  // ============================================
  const removeConsultation = useCallback((consultationId) => {
    console.log(`🗑️ [removeConsultation] Removing consultation ${consultationId}`);
    setActiveConsultations(prev => {
      const consult = prev.find(c => c.id === consultationId);
      if (consult?.timeoutId) {
        clearTimeout(consult.timeoutId);
      }
      return prev.filter(c => c.id !== consultationId);
    });
  }, []);

  // ============================================
  // addConsultation
  // ============================================
  const addConsultation = useCallback((consultationId, symbol, stage = 0) => {
    console.log(`➕ [addConsultation] Adding consultation ${consultationId} for ${symbol}`);

    setActiveConsultations(prev => {
      if (prev.some(c => c.id === consultationId)) {
        console.log(`⚠️ [addConsultation] Consultation ${consultationId} already exists`);
        return prev;
      }

      const newConsult = {
        id: consultationId,
        symbol: symbol || 'نامشخص',
        status: 'pending',
        progress: 0,
        stage: stage || 0,
        stageLabels: ['دریافت قیمت', 'اتصال به AI', 'تحلیل شرایط', 'ترکیب داده‌ها', 'نهایی‌سازی', 'تکمیل'],
        startTime: Date.now(),
        elapsed: 0,
        timeoutId: null,
      };

      console.log(`✅ [addConsultation] New consultation added:`, newConsult);

      // تایم‌اوت برای حذف خودکار (۱۰ دقیقه)
      const timeoutId = setTimeout(() => {
        console.log(`⏰ [addConsultation] Auto-removing consultation ${consultationId} after timeout`);
        removeConsultation(consultationId);
      }, 600000);

      newConsult.timeoutId = timeoutId;
      return [...prev, newConsult];
    });
  }, [removeConsultation]);

  // ============================================
  // updateConsultation
  // ============================================
  const updateConsultation = useCallback((consultationId, updates) => {
    setActiveConsultations(prev =>
      prev.map(c => {
        if (c.id === consultationId) {
          console.log(`🔄 [updateConsultation] Updating ${consultationId}:`, updates);
          return { ...c, ...updates };
        }
        return c;
      })
    );
  }, []);

  // ============================================
  // dismissCompleted
  // ============================================
  const dismissCompleted = useCallback((consultationId) => {
    console.log(`📌 [dismissCompleted] Dismissing completed consultation ${consultationId}`);
    setCompletedConsultations(prev => prev.filter(c => c.id !== consultationId));
  }, []);

  // ============================================
  // clearToast
  // ============================================
  const clearToast = useCallback((id) => {
    setToastMessages(prev => prev.filter(t => t.id !== id));
  }, []);

  // ============================================
  // ✅ تابع پولینگ (با استفاده از ref)
  // ============================================
  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    console.log('🚀 [startPolling] Starting polling...');

    intervalRef.current = setInterval(async () => {
      console.log('⏳ [Polling] Interval tick');
      const consultations = activeConsultationsRef.current;

      if (consultations.length === 0) {
        console.log('🛑 [Polling] No active consultations, clearing interval');
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        return;
      }

      console.log(`⏳ [Polling] Checking ${consultations.length} consultations`);

      for (const consultation of consultations) {
        if (consultation.status === 'completed' || consultation.status === 'failed') {
          console.log(`⏭️ [Polling] Consultation ${consultation.id} already final (${consultation.status})`);
          continue;
        }

        try {
          console.log(`📡 [Polling] Fetching status for consultation ${consultation.id}`);
          const data = await AIService.getConsultationStatus(consultation.id);
          console.log(`📡 [Polling] Status response for ${consultation.id}:`, data);

          const stageMap = {
            'pending': 0,
            'processing': 2,
            'completed': 5,
            'failed': 5,
          };
          const stage = stageMap[data.status] || 0;
          const progress = data.status === 'pending' ? 10 :
                         data.status === 'processing' ? 50 :
                         data.status === 'completed' ? 100 :
                         data.status === 'failed' ? 100 : 0;

          const updates = {
            status: data.status,
            progress: progress,
            stage: stage,
          };

          if (data.status === 'completed' && data.result) {
            updates.result = data.result;
            console.log(`✅ [COMPLETE] Consultation ${consultation.id} completed!`);

            setCompletedConsultations(prev => {
              if (prev.some(c => c.id === consultation.id)) return prev;
              console.log(`📦 [BANNER] Adding ${consultation.id} to completed list`);
              return [...prev, {
                id: consultation.id,
                symbol: consultation.symbol,
                result: data.result,
              }];
            });

            setToastMessages(prev => [
              ...prev,
              {
                id: consultation.id,
                message: `✅ مشاوره ${consultation.symbol} با موفقیت تکمیل شد!`,
                type: 'success',
                consultationId: consultation.id,
                action: 'view',
              }
            ]);
            setTimeout(() => {
              setToastMessages(prev => prev.filter(t => t.id !== consultation.id));
            }, 15000);

          } else if (data.status === 'failed') {
            updates.error = data.error || 'خطا در پردازش';
            console.log(`❌ [FAILED] Consultation ${consultation.id} failed`);

            setCompletedConsultations(prev => {
              if (prev.some(c => c.id === consultation.id)) return prev;
              return [...prev, {
                id: consultation.id,
                symbol: consultation.symbol,
                result: null,
                error: data.error || 'خطا در پردازش مشاوره',
                isError: true,
              }];
            });

            setToastMessages(prev => [
              ...prev,
              {
                id: consultation.id,
                message: `❌ مشاوره ${consultation.symbol} با خطا مواجه شد`,
                type: 'error',
              }
            ]);
            setTimeout(() => {
              setToastMessages(prev => prev.filter(t => t.id !== consultation.id));
            }, 15000);
          }

          updateConsultation(consultation.id, updates);

          if (data.status === 'completed' || data.status === 'failed') {
            setTimeout(() => {
              removeConsultation(consultation.id);
            }, 12000);
          }

        } catch (error) {
          console.error(`❌ [Polling] Error fetching status for consultation ${consultation.id}:`, error);
        }
      }
    }, 2000);
  }, [removeConsultation, updateConsultation]);

  // ============================================
  // شروع پولینگ هنگام mount و به‌روزرسانی activeConsultations
  // ============================================
  useEffect(() => {
    console.log('🔄 [Polling Effect] activeConsultations =', activeConsultations);

    // اگر consultation فعالی وجود دارد و پولینگ فعال نیست، شروع کن
    if (activeConsultations.length > 0) {
      if (!intervalRef.current) {
        startPolling();
      }
    } else {
      // اگر consultation فعالی وجود ندارد، پولینگ را متوقف کن
      if (intervalRef.current) {
        console.log('🛑 [Polling Effect] No active consultations, clearing interval');
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    // Cleanup هنگام unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [activeConsultations, startPolling]);

  // ============================================
  // تایمر شمارش زمان سپری‌شده
  // ============================================
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveConsultations(prev =>
        prev.map(c => ({
          ...c,
          elapsed: Math.floor((Date.now() - c.startTime) / 1000),
        }))
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ============================================
  // مقدار Context
  // ============================================
  const hasActiveConsultation = activeConsultations.length > 0;

  const value = {
    activeConsultations,
    hasActiveConsultation,
    completedConsultations,
    dismissCompleted,
    addConsultation,
    updateConsultation,
    removeConsultation,
    toastMessages,
    clearToast,
  };

  console.log('📦 [ConsultationProvider] Value:', value);

  return (
    <ConsultationContext.Provider value={value}>
      {children}
    </ConsultationContext.Provider>
  );
};

export const useConsultation = () => {
  const context = useContext(ConsultationContext);
  if (!context) {
    throw new Error('useConsultation must be used within ConsultationProvider');
  }
  return context;
};

export default ConsultationContext;