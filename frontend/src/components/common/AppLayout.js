// frontend/src/components/common/AppLayout.js

import React from 'react';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import './AppLayout.css';

const AppLayout = ({ children }) => {
  return (
    <div className="app-main-layout">
      <AppHeader />
      <main className="app-main-content">
        {children}
      </main>
      <AppFooter />
    </div>
  );
};

export default AppLayout;