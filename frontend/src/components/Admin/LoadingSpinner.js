// frontend/src/components/Admin/LoadingSpinner.js
import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ size = 40, color = '#6c63ff' }) => {
  return (
    <div className="spinner-container" style={{ minHeight: size * 2 }}>
      <div
        className="spinner"
        style={{
          width: size,
          height: size,
          borderColor: `${color} transparent ${color} transparent`,
        }}
      />
    </div>
  );
};

export default LoadingSpinner;