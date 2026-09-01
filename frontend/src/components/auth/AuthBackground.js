// frontend/src/components/auth/AuthBackground.js

import React, { useState, useEffect } from 'react';

const AuthBackground = ({ children }) => {
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [totalImages, setTotalImages] = useState(5); // تعداد پیش‌فرض

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      updateBackground(mobile);
    };

    const updateBackground = async (mobile) => {
      const folder = mobile ? 'vertical' : 'horizontal';

      // ✅ شمارش تعداد عکس‌های موجود
      const count = await getImageCount(folder);
      setTotalImages(count);

      // انتخاب تصویر تصادفی از بین عکس‌های موجود
      const imageNumber = Math.floor(Math.random() * count) + 1;
      const imagePath = `/images/login/${folder}/login-${imageNumber}.jpg`;
      console.log(`🖼️ Loading background image (${imageNumber}/${count}):`, imagePath);
      setBackgroundImage(imagePath);
      setImageLoaded(false);
    };

    // ✅ تابع شمارش فایل‌ها
    const getImageCount = async (folder) => {
      try {
        // تلاش برای دریافت لیست فایل‌ها از سرور
        const response = await fetch(`/images/login/${folder}/`);
        if (response.ok) {
          const text = await response.text();
          // استخراج تعداد فایل‌های jpg از محتوای HTML
          const matches = text.match(/login-\d+\.jpg/g);
          if (matches) {
            const uniqueNumbers = new Set();
            matches.forEach(m => {
              const num = parseInt(m.match(/\d+/)[0]);
              uniqueNumbers.add(num);
            });
            const count = uniqueNumbers.size;
            console.log(`📁 Found ${count} images in ${folder} folder`);
            return count > 0 ? count : 5;
          }
        }
      } catch (error) {
        console.warn('⚠️ Could not count images, using default:', error);
      }

      // اگر نتوانستیم شمارش کنیم، از تعداد پیش‌فرض استفاده کن
      // می‌توانی این عدد را به تعداد واقعی عکس‌هایت تغییر دهی
      const defaultCount = folder === 'vertical' ? 5 : 5;
      console.log(`📁 Using default count: ${defaultCount} for ${folder}`);
      return defaultCount;
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="auth-container">
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
              // در صورت خطا، یک تصویر جایگزین با عدد ۱ امتحان کن
              const fallbackPath = backgroundImage.replace(/login-\d+\.jpg/, 'login-1.jpg');
              if (backgroundImage !== fallbackPath) {
                console.log('🔄 Trying fallback image:', fallbackPath);
                setBackgroundImage(fallbackPath);
              }
            }}
          />
        </div>
      )}
      {children}
    </div>
  );
};

export default AuthBackground;