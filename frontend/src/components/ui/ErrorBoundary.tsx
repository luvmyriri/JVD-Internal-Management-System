import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global ErrorBoundary — catches unhandled JS errors in the component tree
 * and renders a styled fallback UI instead of crashing the whole app.
 *
 * Wrap the root of the application with this component so that any page-level
 * render error is caught here rather than producing a blank white screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-6">
          <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 p-10 text-center">
            {/* Error icon */}
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-rose-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                />
              </svg>
            </div>

            <h1 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2">
              Something Went Wrong
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">
              An unexpected error occurred in the application.
            </p>
            {this.state.error && (
              <p className="text-xs text-rose-500 font-mono bg-rose-50 dark:bg-rose-500/10 rounded-xl px-3 py-2 mt-3 mb-6 text-left break-all">
                {this.state.error.message}
              </p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={this.handleReset}
                className="flex-1 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold text-xs uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="flex-1 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-600/20 transition-all active:scale-95"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
