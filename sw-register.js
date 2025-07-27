// sw-register.js

if ('serviceWorker' in navigator && navigator.onLine) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('✅ Service Worker registered with scope:', registration.scope);
      })
      .catch(error => {
        console.error('❌ Service Worker registration failed:', error);
      });
  });
} else {
  console.warn('Service Workers are not supported or user is offline.');
}