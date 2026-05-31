import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import './index.css';
import App from './App';

const API_BASE_URL = process.env.REACT_APP_API_URL || '';
if (API_BASE_URL) {
  axios.defaults.baseURL = API_BASE_URL;
}

// Global error handlers to send browser errors to backend logs
window.onerror = function (message, source, lineno, colno, error) {
  fetch(`${API_BASE_URL}/api/log-error`, {
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
  fetch(`${API_BASE_URL}/api/log-error`, {
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
