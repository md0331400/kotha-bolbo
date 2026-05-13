import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((reg) => {
        console.log('Service Worker registered:', reg.scope);
      })
      .catch((err) => {
        console.warn('Service Worker registration failed:', err);
      });
  });
}

// Prevent default touch behaviors for app-like experience
document.addEventListener('touchmove', (e) => {
  if ((e.target as HTMLElement).closest('.overflow-y-auto, .overflow-auto')) return;
}, { passive: true });

// Prevent pull-to-refresh
document.body.style.overscrollBehavior = 'none';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
