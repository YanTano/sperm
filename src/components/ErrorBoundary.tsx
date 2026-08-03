import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
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
        <div className="w-screen h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-zinc-900 border border-red-500/30 p-8 rounded-2xl max-w-lg shadow-2xl">
            <h1 className="text-2xl font-bold text-red-500 mb-2">Something went wrong</h1>
            <p className="text-zinc-400 text-sm mb-4">
              {this.state.error?.message || 'An unexpected graphics or application error occurred.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-all text-sm"
            >
              Reload Game
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
