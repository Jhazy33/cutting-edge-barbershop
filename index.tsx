import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Error Boundary to catch render errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    console.error('ErrorBoundary caught error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary component stack:', errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'white', background: '#CC0000' }}>
          <h1>Something went wrong.</h1>
          <pre>{this.state.error?.toString()}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
console.log('Starting app...', { rootElement });

if (!rootElement) {
  console.error('Fatal: Root element not found');
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  console.log('Root created, rendering...');
  window.__REACT_MOUNTED__ = true;

  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
  console.log('Render called successfully');
} catch (err) {
  console.error('Mounting failed:', err);
}