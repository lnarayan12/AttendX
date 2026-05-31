import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Global error handlers to send browser errors to backend logs
window.onerror = function (message, source, lineno, colno, error) {
  fetch('/api/log-error', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'onerror',
      message: message,
      source: source,
      lineno: lineno,
      colno: colno,
      stack: error ? error.stack : ''
    })
  }).catch(() => {});
};

window.addEventListener('unhandledrejection', function (event) {
  fetch('/api/log-error', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'unhandledrejection',
      message: event.reason ? event.reason.message || String(event.reason) : 'Promise rejected',
      stack: event.reason && event.reason.stack ? event.reason.stack : ''
    })
  }).catch(() => {});
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);
