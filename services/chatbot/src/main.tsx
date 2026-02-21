import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { ChatInterface } from './components/ChatInterface';
import './index.css';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-white p-6 text-center">
          <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-red-500 text-4xl">warning</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
          <p className="text-slate-400 mb-8 max-w-md">
            The application encountered an unexpected error. We've been notified and are looking into it.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-sky-600 hover:bg-sky-500 rounded-xl transition-all font-bold"
          >
            Reload Application
          </button>
          {process.env.NODE_ENV === 'development' && (
            <pre className="mt-8 p-4 bg-black/50 rounded-lg text-left text-xs text-red-400 overflow-auto max-w-full">
              {this.state.error?.toString()}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ChatInterface />
    </ErrorBoundary>
  </React.StrictMode>
);
