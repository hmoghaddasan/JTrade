// src/components/common/LoadingBar.js

import React from 'react';
import './LoadingBar.css';

const LoadingBar = ({ text = 'در حال بارگذاری...', size = 'medium' }) => {
  return (
    <div className={`loading-bar-container ${size}`}>
      <div className="loading-bar"></div>
      {text && <p className="loading-bar-text">{text}</p>}
    </div>
  );
};

export default LoadingBar;