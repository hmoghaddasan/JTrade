// frontend/src/index.js

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  // <React.StrictMode>  // ✅ این را کامنت کنید
    <App />
  // </React.StrictMode>
);