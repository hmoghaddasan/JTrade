// frontend/src/contexts/SubscriptionContext.js

import React, { createContext, useState, useContext } from 'react';

const SubscriptionContext = createContext();

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider = ({ children }) => {
  const [subscription, setSubscription] = useState({
    is_active: true,
    plan_name: 'حرفه‌ای',
    plan_type: 'professional',
    remaining_days: 25,
    remaining_trades: 45,
    trades_limit: 50,
    trades_used: 5
  });

  const value = {
    subscription,
    setSubscription,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};