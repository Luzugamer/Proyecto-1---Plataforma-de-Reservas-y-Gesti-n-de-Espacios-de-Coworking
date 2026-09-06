import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import './index.css';

async function prepareApp() {
  // Iniciar Mock Service Worker (MSW) únicamente si está explícitamente habilitado
  if (import.meta.env.VITE_USE_MSW === 'true') {
    console.log('🧪 Modo Mocks Activo: MSW interceptando solicitudes de red.');
    const { worker } = await import('./mocks/browser');
    return worker.start({
      onUnhandledRequest: 'bypass',
      serviceWorker: {
        url: '/mockServiceWorker.js',
      },
    });
  }
  console.log('🚀 Modo Real Activo: Frontend conectado a API Fastify + PostgreSQL (coworking_db).');
}

prepareApp().then(() => {
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
