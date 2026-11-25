import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if ('serviceWorker' in navigator) {
  let refreshing = false;
  let hadController = Boolean(navigator.serviceWorker.controller);

  navigator.serviceWorker?.addEventListener('controllerchange', () => {
    if (!hadController) {
      hadController = true;
      return;
    }
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  const checkForServiceWorkerUpdate = () => {
    navigator.serviceWorker
      .getRegistration()
      .then((registration) => registration?.update())
      .catch(() => {
        // Ignore transient offline update check failures
      });
  };

  navigator.serviceWorker.ready
    .then((registration) => {
      registration.update().catch(() => {});

      window.setInterval(() => {
        if (document.visibilityState === 'visible') {
          registration.update().catch(() => {});
        }
      }, 60 * 1000);
    })
    .catch(() => {});

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkForServiceWorkerUpdate();
    }
  });

  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      checkForServiceWorkerUpdate();
    }
  });
}

createRoot(document.getElementById('root')!).render(<App />);
