// frontend/src/components/SystemMessages.js

import React, { useState, useEffect } from 'react';
import './SystemMessages.css';

const SystemMessages = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMessages = () => {
      try {
        const savedMessages = localStorage.getItem('systemMessages');
        if (savedMessages) {
          setMessages(JSON.parse(savedMessages));
        } else {
          // پیام‌های نمونه
          const sampleMessages = [
            {
              id: 1,
              title: '🎉 خوش آمدید',
              message: 'به ژورنال حرفه‌ای ترید خوش آمدید. امیدواریم تجربه‌ی خوبی داشته باشید.',
              isActive: true,
              startDate: '2024-01-01',
              endDate: '2024-12-31'
            },
            {
              id: 2,
              title: '📢 به‌روزرسانی جدید',
              message: 'نسخه 1.4.1 نرم‌افزار منتشر شد. برای مشاهده تغییرات به بخش پروفایل مراجعه کنید.',
              isActive: true,
              startDate: '2024-10-01',
              endDate: '2024-11-01'
            }
          ];
          setMessages(sampleMessages);
          localStorage.setItem('systemMessages', JSON.stringify(sampleMessages));
        }
      } catch (error) {
        console.error('Error loading system messages:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, []);

  const activeMessages = messages.filter(msg => {
    if (!msg.isActive) return false;
    const today = new Date().toISOString().split('T')[0];
    if (msg.startDate && msg.startDate > today) return false;
    if (msg.endDate && msg.endDate < today) return false;
    return true;
  });

  if (loading || activeMessages.length === 0) {
    return null;
  }

  return (
    <div className="system-messages">
      {activeMessages.map((msg, index) => (
        <div key={msg.id} className={`system-message ${index === 0 ? 'primary' : 'secondary'}`}>
          <div className="message-icon">📢</div>
          <div className="message-content">
            <h4>{msg.title}</h4>
            <p>{msg.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SystemMessages;