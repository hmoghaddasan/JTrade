// frontend/public/service-worker.js

/* eslint-disable no-restricted-globals */

const CACHE_NAME = 'jtrade-v1';
const OFFLINE_URL = '/offline.html';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png'
];

// ============================================
// نصب سرویس ورکر
// ============================================
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('✅ Service Worker installed successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Failed to cache assets:', error);
      })
  );
});

// ============================================
// فعال‌سازی سرویس ورکر
// ============================================
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...');

  const cacheWhitelist = [CACHE_NAME];

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('🗑️ Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
          return null;
        })
      );
    })
    .then(() => {
      console.log('✅ Service Worker activated successfully');
      return self.clients.claim();
    })
  );
});

// ============================================
// دریافت درخواست‌ها (Network First با Fallback)
// ============================================
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // ✅ استثنا: درخواست‌های API را کش نکن
  if (requestUrl.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return new Response(
            JSON.stringify({ error: 'اتصال به سرور برقرار نیست' }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }

  // ✅ استثنا: درخواست‌های مربوط به احراز هویت را کش نکن
  if (requestUrl.pathname.includes('/auth/') ||
      requestUrl.pathname.includes('/login') ||
      requestUrl.pathname.includes('/verify')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // ✅ استراتژی: Network First با Fallback به Cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // اگر پاسخ معتبر بود، در کش ذخیره کن
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseClone);
            })
            .catch((error) => {
              console.warn('⚠️ Failed to cache:', error);
            });
        }
        return response;
      })
      .catch(() => {
        // اگر نت‌ اتصال وجود نداشت، از کش استفاده کن
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // اگر در کش نبود، صفحه آفلاین را نمایش بده
            return caches.match(OFFLINE_URL);
          });
      })
  );
});

// ============================================
// مدیریت پیام‌ها (برای به‌روزرسانی)
// ============================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});