import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Register offline-first PWA service worker with autoUpdate
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onRegisterError() {
      // Fail silently in restricted preview frames if SW registration is disallowed
    },
  });
}

createRoot(document.getElementById('root')!).render(<App />);
