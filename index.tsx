// src/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';           // <-- default export should be the provider-wrapped App
import './index.css';

// Ensure there's a #root element (useful for static hosting edge cases)
let rootEl = document.getElementById('root');
if (!rootEl) {
  rootEl = document.createElement('div');
  rootEl.id = 'root';
  document.body.appendChild(rootEl);
}

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
