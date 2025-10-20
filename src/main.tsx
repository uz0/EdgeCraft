import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

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
