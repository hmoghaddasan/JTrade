// frontend/src/contexts/ConsultationContext.js

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import AIService from '../services/aiService';

const ConsultationContext = createContext();

export const ConsultationProvider = ({ children }) => {
  console.log('🧩 [ConsultationProvider] Mounted');

  const [activeConsultations, setActiveConsultations] = useState([]);
  const [completedConsultations, setCompletedConsultations] = useState([]);
  const [toastMessages, setToastMessages] = useState([]);
  const pollingTimeoutRef = useRef(null);
  const activeConsultationsRef = useRef(activeConsultations);
  const isPollingActiveRef = useRef(false);

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
  // dismissCompleted (برای بنر)
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
  // ✅ تابع پولینگ با setTimeout بازگشتی (نسخه نهایی با مرحله‌بندی پویا)
  // ============================================
  const startPolling = useCallback(() => {
    // اگر در حال پولینگ هستیم، از شروع مجدد جلوگیری کن
    if (isPollingActiveRef.current) {
      console.log('⚠️ [startPolling] Polling already active, skipping');
      return;
    }

    console.log('🚀 [startPolling] Starting polling loop with recursive setTimeout...');
    isPollingActiveRef.current = true;

    const poll = async () => {
      const consultations = activeConsultationsRef.current;

      console.log(`⏳ [Polling] Checking ${consultations.length} consultations`);

      // اگر مشاوره‌ای وجود ندارد، پولینگ را متوقف کن
      if (consultations.length === 0) {
        console.log('🛑 [Polling] No active consultations, stopping polling');
        isPollingActiveRef.current = false;
        pollingTimeoutRef.current = null;
        return;
      }

      // فیلتر مشاوره‌هایی که هنوز نهایی نشده‌اند
      const pendingConsultations = consultations.filter(
        c => c.status !== 'completed' && c.status !== 'failed'
      );

      if (pendingConsultations.length === 0) {
        console.log('⏭️ [Polling] All consultations are final, stopping polling');
        isPollingActiveRef.current = false;
        pollingTimeoutRef.current = null;
        return;
      }

      console.log(`📡 [Polling] ${pendingConsultations.length} consultations need status check`);

      for (const consultation of pendingConsultations) {
        try {
          console.log(`📡 [Polling] Fetching status for consultation ${consultation.id}`);
          const data = await AIService.getConsultationStatus(consultation.id);
          console.log(`📡 [Polling] Status response for ${consultation.id}:`, data);

          // =========================================================
          // ✅ مرحله‌بندی پویا بر اساس زمان سپری‌شده
          // =========================================================
          const elapsedSeconds = Math.floor((Date.now() - consultation.startTime) / 1000);

          let stage = 0;
          let progress = 0;

          if (data.status === 'pending') {
            stage = 0;
            progress = 10;
          } else if (data.status === 'processing') {
            // مراحل ۱ تا ۴ بر اساس زمان سپری‌شده
            if (elapsedSeconds < 15) {
              stage = 1;   // دریافت قیمت
              progress = 25;
            } else if (elapsedSeconds < 30) {
              stage = 2;   // اتصال به AI
              progress = 45;
            } else if (elapsedSeconds < 60) {
              stage = 3;   // تحلیل شرایط
              progress = 65;
            } else {
              stage = 4;   // ترکیب داده‌ها و نهایی‌سازی
              progress = 85;
            }
          } else if (data.status === 'completed') {
            stage = 5;
            progress = 100;
          } else if (data.status === 'failed') {
            stage = 5;
            progress = 100;
          }

          const updates = {
            status: data.status,
            progress: progress,
            stage: stage,
          };

          // =========================================================
          // ✅ تشخیص completed و حذف فوری
          // =========================================================
          if (data.status === 'completed') {
            updates.result = data.result || { score: 0, response: {} };
            console.log(`✅ [COMPLETE] Consultation ${consultation.id} completed!`);

            // اضافه کردن به لیست تکمیل‌شده‌ها (برای نمایش بنر)
            setCompletedConsultations(prev => {
              if (prev.some(c => c.id === consultation.id)) return prev;
              console.log(`📦 [BANNER] Adding ${consultation.id} to completed list`);
              return [...prev, {
                id: consultation.id,
                symbol: consultation.symbol,
                result: data.result || { score: 0 },
              }];
            });

            // افزودن پیام Toast
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

            // ✅ حذف فوری مشاوره از لیست فعال (بدون تاخیر)
            // این باعث می‌شود پولینگ در تکرار بعدی متوقف شود
            removeConsultation(consultation.id);

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

            // ✅ حذف فوری مشاوره از لیست فعال
            removeConsultation(consultation.id);
          }

          // به‌روزرسانی وضعیت مشاوره در UI (ویجت)
          updateConsultation(consultation.id, updates);

        } catch (error) {
          console.error(`❌ [Polling] Error fetching status for consultation ${consultation.id}:`, error);
        }
      }

      // برنامه‌ریزی برای اجرای مجدد بعد از ۳ ثانیه (فقط اگر هنوز مشاوره فعال وجود دارد)
      if (activeConsultationsRef.current.length > 0) {
        console.log('⏱️ [Polling] Scheduling next poll in 3 seconds...');
        pollingTimeoutRef.current = setTimeout(poll, 3000);
      } else {
        console.log('🛑 [Polling] No active consultations, stopping');
        isPollingActiveRef.current = false;
        pollingTimeoutRef.current = null;
      }
    };

    // شروع اولین اجرا
    poll();
  }, [removeConsultation, updateConsultation]);

  // ============================================
  // شروع/توقف پولینگ بر اساس تغییرات activeConsultations
  // ============================================
  useEffect(() => {
    console.log('🔄 [Polling Effect] activeConsultations =', activeConsultations);

    if (activeConsultations.length > 0) {
      // اگر مشاوره فعال وجود دارد و پولینگ در حال اجرا نیست، آن را شروع کن
      if (!isPollingActiveRef.current) {
        startPolling();
      }
    } else {
      // اگر مشاوره فعالی وجود ندارد، پولینگ را متوقف کن
      if (pollingTimeoutRef.current) {
        console.log('🛑 [Polling Effect] No active consultations, clearing timeout');
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
        isPollingActiveRef.current = false;
      }
    }

    // Cleanup هنگام unmount
    return () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
        isPollingActiveRef.current = false;
      }
    };
  }, [activeConsultations, startPolling]);

  // ============================================
  // ✅ تایمر شمارش زمان سپری‌شده (بهینه‌شده)
  // ============================================
  useEffect(() => {
    // اگر مشاوره‌ای وجود ندارد، تایمر را راه‌اندازی نکن
    if (activeConsultations.length === 0) {
      return;
    }

    const timer = setInterval(() => {
      setActiveConsultations(prev => {
        // اگر آرایه خالی است، از به‌روزرسانی جلوگیری کن
        if (prev.length === 0) return prev;

        return prev.map(c => ({
          ...c,
          elapsed: Math.floor((Date.now() - c.startTime) / 1000),
        }));
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeConsultations.length]); // وابسته به تعداد مشاوره‌ها

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