// frontend/src/components/common/AppFooter.js

import React from 'react';
import { Link } from 'react-router-dom';
import './AppFooter.css';

const AppFooter = ({ isAuthPage = false }) => {
  const currentYear = new Date().toLocaleDateString('fa-IR', { year: 'numeric' });

  return (
    <footer className={`app-footer ${isAuthPage ? 'auth-footer' : ''}`}>
      <div className="footer-content">
        <div className="footer-left">
          <div className="footer-links">
            <Link to="/about" className="footer-link">درباره ما</Link>
            <span className="footer-divider">|</span>
            <Link to="/contact" className="footer-link">تماس با ما</Link>
            <span className="footer-divider">|</span>
            <Link to="/terms" className="footer-link">قوانین</Link>
          </div>
          <div className="footer-copyright">
            <span className="footer-icon">©</span>
            <span>{currentYear} ژورنال حرفه‌ای ترید - تمامی حقوق محفوظ است</span>
          </div>
        </div>

        <div className="footer-right">
          <a referrerpolicy="origin" target="_blank" href="https://trustseal.enamad.ir/?id=7653755&Code=uDE0FLcRp7BAiVWFzKUfLC7MdBNXac0C">
            <img referrerpolicy="origin" src="https://trustseal.enamad.ir/logo.aspx?id=7653755&Code=uDE0FLcRp7BAiVWFzKUfLC7MdBNXac0C" alt="" style={{ cursor: 'pointer' }} code="uDE0FLcRp7BAiVWFzKUfLC7MdBNXac0C" />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default AppFooter;