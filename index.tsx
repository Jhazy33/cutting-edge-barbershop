import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
console.log('Starting app...', { rootElement });

if (!rootElement) {
  console.error('Fatal: Root element not found');
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  console.log('Root created, rendering...');
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('Render called');
} catch (err) {
  console.error('Mounting failed:', err);
}