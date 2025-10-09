import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Development environment info
if (import.meta.env.DEV) {
  console.log('🎮 Edge Craft Development Mode');
  console.log(`Version: ${import.meta.env.VITE_APP_VERSION || '0.1.0'}`);
  console.log(`Environment: ${import.meta.env.MODE}`);
}

// React 18 root creation
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);