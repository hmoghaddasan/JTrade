// frontend/src/components/auth/AuthBackground.js

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import AppFooter from '../common/AppFooter';
import './auth.css';

const AuthBackground = ({ children }) => {
  const { isDark } = useTheme();
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      updateBackground(mobile);
    };

    const updateBackground = async (mobile) => {
      const folder = mobile ? 'vertical' : 'horizontal';
      const count = 5;
      const imageNumber = Math.floor(Math.random() * count) + 1;
      const imagePath = `/images/login/${folder}/login-${imageNumber}.jpg`;
      console.log(`🖼️ Loading background image:`, imagePath);
      setBackgroundImage(imagePath);
      setImageLoaded(false);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className={`auth-page-wrapper ${isDark ? 'dark' : ''}`}>
      {/* بک‌گراند تصویر */}
      {backgroundImage && (
        <div className="auth-background">
          <img
            src={backgroundImage}
            alt="Background"
            onLoad={() => {
              console.log('✅ Background image loaded:', backgroundImage);
              setImageLoaded(true);
            }}
            onError={() => {
              console.error('❌ Failed to load background image:', backgroundImage);
              const fallbackPath = backgroundImage.replace(/login-\d+\.jpg/, 'login-1.jpg');
              if (backgroundImage !== fallbackPath) {
                console.log('🔄 Trying fallback image:', fallbackPath);
                setBackgroundImage(fallbackPath);
              }
            }}
          />
        </div>
      )}

      {/* محتوای اصلی */}
      <div className={`auth-content ${isDark ? 'dark' : ''}`}>
        {children}
      </div>

      {/* ===== فوتر در پایین صفحه ===== */}
      <AppFooter isAuthPage={true} />
    </div>
  );
};

export default AuthBackground;