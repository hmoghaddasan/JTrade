// frontend/src/components/common/AppFooter.js

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './AppFooter.css';

const AppFooter = ({ isAuthPage = false }) => {
  const { user } = useAuth();
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

            {/* ✅ لینک پنل ادمین - فقط برای کاربر ادمین - با استایل یکسان */}
            {user?.is_admin && (
              <>
                <span className="footer-divider">|</span>
                <Link to="/admin" className="footer-link">
                  پنل ادمین
                </Link>
              </>
            )}
          </div>
          <div className="footer-copyright">
            <span className="footer-icon">©</span>
            <span>{currentYear} ژورنال حرفه‌ای ترید - تمامی حقوق محفوظ است</span>
          </div>
        </div>

        <div className="footer-right">
          <a referrerPolicy="origin" target="_blank" rel="noopener noreferrer" href="https://trustseal.enamad.ir/?id=7653755&Code=uDE0FLcRp7BAiVWFzKUfLC7MdBNXac0C">
            <img referrerPolicy="origin" src="https://trustseal.enamad.ir/logo.aspx?id=7653755&Code=uDE0FLcRp7BAiVWFzKUfLC7MdBNXac0C" alt="اینماد" style={{ cursor: 'pointer' }} />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default AppFooter;