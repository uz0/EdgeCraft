import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Suppress noisy debug logs (keep errors and warnings)
const originalLog = console.log;
console.log = (...args: unknown[]) => {
  // Only allow logs from Babylon.js engine
  const message = String(args[0] || '');
  if (message.includes('BJS -') || message.includes('Babylon.js')) {
    originalLog(...args);
  }
  // Suppress all other console.log (MPQParser, W3XMapLoader, etc.)
};

// React 18 root creation
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

const root = ReactDOM.createRoot(rootElement);

// Disable StrictMode to prevent double-mounting issues with Babylon.js
// StrictMode causes mount -> cleanup -> remount which disposes the WebGL engine
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
