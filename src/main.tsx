import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Development environment info
// 🔥 CACHE BUSTER: BUILD 2025-10-11-23:42 🔥
console.log('🔥🔥🔥 EDGE CRAFT - BUILD 2025-10-11-23:42 🔥🔥🔥');
console.log('🔥🔥🔥 MPQ HEADER CHECK v3.0 + SECTOR FIX v2.0 🔥🔥🔥');
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

// Disable StrictMode to prevent double-mounting issues with Babylon.js
// StrictMode causes mount -> cleanup -> remount which disposes the WebGL engine
root.render(<App />);
